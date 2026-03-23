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

const SMS_TOKEN = process.env.SMS_TOKEN || '';
const API_URL   = 'https://api.bdbulksms.net/api.php?json';

/**
 * Send a single SMS.
 * @param {string} to  — Bangladeshi number (01xxxxxxxxx or +8801xxxxxxxxx)
 * @param {string} message
 * @returns {Promise<{success: boolean, status?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  if (!SMS_TOKEN) {
    console.warn('[SMS] SMS_TOKEN not configured — skipping.');
    return { success: false, error: 'SMS_TOKEN not configured' };
  }
  if (!to || !message) {
    return { success: false, error: 'to and message are required' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: SMS_TOKEN,
        smsdata: [{ to, message }],
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
 * Uses comma-separated `to` field as per API docs.
 * @param {string[]} numbers
 * @param {string} message
 * @returns {Promise<{success: boolean, sent: number, failed: number, results: object[]}>}
 */
async function sendBulkSMS(numbers, message) {
  if (!SMS_TOKEN) {
    console.warn('[SMS] SMS_TOKEN not configured — skipping bulk.');
    return { success: false, sent: 0, failed: 0, results: [] };
  }
  if (!numbers.length || !message) {
    return { success: false, sent: 0, failed: 0, results: [] };
  }

  try {
    const smsdata = numbers.map((to) => ({ to, message }));
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SMS_TOKEN, smsdata }),
    });

    const data = await res.json().catch(() => null);
    if (!data || !Array.isArray(data)) {
      console.error('[SMS] Unexpected bulk response:', data);
      return { success: false, sent: 0, failed: numbers.length, results: [] };
    }

    let sent = 0;
    let failed = 0;
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
  if (!SMS_TOKEN) return { success: false, balance: '0' };
  try {
    const res = await fetch(`https://api.bdbulksms.net/g_api.php?token=${SMS_TOKEN}&balance&json`);
    const text = await res.text();
    return { success: true, balance: text.trim() };
  } catch (err) {
    return { success: false, balance: '0', error: err.message };
  }
}

module.exports = { sendSMS, sendBulkSMS, getBalance };
