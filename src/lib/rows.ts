// Row checks of the four pin tables of the settings page (REQ-ROW-STATE, REQ-ROW-PIN).

type Config = Pick<ioBroker.AdapterConfig, 'GpioInput' | 'GpioOutput' | 'McpInput' | 'McpOutput'>;

/** The tables with only their valid rows, and one error text per skipped row. */
export interface CheckedRows {
	rows: Config;
	errors: string[];
}

/**
 * Returns the tables without the rows whose state ID is empty or used by an earlier row of any table,
 * or whose pin an earlier row of a table of the same kind (GPIO or MCP23017) uses.
 * The tables are checked in the order GpioInput, GpioOutput, McpInput, McpOutput.
 *
 * @param config the adapter settings
 */
export function checkRows(config: Config): CheckedRows {
	const errors: string[] = [];
	const states = new Set<string>();
	const gpioPins = new Set<string>();
	const mcpPins = new Set<string>();

	const keep = <R extends { state: string }>(table: string, list: R[], pinOf: (row: R) => string): R[] =>
		list.filter((row, idx) => {
			const where = `${table} row ${String(idx + 1)} (state "${row.state}")`;
			const pin = pinOf(row);
			const pins = table.startsWith('Gpio') ? gpioPins : mcpPins;
			let error = '';
			if (!row.state) {
				error = 'empty state ID';
			} else if (states.has(row.state)) {
				error = 'state ID already used by an earlier row';
			} else if (pins.has(pin)) {
				error = `pin ${pin} already used by an earlier row`;
			}
			if (error) {
				errors.push(`${where}: ${error}, row skipped`);
				return false;
			}
			states.add(row.state);
			pins.add(pin);
			return true;
		});

	const gpioIn = keep('GpioInput', config.GpioInput, r => String(r.gpioNum));
	const gpioOut = keep('GpioOutput', config.GpioOutput, r => String(r.gpioNum));
	const mcpIn = keep('McpInput', config.McpInput, r => r.mcpPin);
	const mcpOut = keep('McpOutput', config.McpOutput, r => r.mcpPin);
	return { rows: { GpioInput: gpioIn, GpioOutput: gpioOut, McpInput: mcpIn, McpOutput: mcpOut }, errors };
}
