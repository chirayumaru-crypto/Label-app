import { supabase } from '../supabase';
import { AuthCredentials } from '../types';

export const signUp = async (credentials: AuthCredentials) => {
    return supabase.auth.signUp({
        ...credentials,
        options: {
            emailRedirectTo: window.location.origin + '/login',
        }
    });
};

export const signIn = async (credentials: AuthCredentials) => {
    return supabase.auth.signInWithPassword(credentials);
};

export const signOut = async () => {
    return supabase.auth.signOut();
};

export const getDatasets = async () => {
    return supabase.from('datasets').select('*');
};

export const createDataset = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    return supabase.from('datasets').insert([{ 
        name,
        created_by: user.id 
    }]).select();
};

export const getImages = async (datasetId: number, page: number, limit: number) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return supabase
        .from('images')
        .select('*', { count: 'exact' })
        .eq('dataset_id', datasetId)
        .range(from, to);
};

export const getNextImage = async (datasetId: number, currentImageId?: number) => {
    let query = supabase
        .from('images')
        .select('id')
        .eq('dataset_id', datasetId)
        .is('label', null)
        .limit(1);

    if (currentImageId) {
        query = query.neq('id', currentImageId);
    }

    return query.single();
};

export const saveLabel = async (imageId: number, label: string) => {
    return supabase.from('images').update({ label }).eq('id', imageId);
};

export const getSpreadsheetData = async (datasetId: number) => {
    return supabase.from('spreadsheet_data').select('*').eq('dataset_id', datasetId);
};

export const saveSpreadsheetData = async (datasetId: number, data: any[]) => {
    const records = data.map(row => ({ dataset_id: datasetId, data: row }));
    return supabase.from('spreadsheet_data').upsert(records);
};

export const exportDataset = async (datasetId: number, format: 'csv' | 'json') => {
    // This is a placeholder. Export functionality will depend on your Supabase setup (e.g., using functions).
    console.log(`Exporting dataset ${datasetId} to ${format}`);
    const { data, error } = await supabase.from('images').select('*').eq('dataset_id', datasetId);
    if (error) return { error, data: null };

    if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const csv = [
            headers.join(','),
            ...data.map((row: any) => headers.map(h => row[h]).join(','))
        ].join('\n');
        return { data: new Blob([csv], { type: 'text/csv' }), error: null };
    }
    return { data: new Blob([JSON.stringify(data)], { type: 'application/json' }), error: null };
};

export const deleteDataset = async (datasetId: number) => {
    return supabase.from('datasets').delete().eq('id', datasetId);
};
