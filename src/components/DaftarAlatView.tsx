import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, QrCode, ArrowUpDown, Filter, Eye } from 'lucide-react';
import { Alat } from '../types';
import { formatDateIndo, getUrgencyStatus } from '../services/storage';

interface DaftarAlatViewProps {
  alat: Alat[];
  onAddAlat: () => void;
  onEditAlat: (alat: Alat) => void;
  onDeleteAlat: (alat: Alat) => void;
  onSelectAlat: (alat: Alat) => void;
  onPrintLabel: (alat: Alat) => void;
}

export const DaftarAlatView: React.FC<DaftarAlatViewProps> = ({
  alat,
  onAddAlat,
  onEditAlat,
  onDeleteAlat,
  onSelectAlat,
  onPrintLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');

  const users = Array.from(new Set(alat.map((a) => a.user))).filter(Boolean);

  const filtered = alat.filter((a) => {
    const matchesSearch =
      (a.kode + ' ' + a.nama + ' ' + a.user + ' ' + (a.tempat || '')).toLowerCase().includes(
        searchTerm.toLowerCase()
      );
    const matchesUser = !userFilter || a.user === userFilter;
    return matchesSearch && matchesUser;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Daftar Alat Inspeksi dan Ukur
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola inventaris timbangan industri, kapasitas, lokasi, dan siklus kalibrasi legal/internal.
          </p>
        </div>
        <button
          onClick={onAddAlat}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Alat Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari kode, nama alat, lokasi, atau tempat kalibrasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Bagian:</span>
          </div>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 text-slate-700"
          >
            <option value="">Semua Pengguna</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Alat</th>
                <th className="py-3 px-4">Kode Alat</th>
                <th className="py-3 px-4">Kapasitas</th>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Tempat Kalibrasi</th>
                <th className="py-3 px-4">Terakhir</th>
                <th className="py-3 px-4">Berikutnya</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((a, idx) => {
                  const status = getUrgencyStatus(a.next);
                  return (
                    <tr
                      key={a.kode}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectAlat(a)}
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 group-hover:text-teal-900">
                        {a.nama}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                        {a.kode}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {a.kap}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {a.user}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {a.tempat || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-mono text-xs">
                        {formatDateIndo(a.last)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-900">
                            {formatDateIndo(a.next)}
                          </span>
                          {status && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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
                        </div>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onPrintLabel(a)}
                            title="Cetak Label QR"
                            className="p-1.5 text-slate-500 hover:text-teal-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditAlat(a)}
                            title="Edit Data Alat"
                            className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteAlat(a)}
                            title="Hapus Alat"
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data alat yang sesuai dengan pencarian.
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
