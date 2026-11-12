# Requirements

**Purpose:** the requirements of this adapter.

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

The user names, configures and adds the pins in the admin settings.

## Scheme

Statements follow the skill `specifying-requirements`. A requirement not yet confirmed by the USER has the ID
`INFERRED-<NAME>`.

## General

### I2C bus

**`INFERRED-I2C-BUS`: The adapter scans the I2C bus whose number (0 or 1) the user sets in the settings, 1 by default,
and uses an MCP23017 expander found at address 0x20.**

The settings of the MCP23017 tab apply only when the expander answers.

### Connection state

**`INFERRED-CONNECTION`: The connection state is true when the adapter has set up the GPIO pins and scanned the I2C
bus, and false before that and after a failed set-up.**

A failure of the set-up is written to the log at error level.

## Outputs of both tabs

**`INFERRED-OUTPUT`: For each row of the GPIO output and MCP output tables, the adapter provides a writable boolean
state; when the user or a script sets the state, the adapter drives the pin to that value, inverted when the row says
so, and then confirms the state.**

The state has the row's name and role, and its history is kept when the row says so.

**`INFERRED-OUTPUT-START`: At start, an output pin takes the last confirmed value of its state; without one, it takes
the default value of its row.**

A value that was set but not confirmed, for example by a stop during the command, is not trusted.

**`INFERRED-OUTPUT-AUTO-OFF`: When a row of an output table has an auto-off time above 0 s, the adapter switches the
output off that many seconds after it was confirmed ON.**

## GPIO

### Input debounce

**`INFERRED-GPIO-DEBOUNCE`: A GPIO input state takes the pin level once the pin has been quiet for the debounce time
set in the settings; the default is 20 ms, and 0 switches debouncing off.**

The debounce hides the phantom pulses that power-grid glitches cause, mostly when the gas burner switches.

### GPIO inputs

**`INFERRED-GPIO-INPUT`: For each row of the GPIO input table, the adapter provides a read-only boolean state that
shows the level of the pin, inverted when the row says so.**

The pin is pulled up internally, and the default is inverted, so a pin pulled to ground reads ON. The state has the
row's name and role, and its history is kept when the row says so. At start the state takes the current pin level.

**`INFERRED-GPIO-POLL`: When a row of the GPIO input table has a poll time above 0 s, the adapter checks the pin every
that many seconds, writes the pin level to the state when they differ and logs a warning.**

The check covers a pin change that the edge detection missed. The timer starts again after each pin change.

## MCP23017

### INT pin

**`INFERRED-MCP-INT`: When the state chosen as INT pin is confirmed ON, the adapter reads the MCP23017 inputs at
once.**

The INT pin is a GPIO input wired to the interrupt output of the expander.

### RESET switch

**`INFERRED-MCP-RESET`: When the state chosen as RESET pin is confirmed ON, the adapter commands it OFF; once that OFF
is confirmed, the adapter waits 200 ms, initializes the MCP23017 again and reads its inputs.**

The state is OFF at each start. It does not drive the reset pin of the chip.

### Poll interval

**`INFERRED-MCP-POLL`: The adapter reads all MCP23017 inputs every poll interval, 10 s by default; 0 switches the
polling off. A difference to the states is written to the states and logged as a warning.**

The poll covers an interrupt that was missed.

### MCP inputs

**`INFERRED-MCP-INPUT`: For each row of the MCP input table, the adapter provides a read-only boolean state that shows
the level of the chosen pin (A0 to B7), inverted when the row says so.**

The default is inverted. The state has the row's name and role, and its history is kept when the row says so. At start
the adapter reads the pins and updates each state that differs. The adapter logs an error for an input on A7 or B7,
because the chip may use these two pins as outputs only.

### Recovery

**`REQ-MCP-RECOVER`: When the MCP23017 reads back an unconfigured state, as after a chip reset, the adapter logs the
registers at error level, initializes the chip again and repeats the read.**

The inputs that changed meanwhile reach their states, and the outputs take their last values again.
