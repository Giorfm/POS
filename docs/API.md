# Dokumentasi API POS F&B (v1)

Dokumentasi resmi untuk antarmuka pemrograman aplikasi (API) sistem POS F&B Nusantara, mencakup Webhook Eksternal (Delivery & QRIS) serta API Read-Only untuk integrasi Dashboard Utama / ERP.

---

## 1. Autentikasi & Keamanan

Semua permintaan ke endpoint Main Dashboard (`/api/v1/*`) memerlukan header autentikasi `X-API-Key`:

```http
X-API-Key: ag_live_pos_dashboard_secret_key_2026
```

> **Catatan Keamanan**: Nilai default dapat dikustomisasi melalui environment variable `MAIN_DASHBOARD_API_KEY` di file `.env.local`. Permintaan tanpa API key yang sah akan mengembalikan respons `401 Unauthorized`.

---

## 2. Ringkasan Penjualan Hari Ini

Mendapatkan metrik omset harian, total pesanan, rincian kanal penjualan, dan komposisi metode pembayaran.

- **Endpoint:** `GET /api/v1/summary`
- **Headers:** `X-API-Key: <YOUR_API_KEY>`
- **Respons (200 OK):**

```json
{
  "status": "success",
  "data": {
    "outlet": {
      "id": "00000000-0000-0000-0000-000000000001",
      "name": "Kopi & Resto Nusantara - Cabang Utama",
      "currency": "IDR",
      "timezone": "Asia/Jakarta"
    },
    "period": {
      "date": "2026-10-20",
      "generated_at": "2026-10-20T09:00:00.000Z"
    },
    "metrics": {
      "total_orders": 42,
      "gross_sales": 3450000,
      "total_discounts": 150000,
      "service_charge": 165000,
      "tax_pb1": 330000,
      "net_sales": 3795000,
      "average_order_value": 82142
    },
    "channel_breakdown": {
      "dine_in": { "count": 24, "gross_sales": 1980000, "percentage": 57.4 },
      "takeaway": { "count": 8, "gross_sales": 540000, "percentage": 15.6 },
      "qr": { "count": 6, "gross_sales": 450000, "percentage": 13.0 },
      "delivery": { "count": 4, "gross_sales": 480000, "percentage": 14.0 }
    },
    "payment_breakdown": {
      "qris": { "count": 20, "total": 1820000, "percentage": 48.0 },
      "cash": { "count": 16, "total": 1350000, "percentage": 35.6 },
      "card": { "count": 6, "total": 625000, "percentage": 16.4 }
    },
    "shift_status": {
      "is_active": true,
      "current_cashier": "Rian Pratama",
      "shift_opened_at": "2026-10-20T04:00:00.000Z"
    }
  }
}
```

---

## 3. Riwayat Transaksi Penjualan

Mengambil daftar pesanan dan rincian transaksi dengan paginasi dan filter kanal/status.

- **Endpoint:** `GET /api/v1/sales`
- **Headers:** `X-API-Key: <YOUR_API_KEY>`
- **Query Parameters:**
  - `channel` *(opsional)*: `dine_in`, `takeaway`, `qr`, `delivery`
  - `status` *(opsional)*: `completed`, `open`, `cancelled`
  - `limit` *(opsional, default: 20, maks: 100)*: Jumlah data per halaman
  - `offset` *(opsional, default: 0)*: Indeks awal data
- **Respons (200 OK):**

```json
{
  "status": "success",
  "pagination": {
    "total": 4,
    "limit": 20,
    "offset": 0,
    "has_more": false
  },
  "data": [
    {
      "id": "ord-001",
      "order_number": "ORD-109281",
      "type": "dine_in",
      "source": "pos",
      "customer_name": "Meja 02",
      "table_name": "Meja 02",
      "status": "completed",
      "subtotal": 120000,
      "service": 6000,
      "tax": 12600,
      "discount": 0,
      "total": 138600,
      "payment_method": "qris",
      "items_count": 3,
      "items": [
        { "name": "Kopi Susu Gula Aren", "qty": 2, "price": 24000 },
        { "name": "Nasi Goreng Spesial Resto", "qty": 1, "price": 38000 }
      ],
      "created_at": "2026-10-20T08:00:00.000Z"
    }
  ]
}
```

---

## 4. Status Stok & Inventaris

Mengambil status ketersediaan bahan baku, peringatan bahan kritis menipis, dan valuasi aset persediaan.

- **Endpoint:** `GET /api/v1/inventory`
- **Headers:** `X-API-Key: <YOUR_API_KEY>`
- **Respons (200 OK):**

```json
{
  "status": "success",
  "summary": {
    "total_ingredients": 5,
    "low_stock_count": 2,
    "critical_alert_count": 1,
    "total_inventory_valuation": 1888000
  },
  "data": [
    {
      "id": "ing-001",
      "name": "Biji Kopi Arabika Mandheling",
      "base_unit": "gram",
      "purchase_unit": "kg",
      "current_stock": 4200,
      "min_stock": 1000,
      "unit_cost": 250,
      "is_critical": true,
      "status": "safe",
      "total_valuation": 1050000
    },
    {
      "id": "ing-004",
      "name": "Daging Sapi Sirloin Australia",
      "base_unit": "gram",
      "purchase_unit": "kg",
      "current_stock": 1800,
      "min_stock": 2000,
      "unit_cost": 160,
      "is_critical": true,
      "status": "low",
      "total_valuation": 288000
    }
  ]
}
```

---

## 5. Riwayat Shift Kasir

Mengambil riwayat pembukaan dan penutupan laci kas, uang fisik aktual, uang sistem, selisih (variance), dan persetujuan manajer.

- **Endpoint:** `GET /api/v1/shifts`
- **Headers:** `X-API-Key: <YOUR_API_KEY>`
- **Respons (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "id": "shift-001",
      "cashier_id": "10000000-0000-0000-0000-000000000003",
      "cashier_name": "Rian Pratama",
      "status": "active",
      "opened_at": "2026-10-20T04:00:00.000Z",
      "closed_at": null,
      "opening_cash": 500000,
      "expected_cash": 1850000,
      "actual_cash": null,
      "variance": null,
      "cash_in_drawer": 1850000,
      "petty_cash_in": 50000,
      "petty_cash_out": 25000,
      "total_sales_cash": 1325000,
      "total_sales_qris": 1820000,
      "approved_by": null
    }
  ]
}
```

---

## 6. Webhook Delivery Online

Endpoint penerima pesanan dari platform GoFood, GrabFood, dan ShopeeFood.

- **Endpoint:** `POST /api/delivery/webhook`
- **Headers:**
  - `X-Platform`: `gofood` | `grabfood` | `shopeefood`
  - `X-Delivery-Signature`: `<HMAC_SHA256_SIGNATURE>` (Opsional di mode sandbox)
- **Body JSON Contoh (GoFood):**

```json
{
  "platform": "gofood",
  "order_id": "GF-994821",
  "customer_name": "Amanda",
  "driver_name": "Agus Santoso",
  "driver_phone": "0812-9988-7766",
  "items": [
    { "sku": "GF-KOPI-AREN", "name": "Kopi Susu Gula Aren", "qty": 2, "price": 24000 }
  ],
  "total": 48000,
  "is_sandbox": true
}
```

- **Respons (200 OK):**

```json
{
  "status": "success",
  "message": "Pesanan webhook dari GOFOOD berhasil diterima",
  "data": {
    "success": true,
    "platform": "gofood",
    "externalId": "GF-994821",
    "status": "received",
    "timestamp": "2026-10-20T09:15:00.000Z"
  },
  "processed_at": "2026-10-20T09:15:00.000Z"
}
```

---

## 7. Webhook Gateway Pembayaran QRIS

Endpoint notifikasi settlement dari payment gateway (Midtrans, Xendit, atau ASPI QRIS).

- **Endpoint:** `POST /api/qris/webhook`
- **Headers:** `X-Idempotency-Key: <UNIQUE_KEY>`
- **Body JSON Contoh:**

```json
{
  "order_id": "ORD-109281",
  "transaction_status": "settlement",
  "gross_amount": 138600,
  "payment_type": "qris",
  "idempotency_key": "IDEM-884210"
}
```

- **Respons (200 OK):**

```json
{
  "status": "success",
  "message": "Notifikasi pembayaran QRIS berhasil dicatat",
  "data": {
    "order_number": "ORD-109281",
    "status": "settlement",
    "gross_amount": 138600,
    "idempotency_key": "IDEM-884210",
    "settled_at": "2026-10-20T09:15:30.000Z"
  }
}
```
