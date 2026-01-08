
export enum Language {
  ENGLISH = 'ENGLISH',
  MANDARIN = 'MANDARIN',
}

// Representasi tabel 'Pengguna'
export interface DBUser {
  id: string; // Changed to string to support Supabase UUID
  nama_lengkap: string;
  email: string; // Unique
  password?: string; // Ditambahkan untuk autentikasi
  total_xp: number;
  level: number;
  daily_streak: number;
  last_login: string; // ISO Date string
  learning_language: Language | null;
}

// Representasi tabel 'Bahasa'
export interface DBLanguage {
  id: string; // 'ENGLISH' | 'MANDARIN'
  nama_bahasa: string;
}

// Representasi tabel 'Topik'
export interface DBTopic {
  id: string;
  bahasa_id: string;
  judul_topik: string;
  deskripsi: string;
  urutan: number;
  xp_reward: number;
  icon: string;
}

// Representasi tabel 'Kosakata' (Bagian dari materi topik)
export interface DBVocabulary {
  id?: number | string;
  topik_id: string;
  indonesian: string;
  target_word: string; // English / Mandarin character
  pinyin?: string; // Optional for Mandarin
}

// Representasi tabel 'Latihan'
export interface DBExercise {
  id?: number | string;
  topik_id: string;
  tipe_latihan: 'multiple-choice' | 'fill-in-the-blank';
  pertanyaan: string;
  jawaban_benar: string;
  opsi_jawaban: string[]; // Disimpan sebagai array string untuk simplifikasi tabel Opsi_Jawaban
}

// Representasi tabel 'Progres_Pengguna'
export interface DBUserProgress {
  id?: number | string;
  pengguna_id: string; // References DBUser.id
  topik_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  score: number;
  tanggal_selesai: string;
}
