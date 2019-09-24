export interface ISpan {
    end(): void;
}

export interface ITransaction {
    result: string;
}

export interface IApm {
    currentTransaction: ITransaction | undefined;

    startSpan(spanName: string, spanType: string): ISpan;
    captureError(err: Error | string): void;
}

// tslint:disable:no-empty
export let activeApm: IApm = {
    captureError: () => {},
    currentTransaction: undefined,
    startSpan: () => {
        return {
            end: () => {},
        };
    },
};

export function useApm(apm: IApm) {
    activeApm = apm;
}
