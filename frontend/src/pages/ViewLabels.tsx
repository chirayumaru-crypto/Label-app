import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSpreadsheetData, getDatasets, exportDataset } from '../services/api';
import { supabase } from '../supabase';
import { ChevronLeft, Download, Filter, FileSpreadsheet, Calendar, User, Eye } from 'lucide-react';
import { Dataset } from '../types';

interface RowData {
    id: number;
    timestamp: string;
    r_sph: string;
    r_cyl: string;
    r_axis: string;
    r_add: string;
    l_sph: string;
    l_cyl: string;
    l_axis: string;
    l_add: string;
    pd: string;
    chart_number: string;
    occluder_state: string;
    chart_display: string;
    step: string;
    substep: string;
    intent_of_optum: string;
    confidence_of_optum: string;
    patient_confidence_score: string;
    flag: string;
    reason_for_flag: string;
    user_id?: string;
    user_email?: string;
}

const ViewLabels = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const datasetIdParam = searchParams.get('datasetId');
    
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(
        datasetIdParam ? parseInt(datasetIdParam) : null
    );
    const [userLabels, setUserLabels] = useState<{ user_email: string; row_count: number; user_id: string }[]>([]);
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
    const [labeledData, setLabeledData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewingData, setViewingData] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (selectedDatasetId) {
            fetchUserLabels(selectedDatasetId);
        }
    }, [selectedDatasetId]);

    const fetchDatasets = async () => {
        try {
            const { data, error } = await getDatasets();
            if (error) throw error;
            if (data) {
                setDatasets(data as Dataset[]);
            }
        } catch (err) {
            console.error('Failed to fetch datasets', err);
        }
    };

    const fetchUserLabels = async (datasetId: number) => {
        setLoading(true);
        setSelectedUserEmail(null);
        setViewingData(false);
        try {
            const { data, error } = await getSpreadsheetData(datasetId);
            if (error) throw error;
            
            if (data) {
                // Group by user and count rows
                const userMap = new Map<string, { user_email: string; row_count: number; user_id: string }>();
                
                data.forEach((item: any) => {
                    const email = item.user_email || 'Unknown User';
                    const userId = item.user_id || 'unknown';
                    
                    if (userMap.has(email)) {
                        userMap.get(email)!.row_count++;
                    } else {
                        userMap.set(email, {
                            user_email: email,
                            user_id: userId,
                            row_count: 1
                        });
                    }
                });
                
                setUserLabels(Array.from(userMap.values()));
            }
        } catch (err) {
            console.error('Failed to fetch user labels', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserLabeledData = async (datasetId: number, userEmail: string) => {
        setViewingData(true);
        setLoading(true);
        try {
            const { data, error } = await getSpreadsheetData(datasetId);
            if (error) throw error;
            
            if (data) {
                // Filter data for specific user
                const rows = data
                    .filter((item: any) => item.user_email === userEmail)
                    .map((item: any) => ({
                        ...item.data,
                        user_email: item.user_email,
                        id: item.id
                    }));
                
                setLabeledData(rows);
                setSelectedUserEmail(userEmail);
            }
        } catch (err) {
            console.error('Failed to fetch labeled data', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLabeledData = async (datasetId: number) => {
        setLoading(true);
        try {
            // Fetch all users' data (don't pass userId)
            const { data, error } = await getSpreadsheetData(datasetId);
            if (error) throw error;
            
            if (data) {
                // Extract data from the JSONB column and filter only labeled rows
                const rows = data
                    .map((item: any) => ({
                        ...item.data,
                        user_id: item.user_id,
                        user_email: item.user_email,
                        id: item.id
                    }))
                    .filter((row: RowData) => {
                        // Only show rows that have been labeled (have at least step or substep)
                        return row.step || row.substep || row.flag;
                    });
                
                setLabeledData(rows);
            }
        } catch (err) {
            console.error('Failed to fetch labeled data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportUserData = (format: 'csv' | 'json', userEmail: string) => {
        if (!selectedDatasetId) return;
        
        try {
            // Get data for specific user
            const userRows = labeledData;

            if (format === 'csv') {
                // Define columns for CSV export
                const columns = [
                    'timestamp', 'r_sph', 'r_cyl', 'r_axis', 'r_add',
                    'l_sph', 'l_cyl', 'l_axis', 'l_add', 'pd',
                    'chart_number', 'occluder_state', 'chart_display',
                    'step', 'substep', 'intent_of_optum', 'confidence_of_optum',
                    'patient_confidence_score', 'flag', 'reason_for_flag'
                ];

                // Create CSV header
                const headers = columns.map(h => h.toUpperCase()).join(',');

                // Create CSV rows
                const csvRows = userRows.map(row => {
                    return columns.map(col => {
                        const value = (row as any)[col] || '';
                        const stringValue = String(value);
                        // Escape quotes and wrap in quotes if contains comma or quote
                        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                            return '"' + stringValue.replace(/"/g, '""') + '"';
                        }
                        return stringValue;
                    }).join(',');
                });

                const csv = [headers, ...csvRows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const safeEmail = userEmail.replace(/[^a-z0-9]/gi, '_');
                link.setAttribute('download', `labeled_data_${selectedDatasetId}_${safeEmail}_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else {
                // JSON export
                const jsonStr = JSON.stringify(userRows, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const safeEmail = userEmail.replace(/[^a-z0-9]/gi, '_');
                link.setAttribute('download', `labeled_data_${selectedDatasetId}_${safeEmail}_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
        } catch (err) {
            console.error('Failed to export data', err);
            alert('Failed to export data');
        }
    };

    const getRowBackgroundColor = (flag: string): string => {
        switch (flag) {
            case 'GREEN':
                return 'bg-green-50';
            case 'YELLOW':
                return 'bg-yellow-50';
            case 'RED':
                return 'bg-red-50';
            default:
                return 'bg-white';
        }
    };

    const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FileSpreadsheet size={28} />
                                View Labeled Data
                            </h1>
                            {selectedDataset && (
                                <p className="text-slate-300 text-sm mt-1">
                                    Dataset: {selectedDataset.name}
                                </p>
                            )}
                        </div>
                    </div>
                    {selectedUserEmail && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setSelectedUserEmail(null);
                                    setViewingData(false);
                                    setLabeledData([]);
                                }}
                                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <ChevronLeft size={18} />
                                Back to Users
                            </button>
                            <button
                                onClick={() => handleExportUserData('csv', selectedUserEmail)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Download size={18} />
                                Download CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Dataset Selection */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                    <label className="block text-white text-sm font-medium mb-2">
                        Select Dataset
                    </label>
                    <select
                        value={selectedDatasetId || ''}
                        onChange={(e) => setSelectedDatasetId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="" className="bg-slate-800">Select a dataset</option>
                        {datasets.map(ds => (
                            <option key={ds.id} value={ds.id} className="bg-slate-800">
                                {ds.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Main Content */}
                {loading ? (
                    <div className="text-center text-white py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        Loading...
                    </div>
                ) : !selectedDatasetId ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
                        <FileSpreadsheet size={64} className="mx-auto text-slate-400 mb-4" />
                        <p className="text-white text-lg">
                            Please select a dataset to view labeled data
                        </p>
                    </div>
                ) : !viewingData ? (
                    /* User Cards View */
                    <div>
                        {userLabels.length === 0 ? (
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
                                <User size={64} className="mx-auto text-slate-400 mb-4" />
                                <p className="text-white text-lg">
                                    No users have labeled this dataset yet
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xl font-semibold text-white mb-4">
                                    Users who labeled this dataset ({userLabels.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {userLabels.map((userLabel) => (
                                        <div 
                                            key={userLabel.user_email} 
                                            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-purple-500/50 transition-all"
                                        >
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                                    {userLabel.user_email.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-medium truncate" title={userLabel.user_email}>
                                                        {userLabel.user_email}
                                                    </p>
                                                    <p className="text-slate-400 text-sm">
                                                        {userLabel.row_count} rows labeled
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => fetchUserLabeledData(selectedDatasetId!, userLabel.user_email)}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                                >
                                                    <Eye size={18} />
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Viewing specific user's data */
                    <div>
                        {/* User info banner */}
                        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-md rounded-xl p-4 mb-4 border border-purple-500/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {selectedUserEmail?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Viewing data labeled by:</p>
                                        <p className="text-purple-300 text-sm">{selectedUserEmail}</p>
                                    </div>
                                </div>
                                <div className="text-slate-300 text-sm">
                                    <span className="font-semibold text-white">{labeledData.length}</span> rows
                                </div>
                            </div>
                        </div>

                        {/* Read-only data table */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                <thead className="sticky top-0 bg-slate-800 z-10">
                                    <tr className="border-b-2 border-white/30">
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">#</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">Timestamp</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">R_SPH</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">R_CYL</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">R_AXIS</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">R_ADD</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">L_SPH</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">L_CYL</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">L_AXIS</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">L_ADD</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">PD</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">Chart Number</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">Occluder State</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20">Chart Display</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Step</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Substep</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Intent of Optum</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Conf. Optum</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Patient Conf.</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap border-r border-white/20 bg-blue-900/50">Flag</th>
                                        <th className="px-3 py-3 text-left text-white font-bold whitespace-nowrap bg-blue-900/50">Reason for Flag</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labeledData.map((row, index) => (
                                        <tr 
                                            key={row.id} 
                                            className={`border-b border-white/10 hover:bg-white/5 transition-colors ${getRowBackgroundColor(row.flag)}`}
                                        >
                                            <td className="px-3 py-2 text-white font-medium border-r border-white/10">{index + 1}</td>
                                            <td className="px-3 py-2 text-white whitespace-nowrap border-r border-white/10">{row.timestamp || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.r_sph || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.r_cyl || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.r_axis || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.r_add || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.l_sph || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.l_cyl || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.l_axis || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.l_add || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10">{row.pd || '-'}</td>
                                            <td className="px-3 py-2 text-white border-r border-white/10">{row.chart_number || '-'}</td>
                                            <td className="px-3 py-2 text-white border-r border-white/10">{row.occluder_state || '-'}</td>
                                            <td className="px-3 py-2 text-white border-r border-white/10 max-w-[200px]">
                                                <div className="truncate" title={row.chart_display}>
                                                    {row.chart_display || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-white font-medium border-r border-white/10 bg-blue-900/20">{row.step || '-'}</td>
                                            <td className="px-3 py-2 text-white border-r border-white/10 bg-blue-900/20 max-w-[250px]">
                                                <div className="truncate" title={row.substep}>
                                                    {row.substep || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-white border-r border-white/10 bg-blue-900/20 max-w-[250px]">
                                                <div className="truncate" title={row.intent_of_optum}>
                                                    {row.intent_of_optum || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10 bg-blue-900/20">{row.confidence_of_optum || '-'}</td>
                                            <td className="px-3 py-2 text-white text-center border-r border-white/10 bg-blue-900/20">{row.patient_confidence_score || '-'}</td>
                                            <td className="px-3 py-2 border-r border-white/10 bg-blue-900/20">
                                                {row.flag && (
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                                                        row.flag === 'GREEN' ? 'bg-green-500 text-white' :
                                                        row.flag === 'YELLOW' ? 'bg-yellow-500 text-slate-900' :
                                                        row.flag === 'RED' ? 'bg-red-500 text-white' :
                                                        'bg-slate-500 text-white'
                                                    }`}>
                                                        {row.flag}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-white bg-blue-900/20 max-w-[200px]">
                                                <div className="truncate" title={row.reason_for_flag}>
                                                    {row.reason_for_flag || '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewLabels;
