import async from 'async';
import amqp from 'amqp';
import AmqpModel from '../src';

const RABBIT_CONNECTION = 'amqp://guest:guest@127.0.0.1:5672';

describe('AMQP model', () => {
	let amqpModel = null;

	let cTag = null;

	it('should connect to amqp and create queue and exchange with bind them', (done) => {
		amqpModel = new AmqpModel({
			connection: {url: RABBIT_CONNECTION},
			exchangeName: 'testExchange',
			queueName: 'testQueue',
			onReady: done,
			onError: (err) => { done(err) },
			bind: true
		});
	});

	it ('should subscribe queue and pass published message', (done) => {
		const TEST_MESSAGE = 'testMessage';

		amqpModel.queueByOne((message, next) => {
			if (message.message === TEST_MESSAGE) {
				done();
			} else {
				done('Message is not same as it should.');
			}

			next();
		}).then((consumerTag) => {
			cTag = consumerTag;
            amqpModel.publish({ message: TEST_MESSAGE });
		}, (error) => { done(error) });
	});

	it ('should unsubscribe queue', (done) => {
		amqpModel.unsubscribe(cTag).then(() => {
            done();
        }, (error) => { done(error) });
	});

	it('should subscribe multiple times', (done) => {
		const queueIds = [...Array(100).keys()];

		const check = () => {
			if (!queueIds.length) {
				done();
			}
		};

		const publish = () => {
            async.each(queueIds, (queueId, next) => {
                amqpModel.publish({ queueId });
                next();
            });
		};

		async.each(queueIds, async (queueId, next) => {
			await amqpModel.queueByOne((message, next) => {
                queueIds.splice(queueIds.indexOf(message.queueId), 1);
                check();
                next();
            });
            next();
		}, (err) => {
            publish();
		});
	});

	it('should unsubscribe all', (done) => {
		amqpModel.unsubscribeAll().then(() => {
			// Ugly accessing private value.
			if (!amqpModel._consumerTags.length) {
				return done();
			}

			done('Consumer tags is not empty');
		}, (err) => {
			done(err);
		})
	});

	it ('should disconnect amqp', () => {
		amqpModel.disconnect();
	})


	it ('should bind and publish before connection and do magic after that', (done) => {
		const TEST_MESSAGE = 'testMessage';

        const amqpModel2 = new AmqpModel({
            connection: {url: RABBIT_CONNECTION},
            exchangeName: 'testExchange',
            queueName: 'testQueue',
            onError: (err) => { done(err) },
            bind: true
        });

        amqpModel2.queueByOne((message, next) => {
            if (message.message === TEST_MESSAGE) {
                done();
            } else {
                done('Message is not same as it should.');
            }

            next();
            amqpModel2.disconnect();
		});

        amqpModel2.publish({ message: TEST_MESSAGE });
	});

	it ('should use already created connection', (done) => {
        const TEST_MESSAGE = 'testMessage';

        const connection = amqp.createConnection({url: RABBIT_CONNECTION});

        connection.on('ready', () => {
            const amqpModel2 = new AmqpModel({
                connection,
                exchangeName: 'testExchange2',
                queueName: 'testQueue2',
                onError: (err) => { done(err) },
                bind: true
            });

            amqpModel2.queueByOne((message, next) => {
                if (message.message === TEST_MESSAGE) {
                    done();
                } else {
                    done('Message is not same as it should.');
                }

                next();
                amqpModel2.disconnect();
            });

            amqpModel2.publish({ message: TEST_MESSAGE });
		});
	});
})