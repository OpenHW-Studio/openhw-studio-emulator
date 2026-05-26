export const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>6mm Push Button Reference | OpenHW Studio</title>
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
  .try-section { background: #1a1f2e; border: 1px solid #2d3748; border-radius: 12px; padding: 28px 32px; margin: 36px 0; }
  .try-btn { display: inline-flex; align-items: center; gap: 8px; background: #2b6cb0; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 16px; }
  .try-btn:hover { background: #3182ce; }
</style>
</head>
<body>
<div class="content">
    <h1>6mm Push Button</h1>
    <p class="subtitle">A 4-pin momentary tactile switch. It bridges two independent internal connection pairs when pressed.</p>

    <div class="component-preview">
      <div class="component-svg-wrap">
        <svg width="100" height="100" viewBox="0 0 50 50">
          <rect x="7" y="5" width="36" height="40" rx="3" fill="#2c2c2e" stroke="#000" stroke-width="0.8" />
          <rect x="10" y="8" width="30" height="34" rx="2" fill="#e5e7eb" stroke="#4b5563" stroke-width="0.6" />
          <circle cx="25" cy="25" r="8.5" fill="#3b82f6" stroke="#1f2937" stroke-width="0.5" />
          <path d="M 8 10 H 0" stroke="#cbd5e1" stroke-width="3" />
          <path d="M 8 40 H 0" stroke="#cbd5e1" stroke-width="3" />
          <path d="M 42 10 H 50" stroke="#cbd5e1" stroke-width="3" />
          <path d="M 42 40 H 50" stroke="#cbd5e1" stroke-width="3" />
        </svg>
        <span style="font-size:11px;color:#4a5568;">4-Pin Tactile Switch</span>
      </div>
      <div class="component-info">
        <p>This 6mm tactile push button features four pins. Internally, Pins 1A and 1B are permanently connected to each other, and Pins 2A and 2B are permanently connected to each other. Pressing the button connects all four pins together.</p>
        <p><strong>Breadboard Layout:</strong> This layout fits perfectly across the center ravine of a half or full breadboard.</p>
        <div>
          <span class="tag">4-Pin</span>
          <span class="tag">Tactile</span>
          <span class="tag">Momentary</span>
          <span class="tag">6mm x 6mm</span>
        </div>
      </div>
    </div>

    <h2>Pin Reference</h2>
    <table class="pin-table">
      <tr><th>Pin</th><th>Type</th><th>Description</th></tr>
      <tr><td><span class="pin-name">1A</span></td><td><span class="pin-type passive">Passive</span></td><td>Terminal 1A. Internally connected to 1B.</td></tr>
      <tr><td><span class="pin-name">1B</span></td><td><span class="pin-type passive">Passive</span></td><td>Terminal 1B. Internally connected to 1A.</td></tr>
      <tr><td><span class="pin-name">2A</span></td><td><span class="pin-type passive">Passive</span></td><td>Terminal 2A. Internally connected to 2B.</td></tr>
      <tr><td><span class="pin-name">2B</span></td><td><span class="pin-type passive">Passive</span></td><td>Terminal 2B. Internally connected to 2A.</td></tr>
    </table>

    <div class="note">💡 Pins on the same side (e.g. 1A and 1B) are always shorted. Using this switch across a breadboard ravine is a great way to route signals securely.</div>

    <h2>Example Code</h2>
    <div class="code-block">
      <button class="copy-btn" onclick="copyCode(this)">Copy</button>
<pre>const int BUTTON_PIN = 2; // Connect to 1A or 1B
const int LED_PIN = 13;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int state = digitalRead(BUTTON_PIN);
  if (state == LOW) { // Button pressed (connects to GND via 2A/2B)
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
}</pre>
    </div>

    <div class="try-section">
      <h3>▶ Try it in the Simulator</h3>
      <p>Test the 6mm pushbutton with an Arduino Uno. Toggling the button controls the built-in LED.</p>
      <button class="try-btn" onclick="openSimulator()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Open Sample Circuit
      </button>
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

function openSimulator() {
  var code = "const int BUTTON_PIN = 2;\nconst int LED_PIN = 13;\n\nvoid setup() {\n  pinMode(BUTTON_PIN, INPUT_PULLUP);\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(BUTTON_PIN) == LOW) {\n    digitalWrite(LED_PIN, HIGH);\n  } else {\n    digitalWrite(LED_PIN, LOW);\n  }\n}";

  var payload = {
    board: "arduino_uno",
    components: [
      { id: "uno", type: "openhw-arduino-uno", x: 0, y: 0 },
      { id: "btn1", type: "openhw-pushbutton-6mm", x: 250, y: 150 },
      { id: "led1", type: "openhw-led", x: 350, y: 150, attrs: { color: "blue" } }
    ],
    connections: [
      [ "uno:2", "btn1:1A", "green", [] ],
      [ "btn1:2A", "uno:GND.1", "black", [] ],
      [ "uno:13", "led1:A", "red", [] ],
      [ "uno:GND.2", "led1:K", "black", [] ]
    ],
    code: code
  };

  var encoded = encodeURIComponent(JSON.stringify(payload));
  var localUrl = "http://localhost:5173/simulator?circuit=" + encoded;
  window.open(localUrl, "_blank");
}
</script>
</body>
</html>
`;
