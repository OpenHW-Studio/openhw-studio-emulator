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

// ── WiFi / Network stack ─────────────────────────────────────────────────────
// WifiEnvironment: shared registry for all WiFi boards and AP components.
export {
  WifiEnvironment, wifiEnvironment,
  type WiFiApConfig, type WiFiConnectionStatus,
  type WiFiNodeInfo, type WiFiPacketEvent,
} from './wifi-environment';

// Pico W full L2–L7 userspace network stack (port of velxio picow_net).
export { PicowNetBridge, type FrameEmitFn } from './picow-net/index';
export { PcapWriter } from './picow-net/pcap-writer';
export { TcpNat } from './picow-net/tcp-nat';
export { UdpNat } from './picow-net/udp-nat';

// ESP32 serial output parser for WiFi/BLE status events.
export {
  WiFiStatusStreamParser,
  parseWifiLine, parseBleLine, parseSerialText,
  type WifiEvent, type BleEvent,
} from './wifi-status-parser';

// Network Worker proxy — boards use this to talk to the dedicated network worker.
export {
  NetworkWorkerProxy, networkWorkerProxy,
  type NetWorkerStatusMsg, type NetWorkerFrameInMsg,
} from './network-worker-proxy';
