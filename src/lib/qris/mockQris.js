/**
 * @file mockQris.js
 * Generator data QRIS dan simulasi alur pembayaran gateway QRIS lokal (Midtrans/Xendit mock)
 */

import QRCode from 'qrcode';

/**
 * Generate string payload QRIS standar Indonesia (NMID / EMVCo format)
 * @param {string} orderNumber
 * @param {number} amount
 * @param {string} outletName
 * @returns {string} String representasi QRIS
 */
export function generateQrisPayload(orderNumber, amount, outletName = 'KOPI NUSANTARA') {
  const sanitizedName = outletName.toUpperCase().slice(0, 25);
  const formattedAmount = String(Math.round(amount));
  
  // Format simulasi payload QRIS standar Bank Indonesia / ASPI
  return `00020101021226600014ID.LINKAJA.WWW01189360000000000000000215${orderNumber.padEnd(15, '0')}51440014ID.CO.QRIS.WWW0215ID1020000000001520458125303360540${formattedAmount.length.toString().padStart(2, '0')}${formattedAmount}5802ID59${sanitizedName.length.toString().padStart(2, '0')}${sanitizedName}6007JAKARTA62070103A016304${Math.random().toString(16).substring(2, 6).toUpperCase()}`;
}

/**
 * Generate QR Code Data URL (Base64 PNG) untuk ditampilkan langsung di elemen <img>
 * @param {string} payload
 * @returns {Promise<string>}
 */
export async function generateQrCodeDataUrl(payload) {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Gagal generate QR Code:', err);
    return '';
  }
}
