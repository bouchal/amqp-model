import AmqpModel from '../src';

const RABBIT_CONNECTION = 'amqp://guest:guest@127.0.0.1:5672';

describe('AMQP model', () => {
	let amqpModel = null;

	it('should connect to amqp and create queue and exchange with bind them', (done) => {
		amqpModel = new AmqpModel({
			connection: {url: RABBIT_CONNECTION},
			exchangeName: 'testExchange',
			queueName: 'testQueue',
			onReady: done,
			onError: done,
			bind: true
		});
	});

	it ('should subscribe queue and pass published message', (done) => {
		const TEST_MESSAGE = 'testMessage';

		amqpModel.queueByOne((message, next) => {
			if (message.message == TEST_MESSAGE) {
				done();
			} else {
				done('Message is not same as it should.');
			}

			next();
		});

		amqpModel.publish({ message: TEST_MESSAGE });
	});

	it ('should unsubscribe queue', (done) => {
		amqpModel.unsubscribe(done);
	});

	it ('should disconnect amqp', () => {
		amqpModel.disconnect();
	})
})