import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('io-package.json', () => {
	it('names the adapter rpi-io', () => {
		const ioPackage = JSON.parse(readFileSync(join(__dirname, '..', 'io-package.json'), 'utf8')) as {
			common: { name: string };
		};
		assert.equal(ioPackage.common.name, 'rpi-io');
	});
});
