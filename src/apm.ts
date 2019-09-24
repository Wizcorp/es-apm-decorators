export interface ISpan {
    end(): void;
}

export interface ITransaction {
    result: string;
}

export interface IApm {
    currentTransaction: ITransaction | undefined;

    startSpan(spanName: string, spanType: string): ISpan | null;
    captureError(err: Error | string): void;
}

// tslint:disable:no-empty
export let activeApm: IApm = {
    captureError: () => {},
    currentTransaction: undefined,
    startSpan: () => null,
};

export function useApm(apm: IApm) {
    activeApm = apm;
}
