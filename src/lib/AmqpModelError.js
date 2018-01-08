export default class AmqpModelError extends Error {
    constructor(...args) {
        super(args);
        Error.captureStackTrace(this, AmqpModelError);
        this.name = 'AmqpModelError';
    }
}