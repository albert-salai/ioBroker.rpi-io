# FIXME: intermittent MCP23017 `readInputs()` failures, self-healing via re-init

**Status:** NOT resolved, low severity — self-healing, no observed loss of function. 8 occurrences
logged since the last adapter start (2026-09-23 11:54), all on 2026-09-25, in bursts and isolated
hits, at no fixed interval. Current I2C config (`/boot/firmware/config.txt`):
`dtparam=i2c_arm=on`, `dtparam=i2c_arm_baudrate=400000` (400kHz Fast Mode, set by
`install-with-claude/A_debian/80_enable_i2c.sh`). Each occurrence logs:

```
error: rpi-io.0 (<pid>)  MCP23017  readInputs()  ioconb  0b00000000
error: rpi-io.0 (<pid>)  MCP23017  readInputs()          re-initializing mcp...
debug: rpi-io.0 (<pid>)  MCP23017  init()
```

`ioconb 0b00000000` is an all-zero readback of a register that should always read `IOCON.MIRROR`.

**Current root cause (leading theory):** a genuine MCP23017 chip reset (POR or hardware `RESET`
pin glitch), not a corrupted/short I2C transaction. Per the official datasheet
(`doc/MCP23017-Datasheet-DS20001952.pdf`, Table 3-5 register summary), **all 7 non-GPIO registers
in the 9-byte block `readInputs()` reads (`IOCON`, `GPPUA`, `GPPUB`, `INTFA`, `INTFB`, `INTCAPA`,
`INTCAPB`, addresses `0x0B`–`0x11`) have POR/RST default `0000 0000`** — identical to the observed
`ioconb` value. `IOCONB` reading exactly `0x00` is not an arbitrary/scrambled byte; it's precisely
what the chip reports right after a reset. Two reset paths fit: (a) §3.1 POR — a brief `VDD` sag
below the POR threshold (`D002`) or a rise slower than `D003`'s 0.05 V/ms guidance re-triggers POR
and clears every control register; (b) the chip's hardware `RESET` pin (pin 14/18, "Must be
externally biased" per datasheet) — confirmed in code that `McpResetStateId`/`mcp_reset`
(`src/lib/rpi-io.ts:387-410`) is a **virtual** ioBroker switch that only calls `mcp.init()` in
software and never drives this physical pin, so its actual board-level biasing (tied to `VDD`,
pulled up, or left floating) is unverified from the repo — a floating/noisy `RESET` line would
glitch-reset the chip the same way. Supporting facts: sole device on `/dev/i2c-1` (no bus
contention); every I2C call site funnels through `I2cBus.runExclusive()`'s single `Mutex` (not a
software race); `journalctl -k` has zero `i2c`/`bcm2835` driver errors at any failure timestamp;
failure-cluster timing doesn't align to `McpPollSecs` multiples (not a periodic software bug).

**Ruled out:**
- Kernel-detected bus fault (arbitration loss, NAK, clock-stretch timeout) — none in `journalctl
  -k` at any failure timestamp.
- Race between the adapter's own I2C call sites — fully `Mutex`-serialized, one transaction on the
  wire at a time.
- Fixed-interval software cause (e.g. off-by-one in the poll timer) — burst timing doesn't align
  to `McpPollSecs` multiples.
- Gas meter pulses (`rpi-io.0.pin.gas_zaehler`, MCP pin `B0`, same chip, each pulse also fires an
  interrupt-triggered `readInputs()`) as noise trigger: checked all 8 failures against `sql.0`'s
  `ts_bool` history (datapoint `1807`) — nearest pulse to any failure was 14.3 min away, despite
  526 pulses that day in dense multi-minute bursts. No correlation.
- Gas-burner relay switching (the on/off transient itself, the noise source `rpi-io.ts:7-10`
  documents for other GPIO inputs) as trigger: checked failures against pulse-burst start/end
  boundaries in the same history — nearest edge 14–50 min away. No correlation.
- Short/corrupted I2C block read as the primary mechanism — demoted, not eliminated. The
  datasheet's I2C write/read protocol section (§3.2.2.1) describes no partial-transaction
  corruption mode: a write not completed by ACK+Stop simply doesn't take effect, and reads just
  clock out register content with no framing that could return a legitimate-looking wrong byte
  count. A clean, all-zero readback across 7 unrelated control registers matches a real reset far
  better than corruption. Separately, the `i2c-bus` npm package's reported byte count can't
  distinguish these anyway: `readBlock()`'s 9-byte read goes through
  `i2c_smbus_read_i2c_block_data()` (`I2C_SMBUS` ioctl, `I2C_SMBUS_I2C_BLOCK_DATA`), and in that
  kernel path (`i2c_smbus_xfer_emulated()`, since `bcm2835` only implements `master_xfer`) the
  "bytes read" value is the caller's requested length echoed back, never the actual transferred
  count — logging it would always read `9` on success, confirming nothing. A driver-level
  short-read bug (e.g. a `bcm2835` FIFO-underrun erratum) is not excluded, just no longer leading.

**Fixes in place:** `readInputs()` (`src/lib/i2c-mcp23017.ts`) treats a wrong `ioconb` as "device
came up uninitialized": calls `init()` to rewrite `IOCONB`/`IODIRA`/`OLATA`/`GPINTENA`, then
recurses to retry the same poll. `init()` reads `GPIOA` once (clearing pending `INTF` flags)
without touching `pinStates`, so the retry reconciles against last-known ioBroker values and still
detects any real physical input change that happened while the device was stale. This is
detect-and-recover only, not a prevention — has always succeeded so far, no adapter crash/restart.
Separately, `readBlock()` exceptions (a transaction that actually throws) are caught/logged and
the poll silently returns 0 pin changes for that cycle without triggering re-init.

**Open items:**
- Confirm the chip-reset theory: `readInputs()` (`src/lib/i2c-mcp23017.ts:180-191`, shipped
  2026-09-25) now logs `ioconb` first as before, then the rest of the same already-fetched 9-byte
  block (`gppua`, `gppub`, `intfa`, `intfb`, `intcapa`, `intcapb`, `gpioa`, `gpiob` -- no extra I2C
  traffic, `readBlock()` already reads all 9 bytes in one transaction). On the next occurrence,
  check that block against the POR signature: `GPPUA=0x00, GPPUB=0x00, INTFA=0x00, INTFB=0x00,
  INTCAPA=0x00, INTCAPB=0x00`, with `GPIOA`/`GPIOB` showing plausible live pin states (not
  necessarily zero, since GPIO always reflects the live pins regardless of reset). A clean match
  confirms a real reset; a messier/inconsistent pattern instead favors read corruption.
- Physical check (needs hands-on-hardware, can't be done from this session): verify the
  MCP23017's `RESET` pin (14/18) biasing on the board in use — datasheet requires it "externally
  biased"; if it's floating or weakly pulled up, that's a direct glitch-reset path. Also scope/meter
  the chip's `VDD` for droop or noise around a failure, to check the POR brown-out path.
- If the full-block log doesn't match the POR signature, or the physical check finds no
  `RESET`-pin/`VDD` issue: fall back to the short-read theory's driver-level angle — enable
  `dyndbg` tracing on the
  `i2c_bcm2835`/`brcmstb-i2c` kernel module (`echo module i2c_bcm2835 +p >
  /sys/kernel/debug/dynamic_debug/control`, if built with `DYNAMIC_DEBUG`) for per-transaction
  driver-level detail, or switch the probe read to the library's raw `I2C_RDWR` path (`i2cRead()`)
  for message-level (not byte-level) pass/fail.
- Unshielded-wiring noise on `mcp_int` (GPIO4) hypothesis: the unshielded `/INT`-to-GPIO4 wire
  picks up noise that fires a spurious interrupt-triggered `readInputs()` — or the same noise
  couples onto the physically nearby SDA/SCL lines and corrupts the block read directly. Not
  confirmable yet: `rpi-io.0.pin.mcp_int` has `history: false` in `GpioInput` config, so there's no
  record of whether a spurious toggle preceded any of the 8 failures. To test: set that entry's
  `history: true` (or add a debug log line in `pinHandler()`/`init_gpio()` for `gpioNum === 4`,
  `src/lib/rpi-io.ts`) and check the next occurrence for a preceding INT toggle within the same
  second.
