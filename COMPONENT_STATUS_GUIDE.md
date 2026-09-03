# Component Status, Capabilities & Visibility Guide

> **Reference Documentation for OpenHW-Studio Emulator & Frontend Engineers**  
> This guide explains how component simulation status, hardware capability checklists, and visibility controls work across the **Emulator Engine**, **Frontend Simulator**, and the public **Component Status Page** (`/components-status`).

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [The 3-Tier Hierarchy](#2-the-3-tier-hierarchy)
   - [Tier 1: In the Component Manifest (`manifest.json`)](#tier-1-inside-the-component-manifestjson)
   - [Tier 2: Frontend Status & Visibility Overrides (`componentVisibilityConfig.js`)](#tier-2-frontend-visibility--override-config)
   - [Tier 3: Smart Automatic Fallback](#tier-3-smart-automatic-fallback)
3. [Schema Specification for Status Metadata](#3-schema-specification-for-status-metadata)
4. [How the Frontend Status Page Consumes This Data](#4-how-the-frontend-status-page-consumes-this-data)
5. [Dynamic GitHub Bug Report Generator](#5-dynamic-github-bug-report-generator)
6. [Documentation & Try Now Integration](#6-documentation--try-now-integration)
7. [Step-by-Step: Adding or Updating a Component's Status](#7-step-by-step-adding-or-updating-a-components-status)
8. [Common Gotchas & Best Practices](#8-common-gotchas--best-practices)

---

## 1. Architecture Overview

In OpenHW-Studio, virtual components live in the **Emulator** (`openhw-studio-emulator`), but are rendered, managed, and filtered by the **Frontend** (`OpenHW-studio-frontend`).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      openhw-studio-emulator                                 │
│  src/components/<component-name>/                                           │
│  ├── manifest.json       <--- Hardware specs, pins, status, capabilities    │
│  ├── logic.ts            <--- Simulation electrical & logic algorithms      │
│  ├── ui.tsx              <--- SVG / Canvas visual representation           │
│  └── index.ts            <--- Exports default { manifest, LogicClass, ... } │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Bundled / Imported
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OpenHW-studio-frontend                                 │
│                                                                             │
│  1. componentRegistry.js:                                                   │
│     Imports @openhw/emulator and builds COMPONENT_REGISTRY                  │
│                                                                             │
│  2. componentVisibilityConfig.js:                                           │
│     Defines COMPONENT_STATUS_CONFIG (hide, warnings, status overrides)     │
│     Implements resolveComponentDetails(type, manifest)                      │
│                                                                             │
│  3. Simulator Palette (PalettePanel.jsx, TopToolbox.jsx):                  │
│     Calls isComponentHidden(type) -> Hides unstable parts from search       │
│                                                                             │
│  4. Public Status Page (/components-status):                               │
│     Renders real-time 3-column capability grid + slide-over drawer          │
│     Generates dynamic bug templates with interactive checkboxes             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 3-Tier Hierarchy

To allow emulator developers to document features close to the code while giving frontend maintainers instant control over production flags, we use a **3-tier cascading resolution strategy**:

$$\text{Tier 2 (Highest): } \textbf{componentVisibilityConfig.js} \quad\longrightarrow\quad \text{Tier 1: } \textbf{manifest.json} \quad\longrightarrow\quad \text{Tier 3: } \textbf{Auto Fallback}$$

---

### Tier 1: Inside the Component (`manifest.json`)
* **File Location**: `openhw-studio-emulator/src/components/<component-dir>/manifest.json`
* **Purpose**: Primary home for component developers to declare what is working and what limitations exist.
* **Example**:
```json
{
  "type": "openhw-arduino-uno",
  "label": "Arduino Uno",
  "group": "Boards",
  "status": "verified",
  "summary": "ATmega328P 8-bit AVR Microcontroller @ 16 MHz",
  "working": [
    "Digital GPIO (Pins 0–13)",
    "Hardware PWM (Pins 3, 5, 6, 9, 10, 11)",
    "Analog ADC Inputs (A0–A5)",
    "UART Serial Monitor & Plotter",
    "Hardware SPI & Wire (I2C)"
  ],
  "inProgress": [],
  "limitations": [
    "Single core, 32KB flash limit"
  ],
  "notes": "Cycle-accurate AVR simulation powered by avr8js. Standard reference board."
}
```

---

### Tier 2: Frontend Visibility & Override Config
* **File Location**: `OpenHW-studio-frontend/src/pages/simulationpage/utils/componentVisibilityConfig.js`
* **Purpose**: Top-level control for the frontend team. If a bug is discovered in production or a board needs to be temporarily hidden from the simulator palette, you configure it here without needing to re-publish or rebuild the emulator package.
* **Supported Properties**:
  - `hide: true` $\rightarrow$ Hides the component from the Quick-Add palette and search.
  - `status: 'verified' | 'beta' | 'in-development'` $\rightarrow$ Forces status level.
  - `warning: string` $\rightarrow$ Displays a warning message in the simulator.
  - `working: string[]` $\rightarrow$ Overrides the verified feature list.
  - `inProgress: string[]` $\rightarrow$ Overrides in-development items.
  - `notes: string` $\rightarrow$ Overrides architecture notes.

```javascript
// Example in componentVisibilityConfig.js:
export const COMPONENT_STATUS_CONFIG = {
  'openhw-esp32': {
    hide: true,                  // Hidden from simulator palette
    status: 'beta',              // Shows as Beta / Partial Support
    summary: 'Tensilica Xtensa Dual-Core 32-bit LX6 @ 240 MHz',
    working: [
      'Digital GPIO Input & Output',
      'LEDC Hardware PWM Channels',
      'ADC1 Analog Read',
      'Hardware I2C / Wire Bus',
      'Hardware SPI Bus',
      'UART Serial Communication'
    ],
    inProgress: [
      'WiFi Station & Access Point Simulation',
      'FreeRTOS Multi-Tasking Scheduler Timing',
      'Deep Sleep & Wakeup Triggers'
    ],
    notes: 'Microcontroller core and GPIO peripherals run reliably. WiFi networking stack is currently in progress.'
  }
};
```

---

### Tier 3: Smart Automatic Fallback
If a component has **no entry in Tier 2** and **no status fields in Tier 1**:
- **Status**: Defaults to `'verified'` (Supported).
- **Working Checklist**: Automatically defaults to:
  - *Simulation model implemented and verified*
  - *Interactive real-time electrical simulation*
  - *Tested with Arduino C++ / MicroPython sketches*
  - *Full circuit diagram & pin connection routing*
- **Pins**: Automatically read from `manifest.pins`.
- **Category**: Automatically read from `manifest.group`.

*(This ensures that passive components like resistors, diodes, and standard buttons work out-of-the-box without requiring manual documentation boilerplate).*

---

## 3. Schema Specification for Status Metadata

| Property | Type | Description |
|---|---|---|
| `status` | `'verified'` \| `'beta'` \| `'in-development'` | Verification level: Supported (Green), Beta (Amber), In Development (Rose) |
| `summary` | `string` | Short hardware summary (e.g. chip family, clock speed, key specs) |
| `working` | `string[]` | List of confirmed working hardware features & peripherals |
| `inProgress` | `string[]` | Hardware features currently being implemented |
| `limitations` | `string[]` | Known simulator hardware constraints (e.g. no BLE, single ADC, etc.) |
| `notes` | `string` | Architecture notes explaining the underlying simulation backend |
| `hide` | `boolean` | If true, marks component as Hidden from the simulator palette |
| `docSlug` | `string` | Documentation slug mapping to `openhw-studio-docs/components/${docSlug}` |

---

## 4. How the Frontend Status Page Consumes This Data

1. **Resolution Engine** (`resolveComponentDetails`):
   ```javascript
   import { resolveComponentDetails } from "./componentVisibilityConfig.js";
   const details = resolveComponentDetails(componentType, manifest);
   ```
2. **Page URL**: Accessible at [`/components-status`](http://localhost:5173/components-status) or `/status`.
3. **Card Grid**: Renders a spacious **3-column desktop layout** displaying:
   - Category Badge (e.g. `Boards`, `Sensors`, `Displays`)
   - Hidden Badge (`EyeOff Hidden`) if `hide: true`
   - Status Pill (`Supported`, `Partial / Beta`, `In Development`)
   - Title, Description, and Pin Count
4. **Slide-Over Details Panel**:
   - Displays all working/in-progress features with pure Lucide SVG icons.
   - Shows pinout tag cloud extracted from `manifest.pins`.
   - Displays a prominent amber callout banner if the component is hidden from the palette.

---

## 5. Dynamic GitHub Bug Report Generator

When a user clicks **"Report Bug"** in the details drawer, it dynamically formats a GitHub issue URL for `openhw-studio-emulator`:

- **Target URL**: `https://github.com/OpenHW-Studio/openhw-studio-emulator/issues/new`
- **Dynamic Feature Failure Checklist**:
  Each item in `working` and `inProgress` is converted into a markdown checkbox `- [ ] <Feature>`:
  ```markdown
  ### ⚠️ Feature Status / Failure Checklist
  *(Tick the checkbox for any feature that is failing or misbehaving)*
  - [ ] Digital GPIO Input & Output
  - [ ] LEDC Hardware PWM Channels
  - [ ] ADC1 Analog Read
  - [ ] Hardware I2C / Wire Bus
  - [ ] WiFi Station & Access Point Simulation (Known in-progress)
  ```
- **Code Block**: Includes a pre-populated C++ Arduino/MicroPython sketch template.

---

## 6. Documentation & Try Now Integration

The **"View Documentation & Try Now ↗"** button connects to the documentation repository (`openhw-studio-docs`):

- **URL Pattern**: `${DOCS_URL}/components/${docSlug}`
  - Local Dev: `http://localhost:5174/components/<name>` (started via `./start.sh docs`)
  - Production: `https://openhw-studio.fossee.in/docs/components/<name>`
- Each component doc page already contains:
  1. Complete pinout diagram & hardware description
  2. Wiring schematics
  3. Interactive `<TryInSimulator />` live launcher
  4. Sample Arduino C++ sketches

---

## 7. Step-by-Step: Adding or Updating a Component's Status

### Scenario A: You built a new component in the emulator
1. In `openhw-studio-emulator/src/components/your-new-component/manifest.json`:
   ```json
   {
     "type": "openhw-bme280",
     "label": "BME280 Environmental Sensor",
     "group": "Sensors",
     "status": "verified",
     "summary": "Digital humidity, pressure and temperature sensor via I2C/SPI",
     "working": [
       "Temperature Sensor Reading (deg C)",
       "Relative Humidity Sampling (%RH)",
       "Barometric Pressure (hPa)",
       "I2C Bus Communication (0x76 / 0x77)"
     ],
     "notes": "Full register emulation for Bosch BME280 driver."
   }
   ```
2. Build or link the emulator package.
3. The component will automatically appear on `/components-status` as **Supported & Verified** with the full feature checklist!

---

### Scenario B: You need to hide a buggy or unfinished component in production
1. In `OpenHW-studio-frontend/src/pages/simulationpage/utils/componentVisibilityConfig.js`:
   ```javascript
   export const COMPONENT_STATUS_CONFIG = {
     // ...
     'openhw-bme280': {
       hide: true,
       status: 'in-development',
       warning: 'I2C CRC checksum bug under investigation.'
     }
   };
   ```
2. Instantly:
   - The component is hidden from the simulator palette and search.
   - The Status Page shows it marked as **In Development** and **Hidden in Palette**.

---

## 8. Common Gotchas & Best Practices

1. **Avoid Emojis in Status Data**: Always use plain text descriptions in `working` and `inProgress` lists. The frontend renders crisp Lucide SVG icons automatically.
2. **Trailing Slashes in `VITE_DOCS_URL`**:
   - Ensure the doc URL builder uses `.replace(/\/+$/, "")` before appending `/components/${slug}` so URLs never result in `localhost:5174components/...` (which Chrome blocks with `about:blank#blocked`).
3. **Running the Local Docs Server**:
   - If developing locally, run `./start.sh docs` to start the VitePress server on port `5174`.
