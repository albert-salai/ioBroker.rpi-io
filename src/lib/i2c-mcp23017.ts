/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
import { IoAdapter }		from './io-adapter';
import { I2cBus }			from './i2c-bus';

// MCP23017: IO7 must be set via I2C interface to "0" (output)

// Registers		(IOCON.BANK = 0)
enum Register {
	IODIRA		= 0x00,		// I/O DIRECTION				1 = input (default)		0 = output
	IODIRB		= 0x01,		// I/O DIRECTION				1 = input (default)		0 = output
	IPOLA		= 0x02,		// INPUT POLARITY PORT			1 = GPIO register bit reflects the opposite logic state of the input pin
	IPOLB		= 0x03,		// INPUT POLARITY PORT			1 = GPIO register bit reflects the opposite logic state of the input pin
	GPINTENA	= 0x04,		// INTERRUPT-ON-CHANGE PINS		If a bit is set, the corresponding pin is enabled for interrupt-on-change
	GPINTENB	= 0x05,		// INTERRUPT-ON-CHANGE PINS		If a bit is set, the corresponding pin is enabled for interrupt-on-change
	DEFVALA		= 0x06,		// DEFAULT VALUE				If the associated pin level is the opposite from the register bit, an interrupt occurs
	DEFVALB		= 0x07,		// DEFAULT VALUE				If the associated pin level is the opposite from the register bit, an interrupt occurs
	INTCONA		= 0x08,		// INTERRUPT-ON-CHANGE CONTROL	0 = Pin value is compared against the previous pin value
	INTCONB		= 0x09,		// INTERRUPT-ON-CHANGE CONTROL	0 = Pin value is compared against the previous pin value
	IOCONA		= 0x0A,		// I/O EXPANDER CONFIGURATION
	IOCONB		= 0x0B,		// I/O EXPANDER CONFIGURATION
	GPPUA		= 0x0C,
	GPPUB		= 0x0D,
	INTFA		= 0x0E,		// INTERRUPT FLAG				1 = Pin caused interrupt
	INTFB		= 0x0F,		// INTERRUPT FLAG				1 = Pin caused interrupt
	INTCAPA		= 0x10,		// INTERRUPT CAPTURED			1 = Logic-high, 0 = Logic-low
	INTCAPB		= 0x11,		// INTERRUPT CAPTURED			1 = Logic-high, 0 = Logic-low
	GPIOA		= 0x12,		// read port; write to output latch register
	GPIOB		= 0x13,		// read port; write to output latch register
	OLATA		= 0x14,		// OUTPUT LATCH REGISTER
	OLATB		= 0x15		// OUTPUT LATCH REGISTER
};

// IOCON Register
enum IOCON {
	INTPOL	= 1 << 1,		// This bit sets the polarity of the INT output pin		default 0 = ACTIVE-LOW
	ODR		= 1 << 2,		// Configures the INT pin as an open-drain output
	HAEN	= 1 << 3,		// Hardware Address Enable bit; if disabled, device’s hardware address is A2=A1=A0=0
	SEQOP	= 1 << 5,		// Sequential Operation mode bit
	MIRROR	= 1 << 6,		// INT Pins Mirror bit
	BANK	= 1 << 7,		// Controls how the registers are addressed
};

// McpDir
export enum McpDir {
	OUTPUT		= 0,
	INPUT		= 1
};

// McpPol
export enum McpPol {
	ACTIVE_HIGH		= 0,
	ACTIVE_LOW		= 1
};

// PinNum, PinName
const PinNum = {
	A0:  0, A1:  1, A2:  2, A3:  3, A4:  4, A5:  5, A6:  6, A7:  7,
	B0:  8, B1:  9, B2: 10, B3: 11, B4: 12, B5: 13, B6: 14, B7: 15,
};
type PinName = keyof typeof PinNum;


// PinChangeCb
declare type PinChangeCb	= (level: boolean) => Promise<void>;

// MCP23017Options
interface MCP23017Options {
	i2cBus:			I2cBus,
	i2cAddr:		number,
};

// PinOptions
interface PinOptions {
	pinName:		PinName,
	initVal:		boolean,
	onChange?:		PinChangeCb,
};


// ~~~~~~~~
// MCP23017
// ~~~~~~~~
export class MCP23017 {
	private readonly logf:	IoAdapter['logf'];
	private readonly i2c:	I2cBus;
	private readonly addr:	number;

	private	inputMask		= 0x0000;		// B7 (bit 15) ... B0 (bit 8)  A7 (bit 7) ... A0 (bit 0)
	private	outputMask		= 0x0000;		// B7 (bit 15) ... B0 (bit 8)  A7 (bit 7) ... A0 (bit 0)
	private	pinStates		= 0x0000;		// B7 (bit 15) ... B0 (bit 8)  A7 (bit 7) ... A0 (bit 0)
	private pinCallbacks:	{ pinMask: number, cb: PinChangeCb }[]		= [];

	// CONSTRUCTOR
	public constructor(options: MCP23017Options) {
		this.logf	= IoAdapter.this.logf;
		this.i2c	= options.i2cBus;
		this.addr	= options.i2cAddr;
	}

	/**
	 *
	 * @param pin
	 * @param dir
	 * @param pol
	 * @param level
	 * @param cb
	 */
	public register_pin(options: PinOptions): void {
		//this.log.debug('%-15s %-15s %-10s %-40s %-10s %-7s %-3s', this.constructor.name, 'register_pin()', `MCP-${pinNum < 8 ? 'A' : 'B'}-${pinNum % 8}`, '', (pol === McpPol.ACTIVE_LOW ? 'inverted' : ''), (dir === McpDir.INPUT ? 'INPUT' : 'OUTPUT'), (level ? 'ON' : 'OFF'));
		const isInput = !! options.onChange;
		const initVal =    options.initVal;
		const pinName =    options.pinName;
		const pinNum  = PinNum[pinName];
		const pinMask = (1 <<  pinNum );

		// on MCP23017 A7, B7
		if (pinName === 'A7'  &&  isInput) {
			this.logf.error('%-15s %-15s %-25s 0b%016b', this.constructor.name, 'register_pin()', 'pin A7', 'may be output only');
		}
		if (pinName === 'B7'  &&  isInput) {
			this.logf.error('%-15s %-15s %-25s 0b%016b', this.constructor.name, 'register_pin()', 'pin B7', 'may be output only');
		}

		// set direction
		if (isInput)	{ this.inputMask  |=  pinMask; }
		else			{ this.outputMask |=  pinMask; }

		// init level
		if (initVal) 	{ this.pinStates |=  pinMask; }
		else			{ this.pinStates &= ~pinMask; }

		// set input pin val change callback
		if (options.onChange) {
			this.pinCallbacks.push({
				'pinMask':		pinMask,
				'cb':			options.onChange
			});
		}
	}

	/**
	 *
	 */
	public async init(): Promise<void> {
		this.logf.debug('%-15s %-15s %-10s %-40s', this.constructor.name, 'init()', '', '');

		try {
			// set IOCON.MIRROR, pin directions and output values
			await this.i2c.writeByte(this.addr, Register.IOCONB,   IOCON.MIRROR);
			await this.i2c.writeWord(this.addr, Register.IODIRA,  ~this.outputMask);		// 0 := output
			await this.i2c.writeWord(this.addr, Register.OLATA,    this.pinStates );

			// first read GPIO (will disable pending INTF interrupt flags), then enable interrupt
			this.pinStates = await this.i2c.readWord(this.addr, Register.GPIOA);
			await this.i2c.writeWord(this.addr, Register.GPINTENA, this.inputMask);

		} catch(e: unknown) {
			this.logf.error('%-15s %-15s %-10s %-40s', this.constructor.name, 'init()', '', (e instanceof Error) ? e.stack : JSON.stringify(e));
		}
	}

	/**
	 *
	 */
	public async readInputs(): Promise<number> {
		let pinChange = 0;
		try {
			// ioconb intFlags, gpioVals
			const [ ioconb, gppua, gppub, intfa, intfb, intcapa, intcapb, gpioa, gpiob ] = await this.i2c.readBlock(this.addr, Register.IOCONB, 9);
			if (ioconb === undefined  ||  gppua === undefined  ||  gppub === undefined  ||  intfa === undefined  ||  intfb === undefined  ||  intcapa === undefined  ||  intcapb === undefined  ||  gpioa === undefined  ||  gpiob === undefined) {
				//this.logf.error('%-15s %-15s %-10s %-40s', this.constructor.name, 'readInputs()', '', 'i2c.readBlock() failed');
				return pinChange;
			}

			// check if mcp is not yet initialized
			if ((ioconb as IOCON) !== IOCON.MIRROR) {
				this.logf.error('%-15s %-15s %-10s 0b%08b',	this.constructor.name, 'readInputs()', 'ioconb', ioconb);
				this.logf.error('%-15s %-15s %-10s %-40s',	this.constructor.name, 'readInputs()', '', 're-initializing mcp...');
				await this.init();
				pinChange = await this.readInputs();
				return pinChange;
			}

			// get changed input pin values
			const gpioVals	= (gpiob << 8) | gpioa;			// GPIOB, GPIOA
			const pinStates	= (gpioVals  & this.inputMask) | (this.pinStates & ~this.inputMask);
			pinChange		= (pinStates ^ this.pinStates) &  this.inputMask;
			this.pinStates	=  pinStates;

			// handle changed input pins
			for (const { pinMask, cb } of this.pinCallbacks) {
				if (pinMask & pinChange) {
					const pinState = !! (pinStates & pinMask);
					await cb(pinState);
				}
			}

			// try again
			const intFlags	= (intfb << 8) | intfa;			// INTFB, INTFA
			if (intFlags !== 0x0000) {
				return await this.readInputs();
			}

		} catch(e: unknown) {
			this.logf.error('%-15s %-15s %-10s %-40s', this.constructor.name, 'readInputs()', '', (e instanceof Error) ? e.stack : JSON.stringify(e));
		}

		return pinChange;
	}

	/**
	 *
	 * @param pinNum
	 * @param level
	 */
	public async setOutput({ pinName, pinVal }: { pinName: PinName, pinVal: boolean }): Promise<void> {
		const pinNum  = PinNum[pinName];
		const pinMask = (1 <<  pinNum );

		// update pinStates
		if (pinVal) 	{ this.pinStates |=  pinMask; }
		else			{ this.pinStates &= ~pinMask; }

		// write output latches
		// OLATA:	A write modifies the output latches that modifies the pins configured as outputs.
		await this.i2c.writeWord(this.addr, Register.OLATA, this.pinStates)
			.catch((e: unknown) => {
				this.logf.error('%-15s %-15s %-10s %-40s', this.constructor.name, 'setOutput()', '', (e instanceof Error) ? e.stack : JSON.stringify(e));
			});
	}
}
