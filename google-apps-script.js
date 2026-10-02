/**
 * =====================================================================
 * SISTEM METROLOGI & VERIFIKASI TIMBANGAN - GOOGLE APPS SCRIPT (Code.gs)
 * =====================================================================
 * Script ini menghubungkan aplikasi web Metrologi Timbangan secara 2-arah
 * ke Google Sheets untuk TAMBAH, EDIT, dan HAPUS data.
 * 
 * CARA MEMASANG DI GOOGLE SHEETS:
 * 1. Buka spreadsheet Google Sheets Anda (atau buat baru di sheets.new)
 * 2. Klik menu "Ekstensi" (Extensions) -> "Apps Script"
 * 3. Hapus semua kode default, lalu tempel (Paste) seluruh kode ini.
 * 4. Klik ikon "Simpan" (Save / Ctrl+S).
 * 5. Jalankan fungsi "setupSheet()" sekali untuk membuat header 3 tab otomatis.
 * 6. Klik tombol biru "Terapkan" (Deploy) -> "Penerapan baru" (New deployment).
 * 7. Pilih jenis "Aplikasi Web" (Web app).
 * 8. Konfigurasi:
 *    - Keterangan: Metrologi Web App v2
 *    - Jalankan sebagai (Execute as): Saya (Me)
 *    - Yang memiliki akses (Who has access): Siapa saja (Anyone) -> PENTING!
 * 9. Klik "Terapkan" (Deploy), lalu Salin URL Aplikasi Web yang diberikan
 *    (contoh: https://script.google.com/macros/s/AKfycb.../exec).
 * 10. Buka aplikasi web Metrologi, buka menu "Google Sheets", lalu tempel URL tersebut.
 * =====================================================================
 */

// 1. SETUP SHEET OTOMATIS (Jalankan sekali di editor Apps Script)
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Tab 1: Daftar_Alat
  let sAlat = ss.getSheetByName('Daftar_Alat');
  if (!sAlat) {
    sAlat = ss.insertSheet('Daftar_Alat');
  }
  if (sAlat.getLastRow() === 0) {
    const headersAlat = ['Kode Alat', 'Nama Alat', 'Kapasitas', 'Pengguna', 'Tempat Kalibrasi', 'Kalibrasi Terakhir', 'Kalibrasi Berikutnya'];
    sAlat.getRange(1, 1, 1, headersAlat.length).setValues([headersAlat])
      .setBackground('#0F5C6E').setFontColor('#FFFFFF').setFontWeight('bold');
    sAlat.setFrozenRows(1);

    // Data Contoh
    sAlat.appendRow(['AST-0141', 'Timbangan Duduk 500 kg', '500 kg', 'Produksi', 'UPT Metrologi', '2025-01-10', '2026-01-10']);
    sAlat.appendRow(['AST-0157', 'Timbangan Meja 30 kg', '30 kg', 'QC / Lab', 'PT Metrologi Mandiri', '2025-03-15', '2026-03-15']);
    sAlat.appendRow(['AST-0162', 'Timbangan Analitik 210 gr', '210 gr', 'R&D', 'Balai Kalibrasi', '2025-02-01', '2026-02-01']);
    sAlat.appendRow(['AST-0170', 'Timbangan Komparator 6 kg', '6 kg', 'Gudang', 'UPT Metrologi', '2025-04-12', '2026-04-12']);
  }

  // Tab 2: Jadwal
  let sJadwal = ss.getSheetByName('Jadwal');
  if (!sJadwal) {
    sJadwal = ss.insertSheet('Jadwal');
  }
  if (sJadwal.getLastRow() === 0) {
    const headersJadwal = ['ID Jadwal', 'Kode Alat', 'Jenis Kegiatan', 'Tanggal Rencana', 'Status Selesai'];
    sJadwal.getRange(1, 1, 1, headersJadwal.length).setValues([headersJadwal])
      .setBackground('#0F5C6E').setFontColor('#FFFFFF').setFontWeight('bold');
    sJadwal.setFrozenRows(1);

    sJadwal.appendRow(['SCH-101', 'AST-0141', 'Verifikasi', '2026-01-10', 'TRUE']);
    sJadwal.appendRow(['SCH-102', 'AST-0157', 'Kalibrasi', '2026-03-15', 'FALSE']);
    sJadwal.appendRow(['SCH-103', 'AST-0162', 'Verifikasi', '2026-02-01', 'FALSE']);
  }

  // Tab 3: Riwayat_Pemeriksaan
  let sPeriksa = ss.getSheetByName('Riwayat_Pemeriksaan');
  if (!sPeriksa) {
    sPeriksa = ss.insertSheet('Riwayat_Pemeriksaan');
  }
  if (sPeriksa.getLastRow() === 0) {
    const headersPeriksa = ['ID Pemeriksaan', 'Tanggal', 'Kode Alat', 'Jenis', 'Satuan', 'Toleransi (%)', 'Hasil', 'Pemeriksa', 'Titik Uji JSON'];
    sPeriksa.getRange(1, 1, 1, headersPeriksa.length).setValues([headersPeriksa])
      .setBackground('#0F5C6E').setFontColor('#FFFFFF').setFontWeight('bold');
    sPeriksa.setFrozenRows(1);

    sPeriksa.appendRow([
      'CHK-101',
      '2025-01-10',
      'AST-0141',
      'Verifikasi',
      'kg',
      0.1,
      'MEMENUHI',
      'Teknisi Metrologi QA',
      JSON.stringify([
        { beban: 10, baca: 10.00, ok: true },
        { beban: 20, baca: 20.01, ok: true },
        { beban: 50, baca: 50.02, ok: true }
      ])
    ]);
  }

  Logger.log('Setup 3 tab selesai dengan sempurna!');
}

// 2. ENDPOINT GET: Membaca seluruh data dari spreadsheet ke Web
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Baca Daftar_Alat
    const alat = [];
    const sAlat = ss.getSheetByName('Daftar_Alat');
    if (sAlat && sAlat.getLastRow() > 1) {
      const vals = sAlat.getRange(2, 1, sAlat.getLastRow() - 1, 7).getValues();
      vals.forEach(r => {
        if (r[0]) {
          alat.push({
            kode: String(r[0]).trim().toUpperCase(),
            nama: String(r[1] || r[0]).trim(),
            kap: String(r[2] || '30 kg').trim(),
            user: String(r[3] || 'Umum').trim(),
            tempat: String(r[4] || '').trim(),
            last: formatDate(r[5]),
            next: formatDate(r[6])
          });
        }
      });
    }

    // 2. Baca Jadwal
    const jadwal = [];
    const sJadwal = ss.getSheetByName('Jadwal');
    if (sJadwal && sJadwal.getLastRow() > 1) {
      const vals = sJadwal.getRange(2, 1, sJadwal.getLastRow() - 1, 5).getValues();
      vals.forEach((r, idx) => {
        if (r[1]) {
          jadwal.push({
            id: String(r[0] || 'SCH-' + (idx + 1)).trim(),
            kode: String(r[1]).trim().toUpperCase(),
            jenis: String(r[2] || 'Verifikasi').trim(),
            tgl: formatDate(r[3]),
            selesai: String(r[4]).toUpperCase() === 'TRUE' || r[4] === true || String(r[4]).toLowerCase() === 'selesai'
          });
        }
      });
    }

    // 3. Baca Riwayat_Pemeriksaan
    const periksa = [];
    const sPeriksa = ss.getSheetByName('Riwayat_Pemeriksaan');
    if (sPeriksa && sPeriksa.getLastRow() > 1) {
      const vals = sPeriksa.getRange(2, 1, sPeriksa.getLastRow() - 1, 9).getValues();
      vals.forEach((r, idx) => {
        if (r[2]) {
          let pts = [];
          try {
            if (r[8]) pts = JSON.parse(r[8]);
          } catch (err) {}
          if (!Array.isArray(pts) || !pts.length) {
            pts = [{ beban: 10, baca: 10, ok: true }];
          }
          periksa.push({
            id: String(r[0] || 'CHK-' + (idx + 1)).trim(),
            tgl: formatDate(r[1]),
            kode: String(r[2]).trim().toUpperCase(),
            jenis: String(r[3] || 'Verifikasi').trim(),
            sat: String(r[4] || 'kg').trim(),
            tol: parseFloat(r[5]) || 0.1,
            ok: String(r[6]).toUpperCase().includes('MEMENUHI') || String(r[6]).toUpperCase() === 'PASS' || r[6] === true,
            nama: String(r[7] || 'Teknisi QA').trim(),
            pts: pts
          });
        }
      });
    }

    const output = {
      status: 'success',
      data: { alat, jadwal, periksa },
      timestamp: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. ENDPOINT POST: Menerima Perubahan dari Web (Tambah, Edit, Hapus, atau Sync Lengkap)
function doPost(e) {
  try {
    const rawData = e.postData ? e.postData.contents : '';
    if (!rawData) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(rawData);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // SINKRONISASI LENGKAP SEMUA DATA
    if (payload.alat || payload.jadwal || payload.periksa) {
      if (Array.isArray(payload.alat)) {
        writeSheetData(ss, 'Daftar_Alat', 
          ['Kode Alat', 'Nama Alat', 'Kapasitas', 'Pengguna', 'Tempat Kalibrasi', 'Kalibrasi Terakhir', 'Kalibrasi Berikutnya'],
          payload.alat.map(a => [a.kode, a.nama, a.kap, a.user, a.tempat || '-', a.last || '', a.next || ''])
        );
      }

      if (Array.isArray(payload.jadwal)) {
        writeSheetData(ss, 'Jadwal',
          ['ID Jadwal', 'Kode Alat', 'Jenis Kegiatan', 'Tanggal Rencana', 'Status Selesai'],
          payload.jadwal.map(j => [j.id, j.kode, j.jenis, j.tgl || '', j.selesai ? 'TRUE' : 'FALSE'])
        );
      }

      if (Array.isArray(payload.periksa)) {
        writeSheetData(ss, 'Riwayat_Pemeriksaan',
          ['ID Pemeriksaan', 'Tanggal', 'Kode Alat', 'Jenis', 'Satuan', 'Toleransi (%)', 'Hasil', 'Pemeriksa', 'Titik Uji JSON'],
          payload.periksa.map(p => [
            p.id, p.tgl, p.kode, p.jenis, p.sat, p.tol,
            p.ok ? 'MEMENUHI' : 'DI LUAR', p.nama,
            JSON.stringify(p.pts || [])
          ])
        );
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Seluruh data berhasil disinkronkan ke Google Sheets' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi Spesifik (Single Action)
    if (payload.action) {
      handleSingleAction(ss, payload);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Aksi ' + payload.action + ' berhasil dijalankan' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper untuk menulis data ke Sheet dengan rapi
function writeSheetData(ss, sheetName, headers, rows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();
  
  // Tulis Header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setBackground('#0F5C6E').setFontColor('#FFFFFF').setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Tulis Baris Data
  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// Helper format tanggal YYYY-MM-DD
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return s;
}

// Handle aksi satuan
function handleSingleAction(ss, p) {
  if (p.action === 'addAlat' || p.action === 'editAlat') {
    const s = ss.getSheetByName('Daftar_Alat') || ss.insertSheet('Daftar_Alat');
    const a = p.alat;
    const vals = s.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).toUpperCase() === String(a.kode).toUpperCase()) {
        foundRow = i + 1;
        break;
      }
    }
    const rowData = [a.kode, a.nama, a.kap, a.user, a.tempat || '-', a.last || '', a.next || ''];
    if (foundRow > 1) {
      s.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      s.appendRow(rowData);
    }
  } else if (p.action === 'deleteAlat') {
    const s = ss.getSheetByName('Daftar_Alat');
    if (!s) return;
    const vals = s.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).toUpperCase() === String(p.kode).toUpperCase()) {
        s.deleteRow(i + 1);
        break;
      }
    }
  }
}
