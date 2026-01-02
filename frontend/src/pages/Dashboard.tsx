import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Dataset } from '../types';
import { Upload, Play, Download, Trash2, LogOut } from 'lucide-react';

const Dashboard = () => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [datasetName, setDatasetName] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const response = await api.get('/datasets');
            setDatasets(response.data);
        } catch (err) {
            console.error('Failed to fetch datasets');
        }
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
        } catch (err) {
            alert('Export failed');
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
                    {/* Upload Panel */}
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

                    {/* List Panel */}
                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700">
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
                                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                                                <span>Uploaded on {new Date(ds.uploaded_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <div className="flex items-center gap-2 w-32">
                                                    <div className="h-2 flex-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                                                        <div
                                                            className="h-full bg-emerald-500 transition-all duration-500"
                                                            style={{ width: `${Math.min(100, (ds.labeled_count / (Math.max(1, ds.total_rows) * 5)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <span>{Math.round((ds.labeled_count / (Math.max(1, ds.total_rows) * 5)) * 100)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleExport(ds.id)}
                                                className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                                                title="Export CSV"
                                            >
                                                <Download size={20} />
                                            </button>
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
        </div>
    );
};

export default Dashboard;
