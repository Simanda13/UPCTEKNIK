import React, { useRef, useState } from 'react';
import { X, Download, Upload, RefreshCw, FileSpreadsheet, Check, AlertTriangle, Database, Globe, ExternalLink } from 'lucide-react';
import { Alat, Jadwal, Periksa } from '../types';
import { getDefaultDataset } from '../services/storage';

interface BackupModalProps {
  alat: Alat[];
  jadwal: Jadwal[];
  periksa: Periksa[];
  onRestore: (data: { alat: Alat[]; jadwal: Jadwal[]; periksa: Periksa[] }) => void;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  alat,
  jadwal,
  periksa,
  onRestore,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const exportJSON = () => {
    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      alat,
      jadwal,
      periksa,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_kalibrasi_timbangan_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: 'ok', text: 'Backup JSON berhasil diunduh.' });
  };

  const exportAlatCSV = () => {
    const headers = ['Kode', 'Nama Alat', 'Kapasitas', 'Pengguna', 'Tempat Kalibrasi', 'Kalibrasi Terakhir', 'Kalibrasi Berikutnya'];
    const rows = alat.map((a) => [
      `"${a.kode}"`,
      `"${a.nama}"`,
      `"${a.kap}"`,
      `"${a.user}"`,
      `"${a.tempat || '-'}"`,
      `"${a.last || '-'}"`,
      `"${a.next || '-'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar_alat_timbangan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: 'ok', text: 'File CSV Daftar Alat berhasil diunduh.' });
  };

  const exportPeriksaCSV = () => {
    const headers = ['Tanggal', 'Kode Alat', 'Jenis', 'Toleransi (%)', 'Hasil Keseluruhan', 'Pemeriksa', 'Titik Uji Rincian'];
    const rows = periksa.map((p) => {
      const ptsDetail = p.pts
        .map((pt) => `Beban ${pt.beban} -> Baca ${pt.baca} (${pt.ok ? 'OK' : 'FAIL'})`)
        .join('; ');
      return [
        `"${p.tgl}"`,
        `"${p.kode}"`,
        `"${p.jenis}"`,
        `"${p.tol}"`,
        `"${p.ok ? 'Memenuhi' : 'Di Luar Toleransi'}"`,
        `"${p.nama}"`,
        `"${ptsDetail}"`,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat_pemeriksaan_timbangan_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ type: 'ok', text: 'File CSV Riwayat Pemeriksaan berhasil diunduh.' });
  };

  const exportStandaloneHTML = async () => {
    try {
      setMsg({ type: 'ok', text: 'Menyiapkan berkas HTML mandiri...' });
      const res = await fetch('/kalibrasi-timbangan.html');
      let htmlText = await res.text();

      // Embed the current data directly into the HTML's defaultDB
      const currentJson = JSON.stringify({ alat, jadwal, periksa });
      htmlText = htmlText.replace(
        /let S = JSON\.parse\(localStorage\.getItem\('kalibrasi_html_db'\) \|\| 'null'\) \|\| defaultDB;/,
        `let S = ${currentJson};\ntry{localStorage.setItem('kalibrasi_html_db', JSON.stringify(S));}catch(e){}`
      );

      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kalibrasi_timbangan_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: 'ok', text: 'Berkas HTML Mandiri siap pakai berhasil diunduh!' });
    } catch {
      setMsg({ type: 'err', text: 'Gagal mengunduh berkas HTML.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json.alat) && Array.isArray(json.jadwal) && Array.isArray(json.periksa)) {
          onRestore({
            alat: json.alat,
            jadwal: json.jadwal,
            periksa: json.periksa,
          });
          setMsg({ type: 'ok', text: `Data berhasil dipulihkan (${json.alat.length} alat, ${json.periksa.length} riwayat).` });
        } else {
          setMsg({ type: 'err', text: 'Format file backup tidak valid.' });
        }
      } catch {
        setMsg({ type: 'err', text: 'Gagal membaca file JSON.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefault = () => {
    if (window.confirm('Kembalikan ke data contoh bawaan? Seluruh perubahan saat ini akan diganti.')) {
      const def = getDefaultDataset();
      onRestore(def);
      setMsg({ type: 'ok', text: 'Data dikembalikan ke pengaturan contoh standar.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-800">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Kelola Data &amp; Cadangan (Backup)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {msg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                msg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {msg.type === 'ok' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
              <span>{msg.text}</span>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Seluruh data alat, jadwal, dan riwayat pengujian tersimpan secara otomatis pada penyimpanan browser Anda.
            Gunakan opsi di bawah ini untuk mengunduh arsip atau memindahkannya ke komputer lain.
          </p>

          {/* Standalone Single File HTML Section */}
          <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-700" />
                <span className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                  Berkas HTML Mandiri (Standalone 1-File)
                </span>
              </div>
              <a
                href="/kalibrasi-timbangan.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline"
              >
                <span>Buka Langsung</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Unduh berkas <b>.html</b> lengkap yang dapat dibuka di peramban (browser) laptop, flashdisk, atau smartphone mana pun secara offline tanpa perlu instalasi server. Data terbaru Anda akan otomatis disematkan ke dalam berkas.
            </p>
            <button
              onClick={exportStandaloneHTML}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Berkas HTML Siap Pakai (.html)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={exportJSON}
              className="p-3 border border-slate-200 hover:border-teal-600 hover:bg-teal-50/50 rounded-xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-800 group-hover:text-teal-900">
                  Unduh Backup JSON
                </span>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-teal-700" />
              </div>
              <span className="text-[11px] text-slate-500">
                Semua data alat, jadwal &amp; riwayat dalam satu berkas.
              </span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 border border-slate-200 hover:border-teal-600 hover:bg-teal-50/50 rounded-xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-800 group-hover:text-teal-900">
                  Pulihkan / Impor JSON
                </span>
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-teal-700" />
              </div>
              <span className="text-[11px] text-slate-500">
                Muat kembali file backup yang pernah diunduh.
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={exportAlatCSV}
              className="p-3 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-800 group-hover:text-emerald-900">
                  Ekspor Daftar Alat (CSV)
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </div>
              <span className="text-[11px] text-slate-500">
                Format tabel untuk Microsoft Excel / Google Sheets.
              </span>
            </button>

            <button
              onClick={exportPeriksaCSV}
              className="p-3 border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 rounded-xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-800 group-hover:text-emerald-900">
                  Ekspor Hasil Uji (CSV)
                </span>
                <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
              </div>
              <span className="text-[11px] text-slate-500">
                Log riwayat pemeriksaan untuk arsip metrologi.
              </span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset ke Data Contoh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
