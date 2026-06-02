/**
 * openhw-wifi-ap/validation.ts
 * Validation rules for the WiFi AP component.
 */

import type { ValidationResult } from '../types';

export function validate(attrs: Record<string, string>): ValidationResult[] {
  const results: ValidationResult[] = [];

  // SSID must not be empty
  if (!attrs.ssid || attrs.ssid.trim() === '') {
    results.push({
      ruleId: 'wifi-ap-ssid-required',
      name: 'WiFi AP SSID Required',
      severity: 'error',
      message: 'SSID cannot be empty.',
      remediation: 'Set the ssid attribute to a valid network name.',
    });
  }

  // SSID max 32 chars (IEEE 802.11)
  if (attrs.ssid && attrs.ssid.length > 32) {
    results.push({
      ruleId: 'wifi-ap-ssid-length',
      name: 'WiFi AP SSID Too Long',
      severity: 'warning',
      message: `SSID "${attrs.ssid}" is ${attrs.ssid.length} chars (max 32).`,
      remediation: 'Shorten the SSID to 32 characters or fewer.',
    });
  }

  // Password: if set, must be at least 8 chars (WPA2 minimum)
  if (attrs.password && attrs.password.length > 0 && attrs.password.length < 8) {
    results.push({
      ruleId: 'wifi-ap-password-length',
      name: 'WiFi AP Password Too Short',
      severity: 'warning',
      message: 'WPA2 passwords require at least 8 characters.',
      remediation: 'Use a password of 8+ characters or leave blank for an open network.',
    });
  }

  // Channel must be 1–13
  const ch = parseInt(attrs.channel ?? '6', 10);
  if (isNaN(ch) || ch < 1 || ch > 13) {
    results.push({
      ruleId: 'wifi-ap-channel-range',
      name: 'WiFi AP Channel Out of Range',
      severity: 'warning',
      message: `Channel ${attrs.channel} is not a valid 2.4 GHz channel (1–13).`,
      remediation: 'Use a channel between 1 and 13.',
    });
  }

  return results;
}
