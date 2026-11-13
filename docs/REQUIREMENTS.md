# Requirements

**Purpose:** the requirements of this adapter.

**Audience:** the MAINTAINER of this adapter and every AGENT that traces a change to its requirements.

**Contains:** the purpose of the adapter, the ID scheme, and the requirements, in sections per tab of the adapter's
settings page and one section for the outputs that both tabs share; written to be read from top to bottom.

**Not here:** how the requirements are built (source comments), the reasons for the ID scheme
(`/opt/iobroker/my_modules/.claude/rules/iobroker-adapter.md` D11), the hardware notes ([`doc/`](../doc/)).

## Purpose of the adapter

The adapter connects the inputs and outputs of a Raspberry Pi to ioBroker.

**Inputs:** a switch or sensor on a GPIO pin or on an MCP23017 pin shows as a state that follows the pin, with its
history kept.

**Outputs:** a relay or other load on a GPIO pin or an MCP23017 pin follows a state that the user or a script sets.

**Pulse outputs:** an output can switch itself off after a set time, for a door opener or a bell.

The user names, configures and adds the pins in the admin settings.

## Contents

- **[Purpose of the adapter](#purpose-of-the-adapter)**
- **[Scheme](#scheme)**
- **[General](#general)**: [I2C bus](#i2c-bus) · [Settings](#settings) · [Connection state](#connection-state)
- **[Outputs of both tabs](#outputs-of-both-tabs)**
- **[GPIO](#gpio)**: [Input debounce](#input-debounce) · [GPIO inputs](#gpio-inputs) · [Stop](#stop)
- **[MCP23017](#mcp23017)**: [INT pin](#int-pin) · [RESET switch](#reset-switch) · [Poll interval](#poll-interval) ·
  [MCP inputs](#mcp-inputs) · [Recovery](#recovery)

## Scheme

Statements follow the skill `specifying-requirements`. A requirement not yet confirmed by the MAINTAINER
has the prefix `INFERRED: ` before its ID.

## General

### I2C bus

**INFERRED: `REQ-BUS-NUMBER`: The adapter uses an MCP23017 expander at the address 0x20 on the I2C bus whose number (0
or 1) the user sets in the settings, 1 by default.**

The settings of the MCP23017 tab apply only when the expander answers.

### Settings

**INFERRED: `REQ-SETTINGS`: The settings accept GPIO numbers 1 to 27 (GPIO numbering, not the header pin number) and
times of 0 s or more.**

**INFERRED: `REQ-OPTIONAL-STATE`: An INT or RESET state that is empty or does not exist switches that feature off.**

**`REQ-ROW-STATE`: The adapter skips a row of an input or output table whose state ID is empty or already used by an
earlier row of any table, and logs an error naming the row; the other rows keep working.**

**`REQ-ROW-PIN`: The adapter skips a row of an input or output table whose GPIO pin or MCP23017 pin an earlier row of
any table of the same kind already uses, and logs an error naming the row; the other rows keep working.**

The MAINTAINER decided both on 2026-11-13. The state IDs share one channel, so they are unique across all tables.

### Connection state

**`REQ-CONNECTION`: The connection state is true once the adapter has set up its pins and every MCP23017 found on the
bus has initialized, and false before that and after a failed set-up or chip init.**

A failure of the set-up, for example an I2C bus that does not open, is written to the log at error level; the GPIO pins
set up before it keep working. A failed chip init keeps the state false (MAINTAINER, 2026-11-13). A failure of the
MCP23017 after the set-up is logged and does not change the state.

## Outputs of both tabs

The output tables of the GPIO tab and the MCP23017 tab share these requirements.

**INFERRED: `REQ-OUTPUT`: For each row of the GPIO output and MCP output tables, the adapter provides a writable boolean
state; when the user or a script sets the state, the adapter sets the pin to that value, inverted when the row says so,
and then confirms the state.**

The state has the row's name and role, and its history is kept when the row says so and a history adapter is
configured. The state sits under the `pin` channel of the instance, named by the row's state column.

**INFERRED: `REQ-OUTPUT-START`: At start, an output pin takes the last confirmed value of its state; without one, it
takes the row's default.**

The pin takes the level of that value, inverted when the row says so. A value that was set but not confirmed, for
example by a stop during the command, is not trusted.

**`REQ-AUTO-OFF`: When a row of an output table has an auto-off time above 0 s, the adapter switches the output off
that many seconds after it was confirmed ON.**

An ON that the adapter restores at start counts as confirmed ON and starts a full timer (MAINTAINER, 2026-11-13).

**`REQ-OFF-CANCEL`: When an output is confirmed OFF, the adapter cancels its running auto-off timer.**

## GPIO

The outputs of this tab follow [Outputs of both tabs](#outputs-of-both-tabs).

### Input debounce

**INFERRED: `REQ-GPIO-DEBOUNCE`: A GPIO input state takes the pin level once the pin has been quiet for the debounce
time set in the settings; the default is 20 ms, and 0 switches debouncing off.**

The debounce hides phantom pulses that power-grid glitches cause.

### GPIO inputs

**INFERRED: `REQ-GPIO-INPUT`: For each row of the GPIO input table, the adapter provides a read-only boolean state that
shows the level of the pin, inverted when the row says so.**

The pin is pulled up internally, and the default is inverted, so a pin pulled to ground reads ON. The state has the
row's name and role, and its history is kept when the row says so and a history adapter is configured. At start
the state takes the current pin level.

**INFERRED: `REQ-GPIO-POLL`: When a row of the GPIO input table has a poll time above 0 s, the adapter checks the pin
after that many seconds without a pin change and writes the pin level to the state when they differ.**

The check covers a pin change that the adapter did not notice; the adapter logs a warning when it corrects the state.

### Stop

**INFERRED: `REQ-STOP-EDGE`: When the adapter stops, it switches off the edge detection of all GPIO input pins.**

Edge detection left on can latch events that nobody clears and lock up a CPU of the Pi in an interrupt storm.

## MCP23017

The outputs of this tab follow [Outputs of both tabs](#outputs-of-both-tabs).

### INT pin

**INFERRED: `REQ-MCP-INT`: When the state chosen as INT pin is confirmed ON, the adapter updates the MCP input states
from the MCP23017.**

The INT pin is a GPIO input wired to the interrupt output of the expander, so an input change shows without waiting for
the poll interval.

### RESET switch

**INFERRED: `REQ-MCP-RESET`: When the state chosen as RESET pin is confirmed ON, the adapter initializes the MCP23017
again and updates the MCP input states, without a restart of the adapter.**

The state switches itself back to OFF, and the initialization starts 200 ms after that OFF is confirmed; any confirmed
OFF of the state starts it. The state is OFF at each start. The state can be any state, including an input of this
adapter; whichever adapter writes the OFF with ack confirms it (MAINTAINER, 2026-11-13).

### Poll interval

**INFERRED: `REQ-MCP-POLL`: The adapter updates the MCP input states from the MCP23017 every poll interval, 10 s by
default; 0 switches the polling off.**

The poll covers an interrupt that was missed; an input that changed since the last read is written to its state and
logged as a warning.

### MCP inputs

**INFERRED: `REQ-MCP-INPUT`: For each row of the MCP input table, the adapter provides a read-only boolean state that
shows the level of the chosen pin (A0 to B7), inverted when the row says so.**

The default is inverted. The state has the row's name and role, and its history is kept when the row says so and a
history adapter is configured. At start the adapter reads the pins and updates each state that differs. The adapter
logs an error at start for an input row on A7 or B7 and still reads the pin (MAINTAINER, 2026-11-13). The expander
has no pull-up enabled, so an input needs an external pull-up.

### Recovery

**`REQ-MCP-RECOVER`: When the MCP23017 reads back an unconfigured state, as after a chip reset, the adapter
logs the registers at error level, initializes the chip again and repeats the read.**

The inputs that changed meanwhile reach their states, and the outputs take their last values again. The adapter
initializes the chip at most once per read; when the repeated read is still unconfigured, it logs the registers and
waits for the next poll (MAINTAINER, 2026-11-13).
