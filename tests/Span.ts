import * as chai from 'chai';
import * as apm from 'elastic-apm-node';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

// Mocha does not want arrow functions so it can do `this` shenanigans,
// and we want to be able to use chai's expressions that don't end in
// actual function calls.
// tslint:disable:only-arrow-functions no-unused-expression

chai.use(sinonChai);

import { Span } from '../src';

const expect = chai.expect;

const expectedReturnNumber = 17;
const expectedErrorMsg = 'Something bad happened!';

const fnStartSpan = 'startSpan';
const fnEnd = 'end';

const spanTestClassName = 'SpanTest';

const overriddenName = 'OBJECTION';
const overriddenType = 'OVERRULED';

class SpanTest {
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

        return expectedReturnNumber;
    }

    @Span()
    public async doTheThingSpannedAsync(): Promise<number> {
        this.didTheThing = true;

        return expectedReturnNumber;
    }

    @Span()
    public async doTheThingThrowsErrorAsync(): Promise<number> {
        throw new Error(expectedErrorMsg);

        return expectedReturnNumber;
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
}

describe('Span', function() {
    let startSpanStub: sinon.SinonStub;
    let captureErrorStub: sinon.SinonStub;
    let spanStub: {
        end: sinon.SinonStub;
    };

    beforeEach(function() {
        spanStub = {
            end: sinon.stub(),
        };

        startSpanStub = sinon.stub().returns(spanStub);
        captureErrorStub = sinon.stub();

        (apm as any).startSpan = startSpanStub;
        (apm as any).captureError = captureErrorStub;
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

            const ret = s.doTheThingSpanned();

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

            const ret = await s.doTheThingSpannedAsync();

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
