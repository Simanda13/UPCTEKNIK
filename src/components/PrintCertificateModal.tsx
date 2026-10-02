import React from 'react';
import { Printer, X, CheckCircle2, AlertTriangle, ShieldCheck, Scale } from 'lucide-react';
import { Alat, Periksa } from '../types';
import { formatDateIndo } from '../services/storage';

interface PrintCertificateModalProps {
  periksa: Periksa;
  alat?: Alat;
  onClose: () => void;
}

export const PrintCertificateModal: React.FC<PrintCertificateModalProps> = ({
  periksa,
  alat,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const pts = periksa.pts || [];
  const reportNumber = `CERT-MET-${String(periksa.id).replace(/[^0-9a-zA-Z]/g, '').slice(-6).toUpperCase()}-${new Date(periksa.tgl).getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[92vh]">
        {/* Modal Header Actions (Screen Only) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <Scale className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-base">Lembar Sertifikat / Laporan Verifikasi</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Document Body */}
        <div className="overflow-y-auto p-6 md:p-10 text-slate-800 space-y-6" id="printable-certificate">
          {/* Document Letterhead */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-500 flex items-center justify-center text-slate-900 font-bold shrink-0">
                  <Scale className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase">
                    UPT Metrologi &amp; Penjaminan Mutu (QA/QC)
                  </h1>
                  <p className="text-xs text-slate-600">
                    Sistem Manajemen Mutu Peralatan Inspeksi &amp; Alat Ukur Internal
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Laboratorium Pengujian Kalibrasi dan Verifikasi Timbangan
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 text-xs font-mono font-semibold uppercase bg-slate-100 rounded border border-slate-200 text-slate-800">
                  {periksa.jenis === 'Kalibrasi' ? 'SERTIFIKAT KALIBRASI' : 'LEMBAR HASIL VERIFIKASI'}
                </div>
                <p className="text-xs font-mono text-slate-600 mt-1">No: {reportNumber}</p>
              </div>
            </div>
          </div>

          {/* Identification Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Nama Alat</span>
              <span className="font-semibold text-slate-900 text-base">{alat?.nama || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Nomor / Kode Inventaris</span>
              <span className="font-mono font-bold text-teal-800 text-base">{periksa.kode}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Kapasitas Maksimum</span>
              <span className="font-medium text-slate-800">{alat?.kap || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Lokasi / Pengguna</span>
              <span className="font-medium text-slate-800">{alat?.user || '-'}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Tanggal Pelaksanaan</span>
              <span className="font-medium text-slate-800">{formatDateIndo(periksa.tgl)}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Jatuh Tempo Berikutnya</span>
              <span className="font-medium text-slate-800">{formatDateIndo(alat?.next)}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Pemeriksa / Operator</span>
              <span className="font-medium text-slate-800">{periksa.nama}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase block">Toleransi Maksimum (MPE)</span>
              <span className="font-medium text-slate-800">&plusmn;{periksa.tol}% dari beban nominal</span>
            </div>
          </div>

          {/* Test Results Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Hasil Pengujian Titik Beban Standar
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                    <th className="p-2.5 text-center w-12">No</th>
                    <th className="p-2.5">Beban Standar (L)</th>
                    <th className="p-2.5">Penunjukan Alat (I)</th>
                    <th className="p-2.5">Penyimpangan (E = I - L)</th>
                    <th className="p-2.5">Batas Toleransi (&plusmn;)</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono-tabular">
                  {pts.map((pt, idx) => {
                    const diff = pt.baca - pt.beban;
                    const limit = (pt.beban * periksa.tol) / 100;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-center text-slate-500 font-sans">{idx + 1}</td>
                        <td className="p-2.5 font-medium">{pt.beban} {periksa.sat}</td>
                        <td className="p-2.5 font-medium">{pt.baca} {periksa.sat}</td>
                        <td className="p-2.5">
                          <span className={diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-amber-700' : 'text-blue-700'}>
                            {diff > 0 ? `+${diff.toFixed(4)}` : diff.toFixed(4)} {periksa.sat}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">&plusmn;{limit.toFixed(4)} {periksa.sat}</td>
                        <td className="p-2.5 text-center font-sans">
                          {pt.ok ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Memenuhi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> Di Luar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statement & Conclusion */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-4">
            <div className={`p-2.5 rounded-lg shrink-0 ${periksa.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Kesimpulan Verifikasi:</span>
                <span className={`font-bold text-sm ${periksa.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                  {periksa.ok ? 'LAIK PAKAI (MEMENUHI SPESIFIKASI TOLERANSI)' : 'TIDAK MEMENUHI PERSYARATAN (PERLU KALIBRASI ULANG / ADJUSTMENT)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {periksa.catatan || (periksa.ok
                  ? 'Seluruh titik uji berada di dalam rentang batas kesalahan yang diizinkan (Maximum Permissible Error). Timbangan aman untuk digunakan dalam proses operasional.'
                  : 'Ditemukan titik uji di luar ambang toleransi standar. Disarankan melakukan penyesuaian level, tara ulang, atau kalibrasi eksternal berizin.')}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="flex flex-col items-center">
              <span className="text-slate-500">Pemeriksa / Teknisi Kalibrasi,</span>
              <div className="h-20 flex items-end justify-center">
                <div className="border-b border-slate-400 w-44 pb-1 font-semibold text-slate-900">
                  {periksa.nama}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">Metrologi QA / QC Dept.</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-slate-500">Mengetahui, Penanggung Jawab Teknis</span>
              <div className="h-20 flex items-end justify-center">
                <div className="border-b border-slate-400 w-44 pb-1 font-semibold text-slate-900">
                  ( ......................................... )
                </div>
              </div>
              <span className="text-[11px] text-slate-500 mt-1">Kepala Bagian / Supervisor Lab</span>
            </div>
          </div>

          {/* Document Footer */}
          <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Dokumen ini dihasilkan secara otomatis oleh Sistem Kalibrasi &amp; Verifikasi Timbangan Internal pada {formatDateIndo(new Date().toISOString().slice(0, 10))}.
          </div>
        </div>
      </div>
    </div>
  );
};
