import { IApm, ISpan, ITransaction } from '../src/apm';

export class MockApm implements IApm {
    public currentTransaction: ITransaction | null = null;
    // tslint:disable-next-line: variable-name
    public startSpan(_spanName: string, _spanType: string): ISpan | null {
        throw new Error('Should be mocked');
    }

    // tslint:disable-next-line: variable-name
    public captureError(_err: Error | string): void {
        throw new Error('Should be mocked');
    }
}
