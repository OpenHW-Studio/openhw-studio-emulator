export const doc = {
  name: 'LDR Resistor',
  shortDesc: 'Light Dependent Resistor (photoresistor) component',
  desc: `
The LDR (Light Dependent Resistor), also known as a photoresistor or photocell, is a variable resistor 
that changes its resistance based on the amount of light falling on it. The brighter the light, 
the lower the resistance. In darkness, the resistance is very high.

LDRs are commonly used for:
- Light level detection
- Automatic brightness adjustment
- Light-activated circuits
- Ambient light sensors
- Day/night detection

## How it Works

LDR resistance varies according to the formula:
\`\`\`
R = R10 × (10 / Lux)^γ
\`\`\`

Where:
- **R10**: Resistance at 10 lux (typically 5-20kΩ)
- **Lux**: Light intensity (light level in lux)
- **γ (gamma)**: Light-dependent coefficient (typically 0.7-0.9)

## Circuit Usage

LDRs are typically used in a voltage divider circuit:
\`\`\`
    +5V
      |
    [LDR]
      |-----> A0 (to ADC)
    [10kΩ resistor]
      |
     GND
\`\`\`

The output voltage varies based on the light level hitting the LDR.
  `,
  pins: [
    {
      name: 'p1',
      desc: 'First terminal - connect to power supply or voltage divider'
    },
    {
      name: 'p2',
      desc: 'Second terminal - connect to ground or ADC input with pull-up resistor'
    }
  ],
  attrs: [
    {
      name: 'lux',
      desc: 'Current light intensity in lux (light level). Default: 100 lux (typical indoor lighting)',
      type: 'number'
    },
    {
      name: 'gamma',
      desc: 'Light-dependent coefficient (0.3-1.5). Lower values = less sensitive to light changes. Typical: 0.7',
      type: 'number'
    },
    {
      name: 'r10',
      desc: 'Resistance at 10 lux in Ohms. Typical values: 5kΩ-20kΩ. Default: 10kΩ',
      type: 'number'
    }
  ],
  codeExample: `
// Example: Read LDR value and detect darkness
const int LDR_PIN = A0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int sensorValue = analogRead(LDR_PIN);
  float voltage = sensorValue * (5.0 / 1023.0);
  
  // Print voltage
  Serial.print("Voltage: ");
  Serial.println(voltage);
  
  // Detect day/night (adjust threshold as needed)
  if(voltage < 1.5) {
    Serial.println("It's dark!");
  } else if(voltage > 3.5) {
    Serial.println("It's bright!");
  } else {
    Serial.println("Normal lighting");
  }
  
  delay(500);
}
  `,
  specs: {
    technology: 'Cadmium Sulfide (CdS) or similar',
    typicalR10: '5-20 kΩ',
    typicalGamma: '0.7-0.9',
    darkResistance: '> 1 MΩ',
    brightResistance: '< 1 kΩ',
    responseTime: '20-30 ms',
    operatingTemperature: '-30°C to +70°C'
  },
  commonValues: {
    'Indoor Lighting (100 lux)': { r10: 10000, gamma: 0.7, resistance: '~2.1 kΩ' },
    'Daylight (1000 lux)': { r10: 10000, gamma: 0.7, resistance: '~320 Ω' },
    'Darkness (1 lux)': { r10: 10000, gamma: 0.7, resistance: '~100 kΩ' },
    'Bright Sunlight (10000 lux)': { r10: 10000, gamma: 0.7, resistance: '~50 Ω' }
  }
};
