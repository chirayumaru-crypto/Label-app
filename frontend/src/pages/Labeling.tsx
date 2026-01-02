import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogRow, Flag } from '../types';
import { ChevronLeft, Save, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

const Labeling = () => {
    const [row, setRow] = useState<LogRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [step, setStep] = useState('');
    const [substep, setSubstep] = useState('');
    const [intent, setIntent] = useState('');
    const [confidence, setConfidence] = useState(50);
    const [patientConfidence, setPatientConfidence] = useState(50);
    const [flag, setFlag] = useState<Flag>('GREEN');
    const [reason, setReason] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        fetchNextRow();
    }, []);

    const fetchNextRow = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/labeling/next');
            setRow(response.data);
            // Reset form
            setStep('');
            setSubstep('');
            setIntent('');
            setConfidence(50);
            setPatientConfidence(50);
            setFlag('GREEN');
            setReason('');
        } catch (err: any) {
            if (err.response?.status === 404) {
                setError('No more rows to label in this dataset.');
            } else {
                setError('Failed to fetch next row');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRelease = async () => {
        if (!row) return;
        try {
            await api.post(`/labeling/release?log_row_id=${row.id}`);
            navigate('/dashboard');
        } catch (err) {
            alert('Failed to release row');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!row) return;

        if (!step || !intent || (flag !== 'GREEN' && !reason)) {
            alert('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/labeling/submit', {
                log_row_id: row.id,
                step,
                substep,
                intent_of_optum: intent,
                confidence_of_optum: confidence,
                patient_confidence_score: patientConfidence,
                flag,
                reason_for_flag: reason
            });
            fetchNextRow();
        } catch (err) {
            alert('Failed to submit label');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-slate-400">
                <RefreshCw size={48} className="animate-spin text-primary-500" />
                <p className="text-xl font-medium animate-pulse">Assigning next available row...</p>
            </div>
        </div>
    );

    if (error || !row) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md text-center">
                <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
                <h2 className="text-2xl font-bold mb-4">{error}</h2>
                <button onClick={() => navigate('/dashboard')} className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 rounded-lg font-bold">
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={handleRelease} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">Labeling Session</h1>
                        <p className="text-xs text-slate-500">Row ID: {row.id} • Session: {row.session_id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchNextRow}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw size={16} /> Skip
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {/* Context Panel (Read-only) */}
                <section className="w-1/2 overflow-y-auto p-8 border-r border-slate-800 bg-slate-950/50">
                    <h2 className="text-xl font-bold mb-6 text-primary-400">Log Context</h2>

                    <div className="space-y-8">
                        {/* Utterance Highlight */}
                        <div className="bg-slate-900/80 p-6 rounded-2xl border border-primary-500/20 shadow-xl">
                            <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">{row.speaker}</span>
                            <p className="text-2xl font-medium mt-2 leading-relaxed italic">"{row.utterance}"</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <ContextItem label="Timestamp" value={row.timestamp} />
                                <ContextItem label="Chart #" value={row.chart_number} />
                                <ContextItem label="Occluder" value={row.occluder_state} />
                                <ContextItem label="Display" value={row.chart_display} />
                            </div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Lens Values</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-600 font-bold mb-1">RIGHT (OD)</p>
                                        <div className="space-y-1 text-sm">
                                            <p>S: {row.r_sph}</p>
                                            <p>C: {row.r_cyl}</p>
                                            <p>A: {row.r_axis}</p>
                                            <p>Add: {row.r_add}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-600 font-bold mb-1">LEFT (OS)</p>
                                        <div className="space-y-1 text-sm">
                                            <p>S: {row.l_sph}</p>
                                            <p>C: {row.l_cyl}</p>
                                            <p>A: {row.l_axis}</p>
                                            <p>Add: {row.l_add}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ContextItem label="PD" value={row.pd} />
                    </div>
                </section>

                {/* Human Label Panel */}
                <section className="w-1/2 overflow-y-auto p-8 bg-slate-900/30">
                    <h2 className="text-xl font-bold mb-6 text-emerald-400">Annotation</h2>

                    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <LabelField label="Step" required />
                                <select
                                    value={step}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStep(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                    required
                                >
                                    <option value="">Select Step</option>
                                    <option value="PH_START">Phoropter Start</option>
                                    <option value="SPH_ADJ">Sphere Adjustment</option>
                                    <option value="CYL_ADJ">Cylinder Adjustment</option>
                                    <option value="AXIS_ADJ">Axis Adjustment</option>
                                    <option value="BINO_BAL">Binocular Balance</option>
                                    <option value="ADD_ADJ">Add Adjustment</option>
                                    <option value="FINAL">Final/Finish</option>
                                </select>
                            </div>
                            <div>
                                <LabelField label="Substep" />
                                <input
                                    type="text"
                                    value={substep}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubstep(e.target.value)}
                                    placeholder="e.g. Initial check"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <LabelField label="Intent of Optum" required />
                            <select
                                value={intent}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIntent(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            >
                                <option value="">Select Intent</option>
                                <option value="QUESTION">Asking Question</option>
                                <option value="INSTRUCTION">Giving Instruction</option>
                                <option value="ADJUSTMENT">Changing Phoropter</option>
                                <option value="EXPLANATION">Explaining Procedure</option>
                                <option value="CLOSING">Closing Test</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <LabelField label="Optum Confidence" />
                                    <span className="text-emerald-400 font-bold">{confidence}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" value={confidence}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfidence(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <LabelField label="Patient Confidence" />
                                    <span className="text-emerald-400 font-bold">{patientConfidence}%</span>
                                </div>
                                <input
                                    type="range" min="0" max="100" value={patientConfidence}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPatientConfidence(parseInt(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <LabelField label="Flag Status" required />
                            <div className="grid grid-cols-3 gap-3">
                                {(['GREEN', 'YELLOW', 'RED'] as Flag[]).map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setFlag(f)}
                                        className={`py-3 rounded-lg font-bold border-2 transition-all ${flag === f
                                            ? f === 'GREEN' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                : f === 'YELLOW' ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                    : 'bg-red-500/20 border-red-500 text-red-400'
                                            : 'bg-slate-800 border-slate-700 text-slate-500'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {flag !== 'GREEN' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <LabelField label="Reason for Flag" required />
                                <textarea
                                    value={reason}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-800 border border-red-500/30 rounded-lg p-3 text-white focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="Explain why this row is flagged..."
                                    required
                                />
                            </div>
                        )}

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-50"
                            >
                                <Save size={20} />
                                {submitting ? 'Submitting...' : 'Submit & Next Row'}
                            </button>
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
};

const ContextItem = ({ label, value }: { label: string, value: string }) => (
    <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-slate-300">{value || '—'}</p>
    </div>
);

const LabelField = ({ label, required }: { label: string, required?: boolean }) => (
    <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-tight">
        {label} {required && <span className="text-red-500">*</span>}
    </label>
);

export default Labeling;
