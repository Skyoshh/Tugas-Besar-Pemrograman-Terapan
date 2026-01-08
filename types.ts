
export enum Language {
  ENGLISH = 'ENGLISH',
  MANDARIN = 'MANDARIN',
}

// Representasi tabel 'Pengguna'
export interface DBUser {
  id: string;
  nama_lengkap: string;
  email: string;
  password?: string;
  total_xp: number;
  level: number;
  daily_streak: number;
  last_login: string;
  learning_language: Language | null;
}

// Representasi tabel 'Bahasa'
export interface DBLanguage {
  id: string;
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
  target_word: string;
  pinyin?: string;
}

// Representasi tabel 'Latihan'
export interface DBExercise {
  id?: number | string;
  topik_id: string;
  tipe_latihan: 'multiple-choice' | 'fill-in-the-blank' | 'drag-and-drop';
  pertanyaan: string;
  jawaban_benar: string;
  opsi_jawaban: string[];
}

// Representasi tabel 'Progres_Pengguna'
export interface DBUserProgress {
  id?: number | string;
  pengguna_id: string;
  topik_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  score: number;
  tanggal_selesai: string;
}