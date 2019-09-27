import { activeApm } from './apm';

export interface ISpanConfig {
    name?: string;
    type?: string;
}

function executeSpan<T>(fn: T, spanName: string, spanType: string, ...args: any) {
    const span = activeApm.startSpan(spanName, spanType);

    try {
        const ret = (fn as any)(...args);

        if (span) {
            if (ret && ret.then && ret.catch) {
                return ret
                    .then((res: any) => {
                        span.end()
                        return res;
                    })
                    .catch((err: Error) => {
                    activeApm.captureError(err);

                    if (activeApm.currentTransaction) {
                        activeApm.currentTransaction.result = 'error';
                    }

                    span.end();
                    throw err;
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
}

export function withSpan<T>(fn: T, config?: ISpanConfig): T {
    const spanName = config && config.name ? config.name : (fn as any).name;
    const spanType = config && config.type ? config.type : 'function';

    return ((...args: any) => {
        return executeSpan(fn, spanName, spanType, ...args);
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

        descriptor.value = function(...args: any[]) {
            return executeSpan(original.bind(this), spanName, spanType, ...args);
        };
    };
}
