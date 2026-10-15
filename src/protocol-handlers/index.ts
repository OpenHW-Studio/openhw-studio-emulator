export { I2CProtocol, I2cBusFramer, type I2cFrameEvents } from './i2c-device';
export { SPIProtocol, SpiBusFramer, type SpiFrameEvents, type SPITransactionMeta } from './spi-device';
export { PWMProtocol, PwmBusFramer, type PwmFrameEvents, type PwmSignal } from './pwm-device';
export { DigitalProtocol, DigitalBusFramer, type DigitalFrameEvents } from './digital-device';
export { AnalogProtocol, AnalogBusFramer, type AnalogFrameEvents } from './analog-device';
export { UARTProtocol, UartBusFramer, type UartFrameEvents } from './uart-device';
export { OneWireProtocol, OneWireBusFramer, type OneWireFrameEvents } from './onewire-device';
export { I2SProtocol, I2sBusFramer, type I2sFrameEvents } from './i2s-device';
export { HD44780Controller } from './hd44780-controller';
export { PulseProtocol, PulseBusFramer, type PulseFrameEvents } from './pulse-device';
export { NeoPixelProtocol, NeoPixelBusFramer, type NeoPixelFrameEvents } from './neopixel-device';
export { TwoWireProtocol, TwoWireBusFramer, type TwoWireFrameEvents } from './twowire-device';
export { RadioEnvironment, type RadioNode, type RadioPacket } from './radio-environment';

// Re-export old logic components for backward compatibility
export { NotGateLogic, TwoInputGateLogic, AndGateLogic, NandGateLogic, NorGateLogic, XorGateLogic } from './gates';
export { KeypadLogic } from './keypad';
export { SDCardLogic } from './sd-card';
export { SimulationMonitorLogic } from './simulation-monitor';

// Legacy name kept for backward compatibility
export { I2CProtocol as GenericI2CDevice } from './i2c-device';
export { SPIProtocol as GenericSPIDevice } from './spi-device';
