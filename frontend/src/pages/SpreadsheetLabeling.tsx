import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, Save, Download, Eye, HelpCircle, X } from 'lucide-react';

interface RowData {
    id: number;
    // Read-only fields from CSV
    engagement_id: string;
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
    speaker: string;
    utterance_text: string;
    translation_in_en: string;

    // Editable annotation fields
    step: string;
    substep: string;
    intent_of_optum: string;

    confidence_of_optum: string;
    patient_confidence_score: string;
    flag: string;
    reason_for_flag: string;
}

// Step options for dropdown
const STEP_OPTIONS = [
    { value: "", label: "Select Step" },
    { value: "Step 3", label: "Step 3: Visual Acuity Assessment" },
    { value: "Step 4", label: "Step 4: Subjective Refraction - JCC & Duochrome" },
    { value: "Step 5", label: "Step 5: Near Vision" },
];

// Labeling Guide Component
const LabelingGuide = ({ onClose }: { onClose: () => void }) => (
    <div className="bg-white border-2 border-blue-400 rounded-2xl shadow-xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -z-10 opacity-50" />
        <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
            <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
                <HelpCircle size={28} />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-slate-900">Labeling Protocol Guide</h3>
                <p className="text-slate-500">Standard operating procedure for eye test data annotation</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sm">
            <div className="space-y-4">
                <h4 className="font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">01</span>
                    Workflow Steps
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                    {STEP_OPTIONS.filter(o => o.value).map(opt => (
                        <div key={opt.value} className="flex gap-2">
                            <span className="font-bold text-blue-600 shrink-0">{opt.value}:</span>
                            <span className="text-slate-600">{opt.label.split(': ')[1]}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">02</span>
                    Field Definitions
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                    <div>
                        <span className="font-bold block text-slate-800">Substep</span>
                        <p className="text-slate-600">Brief technical description of the action</p>
                    </div>
                    <div>
                        <span className="font-bold block text-slate-800">Intent of Optum</span>
                        <p className="text-slate-600">Underlying goal or thought process of the examiner</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="font-bold block text-slate-800">Optum Conf.</span>
                            <p className="text-slate-600 text-xs">Score 0-10</p>
                        </div>
                        <div>
                            <span className="font-bold block text-slate-800">Patient Conf.</span>
                            <p className="text-slate-600 text-xs">Score 0-10</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">03</span>
                    Flag Protocol
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                    <div className="flex items-center gap-3 p-2 bg-green-100/50 rounded-lg border border-green-200">
                        <span className="w-4 h-4 rounded-full bg-green-500 shadow-sm" />
                        <div>
                            <span className="font-bold text-green-800 block">GREEN</span>
                            <p className="text-xs text-green-700">Compulsory core eyetest step</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-yellow-100/50 rounded-lg border border-yellow-200">
                        <span className="w-4 h-4 rounded-full bg-yellow-500 shadow-sm" />
                        <div>
                            <span className="font-bold text-yellow-800 block">YELLOW</span>
                            <p className="text-xs text-yellow-700">Optional or skippable step</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-red-100/50 rounded-lg border border-red-200">
                        <span className="w-4 h-4 rounded-full bg-red-500 shadow-sm" />
                        <div>
                            <span className="font-bold text-red-800 block">RED</span>
                            <p className="text-xs text-red-700">Exclude / Outside eyetest scope</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 italic mt-2">Required: "Reason for Flag" must be filled if RED or YELLOW is selected.</p>
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 font-bold animate-pulse">
                        <span className="text-xl">⚠️</span>
                        <span>WARNING: Save your progress manually as a backup!</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Get row background color based on flag
const getRowBackgroundColor = (flag: string): string => {
    switch (flag) {
        case 'GREEN':
            return 'bg-green-50';
        case 'YELLOW':
            return 'bg-yellow-50';
        case 'RED':
            return 'bg-red-50';
        case 'NONE':
        default:
            return 'bg-white';
    }
};

// Get cell background for editable cells based on flag
const getEditableCellBg = (flag: string): string => {
    switch (flag) {
        case 'GREEN':
            return 'bg-green-100';
        case 'YELLOW':
            return 'bg-yellow-100';
        case 'RED':
            return 'bg-red-100';
        case 'NONE':
        default:
            return 'bg-white';
    }
};

const SpreadsheetLabeling = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('targetUser');
    const targetUserName = searchParams.get('userName');

    const [rows, setRows] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showGuide, setShowGuide] = useState(true);

    useEffect(() => {
        fetchData();
    }, [datasetId]);

    const fetchData = async () => {
        try {
            const endpoint = targetUserId
                ? `/spreadsheet/${datasetId}/rows?target_user_id=${targetUserId}`
                : `/spreadsheet/${datasetId}/rows`;
            const response = await api.get(endpoint);
            setRows(response.data);
        } catch (err) {
            console.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = async (rowId: number, field: keyof RowData, value: string) => {
        const updatedRows = rows.map(row =>
            row.id === rowId ? { ...row, [field]: value } : row
        );
        setRows(updatedRows);

        // Auto-save the specific row
        const rowToSave = updatedRows.find(r => r.id === rowId);
        if (rowToSave && !targetUserId) {
            try {
                // We don't wait for this to let the UI stay snappy
                api.post(`/spreadsheet/${datasetId}/save_row`, rowToSave);
            } catch (err) {
                console.error('Auto-save failed', err);
            }
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post(`/spreadsheet/${datasetId}/save`, { rows });
            alert('Saved successfully!');
        } catch (err) {
            alert('Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        try {
            const response = await api.get(`/spreadsheet/${datasetId}/export`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `labeled_data_${datasetId}.csv`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert('Export failed');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-slate-900 text-xl">Loading data...</p>
            </div>
        );
    }

    const displayValue = (value: string) => {
        if (value === 'nan' || value === '' || !value) return '';
        return value;
    };

    const labeledCount = rows.filter(r => r.step || (r.flag && r.flag !== 'NONE')).length;

    return (
        <div className="min-h-screen bg-white text-slate-900 flex flex-col">
            {targetUserId && (
                <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-amber-800 text-sm font-medium flex items-center justify-center gap-2">
                    <Eye size={16} />
                    Review Mode: Viewing labels by {targetUserName || 'User'} (Read-Only)
                </div>
            )}
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
                        <h1 className="font-bold text-lg">Spreadsheet Labeling</h1>
                        <p className="text-xs text-slate-500 font-medium">Progress: {labeledCount} / {rows.length} rows</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
                    >
                        <HelpCircle size={18} />
                        {showGuide ? 'Hide Guide' : 'Show Guide'}
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200 animate-pulse">
                        <Save size={14} />
                        Auto-saving Live
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !!targetUserId}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors disabled:opacity-50 text-slate-700 disabled:cursor-not-allowed"
                        title={targetUserId ? "Cannot edit in review mode" : "Manual Save sync"}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Manual Sync'}
                    </button>
                </div>
            </header>

            {/* Labeling Guide */}
            <div className="p-4 pb-0">
                {showGuide && <LabelingGuide onClose={() => setShowGuide(false)} />}
            </div>

            {/* Spreadsheet */}
            <div className="flex-1 overflow-auto p-4">
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
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Speaker</th>

                                {/* Editable columns */}
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Step</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Substep</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Intent_of_Optum</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Confidence_of_Optum</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Patient_Confidence_Score</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Flag</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-purple-100 text-slate-900">Reason_For_Flag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const prevRow = index > 0 ? rows[index - 1] : null;
                                const isDiff = (field: keyof RowData) => prevRow && row[field] !== prevRow[field];

                                return (
                                    <tr key={row.id} className={`${getRowBackgroundColor(row.flag)} hover:opacity-80 transition-opacity`}>
                                        {/* Read-only cells */}
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700`}>{displayValue(row.timestamp)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('r_sph') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.r_sph)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('r_cyl') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.r_cyl)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('r_axis') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.r_axis)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('r_add') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.r_add)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('l_sph') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.l_sph)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('l_cyl') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.l_cyl)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('l_axis') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.l_axis)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('l_add') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.l_add)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('pd') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.pd)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('chart_number') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.chart_number)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('occluder_state') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.occluder_state)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700 ${isDiff('chart_display') ? 'bg-amber-100 font-bold text-amber-900' : ''}`}>{displayValue(row.chart_display)}</td>
                                        <td className={`border border-slate-300 px-3 py-2 ${getRowBackgroundColor(row.flag)} text-slate-700`}>{displayValue(row.speaker)}</td>

                                        {/* Editable cells */}
                                        <td className="border border-slate-300 px-1 py-1">
                                            <select
                                                value={row.step}
                                                onChange={(e) => handleCellChange(row.id, 'step', e.target.value)}
                                                disabled={!!targetUserId}
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            >
                                                {STEP_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="text"
                                                value={row.substep}
                                                onChange={(e) => handleCellChange(row.id, 'substep', e.target.value)}
                                                disabled={!!targetUserId}
                                                placeholder="Description of step"
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            />
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="text"
                                                value={row.intent_of_optum}
                                                onChange={(e) => handleCellChange(row.id, 'intent_of_optum', e.target.value)}
                                                disabled={!!targetUserId}
                                                placeholder="What Optum is thinking/doing"
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            />
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={row.confidence_of_optum}
                                                onChange={(e) => handleCellChange(row.id, 'confidence_of_optum', e.target.value)}
                                                disabled={!!targetUserId}
                                                placeholder="0-10"
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            />
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                value={row.patient_confidence_score}
                                                onChange={(e) => handleCellChange(row.id, 'patient_confidence_score', e.target.value)}
                                                disabled={!!targetUserId}
                                                placeholder="0-10"
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            />
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <select
                                                value={row.flag}
                                                onChange={(e) => handleCellChange(row.id, 'flag', e.target.value)}
                                                disabled={!!targetUserId}
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            >
                                                <option value="NONE">⚪ NONE</option>
                                                <option value="GREEN">🟢 GREEN</option>
                                                <option value="YELLOW">🟡 YELLOW</option>
                                                <option value="RED">🔴 RED</option>
                                            </select>
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="text"
                                                value={row.reason_for_flag}
                                                onChange={(e) => handleCellChange(row.id, 'reason_for_flag', e.target.value)}
                                                disabled={!!targetUserId}
                                                placeholder="Reason for flag"
                                                className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed`}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SpreadsheetLabeling;
