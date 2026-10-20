/**
 * @file crypto.js
 * Utilitas enkripsi dan hash SHA-256 untuk PIN karyawan
 */

/**
 * Hash string PIN (4-6 digit) menggunakan algoritma SHA-256
 * Kompatibel dengan Browser (crypto.subtle) dan Node.js
 * @param {string} pin
 * @returns {Promise<string>} Hex string hash
 */
export async function hashPin(pin) {
  const pinStr = String(pin || '').trim();
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pinStr);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(pinStr).digest('hex');
  } catch {
    // Basic fallback for edge cases
    let hash = 0;
    for (let i = 0; i < pinStr.length; i++) {
      hash = (hash << 5) - hash + pinStr.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}

/**
 * Verifikasi apakah PIN cocok dengan hash yang tersimpan
 * @param {string} pin
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin, storedHash) {
  if (!pin || !storedHash) return false;
  const computed = await hashPin(pin);
  return computed === storedHash;
}
