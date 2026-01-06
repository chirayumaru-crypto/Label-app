import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSpreadsheetData, saveSpreadsheetData } from '../services/api';
import { supabase } from '../supabase';
import { ChevronLeft, Save, Download, HelpCircle, X } from 'lucide-react';

interface RowData {
    id: number;
    // Read-only fields from CSV
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
    { value: "Step 9", label: "Step 9: Handover" },
];

// Labeling Guide Component
const LabelingGuide = ({ onClose }: { onClose: () => void }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-4 relative">
        <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
            <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
            <HelpCircle size={20} />
            How to Label Eye Test Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
                <h4 className="font-bold text-slate-800 mb-2">📋 Steps (Select from dropdown)</h4>
                <ul className="space-y-1 text-slate-600">
                    <li><strong>Step 3:</strong> Visual Acuity Assessment</li>
                    <li><strong>Step 4:</strong> Subjective Refraction - JCC & Duochrome</li>
                    <li><strong>Step 5:</strong> Near Vision</li>
                </ul>
                <h4 className="font-bold text-slate-800 mt-4 mb-2">🎨 Visual Indicators</h4>
                <ul className="space-y-1 text-slate-600">
                    <li><span className="inline-block w-4 h-3 rounded bg-yellow-200 border border-slate-300 mr-2"></span><strong>Yellow cells:</strong> Values that changed from previous row</li>
                    <li><span className="inline-block w-4 h-3 rounded bg-blue-100 border border-slate-300 mr-2"></span><strong>Light blue rows:</strong> Default configuration rows</li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-slate-800 mb-2">📝 Column Descriptions</h4>
                <ul className="space-y-1 text-slate-600">
                    <li><strong>Substep:</strong> Description of the step being performed</li>
                    <li><strong>Intent_of_Optum:</strong> What is Optum thinking and doing</li>
                    <li><strong>Confidence_of_Optum:</strong> Scale 0-10 (0=lowest, 10=highest)</li>
                    <li><strong>Patient_Confidence_Score:</strong> How accurate patient is about their reply (0-10)</li>
                </ul>
                <h4 className="font-bold text-slate-800 mt-4 mb-2">🚦 Flag Colors</h4>
                <ul className="space-y-1 text-slate-600">
                    <li><span className="inline-block w-3 h-3 rounded bg-green-500 mr-2"></span><strong>GREEN:</strong> Compulsory steps</li>
                    <li><span className="inline-block w-3 h-3 rounded bg-yellow-500 mr-2"></span><strong>YELLOW:</strong> Steps can be ignored</li>
                    <li><span className="inline-block w-3 h-3 rounded bg-red-500 mr-2"></span><strong>RED:</strong> Step to be excluded or not part of eyetest</li>
                </ul>
                <p className="mt-2 text-slate-500 italic">Reason_For_Flag: Mark your reason when flagging a row</p>
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-yellow-800 font-semibold">⚠️ Important: Your changes are auto-saved every 5 seconds. Click "Save All" button to ensure all your work is saved before leaving.</p>
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
        default:
            return 'bg-white';
    }
};

// Check if a row is the default configuration
const isDefaultRow = (row: RowData): boolean => {
    return (
        row.r_sph === '0.0' &&
        row.r_cyl === '0.0' &&
        row.r_axis === '180.0' &&
        row.r_add === '0.0' &&
        row.l_sph === '0.0' &&
        row.l_cyl === '0.0' &&
        row.l_axis === '180.0' &&
        row.l_add === '0.0' &&
        row.pd === '64.0' &&
        row.chart_number === 'Chart1' &&
        row.occluder_state === 'Bino' &&
        row.chart_display === "Large black 'E' in a white box"
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

const SpreadsheetLabeling = () => {
    const { datasetId } = useParams();
    const navigate = useNavigate();

    const [rows, setRows] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showGuide, setShowGuide] = useState(true);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        fetchData();
    }, [datasetId]);

    // Autosave every 5 seconds
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        
        const autosaveInterval = setInterval(() => {
            handleSave(true);
        }, 5000);

        return () => clearInterval(autosaveInterval);
    }, [rows, hasUnsavedChanges]);

    const fetchData = async () => {
        try {
            const { data, error } = await getSpreadsheetData(parseInt(datasetId || '0'));
            if (error) throw error;
            if (data) {
                setRows(data.map((item: any) => item.data) as RowData[]);
            }
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
        setHasUnsavedChanges(true);
    };

    const handleSave = async (isAutosave = false) => {
        if (!hasUnsavedChanges && isAutosave) return;
        
        setSaving(true);
        try {
            const { error } = await saveSpreadsheetData(parseInt(datasetId || '0'), rows);
            if (error) throw error;
            
            // Update progress
            await updateUserProgress(parseInt(datasetId || '0'), rows.length, false);
            
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            
            if (!isAutosave) {
                alert('Saved successfully!');
            }
        } catch (err) {
            if (!isAutosave) {
                alert('Save failed');
            }
        } finally {
            setSaving(false);
        }
    };

    const updateUserProgress = async (datasetId: number, rowsReviewed: number, isSubmitted: boolean) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const progressData = {
                dataset_id: datasetId,
                user_id: user.id,
                rows_reviewed: rowsReviewed,
                last_saved_at: new Date().toISOString(),
                is_submitted: isSubmitted,
                submitted_at: isSubmitted ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from('user_progress')
                .upsert(progressData, { onConflict: 'dataset_id,user_id' });

            if (error) console.error('Progress update error:', error);
        } catch (err) {
            console.error('Failed to update progress:', err);
        }
    };

    const handleExport = async () => {
        try {
            // Export functionality using the rows data
            const headers = Object.keys(rows[0] || {});
            const csv = [
                headers.join(','),
                ...rows.map(row => headers.map(h => (row as any)[h]).join(','))
            ].join('\n');
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `labeled_data_${datasetId}.csv`);
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
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
                        {lastSaved && (
                            <p className="text-xs text-slate-500">
                                Last saved: {lastSaved.toLocaleTimeString()}
                            </p>
                        )}
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
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 text-white disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save All'}
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
                                {/* Engagement_ID removed */}
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
                                {/* Speaker removed */}
                                {/* Utterance_Text removed */}
                                {/* Translation_in_En removed */}

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
                            {rows.map((row, rowIndex) => {
                                const previousRow = rowIndex > 0 ? rows[rowIndex - 1] : null;
                                const isDefault = isDefaultRow(row);
                                const rowBgClass = isDefault ? 'bg-blue-100' : getRowBackgroundColor(row.flag);
                                
                                return (
                                <tr key={row.id} className={`${rowBgClass} hover:opacity-80 transition-opacity`}>
                                    {/* Read-only cells */}
                                    {/* engagement_id removed */}
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
                                    {/* speaker removed */}
                                    {/* utterance_text removed */}
                                    {/* translation_in_en removed */}

                                    {/* Editable cells */}
                                    <td className="border border-slate-300 px-1 py-1">
                                        <select
                                            value={row.step}
                                            onChange={(e) => handleCellChange(row.id, 'step', e.target.value)}
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
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
                                            placeholder="Description of step"
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="text"
                                            value={row.intent_of_optum}
                                            onChange={(e) => handleCellChange(row.id, 'intent_of_optum', e.target.value)}
                                            placeholder="What Optum is thinking/doing"
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={row.confidence_of_optum}
                                            onChange={(e) => handleCellChange(row.id, 'confidence_of_optum', e.target.value)}
                                            placeholder="0-10"
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={row.patient_confidence_score}
                                            onChange={(e) => handleCellChange(row.id, 'patient_confidence_score', e.target.value)}
                                            placeholder="0-10"
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        />
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1">
                                        <select
                                            value={row.flag}
                                            onChange={(e) => handleCellChange(row.id, 'flag', e.target.value)}
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                                        >
                                            <option value="">-</option>
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
                                            placeholder="Reason for flag"
                                            className={`w-full ${getEditableCellBg(row.flag)} border-0 px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500`}
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
