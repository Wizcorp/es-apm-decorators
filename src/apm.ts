export interface ISpan {
    end(): void;
}

export interface ITransaction {
    result: string | number;
}

export interface IApm {
    currentTransaction: ITransaction | null;

    startSpan(spanName: string, spanType: string): ISpan | null;
    captureError(err: Error | string): void;
}

export let activeApm: IApm = {
    // tslint:disable-next-line:no-empty
    captureError: () => {},
    currentTransaction: null,
    startSpan: () => null,
};

export function useApm(apm: IApm) {
    activeApm = apm;
}
