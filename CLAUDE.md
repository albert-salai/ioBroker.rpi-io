# Project Configuration

## Project Overview
**ioBroker.rpi-io** — ioBroker adapter for Raspberry Pi I/O.

## Development Notes
- **Location**: `/opt/iobroker/my_modules/ioBroker.rpi-io`
- **Platform**: Linux (Raspberry Pi)
- **Execute as user**: `iobroker` — all commands must use `sudo -u iobroker <command>`

## Shared Library (iobroker-io-lib)
- Depends on `iobroker-io-lib` via `"iobroker-io-lib": "file:../ioBroker.io-lib"` in package.json
- Uses `IoAdapter` from the shared library
- To modify: edit `../ioBroker.io-lib/src/` and rebuild with `npm run build`

## Claude Memory
- **Primary knowledge store**: This `CLAUDE.md` file — all project details and learned patterns should be recorded here, not in `~/.claude/projects/*/memory/`

---
*Last updated: 2026-02-17*
