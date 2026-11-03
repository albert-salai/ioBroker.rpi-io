# Project Configuration

## Project Overview
**ioBroker.rpi-io** — ioBroker adapter for Raspberry Pi I/O.

## Development Notes
- **Location**: `/opt/iobroker/my_modules/ioBroker.rpi-io`
- **Platform**: Linux (Raspberry Pi)
- **Execute as user**: `iobroker` — all commands must use `sudo -u iobroker <command>`

## Shared Library (iobroker-utils)
- Depends on `iobroker-utils` via `"iobroker-utils": "file:../iobroker-utils"` in package.json
- Uses `IoAdapter` from the shared library
- To modify: edit `../iobroker-utils/src/` and rebuild with `npm run build`
- `../iobroker-utils` has its own `postinstall` (builds `dist/` automatically) and declares
  `typescript` as a real dependency (not devDependency), so `npm install` here also builds
  the nested `iobroker-utils` correctly

## Setup
- Setup rules: `~/.claude/rules/iobroker-adapter.md`; `npm run verify` mirrors CI
- B-EXTRAS: `iobroker-utils` dependency (`bundledDependencies`, CI `install-command`); `@iobroker/types` stays in `dependencies`; CI `adapter-tests` keeps an `integration-test-command` echo override (npm does not install the dependencies of the bundled `iobroker-utils` (`@iobroker/adapter-core`, `mysql2`), see `~/.claude/rules/iobroker-adapter.md` D7)

## Claude Memory
- **Primary knowledge store**: This `CLAUDE.md` file — all project details and learned patterns should be recorded here, not in `~/.claude/projects/*/memory/`

---
*Last updated: 2026-09-24*
