import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ChevronLeft, RefreshCw, CheckCircle, Clock, Users as UsersIcon, Download } from 'lucide-react';

interface DatasetProgress {
    dataset_id: number;
    dataset_name: string;
    total_rows: number;
    users: UserProgress[];
}

interface UserProgress {
    user_id: string;
    user_email: string;
    rows_reviewed: number;
    last_saved_at: string;
    is_submitted: boolean;
    submitted_at: string | null;
}

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [progressData, setProgressData] = useState<DatasetProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    useEffect(() => {
        fetchProgress();
        
        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            fetchProgress();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchProgress = async () => {
        try {
            // Get all datasets
            const { data: datasets, error: datasetsError } = await supabase
                .from('datasets')
                .select('id, name, total_rows')
                .order('created_at', { ascending: false });

            if (datasetsError) throw datasetsError;

            // Get all user progress
            const { data: progress, error: progressError } = await supabase
                .from('user_progress')
                .select(`
                    dataset_id,
                    user_id,
                    rows_reviewed,
                    last_saved_at,
                    is_submitted,
                    submitted_at
                `);

            if (progressError) throw progressError;

            // Get user emails
            const userIds = [...new Set(progress?.map(p => p.user_id) || [])];
            const userEmails: Record<string, string> = {};
            
            for (const userId of userIds) {
                const { data: { user } } = await supabase.auth.admin.getUserById(userId);
                if (user) {
                    userEmails[userId] = user.email || 'Unknown';
                }
            }

            // Combine data
            const combined: DatasetProgress[] = (datasets || []).map(ds => ({
                dataset_id: ds.id,
                dataset_name: ds.name,
                total_rows: ds.total_rows || 0,
                users: (progress || [])
                    .filter(p => p.dataset_id === ds.id)
                    .map(p => ({
                        user_id: p.user_id,
                        user_email: userEmails[p.user_id] || 'Unknown',
                        rows_reviewed: p.rows_reviewed,
                        last_saved_at: p.last_saved_at,
                        is_submitted: p.is_submitted,
                        submitted_at: p.submitted_at
                    }))
            }));

            setProgressData(combined);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch progress:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getProgressPercentage = (reviewed: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((reviewed / total) * 100);
    };

    const exportProgressReport = () => {
        try {
            // Create CSV header
            const headers = ['Dataset Name', 'User Email', 'Rows Reviewed', 'Total Rows', 'Progress %', 'Status', 'Last Saved', 'Submitted At'];
            
            // Create CSV rows
            const csvRows = progressData.flatMap(dataset => 
                dataset.users.map(user => [
                    dataset.dataset_name,
                    user.user_email,
                    user.rows_reviewed,
                    dataset.total_rows,
                    getProgressPercentage(user.rows_reviewed, dataset.total_rows) + '%',
                    user.is_submitted ? 'Submitted' : 'In Progress',
                    formatTime(user.last_saved_at),
                    user.submitted_at ? formatTime(user.submitted_at) : 'N/A'
                ].join(','))
            );

            const csv = [headers.join(','), ...csvRows].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `labeling_progress_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:exportProgressReport}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            >
                                <Download size={18} />
                                Export Report
                            </button>
                            <button
                                onClick={', err);
            alert('Failed to export progress report');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-900 text-xl">Loading progress data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                                <p className="text-sm text-slate-500">Real-time labeling progress</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-500">
                                Last updated: {lastRefresh.toLocaleTimeString()}
                            </span>
                            <button
                                onClick={fetchProgress}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <RefreshCw size={18} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {progressData.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-slate-500">No datasets with progress yet</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {progressData.map((dataset) => (
                            <div key={dataset.dataset_id} className="bg-white rounded-lg shadow overflow-hidden">
                                {/* Dataset Header */}
                                <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">{dataset.dataset_name}</h2>
                                            <p className="text-sm text-slate-600">Total rows: {dataset.total_rows}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <UsersIcon size={20} />
                                            <span className="font-semibold">{dataset.users.length} {dataset.users.length === 1 ? 'user' : 'users'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* User Progress */}
                                {dataset.users.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-slate-500">
                                        No users have started working on this dataset yet
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-200">
                                        {dataset.users.map((user) => (
                                            <div key={user.user_id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="font-semibold text-slate-900">{user.user_email}</span>
                                                            {user.is_submitted && (
                                                                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                                    <CheckCircle size={14} />
                                                                    Submitted
                                                                </span>
                                                            )}
                                                            {!user.is_submitted && (
                                                                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                                                    <Clock size={14} />
                                                                    In Progress
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Progress Bar */}
                                                        <div className="mb-2">
                                                            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
                                                                <span>Progress: {user.rows_reviewed} / {dataset.total_rows} rows</span>
                                                                <span className="font-semibold">{getProgressPercentage(user.rows_reviewed, dataset.total_rows)}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all ${
                                                                        user.is_submitted ? 'bg-green-500' : 'bg-blue-500'
                                                                    }`}
                                                                    style={{ width: `${getProgressPercentage(user.rows_reviewed, dataset.total_rows)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                            <span>Last saved: {formatTime(user.last_saved_at)}</span>
                                                            {user.submitted_at && (
                                                                <span>Submitted: {formatTime(user.submitted_at)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
