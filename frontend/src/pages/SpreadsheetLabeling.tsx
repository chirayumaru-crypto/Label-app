import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, Save, Download, Eye } from 'lucide-react';

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
    speaker_intent: string;
    detected_language: string;
    hesitation_markers: string;
    requires_verification: string;

    // Editable annotation fields
    step: string;
    substep: string;
    intent_of_optum: string;
    confidence_of_optum: string;
    patient_confidence_score: string;
    flag: string;
    reason_for_flag: string;
}

const SpreadsheetLabeling = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetUserId = searchParams.get('targetUser');
    const targetUserName = searchParams.get('userName');

    const [rows, setRows] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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

    const handleCellChange = (rowId: number, field: keyof RowData, value: string) => {
        setRows(rows.map(row =>
            row.id === rowId ? { ...row, [field]: value } : row
        ));
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
                    <h1 className="font-bold text-lg">Spreadsheet Labeling</h1>
                </div>
                <div className="flex items-center gap-3">
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
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 text-white disabled:cursor-not-allowed"
                        title={targetUserId ? "Cannot edit in review mode" : "Save changes"}
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save All'}
                    </button>
                </div>
            </header>

            {/* Spreadsheet */}
            <div className="flex-1 overflow-auto p-4">
                <div className="inline-block min-w-full">
                    <table className="border-collapse border border-slate-300 text-sm">
                        <thead className="sticky top-0 bg-blue-100 z-10">
                            <tr>
                                {/* Read-only columns */}
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Engagement_ID</th>
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
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Utterance_Text</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Translation_in_En</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Speaker_Intent</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Detected_Language</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Hesitation_Markers</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-blue-100 text-slate-900">Requires_Verification</th>

                                {/* Editable columns */}
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Step</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Substep</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Intent_of_Optum</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Confidence_of_Optum</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Patient_Confidence_Score</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Flag</th>
                                <th className="border border-slate-300 px-3 py-2 text-left bg-green-100 text-slate-900">Reason_For_Flag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-blue-50">
                                    {/* Read-only cells */}
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.engagement_id)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.timestamp)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.r_sph)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.r_cyl)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.r_axis)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.r_add)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.l_sph)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.l_cyl)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.l_axis)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.l_add)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.pd)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.chart_number)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.occluder_state)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.chart_display)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700">{displayValue(row.speaker)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.utterance_text)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.translation_in_en)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.speaker_intent)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.detected_language)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.hesitation_markers)}</td>
                                    <td className="border border-slate-300 px-3 py-2 bg-white text-slate-700 max-w-xs truncate">{displayValue(row.requires_verification)}</td>

                                    {/* Editable cells */}
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.step}
                                            onChange={(e) => handleCellChange(row.id, 'step', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.substep}
                                            onChange={(e) => handleCellChange(row.id, 'substep', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.intent_of_optum}
                                            onChange={(e) => handleCellChange(row.id, 'intent_of_optum', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.confidence_of_optum}
                                            onChange={(e) => handleCellChange(row.id, 'confidence_of_optum', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.patient_confidence_score}
                                            onChange={(e) => handleCellChange(row.id, 'patient_confidence_score', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <select
                                            value={row.flag}
                                            onChange={(e) => handleCellChange(row.id, 'flag', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        >
                                            <option value="">-</option>
                                            <option value="GREEN">GREEN</option>
                                            <option value="YELLOW">YELLOW</option>
                                            <option value="RED">RED</option>
                                        </select>
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.reason_for_flag}
                                            onChange={(e) => handleCellChange(row.id, 'reason_for_flag', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SpreadsheetLabeling;
