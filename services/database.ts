
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { DBUser, DBTopic, DBVocabulary, DBExercise, DBUserProgress, Language } from '../types';

// Konfigurasi Supabase dari input user
const supabaseUrl = 'https://rbjntlzmtcvlazqbcthn.supabase.co';
const supabaseKey = 'sb_publishable_G_uroxxDOYLpVyEYQdtSAw_NQfHcvh1';

if (!supabaseUrl || !supabaseKey) {
  console.warn("PERINGATAN: Supabase URL atau Key belum diset. Database tidak akan berfungsi.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPER FUNCTION FOR REORDERING ---
const shiftTopicsDown = async (languageId: string, level: string, startOrder: number, excludeId?: string) => {
    // 1. Cek apakah ada topik dengan urutan yang sama persis
    const { data: collision } = await supabase
        .from('topik')
        .select('id')
        .eq('bahasa_id', languageId)
        .eq('level', level)
        .eq('urutan', startOrder)
        .neq('id', excludeId || '') // Jangan hitung diri sendiri saat edit
        .maybeSingle();

    // Jika tidak ada yang bentrok di urutan ini, tidak perlu geser apa-apa
    if (!collision) return;

    // 2. Jika ada bentrok, ambil semua topik dari urutan tersebut ke atas
    const { data: topicsToShift } = await supabase
        .from('topik')
        .select('id, urutan')
        .eq('bahasa_id', languageId)
        .eq('level', level)
        .gte('urutan', startOrder)
        .neq('id', excludeId || '')
        .order('urutan', { ascending: false }); // Urutkan dari terbesar agar update aman

    if (!topicsToShift) return;

    // 3. Update satu per satu (Geser +1)
    // Note: Idealnya pakai RPC function di Supabase untuk atomicity, tapi ini solusi client-side.
    for (const t of topicsToShift) {
        await supabase
            .from('topik')
            .update({ urutan: t.urutan + 1 })
            .eq('id', t.id);
    }
};

// --- SERVICE METHODS (SUPABASE IMPLEMENTATION) ---

export const databaseService = {
  init: async () => {
    return true;
  },

  // --- AUTHENTICATION ---

  // Login: Cek Email di DB, lalu bandingkan Hash Password
  loginUser: async (email: string, password: string): Promise<DBUser> => {
    // 1. Ambil user berdasarkan email saja
    const { data, error } = await supabase
      .from('pengguna')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new Error('Email tidak ditemukan atau terjadi kesalahan.');
    }

    const user = data as DBUser;

    // 2. Verifikasi password menggunakan bcrypt
    if (!user.password) {
        throw new Error('Akun ini memiliki masalah konfigurasi (password hilang). Hubungi admin.');
    }
    
    // Strict Check: Hanya membandingkan hash. Tidak ada fallback ke plain text.
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Kata sandi salah.');
    }

    return user;
  },

  // Register: Hash password sebelum insert
  registerUser: async (nama: string, email: string, password: string): Promise<DBUser> => {
    // 1. Cek apakah email sudah ada
    const { data: existingUser } = await supabase
        .from('pengguna')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        throw new Error('Email sudah terdaftar. Silakan masuk.');
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Buat user baru dengan password terenkripsi
    const newUser = {
      nama_lengkap: nama,
      email: email,
      password: hashedPassword, // Simpan Hash
      total_xp: 0,
      level: 1,
      daily_streak: 1,
      last_login: new Date().toISOString(),
      learning_language: null,
      role: 'user' // Default role
    };

    const { data, error } = await supabase
      .from('pengguna')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error("Error registering user:", error);
      throw new Error('Gagal mendaftar pengguna. Silakan coba lagi.');
    }
    
    return data as DBUser;
  },
  
  // Get User by Email (tanpa password check, untuk session rehydration)
  getUserByEmail: async (email: string): Promise<DBUser | undefined> => {
    const { data, error } = await supabase
      .from('pengguna')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return undefined;
    return data as DBUser;
  },

  updateUserLanguage: async (userId: string, language: Language) => {
    const { error } = await supabase
      .from('pengguna')
      .update({ learning_language: language })
      .eq('id', userId);
      
    if (error) console.error("Error update language:", error);
  },
  
  updateUserStats: async (userId: string, xpToAdd: number) => {
    // 1. Ambil user saat ini
    const { data: user, error: fetchError } = await supabase
        .from('pengguna')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (fetchError || !user) return;

    // 2. Hitung logika streak
    const today = new Date().toISOString().split('T')[0];
    const lastLogin = user.last_login ? user.last_login.split('T')[0] : '';
    
    let newStreak = user.daily_streak;
    
    if (today !== lastLogin) {
        const diffTime = Math.abs(new Date(today).getTime() - new Date(lastLogin).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            newStreak += 1;
        } else {
            newStreak = 1;
        }
    }

    const updates = {
        total_xp: user.total_xp + xpToAdd,
        daily_streak: newStreak,
        last_login: new Date().toISOString()
    };

    const { error } = await supabase
      .from('pengguna')
      .update(updates)
      .eq('id', userId);

    if (error) console.error("Error update stats:", error);
  },

  resetUserProgress: async (userId: string, languageId: Language) => {
    const prefix = languageId === Language.ENGLISH ? 'en-%' : 'zh-%';
    const { error } = await supabase
        .from('progres_pengguna')
        .delete()
        .eq('pengguna_id', userId)
        .like('topik_id', prefix);

    if (error) console.error("Error reset progress:", error);
  },

  // Content
  getTopicsByLanguage: async (language: Language): Promise<DBTopic[]> => {
    const { data, error } = await supabase
        .from('topik')
        .select('*')
        .eq('bahasa_id', language)
        .order('urutan', { ascending: true });

    if (error) {
        console.error("Error fetching topics:", error);
        return [];
    }
    return data as DBTopic[];
  },

  getLessonData: async (topicId: string) => {
    const [vocabResponse, exerciseResponse] = await Promise.all([
        supabase.from('kosakata').select('*').eq('topik_id', topicId),
        supabase.from('latihan').select('*').eq('topik_id', topicId)
    ]);

    return { 
        vocab: (vocabResponse.data || []) as DBVocabulary[], 
        exercises: (exerciseResponse.data || []) as DBExercise[] 
    };
  },

  // Progress
  getUserProgress: async (userId: string): Promise<DBUserProgress[]> => {
    const { data, error } = await supabase
        .from('progres_pengguna')
        .select('*')
        .eq('pengguna_id', userId);

    if (error) return [];
    return data as DBUserProgress[];
  },

  saveLessonProgress: async (userId: string, topicId: string, score: number) => {
    const { data: existing } = await supabase
        .from('progres_pengguna')
        .select('id')
        .eq('pengguna_id', userId)
        .eq('topik_id', topicId)
        .single();

    const timestamp = new Date().toISOString();

    if (!existing) {
        // Insert baru jika belum ada
        const newProgress = {
            pengguna_id: userId,
            topik_id: topicId,
            status: 'completed',
            score: score,
            tanggal_selesai: timestamp
        };
        await supabase.from('progres_pengguna').insert([newProgress]);
    } else {
        // Update jika sudah ada (misal mengulang latihan untuk perbaikan skor)
        // Kita update skor dan tanggal selesai
        await supabase
            .from('progres_pengguna')
            .update({ 
                score: score, 
                tanggal_selesai: timestamp 
            })
            .eq('id', existing.id);
    }
  },

  // --- LEADERBOARD ---
  getLeaderboard: async (limit: number = 50): Promise<DBUser[]> => {
    const { data, error } = await supabase
        .from('pengguna')
        .select('id, nama_lengkap, total_xp, daily_streak, learning_language, level')
        .eq('role', 'user') // Filter only normal users, not admin
        .order('total_xp', { ascending: false })
        .limit(limit);
    
    if (error) {
        console.error("Error fetching leaderboard:", error);
        return [];
    }
    return data as DBUser[];
  },

  // --- ADMIN STATS ---
  getAdminStats: async () => {
    const [users, topicsEn, topicsZh] = await Promise.all([
      supabase.from('pengguna').select('*', { count: 'exact', head: true }),
      supabase.from('topik').select('*', { count: 'exact', head: true }).eq('bahasa_id', Language.ENGLISH),
      supabase.from('topik').select('*', { count: 'exact', head: true }).eq('bahasa_id', Language.MANDARIN),
    ]);

    return {
      totalUsers: users.count || 0,
      totalEnglishTopics: topicsEn.count || 0,
      totalMandarinTopics: topicsZh.count || 0,
    };
  },

  // Get Recent Users
  getRecentUsers: async (limit: number = 5): Promise<DBUser[]> => {
    const { data, error } = await supabase
      .from('pengguna')
      .select('*')
      .order('last_login', { ascending: false })
      .limit(limit);

    if (error) {
        console.error("Error fetching recent users:", error);
        return [];
    }
    return data as DBUser[];
  },

  // --- ADMIN USER CRUD ---

  getAllUsers: async (): Promise<DBUser[]> => {
      const { data, error } = await supabase
          .from('pengguna')
          .select('*')
          .order('nama_lengkap', { ascending: true });

      if(error) throw new Error(error.message);
      return data as DBUser[];
  },

  createUserByAdmin: async (userData: Partial<DBUser> & { password?: string }): Promise<DBUser> => {
      if (!userData.email || !userData.nama_lengkap || !userData.password) {
          throw new Error("Data tidak lengkap");
      }

      // Cek duplikat email
      const { data: existing } = await supabase.from('pengguna').select('id').eq('email', userData.email).single();
      if (existing) throw new Error("Email sudah digunakan");

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = {
          nama_lengkap: userData.nama_lengkap,
          email: userData.email,
          password: hashedPassword,
          role: userData.role || 'user',
          total_xp: 0,
          level: 1,
          daily_streak: 0,
          last_login: new Date().toISOString()
      };

      const { data, error } = await supabase.from('pengguna').insert([newUser]).select().single();
      
      if (error) throw new Error(error.message);
      return data as DBUser;
  },

  updateUser: async (id: string, updates: Partial<DBUser> & { password?: string }) => {
      const dataToUpdate: any = { ...updates };
      
      // Jika password kosong, hapus dari object agar tidak terupdate menjadi string kosong/null
      if (!dataToUpdate.password) {
          delete dataToUpdate.password;
      } else {
          // Jika ada password baru, hash dulu
          const salt = await bcrypt.genSalt(10);
          dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, salt);
      }

      // Hapus properti 'id' agar tidak ikut diupdate
      delete dataToUpdate.id;

      const { error } = await supabase
          .from('pengguna')
          .update(dataToUpdate)
          .eq('id', id);

      if (error) throw new Error(error.message);
  },

  deleteUser: async (id: string) => {
      // 1. Cek Constraint: Apakah user memiliki data 'learning_language'
      const { data: user, error: fetchError } = await supabase
        .from('pengguna')
        .select('learning_language')
        .eq('id', id)
        .single();
      
      if (fetchError) throw new Error(fetchError.message);

      // 2. Cek Constraint: Apakah user memiliki data di 'progres_pengguna'
      const { count, error: countError } = await supabase
        .from('progres_pengguna')
        .select('*', { count: 'exact', head: true })
        .eq('pengguna_id', id);
      
      if (countError) throw new Error(countError.message);

      // JIKA Constraint terpenuhi (Ada bahasa atau ada progres), BLOCK delete.
      if (user.learning_language !== null || (count && count > 0)) {
          throw new Error("TIDAK BISA DIHAPUS: Pengguna ini aktif belajar (sudah memilih bahasa atau menyelesaikan topik).");
      }

      // 3. Jika aman, lakukan delete
      const { error } = await supabase.from('pengguna').delete().eq('id', id);
      if (error) throw new Error(error.message);
  },

  // --- ADMIN TOPIC CRUD ---

  adminCreateTopic: async (topic: Omit<DBTopic, 'id'>): Promise<DBTopic> => {
      // Ensure level is set (default Beginner if missing)
      const topicLevel = topic.level || 'Beginner';

      // 1. Shift existing topics if order is duplicated
      await shiftTopicsDown(topic.bahasa_id, topicLevel, topic.urutan);

      // 2. Prepare ID
      // Generate ID sederhana berbasis timestamp untuk unik, atau gunakan slug dari judul
      const slug = topic.judul_topik.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
      const prefix = topic.bahasa_id === Language.ENGLISH ? 'en' : 'zh';
      const random = Math.floor(Math.random() * 1000);
      const customId = `${prefix}-${slug}-${random}`; // e.g., en-hello-world-123

      const newTopic = {
          id: customId,
          ...topic,
          level: topicLevel
      };

      const { data, error } = await supabase
          .from('topik')
          .insert([newTopic])
          .select()
          .single();

      if (error) throw new Error(error.message);
      return data as DBTopic;
  },

  adminUpdateTopic: async (id: string, updates: Partial<DBTopic>) => {
      // If we are updating urutan or level, we need to handle shifting
      if (updates.urutan !== undefined) {
         // We need the topic's current data to know language and level
         const { data: currentTopic } = await supabase.from('topik').select('bahasa_id, level').eq('id', id).single();
         if (currentTopic) {
             const targetLevel = updates.level || currentTopic.level || 'Beginner';
             const targetLang = updates.bahasa_id || currentTopic.bahasa_id;
             
             // Check and Shift
             await shiftTopicsDown(targetLang, targetLevel, updates.urutan, id);
         }
      }

      const { error } = await supabase
          .from('topik')
          .update(updates)
          .eq('id', id);

      if (error) throw new Error(error.message);
  },

  adminDeleteTopic: async (id: string) => {
      // Check constraints
      const { count: vocabCount } = await supabase.from('kosakata').select('*', { count: 'exact', head: true }).eq('topik_id', id);
      const { count: exCount } = await supabase.from('latihan').select('*', { count: 'exact', head: true }).eq('topik_id', id);
      const { count: progCount } = await supabase.from('progres_pengguna').select('*', { count: 'exact', head: true }).eq('topik_id', id);

      if ((vocabCount && vocabCount > 0) || (exCount && exCount > 0) || (progCount && progCount > 0)) {
          throw new Error("TIDAK BISA DIHAPUS: Topik ini memiliki konten (Kosakata/Latihan) atau riwayat pengerjaan user. Hapus konten terkait terlebih dahulu.");
      }

      const { error } = await supabase.from('topik').delete().eq('id', id);
      if (error) throw new Error(error.message);
  },

  // --- ADMIN VOCABULARY CRUD ---

  adminGetVocabulary: async (topicId: string): Promise<DBVocabulary[]> => {
      const { data, error } = await supabase
          .from('kosakata')
          .select('*')
          .eq('topik_id', topicId)
          .order('id', { ascending: true });

      if (error) throw new Error(error.message);
      return data as DBVocabulary[];
  },

  adminCreateVocabulary: async (vocab: Omit<DBVocabulary, 'id'>): Promise<DBVocabulary> => {
      const { data, error } = await supabase
          .from('kosakata')
          .insert([vocab])
          .select()
          .single();
      if (error) throw new Error(error.message);
      return data as DBVocabulary;
  },

  adminUpdateVocabulary: async (id: string | number, updates: Partial<DBVocabulary>) => {
      const { error } = await supabase
          .from('kosakata')
          .update(updates)
          .eq('id', id);
      if (error) throw new Error(error.message);
  },

  adminDeleteVocabulary: async (id: string | number) => {
      const { error } = await supabase
          .from('kosakata')
          .delete()
          .eq('id', id);
      if (error) throw new Error(error.message);
  },

  // --- ADMIN EXERCISE (LATIHAN) CRUD ---

  adminGetExercises: async (topicId: string): Promise<DBExercise[]> => {
      const { data, error } = await supabase
          .from('latihan')
          .select('*')
          .eq('topik_id', topicId)
          .order('id', { ascending: true });

      if (error) throw new Error(error.message);
      return data as DBExercise[];
  },

  adminCreateExercise: async (exercise: Omit<DBExercise, 'id'>): Promise<DBExercise> => {
      const { data, error } = await supabase
          .from('latihan')
          .insert([exercise])
          .select()
          .single();
      if (error) throw new Error(error.message);
      return data as DBExercise;
  },

  adminUpdateExercise: async (id: string | number, updates: Partial<DBExercise>) => {
      const { error } = await supabase
          .from('latihan')
          .update(updates)
          .eq('id', id);
      if (error) throw new Error(error.message);
  },

  adminDeleteExercise: async (id: string | number) => {
      const { error } = await supabase
          .from('latihan')
          .delete()
          .eq('id', id);
      if (error) throw new Error(error.message);
  }

};
