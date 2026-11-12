# Requirements

**Purpose:** the requirements of this adapter and the rules for writing them.

**Audience:** the DEVELOPER and the REVIEWER of this adapter, and every AGENT that traces a change to its requirements.

**Contains:** the purpose of the adapter, the ID scheme, and the requirements, one section per tab of the adapter's
settings page; written to be read from top to bottom.

**Not here:** how the requirements are built (source comments), the reasons for the ID scheme
(`~/.claude/rules/iobroker-adapter.md` D11), the hardware notes ([`doc/`](../doc/)).

## Purpose of the adapter

The adapter connects the inputs and outputs of a Raspberry Pi to ioBroker:
- **Inputs:** a switch or sensor on a GPIO pin or on an MCP23017 pin shows as a state that follows the pin, with its
  history kept.
- **Outputs:** a relay or other load on a GPIO pin or an MCP23017 pin follows a state that the user or a script sets.
- **Pulse outputs:** an output can switch itself off after a set time, for a door opener or a bell.

The user names, configures and adds the pins in the admin settings; the adapter needs no script.

## Scheme

A requirement is one atomic, testable statement with an ID `REQ-<NAME>` (`NFR-<NAME>` for a non-functional one): one or
two upper-case words joined by a hyphen, unique in this repo. Write it as a paragraph ``**`REQ-<NAME>`: <one-line
statement>**``, followed by its description as a paragraph of its own. A requirement not yet confirmed by the USER has
the ID `INFERRED-<NAME>`. Design, code, tests and commits cite the ID. The full convention is in the skill
`specifying-requirements`, the reasons are in `~/.claude/rules/iobroker-adapter.md` D11.

## General

### I2C bus

**`INFERRED-I2C-BUS`: The adapter reads the MCP23017 expander on the I2C bus whose number (0 or 1) the user sets in
the settings; the default is bus 1.**

The adapter scans the bus at start. Only an MCP23017 at address 0x20 is used; any other device on the bus is ignored.

### Connection state

**`INFERRED-CONNECTION`: The connection state is false from the start of the adapter until all configured pins are set
up, true after that, and false again when the set-up fails.**

A failure of the set-up is written to the log at error level.

## GPIO

### Input debounce

**`INFERRED-GPIO-DEBOUNCE`: A GPIO input state takes the pin level once the pin has been quiet for the debounce time
set in the settings; the default is 20 ms, and 0 switches debouncing off.**

The debounce hides the phantom pulses that power-grid glitches cause, mostly when the gas burner switches.

### GPIO inputs

**`INFERRED-GPIO-INPUT`: For each row of the GPIO input table, the adapter provides a read-only boolean state that
shows the level of the pin, inverted when the row says so; a pin is pulled up internally.**

The default is inverted, so a pin pulled to ground reads ON. The state has the row's name and role, and its history is
kept when the row says so. At start the state takes the current pin level.

**`INFERRED-GPIO-POLL`: When a row of the GPIO input table has a poll time above 0 s, the adapter checks the pin every
that many seconds, writes the pin level to the state when they differ and logs a warning.**

The check covers a pin change that the edge detection missed. The timer starts again after each pin change.

### GPIO outputs

**`INFERRED-GPIO-OUTPUT`: For each row of the GPIO output table, the adapter provides a writable boolean state; when
the user or a script sets the state, the adapter drives the pin to that value, inverted when the row says so, and then
confirms the state.**

The state has the row's name and role, and its history is kept when the row says so.

**`INFERRED-GPIO-OUTPUT-START`: At start, a GPIO output pin takes the last confirmed value of its state; without one,
it takes the default value of the row.**

A value that was set but not confirmed, for example by a stop during the command, is not trusted.

**`INFERRED-GPIO-AUTO-OFF`: When a row of the GPIO output table has an auto-off time above 0 s, the adapter switches the
output off that many seconds after it was confirmed ON.**

## MCP23017

### INT pin

**`INFERRED-MCP-INT`: When the state chosen as INT pin turns ON, the adapter reads the MCP23017 inputs at once.**

The INT pin is a GPIO input wired to the interrupt output of the expander. Without the setting, the adapter reads the
inputs only at the poll interval.

### Poll interval

**`INFERRED-MCP-POLL`: The adapter reads all MCP23017 inputs every poll interval, 10 s by default; 0 switches the
polling off. A difference to the states is written to the states and logged as a warning.**

The poll covers an interrupt that was missed.

### RESET switch

**`INFERRED-MCP-RESET`: When the state chosen as RESET pin is set ON, the adapter switches it back OFF and, 200 ms
later, initializes the MCP23017 again and reads its inputs.**

The state is OFF at each start. The state is a virtual switch; it does not drive the reset pin of the chip.

### MCP inputs

**`INFERRED-MCP-INPUT`: For each row of the MCP input table, the adapter provides a read-only boolean state that shows
the level of the chosen pin (A0 to B7), inverted when the row says so.**

The default is inverted. The state has the row's name and role, and its history is kept when the row says so. At start
the adapter reads the pins and updates each state that differs.

### MCP outputs

**`INFERRED-MCP-OUTPUT`: For each row of the MCP output table, the adapter provides a writable boolean state; when the
user or a script sets the state, the adapter drives the chosen pin to that value, inverted when the row says so, and
then confirms the state.**

**`INFERRED-MCP-OUTPUT-START`: At start, an MCP output pin takes the last confirmed value of its state; without one, it
takes the default value of the row.**

**`INFERRED-MCP-AUTO-OFF`: When a row of the MCP output table has an auto-off time above 0 s, the adapter switches the
output off that many seconds after it was confirmed ON.**

### Recovery

**`REQ-MCP-RECOVER`: When the MCP23017 reads back an unconfigured state, as after a chip reset, the adapter logs
the registers at error level, initializes the chip again and repeats the read.**

The inputs that changed meanwhile reach their states, and the outputs take their last values again.
