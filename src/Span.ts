import { activeApm } from './apm';

export interface ISpanConfig {
    name?: string;
    type?: string;
}

export function withSpan<T>(fn: T, config?: ISpanConfig): T {
    const spanName = config && config.name ? config.name : (fn as any).name;
    const spanType = config && config.type ? config.type : 'function';

    return ((...args: any) => {
        const span = activeApm.startSpan(spanName, spanType);

        try {
            const ret = (fn as any)(...args);

            if (span) {
                if (ret && ret.then && ret.catch) {
                    ret.then(() => span.end()).catch((err: Error) => {
                        activeApm.captureError(err);

                        if (activeApm.currentTransaction) {
                            activeApm.currentTransaction.result = 'error';
                        }

                        span.end();
                    });
                } else {
                    span.end();
                }
            }

            return ret;
        } catch (err) {
            activeApm.captureError(err);

            if (activeApm.currentTransaction) {
                activeApm.currentTransaction.result = 'error';
            }

            if (span) {
                span.end();
            }

            throw err;
        }
    }) as any;
}

export function Span(config?: ISpanConfig) {
    return (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) => {
        const original = descriptor.value;

        const className =
            target.constructor.name === 'Function'
                ? target.name
                : target.constructor.name;
        const fnName = propertyKey;

        config = config || {};

        const spanName = config.name || `${className}.${fnName}`;
        const spanType = config.type || className;

        if (descriptor.value.constructor.name === 'AsyncFunction') {
            descriptor.value = async function(...args: any[]) {
                const span = activeApm.startSpan(spanName, spanType);

                try {
                    const ret = await original.apply(this, args);

                    if (span) {
                        span.end();
                    }

                    return ret;
                } catch (err) {
                    activeApm.captureError(err);
                    const curTransaction = activeApm.currentTransaction;

                    if (curTransaction) {
                        curTransaction.result = 'error';
                    }

                    if (span) {
                        span.end();
                    }

                    throw err;
                }
            };
        } else {
            descriptor.value = function(...args: any[]) {
                const span = activeApm.startSpan(spanName, spanType);

                try {
                    const ret = original.apply(this, args);

                    if (span) {
                        if (ret && ret.then && ret.catch) {
                            ret.then(() => span.end()).catch(() => span.end());
                        } else {
                            span.end();
                        }
                    }

                    return ret;
                } catch (err) {
                    activeApm.captureError(err);
                    const curTransaction = activeApm.currentTransaction;

                    if (curTransaction) {
                        curTransaction.result = 'error';
                    }

                    if (span) {
                        span.end();
                    }

                    throw err;
                }
            };
        }
    };
}
