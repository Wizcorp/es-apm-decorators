import apm from 'elastic-apm-node';

export function Span() {
    return (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const original = descriptor.value;

        const className = target.constructor.name;
        const fnName = propertyKey;

        const name = `${className}.${fnName}`;

        if (descriptor.value.constructor.name === 'AsyncFunction') {
            descriptor.value = async function(...args: any[]) {
                const span = apm.startSpan(name, className);

                try {
                    const ret = await original.apply(this, args);

                    if (span) {
                        span.end();
                    }

                    return ret;
                } catch (err) {
                    apm.captureError(err);
                    const curTransaction = apm.currentTransaction;

                    if (curTransaction) {
                        curTransaction.result = 'error';
                    }

                    throw err;
                }
            };
        } else {
            descriptor.value = function(...args: any[]) {
                const span = apm.startSpan(name, className);

                try {
                    const ret = original.apply(this, args);

                    if (span) {
                        span.end();
                    }

                    return ret;
                } catch (err) {
                    apm.captureError(err);
                    const curTransaction = apm.currentTransaction;

                    if (curTransaction) {
                        curTransaction.result = 'error';
                        console.log(curTransaction.result);
                    }

                    throw err;
                }
            };
        }
    };
}
