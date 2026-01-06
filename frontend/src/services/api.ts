import { supabase } from '../supabase';
import { AuthCredentials } from '../types';

export const signUp = async (credentials: AuthCredentials & { name?: string }) => {
    const redirectUrl = import.meta.env.PROD 
        ? 'https://label-lk.vercel.app/login'
        : window.location.origin + '/login';
    
    return supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
            emailRedirectTo: redirectUrl,
            data: {
                name: credentials.name || '',
                role: 'labeler'
            }
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
    return supabase.from('spreadsheet_data').select('*').eq('dataset_id', datasetId).order('id');
};

export const saveSpreadsheetData = async (datasetId: number, data: any[]) => {
    // Delete existing data for this dataset
    await supabase
        .from('spreadsheet_data')
        .delete()
        .eq('dataset_id', datasetId);

    // Insert new data
    const records = data.map(row => ({
        dataset_id: datasetId,
        data: row,
    }));

    return supabase.from('spreadsheet_data').insert(records);
};

export const exportDataset = async (datasetId: number, format: 'csv' | 'json', userId?: string) => {
    // Fetch spreadsheet data for the dataset, optionally filtered by user
    let query = supabase
        .from('spreadsheet_data')
        .select('*')
        .eq('dataset_id', datasetId);
    
    if (userId) {
        query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('id');
    
    if (error) return { error, data: null };
    if (!data || data.length === 0) {
        return { error: new Error('No data found for this dataset'), data: null };
    }

    // Extract the actual row data from the JSONB column
    const rows = data.map(item => item.data);

    if (format === 'csv') {
        // Define the columns we want to export in order
        const columns = [
            'timestamp', 'r_sph', 'r_cyl', 'r_axis', 'r_add',
            'l_sph', 'l_cyl', 'l_axis', 'l_add', 'pd',
            'chart_number', 'occluder_state', 'chart_display',
            'substep', 'intent_of_optum', 'confidence_of_optum',
            'patient_confidence_score', 'flag', 'reason_for_flag'
        ];

        // Create CSV header
        const headers = columns.map(h => h.toUpperCase()).join(',');

        // Create CSV rows with proper escaping
        const csvRows = rows.map(row => {
            return columns.map(col => {
                const value = row[col] || '';
                const stringValue = String(value);
                // Escape quotes and wrap in quotes if contains comma or quote
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return '"' + stringValue.replace(/"/g, '""') + '"';
                }
                return stringValue;
            }).join(',');
        });

        const csv = [headers, ...csvRows].join('\n');
        return { data: new Blob([csv], { type: 'text/csv;charset=utf-8;' }), error: null };
    }
    
    return { data: new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), error: null };
};

export const deleteDataset = async (datasetId: number) => {
    return supabase.from('datasets').delete().eq('id', datasetId);
};

export const getDatasetUserCount = async (datasetId: number) => {
    const { data, error } = await supabase
        .from('user_progress')
        .select('user_id')
        .eq('dataset_id', datasetId);
    
    if (error) return { count: 0, error };
    
    // Count unique users
    const uniqueUsers = new Set(data?.map(p => p.user_id));
    return { count: uniqueUsers.size, error: null };
};
