# es-apm-decorators

[![Build](https://img.shields.io/travis/Wizcorp/es-apm-decorators?style=flat-square)](https://travis-ci.org/Wizcorp/es-apm-decorators)

The [Elasticsearch APM Node API](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)
is great for automatically plugging into various existing
frameworks, but can be a little verbose to add your own
custom spans and such.  This package provides decorators
to let you easily get more insight into your systems.

## Installation

```bash
npm install --save es-apm-decorators
```

## Usage

Since the Elasticsearch APM module uses a global instance, you must
supply the global instance to be used by the decorators.  Do this
as soon as possible in your code, preferably right after `apm.start()`.
If you do not call `useApm`, a dummy instance that does nothing
will be used instead.  This is useful to get out of the way of tests.

```typescript
// index.ts
import * as apm from 'elasticsearch-apm-node';
import { useApm } from 'es-apm-decorators';

apm.start(/* config */);

useApm(apm);
```

### Instrumenting class methods with `@Span()`

You can apply the `@Span()` decorator to class methods.  Class
methods that are `async` will be correctly handled, with the span
ending after the `async` call returns.

```typescript
import { Span } from 'es-apm-decorators';

class MyClass {
	// By default, this will create a span in the current
	// transaction named 'MyClass.doSomething' with the
	// type MyClass.
	@Span()
	public doSomething() {
		// Do something interesting...
	}

	// You can override either name or type, or both at once.
	@Span({ name: 'BigTransaction', type: 'db' })
	public async interactWithDatabase() {
		// Do some big database transaction...
	}
}
```

### Instrumenting arbitrary functions using `withSpan()`

If you want to create a span for an arbitrary function that
isn't part of a class, you can use `withSpan()`.  The `withSpan()`
function takes a single function as a parameter and returns
a new function with exactly the same signature as the original,
but with a span around it.  `withSpan()` takes the same configuration
options as `@Span()`.

```typescript
import { withSpan } from 'es-apm-decorators';

// Works with async and non-async
async function doBigDatabaseThing(host: string, port: number): Promise<number> {
	// Do some big heavy database transaction and return some value
	// ...
	return id;
}

// Will create a span with the name `doBigDatabaseThing` and type `function`
const doBigDatabaseThingSpanned = withSpan(doBigDatabaseThing);

// Alternatively, supply your own name and/or type
// const doBigDatabaseThingSpanned = withSpan(doBigDatabaseThing, { name: 'Big Database Thing' });
// const doBigDatabaseThingSpanned = withSpan(doBigDatabaseThing, { name: 'Big Database Thing', type: 'db' });

// You can now use the wrapped function exactly like the original.
// The return value and any thrown errors are the same as before.
try {
	const id = await doBigDatabaseThingSpanned('internal.mysql', 1234);
} catch (err) {
	console.error(err);
}
```

## Error handling

If a wrapped or decorated method throws any errors, the current transaction
will be marked with an 'error' result.  Otherwise the transaction result is
not changed.

*TODO:* Make this more configurable

