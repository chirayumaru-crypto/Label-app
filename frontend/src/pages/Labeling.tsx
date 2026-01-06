import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { getNextImage, saveLabel } from '../services/api';
import { ChevronLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageData {
    id: number;
    dataset_id: number;
    url: string;
    label: string | null;
}

const Labeling = () => {
    const [image, setImage] = useState<ImageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [label, setLabel] = useState('');
    const navigate = useNavigate();
    const { datasetId } = useParams<{ datasetId: string }>();

    useEffect(() => {
        fetchNextImage();
    }, []);

    const fetchNextImage = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await getNextImage(parseInt(datasetId || '0'), image?.id);
            if (error) throw error;
            if (!data) {
                setError('No more images to label in this dataset.');
                setImage(null);
            } else {
                setImage(data as any);
                setLabel('');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch next image');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!image || !label) return;

        setSubmitting(true);
        try {
            const { error } = await saveLabel(image.id, label);
            if (error) throw error;
            fetchNextImage();
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
                <p className="text-xl font-medium animate-pulse">Loading next image...</p>
            </div>
        </div>
    );

    if (error || !image) return (
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
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg">Image Labeling</h1>
                        <p className="text-xs text-slate-500">Image ID: {image.id}</p>
                    </div>
                </div>
            </header>

            <main className="p-8 max-w-4xl mx-auto">
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 mb-6">
                    <img src={image.url} alt="Label this" className="w-full rounded-lg" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 mb-2">Label</label>
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="Enter label for this image"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg transition-all disabled:opacity-50"
                    >
                        <Save size={20} />
                        {submitting ? 'Submitting...' : 'Submit & Next'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default Labeling;
