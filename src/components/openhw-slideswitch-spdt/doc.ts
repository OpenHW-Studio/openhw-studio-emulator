export const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SPDT Slide Switch Reference | OpenHW Studio</title>
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
    <h1>SPDT Slide Switch</h1>
    <p class="subtitle">A Single-Pole Double-Throw sliding switch. Connects the center common terminal (COM) to either left (1) or right (2).</p>

    <div class="component-preview">
      <div class="component-svg-wrap">
        <svg width="100" height="75" viewBox="0 0 60 45">
          <rect x="5" y="12" width="50" height="20" rx="1.5" fill="#e5e7eb" stroke="#4b5563" stroke-width="0.8" />
          <rect x="13" y="16" width="34" height="12" rx="1" fill="#09090b" stroke="#3f3f46" stroke-width="0.5" />
          <rect x="14" y="6" width="14" height="18" rx="1" fill="#27272a" stroke="#09090b" stroke-width="0.8" />
          <rect x="13.5" y="32" width="3" height="13" fill="#cbd5e1" />
          <rect x="28.5" y="32" width="3" height="13" fill="#cbd5e1" />
          <rect x="43.5" y="32" width="3" height="13" fill="#cbd5e1" />
        </svg>
        <span style="font-size:11px;color:#4a5568;">SPDT Slide Switch</span>
      </div>
      <div class="component-info">
        <p>An SPDT (Single Pole Double Throw) switch has three terminals. The middle terminal (COM) acts as the input/output selector. Sliding the switch to the left connects COM to Pin 1. Sliding the switch to the right connects COM to Pin 2.</p>
        <p><strong>Breadboard Layout:</strong> This component matches a standard 0.1-inch breadboard pin pitch (15px spacing) and slots perfectly into a row of 3 holes.</p>
        <div>
          <span class="tag">SPDT</span>
          <span class="tag">Slide Switch</span>
          <span class="tag">Toggle</span>
          <span class="tag">Basic Component</span>
        </div>
      </div>
    </div>

    <h2>Pin Reference</h2>
    <table class="pin-table">
      <tr><th>Pin</th><th>Type</th><th>Description</th></tr>
      <tr><td><span class="pin-name">1</span></td><td><span class="pin-type passive">Passive</span></td><td>Left Terminal. Connected to COM when switch is slid left.</td></tr>
      <tr><td><span class="pin-name">COM</span></td><td><span class="pin-type passive">Passive</span></td><td>Common selector terminal. Stays connected to either 1 or 2.</td></tr>
      <tr><td><span class="pin-name">2</span></td><td><span class="pin-type passive">Passive</span></td><td>Right Terminal. Connected to COM when switch is slid right.</td></tr>
    </table>

    <div class="note">💡 SPDT switches are perfect for choosing between power sources, selecting between high/low modes, or toggling signals.</div>

    <h2>Example Code</h2>
    <div class="code-block">
      <button class="copy-btn" onclick="copyCode(this)">Copy</button>
<pre>const int SWITCH_PIN = 2; // Connect middle pin (COM) to pin 2
const int LED_PIN = 13;

void setup() {
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int state = digitalRead(SWITCH_PIN);
  if (state == HIGH) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }
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
