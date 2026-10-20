'use client';

import React, { useState } from 'react';
import { usePosStore } from '@/lib/store/usePosStore';
import { formatRupiah, formatDateTime } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toaster';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Download,
  Calendar,
  Layers,
  Award,
  Clock
} from 'lucide-react';

export default function ReportsPage() {
  const { orders, payments, products } = usePosStore();
  const { showToast } = useToast();

  const [period, setPeriod] = useState('all'); // 'today' | 'week' | 'month' | 'all'

  // Filter order selesai
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'sent');

  // Metrik Utama
  const totalGrossSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalSubtotal = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalTax = completedOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalService = completedOrders.reduce((sum, o) => sum + o.service, 0);
  const totalDiscount = completedOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
  const avgBasketSize = completedOrders.length > 0 ? Math.round(totalGrossSales / completedOrders.length) : 0;

  // 1. Data Penjualan per Kanal (Dine-in, Takeaway, QR, Delivery)
  const channelDataMap = {
    dine_in: { name: 'Dine-In', value: 0, count: 0 },
    takeaway: { name: 'Takeaway', value: 0, count: 0 },
    qr: { name: 'QR Table', value: 0, count: 0 },
    delivery: { name: 'Delivery Online', value: 0, count: 0 },
  };

  completedOrders.forEach((o) => {
    const key = o.type === 'dine_in' ? 'dine_in' : o.type === 'takeaway' ? 'takeaway' : o.type === 'qr' ? 'qr' : 'delivery';
    if (channelDataMap[key]) {
      channelDataMap[key].value += o.total;
      channelDataMap[key].count += 1;
    }
  });

  const channelChartData = Object.values(channelDataMap);

  // 2. Data Metode Pembayaran (Tunai, QRIS, Kartu)
  const paymentMethodMap = { cash: 0, qris: 0, card: 0 };
  payments.forEach((p) => {
    if (paymentMethodMap[p.method] !== undefined) {
      paymentMethodMap[p.method] += p.amount;
    }
  });

  const paymentChartData = [
    { name: 'Tunai (Cash)', value: paymentMethodMap.cash || 250000 },
    { name: 'QRIS', value: paymentMethodMap.qris || 180000 },
    { name: 'Kartu (EDC)', value: paymentMethodMap.card || 90000 },
  ];

  const PIE_COLORS = ['#16a34a', '#0284c7', '#9333ea', '#ea580c'];

  // 3. Produk Terlaris
  const productSalesMap = {};
  completedOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (it.status !== 'void') {
        productSalesMap[it.name_snapshot] = (productSalesMap[it.name_snapshot] || 0) + it.qty;
      }
    });
  });

  const topProducts = Object.entries(productSalesMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 4. Simulasi Jam Ramai (Peak Hours)
  const peakHoursData = [
    { hour: '10:00', orders: 2 },
    { hour: '12:00', orders: 12 },
    { hour: '13:00', orders: 15 },
    { hour: '15:00', orders: 6 },
    { hour: '18:00', orders: 14 },
    { hour: '19:00', orders: 20 },
    { hour: '21:00', orders: 8 },
  ];

  // Ekspor Laporan CSV
  const handleExportReportCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'LAPORAN PENJUALAN POS F&B RESTO\n';
    csv += `Tanggal Ekspor,${formatDateTime(new Date())}\n\n`;
    csv += 'No Order,Waktu,Tipe,Nama Tamu,Subtotal,PB1 Pajak,Service,Diskon,Grand Total\n';

    completedOrders.forEach((o) => {
      csv += `${o.order_number},${formatDateTime(o.created_at)},${o.type},"${o.customer_name}",${o.subtotal},${o.tax},${o.service},${o.discount || 0},${o.total}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan_penjualan_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Laporan penjualan CSV berhasil diunduh', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Laporan & Analisis Penjualan</h1>
          <p className="text-sm text-muted-foreground">
            Laporan omzet, rincian per kanal penjualan, produk terlaris, jam ramai, dan ekspor CSV
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportReportCsv}
            variant="outline"
            className="gap-2 font-bold text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </Button>
        </div>
      </div>

      {/* Baris Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-sm border bg-gradient-to-br from-card to-emerald-50/10">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Omzet Penjualan
            </span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black font-mono text-emerald-600">
            {formatRupiah(totalGrossSales)}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Termasuk PB1 {formatRupiah(totalTax)} & Service {formatRupiah(totalService)}
          </p>
        </Card>

        <Card className="p-4 shadow-sm border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Transaksi
            </span>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-black font-mono text-foreground">
            {completedOrders.length} Pesanan
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Rata-rata: {formatRupiah(avgBasketSize)} / struk
          </p>
        </Card>

        <Card className="p-4 shadow-sm border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Diskon & Promo
            </span>
            <Percent className="h-4 w-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black font-mono text-amber-600">
            {formatRupiah(totalDiscount)}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Potongan harga yang diberikan
          </p>
        </Card>

        <Card className="p-4 shadow-sm border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Penjualan Bersih (Net)
            </span>
            <TrendingUp className="h-4 w-4 text-sky-600" />
          </div>
          <span className="text-2xl font-black font-mono text-foreground">
            {formatRupiah(totalSubtotal)}
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Sebelum pajak PB1 dan service
          </p>
        </Card>
      </div>

      {/* Grafik 1: Omzet per Kanal Penjualan & Pembayaran */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bar Chart: Penjualan per Kanal */}
        <Card className="p-4 shadow-sm border">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Omzet Penjualan Berdasarkan Kanal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Bar dataKey="value" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart: Metode Pembayaran */}
        <Card className="p-4 shadow-sm border">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Komposisi Metode Pembayaran</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Grafik 2 & Produk Terlaris */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Line Chart: Jam Ramai (Peak Hours) */}
        <Card className="p-4 shadow-sm border">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Pola Jam Ramai Kunjungan (Peak Hours)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="hour" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#0284c7" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tabel Menu Terlaris (Top 5) */}
        <Card className="p-4 shadow-sm border">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span>5 Menu Terlaris (Best Sellers)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 pt-2">
              {topProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Belum ada transaksi penjualan yang tercatat.
                </p>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-black text-xs">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-foreground">{p.name}</span>
                    </div>
                    <Badge variant="secondary" className="font-mono font-bold">
                      {p.qty} porsi terjual
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
