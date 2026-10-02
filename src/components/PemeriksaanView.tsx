import React, { useState, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Printer,
  Edit2,
  FileText,
  RotateCcw,
  CheckSquare,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Alat, Periksa, TitikUji } from '../types';
import {
  parseCapacity,
  getSuggestedWeights,
  formatDateIndo,
  getIsoDate,
} from '../services/storage';

interface TestRowItem {
  beban: string | number;
  baca: string;
  isManual: boolean;
}

interface PemeriksaanViewProps {
  alat: Alat[];
  periksaList: Periksa[];
  initialSelectedCode?: string;
  onSavePeriksa: (data: {
    id?: number | string;
    kode: string;
    jenis: 'Kalibrasi' | 'Verifikasi';
    sat: 'kg' | 'g' | 'mg';
    pts: TitikUji[];
    tol: number;
    ok: boolean;
    nama: string;
    catatan?: string;
  }) => void;
  onDeletePeriksa: (id: number | string) => void;
  onOpenQRScanner: () => void;
  onViewCertificate: (periksa: Periksa, alat?: Alat) => void;
}

export const PemeriksaanView: React.FC<PemeriksaanViewProps> = ({
  alat,
  periksaList,
  initialSelectedCode = '',
  onSavePeriksa,
  onDeletePeriksa,
  onOpenQRScanner,
  onViewCertificate,
}) => {
  const [selectedKode, setSelectedKode] = useState<string>(initialSelectedCode);
  const [jenis, setJenis] = useState<'Kalibrasi' | 'Verifikasi'>('Verifikasi');
  const [toleransi, setToleransi] = useState<number>(0.1);
  const [pemeriksa, setPemeriksa] = useState<string>('Teknisi Metrologi QA');
  const [catatan, setCatatan] = useState<string>('');

  // Checklist
  const [checkClean, setCheckClean] = useState<boolean>(true);
  const [checkLevel, setCheckLevel] = useState<boolean>(true);
  const [checkZero, setCheckZero] = useState<boolean>(true);

  // Test rows
  const [rows, setRows] = useState<TestRowItem[]>([]);
  const [editingPeriksaId, setEditingPeriksaId] = useState<number | string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const selectedAlat = alat.find(
    (a) => a.kode.toLowerCase() === selectedKode.trim().toLowerCase()
  );

  const parsedCap = selectedAlat ? parseCapacity(selectedAlat.kap) : { value: 0, unit: 'kg' as const };
  const unit = parsedCap.unit;
  const suggestedWeights = selectedAlat ? getSuggestedWeights(selectedAlat.kap) : [];

  // When initialSelectedCode prop changes
  useEffect(() => {
    if (initialSelectedCode) {
      setSelectedKode(initialSelectedCode);
    }
  }, [initialSelectedCode]);

  // When selected tool changes and we are not editing
  useEffect(() => {
    if (selectedAlat && !editingPeriksaId) {
      // Setup default weight points (first 2-3 weights)
      const initialWeights = suggestedWeights.slice(0, 3);
      if (initialWeights.length > 0) {
        setRows(
          initialWeights.map((w) => ({
            beban: w,
            baca: '',
            isManual: false,
          }))
        );
      } else {
        setRows([{ beban: '', baca: '', isManual: true }]);
      }
    }
  }, [selectedAlat?.kode, editingPeriksaId]);

  // Handle suggested weight chips toggle
  const handleToggleWeightChip = (w: number) => {
    const exists = rows.some((r) => !r.isManual && Number(r.beban) === w);
    if (exists) {
      setRows(rows.filter((r) => r.isManual || Number(r.beban) !== w));
    } else {
      setRows([
        ...rows,
        {
          beban: w,
          baca: '',
          isManual: false,
        },
      ]);
    }
  };

  const handleAddManualRow = () => {
    setRows([...rows, { beban: '', baca: '', isManual: true }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const handleUpdateRowValue = (index: number, field: 'beban' | 'baca', val: string) => {
    setRows((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: val } : item))
    );
  };

  // Calculate live results
  const calculatedPoints: {
    beban: number;
    baca: number;
    selisih: number;
    batas: number;
    ok: boolean;
    valid: boolean;
  }[] = rows.map((r) => {
    const b = typeof r.beban === 'number' ? r.beban : parseFloat(r.beban);
    const c = parseFloat(r.baca);
    if (isNaN(b) || isNaN(c) || isNaN(toleransi) || b <= 0) {
      return { beban: 0, baca: 0, selisih: 0, batas: 0, ok: false, valid: false };
    }
    const selisih = c - b;
    const batas = (b * toleransi) / 100;
    const ok = Math.abs(selisih) <= batas + 1e-9;
    return { beban: b, baca: c, selisih, batas, ok, valid: true };
  });

  const validPoints = calculatedPoints.filter((p) => p.valid);
  const allPointsFilled = rows.length > 0 && rows.every((r) => r.baca !== '' && r.beban !== '');
  const isOverallPass = validPoints.length > 0 && validPoints.every((p) => p.ok);
  const failCount = validPoints.filter((p) => !p.ok).length;

  const handleSave = () => {
    if (!selectedAlat) {
      setNotification('Pilih timbangan terlebih dahulu.');
      return;
    }
    if (validPoints.length === 0) {
      setNotification('Masukkan minimal satu titik beban uji dan hasil pembacaan.');
      return;
    }
    if (!allPointsFilled) {
      setNotification('Lengkapi seluruh pembacaan beban, atau hapus baris yang tidak digunakan.');
      return;
    }
    if (!pemeriksa.trim()) {
      setNotification('Masukkan nama pemeriksa / teknisi.');
      return;
    }

    const pts: TitikUji[] = validPoints.map((p) => ({
      beban: p.beban,
      baca: p.baca,
      ok: p.ok,
    }));

    onSavePeriksa({
      id: editingPeriksaId || undefined,
      kode: selectedAlat.kode,
      jenis,
      sat: unit,
      pts,
      tol: toleransi,
      ok: isOverallPass,
      nama: pemeriksa.trim(),
      catatan: catatan.trim() || undefined,
    });

    setNotification(
      editingPeriksaId
        ? 'Perubahan data pemeriksaan berhasil diperbarui.'
        : `Hasil pemeriksaan ${selectedAlat.kode} berhasil disimpan & jadwal diperbarui!`
    );

    // Reset form
    setEditingPeriksaId(null);
    setSelectedKode('');
    setRows([]);
    setCatatan('');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleEditHistoryItem = (p: Periksa) => {
    setEditingPeriksaId(p.id);
    setSelectedKode(p.kode);
    setJenis(p.jenis);
    setToleransi(p.tol);
    setPemeriksa(p.nama);
    setCatatan(p.catatan || '');
    setRows(
      p.pts.map((pt) => ({
        beban: pt.beban,
        baca: String(pt.baca),
        isManual: true,
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNotification(`Mengedit catatan pemeriksaan ID: ${p.id}`);
  };

  const handleCancelEdit = () => {
    setEditingPeriksaId(null);
    setSelectedKode('');
    setRows([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Pemeriksaan &amp; Verifikasi Timbangan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Input pembacaan beban standar, hitung galat toleransi MPE otomatis, dan simpan lembar kerja.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl text-xs font-semibold text-teal-900 flex items-center justify-between">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-teal-700 hover:text-teal-950 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Testing Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Scale Picker and QR Scan */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Pilih atau Scan Timbangan
          </label>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <input
                type="text"
                list="kodeTimbanganList"
                placeholder="Ketik kode atau nama alat (contoh: AST-0141)..."
                value={selectedKode}
                onChange={(e) => setSelectedKode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
              />
              <datalist id="kodeTimbanganList">
                {alat.map((a) => (
                  <option key={a.kode} value={a.kode}>
                    {a.kode} - {a.nama} ({a.user})
                  </option>
                ))}
              </datalist>
            </div>
            <button
              onClick={onOpenQRScanner}
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-teal-800" />
              Pindai QR Kamera
            </button>
          </div>

          {/* Active Scale Info Banner */}
          {selectedAlat ? (
            <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <div>
                  <span className="font-bold font-mono text-teal-900 text-sm">
                    {selectedAlat.kode}
                  </span>
                  <span className="text-slate-700 font-semibold ml-2">
                    {selectedAlat.nama}
                  </span>
                </div>
              </div>
              <div className="text-slate-600">
                Kapasitas: <b className="text-slate-800">{selectedAlat.kap}</b> · Pengguna:{' '}
                <b className="text-slate-800">{selectedAlat.user}</b> · Lokasi:{' '}
                <span>{selectedAlat.tempat || '-'}</span>
              </div>
            </div>
          ) : selectedKode.trim() ? (
            <div className="mt-2 text-xs text-amber-700">
              Kode "{selectedKode}" belum terdaftar di Daftar Alat. Silakan pilih dari rekomendasi atau tambahkan alat baru.
            </div>
          ) : null}
        </div>

        {selectedAlat && (
          <>
            {/* Parameters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kegiatan
                </label>
                <select
                  value={jenis}
                  onChange={(e) => setJenis(e.target.value as 'Kalibrasi' | 'Verifikasi')}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                >
                  <option value="Verifikasi">Verifikasi Internal</option>
                  <option value="Kalibrasi">Kalibrasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Toleransi / MPE (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={toleransi}
                  onChange={(e) => setToleransi(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Standar verifikasi berkala internal: 0.1% (atau 0.05% untuk lab)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Teknisi / Pemeriksa
                </label>
                <input
                  type="text"
                  placeholder="Nama petugas"
                  value={pemeriksa}
                  onChange={(e) => setPemeriksa(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>

            {/* Checklist Before Weighing */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Pemeriksaan Kondisi Fisik &amp; Lingkungan
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checkClean}
                    onChange={(e) => setCheckClean(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-700"
                  />
                  <span className="text-slate-700">Area timbangan bersih &amp; bebas debu</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checkLevel}
                    onChange={(e) => setCheckLevel(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-700"
                  />
                  <span className="text-slate-700">Level waterpass rata dan stabil</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={checkZero}
                    onChange={(e) => setCheckZero(e.target.checked)}
                    className="w-4 h-4 text-teal-700 rounded focus:ring-teal-700"
                  />
                  <span className="text-slate-700">Tampilan nol saat kosong (tare/zero)</span>
                </label>
              </div>
            </div>

            {/* Suggested Weight Chips */}
            {suggestedWeights.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Beban Standar Direkomendasikan ({selectedAlat.kap})
                  </h4>
                  <span className="text-[11px] text-slate-500">Klik chip untuk tambah/hapus titik uji</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedWeights.map((w) => {
                    const isChecked = rows.some((r) => !r.isManual && Number(r.beban) === w);
                    return (
                      <button
                        type="button"
                        key={w}
                        onClick={() => handleToggleWeightChip(w)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                          isChecked
                            ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-teal-600'
                        }`}
                      >
                        {isChecked && '✓ '}
                        {w} {unit}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Points Table */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Data Pengujian Beban Standar (Titik Uji)
                </h4>
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-950"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Beban Manual
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Beban Standar (L)</th>
                        <th className="py-2.5 px-3">Pembacaan Alat (I)</th>
                        <th className="py-2.5 px-3">Selisih (E)</th>
                        <th className="py-2.5 px-3">Batas Toleransi (MPE)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono-tabular">
                      {rows.length > 0 ? (
                        rows.map((row, idx) => {
                          const res = calculatedPoints[idx];
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 whitespace-nowrap">
                                {row.isManual ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      placeholder="Beban"
                                      value={row.beban}
                                      onChange={(e) =>
                                        handleUpdateRowValue(idx, 'beban', e.target.value)
                                      }
                                      className="w-24 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-700"
                                    />
                                    <span className="text-slate-500 font-sans">{unit}</span>
                                  </div>
                                ) : (
                                  <span className="font-bold text-slate-800">
                                    {row.beban} <span className="font-sans font-normal text-slate-500">{unit}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="Hasil baca"
                                    value={row.baca}
                                    onChange={(e) =>
                                      handleUpdateRowValue(idx, 'baca', e.target.value)
                                    }
                                    className="w-28 px-2 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-teal-700 bg-white"
                                  />
                                  <span className="text-slate-500 font-sans">{unit}</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {res?.valid ? (
                                  <span
                                    className={`font-semibold ${
                                      res.selisih === 0
                                        ? 'text-slate-600'
                                        : res.selisih > 0
                                        ? 'text-amber-700'
                                        : 'text-blue-700'
                                    }`}
                                  >
                                    {res.selisih > 0 ? `+${res.selisih.toFixed(4)}` : res.selisih.toFixed(4)}{' '}
                                    <span className="font-normal font-sans text-slate-400">{unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                                {res?.valid ? (
                                  <span>
                                    &plusmn;{res.batas.toFixed(4)}{' '}
                                    <span className="font-normal font-sans text-slate-400">{unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap font-sans">
                                {res?.valid ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                      res.ok
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {res.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {res.ok ? 'Memenuhi' : 'Di luar'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Menunggu input</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {row.isManual && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRow(idx)}
                                    className="p-1 text-slate-400 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            Pilih beban standar di atas atau klik Tambah Beban Manual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Live Evaluation Banner */}
            {validPoints.length > 0 && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isOverallPass
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isOverallPass ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-sm block">
                      {isOverallPass
                        ? `MEMENUHI SYARAT (Semua ${validPoints.length} titik uji berada dalam toleransi \u00B1${toleransi}%)`
                        : `DI LUAR AMBANG BATAS (${failCount} dari ${validPoints.length} titik uji melebihi toleransi \u00B1${toleransi}%)`}
                    </span>
                    <span className="text-xs opacity-80">
                      {isOverallPass
                        ? 'Alat timbang laik digunakan untuk transaksi dan proses produksi.'
                        : 'Disarankan dilakukan pembersihan loadcell, kalibrasi ulang atau penyesuaian teknis.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Pemeriksaan Tambahan (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Kondisi fisik baik, pelat timbang telah dibersihkan."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>

            {/* Submit Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              {editingPeriksaId ? (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  Batal Edit
                </button>
              ) : (
                <span className="text-xs text-slate-400">
                  Jadwal alat ini akan otomatis diperbarui dan dijadwalkan ulang 1 tahun ke depan.
                </span>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {editingPeriksaId ? 'Simpan Perubahan Hasil' : 'Simpan Hasil Pemeriksaan'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Historical Inspection Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Riwayat Verifikasi &amp; Kalibrasi Tersimpan ({periksaList.length})
          </h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nama Alat</th>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Kapasitas</th>
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Jenis</th>
                  <th className="py-3 px-4">Titik Uji (Beban &rarr; Baca)</th>
                  <th className="py-3 px-4 text-center">Hasil</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periksaList.length > 0 ? (
                  periksaList.map((p) => {
                    const tool = alat.find((a) => a.kode === p.kode);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs whitespace-nowrap text-slate-700">
                          {formatDateIndo(p.tgl)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {tool?.nama || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-teal-800">
                          {p.kode}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {tool?.kap || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {tool?.user || '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 text-xs">
                          {p.jenis}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 font-mono text-[11px]">
                            {p.pts.map((pt, i) => {
                              const diff = pt.baca - pt.beban;
                              return (
                                <div key={i} className="text-slate-600 whitespace-nowrap">
                                  {pt.beban} &rarr; {pt.baca} {p.sat} ({diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)})
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                              p.ok
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {p.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {p.ok ? 'Memenuhi' : 'Di luar'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onViewCertificate(p, tool)}
                              title="Lihat / Cetak Lembar Sertifikat"
                              className="p-1.5 text-teal-800 hover:bg-teal-50 rounded transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditHistoryItem(p)}
                              title="Edit Catatan Pemeriksaan"
                              className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Hapus riwayat pemeriksaan ini?')) {
                                  onDeletePeriksa(p.id);
                                }
                              }}
                              title="Hapus"
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
                      Belum ada riwayat pemeriksaan tersimpan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
