declare namespace LightPromise {
	namespace Error {
		type Kind =
			| "ExecutionError"
			| "AlreadyCancelled"
			| "NotResolvedInTime"
			| "TimedOut";
	}

	interface ErrorOptions {
		trace: string;
		context: string;
		kind: LightPromise.Error.Kind;
	}

	interface Error {
		readonly error: string;
		readonly trace?: string;
		readonly context?: string;
		readonly kind?: LightPromise.Error.Kind;
		readonly parent?: LightPromise.Error;
		readonly createdTick: number;
		readonly createdTrace: string;

		extend(options?: Partial<LightPromise.ErrorOptions>): LightPromise.Error;

		getErrorChain(): Array<LightPromise.Error>;
	}

	interface ErrorConstructor {
		readonly Kind: { readonly [K in LightPromise.Error.Kind]: K };

		is: (value: unknown) => value is LightPromise.Error;

		isKind: (
			value: unknown,
			kind: LightPromise.Error.Kind,
		) => value is LightPromise.Error;

		new (
			options?: Partial<LightPromise.ErrorOptions>,
			parent?: LightPromise.Error,
		): LightPromise.Error;
	}

	export type Status =
		LightPromiseConstructor["Status"][keyof LightPromiseConstructor["Status"]];
}

/**
 * Works both with the `Promise` and `LightPromise`.
 */
interface LightPromiseLike<T> {
	/**
	 * Chains onto an existing LightPromise and returns a new LightPromise.
	 * > Within the failure handler, you should never assume that the rejection value is a string. Some rejections within the LightPromise library are represented by Error objects. If you want to treat it as a string for debugging, you should call `tostring` on it first.
	 *
	 * Return a LightPromise from the success or failure handler and it will be chained onto.
	 */
	then<const TResult1 = T, const TResult2 = never>(
		this: LightPromise<T>,
		onResolved?: ((value: T) => TResult1 | LightPromise<TResult1>) | void,
		onRejected?:
			| ((reason: unknown) => TResult2 | LightPromise<TResult2>)
			| void,
	): LightPromise<TResult1 | TResult2>;
}

/**
 * Represents the completion of an asynchronous operation
 */
interface LightPromise<T> {
	/**
	 * Chains onto an existing LightPromise and returns a new LightPromise.
	 * > Within the failure handler, you should never assume that the rejection value is a string. Some rejections within the LightPromise library are represented by Error objects. If you want to treat it as a string for debugging, you should call `tostring` on it first.
	 *
	 * Return a LightPromise from the success or failure handler and it will be chained onto.
	 */
	then<const TResult1 = T, const TResult2 = never>(
		this: LightPromise<T>,
		onResolved?: ((value: T) => TResult1 | LightPromise<TResult1>) | void,
		onRejected?:
			| ((reason: unknown) => TResult2 | LightPromise<TResult2>)
			| void,
	): LightPromise<TResult1 | TResult2>;

	/**
	 * Chains onto an existing LightPromise and returns a new LightPromise.
	 * > Within the failure handler, you should never assume that the rejection value is a string. Some rejections within the LightPromise library are represented by Error objects. If you want to treat it as a string for debugging, you should call `tostring` on it first.
	 *
	 * Return a LightPromise from the success or failure handler and it will be chained onto.
	 */
	andThen<const TResult1 = T, const TResult2 = never>(
		this: LightPromise<T>,
		onResolved?: ((value: T) => TResult1 | LightPromise<TResult1>) | void,
		onRejected?:
			| ((reason: unknown) => TResult2 | LightPromise<TResult2>)
			| void,
	): LightPromise<TResult1 | TResult2>;

	/**
	 * Shorthand for `LightPromise:andThen(nil, failureHandler)`.
	 *
	 * Returns a LightPromise that resolves if the `failureHandler` worked without encountering an additional error.
	 */
	catch<const TResult = never>(
		this: LightPromise<T>,
		onRejected?: ((reason: any) => TResult | LightPromise<TResult>) | void,
	): LightPromise<T | TResult>;

	/**
	 * Similar to [LightPromise.andThen](https://eryn.io/roblox-lua-promise/lib/#andthen), except the return value is the same as the value passed to the handler. In other words, you can insert a `:tap` into a LightPromise chain without affecting the value that downstream LightPromises receive.
	 * ```lua
	 * getTheValue()
	 *     :tap(print)
	 *     :andThen(function(theValue))
	 *         print("Got", theValue, "even though print returns nil!")
	 *     end)
	 * ```
	 * If you return a LightPromise from the tap handler callback, its value will be discarded but `tap` will still wait until it resolves before passing the original value through.
	 */
	tap(this: LightPromise<T>, tapHandler: (value: T) => void): LightPromise<T>;

	/**
	 * Set a handler that will be called regardless of the promise's fate. The handler is called when the promise is resolved, rejected, _or_ cancelled.
	 *
	 * Returns a new promise chained from this promise.
	 *
	 * > Set a handler that will be called regardless of the promise's fate. The handler is called when the promise is
	resolved, rejected, *or* cancelled.
	Returns a new LightPromise that:
	- resolves with the same values that this LightPromise resolves with.
	- rejects with the same values that this LightPromise rejects with.
	- is cancelled if this LightPromise is cancelled.
	If the value you return from the handler is a LightPromise:
	- We wait for the LightPromise to resolve, but we ultimately discard the resolved value.
	- If the returned LightPromise rejects, the LightPromise returned from `finally` will reject with the rejected value from the
	*returned* promise.
	- If the `finally` LightPromise is cancelled, and you returned a LightPromise from the handler, we cancel that LightPromise too.
	Otherwise, the return value from the `finally` handler is entirely discarded.
	:::note Cancellation
	As of LightPromise v4, `LightPromise:finally` does not count as a consumer of the parent LightPromise for cancellation purposes.
	This means that if all of a LightPromise's consumers are cancelled and the only remaining callbacks are finally handlers,
	the LightPromise is cancelled and the finally callbacks run then and there.
	Cancellation still propagates through the `finally` LightPromise though: if you cancel the `finally` LightPromise, it can cancel
	its parent LightPromise if it had no other consumers. Likewise, if the parent LightPromise is cancelled, the `finally` LightPromise
	will also be cancelled.
	 * ```lua
	 * local thing = createSomething()
	 *
	 * doSomethingWith(thing)
	 *     :andThen(function()
	 *     print("It worked!")
	 *         -- do something..
	 *     end)
	 *     :catch(function()
	 *         warn("Oh no it failed!")
	 *     end)
	 *     :finally(function()
	 *         -- either way, destroy thing
	 *
	 *         thing:Destroy()
	 *     end)
	 * ```
	 */
	finally<const TResult = never>(
		this: LightPromise<T>,
		onSettled?: (
			status: LightPromiseConstructor["Status"],
		) => LightPromise<TResult> | void,
	): LightPromise<T | TResult>;

	/**
	 * Attaches an `andThen` handler to this LightPromise that calls the given callback with the predefined arguments. The resolved value is discarded.
	 * ```lua
	 * promise:andThenCall(someFunction, "some", "arguments")
	 * ```
	 * This is sugar for
	 * ```lua
	 * promise:andThen(function()
	 *     return someFunction("some", "arguments")
	 * end)
	 * ```
	 */
	andThenCall<const P extends ReadonlyArray<any>, const R>(
		this: LightPromise<T>,
		callback: (...args: P) => R,
		...args: P
	): LightPromise<R>;

	/**
	 * Same as `andThenCall`, except for `finally`.
	 *
	 * Attaches a `finally` handler to this LightPromise that calls the given callback with the predefined arguments.
	 */
	finallyCall<const P extends ReadonlyArray<unknown>, const R>(
		this: LightPromise<T>,
		callback: (...args: P) => R,
		...args: P
	): LightPromise<R>;

	/**
	 * Attaches an `andThen` handler to this LightPromise that discards the resolved value and returns the given value from it.
	 * ```lua
	 * promise:andThenReturn("value")
	 * ```
	 * This is sugar for
	 * ```lua
	 * promise:andThen(function()
	 *     return "value"
	 * end)
	 * ```
	 * > LightPromises are eager, so if you pass a LightPromise to `andThenReturn`, it will begin executing before `andThenReturn` is reached in the chain. Likewise, if you pass a LightPromise created from [LightPromise.reject](https://eryn.io/roblox-lua-promise/lib/#reject) into `andThenReturn`, it's possible that this will trigger the unhandled rejection warning. If you need to return a LightPromise, it's usually best practice to use [LightPromise.andThen](https://eryn.io/roblox-lua-promise/lib/#andthen).
	 */
	andThenReturn<const U>(this: LightPromise<T>, value: U): LightPromise<U>;

	/**
	 * Attaches a `finally` handler to this LightPromise that discards the resolved value and returns the given value from it.
	 * ```lua
	 * promise:finallyReturn("value")
	 * ```
	 * This is sugar for
	 * ```lua
	 * promise:finally(function()
	 *     return "value"
	 * end)
	 * ```
	 */
	finallyReturn<const U>(this: LightPromise<T>, value: U): LightPromise<U>;

	/**
	 * Returns a new LightPromise that resolves if the chained LightPromise resolves within `seconds` seconds, or rejects if execution time exceeds `seconds`. The chained LightPromise will be cancelled if the timeout is reached.
	 *
	 * Rejects with `rejectionValue` if it is non-nil. If a `rejectionValue` is not given, it will reject with a `LightPromise.Error(LightPromise.Error.Kind.TimedOut)`. This can be checked with `Error.isKind`.
	 * ```lua
	 * getSomething():timeout(5):andThen(function(something)
	 *     -- got something and it only took at max 5 seconds
	 * end):catch(function(e)
	 *     -- Either getting something failed or the time was exceeded.
	 *
	 *     if LightPromise.Error.isKind(e, LightPromise.Error.Kind.TimedOut) then
	 *         warn("Operation timed out!")
	 *     else
	 *         warn("Operation encountered an error!")
	 *     end
	 * end)
	 * ```
	 * Sugar for:
	 * ```lua
	 * LightPromise.race({
	 *     LightPromise.delay(seconds):andThen(function()
	 *         return LightPromise.reject(rejectionValue == nil and LightPromise.Error.new({ kind = LightPromise.Error.Kind.TimedOut }) or rejectionValue)
	 *     end),
	 *     promise
	 * })
	 * ```
	 */
	timeout(
		this: LightPromise<T>,
		seconds: number,
		rejectionValue?: unknown,
	): LightPromise<T>;

	/**
	 * Cancels this promise, preventing the promise from resolving or rejecting. Does not do anything if the promise is already settled.
	 *
	 * Cancellations will propagate upwards and downwards through chained promises.
	 *
	 * LightPromises will only be cancelled if all of their consumers are also cancelled. This is to say that if you call `andThen` twice on the same promise, and you cancel only one of the child promises, it will not cancel the parent promise until the other child promise is also cancelled.
	 * ```lua
	 * promise:cancel()
	 * ```
	 */
	cancel(this: LightPromise<T>): void;

	/**
	 * Chains a LightPromise from this one that is resolved if this LightPromise is already resolved, and rejected if it is not resolved at the time of calling `:now()`. This can be used to ensure your `andThen` handler occurs on the same frame as the root LightPromise execution.
	 * ```lua
	 * doSomething()
	 *     :now()
	 *     :andThen(function(value)
	 *         print("Got", value, "synchronously.")
	 *     end)
	 * ```
	 * If this LightPromise is still running, Rejected, or Cancelled, the LightPromise returned from `:now()` will reject with the `rejectionValue` if passed, otherwise with a `LightPromise.Error(LightPromise.Error.Kind.NotResolvedInTime)`. This can be checked with `Error.isKind`.
	 */
	now(this: LightPromise<T>, rejectionValue?: unknown): LightPromise<T>;

	/**
	 * Yields the current thread until the given LightPromise completes. Returns true if the LightPromise resolved, followed by the values that the promise resolved or rejected with.
	 * > If the LightPromise gets cancelled, this function will return `false`, which is indistinguishable from a rejection. If you need to differentiate, you should use [LightPromise.awaitStatus](https://eryn.io/roblox-lua-promise/lib/#awaitstatus) instead.
	 */
	await(this: LightPromise<T>): LuaTuple<[true, T] | [false, unknown]>;

	/**
	 * Yields the current thread until the given LightPromise completes. Returns the LightPromise's status, followed by the values that the promise resolved or rejected with.
	 */
	awaitStatus(this: LightPromise<T>): LuaTuple<[LightPromise.Status, unknown]>;

	/**
	 * Yields the current thread until the given LightPromise completes. Returns the values that the promise resolved with.
	 * ```lua
	 * local worked = pcall(function()
	 *     print("got", getTheValue():expect())
	 * end)
	 *
	 * if not worked then
	 *     warn("it failed")
	 * end
	 * ```
	 * This is essentially sugar for:
	 * ```lua
	 * select(2, assert(promise:await()))
	 * ```
	 * **Errors** if the LightPromise rejects or gets cancelled.
	 */
	expect(this: LightPromise<T>): T;

	/** Returns the current LightPromise status. */
	getStatus(this: LightPromise<T>): LightPromise.Status;
}

interface LightPromiseConstructor {
	readonly Status: {
		/** The LightPromise is executing, and not settled yet. */
		readonly Started: "Started";
		/** The LightPromise finished successfully. */
		readonly Resolved: "Resolved";
		/** The LightPromise was rejected. */
		readonly Rejected: "Rejected";
		/** The LightPromise was cancelled before it finished. */
		readonly Cancelled: "Cancelled";
	};

	readonly Error: LightPromise.ErrorConstructor;

	/**
	 * This type comes from lightweight LightPromise implementation.
	 *
	 * @see https://github.com/mathfox/rbx-promise
	 *
	 * Construct a new LightPromise that will be resolved or rejected with the given callbacks.
	 *
	 * If you `resolve` with a LightPromise, it will be chained onto.
	 *
	 * You can safely yield within the executor function and it will not block the creating thread.
	 *
	 * ```lua
	 * local myFunction()
	 *     return LightPromise.new(function(resolve, reject, onCancel)
	 *         wait(1)
	 *         resolve("Hello world!")
	 *     end)
	 * end
	 *
	 * myFunction():andThen(print)
	 * ```
	 * You do not need to use `pcall` within a LightPromise. Errors that occur during execution will be caught and turned into a rejection automatically. If error() is called with a table, that table will be the rejection value. Otherwise, string errors will be converted into `LightPromise.Error(LightPromise.Error.Kind.ExecutionError)` objects for tracking debug information.
	 *
	 * You may register an optional cancellation hook by using the `onCancel` argument:
	 * - This should be used to abort any ongoing operations leading up to the promise being settled.
	 * - Call the `onCancel` function with a function callback as its only argument to set a hook which will in turn be called when/if the promise is cancelled.
	 * - `onCancel` returns `true` if the LightPromise was already cancelled when you called `onCancel`.
	 * - Calling `onCancel` with no argument will not override a previously set cancellation hook, but it will still return `true` if the LightPromise is currently cancelled.
	 * - You can set the cancellation hook at any time before resolving.
	 * - When a promise is cancelled, calls to `resolve` or `reject` will be ignored, regardless of if you set a cancellation hook or not.
	 */
	new <const T>(
		executor: (
			resolve: (value: T | LightPromise<T>) => void,
			reject: (reason?: unknown) => void,
			onCancel: (abortHandler?: () => void) => boolean,
		) => void,
	): LightPromise<T>;

	/**
	 * The same as [LightPromise.new](https://eryn.io/roblox-lua-promise/lib/#new), except execution begins after the next `Heartbeat` event.
	 *
	 * This is a spiritual replacement for `spawn`, but it does not suffer from the same issues as `spawn`.
	 *
	 * ```lua
	 * local function waitForChild(instance, childName, timeout)
	 *     return LightPromise.defer(function(resolve, reject)
	 *         local child = instance:WaitForChild(childName, timeout)
	 *         if child then
	 *             resolve(child)
	 *         else
	 *             reject(child)
	 *         end
	 *     end)
	 * end
	 * ```
	 */
	defer: <const T>(
		executor: (
			resolve: (value: T | [T] | [LightPromise<T>]) => void,
			reject: (reason?: unknown) => void,
			onCancel: (abortHandler?: () => void) => boolean,
		) => void,
	) => LightPromise<T>;

	/**
	 * Begins a LightPromise chain, calling a function and returning a LightPromise resolving with its return value. If the function errors, the returned LightPromise will be rejected with the error. You can safely yield within the LightPromise.try callback.
	 *
	 * > `LightPromise.try` is similar to [LightPromise.promisify](https://eryn.io/roblox-lua-promise/lib/#promisify), except the callback is invoked immediately instead of returning a new function.
	 */
	try: <const T>(callback: () => T) => LightPromise<T>;

	/**
	 * Wraps a function that yields into one that returns a LightPromise.
	 *
	 * Any errors that occur while executing the function will be turned into rejections.
	 *
	 * > `LightPromise.promisify` is similar to [LightPromise.try](https://eryn.io/roblox-lua-promise/lib/#try), except the callback is returned as a callable function instead of being invoked immediately.
	 */
	promisify: <const T extends ReadonlyArray<unknown>, const U>(
		callback: (...args: T) => U,
	) => (...args: T) => LightPromise<U>;

	/** Creates an immediately resolved LightPromise with the given value. */
	resolve(this: void): LightPromise<void>;
	resolve<const T>(this: void, value: T): LightPromise<T>;

	/**
	 * Creates an immediately rejected LightPromise with the given value.
	 *
	 * > Someone needs to consume this rejection (i.e. `:catch()` it), otherwise it will emit an unhandled LightPromise rejection warning on the next frame. Thus, you should not create and store rejected LightPromises for later use. Only create them on-demand as needed.
	 */
	reject: (value: unknown) => LightPromise<unknown>;

	/**
	 * Accepts an array of LightPromises and returns a new promise that:
	 * - is resolved after all input promises resolve.
	 * - is rejected if _any_ input promises reject.
	 *
	 * Note: Only the first return value from each promise will be present in the resulting array.
	 *
	 * After any input LightPromise rejects, all other input LightPromises that are still pending will be cancelled if they have no other consumers.
	 *
	 * ```lua
	 * local promises = {
	 *     returnsALightPromise("example 1"),
	 *     returnsALightPromise("example 2"),
	 *     returnsALightPromise("example 3"),
	 * }
	 *
	 * return LightPromise.all(promises)
	 * ```
	 */
	all: <const T extends ReadonlyArray<unknown>>(
		values: readonly [...T],
	) => LightPromise<{ [P in keyof T]: Awaited<T[P]> }>;

	/**
	 * Accepts an array of LightPromises and returns a new LightPromise that resolves with an array of in-place Statuses when all input LightPromises have settled. This is equivalent to mapping `promise:finally` over the array of LightPromises.
	 *
	 * ```lua
	 * local promises = {
	 *     returnsALightPromise("example 1"),
	 *     returnsALightPromise("example 2"),
	 *     returnsALightPromise("example 3"),
	 * }
	 *
	 * return LightPromise.allSettled(promises)
	 * ```
	 */
	allSettled: <const T>(
		promises: ReadonlyArray<LightPromise<T>>,
	) => LightPromise<Array<LightPromise.Status>>;

	/**
	 * Accepts an array of LightPromises and returns a new promise that is resolved or rejected as soon as any LightPromise in the array resolves or rejects.
	 *
	 * > If the first LightPromise to settle from the array settles with a rejection, the resulting LightPromise from race will reject.
	 * > If you instead want to tolerate rejections, and only care about at least one LightPromise resolving, you should use [LightPromise.any](https://eryn.io/roblox-lua-promise/lib/#any) or [LightPromise.some](https://eryn.io/roblox-lua-promise/lib/#some) instead.
	 *
	 * All other LightPromises that don't win the race will be cancelled if they have no other consumers.
	 *
	 * ```lua
	 * local promises = {
	 *     returnsALightPromise("example 1"),
	 *     returnsALightPromise("example 2"),
	 *     returnsALightPromise("example 3"),
	 * }
	 *
	 * return LightPromise.race(promises)
	 * ```
	 */
	race: <const T>(promises: ReadonlyArray<LightPromise<T>>) => LightPromise<T>;

	/**
	 * Accepts an array of LightPromises and returns a LightPromise that is resolved as soon as `count` LightPromises are resolved from the input array. The resolved array values are in the order that the LightPromises resolved in. When this LightPromise resolves, all other pending LightPromises are cancelled if they have no other consumers.
	 *
	 * `count` 0 results in an empty array. The resultant array will never have more than count elements.
	 *
	 * ```lua
	 * local promises = {
	 *     returnsALightPromise("example 1"),
	 *     returnsALightPromise("example 2"),
	 *     returnsALightPromise("example 3"),
	 * }
	 *
	 * return LightPromise.some(promises, 2) -- Only resolves with first 2 promises to resolve
	 * ```
	 */
	some: <const T>(
		promises: ReadonlyArray<LightPromise<T>>,
		count: number,
	) => LightPromise<Array<T>>;

	/**
	 * Accepts an array of LightPromises and returns a LightPromise that is resolved as soon as _any_ of the input LightPromises resolves. It will reject only if _all_ input LightPromises reject. As soon as one LightPromises resolves, all other pending LightPromises are cancelled if they have no other consumers.
	 *
	 * Resolves directly with the value of the first resolved LightPromise. This is essentially [LightPromise.some](https://eryn.io/roblox-lua-promise/lib/#some) with `1` count, except the LightPromise resolves with the value directly instead of an array with one element.
	 * ```lua
	 * local promises = {
	 *     returnsALightPromise("example 1"),
	 *     returnsALightPromise("example 2"),
	 *     returnsALightPromise("example 3"),
	 * }
	 *
	 * return LightPromise.any(promises) -- Resolves with first value to resolve (only rejects if all 3 rejected)
	 * ```
	 */
	any: <const T>(promises: ReadonlyArray<LightPromise<T>>) => LightPromise<T>;

	/**
	 * Returns a LightPromise that resolves after `seconds` seconds have passed. The LightPromise resolves with the actual amount of time that was waited.
	 *
	 * This function is **not** a wrapper around `wait`. `LightPromise.delay` uses a custom scheduler which provides more accurate timing. As an optimization, cancelling this LightPromise instantly removes the task from the scheduler.
	 *
	 * > Passing `NaN`, infinity, or a number less than 1/60 is equivalent to passing 1/60.
	 */
	delay: (seconds: number) => LightPromise<number>;

	/**
	 * Iterates serially over the given an array of values, calling the predicate callback on each value before continuing.
	 *
	 * If the predicate returns a LightPromise, we wait for that LightPromise to resolve before moving on to the next item in the array.
	 *
	 * > `LightPromise.each` is similar to `LightPromise.all`, except the LightPromises are ran in order instead of all at once.
	 * > But because LightPromises are eager, by the time they are created, they're already running. Thus, we need a way to defer creation of each LightPromise until a later time.
	 * > The predicate function exists as a way for us to operate on our data instead of creating a new closure for each LightPromise. If you would prefer, you can pass in an array of functions, and in the predicate, call the function and return its return value.
	 *
	 * ```lua
	 * LightPromise.each({
	 *     "foo",
	 *     "bar",
	 *     "baz",
	 *     "qux"
	 * }, function(value, index)
	 *     return LightPromise.delay(1):andThen(function()
	 *         print(("%d) Got %s!"):format(index, value))
	 *     end)
	 * end)
	 *
	 * --[[
	 *     (1 second passes)
	 *     > 1) Got foo!
	 *     (1 second passes)
	 *     > 2) Got bar!
	 *     (1 second passes)
	 *     > 3) Got baz!
	 *     (1 second passes)
	 *     > 4) Got qux!
	 * ]]
	 * ```
	 *
	 * If the LightPromise a predicate returns rejects, the LightPromise from `LightPromise.each` is also rejected with the same value.
	 *
	 * If the array of values contains a LightPromise, when we get to that point in the list, we wait for the LightPromise to resolve before calling the predicate with the value.
	 *
	 * If a LightPromise in the array of values is already Rejected when `LightPromise.each` is called, `LightPromise.each` rejects with that value immediately (the predicate callback will never be called even once). If a LightPromise in the list is already Cancelled when `LightPromise.each` is called, `LightPromise.each` rejects with `LightPromise.Error(LightPromise.Error.Kind.AlreadyCancelled)`. If a LightPromise in the array of values is Started at first, but later rejects, `LightPromise.each` will reject with that value and iteration will not continue once iteration encounters that value.
	 *
	 * Returns a LightPromise containing an array of the returned/resolved values from the predicate for each item in the array of values.
	 *
	 * If this LightPromise returned from `LightPromise.each` rejects or is cancelled for any reason, the following are true:
	 * - Iteration will not continue.
	 * - Any LightPromises within the array of values will now be cancelled if they have no other consumers.
	 * - The LightPromise returned from the currently active predicate will be cancelled if it hasn't resolved yet.
	 */
	each: <const T, const U>(
		list: ReadonlyArray<T | LightPromise<T>>,
		predicate: (value: T, index: number) => U | LightPromise<U>,
	) => LightPromise<Array<U>>;

	/**
	 * Repeatedly calls a LightPromise-returning function up to `times` number of times, until the returned LightPromise resolves.
	 *
	 * If the amount of retries is exceeded, the function will return the latest rejected LightPromise.
	 * ```lua
	 * local function canFail(a, b, c)
	 *     return LightPromise.new(function(resolve, reject)
	 *         -- do something that can fail
	 *
	 *         local failed, thing = doSomethingThatCanFail(a, b, c)
	 *
	 *         if failed then
	 *             reject("it failed")
	 *         else
	 *             resolve(thing)
	 *         end
	 *     end)
	 * end
	 *
	 * local MAX_RETRIES = 10
	 * local value = LightPromise.retry(canFail, MAX_RETRIES, "foo", "bar", "baz") -- args to send to canFail
	 * ```
	 */
	retry: <const P extends ReadonlyArray<unknown>, const T>(
		callback: (...args: P) => LightPromise<T>,
		times: number,
		...args: P
	) => LightPromise<T>;

	/**
	 * Repeatedly calls a LightPromise-returning function up to `times` number of times, waiting `seconds` seconds between
	 * each retry, until the returned LightPromise resolves.
	 *
	 * If the amount of retries is exceeded, the function will return the latest rejected LightPromise.
	 */
	retryWithDelay: <const P extends ReadonlyArray<unknown>, const T>(
		callback: (...args: P) => LightPromise<T>,
		times: number,
		seconds: number,
		...args: P
	) => LightPromise<T>;

	/**
	 * Converts an event into a LightPromise which resolves the next time the event fires.
	 *
	 * The optional `predicate` callback, if passed, will receive the event arguments and should return `true` or `false`, based on if this fired event should resolve the LightPromise or not. If `true`, the LightPromise resolves. If `false`, nothing happens and the predicate will be rerun the next time the event fires.
	 *
	 * The LightPromise will resolve with the event arguments.
	 *
	 * > This function will work given any object with a `Connect` method. This includes all Roblox events.
	 * ```lua
	 * -- Creates a LightPromise which only resolves when `somePart` is touched by a part named `"Something specific"`.
	 * return LightPromise.fromEvent(somePart.Touched, function(part)
	 *     return part.Name == "Something specific"
	 * end)
	 * ```
	 */
	fromEvent<const T>(
		this: void,
		event: RBXScriptSignal<(value: T) => void>,
		predicate?: (value: T) => boolean,
	): LightPromise<T>;
	fromEvent(
		this: void,
		event: RBXScriptSignal<() => void>,
		predicate?: () => boolean,
	): LightPromise<void>;
	fromEvent<const T>(
		this: void,
		event: { Connect: (callback: (value: T) => void) => void },
		predicate?: (value: T) => boolean,
	): LightPromise<T>;

	/** Checks whether the given object is a LightPromise via duck typing. This only checks if the object is a table and has an `andThen` method. */
	is: (object: unknown) => object is LightPromise<unknown>;

	/**
	 * Folds an array of values or promises into a single value. The array is traversed sequentially.
	 *
	 * The reducer function can return a promise or value directly. Each iteration receives the resolved value from the previous, and the first receives your defined initial value.
	 *
	 * The folding will stop at the first rejection encountered.
	 * ```lua
	 * local basket = {"blueberry", "melon", "pear", "melon"}
	 * LightPromise.fold(basket, function(cost, fruit)
	 *   if fruit == "blueberry" then
	 *     return cost -- blueberries are free!
	 *   else
	 *     -- call a function that returns a promise with the fruit price
	 *     return fetchPrice(fruit):andThen(function(fruitCost)
	 *       return cost + fruitCost
	 *     end)
	 *   end
	 * end, 0)
	 * ```
	 */
	fold: <const T, const U>(
		list: ReadonlyArray<T | LightPromise<T>>,
		reducer: (accumulator: U, value: T, index: number) => U | LightPromise<U>,
		initialValue: U,
	) => LightPromise<U>;

	/**
	 * Registers a callback that runs when an unhandled rejection happens. An unhandled rejection happens when a LightPromise
	 * is rejected, and the rejection is not observed with `:catch`.
	 *
	 * The callback is called with the actual promise that rejected, followed by the rejection values.
	 */
	onUnhandledRejection: (
		callback: (this: LightPromise<never>, ...values: Array<unknown>) => void,
	) => () => void;
}

declare const LightPromise: LightPromiseConstructor;
