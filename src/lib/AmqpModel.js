import amqp from "amqp";
import AmqpModelError from "./AmqpModelError";

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
        exchangeOptions = {
            autoDelete: false,
            durable: true,
            confirm: true
        },
        queueOptions = {
            durable: true,
            autoDelete: false
        },
        subscribeOptions = {
            ack: true
        },
        queueName = null,
        exchangeName = null,
        bind = false,
        onReady = null,
        onError = null,
        routingKey = '#',
        publishOptions = {
            contentType: 'application/json'
        }
    }) {
        this._connection = amqp.createConnection(connection);
        this._queueOptions = queueOptions;
        this._exchangeOptions = exchangeOptions;
        this._subscribeOptions = subscribeOptions;
        this._queue = null;
        this._exchange = null;
        this._routingKey = routingKey;
        this._publishOptions = publishOptions;
        this._consumerTag = null;

        this._connection.on('ready', async() => {
            await this._initQueue(queueName);
            await this._initExchange(exchangeName);
            await this._initBind(bind);

            onReady();
        });

        this._connection.on('error', onError);
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


    /**
     * Publish message to exchange
     *
     * @param message
     * @param options
     * @param routingKey
     * @return {Promise}
     */
    publish(message, options = {}, routingKey = this._routingKey) {

        if (!this._exchange) {
            throw new AmqpModelError('Exchange is not set.');
        }

        const publishOptions = {
            ...this._publishOptions,
            ...options
        };

        if (this._exchangeOptions.confirm) {
            return new Promise((resolve, reject) => {
                this._exchange.publish(routingKey, message, publishOptions, (isError, err) => {
                    if (isError) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        }

        return Promise.resolve();
    }

    /**
     *
     * @param fn
     * @param routingKey
     * @param subscribeOptions
     */
    queueByOne(fn, routingKey = this._routingKey, subscribeOptions = {}) {
        if (!this._queue) {
            throw new AmqpModelError('Queue is not set.');
        }

        const next = () => {
            this._queue.shift();
        };

        const options = {
            ...this._subscribeOptions,
            ...subscribeOptions
        };

        this._queue.bind(routingKey, () => {
            this._queue.subscribe(options, (message, headers, deliveryInfo, messageObject) => {
                fn(message, next);
            }).addCallback((ok) => {
                this._consumerTag = ok.consumerTag;
            });
        });
    }

    disconnect() {
        return this._connection.disconnect();
    }

    unsubscribe(done) {
        return this._queue.unsubscribe(this._consumerTag).addCallback(() => {
            done();
        });
    }

}