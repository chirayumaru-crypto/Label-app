import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSpreadsheetData, getDatasets, exportDataset } from '../services/api';
import { supabase } from '../supabase';
import { ChevronLeft, Download, Filter, FileSpreadsheet, Calendar, User } from 'lucide-react';
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
    const [labeledData, setLabeledData] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterFlag, setFilterFlag] = useState<string>('all');
    const [filterStep, setFilterStep] = useState<string>('all');
    const [filterUser, setFilterUser] = useState<string>('all');
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
            fetchLabeledData(selectedDatasetId);
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

    const handleExport = async (format: 'csv' | 'json') => {
        if (!selectedDatasetId) return;
        
        try {
            const { data, error } = await exportDataset(selectedDatasetId, format);
            if (error) throw error;
            if (!data) return;

            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `labeled_data_${selectedDatasetId}_${new Date().toISOString().split('T')[0]}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Failed to export data', err);
            alert('Failed to export data');
        }
    };

    const handleExportFiltered = (format: 'csv' | 'json') => {
        if (filteredData.length === 0) return;

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
            const csvRows = filteredData.map(row => {
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
            link.setAttribute('download', `filtered_labeled_data_${selectedDatasetId}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            // JSON export
            const jsonStr = JSON.stringify(filteredData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `filtered_labeled_data_${selectedDatasetId}_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
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

    const filteredData = labeledData.filter(row => {
        if (filterFlag !== 'all' && row.flag !== filterFlag) return false;
        if (filterStep !== 'all' && row.step !== filterStep) return false;
        if (filterUser !== 'all' && row.user_email !== filterUser) return false;
        return true;
    });

    const uniqueSteps = Array.from(new Set(labeledData.map(row => row.step).filter(Boolean)));
    const uniqueUsers = Array.from(new Set(labeledData.map(row => row.user_email).filter(Boolean)));

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
                    <div className="flex gap-2">
                        {/* Export All Data */}
                        <div className="flex gap-1">
                            <button
                                onClick={() => handleExport('csv')}
                                disabled={!selectedDatasetId || labeledData.length === 0}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                title="Export all labeled data"
                            >
                                <Download size={18} />
                                All CSV
                            </button>
                            <button
                                onClick={() => handleExport('json')}
                                disabled={!selectedDatasetId || labeledData.length === 0}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                                title="Export all as JSON"
                            >
                                JSON
                            </button>
                        </div>
                        
                        {/* Export Filtered Data */}
                        <div className="flex gap-1 border-l border-white/20 pl-2">
                            <button
                                onClick={() => handleExportFiltered('csv')}
                                disabled={!selectedDatasetId || filteredData.length === 0}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors text-sm"
                                title="Export filtered data only"
                            >
                                <Download size={18} />
                                Filtered CSV
                            </button>
                            <button
                                onClick={() => handleExportFiltered('json')}
                                disabled={!selectedDatasetId || filteredData.length === 0}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                                title="Export filtered as JSON"
                            >
                                JSON
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dataset Selection and Filters */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Dataset Selection */}
                        <div>
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
                                        {ds.name} ({ds.labeled_count || 0} labeled)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by Flag */}
                        <div>
                            <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                                <Filter size={16} />
                                Filter by Flag
                            </label>
                            <select
                                value={filterFlag}
                                onChange={(e) => setFilterFlag(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all" className="bg-slate-800">All Flags</option>
                                <option value="GREEN" className="bg-slate-800">🟢 GREEN</option>
                                <option value="YELLOW" className="bg-slate-800">🟡 YELLOW</option>
                                <option value="RED" className="bg-slate-800">🔴 RED</option>
                            </select>
                        </div>

                        {/* Filter by Step */}
                        <div>
                            <label className="block text-white text-sm font-medium mb-2 flex items-center gap-2">
                                <Filter size={16} />
                                Filter by Step
                            </label>
                            <select
                                value={filterStep}
                                onChange={(e) => setFilterStep(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all" className="bg-slate-800">All Steps</option>
                                {uniqueSteps.map(step => (
                                    <option key={step} value={step} className="bg-slate-800">
                                        {step}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Show unique users who labeled this dataset */}
                    {selectedDatasetId && uniqueUsers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/20">
                            <p className="text-slate-300 text-xs mb-1">Labeled by:</p>
                            <div className="flex flex-wrap gap-2">
                                {uniqueUsers.map(email => (
                                    <span 
                                        key={email} 
                                        className="px-2 py-1 bg-white/10 rounded text-xs text-slate-200 border border-white/20"
                                    >
                                        {email}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    {selectedDatasetId && (
                        <div className="mt-4 flex gap-4 text-white">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet size={18} className="text-blue-400" />
                                <span>Total Labeled: <strong>{labeledData.length}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={18} className="text-purple-400" />
                                <span>Filtered: <strong>{filteredData.length}</strong></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="text-center text-white py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        Loading labeled data...
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-12 text-center">
                        <FileSpreadsheet size={64} className="mx-auto text-slate-400 mb-4" />
                        <p className="text-white text-lg">
                            {selectedDatasetId 
                                ? 'No labeled data found for this dataset' 
                                : 'Please select a dataset to view labeled data'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden">
                        {/* Scrollable table container */}
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
                                    {filteredData.map((row, index) => (
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
                )}
            </div>
        </div>
    );
};

export default ViewLabels;
