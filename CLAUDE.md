# ioBroker.rpi-io

**Purpose:** project facts for working on this adapter.

**Audience:** every AGENT in this repo.

**Contains:** project facts, setup extras; short imperative rules.

**Not here:** adapter setup rules (`/opt/iobroker/my_modules/.claude/rules/iobroker-adapter.md`), user-wide and adapter
development rules (`~/.claude/CLAUDE.md`, skill `developing-adapters`).

ioBroker adapter for Raspberry Pi I/O; `src/lib/io-adapter.ts` is its `IoAdapter` base class.

**Path:** `/opt/iobroker/my_modules/ioBroker.rpi-io`; Linux (Raspberry Pi).

**Requirements:** `docs/REQUIREMENTS.md` (IDs `REQ-<NAME>`, D11).

## Setup extras (B-EXTRAS)

Setup rules: `/opt/iobroker/my_modules/.claude/rules/iobroker-adapter.md`. Beyond the baseline: `@iobroker/types` stays
in `dependencies`.
