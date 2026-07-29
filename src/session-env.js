'use strict';

/**
 * Persists Baileys auth_info_baileys/ folder as a single base64 blob so it
 * can be stored in a Render env var (WA_SESSION) and survive spin-downs /
 * redeploys without re-pairing.
 *
 * NOTE: Render env vars are static — this does NOT auto-update itself.
 * After pairing (or any time you want a fresh snapshot), copy the printed
 * blob into Render's env var manually, then redeploy.
 */

const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');

/** Restore auth files from WA_SESSION env var, if present. Call BEFORE useMultiFileAuthState(). */
function restoreFromEnv() {
  const blob = process.env.WA_SESSION;
  if (!blob) {
    console.log('[session] no WA_SESSION env var set — will need fresh pairing.');
    return false;
  }
  try {
    const json = Buffer.from(blob, 'base64').toString('utf8');
    const files = JSON.parse(json);
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(AUTH_DIR, name), content, 'utf8');
    }
    console.log(`[session] restored ${Object.keys(files).length} auth file(s) from WA_SESSION`);
    return true;
  } catch (err) {
    console.error('[session] failed to restore WA_SESSION (ignoring, will re-pair):', err.message);
    return false;
  }
}

/** Read current auth_info_baileys/ folder into a base64 blob. */
function dumpToEnvString() {
  if (!fs.existsSync(AUTH_DIR)) return null;
  const files = {};
  for (const name of fs.readdirSync(AUTH_DIR)) {
    const full = path.join(AUTH_DIR, name);
    if (fs.statSync(full).isFile()) {
      files[name] = fs.readFileSync(full, 'utf8');
    }
  }
  if (Object.keys(files).length === 0) return null;
  return Buffer.from(JSON.stringify(files), 'utf8').toString('base64');
}

/** Print the blob to logs so it can be copied into Render's env var UI. */
function printSessionBlob(label = 'WA_SESSION') {
  const blob = dumpToEnvString();
  if (!blob) return;
  console.log(`\n===== COPY THIS INTO RENDER ENV VAR "${label}" =====`);
  console.log(blob);
  console.log(`===== (${blob.length} chars) — paste as-is, no quotes needed =====\n`);
}

module.exports = { restoreFromEnv, dumpToEnvString, printSessionBlob };
