import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDatasets, createDataset, deleteDataset, signOut, exportDataset, getDatasetCompletionStatus } from '../services/api';
import { supabase } from '../supabase';
import { Dataset, UserProgress } from '../types';
import { Upload, Play, Download, Trash2, LogOut, ChevronDown, Users, Eye } from 'lucide-react';

const Dashboard = () => {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [datasetName, setDatasetName] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('');
    const [progressMap, setProgressMap] = useState<Record<number, UserProgress[]>>({});
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [completionStatus, setCompletionStatus] = useState<Record<number, { completedUsers: number; userProgress: any[] }>>({});

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            // Assuming role is stored in user_metadata
            if (user?.user_metadata?.role) {
                setUserRole(user.user_metadata.role);
            } else if (user) {
                // Default to 'labeler' if no role is set
                setUserRole('labeler');
            }
        };
        getUser();
    }, []);

    useEffect(() => {
        if (user) {
            fetchDatasets();
        }
    }, [user]);

    const filteredDatasets = datasets.filter(ds =>
        ds.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const fetchDatasets = async () => {
        try {
            const { data, error } = await getDatasets();
            if (error) throw error;
            if (data) {
                // Fetch completion status for each dataset
                const completionStatusMap: Record<number, { completedUsers: number; userProgress: any[] }> = {};
                
                for (const dataset of data) {
                    const status = await getDatasetCompletionStatus(dataset.id);
                    if (!status.error) {
                        completionStatusMap[dataset.id] = {
                            completedUsers: status.completedUsers,
                            userProgress: status.userProgress || []
                        };
                    }
                }
                
                setCompletionStatus(completionStatusMap);
                
                // Filter datasets: show only those with less than 5 completed users
                const filteredData = data.filter((d: any) => {
                    const status = completionStatusMap[d.id];
                    return !status || status.completedUsers < 5;
                });
                
                const datasetsWithDefaults = filteredData.map((d: any) => {
                    const status = completionStatusMap[d.id];
                    // Calculate current user's progress if they've labeled this dataset
                    let labeledCount = d.labeled_count || 0;
                    let progressPercentage = 0;
                    
                    if (status && user) {
                        const userProg = status.userProgress.find((p: any) => p.user_id === user.id);
                        if (userProg) {
                            labeledCount = userProg.labeled_count;
                            progressPercentage = userProg.percentage;
                        }
                    }
                    
                    return { 
                        ...d, 
                        total_rows: d.total_rows || 100, 
                        labeled_count: labeledCount,
                        progress_percentage: progressPercentage
                    };
                });
                setDatasets(datasetsWithDefaults as any);
            }
        } catch (err) {
            console.error('Failed to fetch datasets');
        }
    };

    useEffect(() => {
        let interval: any;

        if (userRole === 'admin') {
            // fetchAllProgress(); // This needs to be adapted for Supabase
            fetchDatasets();
            interval = setInterval(() => {
                // fetchAllProgress();
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
        // This function needs to be re-implemented with Supabase
        console.log("Fetching progress is not implemented for Supabase yet.");
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !datasetName) return;

        setUploading(true);
        
        try {
            // 1. Create dataset entry
            const { data: datasetData, error: datasetError } = await createDataset(datasetName);
            if (datasetError) throw datasetError;
            if (!datasetData) {
                throw new Error("Could not create dataset");
            }

            const newDataset = (Array.isArray(datasetData) ? datasetData[0] : datasetData) as any;

            // 2. Upload file to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('datasets')
                .upload(`${newDataset.id}/${file.name}`, file);

            if (uploadError) {
                // If upload fails, delete the dataset entry
                await deleteDataset(newDataset.id);
                throw uploadError;
            }

            // 3. Parse CSV and insert data into spreadsheet_data table
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const compareColumns = ['r_sph', 'r_cyl', 'r_axis', 'r_add', 'l_sph', 'l_cyl', 'l_axis', 'l_add', 'pd', 'chart_number', 'occluder_state', 'chart_display'];
            
            const allRows = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const rowData: any = { 
                    id: i,
                    substep: '',
                    intent_of_optum: '',
                    confidence_of_optum: '',
                    patient_confidence_score: '',  // Always empty for user to fill
                    flag: '',
                    reason_for_flag: ''
                };
                headers.forEach((header, index) => {
                    // Don't copy patient_confidence_score from CSV, keep it empty
                    if (header !== 'patient_confidence_score') {
                        rowData[header] = values[index]?.trim() || '';
                    }
                });
                
                // Skip rows where all compare columns are blank
                const allBlank = compareColumns.every(col => 
                    !rowData[col] || rowData[col] === ''
                );
                
                if (!allBlank) {
                    allRows.push(rowData);
                }
            }

            // Remove duplicate adjacent rows based on compare columns
            const rows = [];
            let rowId = 1;
            for (let i = 0; i < allRows.length; i++) {
                if (i === 0) {
                    allRows[i].id = rowId++;
                    rows.push({
                        dataset_id: newDataset.id,
                        data: allRows[i]
                    });
                } else {
                    const current = allRows[i];
                    const previous = allRows[i - 1];
                    
                    // Check if all compare columns are the same
                    const isDuplicate = compareColumns.every(col => 
                        current[col] === previous[col]
                    );
                    
                    if (!isDuplicate) {
                        current.id = rowId++;
                        rows.push({
                            dataset_id: newDataset.id,
                            data: current
                        });
                    }
                }
            }

            // Insert in batches to avoid timeout
            const batchSize = 100;
            for (let i = 0; i < rows.length; i += batchSize) {
                const batch = rows.slice(i, i + batchSize);
                const { error: insertError } = await supabase
                    .from('spreadsheet_data')
                    .insert(batch);
                
                if (insertError) {
                    console.error('Insert error:', insertError);
                    throw insertError;
                }
            }

            // Update total_rows in dataset
            await supabase
                .from('datasets')
                .update({ total_rows: rows.length })
                .eq('id', newDataset.id);

            setDatasetName('');
            setFile(null);
            alert(`Dataset uploaded successfully! ${rows.length} rows imported.`);
            fetchDatasets();
        } catch (err: any) {
            const message = err.message || 'Upload failed';
            alert(message);
        } finally {
            setUploading(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleExport = async (id: number, userId?: string) => {
        try {
            const { data, error } = await exportDataset(id, 'csv', userId);
            if (error) throw error;
            if (data) {
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                const userSuffix = userId ? `_user_${userId.substring(0, 8)}` : '';
                link.setAttribute('download', `dataset_${id}${userSuffix}_labeled.csv`);
                document.body.appendChild(link);
                link.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (err) {
            alert('Export failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this dataset? This cannot be undone.')) return;
        try {
            const { error } = await deleteDataset(id);
            if (error) throw error;
            fetchDatasets();
        } catch (err: any) {
            const message = err.message || 'Delete failed';
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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate('/view-labels')} 
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                        >
                            <Eye size={18} /> View Labeled Data
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700">
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
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
                                    const progress = ds.progress_percentage || (ds.labeled_count / Math.max(1, ds.total_rows)) * 100;
                                    const status = completionStatus[ds.id];
                                    const completedUsers = status?.completedUsers || 0;
                                    const totalUsers = status?.userProgress?.length || 0;
                                    
                                    return (
                                        <div key={ds.id} className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center justify-between group hover:border-primary-500/50 transition-all">
                                            <div className="flex-1 min-w-0 mr-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg truncate">{ds.name}</h3>
                                                    {completedUsers > 0 && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-700">
                                                            {completedUsers}/5 completed
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2 w-32">
                                                        <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500">{Math.round(progress)}%</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">{ds.labeled_count}/{ds.total_rows} rows</span>
                                                    {totalUsers > 0 && (
                                                        <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                                            <Users size={10} /> {totalUsers} user{totalUsers > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* View Labels Button - visible to all users */}
                                                <button 
                                                    onClick={() => navigate(`/view-labels?datasetId=${ds.id}`)} 
                                                    className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-lg transition-colors"
                                                    title="View labeled data"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                
                                                {/* Download Labeled Data - visible to all users */}
                                                <button 
                                                    onClick={() => handleExport(ds.id)} 
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                                    title="Download labeled data"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                
                                                {userRole === 'admin' && (
                                                    <>
                                                        <button onClick={() => handleDelete(ds.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                                        
                                                        {/* User Versions Dropdown */}
                                                        <div className="relative">
                                                            <button 
                                                                onClick={() => setOpenDropdown(openDropdown === ds.id ? null : ds.id)} 
                                                                className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-[11px] font-medium"
                                                            >
                                                                <Users size={14} className="text-blue-400" />
                                                                <span>{progressMap[ds.id]?.length || 0}</span>
                                                                <ChevronDown size={12} className={openDropdown === ds.id ? 'rotate-180' : ''} />
                                                            </button>
                                                            {openDropdown === ds.id && (
                                                                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-20 overflow-hidden">
                                                                    <div className="p-2 bg-slate-750 border-b border-slate-600">
                                                                        <p className="text-xs text-slate-400 font-semibold">Labeled Versions</p>
                                                                    </div>
                                                                    <div className="max-h-64 overflow-y-auto">
                                                                        {progressMap[ds.id]?.length ? progressMap[ds.id].map(p => (
                                                                            <div key={p.user_id} className="p-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0">
                                                                                <div className="flex justify-between items-center mb-1.5">
                                                                                    <span className="font-semibold text-xs truncate">{p.name}</span>
                                                                                    <span className="text-[10px] text-blue-400">{p.percentage}% done</span>
                                                                                </div>
                                                                                <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden mb-2">
                                                                                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${p.percentage}%` }} />
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    <button 
                                                                                        onClick={() => handleExport(ds.id, p.user_id)}
                                                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold"
                                                                                    >
                                                                                        <Download size={12} /> Download
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => navigate(`/spreadsheet/${ds.id}?targetUser=${p.user_id}&userName=${encodeURIComponent(p.name)}`)}
                                                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold"
                                                                                    >
                                                                                        <Play size={12} /> View
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )) : <div className="p-4 text-center text-slate-500 text-xs">No versions yet</div>}
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
