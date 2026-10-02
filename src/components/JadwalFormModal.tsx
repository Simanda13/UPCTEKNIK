import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Alat, Jadwal } from '../types';
import { getIsoDate } from '../services/storage';

interface JadwalFormModalProps {
  alatList: Alat[];
  onSave: (jadwal: Omit<Jadwal, 'id'>) => void;
  onClose: () => void;
}

export const JadwalFormModal: React.FC<JadwalFormModalProps> = ({
  alatList,
  onSave,
  onClose,
}) => {
  const [kode, setKode] = useState<string>(alatList[0]?.kode || '');
  const [jenis, setJenis] = useState<'Kalibrasi' | 'Verifikasi'>('Verifikasi');
  const [tgl, setTgl] = useState<string>(getIsoDate(7));
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kode) {
      setError('Pilih alat ukur terlebih dahulu.');
      return;
    }
    if (!tgl) {
      setError('Tentukan tanggal pelaksanaan rencana.');
      return;
    }

    onSave({
      kode,
      jenis,
      tgl,
      selesai: false,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Tambah Jadwal Baru</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Timbangan / Alat
            </label>
            <select
              value={kode}
              onChange={(e) => setKode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white"
            >
              {alatList.map((a) => (
                <option key={a.kode} value={a.kode}>
                  [{a.kode}] {a.nama} ({a.user})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kegiatan
              </label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as 'Kalibrasi' | 'Verifikasi')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 bg-white"
              >
                <option value="Verifikasi">Verifikasi Internal</option>
                <option value="Kalibrasi">Kalibrasi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rencana Tanggal
              </label>
              <input
                type="date"
                required
                value={tgl}
                onChange={(e) => setTgl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Kalibrasi berkala sebelum audit ISO"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
            >
              Simpan Jadwal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
