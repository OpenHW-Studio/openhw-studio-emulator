export const doc = `
# HX711 Load Cell (50kg)

The **HX711** is a precision 24-bit analog-to-digital converter (ADC) designed for weigh scales and industrial control applications. This component bundles the HX711 amplifier with a 50kg load cell.

## Pinout

| Pin | Description |
|-----|-------------|
| **VCC** | Power supply (5V) |
| **DT** | Serial data output |
| **SCK** | Serial clock input |
| **GND** | Ground |

## Operation

The HX711 communicates using a two-wire synchronous serial protocol.
- **DT** goes low when data is ready for retrieval.
- The MCU pulses **SCK** to clock out 24 bits of data (MSB first).
- The MCU applies 1 to 3 additional clock pulses to set the gain for the next reading (although this simulation uses a fixed range).

## Simulation Details

The simulation provides an interactive slider (from 0kg to 50kg) to adjust the weight. The raw ADC values range from 0 to 21000.
`;
