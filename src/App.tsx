/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Scale,
  Calendar,
  ClipboardCheck,
  Database,
  Menu,
  X,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Alat, Jadwal, Periksa, ViewType } from './types';
import {
  loadStoredData,
  saveStoredData,
  getIsoDate,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from './services/googleAuth';
import {
  getSavedSpreadsheetId,
  saveSpreadsheetId,
  fetchSpreadsheetData,
  pushAllDataToSpreadsheet,
} from './services/googleSheets';
import { DashboardView } from './components/DashboardView';
import { DaftarAlatView } from './components/DaftarAlatView';
import { JadwalView } from './components/JadwalView';
import { PemeriksaanView } from './components/PemeriksaanView';
import { PrintCertificateModal } from './components/PrintCertificateModal';
import { QRLabelModal } from './components/QRLabelModal';
import { QRScannerModal } from './components/QRScannerModal';
import { AlatDetailModal } from './components/AlatDetailModal';
import { AlatFormModal } from './components/AlatFormModal';
import { JadwalFormModal } from './components/JadwalFormModal';
import { BackupModal } from './components/BackupModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';

export default function App() {
  const [data, setData] = useState<{
    alat: Alat[];
    jadwal: Jadwal[];
    periksa: Periksa[];
  }>(( ) => loadStoredData());

  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Cross-view state (e.g. jumping to periksa with preselected tool)
  const [selectedInspectCode, setSelectedInspectCode] = useState<string>('');

  // Modals state
  const [activeAlatDetail, setActiveAlatDetail] = useState<Alat | null>(null);
  const [activeLabelAlat, setActiveLabelAlat] = useState<Alat | null>(null);
  const [certPeriksa, setCertPeriksa] = useState<{ periksa: Periksa; alat?: Alat } | null>(null);
  const [isAlatFormOpen, setIsAlatFormOpen] = useState<boolean>(false);
  const [editingAlat, setEditingAlat] = useState<Alat | null>(null);
  const [isJadwalFormOpen, setIsJadwalFormOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Google Sheets & Auth State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [connectedSpreadsheetId, setConnectedSpreadsheetId] = useState<string | null>(() =>
    getSavedSpreadsheetId()
  );
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Ref to track latest data for sync avoiding closure staleness
  const dataRef = useRef(data);
  dataRef.current = data;

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setAccessToken(token);
      },
      () => {
        setAuthUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveStoredData(data.alat, data.jadwal, data.periksa);
  }, [data]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Google Sign In handler
  const handleGoogleLogin = async () => {
    try {
      const res = await googleSignIn();
      setAuthUser(res.user);
      setAccessToken(res.accessToken);
      showToast(`Berhasil masuk sebagai ${res.user.displayName || res.user.email}`);

      // If already connected to a spreadsheet, auto pull on login
      if (connectedSpreadsheetId) {
        try {
          setIsSyncing(true);
          const fetched = await fetchSpreadsheetData(res.accessToken, connectedSpreadsheetId);
          setData(fetched);
          showToast(`Data disinkronkan dengan Google Sheets (${fetched.alat.length} alat).`);
        } catch (e: any) {
          console.warn('Sync on login warning:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal login dengan akun Google.');
    }
  };

  // Google Sign Out handler
  const handleGoogleLogout = async () => {
    await googleSignOut();
    setAuthUser(null);
    setAccessToken(null);
    showToast('Telah keluar dari akun Google.');
  };

  // Connect or disconnect spreadsheet
  const handleConnectSpreadsheet = (id: string) => {
    setConnectedSpreadsheetId(id);
    saveSpreadsheetId(id);
  };

  const handleDisconnectSpreadsheet = () => {
    setConnectedSpreadsheetId(null);
    saveSpreadsheetId(null);
    showToast('Sambungan Google Sheets diputuskan.');
  };

  // Quick bidirectional sync helper
  const handleQuickSync = async () => {
    if (!accessToken) {
      setIsSheetsModalOpen(true);
      return;
    }
    if (!connectedSpreadsheetId) {
      setIsSheetsModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      // Pull latest from Google Sheets
      const fetched = await fetchSpreadsheetData(accessToken, connectedSpreadsheetId);
      setData(fetched);
      showToast(
        `Sinkronisasi selesai! ${fetched.alat.length} alat, ${fetched.jadwal.length} jadwal, ${fetched.periksa.length} hasil uji termuat.`
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Gagal menyinkronkan data dengan Google Sheets.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Push updates to Google Sheets in background if connected and autoSync is enabled
  const triggerAutoSyncPush = async (newData: {
    alat: Alat[];
    jadwal: Jadwal[];
    periksa: Periksa[];
  }) => {
    if (!autoSync || !connectedSpreadsheetId || !accessToken) return;
    try {
      await pushAllDataToSpreadsheet(accessToken, connectedSpreadsheetId, newData);
    } catch (err) {
      console.warn('Auto sync push error:', err);
    }
  };

  // Navigation helper
  const navigateTo = (view: ViewType, code?: string) => {
    setCurrentView(view);
    if (code) {
      setSelectedInspectCode(code);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Alat Operations ---
  const handleSaveAlat = (alatData: Alat, oldKode?: string) => {
    setData((prev) => {
      let updatedAlat = [...prev.alat];
      let updatedJadwal = [...prev.jadwal];
      let updatedPeriksa = [...prev.periksa];

      if (oldKode) {
        // Edit existing
        updatedAlat = updatedAlat.map((a) => (a.kode === oldKode ? alatData : a));
        if (oldKode !== alatData.kode) {
          // Cascade update codes
          updatedJadwal = updatedJadwal.map((j) =>
            j.kode === oldKode ? { ...j, kode: alatData.kode } : j
          );
          updatedPeriksa = updatedPeriksa.map((p) =>
            p.kode === oldKode ? { ...p, kode: alatData.kode } : p
          );
        }
        showToast(`Perubahan data alat ${alatData.kode} disimpan.`);
      } else {
        // Add new
        updatedAlat.push(alatData);
        showToast(`Alat ${alatData.kode} berhasil ditambahkan.`);
      }

      const nextData = {
        alat: updatedAlat,
        jadwal: updatedJadwal,
        periksa: updatedPeriksa,
      };

      triggerAutoSyncPush(nextData);
      return nextData;
    });
  };

  const handleDeleteAlat = (alatToDelete: Alat) => {
    const isConnected = !!(connectedSpreadsheetId && accessToken);
    const confirmMessage = isConnected
      ? `Hapus timbangan "${alatToDelete.kode} - ${alatToDelete.nama}"?\n\nTindakan ini akan menghapusnya dari aplikasi web DAN Google Sheets yang terhubung.`
      : `Hapus timbangan "${alatToDelete.kode} - ${alatToDelete.nama}"? Jadwal terkait alat ini akan dihapus.`;

    if (window.confirm(confirmMessage)) {
      setData((prev) => {
        const nextData = {
          alat: prev.alat.filter((a) => a.kode !== alatToDelete.kode),
          jadwal: prev.jadwal.filter((j) => j.kode !== alatToDelete.kode),
          periksa: prev.periksa,
        };
        triggerAutoSyncPush(nextData);
        return nextData;
      });
      showToast(`Alat ${alatToDelete.kode} berhasil dihapus.`);
    }
  };

  // --- Jadwal Operations ---
  const handleAddJadwal = (newJadwal: Omit<Jadwal, 'id'>) => {
    const id = `SCH-${Date.now()}`;
    setData((prev) => {
      const nextData = {
        ...prev,
        jadwal: [...prev.jadwal, { ...newJadwal, id }],
      };
      triggerAutoSyncPush(nextData);
      return nextData;
    });
    showToast(`Jadwal baru untuk ${newJadwal.kode} berhasil dibuat.`);
  };

  const handleToggleSelesaiJadwal = (id: number | string) => {
    setData((prev) => {
      const nextData = {
        ...prev,
        jadwal: prev.jadwal.map((j) => (j.id === id ? { ...j, selesai: true } : j)),
      };
      triggerAutoSyncPush(nextData);
      return nextData;
    });
    showToast('Jadwal ditandai telah selesai.');
  };

  const handleDeleteJadwal = (id: number | string) => {
    const isConnected = !!(connectedSpreadsheetId && accessToken);
    const confirmMessage = isConnected
      ? 'Hapus jadwal ini? Tindakan ini akan menghapusnya dari web dan Google Sheets.'
      : 'Hapus jadwal ini?';

    if (window.confirm(confirmMessage)) {
      setData((prev) => {
        const nextData = {
          ...prev,
          jadwal: prev.jadwal.filter((j) => j.id !== id),
        };
        triggerAutoSyncPush(nextData);
        return nextData;
      });
      showToast('Jadwal dihapus.');
    }
  };

  // --- Pemeriksaan Operations ---
  const handleSavePeriksa = (formData: {
    id?: number | string;
    kode: string;
    jenis: 'Kalibrasi' | 'Verifikasi';
    sat: 'kg' | 'g' | 'mg';
    pts: any[];
    tol: number;
    ok: boolean;
    nama: string;
    catatan?: string;
  }) => {
    const today = getIsoDate(0);

    setData((prev) => {
      let updatedPeriksa = [...prev.periksa];
      let updatedAlat = [...prev.alat];
      let updatedJadwal = [...prev.jadwal];

      if (formData.id) {
        // Edit existing inspection
        updatedPeriksa = updatedPeriksa.map((p) =>
          p.id === formData.id
            ? {
                ...p,
                kode: formData.kode,
                jenis: formData.jenis,
                sat: formData.sat,
                pts: formData.pts,
                tol: formData.tol,
                ok: formData.ok,
                nama: formData.nama,
                catatan: formData.catatan,
              }
            : p
        );
      } else {
        // Create new record
        const newRecord: Periksa = {
          id: `CHK-${Date.now()}`,
          tgl: today,
          kode: formData.kode,
          jenis: formData.jenis,
          sat: formData.sat,
          pts: formData.pts,
          tol: formData.tol,
          ok: formData.ok,
          nama: formData.nama,
          catatan: formData.catatan,
        };
        updatedPeriksa.unshift(newRecord);

        // Auto update equipment last and next dates, and close pending schedule
        const currentTool = updatedAlat.find((a) => a.kode === formData.kode);
        if (currentTool) {
          currentTool.last = today;

          // Find open schedule for this tool & close it
          const openSchedule = updatedJadwal.find(
            (j) => j.kode === currentTool.kode && !j.selesai
          );
          if (openSchedule) {
            openSchedule.selesai = true;
          }

          // Calculate next schedule (1 year from today)
          const nextDateObj = new Date(today + 'T00:00:00');
          nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
          const nextIso = nextDateObj.toISOString().slice(0, 10);

          currentTool.next = nextIso;

          // Add next year's schedule
          updatedJadwal.push({
            id: `SCH-${Date.now()}`,
            kode: currentTool.kode,
            jenis: formData.jenis,
            tgl: nextIso,
            selesai: false,
          });
        }
      }

      const nextData = {
        alat: updatedAlat,
        jadwal: updatedJadwal,
        periksa: updatedPeriksa,
      };

      triggerAutoSyncPush(nextData);
      return nextData;
    });
  };

  const handleDeletePeriksa = (id: number | string) => {
    const isConnected = !!(connectedSpreadsheetId && accessToken);
    const confirmMessage = isConnected
      ? 'Hapus catatan hasil pemeriksaan ini dari web dan Google Sheets?'
      : 'Hapus catatan riwayat pemeriksaan ini?';

    if (window.confirm(confirmMessage)) {
      setData((prev) => {
        const nextData = {
          ...prev,
          periksa: prev.periksa.filter((p) => p.id !== id),
        };
        triggerAutoSyncPush(nextData);
        return nextData;
      });
      showToast('Catatan riwayat pemeriksaan dihapus.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-2 animate-fade-in pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0E2433] text-slate-300 p-5 shrink-0 min-h-screen sticky top-0 h-screen justify-between border-r border-slate-800">
        <div className="space-y-6">
          {/* Brand mark */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-xl bg-[#E3A72F] flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-sm">
              <Scale className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="font-bold text-white text-base leading-tight">
                Metrologi Lab
              </div>
              <div className="text-[11px] text-slate-400">
                Kalibrasi &amp; Verifikasi
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            <button
              onClick={() => navigateTo('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-[#E3A72F] text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('alat')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'alat'
                  ? 'bg-[#E3A72F] text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4 shrink-0" />
              <span>Daftar Alat</span>
            </button>

            <button
              onClick={() => navigateTo('jadwal')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'jadwal'
                  ? 'bg-[#E3A72F] text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Jadwal Berkala</span>
            </button>

            <button
              onClick={() => navigateTo('periksa')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'periksa'
                  ? 'bg-[#E3A72F] text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Pemeriksaan Baru</span>
            </button>
          </nav>

          {/* Google Sheets Connection Card */}
          <div className="pt-2">
            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Google Sheets</span>
                </div>
                {connectedSpreadsheetId ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Terhubung"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500" title="Belum terhubung"></span>
                )}
              </div>

              {connectedSpreadsheetId ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 truncate">
                    ID: {connectedSpreadsheetId.slice(0, 10)}...
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={handleQuickSync}
                      disabled={isSyncing}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sinkron...' : 'Sinkronkan'}</span>
                    </button>
                    <button
                      onClick={() => setIsSheetsModalOpen(true)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Pengaturan Google Sheets"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsSheetsModalOpen(true)}
                  className="w-full py-1.5 px-2 bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 text-[11px] font-semibold rounded-lg border border-emerald-600/40 transition-colors text-center cursor-pointer block"
                >
                  Hubungkan Sheets
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <button
            onClick={() => setIsBackupOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-teal-400" />
            <span>Cadangan &amp; Ekspor</span>
          </button>
          <div className="text-[10px] text-slate-500 px-3">
            ISO/IEC 17025 Compliant System
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Header */}
      <header className="md:hidden bg-[#0E2433] text-white p-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E3A72F] flex items-center justify-center text-slate-950 font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Kalibrasi Timbangan</div>
            <div className="text-[10px] text-slate-400">Verifikasi Internal Metrologi</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectedSpreadsheetId && (
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              className="p-1.5 bg-emerald-800 text-white rounded-lg text-xs"
              title="Sinkronkan dengan Google Sheets"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0E2433] text-slate-200 border-b border-slate-800 p-4 space-y-2 z-30 sticky top-16">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
              currentView === 'dashboard' ? 'bg-[#E3A72F] text-slate-950' : 'hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => navigateTo('alat')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
              currentView === 'alat' ? 'bg-[#E3A72F] text-slate-950' : 'hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" /> Daftar Alat
          </button>
          <button
            onClick={() => navigateTo('jadwal')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
              currentView === 'jadwal' ? 'bg-[#E3A72F] text-slate-950' : 'hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Jadwal
          </button>
          <button
            onClick={() => navigateTo('periksa')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
              currentView === 'periksa' ? 'bg-[#E3A72F] text-slate-950' : 'hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" /> Pemeriksaan
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setIsSheetsModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4" /> Hubungkan Google Sheets
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setIsBackupOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
          >
            <Database className="w-4 h-4 text-teal-400" /> Cadangan &amp; Ekspor
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-12">
        {/* Top Synchronized Sheets Banner */}
        {connectedSpreadsheetId && (
          <div className="mb-6 p-3 bg-white border border-emerald-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Tersambung ke Google Sheets (2-arah) ·{' '}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${connectedSpreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:text-emerald-700"
                >
                  Buka Spreadsheet
                </a>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleQuickSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
              <button
                onClick={() => setIsSheetsModalOpen(true)}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Kelola
              </button>
            </div>
          </div>
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            alat={data.alat}
            jadwal={data.jadwal}
            periksa={data.periksa}
            onNavigate={(view, code) => navigateTo(view as ViewType, code)}
            onOpenAlatDetail={(a) => setActiveAlatDetail(a)}
          />
        )}

        {currentView === 'alat' && (
          <DaftarAlatView
            alat={data.alat}
            onAddAlat={() => {
              setEditingAlat(null);
              setIsAlatFormOpen(true);
            }}
            onEditAlat={(a) => {
              setEditingAlat(a);
              setIsAlatFormOpen(true);
            }}
            onDeleteAlat={handleDeleteAlat}
            onSelectAlat={(a) => setActiveAlatDetail(a)}
            onPrintLabel={(a) => setActiveLabelAlat(a)}
          />
        )}

        {currentView === 'jadwal' && (
          <JadwalView
            jadwal={data.jadwal}
            alat={data.alat}
            onAddJadwal={() => setIsJadwalFormOpen(true)}
            onToggleSelesai={handleToggleSelesaiJadwal}
            onDeleteJadwal={handleDeleteJadwal}
            onGoPeriksa={(kode) => navigateTo('periksa', kode)}
          />
        )}

        {currentView === 'periksa' && (
          <PemeriksaanView
            alat={data.alat}
            periksaList={data.periksa}
            initialSelectedCode={selectedInspectCode}
            onSavePeriksa={handleSavePeriksa}
            onDeletePeriksa={handleDeletePeriksa}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onViewCertificate={(p, a) => setCertPeriksa({ periksa: p, alat: a })}
          />
        )}
      </main>

      {/* Modals & Dialogs */}
      {activeAlatDetail && (
        <AlatDetailModal
          alat={activeAlatDetail}
          history={data.periksa.filter((p) => p.kode === activeAlatDetail.kode)}
          onClose={() => setActiveAlatDetail(null)}
          onGoPeriksa={(kode) => navigateTo('periksa', kode)}
          onOpenLabel={(a) => setActiveLabelAlat(a)}
          onViewCert={(p) => setCertPeriksa({ periksa: p, alat: activeAlatDetail })}
        />
      )}

      {activeLabelAlat && (
        <QRLabelModal
          alat={activeLabelAlat}
          onClose={() => setActiveLabelAlat(null)}
        />
      )}

      {certPeriksa && (
        <PrintCertificateModal
          periksa={certPeriksa.periksa}
          alat={certPeriksa.alat || data.alat.find((a) => a.kode === certPeriksa.periksa.kode)}
          onClose={() => setCertPeriksa(null)}
        />
      )}

      {isAlatFormOpen && (
        <AlatFormModal
          initialAlat={editingAlat}
          existingCodes={data.alat.map((a) => a.kode)}
          onSave={handleSaveAlat}
          onClose={() => {
            setIsAlatFormOpen(false);
            setEditingAlat(null);
          }}
        />
      )}

      {isJadwalFormOpen && (
        <JadwalFormModal
          alatList={data.alat}
          onSave={handleAddJadwal}
          onClose={() => setIsJadwalFormOpen(false)}
        />
      )}

      {isQRScannerOpen && (
        <QRScannerModal
          alatList={data.alat}
          onSelectCode={(kode) => {
            setSelectedInspectCode(kode);
            navigateTo('periksa', kode);
          }}
          onClose={() => setIsQRScannerOpen(false)}
        />
      )}

      {isBackupOpen && (
        <BackupModal
          alat={data.alat}
          jadwal={data.jadwal}
          periksa={data.periksa}
          onRestore={(restored) => {
            setData(restored);
            triggerAutoSyncPush(restored);
            showToast('Data berhasil dipulihkan.');
          }}
          onClose={() => setIsBackupOpen(false)}
        />
      )}

      {isSheetsModalOpen && (
        <GoogleSheetsModal
          user={authUser}
          accessToken={accessToken}
          connectedSpreadsheetId={connectedSpreadsheetId}
          currentData={data}
          autoSync={autoSync}
          onToggleAutoSync={(val) => {
            setAutoSync(val);
            showToast(val ? 'Sinkronisasi otomatis aktif.' : 'Sinkronisasi otomatis nonaktif.');
          }}
          onLogin={handleGoogleLogin}
          onLogout={handleGoogleLogout}
          onConnectSpreadsheet={handleConnectSpreadsheet}
          onDisconnectSpreadsheet={handleDisconnectSpreadsheet}
          onDataLoadedFromSheets={(newData) => {
            setData(newData);
          }}
          onClose={() => setIsSheetsModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
