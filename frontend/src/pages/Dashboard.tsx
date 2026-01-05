import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Dataset, UserProgress } from '../types';
import { Upload, Play, Download, Trash2, LogOut, ChevronDown, Users } from 'lucide-react';

const Dashboard = () => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [datasetName, setDatasetName] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const [userRole, setUserRole] = useState<string>('');
    const [progressMap, setProgressMap] = useState<Record<number, UserProgress[]>>({});
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const init = async () => {
            await fetchCurrentUser();
            await fetchDatasets();
        };
        init();
    }, []);

    const filteredDatasets = datasets.filter(ds =>
        ds.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchCurrentUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUserRole(response.data.role);
        } catch (err) {
            console.error('Failed to fetch user info');
        }
    };

    const fetchDatasets = async () => {
        try {
            const response = await api.get('/datasets');
            setDatasets(response.data);
        } catch (err) {
            console.error('Failed to fetch datasets');
        }
    };

    useEffect(() => {
        let interval: any;

        if (userRole === 'admin') {
            fetchAllProgress();
            fetchDatasets();
            interval = setInterval(() => {
                fetchAllProgress();
                fetchDatasets();
            }, 5000);
        } else if (userRole === 'labeler') {
            interval = setInterval(() => {
                fetchDatasets();
            }, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [userRole, datasets.length]);

    const fetchAllProgress = async () => {
        const newMap: Record<number, UserProgress[]> = {};
        await Promise.all(datasets.map(async (ds) => {
            try {
                const res = await api.get(`/spreadsheet/${ds.id}/progress`);
                newMap[ds.id] = res.data;
            } catch (e) {
                console.error(`Failed to fetch progress for ${ds.id}`);
            }
        }));
        setProgressMap(newMap);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !datasetName) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', datasetName);

        try {
            await api.post(`/datasets/upload?name=${encodeURIComponent(datasetName)}`, formData);
            setDatasetName('');
            setFile(null);
            fetchDatasets();
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Upload failed';
            alert(message);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleExport = async (id: number) => {
        try {
            const response = await api.get(`/export/labeled_csv?dataset_id=${id}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dataset_${id}_labeled.csv`);
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this dataset? This cannot be undone.')) return;
        try {
            await api.delete(`/datasets/${id}`);
            fetchDatasets();
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Delete failed';
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div className="flex items-end gap-4">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">
                            Labeling Dashboard
                        </h1>
                        {userRole === 'admin' && (
                            <span className="text-slate-500 mb-1 font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700 text-sm">
                                {datasets.length} Total Datasets
                            </span>
                        )}
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {userRole === 'admin' && (
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl self-start">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Upload size={20} className="text-primary-400" /> Upload New Dataset
                            </h2>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Dataset Name</label>
                                    <input type="text" value={datasetName} onChange={(e) => setDatasetName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter dataset name" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">CSV File</label>
                                    <input type="file" accept=".csv" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-500" required />
                                </div>
                                <button type="submit" disabled={uploading} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50">
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className={`${userRole === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-800 p-6 rounded-2xl border border-slate-700`}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Play size={20} className="text-emerald-400" /> Available Datasets
                            </h2>
                            <input type="text" placeholder="Search datasets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]" />
                        </div>

                        <div className="space-y-4">
                            {filteredDatasets.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">{searchTerm ? 'No datasets matching search.' : 'No datasets uploaded yet.'}</p>
                            ) : (
                                filteredDatasets.map((ds) => {
                                    const progress = (ds.labeled_count / Math.max(1, ds.total_rows)) * 100;
                                    return (
                                        <div key={ds.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between group hover:border-primary-500/50 transition-all">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <h3 className="font-semibold text-lg truncate">{ds.name}</h3>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2 w-32">
                                                        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500">{Math.round(progress)}%</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">{ds.labeled_count}/{ds.total_rows} rows</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {userRole === 'admin' && (
                                                    <>
                                                        <button onClick={() => handleDelete(ds.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                        <button onClick={() => handleExport(ds.id)} className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"><Download size={18} /></button>
                                                        <div className="relative">
                                                            <button onClick={() => setOpenDropdown(openDropdown === ds.id ? null : ds.id)} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-[11px] font-medium">
                                                                <Users size={14} className="text-blue-400" />
                                                                <span>{progressMap[ds.id]?.length || 0}</span>
                                                                <ChevronDown size={12} className={openDropdown === ds.id ? 'rotate-180' : ''} />
                                                            </button>
                                                            {openDropdown === ds.id && (
                                                                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                                    <div className="max-h-48 overflow-y-auto">
                                                                        {progressMap[ds.id]?.length ? progressMap[ds.id].map(p => (
                                                                            <button key={p.user_id} onClick={() => navigate(`/spreadsheet/${ds.id}?targetUser=${p.user_id}&userName=${encodeURIComponent(p.name)}`)} className="w-full text-left p-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0">
                                                                                <div className="flex justify-between items-center mb-1"><span className="font-semibold text-xs truncate">{p.name}</span><span className="text-[10px] text-blue-400">{p.percentage}%</span></div>
                                                                                <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden"><div className="bg-blue-500 h-full transition-all" style={{ width: `${p.percentage}%` }} /></div>
                                                                            </button>
                                                                        )) : <div className="p-3 text-center text-slate-500 text-[11px]">No activity</div>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                <button onClick={() => navigate(`/spreadsheet/${ds.id}`)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-900/20">
                                                    <Play size={16} fill="currentColor" /> Start
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
