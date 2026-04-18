ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "email_verification_token" varchar;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "email_verification_token_expires_at" timestamp;
