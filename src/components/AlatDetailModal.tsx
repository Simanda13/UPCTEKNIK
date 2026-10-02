import React from 'react';
import { X, Scale, Calendar, User, MapPin, QrCode, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Alat, Periksa } from '../types';
import { formatDateIndo, getUrgencyStatus } from '../services/storage';

interface AlatDetailModalProps {
  alat: Alat;
  history: Periksa[];
  onClose: () => void;
  onGoPeriksa: (kode: string) => void;
  onOpenLabel: (alat: Alat) => void;
  onViewCert: (periksa: Periksa) => void;
}

export const AlatDetailModal: React.FC<AlatDetailModalProps> = ({
  alat,
  history,
  onClose,
  onGoPeriksa,
  onOpenLabel,
  onViewCert,
}) => {
  const urgency = getUrgencyStatus(alat.next);
  const sortedHistory = [...history].sort((a, b) => b.tgl.localeCompare(a.tgl));
  const latestCheck = sortedHistory[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{alat.nama}</h2>
              <span className="font-mono text-xs font-semibold text-teal-800 tracking-wider">
                {alat.kode}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Kapasitas</span>
              <span className="font-bold text-slate-800 text-sm">{alat.kap}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Pengguna / Area</span>
              <span className="font-semibold text-slate-800 text-sm flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> {alat.user}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Tempat Kalibrasi</span>
              <span className="font-medium text-slate-700 line-clamp-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {alat.tempat || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Jatuh Tempo</span>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-900">{formatDateIndo(alat.next)}</span>
                {urgency && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      urgency.variant === 'bad'
                        ? 'bg-red-100 text-red-700'
                        : urgency.variant === 'warn'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {urgency.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Latest Status Banner */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  latestCheck
                    ? latestCheck.ok
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Pemeriksaan Terakhir:</span>
                <span className="text-sm font-semibold text-slate-800">
                  {latestCheck
                    ? `${formatDateIndo(latestCheck.tgl)} (${latestCheck.jenis}) - ${
                        latestCheck.ok ? 'Memenuhi Syarat' : 'Di Luar Toleransi'
                      }`
                    : 'Belum ada riwayat pemeriksaan tercatat'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenLabel(alat)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" /> Label QR
              </button>
            </div>
          </div>

          {/* Historical Inspections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Verifikasi &amp; Kalibrasi ({sortedHistory.length})
              </h3>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3">Titik Uji (Beban &rarr; Baca)</th>
                    <th className="p-3">Pemeriksa</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedHistory.length > 0 ? (
                    sortedHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                          {formatDateIndo(p.tgl)}
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{p.jenis}</td>
                        <td className="p-3">
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
                        <td className="p-3 text-slate-600">{p.nama}</td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              p.ok
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {p.ok ? 'Memenuhi' : 'Di luar'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => onViewCert(p)}
                            title="Lihat Lembar Sertifikat"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors"
                          >
                            <FileText className="w-3 h-3" /> Sertifikat
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        Belum ada riwayat pemeriksaan untuk alat ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onGoPeriksa(alat.kode);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
          >
            <span>Lakukan Pemeriksaan Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
