import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Alat } from '../types';

interface QRScannerModalProps {
  alatList: Alat[];
  onSelectCode: (code: string) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    BarcodeDetector?: any;
    jsQR?: any;
  }
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  alatList,
  onSelectCode,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(true);
  const [manualCode, setManualCode] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const matchTool = (rawText: string): Alat | undefined => {
    const trimmed = rawText.trim();
    return (
      alatList.find((a) => a.kode.toLowerCase() === trimmed.toLowerCase()) ||
      alatList.find((a) => trimmed.toLowerCase().includes(a.kode.toLowerCase()))
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Setup detector
        let detector: any = null;
        if ('BarcodeDetector' in window) {
          try {
            detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          } catch {
            detector = null;
          }
        }

        // Load jsQR script fallback if needed
        if (!detector && !window.jsQR) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
          script.async = true;
          document.head.appendChild(script);
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const scanFrame = async () => {
          if (!isMounted || !videoRef.current || !scanning) return;
          const video = videoRef.current;

          if (video.readyState >= 2 && video.videoWidth > 0) {
            let detectedText = '';
            try {
              if (detector) {
                const barcodes = await detector.detect(video);
                if (barcodes && barcodes.length > 0) {
                  detectedText = barcodes[0].rawValue;
                }
              } else if (window.jsQR && ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = window.jsQR(imageData.data, imageData.width, imageData.height);
                if (qr) {
                  detectedText = qr.data;
                }
              }
            } catch {
              // ignore frame capture error
            }

            if (detectedText) {
              const matched = matchTool(detectedText);
              if (matched) {
                onSelectCode(matched.kode);
                onClose();
                return;
              } else {
                setErrorMsg(`QR "${detectedText}" tidak terdaftar dalam database alat.`);
              }
            }
          }

          animFrameRef.current = window.setTimeout(scanFrame, 250);
        };

        scanFrame();
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setErrorMsg('Kamera tidak dapat diakses atau izin ditolak. Silakan masukkan kode manual di bawah.');
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (animFrameRef.current) clearTimeout(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [alatList, scanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const found = matchTool(manualCode);
    if (found) {
      onSelectCode(found.kode);
      onClose();
    } else {
      setErrorMsg(`Kode alat "${manualCode}" tidak ditemukan.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Camera className="w-5 h-5 text-teal-700" />
            <h3 className="font-semibold text-sm">Pindai QR Code Timbangan</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-[280px] bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Reticle Overlay */}
            <div className="absolute inset-8 border-2 border-amber-400/80 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-amber-400 -mt-2 -ml-2"></span>
                <span className="w-4 h-4 border-t-2 border-r-2 border-amber-400 -mt-2 -mr-2"></span>
              </div>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-amber-400 -mb-2 -ml-2"></span>
                <span className="w-4 h-4 border-b-2 border-r-2 border-amber-400 -mb-2 -mr-2"></span>
              </div>
            </div>
            <div className="absolute bottom-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[11px] text-white/90">
              Arahkan ke QR pada timbangan
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 w-full flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Select from list or Manual input */}
          <div className="w-full mt-4 pt-4 border-t border-slate-200 space-y-3">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Atau ketik kode (misal AST-0141)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold"
              >
                Pilih
              </button>
            </form>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Pilih Cepat Alat:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {alatList.map((a) => (
                  <button
                    key={a.kode}
                    onClick={() => {
                      onSelectCode(a.kode);
                      onClose();
                    }}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-mono font-medium transition-colors"
                  >
                    {a.kode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
