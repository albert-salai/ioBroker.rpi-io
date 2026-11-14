# Traceability: ioBroker.rpi-io, repo, all

Date 2026-11-14. Requirements: 19 (`docs/REQUIREMENTS.md`, none `INFERRED:`). Design: `docs/DESIGN.md`.
`npm run check:reqs`: 19 requirements, 0 errors, 0 warnings. Verified-by shows the unit tests that cite the ID; the
integration test runs only in CI (critical instance) and was not run.

| Req ID | Satisfied by (`docs/DESIGN.md`) | Implemented in (`src/lib/`) | Unit tests | Status |
|---|---|---|---|---|
| REQ-BUS-NUMBER | Settings and rows | `rpi-io.ts` | — | ✅ |
| REQ-SETTINGS | Settings and rows | `adapter-config.d.ts` | — | ✅ |
| REQ-OPTIONAL-STATE | Settings and rows | `rpi-io.ts` | — | ✅ |
| REQ-ROW-STATE | Settings and rows | `rpi-io.ts`, `rows.ts` | `rows.test.ts` | ✅ |
| REQ-ROW-PIN | Settings and rows | `rpi-io.ts`, `rows.ts` | `rows.test.ts` | ✅ |
| REQ-CONNECTION | Connection state | `rpi-io.ts` | `i2c-mcp23017.test.ts` | ✅ |
| REQ-OUTPUT | Outputs | `rpi-io.ts` | — | ✅ |
| REQ-OUTPUT-START | Outputs | `rpi-io.ts` | — | ✅ |
| REQ-AUTO-OFF | Outputs | `auto-off.ts`, `rpi-io.ts` | `auto-off.test.ts` | ✅ |
| REQ-OFF-CANCEL | Outputs | `auto-off.ts`, `rpi-io.ts` | `auto-off.test.ts` | ✅ |
| REQ-GPIO-DEBOUNCE | GPIO inputs | `rpi-io.ts` | — | ✅ |
| REQ-GPIO-INPUT | GPIO inputs | `rpi-io.ts` | — | ✅ |
| REQ-GPIO-POLL | GPIO inputs | `rpi-io.ts` | — | ✅ |
| REQ-STOP-EDGE | GPIO inputs | `rpi-io.ts` | — | ✅ |
| REQ-MCP-INT | MCP23017 interrupt, reset and recovery | `rpi-io.ts` | — | ✅ |
| REQ-MCP-RESET | MCP23017 interrupt, reset and recovery | `rpi-io.ts` | — | ✅ |
| REQ-MCP-POLL | MCP23017 inputs | `rpi-io.ts` | — | ✅ |
| REQ-MCP-INPUT | MCP23017 inputs | `rpi-io.ts` | — | ✅ |
| REQ-MCP-RECOVER | MCP23017 interrupt, reset and recovery | `i2c-mcp23017.ts` | `i2c-mcp23017.test.ts` | ✅ |

## Gaps

- ❌ Blockers: none.
- ⚠️ Follow-ups: none. Every requirement has a design section and a code citation.
- ℹ️ 13 of 19 requirements have no unit test that cites them (hardware access: pins, MCP23017 registers); tests are
  optional (`specifying-requirements`).
- ℹ️ Backward check: no code or test cites an unknown ID.
- ℹ️ `README.md` is a two-line stub; its content is a topic of the host conventions step.
