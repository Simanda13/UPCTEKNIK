import React, { useState } from 'react';
import { Plus, Check, Trash2, ArrowRight, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Alat, Jadwal } from '../types';
import { formatDateIndo, getDaysLeft, getUrgencyStatus, getIsoDate } from '../services/storage';

interface JadwalViewProps {
  jadwal: Jadwal[];
  alat: Alat[];
  onAddJadwal: () => void;
  onToggleSelesai: (id: number | string) => void;
  onDeleteJadwal: (id: number | string) => void;
  onGoPeriksa: (kode: string) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const JadwalView: React.FC<JadwalViewProps> = ({
  jadwal,
  alat,
  onAddJadwal,
  onToggleSelesai,
  onDeleteJadwal,
  onGoPeriksa,
}) => {
  const currentYearStr = String(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState<string>(currentYearStr);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const alatMap = new Map(alat.map((a) => [a.kode, a]));
  const todayIso = getIsoDate(0);

  // Available years from schedule
  const availableYears = Array.from(
    new Set([currentYearStr, ...jadwal.map((j) => j.tgl.slice(0, 4))])
  ).sort();

  const filteredJadwal = jadwal
    .filter((j) => {
      const jYear = j.tgl.slice(0, 4);
      const jMonth = j.tgl.slice(5, 7);

      const matchesYear = !yearFilter || jYear === yearFilter;
      const matchesMonth = !monthFilter || jMonth === monthFilter;

      let matchesStatus = true;
      if (statusFilter === 'done') matchesStatus = j.selesai;
      if (statusFilter === 'pending') matchesStatus = !j.selesai && j.tgl >= todayIso;
      if (statusFilter === 'overdue') matchesStatus = !j.selesai && j.tgl < todayIso;

      return matchesYear && matchesMonth && matchesStatus;
    })
    .sort((a, b) => a.tgl.localeCompare(b.tgl));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Jadwal Kalibrasi &amp; Verifikasi Internal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rencana penjadwalan periodik dan pemantauan status pelaksanaan inspeksi.
          </p>
        </div>
        <button
          onClick={onAddJadwal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Jadwal Baru
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter:</span>
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-700"
        >
          <option value="">Semua Tahun</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>
              Tahun {y}
            </option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-700"
        >
          <option value="">Semua Bulan</option>
          {MONTHS.map((m, idx) => (
            <option key={m} value={String(idx + 1).padStart(2, '0')}>
              Bulan {m}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-medium text-slate-700"
        >
          <option value="all">Semua Status</option>
          <option value="done">Sudah Selesai</option>
          <option value="pending">Belum / Menunggu</option>
          <option value="overdue">Terlambat</option>
        </select>

        <span className="text-slate-400 ml-auto font-mono">
          {filteredJadwal.length} jadwal ditampilkan
        </span>
      </div>

      {/* Jadwal Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Kode Alat</th>
                <th className="py-3 px-4">Nama Alat</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Jenis Kegiatan</th>
                <th className="py-3 px-4">Tanggal Rencana</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJadwal.length > 0 ? (
                filteredJadwal.map((j) => {
                  const alatInfo = alatMap.get(j.kode);
                  const isOverdue = !j.selesai && j.tgl < todayIso;
                  const days = getDaysLeft(j.tgl);

                  return (
                    <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {j.kode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {alatInfo?.nama || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {alatInfo?.user || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold text-xs ${
                            j.jenis === 'Kalibrasi' ? 'text-indigo-800' : 'text-teal-800'
                          }`}
                        >
                          {j.jenis}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-700">
                        {formatDateIndo(j.tgl)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {j.selesai ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Selesai
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            Lewat {-days} hari
                          </span>
                        ) : days <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            {days === 0 ? 'Hari Ini' : `${days} hari lagi`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            Terjadwal ({days} hari)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!j.selesai && (
                            <>
                              <button
                                onClick={() => onGoPeriksa(j.kode)}
                                title="Lakukan Pemeriksaan Sekarang"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded transition-colors"
                              >
                                Periksa <ArrowRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onToggleSelesai(j.id)}
                                title="Tandai Selesai Manual"
                                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onDeleteJadwal(j.id)}
                            title="Hapus Jadwal"
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada jadwal kalibrasi pada kriteria filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
