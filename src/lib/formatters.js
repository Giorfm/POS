/**
 * @file formatters.js
 * Utilitas pemformatan mata uang Rupiah dan tanggal/waktu zona Asia/Jakarta
 */

/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp10.000)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num).replace(/\s+/g, '');
}

/**
 * Format tanggal dan waktu dalam zona waktu Asia/Jakarta
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d) + ' WIB';
}

/**
 * Format jam dan menit saja (15:30 WIB)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTime(date) {
  if (!date) return '--:--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Hitung durasi dalam menit sejak tanggal tertentu
 * @param {string|Date} startDate
 * @returns {number} Durasi dalam menit
 */
export function getDurationMinutes(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / 60000));
}

/**
 * Format durasi menit ke teks yang mudah dibaca (misal "15 mnt" atau "1j 20m")
 * @param {number} minutes
 * @returns {string}
 */
export function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0 mnt';
  if (minutes < 60) return `${minutes} mnt`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}j ${remainingMinutes}m`;
}
