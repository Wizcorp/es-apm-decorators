import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

// Mocha does not want arrow functions so it can do `this` shenanigans,
// and we want to be able to use chai's expressions that don't end in
// actual function calls.
// tslint:disable:only-arrow-functions no-unused-expression

chai.use(sinonChai);
chai.use(chaiAsPromised);

import { Span, useApm, withSpan } from '../src';
import { MockApm } from './mockApm';

const expect = chai.expect;

const expectedReturnNumber = 17;
const expectedErrorMsg = 'Something bad happened!';

const spanTestClassName = 'SpanTest';

const overriddenName = 'OBJECTION';
const overriddenType = 'OVERRULED';

class SpanTest {
    @Span()
    public static doTheThingStatic(): number {
        return expectedReturnNumber;
    }

    @Span()
    public static async doTheThingStaticAsync(): Promise<number> {
        return expectedReturnNumber;
    }

    public didTheThing: boolean = false;

    public doTheThingNoSpan(): number {
        return expectedReturnNumber;
    }

    @Span()
    public doTheThingSpanned(): number {
        this.didTheThing = true;

        return expectedReturnNumber;
    }

    @Span()
    public doTheThingThrowsError(): number {
        throw new Error(expectedErrorMsg);
    }

    @Span()
    public async doTheThingSpannedAsync(): Promise<number> {
        this.didTheThing = true;

        return expectedReturnNumber;
    }

    @Span()
    public async doTheThingThrowsErrorAsync(): Promise<number> {
        throw new Error(expectedErrorMsg);
    }

    @Span({ name: overriddenName })
    public doTheThingWithCustomName(): number {
        return expectedReturnNumber;
    }

    @Span({ type: overriddenType })
    public doTheThingWithCustomType(): number {
        return expectedReturnNumber;
    }

    @Span({ name: overriddenName })
    public async doTheThingWithCustomNameAsync(): Promise<number> {
        return expectedReturnNumber;
    }

    @Span({ type: overriddenType })
    public async doTheThingWithCustomTypeAsync(): Promise<number> {
        return expectedReturnNumber;
    }

    @Span()
    public doTheThingReturnsPromise(timeoutMs: number): Promise<number> {
        const promise = new Promise<number>(resolve => {
            setTimeout(() => {
                resolve(expectedReturnNumber);
            }, timeoutMs);
        });

        return promise;
    }

    @Span()
    public async doTheThingReturnsPromiseAsync(
        timeoutMs: number,
    ): Promise<number> {
        const promise = new Promise<number>(resolve => {
            setTimeout(() => {
                resolve(expectedReturnNumber);
            }, timeoutMs);
        });

        return promise;
    }
}

describe('withSpan', function() {
    let startSpanStub: sinon.SinonStub;
    let captureErrorStub: sinon.SinonStub;
    let spanStub: {
        end: sinon.SinonStub;
    };
    let clock: sinon.SinonFakeTimers;

    beforeEach(function() {
        const apm = new MockApm();

        spanStub = {
            end: sinon.stub(),
        };

        startSpanStub = sinon.stub().returns(spanStub);
        captureErrorStub = sinon.stub();

        (apm as any).startSpan = startSpanStub;
        (apm as any).captureError = captureErrorStub;

        clock = sinon.useFakeTimers();

        useApm(apm);
    });

    afterEach(function() {
        clock.restore();
    });

    const addFunc = function(x1: number, y1: number): number {
        return x1 + y1;
    };
    const addFuncPromise = function(x1: number, y1: number): Promise<number> {
        return Promise.resolve(x1 + y1);
    };
    const addFuncAsync = async function(
        x1: number,
        y1: number,
    ): Promise<number> {
        return Promise.resolve(x1 + y1);
    };

    const throwFunc = function() {
        throw new Error(expectedErrorMsg);
    };

    const throwFuncPromise = function() {
        return Promise.reject(new Error(expectedErrorMsg));
    };

    const throwFuncAsync = async function() {
        return Promise.reject(new Error(expectedErrorMsg));
    };

    const spanned = withSpan(addFunc);
    const spannedPromise = withSpan(addFuncPromise);
    const spannedAsync = withSpan(addFuncAsync);

    const spannedThrow = withSpan(throwFunc);
    const spannedThrowPromise = withSpan(throwFuncPromise);
    const spannedThrowAsync = withSpan(throwFuncAsync);

    const x = 18234;
    const y = 58123;

    describe('Sync', function() {
        it('does not interfere with the function', function() {
            expect(spanned(x, y)).to.equal(addFunc(x, y));
        });

        it('starts and ends a span on function call', function() {
            expect(startSpanStub).to.not.be.called;
            expect(spanStub.end).to.not.be.called;
            spanned(x, y);
            expect(startSpanStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('uses the function name as the span name by default', function() {
            spanned(x, y);
            expect(startSpanStub).to.be.calledWithExactly(
                'addFunc',
                'function',
            );
        });

        it('uses the config name as the span name when supplied', function() {
            const name = 'customName';
            const spannedWithConfig = withSpan(addFunc, { name });
            spannedWithConfig(x, y);
            expect(startSpanStub).to.be.calledWithExactly(name, 'function');
        });

        it('uses the config type as the span type when supplied', function() {
            const type = 'customType';
            const spannedWithConfig = withSpan(addFunc, { type });
            spannedWithConfig(x, y);
            expect(startSpanStub).to.be.calledWithExactly('addFunc', type);
        });

        it('captures an error if the function throws', function() {
            expect(captureErrorStub).to.not.be.called;
            expect(spanStub.end).to.not.be.called;
            expect(() => spannedThrow()).to.throw(expectedErrorMsg);
            expect(captureErrorStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('does not error if a span is not created', function() {
            startSpanStub.returns(null);
            expect(spanStub.end).to.not.be.called;
            expect(spanned(x, y)).to.equal(addFunc(x, y));
            expect(spanStub.end).to.not.be.called;
        });
    });

    describe('Promise', function() {
        it('does not interfere with the function', async function() {
            await expect(spannedPromise(x, y)).to.eventually.equal(
                await addFuncPromise(x, y),
            );
        });

        it('starts and ends a span on function call', async function() {
            expect(startSpanStub).to.not.be.called;
            expect(spanStub.end).to.not.be.called;
            await spannedPromise(x, y);
            expect(startSpanStub).to.be.called;
            expect(spanStub.end).to.be.called;
        });

        it('does not lose a thrown error', async function() {
            const wait = expect(
                spannedThrowPromise(),
            ).to.eventually.be.rejectedWith(expectedErrorMsg);
            expect(captureErrorStub).to.not.be.calledOnce;
            expect(spanStub.end).to.not.be.calledOnce;
            await wait;
            expect(captureErrorStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('does not end the span until the promise completes', async function() {
            expect(startSpanStub).to.not.be.called;
            expect(spanStub.end).to.not.be.called;
            const resultPromise = spannedPromise(x, y);
            expect(startSpanStub).to.be.called;
            expect(spanStub.end).to.not.be.called;

            await resultPromise;

            expect(startSpanStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });
    });

    describe('Async', function() {
        it('does not interfere with the function', async function() {
            await expect(spannedAsync(x, y)).to.eventually.equal(
                await addFuncAsync(x, y),
            );
        });

        it('does not lose a thrown error', async function() {
            const wait = expect(
                spannedThrowAsync(),
            ).to.eventually.be.rejectedWith(expectedErrorMsg);
            expect(captureErrorStub).to.not.be.calledOnce;
            expect(spanStub.end).to.not.be.calledOnce;
            await wait;
            expect(captureErrorStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('starts and ends a span on function call', async function() {
            expect(startSpanStub).to.not.be.called;
            await spannedAsync(x, y);
            expect(startSpanStub).to.be.called;
        });

        it('does not end the span until the promise completes', async function() {
            expect(startSpanStub).to.not.be.called;
            expect(spanStub.end).to.not.be.called;
            const resultPromise = spannedPromise(x, y);
            expect(startSpanStub).to.be.called;
            expect(spanStub.end).to.not.be.called;

            await resultPromise;

            expect(startSpanStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });
    });
});

describe('Span', function() {
    let startSpanStub: sinon.SinonStub;
    let captureErrorStub: sinon.SinonStub;
    let spanStub: {
        end: sinon.SinonStub;
    };
    let clock: sinon.SinonFakeTimers;

    beforeEach(function() {
        const apm = new MockApm();

        spanStub = {
            end: sinon.stub(),
        };

        startSpanStub = sinon.stub().returns(spanStub);
        captureErrorStub = sinon.stub();

        (apm as any).startSpan = startSpanStub;
        (apm as any).captureError = captureErrorStub;

        clock = sinon.useFakeTimers();

        useApm(apm);
    });

    afterEach(function() {
        clock.restore();
    });

    describe('Sync Methods', function() {
        it('does not interfere with a sync function', function() {
            const s = new SpanTest();

            const ret = s.doTheThingSpanned();

            expect(s.didTheThing).to.be.true;
            expect(ret).to.equal(expectedReturnNumber);
        });

        it('creates a span and ends it', function() {
            const s = new SpanTest();

            s.doTheThingSpanned();

            expect(startSpanStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('captures an error if one is thrown', function() {
            const s = new SpanTest();

            expect(s.doTheThingThrowsError).to.throw();
            expect(captureErrorStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('does not randomly add spans to unmarked functions', function() {
            const s = new SpanTest();

            expect(s.doTheThingNoSpan()).to.equal(expectedReturnNumber);

            expect(startSpanStub).to.not.be.called;
        });

        describe('Name', function() {
            it('names the span as Class.Method by default', function() {
                const s = new SpanTest();

                s.doTheThingSpanned();

                expect(startSpanStub).to.be.calledWith(
                    `${spanTestClassName}.doTheThingSpanned`,
                );
            });

            it('names the span as Class.Method for static functions', function() {
                SpanTest.doTheThingStatic();

                expect(startSpanStub).to.be.calledWith(
                    `${spanTestClassName}.doTheThingStatic`,
                );
            });

            it('overrides the name completely when set by config', function() {
                const s = new SpanTest();

                s.doTheThingWithCustomName();

                expect(startSpanStub).to.be.calledWith(overriddenName);
            });
        });

        describe('Type', function() {
            it('uses the class name as the type by default', function() {
                const s = new SpanTest();

                s.doTheThingSpanned();

                expect(startSpanStub).to.be.calledWith(
                    sinon.match.any,
                    spanTestClassName,
                );
            });

            it('overrides the type when set by config', function() {
                const s = new SpanTest();

                s.doTheThingWithCustomType();

                expect(startSpanStub).to.be.calledWith(
                    sinon.match.any,
                    overriddenType,
                );
            });
        });
    });

    describe('Async Methods', function() {
        it('does not interfere with an async function', async function() {
            const s = new SpanTest();

            const ret = await s.doTheThingSpannedAsync();

            expect(s.didTheThing).to.be.true;
            expect(ret).to.equal(expectedReturnNumber);
        });

        it('creates a span and ends it', async function() {
            const s = new SpanTest();

            await s.doTheThingSpannedAsync();

            expect(startSpanStub).to.be.calledOnce;
            expect(spanStub.end).to.be.calledOnce;
        });

        it('captures an error if one is thrown', async function() {
            const s = new SpanTest();

            try {
                await s.doTheThingThrowsErrorAsync();

                throw new Error('Should not get here');
            } catch (err) {
                expect(err.message).to.equal(expectedErrorMsg);
            }

            expect(spanStub.end).to.be.calledOnce;
            expect(captureErrorStub).to.be.calledOnce;
        });

        it('waits for a returned promise without async to resolve before ending the span', async function() {
            const s = new SpanTest();
            const waitTimeMs = 1000;

            setTimeout(() => {
                expect(spanStub.end).to.not.be.called;
            }, waitTimeMs / 3);

            const retPromise = s.doTheThingReturnsPromise(waitTimeMs);

            clock.tick(waitTimeMs / 2);
            clock.tick(waitTimeMs / 2 + 1);

            const ret = await retPromise;

            expect(spanStub.end).to.be.calledOnce;

            expect(ret).to.equal(expectedReturnNumber);
        });

        it('waits for an async promise to resolve before ending the span', async function() {
            const s = new SpanTest();
            const waitTimeMs = 1000;

            setTimeout(() => {
                expect(spanStub.end).to.not.be.called;
            }, waitTimeMs / 3);

            const retPromise = s.doTheThingReturnsPromiseAsync(waitTimeMs);

            clock.tick(waitTimeMs / 2);
            clock.tick(waitTimeMs / 2 + 1);

            const ret = await retPromise;

            expect(spanStub.end).to.be.calledOnce;

            expect(ret).to.equal(expectedReturnNumber);
        });

        describe('Name', function() {
            it('names the span as Class.Method by default', async function() {
                const s = new SpanTest();

                await s.doTheThingSpannedAsync();

                expect(startSpanStub).to.be.calledWith(
                    `${spanTestClassName}.doTheThingSpannedAsync`,
                );
            });

            it('overrides the name completely when set by config', async function() {
                const s = new SpanTest();

                await s.doTheThingWithCustomNameAsync();

                expect(startSpanStub).to.be.calledWith(overriddenName);
            });

            it('names the span as Class.Method for static functions', async function() {
                await SpanTest.doTheThingStaticAsync();

                expect(startSpanStub).to.be.calledWith(
                    `${spanTestClassName}.doTheThingStaticAsync`,
                );
            });
        });

        describe('Type', function() {
            it('uses the class name as the type by default', async function() {
                const s = new SpanTest();

                await s.doTheThingSpannedAsync();

                expect(startSpanStub).to.be.calledWith(
                    sinon.match.any,
                    spanTestClassName,
                );
            });

            it('overrides the type when set by config', async function() {
                const s = new SpanTest();

                await s.doTheThingWithCustomTypeAsync();

                expect(startSpanStub).to.be.calledWith(
                    sinon.match.any,
                    overriddenType,
                );
            });
        });
    });
});
