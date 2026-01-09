
export enum Language {
  ENGLISH = 'ENGLISH',
  MANDARIN = 'MANDARIN',
}

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
  role?: 'user' | 'admin'; 
}

export interface DBLanguage {
  id: string; 
  nama_bahasa: string;
}

export interface DBTopic {
  id: string;
  bahasa_id: string;
  judul_topik: string;
  deskripsi: string;
  urutan: number;
  xp_reward: number;
  icon: string;
}

export interface DBVocabulary {
  id?: number | string;
  topik_id: string;
  indonesian: string;
  target_word: string; 
  pinyin?: string; 
}

export interface DBExercise {
  id?: number | string;
  topik_id: string;
  tipe_latihan: 'multiple-choice' | 'fill-in-the-blank' | 'drag-and-drop';
  pertanyaan: string;
  jawaban_benar: string;
  opsi_jawaban: string[]; 
}

export interface DBUserProgress {
  id?: number | string;
  pengguna_id: string; 
  topik_id: string;
  status: 'locked' | 'unlocked' | 'completed';
  score: number;
  tanggal_selesai: string;
}