'use strict';

/**
 * bKash Tokenized Checkout API service
 *
 * Docs: https://developer.bka.sh/docs/checkout-process-overview
 *
 * Sandbox base URL: https://tokenized.sandbox.pay.bka.sh/v1.2.0-beta
 * Production base URL: https://tokenized.pay.bka.sh/v1.2.0-beta
 *
 * Required env vars:
 *   BKASH_BASE_URL   – base URL (sandbox or production)
 *   BKASH_USERNAME   – merchant username (used in grant token header)
 *   BKASH_PASSWORD   – merchant password (used in grant token header)
 *   BKASH_APP_KEY    – app key (used in grant token body & all subsequent call headers)
 *   BKASH_APP_SECRET – app secret (used in grant token body)
 */

const BASE_URL    = process.env.BKASH_BASE_URL    || 'https://tokenized.sandbox.pay.bka.sh/v1.2.0-beta';
const USERNAME    = process.env.BKASH_USERNAME    || '';
const PASSWORD    = process.env.BKASH_PASSWORD    || '';
const APP_KEY     = process.env.BKASH_APP_KEY     || '';
const APP_SECRET  = process.env.BKASH_APP_SECRET  || '';

// ─── Token cache (module-level singleton) ──────────────────────────────────────
let _idToken      = null;
let _refreshToken = null;
let _tokenExpiry  = 0; // epoch ms when the id_token expires

// ─── Raw HTTP helper ───────────────────────────────────────────────────────────
async function bkashFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.errorMessage || data.statusMessage || `bKash API error ${res.status}`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.bkashCode  = data.errorCode || data.statusCode;
    throw err;
  }

  // bKash returns 200 but may include an error in the body
  if (data.errorCode) {
    const err = new Error(data.errorMessage || 'bKash error');
    err.bkashCode = data.errorCode;
    throw err;
  }

  return data;
}

// ─── Grant Token ───────────────────────────────────────────────────────────────
async function grantToken() {
  const data = await bkashFetch('/checkout/token/grant', {
    method: 'POST',
    headers: { username: USERNAME, password: PASSWORD },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET }),
  });

  _idToken      = data.id_token;
  _refreshToken = data.refresh_token;
  // expires_in is in seconds (default 3600); subtract 60s buffer
  const expiresIn = parseInt(data.expires_in, 10) || 3600;
  _tokenExpiry  = Date.now() + (expiresIn - 60) * 1000;

  return _idToken;
}

// ─── Refresh Token ─────────────────────────────────────────────────────────────
async function refreshToken() {
  if (!_refreshToken) throw new Error('No refresh token available');

  const data = await bkashFetch('/checkout/token/refresh', {
    method: 'POST',
    headers: { username: USERNAME, password: PASSWORD },
    body: JSON.stringify({ app_key: APP_KEY, app_secret: APP_SECRET, refresh_token: _refreshToken }),
  });

  _idToken     = data.id_token;
  const expiresIn = parseInt(data.expires_in, 10) || 3600;
  _tokenExpiry = Date.now() + (expiresIn - 60) * 1000;

  return _idToken;
}

// ─── Public: get valid token (grant or refresh as needed) ──────────────────────
async function getToken() {
  if (_idToken && Date.now() < _tokenExpiry) return _idToken;

  if (_refreshToken) {
    try {
      return await refreshToken();
    } catch {
      // refresh failed – fall through to full grant
    }
  }

  return await grantToken();
}

// ─── Authenticated header builder ──────────────────────────────────────────────
async function authHeaders() {
  const token = await getToken();
  return { Authorization: token, 'X-App-Key': APP_KEY };
}

// ─── Create Payment ────────────────────────────────────────────────────────────
/**
 * @param {object} payload
 * @param {string} payload.callbackURL       – base callback URL (bKash appends success/fail/cancel suffixes)
 * @param {string|number} payload.amount     – payment amount (string per bKash spec)
 * @param {string} payload.merchantInvoiceNumber – unique per transaction (max 255)
 * @param {string} [payload.payerReference]  – customer reference (wallet pre-fill); '-' if unknown
 * @param {string} [payload.intent]          – 'sale' (default) or 'authorization'
 * @returns {{ paymentID: string, bkashURL: string, ... }}
 */
async function createPayment({ callbackURL, amount, merchantInvoiceNumber, payerReference = '-', intent = 'sale' }) {
  const headers = await authHeaders();
  return bkashFetch('/checkout/payment/create', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mode: '0011',
      payerReference,
      callbackURL,
      amount: String(amount),
      currency: 'BDT',
      intent,
      merchantInvoiceNumber,
    }),
  });
}

// ─── Execute Payment ───────────────────────────────────────────────────────────
/**
 * @param {string} paymentID – returned from createPayment
 * @returns {{ trxID: string, transactionStatus: string, customerMsisdn: string, amount: string, ... }}
 */
async function executePayment(paymentID) {
  const headers = await authHeaders();
  return bkashFetch('/checkout/execute', {
    method: 'POST',
    headers,
    body: JSON.stringify({ paymentID }),
  });
}

// ─── Query Payment ─────────────────────────────────────────────────────────────
/**
 * @param {string} paymentID
 * @returns {{ transactionStatus: string, trxID: string, amount: string, ... }}
 */
async function queryPayment(paymentID) {
  const headers = await authHeaders();
  return bkashFetch(`/checkout/payment/query/${paymentID}`, {
    method: 'GET',
    headers,
  });
}

module.exports = { getToken, createPayment, executePayment, queryPayment };
