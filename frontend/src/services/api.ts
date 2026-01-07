import { supabase } from '../supabase';
import { AuthCredentials } from '../types';

export const signUp = async (credentials: AuthCredentials) => {
    const redirectUrl = import.meta.env.PROD 
        ? 'https://label-lk.vercel.app/login'
        : window.location.origin + '/login';
    
    return supabase.auth.signUp({
        ...credentials,
        options: {
            emailRedirectTo: redirectUrl,
            data: {
                email_confirm: false  // Skip email confirmation
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

export const getSpreadsheetData = async (datasetId: number, userId?: string) => {
    let query = supabase
        .from('spreadsheet_data')
        .select('*')
        .eq('dataset_id', datasetId);
    
    // If userId is provided, filter by user
    if (userId) {
        query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query.order('id');
    
    return { data, error };
};

export const saveSpreadsheetData = async (datasetId: number, data: any[]) => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Ensure we have a valid email (not null)
    const userEmail = user.email || `user_${user.id.substring(0, 8)}`;

    // Delete existing data for this dataset and user
    await supabase
        .from('spreadsheet_data')
        .delete()
        .eq('dataset_id', datasetId)
        .eq('user_id', user.id);

    // Insert new data with user_id and user_email (never null)
    const records = data.map(row => ({
        dataset_id: datasetId,
        user_id: user.id,
        user_email: userEmail,
        data: row,
    }));

    const result = await supabase.from('spreadsheet_data').insert(records);
    
    // Update user progress after saving
    if (!result.error) {
        await updateDatasetProgress(datasetId, user.id);
    }
    
    return result;
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

export const getDatasetCompletionStatus = async (datasetId: number) => {
    // Get total rows in dataset
    const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .select('total_rows')
        .eq('id', datasetId)
        .single();
    
    if (datasetError || !datasetData) return { completedUsers: 0, userProgress: [], error: datasetError };
    
    const totalRows = datasetData.total_rows || 0;
    
    // Get all user data with full row data
    const { data, error } = await supabase
        .from('spreadsheet_data')
        .select('user_id, user_email, data')
        .eq('dataset_id', datasetId)
        .not('user_email', 'is', null); // Exclude null emails (Unknown User)
    
    if (error) return { completedUsers: 0, userProgress: [], error };
    
    // Helper function to check if a row is actually labeled
    const isRowLabeled = (rowData: any): boolean => {
        if (!rowData) return false;
        // A row is considered labeled if it has at least one editable field filled
        const editableFields = ['substep', 'intent_of_optum', 'flag', 'confidence_of_optum', 'patient_confidence_score', 'reason_for_flag'];
        return editableFields.some(field => {
            const value = rowData[field];
            return value && value.toString().trim() !== '';
        });
    };
    
    // Group by user and count LABELED rows (not just saved rows)
    const userMap = new Map<string, { email: string; count: number }>();
    data?.forEach(row => {
        if (row.user_id && row.user_email && isRowLabeled(row.data)) {
            const existing = userMap.get(row.user_id);
            if (existing) {
                existing.count++;
            } else {
                userMap.set(row.user_id, { email: row.user_email, count: 1 });
            }
        }
    });
    
    // Calculate completion percentage for each user
    const userProgress = Array.from(userMap.entries()).map(([userId, info]) => ({
        user_id: userId,
        email: info.email,
        labeled_count: info.count,
        percentage: totalRows > 0 ? Math.round((info.count / totalRows) * 100) : 0,
        is_complete: info.count >= totalRows
    }));
    
    // Count users who have completed 100%
    const completedUsers = userProgress.filter(u => u.is_complete).length;
    
    return { completedUsers, userProgress, totalRows, error: null };
};

export const updateDatasetProgress = async (datasetId: number, userId: string) => {
    // Get all rows for this user to count only labeled ones
    const { data: userRows, error: countError } = await supabase
        .from('spreadsheet_data')
        .select('data')
        .eq('dataset_id', datasetId)
        .eq('user_id', userId);
    
    if (countError) return { error: countError };
    
    // Count only rows that have been actually labeled (non-empty editable fields)
    const isRowLabeled = (rowData: any): boolean => {
        if (!rowData) return false;
        const editableFields = ['substep', 'intent_of_optum', 'flag', 'confidence_of_optum', 'patient_confidence_score', 'reason_for_flag'];
        return editableFields.some(field => {
            const value = rowData[field];
            return value && value.toString().trim() !== '';
        });
    };
    
    const labeledCount = userRows?.filter(row => isRowLabeled(row.data)).length || 0;
    
    // Get or create user_progress entry
    const { data: existing, error: fetchError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('user_id', userId)
        .maybeSingle();
    
    if (fetchError) return { error: fetchError };
    
    if (existing) {
        // Update existing progress
        return supabase
            .from('user_progress')
            .update({ labeled_count: labeledCount })
            .eq('id', existing.id);
    } else {
        // Create new progress entry
        const { data: { user } } = await supabase.auth.getUser();
        return supabase
            .from('user_progress')
            .insert([{
                dataset_id: datasetId,
                user_id: userId,
                name: user?.email || 'Unknown',
                labeled_count: labeledCount,
                percentage: 0
            }]);
    }
};
