-- Create table for storing user-specific Octopus Energy credentials
CREATE TABLE IF NOT EXISTS "public"."octopus_credentials" (
    "user_id" uuid NOT NULL DEFAULT auth.uid(),
    "api_key" text NOT NULL,
    "account_number" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "octopus_credentials_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "octopus_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Enable RLS on credentials
ALTER TABLE "public"."octopus_credentials" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see/manage their own credentials
CREATE POLICY "Users can manage their own octopus credentials" ON "public"."octopus_credentials"
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- Update octopus_meters to belong to a user
-- Note: We are making user_id NULLABLE for now to support existing rows, 
-- but ideally you would migrate existing data or delete it.
-- For this migration, we'll cascade delete if user is deleted.
ALTER TABLE "public"."octopus_meters" 
ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- If you want to claim existing orphans for the current user, you'd need a manual script,
-- but for now we will just enforce RLS on new/claimed rows.

-- Enable RLS on meters if not already
ALTER TABLE "public"."octopus_meters" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to be safe and replace them)
DROP POLICY IF EXISTS "Users can view their own meters" ON "public"."octopus_meters";
DROP POLICY IF EXISTS "Users can insert their own meters" ON "public"."octopus_meters";
DROP POLICY IF EXISTS "Users can update their own meters" ON "public"."octopus_meters";

-- Create new policies
CREATE POLICY "Users can view their own meters" ON "public"."octopus_meters"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meters" ON "public"."octopus_meters"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meters" ON "public"."octopus_meters"
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meters" ON "public"."octopus_meters"
    FOR DELETE USING (auth.uid() = user_id);
