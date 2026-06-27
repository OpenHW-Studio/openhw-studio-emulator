export type IRProtocol =
  | 'NEC' | 'NEC_EXT'
  | 'SONY_12' | 'SONY_15' | 'SONY_20'
  | 'RC5' | 'RC6'
  | 'SAMSUNG'
  | 'JVC'
  | 'PANASONIC';

export interface IRPulse {
  level: number;    // 1 = mark (IR LED on / carrier present), 0 = space (IR LED off)
  durationUs: number;
}

export interface IRSignal {
  protocol: IRProtocol;
  address: number;
  command: number;
  toggleBit?: number;
  carrierHz: number;
  pulses: IRPulse[];
}

const PROTOCOL_CARRIER: Record<IRProtocol, number> = {
  NEC: 38000, NEC_EXT: 38000,
  SONY_12: 40000, SONY_15: 40000, SONY_20: 40000,
  RC5: 36000, RC6: 36000,
  SAMSUNG: 38000,
  JVC: 38000,
  PANASONIC: 38000,
};

function addBit(pulses: IRPulse[], bitVal: number, markUs: number, space0Us: number, space1Us: number): void {
  pulses.push({ level: 1, durationUs: markUs });
  pulses.push({ level: 0, durationUs: bitVal ? space1Us : space0Us });
}

function addManchesterBit(pulses: IRPulse[], bitVal: number, halfPeriodUs: number): void {
  if (bitVal) {
    pulses.push({ level: 1, durationUs: halfPeriodUs });
    pulses.push({ level: 0, durationUs: halfPeriodUs });
  } else {
    pulses.push({ level: 0, durationUs: halfPeriodUs });
    pulses.push({ level: 1, durationUs: halfPeriodUs });
  }
}

// ── NEC ────────────────────────────────────────────────────────────────

function encodeNECPulses(address: number, command: number, extended: boolean): IRPulse[] {
  const p: IRPulse[] = [];
  // Leader: 9ms mark + 4.5ms space
  p.push({ level: 1, durationUs: 9000 }, { level: 0, durationUs: 4500 });

  let data: number;
  if (extended) {
    // 16-bit address (no inversion)
    const invCmd = (~command) & 0xFF;
    data = (address & 0xFFFF) | ((command & 0xFF) << 16) | ((invCmd & 0xFF) << 24);
  } else {
    const invAddr = (~address) & 0xFF;
    const invCmd = (~command) & 0xFF;
    data = (address & 0xFF) | (invAddr << 8) | ((command & 0xFF) << 16) | (invCmd << 24);
  }

  for (let i = 0; i < 32; i++) {
    addBit(p, (data >> i) & 1, 562.5, 562.5, 1687.5);
  }
  // Stop bit
  p.push({ level: 1, durationUs: 562.5 });
  return p;
}

function decodeNECPulses(pulses: IRPulse[], extended: boolean): { address: number; command: number } | null {
  if (pulses.length < 68) return null;

  const idx = extended ? 0 : 0;

  if (pulses.length < 2) return null;
  if (!matchPulse(pulses[0], 1, 9000, 2000)) return null;
  if (!matchPulse(pulses[1], 0, 4500, 1000)) return null;

  let data = 0;
  for (let i = 0; i < 32; i++) {
    const markIdx = 2 + i * 2;
    const spaceIdx = 2 + i * 2 + 1;
    if (spaceIdx >= pulses.length) return null;
    if (!matchPulse(pulses[markIdx], 1, 562.5, 200)) return null;
    const space = pulses[spaceIdx];
    if (space.level !== 0) return null;
    if (space.durationUs > 1000) {
      data |= (1 << i);
    }
  }

  if (extended) {
    const cmd = (data >> 16) & 0xFF;
    const invCmd = (data >> 24) & 0xFF;
    if ((cmd ^ invCmd) !== 0xFF) return null;
    return { address: data & 0xFFFF, command: cmd };
  } else {
    const addr = data & 0xFF;
    const invAddr = (data >> 8) & 0xFF;
    const cmd = (data >> 16) & 0xFF;
    const invCmd = (data >> 24) & 0xFF;
    if ((addr ^ invAddr) !== 0xFF) return null;
    if ((cmd ^ invCmd) !== 0xFF) return null;
    return { address: addr, command: cmd };
  }
}

// ── Sony SIRC ──────────────────────────────────────────────────────────

function encodeSonyPulses(address: number, command: number, bits: 12 | 15 | 20): IRPulse[] {
  const p: IRPulse[] = [];
  // Start: 2.4ms mark + 0.6ms space
  p.push({ level: 1, durationUs: 2400 }, { level: 0, durationUs: 600 });

  const cmdBits = bits === 12 ? 7 : bits === 15 ? 8 : 15;
  const data = (command & ((1 << cmdBits) - 1)) | ((address & 0x1F) << cmdBits);

  for (let i = 0; i < bits; i++) {
    const bit = (data >> i) & 1;
    addBit(p, bit, 600, 600, 1200);
  }
  return p;
}

function decodeSonyPulses(pulses: IRPulse[], bits: 12 | 15 | 20): { address: number; command: number } | null {
  const cmdBits = bits === 12 ? 7 : bits === 15 ? 8 : 15;
  const expectedLen = 2 + bits * 2;
  if (pulses.length < expectedLen) return null;

  if (!matchPulse(pulses[0], 1, 2400, 600)) return null;
  if (!matchPulse(pulses[1], 0, 600, 300)) return null;

  let data = 0;
  for (let i = 0; i < bits; i++) {
    const markIdx = 2 + i * 2;
    const spaceIdx = 2 + i * 2 + 1;
    if (spaceIdx >= pulses.length) return null;
    if (!matchPulse(pulses[markIdx], 1, 600, 250)) return null;
    if (pulses[spaceIdx].level !== 0) return null;
    const spaceDur = pulses[spaceIdx].durationUs;
    if (spaceDur > 800) {
      data |= (1 << i);
    }
  }

  const cmd = data & ((1 << cmdBits) - 1);
  const addr = (data >> cmdBits) & 0x1F;
  return { address: addr, command: cmd };
}

// ── Samsung ────────────────────────────────────────────────────────────

function encodeSamsungPulses(address: number, command: number): IRPulse[] {
  const p: IRPulse[] = [];
  // Leader: 4.5ms mark + 4.5ms space
  p.push({ level: 1, durationUs: 4500 }, { level: 0, durationUs: 4500 });

  const data = (address & 0xFFFF) | ((command & 0xFFFF) << 16);

  for (let i = 0; i < 32; i++) {
    addBit(p, (data >> i) & 1, 562.5, 562.5, 1687.5);
  }
  p.push({ level: 1, durationUs: 562.5 });
  return p;
}

function decodeSamsungPulses(pulses: IRPulse[]): { address: number; command: number } | null {
  if (pulses.length < 66) return null;
  if (!matchPulse(pulses[0], 1, 4500, 1000)) return null;
  if (!matchPulse(pulses[1], 0, 4500, 1000)) return null;

  let data = 0;
  for (let i = 0; i < 32; i++) {
    const markIdx = 2 + i * 2;
    const spaceIdx = 2 + i * 2 + 1;
    if (spaceIdx >= pulses.length) return null;
    if (!matchPulse(pulses[markIdx], 1, 562.5, 200)) return null;
    if (pulses[spaceIdx].level !== 0) return null;
    if (pulses[spaceIdx].durationUs > 1000) data |= (1 << i);
  }
  return { address: data & 0xFFFF, command: (data >> 16) & 0xFFFF };
}

// ── RC-5 ───────────────────────────────────────────────────────────────

function encodeRC5Pulses(address: number, command: number, toggleBit: number = 0): IRPulse[] {
  const p: IRPulse[] = [];
  const half = 889;
  const bits: number[] = [];

  // S1=1, S2=1, T=toggleBit, then 5 address MSB first, 6 command MSB first
  bits.push(1, 1, toggleBit ? 1 : 0);
  for (let i = 4; i >= 0; i--) bits.push((address >> i) & 1);
  for (let i = 5; i >= 0; i--) bits.push((command >> i) & 1);

  for (const b of bits) {
    addManchesterBit(p, b, half);
  }
  return p;
}

function decodeRC5Pulses(pulses: IRPulse[]): { address: number; command: number; toggleBit: number } | null {
  const half = 889;
  const totalBits = 14;
  const expectedLen = totalBits * 2;
  if (pulses.length < expectedLen) return null;

  const bits: number[] = [];
  for (let i = 0; i < totalBits; i++) {
    const first = pulses[i * 2];
    const second = pulses[i * 2 + 1];
    if (!first || !second) return null;
    if (Math.abs(first.durationUs - half) > half * 0.4) return null;
    if (Math.abs(second.durationUs - half) > half * 0.4) return null;
    if (first.level === 1 && second.level === 0) bits.push(1);
    else if (first.level === 0 && second.level === 1) bits.push(0);
    else return null;
  }

  if (bits[0] !== 1 || bits[1] !== 1) return null;
  const toggle = bits[2];
  let addr = 0;
  for (let i = 0; i < 5; i++) addr = (addr << 1) | bits[3 + i];
  let cmd = 0;
  for (let i = 0; i < 6; i++) cmd = (cmd << 1) | bits[8 + i];
  return { address: addr, command: cmd, toggleBit: toggle };
}

// ── RC-6 (mode 0) ──────────────────────────────────────────────────────

function encodeRC6Pulses(address: number, command: number, toggleBit: number = 0): IRPulse[] {
  const p: IRPulse[] = [];
  const half = 889;
  // Leader: 2667µs mark + 889µs space
  p.push({ level: 1, durationUs: 2667 }, { level: 0, durationUs: 889 });
  // Start bit: 889µs mark
  p.push({ level: 1, durationUs: 889 });

  // Mode bits: 0,0,0,0 (always for mode 0), then toggle, 8 address (MSB first), 8 command (MSB first)
  const bits: number[] = [0, 0, 0, 0, toggleBit ? 1 : 0];
  for (let i = 7; i >= 0; i--) bits.push((address >> i) & 1);
  for (let i = 7; i >= 0; i--) bits.push((command >> i) & 1);

  for (const b of bits) {
    addManchesterBit(p, b, half);
  }
  return p;
}

function decodeRC6Pulses(pulses: IRPulse[]): { address: number; command: number; toggleBit: number } | null {
  const half = 889;
  const totalBits = 1 + 4 + 1 + 8 + 8; // start + mode + toggle + addr + cmd = 22
  const expectedLen = 2 + totalBits * 2;
  if (pulses.length < expectedLen) return null;

  // Leader
  if (!matchPulse(pulses[0], 1, 2667, 700)) return null;
  if (!matchPulse(pulses[1], 0, 889, 300)) return null;
  // Start bit
  if (!matchPulse(pulses[2], 1, 889, 300)) return null;

  const bits: number[] = [];
  for (let i = 0; i < totalBits; i++) {
    const first = pulses[3 + i * 2];
    const second = pulses[3 + i * 2 + 1];
    if (!first || !second) return null;
    if (Math.abs(first.durationUs - half) > half * 0.4) return null;
    if (Math.abs(second.durationUs - half) > half * 0.4) return null;
    if (first.level === 1 && second.level === 0) bits.push(1);
    else if (first.level === 0 && second.level === 1) bits.push(0);
    else return null;
  }

  // Mode bits must be 0000
  for (let i = 0; i < 4; i++) if (bits[i] !== 0) return null;
  const toggle = bits[4];
  let addr = 0;
  for (let i = 0; i < 8; i++) addr = (addr << 1) | bits[5 + i];
  let cmd = 0;
  for (let i = 0; i < 8; i++) cmd = (cmd << 1) | bits[13 + i];
  return { address: addr, command: cmd, toggleBit: toggle };
}

// ── JVC ────────────────────────────────────────────────────────────────

function encodeJVCPulses(address: number, command: number): IRPulse[] {
  const p: IRPulse[] = [];
  // Leader: 8.4ms mark + 4.2ms space
  p.push({ level: 1, durationUs: 8400 }, { level: 0, durationUs: 4200 });

  const data = ((address & 0xFF) << 8) | (command & 0xFF);
  for (let i = 15; i >= 0; i--) {
    addBit(p, (data >> i) & 1, 562.5, 562.5, 1687.5);
  }
  return p;
}

function decodeJVCPulses(pulses: IRPulse[]): { address: number; command: number } | null {
  if (pulses.length < 34) return null;
  if (!matchPulse(pulses[0], 1, 8400, 2000)) return null;
  if (!matchPulse(pulses[1], 0, 4200, 1000)) return null;

  let data = 0;
  for (let i = 0; i < 16; i++) {
    const markIdx = 2 + i * 2;
    const spaceIdx = 2 + i * 2 + 1;
    if (spaceIdx >= pulses.length) return null;
    if (!matchPulse(pulses[markIdx], 1, 562.5, 200)) return null;
    if (pulses[spaceIdx].level !== 0) return null;
    if (pulses[spaceIdx].durationUs > 1000) data |= (1 << (15 - i));
  }
  return { address: (data >> 8) & 0xFF, command: data & 0xFF };
}

// ── Panasonic ──────────────────────────────────────────────────────────

function encodePanasonicPulses(address: number, command: number): IRPulse[] {
  const p: IRPulse[] = [];
  // Leader: 3.4ms mark + 1.7ms space
  p.push({ level: 1, durationUs: 3400 }, { level: 0, durationUs: 1700 });

  // 48-bit: 16 manufacturer (addr high) + 8 device (addr low) + 8 subdevice + 16 data
  const mfr = (address >> 16) & 0xFFFF;
  const dev = (address >> 8) & 0xFF;
  const sub = address & 0xFF;
  // Use command as 16-bit data, split: high byte = subdevice, low byte = command
  // Standard: manufacturer=0x2002 for Panasonic
  const _mfr = mfr || 0x2002;
  const data =
    ((_mfr & 0xFFFF) << 32) |
    ((dev & 0xFF) << 24) |
    ((sub & 0xFF) << 16) |
    ((command & 0xFFFF) << 0);

  for (let i = 47; i >= 0; i--) {
    addBit(p, (data >> i) & 1, 562.5, 562.5, 1687.5);
  }
  return p;
}

function decodePanasonicPulses(pulses: IRPulse[]): { address: number; command: number } | null {
  if (pulses.length < 98) return null;
  if (!matchPulse(pulses[0], 1, 3400, 800)) return null;
  if (!matchPulse(pulses[1], 0, 1700, 500)) return null;

  let data = 0;
  for (let i = 0; i < 48; i++) {
    const markIdx = 2 + i * 2;
    const spaceIdx = 2 + i * 2 + 1;
    if (spaceIdx >= pulses.length) return null;
    if (!matchPulse(pulses[markIdx], 1, 562.5, 200)) return null;
    if (pulses[spaceIdx].level !== 0) return null;
    if (pulses[spaceIdx].durationUs > 1000) data |= (1 << (47 - i));
  }

  const cmd = data & 0xFFFF;
  const sub = (data >> 16) & 0xFF;
  const dev = (data >> 24) & 0xFF;
  const mfr = (data >> 32) & 0xFFFF;
  const address = (mfr << 16) | (dev << 8) | sub;
  return { address, command: cmd };
}

// ── Matching helper ────────────────────────────────────────────────────

function matchPulse(pulse: IRPulse, level: number, expectedUs: number, toleranceUs: number): boolean {
  return pulse.level === level && Math.abs(pulse.durationUs - expectedUs) <= toleranceUs;
}

// ── Public API ─────────────────────────────────────────────────────────

export function encodeIR(protocol: IRProtocol, address: number, command: number, toggleBit = 0): IRPulse[] {
  switch (protocol) {
    case 'NEC': return encodeNECPulses(address, command, false);
    case 'NEC_EXT': return encodeNECPulses(address, command, true);
    case 'SONY_12': return encodeSonyPulses(address, command, 12);
    case 'SONY_15': return encodeSonyPulses(address, command, 15);
    case 'SONY_20': return encodeSonyPulses(address, command, 20);
    case 'RC5': return encodeRC5Pulses(address, command, toggleBit);
    case 'RC6': return encodeRC6Pulses(address, command, toggleBit);
    case 'SAMSUNG': return encodeSamsungPulses(address, command);
    case 'JVC': return encodeJVCPulses(address, command);
    case 'PANASONIC': return encodePanasonicPulses(address, command);
  }
}

export function getIRProtocolSignal(protocol: IRProtocol, address: number, command: number, toggleBit = 0): IRSignal {
  return {
    protocol,
    address,
    command,
    toggleBit,
    carrierHz: PROTOCOL_CARRIER[protocol],
    pulses: encodeIR(protocol, address, command, toggleBit),
  };
}

export function decodeIR(pulses: IRPulse[]): IRSignal | null {
  if (!pulses || pulses.length < 4) return null;
  const protos: IRProtocol[] = ['NEC', 'SONY_12', 'SONY_15', 'SONY_20', 'RC5', 'RC6', 'SAMSUNG', 'JVC', 'PANASONIC'];
  for (const proto of protos) {
    let result: { address: number; command: number; toggleBit?: number } | null = null;
    switch (proto) {
      case 'NEC':           result = decodeNECPulses(pulses, false); break;
      case 'NEC_EXT':       result = decodeNECPulses(pulses, true); break;
      case 'SONY_12':       result = decodeSonyPulses(pulses, 12); break;
      case 'SONY_15':       result = decodeSonyPulses(pulses, 15); break;
      case 'SONY_20':       result = decodeSonyPulses(pulses, 20); break;
      case 'RC5':           result = decodeRC5Pulses(pulses); break;
      case 'RC6':           result = decodeRC6Pulses(pulses); break;
      case 'SAMSUNG':       result = decodeSamsungPulses(pulses); break;
      case 'JVC':           result = decodeJVCPulses(pulses); break;
      case 'PANASONIC':     result = decodePanasonicPulses(pulses); break;
    }
    if (result) {
      return {
        protocol: proto,
        address: result.address,
        command: result.command,
        toggleBit: (result as any).toggleBit,
        carrierHz: PROTOCOL_CARRIER[proto],
        pulses,
      };
    }
  }
  return null;
}

export function formatIRValue(protocol: IRProtocol, address: number, command: number): string {
  const hexAddr = `0x${address.toString(16).toUpperCase().padStart(4, '0')}`;
  const hexCmd = `0x${command.toString(16).toUpperCase().padStart(4, '0')}`;
  return `${protocol} A:${hexAddr} C:${hexCmd}`;
}
