-- Supabase Database Setup for Secure Auth System
-- Run these commands in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    secretPhrase TEXT,
    balance DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    wallet_pin VARCHAR(6),
    biometric_enabled BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings table
-- Allow users to read their own settings
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT USING (auth.email() = email);

-- Allow users to insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.email() = email);

-- Allow users to update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE USING (auth.email() = email);

-- Add secretPhrase column if it doesn't exist (for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS secretPhrase TEXT;

-- Add portfolio column if it doesn't exist (for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb;

-- Add profile_picture column if it doesn't exist (for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add send_message column if it doesn't exist (for storing admin-set send message)
ALTER TABLE users ADD COLUMN IF NOT EXISTS send_message TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_email ON user_settings(email);

-- Create storage bucket for user uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for user uploads (allow all operations since app uses custom auth)
CREATE POLICY "Allow all operations on user-uploads" ON storage.objects
FOR ALL USING (bucket_id = 'user-uploads');

-- Insert a test user (optional - for testing)
-- INSERT INTO users (email, password, secretPhrase) VALUES
-- ('test@example.com', 'password123', 'test phrase for demo purposes');
