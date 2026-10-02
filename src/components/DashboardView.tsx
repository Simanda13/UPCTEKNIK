import React, { useState, useMemo } from 'react';
import {
  Scale,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
  Check,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Alat, Jadwal, Periksa } from '../types';
import { formatDateIndo, getDaysLeft, getUrgencyStatus, getIsoDate } from '../services/storage';

interface DashboardViewProps {
  alat: Alat[];
  jadwal: Jadwal[];
  periksa: Periksa[];
  onNavigate: (view: 'alat' | 'jadwal' | 'periksa', filterCode?: string) => void;
  onOpenAlatDetail: (alat: Alat) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  alat,
  jadwal,
  periksa,
  onNavigate,
  onOpenAlatDetail,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const todayIso = getIsoDate(0);

  // Tab state for 6-month verification trend chart: 'bar' | 'rate'
  const [chartViewMode, setChartViewMode] = useState<'bar' | 'rate'>('bar');

  // Calculate annual schedule statistics
  const completedPerMonth = Array(12).fill(0);
  const pendingPerMonth = Array(12).fill(0);

  jadwal.forEach((j) => {
    const year = parseInt(j.tgl.slice(0, 4), 10);
    const month = parseInt(j.tgl.slice(5, 7), 10) - 1;
    if (year === currentYear && month >= 0 && month < 12) {
      if (j.selesai) {
        completedPerMonth[month]++;
      } else {
        pendingPerMonth[month]++;
      }
    }
  });

  const totalCompleted = completedPerMonth.reduce((a, b) => a + b, 0);
  const totalPending = pendingPerMonth.reduce((a, b) => a + b, 0);
  const totalScheduled = totalCompleted + totalPending;
  const overdueCount = jadwal.filter((j) => !j.selesai && j.tgl < todayIso).length;
  const completionPct = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // Scales that need attention (due within 60 days or overdue)
  const urgentScales = alat
    .filter((a) => a.next && getDaysLeft(a.next) <= 60)
    .sort((a, b) => (a.next || '').localeCompare(b.next || ''))
    .slice(0, 6);

  // Group by user distribution
  const userCounts: Record<string, number> = {};
  alat.forEach((a) => {
    userCounts[a.user] = (userCounts[a.user] || 0) + 1;
  });
  const sortedUsers = Object.entries(userCounts).sort((a, b) => b[1] - a[1]);
  const maxUserCount = Math.max(1, ...Object.values(userCounts));

  // Max for annual schedule bar visualizer
  const maxChartVal = Math.max(2, ...completedPerMonth, ...pendingPerMonth);

  // === 6-MONTH RECHARTS TREND CALCULATION ===
  const last6Months = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = `${MONTHS[month]} '${String(year).slice(-2)}`;
      months.push({ key: monthKey, label, year, month });
    }
    return months;
  }, []);

  const verificationTrendData = useMemo(() => {
    return last6Months.map(({ key, label }) => {
      const testsInMonth = periksa.filter((p) => p.tgl && p.tgl.slice(0, 7) === key);
      const okCount = testsInMonth.filter((p) => p.ok).length;
      const tidakOkCount = testsInMonth.filter((p) => !p.ok).length;
      const total = okCount + tidakOkCount;
      const passRate = total > 0 ? Math.round((okCount / total) * 100) : null;

      return {
        bulan: label,
        ok: okCount,
        tidakOk: tidakOkCount,
        total,
        passRate: passRate !== null ? passRate : 100,
        hasData: total > 0,
      };
    });
  }, [periksa, last6Months]);

  // Aggregate stats for the 6-month period
  const trendSummary = useMemo(() => {
    const totalTests = verificationTrendData.reduce((acc, cur) => acc + cur.total, 0);
    const totalOk = verificationTrendData.reduce((acc, cur) => acc + cur.ok, 0);
    const totalTidakOk = verificationTrendData.reduce((acc, cur) => acc + cur.tidakOk, 0);
    const avgPassRate = totalTests > 0 ? Math.round((totalOk / totalTests) * 100) : 100;
    return { totalTests, totalOk, totalTidakOk, avgPassRate };
  }, [verificationTrendData]);

  // Custom Tooltip for Recharts
  const CustomRechartsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
          <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
            <span>Bulan: {label}</span>
            <span className="text-[11px] font-mono text-slate-500">{point.total} uji total</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              Memenuhi (OK):
            </span>
            <span className="font-mono font-bold text-teal-700">{point.ok} alat</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Di Luar Toleransi:
            </span>
            <span className="font-mono font-bold text-rose-600">{point.tidakOk} alat</span>
          </div>

          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-slate-500">Tingkat Kelaikan:</span>
            <span className="font-mono font-bold text-slate-900">
              {point.hasData ? `${Math.round((point.ok / point.total) * 100)}%` : 'Belum ada uji'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Ringkasan Metrologi &amp; Kalibrasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Status pemantauan timbangan industri dan verifikasi internal tahun {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistem aktif · Penyimpanan lokal sinkron</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Alat
            </span>
            <Scale className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-tabular text-slate-900">{alat.length}</span>
            <span className="text-xs text-slate-500">unit terdaftar</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
            <button
              onClick={() => onNavigate('alat')}
              className="text-teal-700 hover:text-teal-900 font-medium inline-flex items-center gap-0.5 cursor-pointer"
            >
              Lihat daftar alat <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-700"></div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sudah Diverifikasi
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-tabular text-emerald-700">
              {totalCompleted}
            </span>
            <span className="text-xs text-slate-500">jadwal selesai</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Tahun berjalan {currentYear}
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600"></div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Belum Diverifikasi
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-tabular text-amber-800">
              {totalPending}
            </span>
            <span className="text-xs text-slate-500">menunggu</span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Jadwal tersisa tahun ini
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Terlambat / Lewat
            </span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono-tabular text-red-600">
              {overdueCount}
            </span>
            <span className="text-xs text-slate-500">perlu tindakan</span>
          </div>
          <div className="mt-3 text-xs text-red-600 font-medium">
            Jatuh tempo terlampaui
          </div>
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600"></div>
        </div>
      </div>

      {/* NEW: RECHARTS VERIFICATION RESULT TREND (6 BULAN TERAKHIR) */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-100 rounded-lg text-teal-800">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-slate-900 text-base">
                Tren Hasil Verifikasi Timbangan (6 Bulan Terakhir)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualisasi rasio alat timbang memenuhi spesifikasi toleransi (OK) vs di luar toleransi (Tidak OK)
            </p>
          </div>

          {/* View Mode Segmented Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto text-xs">
            <button
              onClick={() => setChartViewMode('bar')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                chartViewMode === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Komparasi OK vs Tidak OK
            </button>
            <button
              onClick={() => setChartViewMode('rate')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                chartViewMode === 'rate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tingkat Kelaikan (%)
            </button>
          </div>
        </div>

        {/* 6-Month Micro Metric Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Total Pengujian (6 Bln)</span>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {trendSummary.totalTests} pengujian
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Memenuhi Syarat (OK)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold font-mono text-teal-700 text-sm">
                {trendSummary.totalOk} alat
              </span>
              <span className="text-[11px] text-teal-600 font-medium">
                ({trendSummary.totalTests > 0 ? Math.round((trendSummary.totalOk / trendSummary.totalTests) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Di Luar Toleransi (Tidak OK)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold font-mono text-rose-600 text-sm">
                {trendSummary.totalTidakOk} alat
              </span>
              <span className="text-[11px] text-rose-500 font-medium">
                ({trendSummary.totalTests > 0 ? Math.round((trendSummary.totalTidakOk / trendSummary.totalTests) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Tingkat Kelaikan Rata-rata</span>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {trendSummary.avgPassRate}% Lulus
            </span>
          </div>
        </div>

        {/* Recharts Chart Viewport */}
        <div className="w-full h-64 pt-2">
          {chartViewMode === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={verificationTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
                />
                <Bar
                  dataKey="ok"
                  name="Memenuhi Toleransi (OK)"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="tidakOk"
                  name="Di Luar Toleransi (Tidak OK)"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={verificationTrendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPassRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="bulan"
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: '#64748B', fontSize: 12 }}
                />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingBottom: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="passRate"
                  name="Persentase Kelaikan (%)"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPassRate)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Annual Progress Target Bar */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="text-sm font-semibold text-slate-800">
            Capaian Target Verifikasi {currentYear}:{' '}
            <span className="font-mono text-teal-800 font-bold">{completionPct}% Selesai</span>
            <span className="text-xs font-normal text-slate-500 ml-2">
              ({totalCompleted} dari {totalScheduled} jadwal)
            </span>
          </div>
          <button
            onClick={() => onNavigate('periksa')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Mulai Verifikasi Baru <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-teal-700 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
          ></div>
        </div>
      </div>

      {/* Monthly Verification Histogram Chart */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Grafik Pelaksanaan Jadwal Kalibrasi / Verifikasi Per Bulan ({currentYear})
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan timbangan yang sudah diverifikasi (solid) vs belum dilaksanakan (arsir)
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-teal-700"></span>
              <span className="text-slate-600 font-medium">Sudah Selesai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-400 border border-amber-600"></span>
              <span className="text-slate-600 font-medium">Belum Diverifikasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-amber-100"></span>
              <span className="text-slate-600 font-medium">Bulan Berjalan</span>
            </div>
          </div>
        </div>

        {/* Bar Visualizer */}
        <div className="overflow-x-auto pt-4">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-12 gap-2 h-44 border-b-2 border-slate-800 items-end px-2">
              {MONTHS.map((month, idx) => {
                const isCurrentMonth = idx === currentMonthIdx;
                const completed = completedPerMonth[idx];
                const pending = pendingPerMonth[idx];
                const total = completed + pending;

                const completedHeight = maxChartVal > 0 ? (completed / maxChartVal) * 100 : 0;
                const pendingHeight = maxChartVal > 0 ? (pending / maxChartVal) * 100 : 0;

                return (
                  <div
                    key={month}
                    className={`flex flex-col items-center justify-end h-full p-1 rounded-t-lg transition-colors ${
                      isCurrentMonth ? 'bg-amber-50/80 ring-1 ring-amber-300/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Count summary tag */}
                    <div className="text-[11px] font-mono-tabular font-bold text-slate-700 mb-1">
                      {total > 0 ? total : ''}
                    </div>

                    {/* Bars pair */}
                    <div className="flex items-end justify-center gap-1 w-full h-32">
                      {/* Completed bar */}
                      <div className="w-1/2 flex flex-col justify-end items-center h-full">
                        {completed > 0 && (
                          <div
                            className="w-full bg-teal-700 rounded-t-sm transition-all duration-300"
                            style={{ height: `${completedHeight}%` }}
                            title={`${month}: ${completed} selesai`}
                          ></div>
                        )}
                      </div>
                      {/* Pending bar */}
                      <div className="w-1/2 flex flex-col justify-end items-center h-full">
                        {pending > 0 && (
                          <div
                            className="w-full bg-amber-400 border-t border-x border-amber-600 rounded-t-sm transition-all duration-300"
                            style={{ height: `${pendingHeight}%` }}
                            title={`${month}: ${pending} belum`}
                          ></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis labels */}
            <div className="grid grid-cols-12 gap-2 pt-2 px-2 text-center text-xs">
              {MONTHS.map((month, idx) => (
                <span
                  key={month}
                  className={`font-medium ${
                    idx === currentMonthIdx ? 'font-bold text-teal-800' : 'text-slate-500'
                  }`}
                >
                  {month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Urgent Scales & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Scales (Perlu Perhatian) */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Perlu Perhatian (Jatuh Tempo &le; 60 Hari)</h3>
              <p className="text-xs text-slate-500">Timbangan yang segera memerlukan kalibrasi atau verifikasi ulang</p>
            </div>
            <button
              onClick={() => onNavigate('alat')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              Semua Alat
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-2.5">Kode</th>
                  <th className="pb-2.5">Nama Alat</th>
                  <th className="pb-2.5">Jatuh Tempo</th>
                  <th className="pb-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentScales.length > 0 ? (
                  urgentScales.map((a) => {
                    const status = getUrgencyStatus(a.next);
                    return (
                      <tr
                        key={a.kode}
                        onClick={() => onOpenAlatDetail(a)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 font-mono font-bold text-teal-800">{a.kode}</td>
                        <td className="py-2.5 font-medium text-slate-800 max-w-[160px] truncate">
                          {a.nama}
                        </td>
                        <td className="py-2.5 text-slate-600">{formatDateIndo(a.next)}</td>
                        <td className="py-2.5 text-right">
                          {status && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                                status.variant === 'bad'
                                  ? 'bg-red-100 text-red-700'
                                  : status.variant === 'warn'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {status.label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      Tidak ada timbangan yang jatuh tempo dalam 60 hari ke depan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User / Department Distribution */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sebaran Alat per Pengguna</h3>
              <p className="text-xs text-slate-500">Distribusi lokasi penempatan alat timbang</p>
            </div>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {sortedUsers.map(([userName, count]) => {
              const widthPct = Math.round((count / maxUserCount) * 100);
              return (
                <div key={userName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-800">{userName}</span>
                    <span className="font-mono text-slate-600">{count} unit</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${widthPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
