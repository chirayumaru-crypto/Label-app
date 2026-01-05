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

    useEffect(() => {
        fetchCurrentUser();
        fetchDatasets();
    }, []);

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

        if (userRole === 'admin' && datasets.length > 0) {
            // Initial fetch
            fetchAllProgress();

            // Start polling every 3 seconds for a responsive real-time admin view
            interval = setInterval(() => {
                fetchAllProgress();
                fetchDatasets();
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [userRole, datasets]); // Using datasets as dependency ensures the interval always uses the latest state

    const fetchAllProgress = async () => {
        const newMap: Record<number, UserProgress[]> = {};
        // Fetch sequentially to avoid rate limits or getting overwhelmed, or promise.all
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
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-emerald-400 bg-clip-text text-transparent">
                        Labeling Dashboard
                    </h1>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Upload Panel - Only visible to admin */}
                    {userRole === 'admin' && (
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit">
                            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Upload size={20} className="text-primary-400" />
                                Upload New Dataset
                            </h2>
                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Dataset Name</label>
                                    <input
                                        type="text"
                                        value={datasetName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDatasetName(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Eye Test Log - Batch A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* List Panel - Spans full width if not admin */}
                    <div className={`${userRole === 'admin' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-slate-800 p-6 rounded-2xl border border-slate-700`}>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Play size={20} className="text-emerald-400" />
                            Available Datasets
                        </h2>
                        <div className="space-y-4">
                            {datasets.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No datasets uploaded yet.</p>
                            ) : (
                                datasets.map((ds) => (
                                    <div key={ds.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between group hover:border-primary-500/50 transition-all">
                                        <div>
                                            <h3 className="font-semibold text-lg">{ds.name}</h3>
                                            <div className="flex flex-col gap-1 mt-1">
                                                {userRole === 'admin' && (
                                                    <span className="text-xs text-slate-500">
                                                        Uploaded on {new Date(ds.uploaded_at).toLocaleString()}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 w-48">
                                                    <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                                        <div
                                                            className="h-full bg-emerald-500 transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (ds.labeled_count / Math.max(1, ds.total_rows)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="min-w-[4rem] text-right font-mono text-[10px] text-slate-500">
                                                        {ds.labeled_count}/{ds.total_rows} ({Math.round((ds.labeled_count / Math.max(1, ds.total_rows)) * 100)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {userRole === 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(ds.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Delete Dataset"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}



                                            <button
                                                onClick={() => handleExport(ds.id)}
                                                className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                                                title="Export CSV"
                                            >
                                                <Download size={20} />
                                            </button>

                                            {/* Admin Progress ... */}
                                            {userRole === 'admin' && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === ds.id ? null : ds.id)}
                                                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-sm font-medium"
                                                    >
                                                        <Users size={16} className="text-blue-400" />
                                                        <span>{progressMap[ds.id]?.length || 0} Users</span>
                                                        <ChevronDown size={14} className={`transition-transform ${openDropdown === ds.id ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {openDropdown === ds.id && (
                                                        <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-20 overflow-hidden">
                                                            <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Progress</h4>
                                                            </div>
                                                            <div className="max-h-60 overflow-y-auto">
                                                                {progressMap[ds.id]?.length ? (
                                                                    progressMap[ds.id].map(p => (
                                                                        <button
                                                                            key={p.user_id}
                                                                            onClick={() => navigate(`/spreadsheet/${ds.id}?targetUser=${p.user_id}&userName=${encodeURIComponent(p.name)}`)}
                                                                            className="w-full text-left p-3 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                                                                        >
                                                                            <div className="flex justify-between items-center mb-1">
                                                                                <span className="font-semibold text-sm truncate">{p.name}</span>
                                                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                                                                                    {p.labeled_count}/{ds.total_rows} ({p.percentage}%)
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="bg-blue-500 h-full rounded-full transition-all"
                                                                                    style={{ width: `${p.percentage}%` }}
                                                                                />
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                ) : (
                                                                    <div className="p-4 text-center text-slate-500 text-sm">No activity yet</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}


                                            {/* Admin Progress & Review Dropdown */}
                                            <button
                                                onClick={() => navigate(`/spreadsheet/${ds.id}`)}
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20"
                                            >
                                                <Play size={18} fill="currentColor" />
                                                Start Labeling
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
