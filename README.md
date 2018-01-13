# AMQP MODEL

Class based on `amqp` package for simple publishing and subscribing messages from amqp protocol (RabbitMQ etc.).

## Instalation

```
npm i --save amqp-model
```

## Usage

```javascript
import AmqpModel from 'amqp-model';

const model = new AmqpModel({
    queueName: 'queue',
    exchangeName: 'exchange',
    onReady: () => {
        model.publish({
            whatToDo: 'Profit!'
        });
        
        model.queueByOne((message) => {
            console.log(message);
        });
    },
    onError: (err) => {
        console.log(err);
    }
});
```

### Config parameters

- `connection`
  - Connection parameters ([link](https://www.npmjs.com/package/amqp#connection-options-and-url))
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
- `onReady`
  - It's called when connection is stable.
  - You should connect you subscribe or publish event after this is called
- `onError`
  - It's called after every error. Error is in first parameter.
- `routingKey`
- `publishOptions`
  - Default publish options. You can define other when you call publish method.
  
  
### Methods

#### .publish(message, options = {}, routingKey = [Routing key in config])

#### .queueByOne(fn, routingKey = this._routingKey, subscribeOptions = {})