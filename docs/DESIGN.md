# Design

**Purpose:** how the adapter meets its requirements, and why.

**Audience:** the MAINTAINER of this adapter and every AGENT that changes or traces its code.

**Contains:** the components, the contracts that users and scripts rely on, the rationale and the failure behaviour,
per group of requirements; written to be read from top to bottom.

**Not here:** the requirements ([`REQUIREMENTS.md`](REQUIREMENTS.md)), how the code works (the code and its comments),
the reasons for the traceability scheme (`/opt/iobroker/my_modules/.claude/rules/iobroker-adapter.md` D11), the hardware
notes ([`doc/`](../doc/)).

## Contents

- **[Components](#components)**
- **[Settings and rows](#settings-and-rows)**
- **[Connection state](#connection-state)**
- **[Outputs](#outputs)**
- **[GPIO inputs](#gpio-inputs)**
- **[MCP23017 inputs](#mcp23017-inputs)**
- **[MCP23017 interrupt, reset and recovery](#mcp23017-interrupt-reset-and-recovery)**

## Components

The adapter core ([`src/lib/rpi-io.ts`](../src/lib/rpi-io.ts)) reads the settings, creates the states, opens the pins
and connects each state to its pin.

The state layer ([`src/lib/io-adapter.ts`](../src/lib/io-adapter.ts)) is the base of the adapter. It creates or updates
the state objects, including the history setting, and offers reads, writes and subscriptions that tell a command (not
confirmed) from a confirmed value.

The Raspberry Pi GPIO pins are used through the `rpio` library with GPIO numbering, so the settings show the numbers
that the Pi documentation uses.

The I2C bus wrapper ([`src/lib/i2c-bus.ts`](../src/lib/i2c-bus.ts)) opens the bus the user chose, scans it and reads or
writes blocks of registers.

The expander driver ([`src/lib/i2c-mcp23017.ts`](../src/lib/i2c-mcp23017.ts)) configures the MCP23017, reads all of its
registers in one block, and tells the adapter core which input pin changed.

The interfaces that users and scripts rely on are the boolean states of the rows, which sit in the `pin` channel of the
instance and are named by the row's state column, and the state `info.connection`.

A pin and its state are tied by a command and a confirmation. A command is a value written without confirmation, by the
user or a script. The adapter applies it to the pin and then writes the same value as confirmed. Only a confirmed value
describes the real pin; this one rule serves outputs, the restart behaviour and the auto-off timer.

## Settings and rows

**Satisfies:** REQ-BUS-NUMBER, REQ-SETTINGS, REQ-OPTIONAL-STATE, REQ-ROW-STATE, REQ-ROW-PIN

The settings page has one table per kind of pin. The adapter core validates a table row by row at start. A row with an
empty state, a state that an earlier row of any table uses, or a pin that an earlier row of any table of the same kind
uses is skipped with an error that names the row. State IDs are unique across the tables because they share one
channel. One mistake of the user then costs one pin, not all of them.

The optional INT and RESET states are looked up once at start. A state that is empty or missing switches its feature
off, because the adapter has nothing to subscribe to.

The expander is searched on the bus the user chose and used only at address 0x20, the only address the adapter supports.
Other devices that answer on the bus are ignored.

## Connection state

**Satisfies:** REQ-CONNECTION

The connection state is false from the start. The adapter core sets it to true after the GPIO pins are open, the I2C bus
is open and every expander found has finished its initialization. A failure in any of these steps is logged at error
level and keeps the state false. Pins that were opened before the failure keep working, because a broken expander
should not stop a relay on a GPIO pin.

After the set-up the adapter does not track the chip. A later failure is only logged, because the recovery
requirement handles a lost chip.

## Outputs

**Satisfies:** REQ-OUTPUT, REQ-OUTPUT-START, REQ-AUTO-OFF, REQ-OFF-CANCEL

An output state is writable. A command on it is applied to the pin at once, inverted when the row says so, and then
written back as confirmed. The confirmation tells scripts that the pin has really changed.

At start the adapter reads the state. A confirmed value becomes the pin level. A state that holds an unconfirmed value
or no value takes the row's default, and the state is rewritten as confirmed. An unconfirmed value means that the
adapter stopped between the command and its confirmation, so nobody knows what the pin did.

The auto-off timer belongs to the confirmed ON, not to the command. The adapter starts it when it sees a confirmed ON,
including one that the start procedure restores, so a restored pulse output cannot stay on for good. The timer ends when
it fires, and a confirmed OFF cancels it, so a user's own OFF is never followed by a second one. When it fires, the
adapter sends an OFF command, so the normal command path switches the pin and confirms the state.

## GPIO inputs

**Satisfies:** REQ-GPIO-INPUT, REQ-GPIO-DEBOUNCE, REQ-GPIO-POLL, REQ-STOP-EDGE

Each input pin is pulled up inside the Pi, and a pin pulled to ground reads ON because the default row is inverted. The
state takes the pin level once at start, then at every edge that the library reports.

Power-grid glitches produce short phantom edges. The adapter waits until the pin has been quiet for the debounce time,
then reads the pin and writes the state only when the level differs from the state. Debouncing at the reading side keeps
a real change that lasts longer than the debounce time and drops the glitches.

The optional poll covers an edge that was lost. Every edge restarts the poll timer, so the poll fires only after a quiet
time. A level found different from the state is written and logged as a warning, because it means that an edge was
missed.

When the adapter stops, it switches off the edge detection of every pin before anything else. Left on, the hardware may
latch events that nobody clears, and an interrupt storm can block a CPU of the Pi.

## MCP23017 inputs

**Satisfies:** REQ-MCP-INPUT, REQ-MCP-POLL

The driver reads all registers of the expander in one block. One block read gives the input levels and the configuration
registers together at the cost of one bus access, so the driver can see in the same read whether the chip lost its
configuration. The driver compares the levels with the last levels it saw and calls the adapter core for each input pin
that changed. The core writes the state only when the value differs.

A read happens at start, on an interrupt, after a reset and at every poll interval. The poll covers an interrupt that
was lost; a change that only the poll finds is logged as a warning.

The expander has no internal pull-ups enabled, so an input needs an external one. The pins A7 and B7 are meant for
outputs. The adapter logs an error for an input row on one of them and reads the pin anyway, because the pin works and
the user's wiring should not stop.

## MCP23017 interrupt, reset and recovery

**Satisfies:** REQ-MCP-INT, REQ-MCP-RESET, REQ-MCP-RECOVER

The INT pin of the expander is wired to a GPIO input of the Pi, and its state is the INT state. A confirmed ON of that
state triggers a read of the expander, so a change shows within the debounce time of that GPIO input and not at the next
poll.

The RESET state is a switch for a user or a script. It is any state, so a hardware input can drive it too. A confirmed
ON makes the adapter command the state back to OFF, and any confirmed OFF starts the re-initialization after a 200 ms
wait, which lets the chip settle. The state is confirmed
OFF at each start.

The recovery uses the read that already happens. When the configuration register of the expander has not the value that
the driver sets, the chip has lost power or was reset. The driver logs all registers at error level, which allows
telling a chip reset (all registers at their defaults) from a corrupted read, initializes the chip again, which sets
the pin directions and the output levels from the states, and reads again. The driver does this once per read. When the
second read is still unconfigured, it logs and leaves the next attempt to the next poll, so a broken chip or bus costs
one attempt per poll interval and does not loop. The inputs that changed meanwhile reach their states by the second
read, and the outputs get their last values by the initialization.
