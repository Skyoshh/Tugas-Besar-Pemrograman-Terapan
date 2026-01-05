
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { DBUser, DBTopic, DBVocabulary, DBExercise, DBUserProgress, Language } from '../types';

const supabaseUrl = 'https://rbjntlzmtcvlazqbcthn.supabase.co';
const supabaseKey = 'sb_publishable_G_uroxxDOYLpVyEYQdtSAw_NQfHcvh1';

if (!supabaseUrl || !supabaseKey) {
  console.warn("PERINGATAN: Supabase URL atau Key belum diset. Database tidak akan berfungsi.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const databaseService = {
  init: async () => {
    return true;
  },

  loginUser: async (email: string, password: string): Promise<DBUser> => {
    const { data, error } = await supabase
      .from('pengguna')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new Error('Email tidak ditemukan atau terjadi kesalahan.');
    }

    const user = data as DBUser;
    let isValid = false;
    
    if (user.password) {
        isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid && user.password === password) {
            isValid = true;
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(password, salt);
            await supabase.from('pengguna').update({ password: newHash }).eq('id', user.id);
        }
    }

    if (!isValid) {
      throw new Error('Kata sandi salah.');
    }

    return user;
  },

  registerUser: async (nama: string, email: string, password: string): Promise<DBUser> => {
    const { data: existingUser } = await supabase
        .from('pengguna')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        throw new Error('Email sudah terdaftar. Silakan masuk.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      nama_lengkap: nama,
      email: email,
      password: hashedPassword,
      total_xp: 0,
      level: 1,
      daily_streak: 1,
      last_login: new Date().toISOString(),
      learning_language: Language.ENGLISH
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
    const { data: user, error: fetchError } = await supabase
        .from('pengguna')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (fetchError || !user) return;
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
        const newProgress = {
            pengguna_id: userId,
            topik_id: topicId,
            status: 'completed',
            score: score,
            tanggal_selesai: timestamp
        };
        await supabase.from('progres_pengguna').insert([newProgress]);
    } else {
        await supabase
            .from('progres_pengguna')
            .update({ 
                score: score, 
                tanggal_selesai: timestamp 
            })
            .eq('id', existing.id);
    }
  }
};
