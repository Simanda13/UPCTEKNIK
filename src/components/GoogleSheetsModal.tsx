import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Upload,
  Download,
  AlertCircle,
  Unlink,
  Plus,
  Lock,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  createCalibrationSpreadsheet,
  fetchSpreadsheetData,
  pushAllDataToSpreadsheet,
  saveSpreadsheetId,
} from '../services/googleSheets';
import { Alat, Jadwal, Periksa } from '../types';

interface GoogleSheetsModalProps {
  user: User | null;
  accessToken: string | null;
  connectedSpreadsheetId: string | null;
  currentData: { alat: Alat[]; jadwal: Jadwal[]; periksa: Periksa[] };
  autoSync: boolean;
  onToggleAutoSync: (val: boolean) => void;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onConnectSpreadsheet: (id: string) => void;
  onDisconnectSpreadsheet: () => void;
  onDataLoadedFromSheets: (newData: {
    alat: Alat[];
    jadwal: Jadwal[];
    periksa: Periksa[];
  }) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  user,
  accessToken,
  connectedSpreadsheetId,
  currentData,
  autoSync,
  onToggleAutoSync,
  onLogin,
  onLogout,
  onConnectSpreadsheet,
  onDisconnectSpreadsheet,
  onDataLoadedFromSheets,
  onClose,
  showToast,
}) => {
  const [manualInput, setManualInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Extract pure spreadsheet ID if user pasted full URL
  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setError('Silakan masuk dengan akun Google terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const newId = await createCalibrationSpreadsheet(accessToken, currentData);
      onConnectSpreadsheet(newId);
      showToast('Spreadsheet baru berhasil dibuat dan terhubung ke Google Drive Anda!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membuat spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectManual = async () => {
    if (!accessToken) {
      setError('Silakan login dengan Google terlebih dahulu.');
      return;
    }
    const id = extractSpreadsheetId(manualInput);
    if (!id) {
      setError('Masukkan ID atau link Google Sheets yang valid.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Test fetching to ensure access
      const fetched = await fetchSpreadsheetData(accessToken, id);
      onConnectSpreadsheet(id);
      if (fetched.alat.length > 0 || fetched.jadwal.length > 0 || fetched.periksa.length > 0) {
        onDataLoadedFromSheets(fetched);
        showToast(`Terhubung ke Google Sheets (${fetched.alat.length} alat dimuat).`);
      } else {
        // If sheet is blank, push current data
        await pushAllDataToSpreadsheet(accessToken, id, currentData);
        showToast('Terhubung ke Google Sheets & data awal telah dikirimkan.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengakses spreadsheet. Pastikan izin akses telah dibuka.');
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromSheets = async () => {
    if (!accessToken || !connectedSpreadsheetId) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await fetchSpreadsheetData(accessToken, connectedSpreadsheetId);
      onDataLoadedFromSheets(fetched);
      showToast(
        `Berhasil menyinkronkan data dari Google Sheets (${fetched.alat.length} alat, ${fetched.jadwal.length} jadwal, ${fetched.periksa.length} riwayat).`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengambil data dari Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!accessToken || !connectedSpreadsheetId) return;
    setLoading(true);
    setError(null);
    try {
      await pushAllDataToSpreadsheet(accessToken, connectedSpreadsheetId, currentData);
      showToast('Seluruh data web berhasil dikirim dan disinkronkan ke Google Sheets!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim data ke Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const sheetUrl = connectedSpreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${connectedSpreadsheetId}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">
                Integrasi 2-Arah Google Sheets
              </h2>
              <span className="text-xs text-slate-500">
                Edit, tambah, atau hapus data melalui Google Sheets atau aplikasi web
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* User Sign-In Box */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            {user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {user.displayName || 'Akun Google'}
                    </div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
                  </span>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-300 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Masuk dengan Akun Google
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Diperlukan untuk membaca dan menyimpan data secara langsung ke Google Drive / Google Sheets Anda.
                  </div>
                </div>

                {/* Official Google Sign-In Styled Button */}
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={loading}
                  className="inline-flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Spreadsheet Connection Section */}
          {user && (
            <div className="space-y-4">
              {connectedSpreadsheetId ? (
                /* Already connected state */
                <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                          Spreadsheet Aktif Terhubung
                        </div>
                        <div className="font-mono text-xs text-emerald-800 truncate max-w-xs sm:max-w-md">
                          ID: {connectedSpreadsheetId}
                        </div>
                      </div>
                    </div>

                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <span>Buka di Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Sync Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handlePullFromSheets}
                      disabled={loading}
                      className="p-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-800 block">
                          Tarik Data dari Google Sheets
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Muat perubahan, baris baru, atau penghapusan dari Sheets ke Web
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={handlePushToSheets}
                      disabled={loading}
                      className="p-3 bg-white border border-emerald-300 hover:border-emerald-500 rounded-xl flex items-center justify-between text-left transition-all group cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-xs text-slate-800 block">
                          Kirim Data ke Google Sheets
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Tulis seluruh data web terbaru ke spreadsheet
                        </span>
                      </div>
                      <Upload className="w-4 h-4 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Auto Sync Toggle & Disconnect */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-200/80 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => onToggleAutoSync(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="font-medium text-slate-800">
                        Sinkronisasi otomatis saat ada penambahan / edit / hapus di web
                      </span>
                    </label>

                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            'Putuskan sambungan ke spreadsheet ini? Data di Google Sheets dan di web tetap aman tersimpan.'
                          )
                        ) {
                          onDisconnectSpreadsheet();
                        }
                      }}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 transition-colors self-start sm:self-auto"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan Hubungan</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Connect or Create New */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Opsi 1: Buat Spreadsheet Baru Otomatis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sistem akan membuat file spreadsheet baru berjudul{' '}
                      <b className="text-slate-700">"Kalibrasi &amp; Verifikasi Timbangan"</b>{' '}
                      lengkap dengan tab Daftar_Alat, Jadwal, dan Riwayat_Pemeriksaan di Google Drive Anda.
                    </p>
                    <button
                      onClick={handleCreateNewSheet}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {loading ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet Baru Otomatis'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Opsi 2: Hubungkan ke Spreadsheet yang Sudah Ada
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tempelkan URL atau Spreadsheet ID Google Sheets Anda:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5n... atau ID"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                      />
                      <button
                        onClick={handleConnectManual}
                        disabled={loading || !manualInput.trim()}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? 'Menghubungkan...' : 'Hubungkan'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* How 2-Way Sync Works Info */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Struktur Tab pada Google Sheets:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>
                    <b className="text-slate-800">Daftar_Alat</b>: Baris data timbangan (Kode Alat, Nama, Kapasitas, Pengguna, Tempat, Terakhir, Berikutnya).
                  </li>
                  <li>
                    <b className="text-slate-800">Jadwal</b>: Rencana kalibrasi/verifikasi (ID, Kode, Jenis, Tanggal, Selesai).
                  </li>
                  <li>
                    <b className="text-slate-800">Riwayat_Pemeriksaan</b>: Log hasil penimbangan titik uji (ID, Tanggal, Kode, Toleransi, Hasil, Titik Uji).
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500 pt-1">
                  💡 <i>Tip: Anda dapat menambahkan atau menghapus baris langsung di spreadsheet Google Sheets, kemudian klik tombol <b>Tarik Data</b> di aplikasi web untuk memperbarui tampilan secara instan.</i>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {connectedSpreadsheetId ? (
              <span className="text-emerald-700 font-medium">✓ Terhubung dengan Google Sheets</span>
            ) : (
              <span>Belum terhubung ke spreadsheet</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
