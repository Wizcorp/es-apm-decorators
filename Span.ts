import { expect } from 'chai';

import { Span } from '../src';

class SpanTest {
	@Span()
	public spannedFunction() {
	}
}

describe('Span', function() {
	let mockManager: any;
	before(function() {
	});

	after(function() {
	});

	it('creates a span when a decorated function is called', function() {
		const s = new SpanTest();

		s.spannedFunction();
	});
});
