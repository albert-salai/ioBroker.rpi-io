// Rules for the state of one input or output pin, shared by the GPIO and the MCP23017 pins.

/** The state of an output as stored in ioBroker; null: no state yet. */
interface StoredState {
	val: unknown;
	ack: boolean;
}

/** The settings of an output row that its description and its restored value depend on. */
interface OutputSettings {
	inverted: boolean;
	default: boolean;
	autoOffSecs: number;
}

/**
 * Returns the description of an input state. The pin is e.g. 'GPIO 4' or 'MCP A3'; inverted means the physical level
 * is the opposite of the state value.
 */
export function describeInput(pin: string, inverted: boolean): string {
	return `${pin} INPUT${inverted ? ' inverted' : ''}`;
}

/**
 * Returns the description of an output state: pin (e.g. 'GPIO 17' or 'MCP B1'), inversion, default and auto-off time
 * of the output row.
 */
export function describeOutput(pin: string, output: OutputSettings): string {
	const autoOff = output.autoOffSecs > 0 ? ` auto-off ${String(output.autoOffSecs)} s` : '';
	return `${pin} OUTPUT${output.inverted ? ' inverted' : ''} default ${output.default ? 'ON' : 'OFF'}${autoOff}`;
}

/**
 * Returns the value an output starts with: its stored value when that was confirmed (ack), else its default.
 * A not-yet-acked value was never confirmed applied (e.g. the instance crashed mid-command), so it is no truth for
 * the pin. The default is that of the output row.
 */
export function restoredOutputValue(stored: StoredState | null | undefined, defaultVal: boolean): boolean {
	return typeof stored?.val === 'boolean' && stored.ack ? stored.val : defaultVal;
}

/**
 * Returns whether the stored state of the output must be rewritten with the restored value (from
 * restoredOutputValue()) and ack:true.
 */
export function outputStateNeedsWrite(stored: StoredState | null | undefined, restored: boolean): boolean {
	return restored !== stored?.val || !stored.ack;
}
