import amqp from "amqp";
import Connection from 'amqp/lib/connection';
import async from 'async';
import AmqpModelError from "./AmqpModelError";

const defaultQueueOptions = {
    durable: true,
    autoDelete: false
};

const defaultExchangeOptions = {
    autoDelete: false,
    durable: true,
    confirm: true
};

export default class IAmqpModel {
    /**
     *
     * @param connection
     * @param exchangeOptions
     * @param queueOptions
     * @param subscribeOptions
     * @param queueName
     * @param exchangeName
     * @param bind
     * @param onReady
     * @param onError
     * @param routingKey
     * @param publishOptions
     */
    constructor({
        connection,
        exchangeOptions = {},
        queueOptions = {},
        subscribeOptions = {
            ack: true
        },
        queueName = null,
        exchangeName = null,
        bind = false,
        onReady = function () { },
        onError = function () { },
        routingKey = '#',
        publishOptions = {
            contentType: 'application/json'
        }
    }) {
        this._queueName = queueName;
        this._exchangeName = exchangeName;
        this._bind = bind;

        this._queueOptions = {
            ...defaultQueueOptions,
            ...queueOptions
        };

        this._exchangeOptions = {
            ...defaultExchangeOptions,
            ...exchangeOptions
        };

        this._subscribeOptions = subscribeOptions;
        this._routingKey = routingKey;
        this._publishOptions = publishOptions;


        this._queue = null;
        this._exchange = null;
        this._consumerTags = [];
        this._publishWaitingList = [];
        this._subscribeWaitingList = [];

        this._initConnection(connection, onReady, onError);
    }

    async _initConnection(connection, onReady, onError = null) {
        if (connection instanceof Connection) {
            this._connection = connection;
            await this._afterConnect();
        } else {
            this._connection = amqp.createConnection(connection);

            this._connection.on('ready', async() => {
                await this._afterConnect();
                if (typeof onReady === 'function') {
                    await onReady();
                }
            });
        }

        if (typeof onError === 'function') {
            this._connection.on('error', onError);
        }
    }

    async _afterConnect() {
        await this._initQueue(this._queueName);
        await this._initExchange(this._exchangeName);
        await this._initBind(this._bind);
        await this._handleWaitingLists();
    }

    _initQueue(queueName) {
        return new Promise((resolve, reject) => {
            if (!queueName) {
                return resolve();
            }

            this._connection.queue(queueName, this._queueOptions, (queue) => {
                if (!queue) {
                    return reject('Queue initialization failed');
                }

                this._queue = queue;
                resolve();
            });
        });
    }

    _initExchange(exchangeName) {
        return new Promise((resolve, reject) => {
            if (!exchangeName) {
                return resolve();
            }

            this._connection.exchange(exchangeName, this._exchangeOptions, (exchange) => {
                if (!exchange) {
                    return reject('Exchange initialization failed');
                }

                this._exchange = exchange;
                resolve();
            });
        });
    };

    _initBind(bind) {
        return new Promise((resolve, reject) => {
            if (!bind) {
                return resolve();
            }

            this._queue.bind(this._exchange.name, this._routingKey, () => {
                resolve();
            });
        })
    }

    _handleWaitingLists() {
        const runWaitingItem = (item, next) => {
            const f = item[0];
            const res = item[1];
            const rej = item[2];

            f(function () {
                res.apply(arguments);
                next();
            }, function () {
                rej.apply(arguments);
                next();
            });
        }

        const handleList = (list) => {
            return (cb) => {
                async.each(list, runWaitingItem, cb);
            }
        };

        return new Promise((resolve, reject) => {
            async.waterfall([
                handleList(this._subscribeWaitingList),
                handleList(this._publishWaitingList)
            ], (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        })
    }


    /**
     * Publish message to exchange
     *
     * @param message
     * @param options
     * @param routingKey
     * @return {Promise}
     */
    publish(message, options = {}, routingKey = this._routingKey) {
        if (!this._exchangeName) {
            throw new AmqpModelError('Exchange is not set.');
        }

        const publishOptions = {
            ...this._publishOptions,
            ...options
        };

        const publishMessage = (resolve, reject) => {
            const publishCallback = !this._exchangeOptions.confirm ? null : (isError, err) => {
                    if (isError) {
                        return reject(err);
                    }

                    resolve();
                };

            this._exchange.publish(routingKey, message, publishOptions, publishCallback);

            if (!this._exchangeOptions.confirm) {
                resolve();
            }
        };

        return new Promise((resolve, reject) => {
            if (!this._exchange) {
                return this._publishWaitingList.push([publishMessage, resolve, reject]);
            }

            publishMessage(resolve, reject);
        });
    }

    /**
     *
     * @param fn
     * @param subscribeOptions
     */
    queueByOne(fn, subscribeOptions = {}) {
        if (!this._queueName) {
            throw new AmqpModelError('Queue is not set.');
        }

        const next = () => {
            this._queue.shift();
        };

        const options = {
            ...this._subscribeOptions,
            ...subscribeOptions
        };

        const subscribeQueue = (resolve, reject) => {
            this._queue.subscribe(options, (message, headers, deliveryInfo, messageObject) => {
                fn(message, next);
            }).addCallback((ok) => {
                this._consumerTags.push(ok.consumerTag);
                resolve(ok.consumerTag);
            });
        };

        return new Promise((resolve, reject) => {
            if (!this._queue) {
                return this._subscribeWaitingList.push([subscribeQueue, resolve, reject]);
            }

            subscribeQueue(resolve, reject);
        });
    }

    disconnect() {
        return this._connection.disconnect();
    }

    unsubscribe(cTag) {
        return new Promise((resolve, reject) => {
            this._queue.unsubscribe(cTag).addCallback(() => {
                this._consumerTags.splice(this._consumerTags.indexOf(cTag), 1);
                resolve();
            });
        });
    }

    unsubscribeAll() {
        return new Promise((resolve, reject) => {
            async.each(this._consumerTags, async(cTag) => {
                await this.unsubscribe(cTag);
            }, (err) => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        })
    }
}