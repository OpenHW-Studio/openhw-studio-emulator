export const markdown = `
# KS2E-M-DC5 DPDT Relay

A Double Pole Double Throw (DPDT) electromechanical relay, rated for a 5V DC coil.

## Pin Reference

| Pin | Type | Description |
| --- | --- | --- |
| COIL1 | Input | Relay coil terminal 1 |
| COIL2 | Input | Relay coil terminal 2 |
| P1 | Passive | Pole 1 (Common terminal for switch 1) |
| NC1 | Passive | Normally Closed contact for switch 1 |
| NO1 | Passive | Normally Open contact for switch 1 |
| P2 | Passive | Pole 2 (Common terminal for switch 2) |
| NC2 | Passive | Normally Closed contact for switch 2 |
| NO2 | Passive | Normally Open contact for switch 2 |

## Operating Principle

### Coil (COIL1 ↔ COIL2)
- Has a resistance of approximately 150Ω
- Applies a voltage across the coil to energise the relay

### Switch Operation

#### Unenergised (Voltage Difference < 3.5V)
- **Pole 1 (P1)** connects to **NC1** (Normally Closed)
- **Pole 2 (P2)** connects to **NC2** (Normally Closed)

#### Energised (Voltage Difference > 3.5V)
- **Pole 1 (P1)** connects to **NO1** (Normally Open)
- **Pole 2 (P2)** connects to **NO2** (Normally Open)

## Electrical Characteristics

- **Coil Voltage Rating:** 5V DC
- **Coil Resistance:** ~150Ω
- **Pick-up Voltage:** ~3.5V DC
- **Contact Rating:** 10A @ 250V AC / 30V DC
- **Switching Time:** ~10ms

## Circuit Example

Use the relay to switch an LED circuit:
\`\`\`
5V ──┬──── COIL1
     │
    [Control Switch]
     │
    GND ──┬──── COIL2
     │
     └──── P1 ──┬── NC1 (LED lights when relay OFF)
                │
                └── NO1 (LED lights when relay ON)
\`\`\`
`;