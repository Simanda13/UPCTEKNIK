import React, { useState } from 'react';
import { X, Scale, AlertCircle } from 'lucide-react';
import { Alat } from '../types';

interface AlatFormModalProps {
  initialAlat?: Alat | null;
  existingCodes: string[];
  onSave: (alatData: Alat, oldKode?: string) => void;
  onClose: () => void;
}

export const AlatFormModal: React.FC<AlatFormModalProps> = ({
  initialAlat,
  existingCodes,
  onSave,
  onClose,
}) => {
  const isEditing = !!initialAlat;
  const [kode, setKode] = useState<string>(initialAlat?.kode || '');
  const [nama, setNama] = useState<string>(initialAlat?.nama || '');
  const [kap, setKap] = useState<string>(initialAlat?.kap || '');
  const [user, setUser] = useState<string>(initialAlat?.user || '');
  const [tempat, setTempat] = useState<string>(initialAlat?.tempat || '');
  const [last, setLast] = useState<string>(initialAlat?.last || '');
  const [next, setNext] = useState<string>(initialAlat?.next || '');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKode = kode.trim().toUpperCase();
    const cleanNama = nama.trim();
    const cleanKap = kap.trim();
    const cleanUser = user.trim();

    if (!cleanKode || !cleanNama || !cleanKap || !cleanUser) {
      setError('Mohon lengkapi Nama Alat, Kode/Nomor Alat, Kapasitas, dan Pengguna.');
      return;
    }

    // Check code duplication
    const duplicate = existingCodes.some(
      (c) => c.toLowerCase() === cleanKode.toLowerCase() && (!isEditing || c.toLowerCase() !== initialAlat?.kode.toLowerCase())
    );
    if (duplicate) {
      setError(`Kode alat "${cleanKode}" sudah digunakan. Gunakan kode unik.`);
      return;
    }

    onSave(
      {
        kode: cleanKode,
        nama: cleanNama,
        kap: cleanKap,
        user: cleanUser,
        tempat: tempat.trim() || 'Internal (Lab Metrologi)',
        last: last || undefined,
        next: next || undefined,
      },
      initialAlat?.kode
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Scale className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">
              {isEditing ? 'Edit Data Alat' : 'Tambah Alat Baru'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
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
              Nama Alat <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Timbangan Meja Produksi 1"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode / Nomor Alat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: AST-0141"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kapasitas <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 30 kg atau 210 g"
                value={kap}
                onChange={(e) => setKap(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pengguna / Bagian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Produksi / QC / Gudang"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Kalibrasi
              </label>
              <input
                type="text"
                placeholder="Contoh: UPT Metrologi Legal"
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kalibrasi Terakhir
              </label>
              <input
                type="date"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kalibrasi Berikutnya
              </label>
              <input
                type="date"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          {/* Action buttons */}
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
              {isEditing ? 'Simpan Perubahan' : 'Tambah Alat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
