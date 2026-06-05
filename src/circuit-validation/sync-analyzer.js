/**
 * sync-analyzer.js
 *
 * Shared logic to cross-reference source code with circuit wiring.
 * Used by both the CLI and the Web UI.
 *
 * Supports: GPIO, PWM, ADC, I2C, SPI, Serial, LEDC, DAC, TWAI/CAN,
 *           RMT, PCNT, Deep Sleep, Wire1/Serial1/Serial2 secondary buses.
 */

// ── Pin alias normalization ────────────────────────────────────────────────────
// Maps "D16" → "16", "GPIO16" → "16", "A3" preserved, etc.
function normPin(pin) {
    if (typeof pin !== 'string') pin = String(pin);
    if (/^D\d+$/i.test(pin)) return pin.slice(1);        // D16 → 16
    if (/^GPIO\d+$/i.test(pin)) return pin.slice(4);      // GPIO16 → 16
    return pin;
}

// Checks if any wired pin for boardComp matches the given raw pin value
function isPinWired(wiredPins, pin) {
    const n = normPin(String(pin));
    return wiredPins.has(n) || wiredPins.has('D' + n) || wiredPins.has(pin);
}

export function analyzeCodeHardwareSync(project, targetBoardId = null) {
    const issues = [];
    let code = project.code || '';
    if (!code.trim()) return { passed: true, issues: [] };

    // Strip comments to avoid analyzing commented-out code
    code = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // 1. Determine which board we are analyzing
    const activeBoardId = targetBoardId || project.activeCodeFileId?.split('/')[1] || project.board;
    const boardComp = project.components.find(c =>
        c.id === activeBoardId ||
        /(arduino|pico|esp32|uno|nano|mega|stm32)/i.test(c.type) ||
        /(arduino|pico|esp32|uno|nano|mega|stm32)/i.test(c.id)
    );

    if (!boardComp) return { passed: true, issues: [] };

    // 2. Extract Used Pins from Code — standard Arduino API
    const usedPins = new Set();
    const arduinoRegex = /\b(?:digitalWrite|digitalRead|pinMode|analogRead|analogWrite)\s*\(\s*([A-Za-z0-9_]+)/g;
    let match;
    while ((match = arduinoRegex.exec(code)) !== null) {
        usedPins.add(match[1]);
    }

    const pyRegex = /\bPin\((\d+)\)|board\.GP(\d+)/g;
    while ((match = pyRegex.exec(code)) !== null) {
        usedPins.add(match[1] || match[2]);
    }

    // 3. Identify Wired Pins on THIS SPECIFIC BOARD
    const wiredPins = new Set();
    (project.connections || []).forEach(wire => {
        [wire.from, wire.to].forEach(endpoint => {
            const [compId, pinId] = String(endpoint || '').split(':');
            if (compId === boardComp.id) {
                const normalized = normPin(pinId);
                wiredPins.add(normalized);
                wiredPins.add(pinId);
            }
        });
    });

    // 4. Cross-Reference — standard GPIO/analog calls
    const arduinoCalls = [];
    const callRegex = /\b(digitalWrite|digitalRead|pinMode|analogRead|analogWrite)\s*\(\s*([A-Za-z0-9_]+)/g;
    while ((match = callRegex.exec(code)) !== null) {
        arduinoCalls.push({ func: match[1], pin: match[2] });
    }

    arduinoCalls.forEach(({ func, pin }) => {
        if (['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN'].includes(pin)) return;
        if (Number.isNaN(Number(pin)) && !/^A\d+$/.test(pin)) return;

        // A. Basic Connectivity Check
        if (!isPinWired(wiredPins, pin)) {
            issues.push({
                severity: 'warn',
                message: `🔍 Code Mismatch: Code for "${boardComp.id}" uses pin "${pin}", but it is not wired.`
            });
            return;
        }

        // B. PWM Capability Check (analogWrite)
        if (func === 'analogWrite') {
            const pinMeta = (boardComp.pins || []).find(p => p.id === pin || p.id === 'D' + pin || p.name === pin);
            const supportsPWM = pinMeta?.features?.includes('PWM') ||
                               pinMeta?.id?.includes('~') ||
                               pinMeta?.name?.includes('~') ||
                               pinMeta?.name?.includes('PWM');
            if (!supportsPWM) {
                issues.push({
                    severity: 'warn',
                    message: `⚠️ Hardware Limitation: Code calls analogWrite on pin "${pin}", but this pin does not support hardware PWM on ${boardComp.type}.`
                });
            }
        }

        // C. ADC Capability Check (analogRead)
        if (func === 'analogRead') {
            const isAnalogPin = /^A\d+$/.test(pin) || pin.toLowerCase().includes('adc');
            const pinMeta = (boardComp.pins || []).find(p => p.id === pin || p.id === 'D' + pin || p.name === pin);
            const supportsADC = pinMeta?.features?.includes('ADC') ||
                               pinMeta?.name?.startsWith('A') ||
                               isAnalogPin;
            if (!supportsADC) {
                issues.push({
                    severity: 'warn',
                    message: `⚠️ Hardware Limitation: Code calls analogRead on pin "${pin}", but this is not an analog-capable pin.`
                });
            }
        }
    });

    // 5. I2C Library/Protocol Check
    const hasI2CInCode = code.includes('Wire.begin') || code.includes('I2C(');
    if (hasI2CInCode) {
        const i2cPins = (boardComp.pins || []).filter(p => p.id?.includes('SDA') || p.id?.includes('SCL') || p.features?.includes('I2C'));
        const i2cPinIds = i2cPins.map(p => normPin(p.id));

        arduinoCalls.forEach(({ func, pin }) => {
            if (i2cPinIds.includes(normPin(pin)) && (func.startsWith('digital') || func.startsWith('analog'))) {
                issues.push({
                    severity: 'warn',
                    message: `🚩 Protocol Conflict: Pin "${pin}" is being used for I2C, but the code is also trying to use it as a standard GPIO (${func}).`
                });
            }
        });

        const hasI2CWiring = (project.connections || []).some(w => {
            const [compId, pinId] = w.from.split(':');
            const [compId2, pinId2] = w.to.split(':');
            const isBoardPin = (compId === boardComp.id || compId2 === boardComp.id);
            const isI2CPin = (pinId?.includes('SDA') || pinId2?.includes('SDA') || pinId?.includes('A4') || pinId2?.includes('A4'));
            return isBoardPin && isI2CPin;
        });
        if (!hasI2CWiring) {
            issues.push({
                severity: 'warn',
                message: `🔍 Protocol Mismatch: Code for "${boardComp.id}" initializes I2C, but no I2C devices are wired to its SDA/SCL pins.`
            });
        }
    }

    // 5b. Secondary I2C bus (Wire1)
    if (code.includes('Wire1.begin')) {
        const hasWire1Wiring = (project.connections || []).some(w => {
            const [compId, pinId] = w.from.split(':');
            const [compId2, pinId2] = w.to.split(':');
            return (compId === boardComp.id || compId2 === boardComp.id) &&
                   (pinId?.includes('SDA1') || pinId2?.includes('SDA1'));
        });
        if (!hasWire1Wiring) {
            issues.push({
                severity: 'warn',
                message: `🔍 Protocol Mismatch: Code initializes Wire1 (secondary I2C), but no device is wired to SDA1/SCL1.`
            });
        }
    }

    // 6. Serial/UART Conflict Check
    const hasSerialInCode = code.includes('Serial.begin') || code.includes('UART(');
    if (hasSerialInCode) {
        const serialPins = ['0', '1', 'D0', 'D1', 'GP0', 'GP1'];
        serialPins.forEach(pin => {
            if (wiredPins.has(normPin(pin))) {
                issues.push({
                    severity: 'warn',
                    message: `🚩 Serial Conflict: Pin "${pin}" is wired, but the code initializes Serial. This may interfere with data transmission.`
                });
            }
        });
    }

    // 6b. Secondary UART buses (Serial1, Serial2)
    ['Serial1', 'Serial2'].forEach((uart, idx) => {
        if (code.includes(`${uart}.begin`)) {
            const txPin = idx === 0 ? ['TX1', 'D9', '9'] : ['TX2', 'D17', '17'];
            const isWired = txPin.some(p => wiredPins.has(normPin(p)));
            if (!isWired) {
                issues.push({
                    severity: 'info',
                    message: `ℹ️ ${uart}: Code initializes ${uart}, but TX/RX pins for this UART don't appear to be wired.`
                });
            }
        }
    });

    // 7. Interrupt Compatibility Check
    const interruptRegex = /\battachInterrupt\s*\(\s*(?:digitalPinToInterrupt\s*\(\s*)?([A-Za-z0-9_]+)/g;
    while ((match = interruptRegex.exec(code)) !== null) {
        const pin = match[1];
        if (!['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP'].includes(pin)) {
            const pinMeta = (boardComp.pins || []).find(p => p.id === pin || p.id === 'D' + pin || p.name === pin);
            const supportsInterrupt = pinMeta?.features?.includes('INT') ||
                                     pinMeta?.features?.includes('EXTINT') ||
                                     ['2', '3'].includes(pin);
            if (!supportsInterrupt) {
                issues.push({
                    severity: 'warn',
                    message: `⚠️ Interrupt Error: Code tries to attach an interrupt to pin "${pin}", but this pin does not support hardware interrupts on ${boardComp.type}.`
                });
            }
        }
    }

    // 8. LEDC PWM — ledcAttachPin(pin, channel)
    const ledcPinRegex = /\bledcAttachPin\s*\(\s*([A-Za-z0-9_]+)/g;
    while ((match = ledcPinRegex.exec(code)) !== null) {
        const pin = match[1];
        if (!isPinWired(wiredPins, pin) && !Number.isNaN(Number(pin))) {
            issues.push({
                severity: 'warn',
                message: `🔍 LEDC Mismatch: Code calls ledcAttachPin with pin "${pin}", but it is not wired.`
            });
        }
    }

    // 9. DAC — dacWrite(pin, val) — ESP32 DAC-capable pins are 25 and 26 only
    const dacRegex = /\bdacWrite\s*\(\s*([A-Za-z0-9_]+)/g;
    while ((match = dacRegex.exec(code)) !== null) {
        const pin = match[1];
        const isEsp32 = /(esp32)/i.test(boardComp.type || '');
        if (isEsp32 && !Number.isNaN(Number(pin)) && !['25', '26'].includes(pin)) {
            issues.push({
                severity: 'error',
                message: `❌ DAC Error: ESP32 DAC only supports pins 25 and 26, but code calls dacWrite on pin "${pin}".`
            });
        }
        if (!isPinWired(wiredPins, pin) && !Number.isNaN(Number(pin))) {
            issues.push({
                severity: 'warn',
                message: `🔍 DAC Mismatch: Code calls dacWrite on pin "${pin}", but it is not wired.`
            });
        }
    }

    // 10. TWAI/CAN Bus
    const hasTwai = code.includes('twai_driver_install') || code.includes('twai_transmit') ||
                    code.includes('CAN.begin') || code.includes('canBus.begin');
    if (hasTwai) {
        // Default TWAI pins on ESP32 are GPIO4 (TX) and GPIO5 (RX) unless configured otherwise
        const twaiWired = ['4', '5', 'D4', 'D5', 'CANH', 'CANL', 'CANTX', 'CANRX']
            .some(p => wiredPins.has(normPin(p)));
        if (!twaiWired) {
            issues.push({
                severity: 'warn',
                message: `🔍 TWAI/CAN: Code uses CAN bus but no CAN transceiver pins appear to be wired (TX/RX GPIO4/5 expected).`
            });
        }
    }

    // 11. RMT (IR remote / custom pulses) — rmt_tx_channel_new / rmtWrite
    const hasRmt = code.includes('rmt_tx_channel_new') || code.includes('rmtWrite') ||
                   code.includes('RMT.begin') || code.includes('IrSender');
    if (hasRmt) {
        issues.push({
            severity: 'info',
            message: `ℹ️ RMT: Code uses the RMT peripheral. Ensure the RMT output GPIO is wired to an IR LED or receiver.`
        });
    }

    // 12. PCNT (pulse counter)
    const hasPcnt = code.includes('pcnt_unit_config') || code.includes('pcnt_get_count') ||
                    code.includes('PCNT.begin') || code.includes('sim_pcntInit');
    if (hasPcnt) {
        issues.push({
            severity: 'info',
            message: `ℹ️ PCNT: Code uses the pulse counter. Ensure the PCNT input GPIO is wired to a pulse source.`
        });
    }

    // 13. Deep Sleep note
    const hasSleep = code.includes('esp_deep_sleep_start') || code.includes('esp_deep_sleep(') ||
                     code.includes('deepSleep(') || code.includes('ESP.deepSleep(');
    if (hasSleep) {
        issues.push({
            severity: 'info',
            message: `ℹ️ Deep Sleep: Code uses deep sleep. In simulation, sleep is capped at 30 seconds.`
        });
    }

    return {
        passed: issues.filter(i => i.severity === 'error' || i.severity === 'warn').length === 0,
        issues
    };
}
