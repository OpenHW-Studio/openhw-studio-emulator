export const markdown = `
# Biaxial Stepper Motor

A concentric biaxial stepper motor, containing two independent bipolar stepper motors packaged in a single enclosure.

## Pins

| Name | Description |
| ---- | ----------- |
| A1-  | Outer shaft motor's coil A negative signal |
| A1+  | Outer shaft motor's coil A positive signal |
| B1+  | Outer shaft motor's coil B positive signal |
| B1-  | Outer shaft motor's coil B negative signal |
| A2-  | Inner shaft motor's coil A negative signal |
| A2+  | Inner shaft motor's coil A positive signal |
| B2+  | Inner shaft motor's coil B positive signal |
| B2-  | Inner shaft motor's coil B negative signal |

## Attributes

| Name | Default | Description |
| ---- | ------- | ----------- |
| outerHandLength | "30" | The length of the outer shaft's hand (20 to 70) |
| outerHandColor | "gold" | The color of the outer shaft's hand |
| outerHandShape | "plain" | The shape of the outer hand ("plain", "arrow", "ornate") |
| innerHandLength | "30" | The length of the inner shaft's hand (20 to 70) |
| innerHandColor | "silver" | The color of the inner shaft's hand |
| innerHandShape | "plain" | The shape of the inner hand ("plain", "arrow", "ornate") |

## Usage

You can drive each internal motor using standard stepper driver circuits, like the A4988. Each motor operates independently.
`;
