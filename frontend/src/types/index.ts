export type UserRole = 'labeler' | 'reviewer' | 'admin';

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface Dataset {
    id: number;
    name: string;
    uploaded_at: string;
    total_rows: number;
    labeled_count: number;
    labelers_count: number;
}

export interface LogRow {
    id: number;
    dataset_id: number;
    row_index: number;
    session_id: string;
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
    utterance: string;
}

export type Flag = 'GREEN' | 'YELLOW' | 'RED';

export interface Label {
    id?: number;
    log_row_id: number;
    step: string;
    substep: string;
    intent_of_optum: string;
    confidence_of_optum: number;
    patient_confidence_score: number;
    flag: Flag;
    reason_for_flag?: string;
}

export interface UserProgress {
    user_id: string;
    name: string;
    email: string;
    labeled_count: number;
    percentage: number;
}
