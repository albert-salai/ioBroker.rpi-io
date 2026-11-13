// Auto-off timer of a pulse output (REQ-AUTO-OFF, REQ-OFF-CANCEL).

/** The timer functions the adapter offers (its own setTimeout/clearTimeout, cleared on unload). */
export interface Timers<T> {
	setTimeout: (cb: () => void, ms: number) => T;
	clearTimeout: (timer: T) => void;
}

/**
 * Returns the handler of the confirmed values of an output: a confirmed ON (re)starts a timer of `ms`,
 * a confirmed OFF cancels it; `fire` runs when the timer ends.
 *
 * @param ms the auto-off time
 * @param timers the timer functions
 * @param fire sends the OFF command
 */
export function autoOff<T>(ms: number, timers: Timers<T>, fire: () => void): (on: boolean) => void {
	let timer: T | undefined;
	return (on: boolean): void => {
		if (timer !== undefined) {
			timers.clearTimeout(timer);
			timer = undefined;
		}
		if (on) {
			timer = timers.setTimeout(() => {
				timer = undefined;
				fire();
			}, ms);
		}
	};
}
