"use strict";

const crypto = require("crypto");

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < buffer.length; i += 1) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function hotp(secret, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(bin % 1000000).padStart(6, "0");
}

function totpMatches(secretHex, code, now) {
  const cleaned = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const hex = String(secretHex || "");
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return false;
  const secret = Buffer.from(hex, "hex");
  if (!secret.length) return false;
  const moment = typeof now === "number" ? now : Date.now();
  const counter = Math.floor(moment / 30000);
  const given = Buffer.from(cleaned);
  for (let step = -1; step <= 1; step += 1) {
    if (counter + step < 0) continue;
    const expected = Buffer.from(hotp(secret, counter + step));
    if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return true;
  }
  return false;
}

module.exports = { base32Encode, hotp, totpMatches };
