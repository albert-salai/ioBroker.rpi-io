import assert from 'node:assert/strict';
import { checkRows } from './rows';

const gpioIn = (gpioNum: number, state: string): ioBroker.AdapterConfig['GpioInput'][number] => ({
	gpioNum,
	state,
	name: state,
	role: 'sensor',
	inverted: false,
	pollSecs: 0,
	history: false,
});
const gpioOut = (gpioNum: number, state: string): ioBroker.AdapterConfig['GpioOutput'][number] => ({
	gpioNum,
	state,
	name: state,
	role: 'switch',
	inverted: false,
	default: false,
	autoOffSecs: 0,
	history: false,
});
const mcpIn = (mcpPin: 'A0' | 'A1', state: string): ioBroker.AdapterConfig['McpInput'][number] => ({
	mcpPin,
	state,
	name: state,
	role: 'sensor',
	inverted: false,
	history: false,
});

describe('checkRows', () => {
	it('REQ-ROW-STATE: skips a row with an empty state ID or one an earlier row of any table uses', () => {
		const { rows, errors } = checkRows({
			GpioInput: [gpioIn(4, 'a'), gpioIn(5, '')],
			GpioOutput: [gpioOut(6, 'a'), gpioOut(7, 'b')],
			McpInput: [mcpIn('A0', 'b'), mcpIn('A1', 'c')],
			McpOutput: [],
		});
		assert.deepEqual(
			rows.GpioInput.map(r => r.state),
			['a'],
		);
		assert.deepEqual(
			rows.GpioOutput.map(r => r.state),
			['b'],
		);
		assert.deepEqual(
			rows.McpInput.map(r => r.state),
			['c'],
		);
		assert.equal(errors.length, 3);
		assert.match(errors[0] ?? '', /^GpioInput row 2 .*empty state ID/);
		assert.match(errors[1] ?? '', /^GpioOutput row 1 .*state ID already used/);
		assert.match(errors[2] ?? '', /^McpInput row 1 .*state ID already used/);
	});

	it('REQ-ROW-PIN: skips a row whose pin an earlier row of a table of the same kind uses', () => {
		const { rows, errors } = checkRows({
			GpioInput: [gpioIn(4, 'a')],
			GpioOutput: [gpioOut(4, 'b'), gpioOut(5, 'c')],
			McpInput: [mcpIn('A0', 'd'), mcpIn('A0', 'e')],
			McpOutput: [],
		});
		assert.deepEqual(
			rows.GpioOutput.map(r => r.state),
			['c'],
		);
		assert.deepEqual(
			rows.McpInput.map(r => r.state),
			['d'],
		);
		assert.equal(errors.length, 2);
		assert.match(errors[0] ?? '', /^GpioOutput row 1 .*pin 4 already used/);
		assert.match(errors[1] ?? '', /^McpInput row 2 .*pin A0 already used/);
	});

	it('REQ-ROW-PIN: keeps the same pin number in a GPIO and an MCP23017 table', () => {
		const { errors } = checkRows({
			GpioInput: [gpioIn(0, 'a')],
			GpioOutput: [],
			McpInput: [mcpIn('A0', 'b')],
			McpOutput: [],
		});
		assert.deepEqual(errors, []);
	});
});
