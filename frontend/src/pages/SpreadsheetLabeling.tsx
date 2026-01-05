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

    const [showGuide, setShowGuide] = useState(false);

    const labelingSteps = [
        "Step 0: Greeting & Language Preference",
        "Step 1: History taking",
        "Step 2: Pre-Eye Testing & detail confirmation",
        "Step 3: Visual Acuity Assessment",
        "Step 4: Subjective Refraction - JCC & Duochrome",
        "Step 5: Near Vision",
        "Step 6: New Prescription Verification",
        "Step 7: Power Updation",
        "Step 8: Power Explaionation",
        "Step 9: Handover"
    ];

    const displayValue = (value: string) => {
        if (value === 'nan' || value === '' || !value) return '';
        return value;
    };

    const LabelingGuideModal = () => (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-2xl font-bold text-slate-900">Labeling Guide</h2>
                    <button onClick={() => setShowGuide(false)} className="text-slate-500 hover:text-slate-700">Close</button>
                </div>
                <div className="p-6 space-y-6">
                    <section>
                        <h3 className="text-lg font-bold text-blue-600 mb-3">Labeling Steps</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {labelingSteps.map((step, idx) => (
                                <div key={idx} className="p-2 bg-slate-50 rounded border border-slate-200 text-sm font-medium">
                                    {step}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <section className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-bold text-blue-800 mb-2">Intent & Confidence</h3>
                            <ul className="text-sm space-y-2 text-blue-900">
                                <li><strong>Substep:</strong> Description of the step performed.</li>
                                <li><strong>Intent of Optum:</strong> What is Optum thinking/doing?</li>
                                <li><strong>Confidence (Optum):</strong> 1-10 scale (1=Lowest, 10=Highest).</li>
                                <li><strong>Patient Confidence:</strong> 1-10 scale (Accuracy of patient reply).</li>
                            </ul>
                        </section>

                        <section className="bg-emerald-50 p-4 rounded-lg">
                            <h3 className="font-bold text-emerald-800 mb-2">Flags</h3>
                            <ul className="text-sm space-y-2 text-emerald-900">
                                <li className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                    <span><strong>Green:</strong> Compulsory steps.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                    <span><strong>Yellow:</strong> Steps can be ignored.</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                    <span><strong>Red:</strong> Step to be excluded/not part of test.</span>
                                </li>
                            </ul>
                        </section>
                        <section className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-bold text-gray-800 mb-2">Column Definitions</h3>
                            <p className="text-sm text-gray-700">
                                <strong>Reason For Flag:</strong> Mark your reason for the chosen flag.
                            </p>
                        </section>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={() => setShowGuide(false)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );

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
                    <button
                        onClick={() => setShowGuide(true)}
                        className="ml-4 px-3 py-1 bg-white border border-blue-300 text-blue-600 rounded-md text-sm font-semibold hover:bg-blue-50 flex items-center gap-2"
                    >
                        <Download size={14} className="rotate-180" /> {/* Using icon as 'File' substitute */}
                        View Guide
                    </button>
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

            {showGuide && <LabelingGuideModal />}

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
                                        <select
                                            value={row.step}
                                            onChange={(e) => handleCellChange(row.id, 'step', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500 text-xs"
                                        >
                                            <option value="">Select Step</option>
                                            {labelingSteps.map(step => (
                                                <option key={step} value={step}>{step}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.substep}
                                            onChange={(e) => handleCellChange(row.id, 'substep', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500"
                                            placeholder="Desc..."
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
                                        <select
                                            value={row.confidence_of_optum}
                                            onChange={(e) => handleCellChange(row.id, 'confidence_of_optum', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500 text-center"
                                        >
                                            <option value="">-</option>
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                                <option key={num} value={num}>{num}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <select
                                            value={row.patient_confidence_score}
                                            onChange={(e) => handleCellChange(row.id, 'patient_confidence_score', e.target.value)}
                                            className="w-full bg-green-50 border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500 text-center"
                                        >
                                            <option value="">-</option>
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                                <option key={num} value={num}>{num}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <select
                                            value={row.flag}
                                            onChange={(e) => handleCellChange(row.id, 'flag', e.target.value)}
                                            className={`w-full border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-green-500 font-bold ${row.flag === 'GREEN' ? 'bg-green-200 text-green-800' :
                                                    row.flag === 'YELLOW' ? 'bg-yellow-200 text-yellow-800' :
                                                        row.flag === 'RED' ? 'bg-red-200 text-red-800' : 'bg-green-50'
                                                }`}
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
