'use strict';

/**
 * BD Bulk SMS service — https://bdbulksms.net
 *
 * Uses the JSON API endpoint: POST https://api.bdbulksms.net/api.php?json
 * Token comes from SMS_TOKEN env var.
 *
 * All functions are fire-and-forget safe — they never throw,
 * so callers can `await sendSMS(…)` without try/catch if the
 * SMS is not critical to the request flow.
 */

const API_URL = 'https://api.bdbulksms.net/api.php?json';

function getSmsToken() {
  return process.env.SMS_TOKEN || '';
}

/**
 * Normalize and validate a Bangladeshi mobile phone number.
 * Accepts: 01712345678, +8801712345678, 8801712345678 (with optional spaces/dashes/parens).
 * Returns normalized 11-digit string (01[3-9]XXXXXXXX) or null if invalid.
 */
function normalizeBdPhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/[\s\-()]/g, '');
  if (p.startsWith('+880')) p = '0' + p.slice(4);
  else if (p.startsWith('880')) p = '0' + p.slice(3);
  if (/^01[3-9]\d{8}$/.test(p)) return p;
  return null;
}

/**
 * Send a single SMS.
 * @param {string} to  — Bangladeshi number (01xxxxxxxxx or +8801xxxxxxxxx)
 * @param {string} message
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  const token = getSmsToken();
  if (!token) {
    console.warn('[SMS] SMS_TOKEN not configured — skipping.');
    return { success: false, error: 'SMS_TOKEN not configured' };
  }
  if (!to || !message) {
    return { success: false, error: 'to and message are required' };
  }
  const normalizedTo = normalizeBdPhone(to);
  if (!normalizedTo) {
    return { success: false, error: 'Invalid Bangladeshi phone number' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        smsdata: [{ to: normalizedTo, message }],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data)) {
      console.error('[SMS] Unexpected response:', data);
      return { success: false, error: 'Unexpected API response' };
    }

    const result = data[0];
    const ok = result?.status === 'SENT';
    if (!ok) console.warn('[SMS] Send failed:', result?.statusmsg || result);
    return { success: ok, status: result?.status, statusmsg: result?.statusmsg };
  } catch (err) {
    console.error('[SMS] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send SMS to multiple recipients (same message).
 * @param {string[]} numbers
 * @param {string} message
 * @returns {Promise<{success: boolean, sent: number, failed: number, results: object[]}>}
 */
async function sendBulkSMS(numbers, message) {
  const token = getSmsToken();
  if (!token) {
    console.warn('[SMS] SMS_TOKEN not configured — skipping bulk.');
    return { success: false, sent: 0, failed: 0, results: [] };
  }
  if (!Array.isArray(numbers) || !numbers.length || !message) {
    return { success: false, sent: 0, failed: 0, results: [] };
  }

  const validNumbers = [];
  let invalidCount = 0;
  for (const raw of numbers) {
    const clean = normalizeBdPhone(raw);
    if (clean) validNumbers.push(clean);
    else invalidCount++;
  }
  if (!validNumbers.length) {
    return { success: false, sent: 0, failed: invalidCount, results: [] };
  }

  try {
    const smsdata = validNumbers.map((to) => ({ to, message }));
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, smsdata }),
    });

    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data)) {
      console.error('[SMS] Unexpected bulk response:', data);
      return { success: false, sent: 0, failed: numbers.length, results: [] };
    }

    let sent = 0;
    let failed = invalidCount;
    for (const r of data) {
      if (r.status === 'SENT') sent++;
      else failed++;
    }

    return { success: sent > 0, sent, failed, results: data };
  } catch (err) {
    console.error('[SMS] Bulk network error:', err.message);
    return { success: false, sent: 0, failed: numbers.length, results: [] };
  }
}

/**
 * Check account SMS balance.
 * @returns {Promise<{success: boolean, balance?: string}>}
 */
async function getBalance() {
  const token = getSmsToken();
  if (!token) return { success: false, balance: '0' };
  try {
    const res = await fetch(`https://api.bdbulksms.net/g_api.php?token=${token}&balance&json`);
    const text = await res.text();
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed[0]?.response !== undefined) {
        return { success: true, balance: String(parsed[0].response) };
      }
    } catch {
      // Not JSON — treat as plain text
    }
    return { success: true, balance: text.trim() };
  } catch (err) {
    return { success: false, balance: '0', error: err.message };
  }
}

module.exports = { sendSMS, sendBulkSMS, getBalance, normalizeBdPhone };
