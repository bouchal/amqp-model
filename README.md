Class based on `amqp` package for simple publishing and subscribing messages from amqp protocol (RabbitMQ etc.).

## Instalation

```
npm i --save amqp-model
```

## Usage

```javascript
import AmqpModel from 'amqp-model';

const model = new AmqpModel({
    connection: { url: 'amqp://guest:guest@127.0.0.1:5672' },
    queueName: 'queue',
    exchangeName: 'exchange',
    bind: true,
    onReady: () => {
        console.log ('I am connected');
    },
    onError: (err) => {
        console.log(err);
    }
});


model.publish({
    whatToDo: 'Profit!'
});

model.queueByOne((message) => {
    console.log(message);
});
```

### Config parameters

- `connection`
  - Connection parameters ([link](https://www.npmjs.com/package/amqp#connection-options-and-url)) or instance of connection
- `exchangeOptions`
  - Exchange connect options ([link](https://www.npmjs.com/package/amqp#connectionexchangename-options-opencallback))
- `queueOptions`
  - Queue connect options ([link](https://www.npmjs.com/package/amqp#connectionqueuename-options-opencallback))
- `subscribeOptions`
  - Queue subscribe options ([link](https://www.npmjs.com/package/amqp#queuesubscribeoptions-listener))
- `queueName`
  - Name of your queue
- `exchangeName`
  - Name of your exchange
- `bind`
  - Initialize bind between queue and exchange
- `onReady`
  - It's called when connection is stable.
  - You should connect you subscribe or publish event after this is called
- `onError`
  - It's called after every error. Error is in first parameter.
- `routingKey`
- `publishOptions`
  - Default publish options. You can define other when you call publish method.
  
  
### Methods

- __.publish(message, options = {}, routingKey = [Routing key in config])__
    - Publish message to exchange (should be JSON)
    - If it's called before connection to server is stable, it will be handle after that.
    - Return Promise
        - If exchange hase confirm option on, it's waiting after delivery is confirmed, otherwise it's instant.
- __.queueByOne(fn, subscribeOptions = {})__
    - Subscribe to queue and call function in first parameter with message and callback for step to next message.
    - If it's called before connection to server is stable, it will be handle after that.
    - Return Promise
        - Call resolve with consumer tag in argument (it can be handled for unsubscribe only one subscription)
        - Reject is never called.
- __.unsubscribe(consumerTag)__
    - Unsubscribe one subscription.
    - Return Promise
        - Resolve is called after success and reject is never called.
- __.unsubscribeAll()__
    - Unsubscribe all subscriptions.
    - Return Promise
        - Resolve is called after success and reject is never called.
        
### Using one connection to multiple models

Sometimes you need multiple amqp models connected to one server but you don't wanna initialize multiple connections.

Solution is simple. You create connection separately and then pass it as connection parameter in model initialization.
 
```javascript
import amqp from 'amqp';
import AmqpModel from 'amqp-model';

const connection = amqp.createConnection({
    url: 'amqp://guest:guest@127.0.0.1:5672'
});

const modelOne = new AmqpModel({
    connection,
    ...
});

const modelTwo = new AmqpModel({
    connection,
    ...
})
```