import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSpreadsheetData, getDatasets, exportDataset, getDatasetCompletionStatus } from '../services/api';
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
    const [userLabels, setUserLabels] = useState<{ user_email: string; row_count: number; user_id: string; percentage?: number; is_complete?: boolean }[]>([]);
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
    const [labeledData, setLabeledData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewingData, setViewingData] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [completionStatus, setCompletionStatus] = useState<{ completedUsers: number; userProgress: any[]; totalRows: number } | null>(null);

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
            // Get completion status first
            const status = await getDatasetCompletionStatus(datasetId);
            if (!status.error) {
                setCompletionStatus({
                    completedUsers: status.completedUsers,
                    userProgress: status.userProgress || [],
                    totalRows: status.totalRows || 0
                });
                
                // Show only the first 5 users (limit display to max 5)
                const limitedProgress = status.userProgress?.slice(0, 5) || [];
                const userLabelsData = limitedProgress.map(p => ({
                    user_email: p.email,
                    user_id: p.user_id,
                    row_count: p.labeled_count,
                    percentage: p.percentage,
                    is_complete: p.is_complete
                }));
                
                setUserLabels(userLabelsData);
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

    const getEditableCellBg = (flag: string | null): string => {
        // Editable columns should have purple background unless row has a flag color
        if (!flag) return 'bg-purple-100';
        const rowBg = getRowBackgroundColor(flag);
        return rowBg || 'bg-purple-100';
    };

    // Check if a row is the default configuration
    const isDefaultRow = (row: RowData): boolean => {
        const normalize = (val: string) => val?.trim() || '';
        const isZero = (val: string) => normalize(val) === '0' || normalize(val) === '0.0';
        const is180 = (val: string) => normalize(val) === '180' || normalize(val) === '180.0';
        const is64 = (val: string) => normalize(val) === '64' || normalize(val) === '64.0';
        
        return (
            isZero(row.r_sph) &&
            isZero(row.r_cyl) &&
            is180(row.r_axis) &&
            isZero(row.r_add) &&
            isZero(row.l_sph) &&
            isZero(row.l_cyl) &&
            is180(row.l_axis) &&
            isZero(row.l_add) &&
            is64(row.pd) &&
            normalize(row.chart_number).toLowerCase() === 'chart1' &&
            normalize(row.occluder_state).toLowerCase() === 'bino'
        );
    };

    // Check if a cell value has changed from previous row
    const hasChanged = (currentRow: RowData, previousRow: RowData | null, field: keyof RowData): boolean => {
        if (!previousRow) return false;
        const compareFields: (keyof RowData)[] = [
            'r_sph', 'r_cyl', 'r_axis', 'r_add',
            'l_sph', 'l_cyl', 'l_axis', 'l_add',
            'pd', 'chart_number', 'occluder_state', 'chart_display'
        ];
        if (!compareFields.includes(field)) return false;
        return currentRow[field] !== previousRow[field];
    };

    const displayValue = (value: string) => {
        if (value === 'nan' || value === '' || !value) return '';
        return value;
    };

    const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
            {/* Header */}
            <header className="h-16 bg-blue-50 border-b border-blue-200 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">View Labeled Data</h1>
                        {selectedDataset && (
                            <p className="text-sm text-slate-600">{selectedDataset.name}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {selectedUserEmail && (
                        <>
                            <button
                                onClick={() => {
                                    setSelectedUserEmail(null);
                                    setViewingData(false);
                                    setLabeledData([]);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                <ChevronLeft size={18} />
                                Back to Users
                            </button>
                            <button
                                onClick={() => handleExportUserData('csv', selectedUserEmail)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-slate-900 text-xl">Loading...</p>
                    </div>
                ) : !selectedDatasetId ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-12 text-center">
                        <FileSpreadsheet size={64} className="mx-auto text-slate-400 mb-4" />
                        <p className="text-slate-900 text-lg mb-4">
                            Please select a dataset to view labeled data
                        </p>
                        <select
                            value={selectedDatasetId || ''}
                            onChange={(e) => setSelectedDatasetId(e.target.value ? parseInt(e.target.value) : null)}
                            className="px-4 py-2 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select a dataset</option>
                            {datasets.map(ds => (
                                <option key={ds.id} value={ds.id}>
                                    {ds.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : !viewingData ? (
                    /* User Cards View */
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">
                                Users who labeled this dataset
                            </h2>
                            {completionStatus && completionStatus.completedUsers > 0 && (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                    {completionStatus.completedUsers}/5 users completed
                                </span>
                            )}
                        </div>
                        {userLabels.length === 0 ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-12 text-center">
                                <User size={64} className="mx-auto text-slate-400 mb-4" />
                                <p className="text-slate-900 text-lg">
                                    No users have labeled this dataset yet
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userLabels.map((userLabel) => (
                                    <div 
                                        key={userLabel.user_email} 
                                        className="bg-white border border-slate-300 rounded-xl p-6 hover:shadow-lg transition-shadow"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {userLabel.user_email.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 font-medium truncate" title={userLabel.user_email}>
                                                    {userLabel.user_email}
                                                </p>
                                                <p className="text-slate-600 text-sm">
                                                    {userLabel.row_count} rows labeled
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {/* Progress bar */}
                                        <div className="mb-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-600">Progress</span>
                                                <span className="text-xs font-semibold text-slate-900">{userLabel.percentage || 0}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all ${userLabel.is_complete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${userLabel.percentage || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Completion badge */}
                                        {userLabel.is_complete && (
                                            <div className="mb-3">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
                                                    ✓ 100% Complete
                                                </span>
                                            </div>
                                        )}
                                        
                                        <button
                                            onClick={() => fetchUserLabeledData(selectedDatasetId!, userLabel.user_email)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                        >
                                            <Eye size={18} />
                                            View Spreadsheet
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Viewing specific user's data */
                    <div>
                        {/* User info banner */}
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {selectedUserEmail?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-slate-900 font-medium">Viewing data labeled by:</p>
                                        <p className="text-blue-600 text-sm">{selectedUserEmail}</p>
                                    </div>
                                </div>
                                <div className="text-slate-600 text-sm">
                                    <span className="font-semibold text-slate-900">{labeledData.length}</span> rows
                                </div>
                            </div>
                        </div>

                        {/* Spreadsheet Table */}
                        <div className="inline-block min-w-full">
                            <table className="border-collapse border border-slate-300 text-sm">
                                <thead className="sticky top-0 bg-blue-100 z-10">
                                    <tr>
                                        {/* Read-only columns */}
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Timestamp</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">R_SPH</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">R_CYL</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">R_AXIS</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">R_ADD</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">L_SPH</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">L_CYL</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">L_AXIS</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">L_ADD</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">PD</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Chart_Number</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Occluder_State</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Chart_Display</th>

                                        {/* Editable columns */}
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Substep</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Intent_of_Optum</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Confidence_of_Optum</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Patient_Confidence_Score</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Flag</th>
                                        <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Reason_For_Flag</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labeledData.map((row, rowIndex) => {
                                        const previousRow = rowIndex > 0 ? labeledData[rowIndex - 1] : null;
                                        const isDefault = isDefaultRow(row);
                                        const rowBgClass = isDefault ? 'bg-blue-100' : getRowBackgroundColor(row.flag);
                                        
                                        return (
                                        <tr key={row.id} className={`${rowBgClass} hover:opacity-80 transition-opacity`}>
                                            {/* Read-only cells with yellow highlighting for changes */}
                                            <td className={`border border-slate-300 px-3 py-2 ${rowBgClass} text-slate-700`}>{displayValue(row.timestamp)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'r_sph') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.r_sph)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'r_cyl') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.r_cyl)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'r_axis') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.r_axis)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'r_add') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.r_add)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'l_sph') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.l_sph)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'l_cyl') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.l_cyl)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'l_axis') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.l_axis)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'l_add') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.l_add)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'pd') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.pd)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'chart_number') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.chart_number)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'occluder_state') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.occluder_state)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${hasChanged(row, previousRow, 'chart_display') ? 'bg-yellow-200' : rowBgClass} text-slate-700`}>{displayValue(row.chart_display)}</td>

                                            {/* Labeled columns - read-only view */}
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.substep)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.intent_of_optum)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.confidence_of_optum)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.patient_confidence_score)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.flag)}</td>
                                            <td className={`border border-slate-300 px-3 py-2 ${getEditableCellBg(row.flag)} text-slate-700`}>{displayValue(row.reason_for_flag)}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ViewLabels;
