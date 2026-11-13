import assert from 'node:assert/strict';
import { IoAdapter } from './io-adapter';
import type { I2cBus } from './i2c-bus';
import { MCP23017 } from './i2c-mcp23017';

const IOCON_MIRROR = 0x40;
const noop = (): void => undefined;

// MCP23017 takes its logger from the adapter singleton; a stub replaces it.
before(() => {
	(IoAdapter as unknown as { this_: unknown }).this_ = {
		logf: { silly: noop, info: noop, debug: noop, warn: noop, error: noop },
	};
});

// Fake bus: readBlock() answers the 9 bytes from IOCONB with the given IOCONB value.
function fakeBus(ioconb: () => number, fail = false): { bus: I2cBus; inits: () => number } {
	let inits = 0;
	const bus = {
		readBlock: () => Promise.resolve([ioconb(), 0, 0, 0, 0, 0, 0, 0, 0]),
		writeByte: () => {
			if (fail) {
				return Promise.reject(new Error('bus down'));
			}
			inits++;
			return Promise.resolve();
		},
		writeWord: () => Promise.resolve(),
		readWord: () => Promise.resolve(0),
	};
	return { bus: bus as unknown as I2cBus, inits: () => inits };
}

describe('MCP23017', () => {
	it('REQ-MCP-RECOVER: re-initializes an unconfigured chip and repeats the read once', async () => {
		let reads = 0;
		const { bus, inits } = fakeBus(() => (reads++ === 0 ? 0x00 : IOCON_MIRROR));
		const mcp = new MCP23017({ i2cBus: bus, i2cAddr: 0x20 });
		await mcp.readInputs();
		assert.equal(inits(), 1);
		assert.equal(reads, 2);
	});

	it('REQ-MCP-RECOVER: re-initializes at most once per read when the chip stays unconfigured', async () => {
		let reads = 0;
		const { bus, inits } = fakeBus(() => {
			reads++;
			return 0x00;
		});
		const mcp = new MCP23017({ i2cBus: bus, i2cAddr: 0x20 });
		assert.equal(await mcp.readInputs(), 0);
		assert.equal(inits(), 1);
		assert.equal(reads, 2);
	});

	it('REQ-CONNECTION: init() reports a failed chip init', async () => {
		const ok = new MCP23017({ i2cBus: fakeBus(() => IOCON_MIRROR).bus, i2cAddr: 0x20 });
		const bad = new MCP23017({ i2cBus: fakeBus(() => IOCON_MIRROR, true).bus, i2cAddr: 0x20 });
		assert.equal(await ok.init(), true);
		assert.equal(await bad.init(), false);
	});
});
