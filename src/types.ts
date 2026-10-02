export interface Alat {
  kode: string;
  nama: string;
  kap: string;
  user: string;
  tempat: string;
  last?: string;
  next?: string;
  notes?: string;
}

export interface Jadwal {
  id: number | string;
  kode: string;
  jenis: 'Kalibrasi' | 'Verifikasi';
  tgl: string;
  selesai: boolean;
  notes?: string;
}

export interface TitikUji {
  beban: number;
  baca: number;
  ok: boolean;
}

export interface Periksa {
  id: number | string;
  tgl: string;
  kode: string;
  jenis: 'Kalibrasi' | 'Verifikasi';
  sat: 'kg' | 'g' | 'mg';
  pts: TitikUji[];
  tol: number;
  ok: boolean;
  nama: string;
  catatan?: string;
}

export type ViewType = 'dashboard' | 'alat' | 'jadwal' | 'periksa';
