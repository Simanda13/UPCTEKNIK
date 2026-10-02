import { Alat, Jadwal, Periksa, TitikUji } from '../types';

export const SPREADSHEET_ID_KEY = 'kalibrasi_timbangan_spreadsheet_id';

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SPREADSHEET_ID_KEY);
};

export const saveSpreadsheetId = (id: string | null) => {
  if (id) {
    localStorage.setItem(SPREADSHEET_ID_KEY, id.trim());
  } else {
    localStorage.removeItem(SPREADSHEET_ID_KEY);
  }
};

const SHEET_HEADERS = {
  alat: [
    'Kode Alat',
    'Nama Alat',
    'Kapasitas',
    'Pengguna',
    'Tempat Kalibrasi',
    'Kalibrasi Terakhir (YYYY-MM-DD)',
    'Kalibrasi Berikutnya (YYYY-MM-DD)',
    'Catatan',
  ],
  jadwal: [
    'ID Jadwal',
    'Kode Alat',
    'Jenis (Kalibrasi / Verifikasi)',
    'Tanggal Rencana (YYYY-MM-DD)',
    'Status Selesai (TRUE / FALSE)',
    'Catatan',
  ],
  periksa: [
    'ID Pemeriksaan',
    'Tanggal (YYYY-MM-DD)',
    'Kode Alat',
    'Jenis (Kalibrasi / Verifikasi)',
    'Satuan (kg / g / mg)',
    'Toleransi (%)',
    'Hasil (MEMENUHI / DI LUAR)',
    'Pemeriksa',
    'Titik Uji (JSON)',
    'Catatan',
  ],
};

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive
 * with 3 tabs and pre-formatted headers.
 */
export const createCalibrationSpreadsheet = async (
  accessToken: string,
  initialData: { alat: Alat[]; jadwal: Jadwal[]; periksa: Periksa[] }
): Promise<string> => {
  const title = `Kalibrasi & Verifikasi Timbangan - ${new Date().getFullYear()}`;

  // 1. Create spreadsheet structure
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Daftar_Alat' } },
        { properties: { title: 'Jadwal' } },
        { properties: { title: 'Riwayat_Pemeriksaan' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Populate headers and initial records
  await pushAllDataToSpreadsheet(accessToken, spreadsheetId, initialData);

  return spreadsheetId;
};

/**
 * Pushes all current application data into Google Sheets (clearing previous content first)
 */
export const pushAllDataToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  data: { alat: Alat[]; jadwal: Jadwal[]; periksa: Periksa[] }
) => {
  // Format Alat Rows
  const alatRows = [
    SHEET_HEADERS.alat,
    ...data.alat.map((a) => [
      a.kode || '',
      a.nama || '',
      a.kap || '',
      a.user || '',
      a.tempat || '',
      a.last || '',
      a.next || '',
      a.notes || '',
    ]),
  ];

  // Format Jadwal Rows
  const jadwalRows = [
    SHEET_HEADERS.jadwal,
    ...data.jadwal.map((j) => [
      String(j.id || ''),
      j.kode || '',
      j.jenis || 'Verifikasi',
      j.tgl || '',
      j.selesai ? 'TRUE' : 'FALSE',
      j.notes || '',
    ]),
  ];

  // Format Periksa Rows
  const periksaRows = [
    SHEET_HEADERS.periksa,
    ...data.periksa.map((p) => [
      String(p.id || ''),
      p.tgl || '',
      p.kode || '',
      p.jenis || 'Verifikasi',
      p.sat || 'kg',
      p.tol !== undefined ? String(p.tol) : '0.1',
      p.ok ? 'MEMENUHI' : 'DI LUAR',
      p.nama || '',
      JSON.stringify(p.pts || []),
      p.catatan || '',
    ]),
  ];

  // Clear existing ranges first
  const rangesToClear = [
    'Daftar_Alat!A1:Z500',
    'Jadwal!A1:Z500',
    'Riwayat_Pemeriksaan!A1:Z1000',
  ];

  for (const range of rangesToClear) {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
          range
        )}:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch {
      // Ignore if tab does not exist yet
    }
  }

  // Batch update values
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: 'Daftar_Alat!A1',
            values: alatRows,
          },
          {
            range: 'Jadwal!A1',
            values: jadwalRows,
          },
          {
            range: 'Riwayat_Pemeriksaan!A1',
            values: periksaRows,
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Gagal memperbarui Google Sheets: ${errText}`);
  }
};

/**
 * Fetches all rows from Google Sheets and parses them into application models.
 * This allows edits or deletions performed directly in Google Sheets to reflect in the web app!
 */
export const fetchSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{
  alat: Alat[];
  jadwal: Jadwal[];
  periksa: Periksa[];
}> => {
  const ranges = ['Daftar_Alat!A2:H', 'Jadwal!A2:F', 'Riwayat_Pemeriksaan!A2:J'];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Sesi autentikasi telah berakhir. Silakan login kembali.');
    }
    if (res.status === 404) {
      throw new Error('Spreadsheet tidak ditemukan atau Anda tidak memiliki akses.');
    }
    const errText = await res.text();
    throw new Error(`Gagal mengambil data dari Google Sheets: ${errText}`);
  }

  const json = await res.json();
  const valueRanges = json.valueRanges || [];

  // 1. Parse Alat
  const alatValues = valueRanges[0]?.values || [];
  const parsedAlat: Alat[] = alatValues
    .filter((row: any[]) => row && row[0] && String(row[0]).trim() !== '')
    .map((row: any[]) => ({
      kode: String(row[0] || '').trim().toUpperCase(),
      nama: String(row[1] || '').trim(),
      kap: String(row[2] || '').trim() || '30 kg',
      user: String(row[3] || '').trim() || 'Umum',
      tempat: String(row[4] || '').trim(),
      last: row[5] ? String(row[5]).trim() : undefined,
      next: row[6] ? String(row[6]).trim() : undefined,
      notes: row[7] ? String(row[7]).trim() : undefined,
    }));

  // 2. Parse Jadwal
  const jadwalValues = valueRanges[1]?.values || [];
  const parsedJadwal: Jadwal[] = jadwalValues
    .filter((row: any[]) => row && row[1] && String(row[1]).trim() !== '')
    .map((row: any[], idx: number) => {
      const isDone =
        String(row[4] || '').toUpperCase() === 'TRUE' ||
        String(row[4] || '').toLowerCase() === 'selesai' ||
        String(row[4] || '') === '1';

      return {
        id: row[0] ? String(row[0]).trim() : `SCH-${Date.now() + idx}`,
        kode: String(row[1] || '').trim().toUpperCase(),
        jenis:
          String(row[2] || '').toLowerCase().includes('kalibrasi')
            ? ('Kalibrasi' as const)
            : ('Verifikasi' as const),
        tgl: String(row[3] || '').trim() || new Date().toISOString().slice(0, 10),
        selesai: isDone,
        notes: row[5] ? String(row[5]).trim() : undefined,
      };
    });

  // 3. Parse Periksa
  const periksaValues = valueRanges[2]?.values || [];
  const parsedPeriksa: Periksa[] = periksaValues
    .filter((row: any[]) => row && row[2] && String(row[2]).trim() !== '')
    .map((row: any[], idx: number) => {
      let pts: TitikUji[] = [];
      try {
        const rawJson = String(row[8] || '').trim();
        if (rawJson && (rawJson.startsWith('[') || rawJson.startsWith('{'))) {
          pts = JSON.parse(rawJson);
        }
      } catch {
        pts = [];
      }

      if (!Array.isArray(pts) || pts.length === 0) {
        pts = [{ beban: 10, baca: 10, ok: true }];
      }

      const isPass =
        String(row[6] || '').toUpperCase().includes('MEMENUHI') ||
        String(row[6] || '').toUpperCase() === 'OK' ||
        String(row[6] || '').toUpperCase() === 'TRUE';

      return {
        id: row[0] ? String(row[0]).trim() : `CHK-${Date.now() + idx}`,
        tgl: String(row[1] || '').trim() || new Date().toISOString().slice(0, 10),
        kode: String(row[2] || '').trim().toUpperCase(),
        jenis:
          String(row[3] || '').toLowerCase().includes('kalibrasi')
            ? ('Kalibrasi' as const)
            : ('Verifikasi' as const),
        sat: (String(row[4] || 'kg').toLowerCase() as any) || 'kg',
        tol: parseFloat(row[5]) || 0.1,
        ok: isPass,
        nama: String(row[7] || '').trim() || 'Teknisi',
        pts,
        catatan: row[9] ? String(row[9]).trim() : undefined,
      };
    });

  return {
    alat: parsedAlat,
    jadwal: parsedJadwal,
    periksa: parsedPeriksa,
  };
};
