export { I2CProtocol } from './i2c-device';
export { SPIProtocol } from './spi-device';
export { PWMProtocol } from './pwm-device';
export { DigitalProtocol } from './digital-device';
export { AnalogProtocol } from './analog-device';
export { UARTProtocol } from './uart-device';
export { OneWireProtocol } from './onewire-device';
export { I2SProtocol } from './i2s-device';
export { HD44780Controller } from './hd44780-controller';
export { PulseProtocol } from './pulse-device';
export { NeoPixelProtocol } from './neopixel-device';
export { TwoWireProtocol } from './twowire-device';
export { RadioEnvironment, type RadioNode, type RadioPacket } from './radio-environment';

// Re-export old logic components for backward compatibility
export { NotGateLogic, TwoInputGateLogic, AndGateLogic, NandGateLogic, NorGateLogic, XorGateLogic } from './gates';
export { KeypadLogic } from './keypad';
export { SDCardLogic } from './sd-card';
export { SimulationMonitorLogic } from './simulation-monitor';

// Legacy name kept for backward compatibility
export { I2CProtocol as GenericI2CDevice } from './i2c-device';
export { SPIProtocol as GenericSPIDevice } from './spi-device';
