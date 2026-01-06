-- Create a function to get user progress with emails
-- This function can be called from the client side

CREATE OR REPLACE FUNCTION get_user_progress_with_emails()
RETURNS TABLE (
    id bigint,
    dataset_id bigint,
    user_id uuid,
    user_email text,
    rows_reviewed integer,
    last_saved_at timestamp with time zone,
    is_submitted boolean,
    submitted_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.dataset_id,
        up.user_id,
        au.email as user_email,
        up.rows_reviewed,
        up.last_saved_at,
        up.is_submitted,
        up.submitted_at
    FROM user_progress up
    LEFT JOIN auth.users au ON up.user_id = au.id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_progress_with_emails() TO authenticated;
