import { Alat, Jadwal, Periksa } from '../types';

const STORAGE_KEY = 'kalibrasi_timbangan_data_v2';
const ONE_DAY_MS = 86400000;

export const getIsoDate = (offsetDays: number = 0): string => {
  return new Date(Date.now() + offsetDays * ONE_DAY_MS).toISOString().slice(0, 10);
};

export const formatDateIndo = (dateStr?: string): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const getDaysLeft = (targetDateStr: string): number => {
  const target = new Date(targetDateStr + 'T00:00:00');
  const now = new Date(getIsoDate(0) + 'T00:00:00');
  return Math.round((target.getTime() - now.getTime()) / ONE_DAY_MS);
};

export const getUrgencyStatus = (
  dateStr?: string
): { label: string; variant: 'ok' | 'warn' | 'bad' } | null => {
  if (!dateStr) return null;
  const days = getDaysLeft(dateStr);
  if (days < 0) {
    return { label: `Lewat ${-days} hari`, variant: 'bad' };
  } else if (days === 0) {
    return { label: 'Hari ini', variant: 'warn' };
  } else if (days <= 30) {
    return { label: `${days} hari lagi`, variant: 'warn' };
  } else if (days <= 60) {
    return { label: `${days} hari lagi`, variant: 'ok' };
  }
  return { label: `${days} hari lagi`, variant: 'ok' };
};

export const parseCapacity = (
  kap: string
): { value: number; unit: 'kg' | 'g' | 'mg' } => {
  const match = String(kap || '').trim().match(/^([\d.,]+)\s*(kg|g|mg)\b/i);
  if (!match) return { value: 0, unit: 'kg' };
  const val = parseFloat(match[1].replace(',', '.'));
  const unit = (match[2].toLowerCase() || 'kg') as 'kg' | 'g' | 'mg';
  return { value: isNaN(val) ? 0 : val, unit };
};

export const getSuggestedWeights = (kap: string): number[] => {
  const { value, unit } = parseCapacity(kap);
  if (!value || isNaN(value)) return [];

  if (unit === 'g') {
    const weights: number[] = [];
    for (let x = 50; x <= value; x += 50) {
      weights.push(x);
    }
    if (weights.length === 0 && value > 0) weights.push(value);
    return weights.slice(0, 8);
  }

  if (value >= 100) {
    const list = [10, 20, 50, 100, 150, 200, 300, 400, 500].filter((w) => w <= value);
    if (!list.includes(value) && value <= 1000) list.push(value);
    return list;
  }

  const list = [1, 2, 5, 10, 15, 20, 25, 30].filter((w) => w <= value);
  if (!list.includes(value) && value <= 50) list.push(value);
  return list;
};

// Default seed data
export const getDefaultDataset = (): {
  alat: Alat[];
  jadwal: Jadwal[];
  periksa: Periksa[];
} => {
  const K = [
    'AST-0141',
    'AST-0157',
    'AST-0162',
    'AST-0158',
    'AST-0170',
    'AST-0173',
  ];

  const currentYear = new Date().getFullYear();

  const alat: Alat[] = [
    {
      kode: K[0],
      nama: 'Timbangan Lantai Gudang A',
      kap: '500 kg',
      user: 'Gudang',
      tempat: 'UPT Metrologi Legal',
      last: getIsoDate(-95),
      next: getIsoDate(-12),
    },
    {
      kode: K[1],
      nama: 'Timbangan Meja Produksi 1',
      kap: '30 kg',
      user: 'Produksi',
      tempat: 'Internal (Lab Metrologi)',
      last: getIsoDate(-60),
      next: getIsoDate(6),
    },
    {
      kode: K[2],
      nama: 'Timbangan Analitik Lab',
      kap: '210 g',
      user: 'Laboratorium',
      tempat: 'PT Sucofindo',
      last: getIsoDate(-30),
      next: getIsoDate(150),
    },
    {
      kode: K[3],
      nama: 'Timbangan Meja Produksi 2',
      kap: '30 kg',
      user: 'Produksi',
      tempat: 'Internal (Lab Metrologi)',
      last: getIsoDate(-170),
      next: getIsoDate(25),
    },
    {
      kode: K[4],
      nama: 'Timbangan Digital QC',
      kap: '6 kg',
      user: 'QC',
      tempat: 'Internal (Lab Metrologi)',
      last: getIsoDate(-150),
      next: getIsoDate(45),
    },
    {
      kode: K[5],
      nama: 'Timbangan Platform Pengiriman',
      kap: '300 kg',
      user: 'Gudang',
      tempat: 'UPT Metrologi Legal',
      last: getIsoDate(-200),
      next: getIsoDate(80),
    },
  ];

  const jadwal: Jadwal[] = K.flatMap((k, i) =>
    [0, 5, 8].map((offsetMonth, j) => {
      const month = ((i * 2 + offsetMonth) % 12) + 1;
      const day = ((5 + i * 3 + j) % 28) + 1;
      const tgl = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = tgl < getIsoDate(-3);
      // specific status variation
      const selesai = isPast && !(i === 0 && j === 1) && !(i === 2 && j === 0);
      return {
        id: `SCH-${i * 3 + j + 1}`,
        kode: k,
        jenis: j === 1 ? 'Kalibrasi' : 'Verifikasi',
        tgl,
        selesai,
      };
    })
  );

  const periksa: Periksa[] = [
    {
      id: 'CHK-1',
      tgl: getIsoDate(-30),
      kode: K[2],
      jenis: 'Verifikasi',
      sat: 'g',
      pts: [
        { beban: 100, baca: 100.004, ok: true },
        { beban: 200, baca: 200.01, ok: true },
      ],
      tol: 0.1,
      ok: true,
      nama: 'Rina Kartika (Metrologi QA)',
      catatan: 'Kondisi waterpass level, pembacaan stabil.',
    },
    {
      id: 'CHK-2',
      tgl: getIsoDate(-120),
      kode: K[2],
      jenis: 'Kalibrasi',
      sat: 'g',
      pts: [
        { beban: 100, baca: 100.12, ok: false },
        { beban: 200, baca: 200.05, ok: true },
      ],
      tol: 0.05,
      ok: false,
      nama: 'Rina Kartika',
      catatan: 'Perlu readjustment loadcell pada beban menengah.',
    },
    {
      id: 'CHK-3',
      tgl: getIsoDate(-200),
      kode: K[2],
      jenis: 'Kalibrasi',
      sat: 'g',
      pts: [{ beban: 100, baca: 99.998, ok: true }],
      tol: 0.1,
      ok: true,
      nama: 'Dedi Kurniawan',
    },
    {
      id: 'CHK-4',
      tgl: getIsoDate(-95),
      kode: K[0],
      jenis: 'Kalibrasi',
      sat: 'kg',
      pts: [
        { beban: 100, baca: 100.05, ok: true },
        { beban: 200, baca: 200.1, ok: true },
      ],
      tol: 0.1,
      ok: true,
      nama: 'Dedi Kurniawan',
      catatan: 'Kalibrasi lapangan dengan anak timbang M1.',
    },
    {
      id: 'CHK-5',
      tgl: getIsoDate(-60),
      kode: K[1],
      jenis: 'Verifikasi',
      sat: 'kg',
      pts: [{ beban: 20, baca: 20.004, ok: true }],
      tol: 0.1,
      ok: true,
      nama: 'Rina Kartika',
    },
  ];

  return { alat, jadwal, periksa };
};

export const loadStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getDefaultDataset();
      saveStoredData(initial.alat, initial.jadwal, initial.periksa);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed.alat) &&
      Array.isArray(parsed.jadwal) &&
      Array.isArray(parsed.periksa)
    ) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse localStorage data', e);
  }
  const fallback = getDefaultDataset();
  saveStoredData(fallback.alat, fallback.jadwal, fallback.periksa);
  return fallback;
};

export const saveStoredData = (
  alat: Alat[],
  jadwal: Jadwal[],
  periksa: Periksa[]
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ alat, jadwal, periksa, updatedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};
