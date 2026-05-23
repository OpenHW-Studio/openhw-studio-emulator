export const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>DHT11 Reference | OpenHW Studio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f1117; color: #e2e8f0; line-height: 1.7; padding: 48px 64px; }
  h1 { font-size: 36px; font-weight: 800; color: #fff; margin-bottom: 8px; }
  .subtitle { font-size: 16px; color: #718096; margin-bottom: 36px; border-bottom: 1px solid #2d3748; padding-bottom: 24px; }
  .code-block { background: #141824; border: 1px solid #2d3748; border-radius: 8px; padding: 20px 24px; font-family: 'Courier New', monospace; font-size: 13px; color: #e2e8f0; overflow-x: auto; margin-bottom: 20px; position: relative; }
  .pin-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
  .pin-table th { background: #1a1f2e; color: #63b3ed; padding: 10px 14px; text-align: left; border: 1px solid #2d3748; }
  .pin-table td { padding: 10px 14px; border: 1px solid #2d3748; color: #a0aec0; }
  .pin-table tr:nth-child(even) td { background: #141824; }
  h2 { font-size: 22px; font-weight: 700; color: #fff; margin: 36px 0 16px; padding-bottom: 8px; border-bottom: 1px solid #2d3748; }
</style>
</head>
<body>
<div class="content">
    <h1>DHT11 Sensor</h1>
    <p class="subtitle">A basic, ultra low-cost digital temperature and humidity sensor.</p>

    <h2>Pin Reference</h2>
    <table class="pin-table">
      <tr><th>Pin</th><th>Type</th><th>Description</th></tr>
      <tr><td>VCC</td><td>Power</td><td>Power supply (3.3V to 5.5V)</td></tr>
      <tr><td>DATA</td><td>Data In/Out</td><td>Digital communication line (usually requires 10k pull-up)</td></tr>
      <tr><td>NC</td><td>Not Connected</td><td>Do not connect</td></tr>
      <tr><td>GND</td><td>Power</td><td>Ground</td></tr>
    </table>

    <h2>Example Arduino Code</h2>
    <div class="code-block">
<pre>#include "DHT.h"

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  Serial.print("Humidity: "); 
  Serial.print(h);
  Serial.print("%  Temp: "); 
  Serial.print(t); 
  Serial.println("°C");

  delay(2000);
}</pre>
    </div>
</div>
</body>
</html>
`;
