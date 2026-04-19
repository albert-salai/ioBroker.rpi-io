import { RpiIo } from './lib/rpi-io';

if (require.main !== module) {
	module.exports = (compactOptions: {		// compact mode: host calls this factory instead of spawning a process
		logLevel:			string;
		compactInstance:	number;
		compact:			true
	}) => new RpiIo(compactOptions);
} else {
	(() => new RpiIo())();					// standalone process: start directly
}
