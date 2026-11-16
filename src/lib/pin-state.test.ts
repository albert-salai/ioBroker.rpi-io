import assert from 'node:assert/strict';
import { describeInput, describeOutput, outputStateNeedsWrite, restoredOutputValue } from './pin-state';

describe('pin-state', () => {
	it('describes an input, inverted or not', () => {
		assert.equal(describeInput('GPIO 4', false), 'GPIO 4 INPUT');
		assert.equal(describeInput('MCP A3', true), 'MCP A3 INPUT inverted');
	});

	it('describes an output with default and optional auto-off', () => {
		assert.equal(
			describeOutput('GPIO 17', { inverted: false, default: false, autoOffSecs: 0 }),
			'GPIO 17 OUTPUT default OFF',
		);
		assert.equal(
			describeOutput('MCP B1', { inverted: true, default: true, autoOffSecs: 2 }),
			'MCP B1 OUTPUT inverted default ON auto-off 2 s',
		);
	});

	it('restores a confirmed value and falls back to the default for any other', () => {
		assert.equal(restoredOutputValue({ val: true, ack: true }, false), true);
		assert.equal(restoredOutputValue({ val: false, ack: true }, true), false);
		assert.equal(restoredOutputValue({ val: true, ack: false }, false), false);
		assert.equal(restoredOutputValue({ val: 'x', ack: true }, true), true);
		assert.equal(restoredOutputValue(null, true), true);
		assert.equal(restoredOutputValue(undefined, false), false);
	});

	it('rewrites the state when it is missing, differs or is not acked', () => {
		assert.equal(outputStateNeedsWrite(null, false), true);
		assert.equal(outputStateNeedsWrite({ val: true, ack: false }, true), true);
		assert.equal(outputStateNeedsWrite({ val: false, ack: true }, true), true);
		assert.equal(outputStateNeedsWrite({ val: true, ack: true }, true), false);
	});
});
