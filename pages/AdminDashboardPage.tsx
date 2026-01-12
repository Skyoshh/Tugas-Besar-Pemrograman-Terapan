
import React, { useEffect, useState } from 'react';
import { useUser } from '../hooks/useUser';
import { Navigate, useNavigate } from 'react-router-dom';
import { databaseService } from '../services/database';
import { DBUser, DBTopic, DBVocabulary, Language } from '../types';
import { 
    HomeIcon, 
    UserGroupIcon, 
    BookOpenIcon, 
    ArrowRightOnRectangleIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ListBulletIcon
} from '../components/icons';

// --- SUB-COMPONENTS ---

// 1. Sidebar Component
const Sidebar: React.FC<{ 
    activeTab: 'dashboard' | 'users' | 'courses', 
    setActiveTab: (tab: 'dashboard' | 'users' | 'courses') => void,
    onLogout: () => void 
}> = ({ activeTab, setActiveTab, onLogout }) => {
    const getLinkClass = (tabName: string) => `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors w-full text-left ${activeTab === tabName ? 'bg-green-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`;

    return (
        <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <span className="text-3xl">🐼</span>
                <h1 className="text-lg font-bold tracking-wider">BAHASA BUDDY<br/><span className="text-xs text-gray-400 font-normal">ADMIN PANEL</span></h1>
            </div>
            
            <nav className="flex-1 py-6 px-3 space-y-1">
                <button onClick={() => setActiveTab('dashboard')} className={getLinkClass('dashboard')}>
                    <HomeIcon className="w-5 h-5" />
                    Dashboard
                </button>
                <button onClick={() => setActiveTab('users')} className={getLinkClass('users')}>
                    <UserGroupIcon className="w-5 h-5" />
                    Pengguna
                </button>
                 <button onClick={() => setActiveTab('courses')} className={getLinkClass('courses')}>
                    <BookOpenIcon className="w-5 h-5" />
                    Manajemen Topik
                </button>
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button 
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors"
                >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Keluar
                </button>
            </div>
        </aside>
    );
};

// 2. SVG Donut Chart Component
const DonutChart: React.FC<{ english: number, mandarin: number }> = ({ english, mandarin }) => {
    const total = english + mandarin || 1;
    const englishPercentage = (english / total) * 100;
    
    const size = 160;
    const strokeWidth = 25;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((englishPercentage / 100) * circumference);

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
                    {/* Background Circle (Mandarin/Sisa) */}
                    <circle 
                        cx={size/2} cy={size/2} r={radius} 
                        fill="transparent" 
                        stroke="#fef08a" // yellow-200
                        strokeWidth={strokeWidth} 
                    />
                    {}
                    <circle 
                        cx={size/2} cy={size/2} r={radius} 
                        fill="transparent" 
                        stroke="#f87171" // red-400 (using red for English as in previous flag logic or switch to blue) - Let's use Red for UK, Yellow for China based on flags
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-2xl font-bold text-gray-700">{total}</span>
                    <span className="text-xs text-gray-500">Total Topik</span>
                </div>
            </div>
            
            <div className="flex gap-4 mt-6">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">Inggris ({Math.round(englishPercentage)}%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-200 rounded-full"></div>
                    <span className="text-sm text-gray-600">Mandarin ({Math.round(100 - englishPercentage)}%)</span>
                </div>
            </div>
        </div>
    );
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset hours to get pure day difference
    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getUserStatus = (user: DBUser) => {
    if (user.role === 'admin') {
        return { label: 'Admin', color: 'bg-gray-800 text-white' };
    }
    // Default semua non-admin menjadi 'User'
    return { label: 'User', color: 'bg-green-100 text-green-700' };
};

// --- VOCABULARY MANAGEMENT MODAL ---
const VocabularyManagerModal: React.FC<{
    topic: DBTopic;
    onClose: () => void;
}> = ({ topic, onClose }) => {
    const [vocabList, setVocabList] = useState<DBVocabulary[]>([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState<number | string | null>(null);
    const [formData, setFormData] = useState({ indonesian: '', target_word: '', pinyin: '' });
    
    // Notification State
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    
    // Delete Confirmation State
    const [vocabToDelete, setVocabToDelete] = useState<DBVocabulary | null>(null);

    const isMandarin = topic.bahasa_id === Language.MANDARIN;

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchVocab = async () => {
        setLoading(true);
        try {
            const data = await databaseService.adminGetVocabulary(topic.id);
            setVocabList(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVocab();
    }, [topic]);

    const handleEdit = (vocab: DBVocabulary) => {
        setEditMode(vocab.id || null);
        setFormData({ 
            indonesian: vocab.indonesian, 
            target_word: vocab.target_word, 
            pinyin: vocab.pinyin || '' 
        });
    };

    const handleCancelEdit = () => {
        setEditMode(null);
        setFormData({ indonesian: '', target_word: '', pinyin: '' });
    };

    // Open Delete Confirmation
    const handleDeleteClick = (vocab: DBVocabulary) => {
        setVocabToDelete(vocab);
    };

    // Execute Delete
    const executeDelete = async () => {
        if (!vocabToDelete || !vocabToDelete.id) return;
        
        try {
            await databaseService.adminDeleteVocabulary(vocabToDelete.id);
            showNotification('Kosakata berhasil dihapus', 'success');
            setVocabToDelete(null);
            fetchVocab();
        } catch (e: any) {
            showNotification(e.message || 'Gagal menghapus kosakata', 'error');
            setVocabToDelete(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editMode) {
                await databaseService.adminUpdateVocabulary(editMode, {
                    ...formData,
                    topik_id: topic.id
                });
                showNotification('Kosakata berhasil diperbarui', 'success');
            } else {
                await databaseService.adminCreateVocabulary({
                    topik_id: topic.id,
                    ...formData
                });
                showNotification('Kosakata baru berhasil ditambahkan', 'success');
            }
            handleCancelEdit();
            fetchVocab();
        } catch (e: any) {
            showNotification(e.message || 'Terjadi kesalahan', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-slide-up relative">
                
                {}
                {notification && (
                    <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-slide-up ${notification.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                        {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5"/>}
                        <span className="text-sm font-bold">{notification.message}</span>
                    </div>
                )}

                {}
                {vocabToDelete && (
                    <div className="absolute inset-0 z-[70] bg-white/90 backdrop-blur-sm flex items-center justify-center p-4 transition-all">
                        <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center transform scale-100 animate-fade-in">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <TrashIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-800 mb-1">Hapus Kosakata?</h4>
                            <p className="text-sm text-gray-500 mb-4">
                                Apakah Anda yakin ingin menghapus <span className="font-bold text-gray-800">"{vocabToDelete.indonesian}"</span>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button 
                                    onClick={() => setVocabToDelete(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={executeDelete}
                                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {}
                <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             <BookOpenIcon className="w-6 h-6 text-green-600"/>
                             Manajemen Kosakata
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Topik: <span className="font-bold text-gray-700">{topic.judul_topik}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {}
                    <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
                        <h4 className="font-bold text-gray-700 mb-4">{editMode ? 'Edit Kosakata' : 'Tambah Kosakata Baru'}</h4>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bahasa Indonesia</label>
                                <input 
                                    type="text" required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    placeholder="Contoh: Selamat Pagi"
                                    value={formData.indonesian}
                                    onChange={e => setFormData({...formData, indonesian: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {isMandarin ? 'Hanzi (Karakter)' : 'Bahasa Inggris'}
                                </label>
                                <input 
                                    type="text" required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    placeholder={isMandarin ? "你好" : "Good Morning"}
                                    value={formData.target_word}
                                    onChange={e => setFormData({...formData, target_word: e.target.value})}
                                />
                            </div>
                            {isMandarin && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pinyin</label>
                                    <input 
                                        type="text" required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                        placeholder="nǐ hǎo"
                                        value={formData.pinyin}
                                        onChange={e => setFormData({...formData, pinyin: e.target.value})}
                                    />
                                </div>
                            )}
                            
                            <div className="pt-4 flex gap-2">
                                {editMode && (
                                    <button 
                                        type="button" 
                                        onClick={handleCancelEdit}
                                        className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
                                    >
                                        Batal
                                    </button>
                                )}
                                <button 
                                    type="submit" 
                                    className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                                >
                                    {editMode ? 'Simpan' : 'Tambah'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {}
                    <div className="flex-1 bg-white p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-700">Daftar Kosakata ({vocabList.length})</h4>
                        </div>
                        
                        {loading ? (
                            <p className="text-center text-gray-400 py-10">Memuat...</p>
                        ) : vocabList.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                                <p className="text-gray-400">Belum ada kosakata.</p>
                                <p className="text-sm text-gray-400">Gunakan formulir di kiri untuk menambah.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-100 text-gray-700 font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Indonesia</th>
                                            <th className="px-4 py-3">{isMandarin ? 'Hanzi' : 'Inggris'}</th>
                                            {isMandarin && <th className="px-4 py-3">Pinyin</th>}
                                            <th className="px-4 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {vocabList.map(v => (
                                            <tr key={v.id} className="hover:bg-gray-50 group">
                                                <td className="px-4 py-3 font-medium text-gray-800">{v.indonesian}</td>
                                                <td className="px-4 py-3 text-green-700 font-bold">{v.target_word}</td>
                                                {isMandarin && <td className="px-4 py-3 text-gray-500 font-mono">{v.pinyin}</td>}
                                                <td className="px-4 py-3 flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(v)} className="text-blue-500 hover:text-blue-700 p-1">
                                                        <PencilSquareIcon className="w-4 h-4"/>
                                                    </button>
                                                    <button onClick={() => handleDeleteClick(v)} className="text-red-500 hover:text-red-700 p-1">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- USER MANAGEMENT VIEW (CRUD) ---
const UserManagementView: React.FC = () => {
    const [users, setUsers] = useState<DBUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Form Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<Partial<DBUser> | null>(null);
    const [formData, setFormData] = useState({ nama_lengkap: '', email: '', role: 'user', password: '' });
    const [formError, setFormError] = useState('');

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<DBUser | null>(null);
    
    // Notification State
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await databaseService.getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenAdd = () => {
        setCurrentUser(null);
        setFormData({ nama_lengkap: '', email: '', role: 'user', password: '' });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (user: DBUser) => {
        setCurrentUser(user);
        setFormData({ 
            nama_lengkap: user.nama_lengkap, 
            email: user.email, 
            role: user.role || 'user', 
            password: ''
        });
        setFormError('');
        setIsModalOpen(true);
    };

    // Open Confirmation Modal
    const handleClickDelete = (user: DBUser) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    // Execute Delete
    const executeDelete = async () => {
        if (!userToDelete) return;
        
        try {
            await databaseService.deleteUser(userToDelete.id);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchUsers();
            showNotification('Pengguna berhasil dihapus', 'success');
        } catch (e: any) {
            setIsDeleteModalOpen(false);
            showNotification(e.message, 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        
        try {
            if (currentUser && currentUser.id) {
                // Update
                await databaseService.updateUser(currentUser.id, {
                    nama_lengkap: formData.nama_lengkap,
                    email: formData.email,
                    role: formData.role as 'user' | 'admin',
                    password: formData.password || undefined
                });
                showNotification('Data pengguna berhasil diperbarui', 'success');
            } else {
                // Create
                if (!formData.password) {
                    setFormError('Password wajib diisi untuk pengguna baru.');
                    return;
                }
                await databaseService.createUserByAdmin({
                    nama_lengkap: formData.nama_lengkap,
                    email: formData.email,
                    role: formData.role as 'user' | 'admin',
                    password: formData.password
                });
                showNotification('Pengguna baru berhasil ditambahkan', 'success');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (e: any) {
            setFormError(e.message || 'Terjadi kesalahan.');
            showNotification('Gagal menyimpan data', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {}
            {notification && (
                <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform duration-300 animate-slide-up ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {notification.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                    <div>
                        <p className="font-bold text-sm">{notification.type === 'success' ? 'Berhasil' : 'Gagal'}</p>
                        <p className="text-sm opacity-90">{notification.message}</p>
                    </div>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100 p-1">
                        <span className="text-xl font-bold">&times;</span>
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Daftar Pengguna</h3>
                <button 
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Tambah Pengguna
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Nama</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">XP</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center">Memuat...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center">Tidak ada data.</td></tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">{user.nama_lengkap}</td>
                                        <td className="px-6 py-3">{user.email}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-gray-800 text-white' : 'bg-green-100 text-green-800'}`}>
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 font-mono">{user.total_xp}</td>
                                        <td className="px-6 py-3 flex justify-center gap-2">
                                            <button onClick={() => handleOpenEdit(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                                                <PencilSquareIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleClickDelete(user)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {currentUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    value={formData.nama_lengkap}
                                    onChange={e => setFormData({...formData, nama_lengkap: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select 
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    value={formData.role}
                                    onChange={e => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password {currentUser && <span className="text-gray-400 font-normal">(Kosongkan jika tidak diubah)</span>}
                                </label>
                                <input 
                                    type="password" 
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    placeholder={currentUser ? "••••••••" : ""}
                                />
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up transform transition-all">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrashIcon className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Pengguna?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Apakah Anda yakin ingin menghapus pengguna <span className="font-bold text-gray-800">"{userToDelete.nama_lengkap}"</span>? 
                                <br/><br/>
                                <span className="text-red-500 text-xs">
                                    Catatan: Pengguna yang sudah memiliki data aktif (Bahasa/Latihan) tidak dapat dihapus demi integritas data.
                                </span>
                            </p>
                            
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={executeDelete}
                                    className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md transition-colors"
                                >
                                    Ya, Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COURSE MANAGEMENT VIEW (CRUD) ---
const CourseManagementView: React.FC = () => {
    const [topics, setTopics] = useState<DBTopic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeLang, setActiveLang] = useState<Language>(Language.ENGLISH);

    // Form Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<DBTopic | null>(null);
    const [formData, setFormData] = useState({
        judul_topik: '',
        deskripsi: '',
        urutan: 1,
        xp_reward: 10,
        icon: '📚'
    });
    const [formError, setFormError] = useState('');

    // Vocab Modal State
    const [selectedTopicForVocab, setSelectedTopicForVocab] = useState<DBTopic | null>(null);

    // Delete Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [topicToDelete, setTopicToDelete] = useState<DBTopic | null>(null);

    // Notification
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchTopics = async () => {
        setIsLoading(true);
        try {
            const data = await databaseService.getTopicsByLanguage(activeLang);
            setTopics(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, [activeLang]);

    const handleOpenAdd = () => {
        setCurrentTopic(null);
        const nextOrder = topics.length > 0 ? (Math.max(...topics.map(t => t.urutan)) + 1) : 1;
        setFormData({
            judul_topik: '',
            deskripsi: '',
            urutan: nextOrder,
            xp_reward: 10,
            icon: '📚'
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (topic: DBTopic) => {
        setCurrentTopic(topic);
        setFormData({
            judul_topik: topic.judul_topik,
            deskripsi: topic.deskripsi,
            urutan: topic.urutan,
            xp_reward: topic.xp_reward,
            icon: topic.icon
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleClickDelete = (topic: DBTopic) => {
        setTopicToDelete(topic);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!topicToDelete) return;
        try {
            await databaseService.adminDeleteTopic(topicToDelete.id);
            setIsDeleteModalOpen(false);
            setTopicToDelete(null);
            fetchTopics();
            showNotification('Topik berhasil dihapus', 'success');
        } catch (e: any) {
            setIsDeleteModalOpen(false);
            showNotification(e.message, 'error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        try {
            if (currentTopic) {
                // Update
                await databaseService.adminUpdateTopic(currentTopic.id, {
                    ...formData
                });
                showNotification('Topik diperbarui', 'success');
            } else {
                // Create
                await databaseService.adminCreateTopic({
                    bahasa_id: activeLang,
                    ...formData
                });
                showNotification('Topik baru ditambahkan', 'success');
            }
            setIsModalOpen(false);
            fetchTopics();
        } catch (e: any) {
            setFormError(e.message);
            showNotification('Gagal menyimpan topik', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {notification && (
                <div className={`fixed top-6 right-6 z-[60] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all transform duration-300 animate-slide-up ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {notification.type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                    <div>
                        <p className="font-bold text-sm">{notification.type === 'success' ? 'Berhasil' : 'Gagal'}</p>
                        <p className="text-sm opacity-90">{notification.message}</p>
                    </div>
                    <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100 p-1">
                        <span className="text-xl font-bold">&times;</span>
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800">Daftar Topik</h3>
                <div className="flex bg-gray-200 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveLang(Language.ENGLISH)}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeLang === Language.ENGLISH ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Inggris 🇬🇧
                    </button>
                    <button 
                         onClick={() => setActiveLang(Language.MANDARIN)}
                         className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeLang === Language.MANDARIN ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Mandarin 🇨🇳
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    Tambah Topik Baru
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 w-16">Urutan</th>
                                <th className="px-6 py-4 w-16">Icon</th>
                                <th className="px-6 py-4">Judul Topik</th>
                                <th className="px-6 py-4">Deskripsi Singkat</th>
                                <th className="px-6 py-4 w-24">XP</th>
                                <th className="px-6 py-4 text-center w-40">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center">Memuat...</td></tr>
                            ) : topics.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center">Belum ada topik untuk bahasa ini.</td></tr>
                            ) : (
                                topics.map(topic => (
                                    <tr key={topic.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-mono font-bold text-gray-400">#{topic.urutan}</td>
                                        <td className="px-6 py-3 text-2xl">{topic.icon}</td>
                                        <td className="px-6 py-3 font-bold text-gray-800">{topic.judul_topik}</td>
                                        <td className="px-6 py-3 text-gray-500 truncate max-w-xs">{topic.deskripsi}</td>
                                        <td className="px-6 py-3 font-bold text-yellow-600">{topic.xp_reward}</td>
                                        <td className="px-6 py-3 flex justify-center gap-2">
                                            <button onClick={() => setSelectedTopicForVocab(topic)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Kelola Kosakata">
                                                <ListBulletIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleOpenEdit(topic)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Topik">
                                                <PencilSquareIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleClickDelete(topic)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus Topik">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800">
                                {currentTopic ? 'Edit Topik' : `Tambah Topik (${activeLang === Language.ENGLISH ? 'Inggris' : 'Mandarin'})`}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                                    {formError}
                                </div>
                            )}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Judul Topik</label>
                                    <input 
                                        type="text" required 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                        value={formData.judul_topik}
                                        onChange={e => setFormData({...formData, judul_topik: e.target.value})}
                                        placeholder="Misal: Perkenalan"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                                    <input 
                                        type="text" required maxLength={4}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500 text-center text-xl"
                                        value={formData.icon}
                                        onChange={e => setFormData({...formData, icon: e.target.value})}
                                        placeholder="👋"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
                                <textarea 
                                    required rows={2}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                    value={formData.deskripsi}
                                    onChange={e => setFormData({...formData, deskripsi: e.target.value})}
                                    placeholder="Apa yang akan dipelajari?"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                                    <input 
                                        type="number" required min={1}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                        value={formData.urutan}
                                        onChange={e => setFormData({...formData, urutan: parseInt(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward</label>
                                    <input 
                                        type="number" required min={1}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-green-500 focus:border-green-500"
                                        value={formData.xp_reward}
                                        onChange={e => setFormData({...formData, xp_reward: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {}
            {selectedTopicForVocab && (
                <VocabularyManagerModal 
                    topic={selectedTopicForVocab} 
                    onClose={() => setSelectedTopicForVocab(null)} 
                />
            )}

            {}
            {isDeleteModalOpen && topicToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
                         <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrashIcon className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Topik?</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Apakah Anda yakin ingin menghapus topik <span className="font-bold text-gray-800">"{topicToDelete.judul_topik}"</span>?
                                <br/><br/>
                                <span className="text-red-500 text-xs">
                                    Catatan: Topik tidak dapat dihapus jika sudah memiliki Latihan, Kosakata, atau Riwayat Pengerjaan siswa.
                                </span>
                            </p>
                            
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200">Batal</button>
                                <button onClick={executeDelete} className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 shadow-md">Ya, Hapus</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- DASHBOARD VIEW ---
const DashboardOverview: React.FC<{ 
    stats: { totalUsers: number, totalEnglishTopics: number, totalMandarinTopics: number },
    recentUsers: DBUser[],
    loadingData: boolean
}> = ({ stats, recentUsers, loadingData }) => {
    return (
        <div className="space-y-8 animate-fade-in">
             {}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Pengguna</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{loadingData ? '-' : stats.totalUsers}</h3>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-full">
                        <UserGroupIcon className="w-6 h-6 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                         <p className="text-gray-500 text-sm font-medium">Topik Bahasa Inggris</p>
                         <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{loadingData ? '-' : stats.totalEnglishTopics}</h3>
                    </div>
                    <div className="p-4 bg-red-50 rounded-full">
                        <span className="text-2xl">🇬🇧</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Topik Bahasa Mandarin</p>
                        <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{loadingData ? '-' : stats.totalMandarinTopics}</h3>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-full">
                         <span className="text-2xl">🇨🇳</span>
                    </div>
                </div>
            </div>

            {}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Aktivitas Terbaru</h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Nama</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Terakhir Login</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                               {loadingData ? (
                                   <tr>
                                       <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Memuat data pengguna...</td>
                                   </tr>
                               ) : recentUsers.length === 0 ? (
                                   <tr>
                                       <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada pengguna terdaftar.</td>
                                   </tr>
                               ) : (
                                   recentUsers.map((usr) => {
                                       const status = getUserStatus(usr);
                                       return (
                                         <tr key={usr.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-gray-800 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {usr.nama_lengkap.charAt(0).toUpperCase()}
                                                </div>
                                                {usr.nama_lengkap}
                                            </td>
                                            <td className="px-6 py-3">{usr.email}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">{formatDate(usr.last_login)}</td>
                                        </tr>
                                       );
                                   })
                               )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
                    <h3 className="font-bold text-gray-800 mb-6 text-center">Distribusi Konten</h3>
                    <DonutChart 
                        english={stats.totalEnglishTopics} 
                        mandarin={stats.totalMandarinTopics} 
                    />
                </div>
            </div>
        </div>
    );
}

// --- MAIN PAGE ---

const AdminDashboardPage: React.FC = () => {
  const { user, isLoading, logout } = useUser();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'courses'>('dashboard');

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEnglishTopics: 0,
    totalMandarinTopics: 0
  });
  const [recentUsers, setRecentUsers] = useState<DBUser[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoadingData(true);
      try {
        const [statsData, usersData] = await Promise.all([
             databaseService.getAdminStats(),
             databaseService.getRecentUsers(5)
        ]);
        setStats(statsData);
        setRecentUsers(usersData);
      } catch (error) {
        console.error("Gagal memuat data admin", error);
      } finally {
        setLoadingData(false);
      }
    };
    
    if (user?.role === 'admin' && activeTab === 'dashboard') {
      fetchAdminData();
    }
  }, [user, activeTab]);

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  if (isLoading) return <div className="p-8 text-center">Memuat...</div>;
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {}
      <div className="flex-1 ml-64 flex flex-col">
        
        {}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 capitalize">
                {activeTab === 'dashboard' && 'Overview'}
                {activeTab === 'users' && 'Manajemen Pengguna'}
                {activeTab === 'courses' && 'Manajemen Topik'}
            </h2>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-700">{user.nama_lengkap}</p>
                    <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">Administrator</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold border border-green-200">
                    {user.nama_lengkap.charAt(0)}
                </div>
            </div>
        </header>

        {}
        <main className="flex-1 p-8 overflow-y-auto">
            {activeTab === 'dashboard' && (
                <DashboardOverview stats={stats} recentUsers={recentUsers} loadingData={loadingData} />
            )}
            
            {activeTab === 'users' && (
                <UserManagementView />
            )}

            {activeTab === 'courses' && (
                <CourseManagementView />
            )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardPage;