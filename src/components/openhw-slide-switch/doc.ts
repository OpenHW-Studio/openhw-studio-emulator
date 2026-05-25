export const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Slide Switch Reference | OpenHW Studio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; line-height: 1.7; padding: 48px 64px; }
  .content { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 36px; font-weight: 800; color: #fff; margin-bottom: 8px; }
  .subtitle { font-size: 16px; color: #718096; margin-bottom: 36px; border-bottom: 1px solid #2d3748; padding-bottom: 24px; }
  h2 { font-size: 22px; font-weight: 700; color: #fff; margin: 36px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #2d3748; }
  .pin-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  .pin-table th { background: #1a1f2e; color: #63b3ed; padding: 10px 14px; text-align: left; border: 1px solid #2d3748; }
  .pin-table td { padding: 10px 14px; border: 1px solid #2d3748; color: #a0aec0; }
</style>
</head>
<body>
<div class="content">
    <h1>Slide Switch</h1>
    <p class="subtitle">Standard Single Pole Double Throw (SPDT) slide switch.</p>

    <h2>Pin Reference</h2>
    <table class="pin-table">
      <tr><th>Pin</th><th>Description</th></tr>
      <tr><td>1</td><td>Left terminal</td></tr>
      <tr><td>2</td><td>Common terminal</td></tr>
      <tr><td>3</td><td>Right terminal</td></tr>
    </table>
    
    <h2>Behavior</h2>
    <p>The slide switch has three pins. Pin 2 (in the middle) is the common pin. Depending on the position of the switch's handle, it's connected to either pin 1 or 3.</p>
    <p>Left Position: Shorting pins 1 and 2.</p>
    <p>Right Position: Shorting pins 3 and 2.</p>
</div>
</body>
</html>
`;
