import assert from 'node:assert/strict';
import { autoOff } from './auto-off';

// Fake timers: the test runs the pending timer by hand.
function fakeTimers(): {
	timers: { setTimeout: (cb: () => void, ms: number) => number; clearTimeout: (t: number) => void };
	pending: Map<number, { cb: () => void; ms: number }>;
} {
	const pending = new Map<number, { cb: () => void; ms: number }>();
	let next = 1;
	return {
		pending,
		timers: {
			setTimeout: (cb, ms) => {
				pending.set(next, { cb, ms });
				return next++;
			},
			clearTimeout: t => {
				pending.delete(t);
			},
		},
	};
}

describe('autoOff', () => {
	it('REQ-AUTO-OFF: a confirmed ON starts one timer of the auto-off time that sends OFF', () => {
		const { timers, pending } = fakeTimers();
		let fired = 0;
		const confirmed = autoOff(5000, timers, () => fired++);
		confirmed(true);
		assert.equal(pending.size, 1);
		const entry = [...pending][0];
		assert.ok(entry);
		const [id, { cb, ms }] = entry;
		assert.equal(ms, 5000);
		pending.delete(id);
		cb();
		assert.equal(fired, 1);
	});

	it('REQ-AUTO-OFF: a second confirmed ON restarts the timer instead of adding one', () => {
		const { timers, pending } = fakeTimers();
		const confirmed = autoOff(5000, timers, () => undefined);
		confirmed(true);
		confirmed(true);
		assert.equal(pending.size, 1);
	});

	it('REQ-OFF-CANCEL: a confirmed OFF cancels the running timer', () => {
		const { timers, pending } = fakeTimers();
		let fired = 0;
		const confirmed = autoOff(5000, timers, () => fired++);
		confirmed(true);
		confirmed(false);
		assert.equal(pending.size, 0);
		assert.equal(fired, 0);
	});
});
