export const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>8-Position DIP Switch Reference | OpenHW Studio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; line-height: 1.7; padding: 48px 64px; }
  a { color: #63b3ed; text-decoration: none; }
  .content { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 36px; font-weight: 800; color: #fff; margin-bottom: 8px; }
  .subtitle { font-size: 16px; color: #718096; margin-bottom: 36px; border-bottom: 1px solid #2d3748; padding-bottom: 24px; }
  .component-preview { display: flex; gap: 40px; align-items: flex-start; margin-bottom: 40px; background: #1a1f2e; border: 1px solid #2d3748; border-radius: 12px; padding: 32px; }
  .component-svg-wrap { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .component-info p { color: #a0aec0; font-size: 15px; margin-bottom: 16px; }
  .tag { display: inline-block; background: #1a2035; border: 1px solid #2d4a8a; color: #63b3ed; padding: 3px 10px; border-radius: 20px; font-size: 12px; margin-right: 6px; margin-bottom: 6px; }
  h2 { font-size: 22px; font-weight: 700; color: #fff; margin: 36px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #2d3748; }
  .pin-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
  .pin-table th { background: #1a1f2e; color: #63b3ed; padding: 10px 14px; text-align: left; border: 1px solid #2d3748; }
  .pin-table td { padding: 10px 14px; border: 1px solid #2d3748; color: #a0aec0; }
  .pin-table tr:nth-child(even) td { background: #141824; }
  .pin-name { font-family: monospace; color: #68d391; font-weight: 600; }
  .pin-type { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
  .pin-type.passive { background: #4a5568; color: #e2e8f0; }
  .code-block { background: #141824; border: 1px solid #2d3748; border-radius: 8px; padding: 20px 24px; font-family: 'Courier New', monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto; margin-bottom: 20px; position: relative; }
  .copy-btn { position: absolute; top: 10px; right: 10px; background: #2d3748; border: none; color: #a0aec0; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; }
  .note { background: #1a2a1a; border-left: 4px solid #68d391; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px; font-size: 14px; color: #9ae6b4; }
</style>
</head>
<body>
<div class="content">
    <h1>8-Position DIP Switch</h1>
    <p class="subtitle">An 8-channel Dual In-line Package (DIP) switch. Contains 8 independent SPST switches that span the breadboard ravine.</p>

    <div class="component-preview">
      <div class="component-svg-wrap">
        <svg width="135" height="75" viewBox="0 0 135 75">
          <rect x="5" y="10" width="125" height="55" rx="3" fill="#dc2626" stroke="#7f1d1d" stroke-width="0.8" />
          <text x="10" y="24" fill="#ffffff" font-size="6.5" font-weight="900" font-family="sans-serif">ON</text>
          <path d="M 12 28 L 12 32 M 10 30 L 12 32 L 14 30" stroke="#ffffff" stroke-width="0.8" fill="none" />
          <rect x="11.5" y="15" width="7" height="28" rx="1" fill="#09090b" />
          <rect x="10.5" y="16" width="9" height="11" rx="1.5" fill="#f3f4f6" stroke="#111827" stroke-width="0.5" />
          <text x="15" y="56" fill="#ffffff" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">1</text>
          <rect x="26.5" y="15" width="7" height="28" rx="1" fill="#09090b" />
          <rect x="25.5" y="16" width="9" height="11" rx="1.5" fill="#f3f4f6" stroke="#111827" stroke-width="0.5" />
          <text x="30" y="56" fill="#ffffff" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">2</text>
          <!-- Additional switches shown dynamically in UI -->
        </svg>
        <span style="font-size:11px;color:#4a5568;">8-Position DIP Switch</span>
      </div>
      <div class="component-info">
        <p>A DIP switch package contains multiple single-pole single-throw (SPST) switches. When a switch is slid DOWN to the "ON" position, it closes the circuit path and connects its top pin to its corresponding bottom pin. When slid UP, it opens the circuit, isolating the pins.</p>
        <p><strong>Breadboard Layout:</strong> With pins spaced 15px apart in two rows spaced 75px apart, this component plugs directly across the center breadboard ravine, aligning with standard row positions.</p>
        <div>
          <span class="tag">DIP Switch</span>
          <span class="tag">SPST</span>
          <span class="tag">Array</span>
          <span class="tag">Input</span>
          <span class="tag">Basic Component</span>
        </div>
      </div>
    </div>

    <h2>Pin Reference</h2>
    <table class="pin-table">
      <tr><th>Pin</th><th>Type</th><th>Description</th></tr>
      <tr><td><span class="pin-name">1 - 8</span></td><td><span class="pin-type passive">Passive</span></td><td>Top switch input terminals. Connect to microcontroller pins or voltage sources.</td></tr>
      <tr><td><span class="pin-name">1B - 8B</span></td><td><span class="pin-type passive">Passive</span></td><td>Bottom switch output terminals. Connect to GND or load circuits.</td></tr>
    </table>

    <div class="note">💡 DIP switches are commonly used to configure options, set device addresses (like in I2C or DMX systems), or toggle multiple settings on a circuit board without reprogramming.</div>

    <h2>Example Code</h2>
    <p>This Arduino example reads the first four switches of the DIP switch using internal pull-up resistors (so a CLOSED switch reads LOW, and an OPEN switch reads HIGH).</p>
    <div class="code-block">
      <button class="copy-btn" onclick="copyCode(this)">Copy</button>
<pre>const int DIP_PINS[] = {2, 3, 4, 5}; // Connected to switch pins 1, 2, 3, 4

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 4; i++) {
    pinMode(DIP_PINS[i], INPUT_PULLUP);
  }
}

void loop() {
  for (int i = 0; i < 4; i++) {
    int state = digitalRead(DIP_PINS[i]);
    Serial.print("SW");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(state == LOW ? "ON (CLOSED)" : "OFF (OPEN)");
    Serial.print("\\t");
  }
  Serial.println();
  delay(500);
}</pre>
    </div>
</div>

<script>
function copyCode(btn) {
  const pre = btn.nextElementSibling;
  navigator.clipboard.writeText(pre.textContent).then(function() {
    btn.textContent = 'Copied!';
    setTimeout(function() { btn.textContent = 'Copy'; }, 2000);
  });
}
</script>
</body>
</html>
`;
