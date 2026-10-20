/**
 * @file src/lib/api/auth.js
 * Verifikasi keamanan API Key untuk Main Dashboard Read-Only API v1
 */

import { NextResponse } from 'next/server';

const DEFAULT_API_KEY = 'ag_live_pos_dashboard_secret_key_2026';

/**
 * Validasi header X-API-Key dari request HTTP
 * @param {Request} request
 * @returns {NextResponse | null} Mengembalikan null jika valid, atau NextResponse 401 jika gagal
 */
export function validateApiKey(request) {
  const expectedKey = process.env.MAIN_DASHBOARD_API_KEY || DEFAULT_API_KEY;
  const providedKey =
    request.headers.get('x-api-key') ||
    request.headers.get('X-API-Key') ||
    new URL(request.url).searchParams.get('api_key');

  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message:
          'Akses ditolak: Header X-API-Key tidak valid atau tidak disertakan.',
      },
      { status: 401 }
    );
  }

  return null;
}
