-- Enable RLS on quota_logs if not already enabled
ALTER TABLE quota_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own quota usage
CREATE POLICY "Allow users to insert their own quota logs"
ON quota_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own quota logs
CREATE POLICY "Allow users to view their own quota logs"
ON quota_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
