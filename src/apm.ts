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

export let activeApm: IApm;

export function useApm(apm: IApm) {
    activeApm = apm;
}
