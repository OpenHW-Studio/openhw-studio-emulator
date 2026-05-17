# OpenHW Emulator Notes

This file is kept for backward compatibility.

Use README.md for the maintained emulator documentation.

Recent runtime notes are documented there, including RP2040 entry-vector validation to avoid invalid-memory execution loops when firmware vectors are malformed.

---

## 🧩 Simulator Components Library

The emulator includes a massive suite of interactive, physics-driven hardware components. Each component is fully integrated into the simulation engine with its own physical dimensions, interactive SVG UI, and JavaScript-based electrical behavior logic.

### Displays & Graphics
* **Nokia 5110 Screen (`openhw-nokia-5110`)**: An 84x48 pixel monochrome LCD. It implements an internal SPI receiver and PCD8544 controller firmware to decode instruction signals and render an active hex framebuffer directly onto the UI.

### Motors & Actuation Drivers
* **L293D Motor Driver (`openhw-l293d`)**: A dual H-Bridge chip mapping logic enables/disables arrays to output pins for driving analog power.
* **A4988 Stepper Driver (`openhw-a4988`)**: A bipolar stepper motor driver interpreting `STEP` and `DIR` pin pulses into cyclic phase waveforms.
* **Biaxial Stepper Motor (`openhw-stepper-motor`)**: A visual 4-wire bipolar motor that calculates coil phase overlaps to physically rotate its SVG shaft in the UI!
* **16-Channel PWM/Servo HAT (`openhw-pca9685`)**: An Adafruit-style board featuring a custom-built I2C state machine (listening on `0x40`) to translate 12-bit register payloads into explicit duty cycles across 16 motor headers.
* **16-Channel PWM/Servo Breakout (`openhw-pca9865`)**: A standalone breakout variant of the PCA9685 controller, featuring distinct side-chaining I2C headers and color-coded PWM output banks.

### Boards & Shields
* **Arduino Nano Type-C (`openhw-arduino-nano`)**: A modernized variant of the Nano featuring a Type-C USB interface and additional breakout pins for `PE0` and `PE1` signal lines.
* **Arduino Sensor Shield v5.0 (`openhw-arduino-sensor-shield`)**: A massive visual and electrical pass-through shield that splits every Uno pin into dedicated G-V-S header triplets for simplified sensor wiring.

### ICs, Multiplexers & Logic
* **16-Ch Analog Multiplexer (`openhw-cd74hc4067`)**: Decodes 4-bit binary addressing (`S0-S3`) to bidirectionally route analog voltages between a common signal pin and 16 independent channels.
* **SPI Tri-Color LED Driver (`openhw-nlsf595`)**: An SPI shift register configured to latch serial bitstreams and drive multi-color outputs.
* **8-Ch Logic Analyzer (`openhw-logic-analyzer`)**: A specialized debug component that constantly monitors `D0-D7` for edge transitions and visually pulses its activity LED upon bus changes.
* **Digital Logic Gate Suite**: A full collection of high-performance virtual gates including **NOT, AND, OR, NOR, NAND, XOR, XNOR**, plus **2-to-1 Multiplexers** and multiple **D-FlipFlop** variants for advanced digital logic simulation.

### Environmental Sensors & Inputs
* **Rotary Encoder (`openhw-rotary-encoder`)**: Provides physical interaction inputs mapped to an internal quadrature generator (`CLK` / `DT`) and a pushbutton switch state.
* **Soil Moisture Sensor (`openhw-soil-moisture-sensor`)**: Translates a generic internal UI moisture variable (0-100%) into inverse analog voltages on `A0` and a digital comparator trigger on `D0`.
* **Photodiode (`openhw-photodiode`)**: A light sensor logic model that modulates reverse-bias current leakage according to its interactive incident light level.

### Discrete Electrics & Basics
* **NPN Transistor (`openhw-npn-transistor`)**: Uses simple base-emitter junction saturation logic to bridge Collector voltages across to its Emitter.
* **Diode (`openhw-diode`)**: Models the standard 0.7V forward-bias path, completely blocking reverse voltages.
* **RGB LED (`openhw-rgb-led`)**: Fully models dynamic color lighting by computing relative pin voltages to a defined Common-Cathode orientation.
* **Mini & Half Breadboards (`openhw-breadboard-mini`, `openhw-breadboard-half`)**: Specialized SVG topologies that implement exact tie-point connection maps for the netlist compiler, including missing power rails on the mini variant!
