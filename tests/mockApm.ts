import { IApm, ISpan, ITransaction } from '../src/apm';

export class MockApm implements IApm {
    public currentTransaction: ITransaction | undefined = undefined;
    public startSpan(spanName: string, spanType: string): ISpan {
        throw new Error('Should be mocked');
    }

    public captureError(err: Error | string): void {
        throw new Error('Should be mocked');
    }
}
