import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, QrCode as QrIcon, Check, Copy } from 'lucide-react';
import { Alat } from '../types';
import { formatDateIndo } from '../services/storage';

interface QRLabelModalProps {
  alat: Alat;
  onClose: () => void;
}

export const QRLabelModal: React.FC<QRLabelModalProps> = ({ alat, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    // Generate QR with scale code
    QRCode.toDataURL(alat.kode, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0e2433',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [alat.kode]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(alat.kode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 text-slate-800">
            <QrIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-sm">Label Barcode / QR Timbangan</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sticker Card Body */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 mb-4 text-center print:hidden">
            Cetak stiker label ini dan tempelkan pada badan timbangan untuk kemudahan pemindaian via smartphone / tablet.
          </p>

          {/* Printable Label Sticker */}
          <div
            id="printable-certificate"
            className="w-72 border-2 border-slate-800 rounded-xl p-4 bg-white shadow-sm text-slate-900 flex flex-col items-center text-center"
          >
            <div className="w-full border-b border-slate-300 pb-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider uppercase text-teal-800">
                INSPEKSI &amp; METROLOGI
              </span>
              <span className="text-[9px] font-semibold text-slate-500">{alat.user}</span>
            </div>

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${alat.kode}`}
                className="w-36 h-36 object-contain my-1 border border-slate-100 rounded"
              />
            ) : (
              <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Membuat QR...
              </div>
            )}

            <div className="mt-2 w-full">
              <div className="text-base font-bold font-mono text-teal-900 tracking-wide">
                {alat.kode}
              </div>
              <div className="text-xs font-semibold text-slate-800 line-clamp-1 mt-0.5">
                {alat.nama}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Kapasitas: <span className="font-semibold">{alat.kap}</span>
              </div>
            </div>

            <div className="w-full mt-3 pt-2 border-t border-dashed border-slate-300 grid grid-cols-2 gap-1 text-[10px] text-left">
              <div>
                <span className="text-slate-400 block text-[9px]">Terakhir:</span>
                <span className="font-medium text-slate-700">{formatDateIndo(alat.last)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px]">Jatuh Tempo:</span>
                <span className="font-semibold text-amber-700">{formatDateIndo(alat.next)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50 print:hidden">
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin' : 'Salin Kode'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Label
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
