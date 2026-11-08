# ioBroker.rpi-io

**Purpose:** project facts for working on this adapter.

**Audience:** every AGENT in this repo.

**Contains:** project facts, setup extras; short imperative rules.

**Not here:** adapter development rules and `iobroker-utils` (`/opt/iobroker/my_modules/CLAUDE.md`), adapter setup rules
(`~/.claude/rules/iobroker-adapter.md`), user-wide rules (`~/.claude/CLAUDE.md`).

ioBroker adapter for Raspberry Pi I/O; uses `IoAdapter` from `iobroker-utils`.

**Path:** `/opt/iobroker/my_modules/ioBroker.rpi-io`; Linux (Raspberry Pi).

## Setup extras (B-EXTRAS)

Setup rules: `~/.claude/rules/iobroker-adapter.md`. Beyond the baseline: `iobroker-utils` dependency
(`bundledDependencies`, CI `install-command`), `@iobroker/types` stays in `dependencies`, CI `adapter-tests`
`integration-test-command` echo override.
