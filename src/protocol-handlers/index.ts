export { I2CProtocol } from './i2c-device.ts';
export { SPIProtocol } from './spi-device.ts';
export { PWMProtocol } from './pwm-device.ts';
export { DigitalProtocol } from './digital-device.ts';
export { AnalogProtocol } from './analog-device.ts';
export { UARTProtocol } from './uart-device.ts';
export { OneWireProtocol } from './onewire-device.ts';
export { I2SProtocol } from './i2s-device.ts';
export { HD44780Controller } from './hd44780-controller.ts';
export { PulseProtocol } from './pulse-device.ts';
export { NeoPixelProtocol } from './neopixel-device.ts';
export { TwoWireProtocol } from './twowire-device.ts';
export { RadioEnvironment, type RadioNode, type RadioPacket } from './radio-environment.ts';

// Re-export old logic components for backward compatibility
export { NotGateLogic, TwoInputGateLogic, AndGateLogic, NandGateLogic, NorGateLogic, XorGateLogic } from './gates.ts';
export { KeypadLogic } from './keypad.ts';
export { SDCardLogic } from './sd-card.ts';
export { SimulationMonitorLogic } from './simulation-monitor.ts';

// Legacy name kept for backward compatibility
export { I2CProtocol as GenericI2CDevice } from './i2c-device.ts';
export { SPIProtocol as GenericSPIDevice } from './spi-device.ts';
