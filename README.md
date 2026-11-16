# iobroker.rpi-io

Connects the inputs and outputs of a Raspberry Pi to ioBroker.

- **Inputs:** a switch or sensor on a GPIO pin or on a pin of an MCP23017 expander shows as a state that follows the
  pin. The history of the state can be kept.
- **Outputs:** a relay or other load on a GPIO pin or an MCP23017 pin follows a state that you or a script set.
- **Pulse outputs:** an output can switch itself off after a set time, for a door opener or a bell.

## Requirements

- A Raspberry Pi with Linux.
- For MCP23017 pins: an MCP23017 expander at address 0x20 on the I2C bus. An input needs an external pull-up.

## Configuration

Name, configure and add the pins in the admin settings. The settings have two tabs: GPIO and MCP23017.

- **GPIO numbers** are GPIO numbers 1 to 27, not the pin number of the header.
- **I2C bus:** the number of the bus (0 or 1) of the expander, 1 by default.
- **Debounce:** a GPIO input takes the pin level after it has been quiet for the debounce time, 20 ms by default.
- **Poll time:** an input is checked again after this time without a change. 0 switches the check off.
- **Auto-off time:** an output above 0 s switches itself off after this time.
- **INT pin and RESET switch (optional):** a state for the interrupt output of the expander shows an input change
  without waiting for the poll interval. A state for the RESET switch starts the expander again without a restart of the
  adapter. An empty state switches the feature off.

A row with an empty or used state ID, or with a pin that another row already uses, is skipped and logged as an error.
The other rows keep working.

## States

Each row gets a state in the channel `pin` of the instance. The state `info.connection` is true when the pins are set
up and every expander on the bus works.

The full list of requirements is in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Changelog

### **WORK IN PROGRESS**

* initial release

## License

MIT License. Copyright (c) 2024 albert-salai. The full text is in [LICENSE](LICENSE).
