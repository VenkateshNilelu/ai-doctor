-- AI Doctor Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 120),
    sex VARCHAR(50) NOT NULL,
    weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0.5 AND weight <= 500),
    allergies TEXT,
    contact_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL,
    sex VARCHAR(50) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    allergies TEXT,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    is_emergency BOOLEAN DEFAULT FALSE,
    needs_referral BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_created ON patients(created_at);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON diagnoses(patient_name);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created ON diagnoses(created_at);
CREATE INDEX IF NOT EXISTS idx_diagnoses_emergency ON diagnoses(is_emergency);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients table
CREATE POLICY "Enable read access for all users" ON patients
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON patients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON patients
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON patients
    FOR DELETE USING (true);

-- Create RLS policies for diagnoses table
CREATE POLICY "Enable read access for all users" ON diagnoses
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON diagnoses
    FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO patients (full_name, age, sex, weight, allergies, contact_info) VALUES
('John Doe', 35, 'male', 75.5, 'Penicillin', '{"email": "john@example.com", "phone": "+1234567890"}'),
('Jane Smith', 28, 'female', 62.0, NULL, '{"email": "jane@example.com", "phone": "+1234567891"}'),
('Mike Johnson', 45, 'male', 85.2, 'Sulfa drugs', '{"email": "mike@example.com", "phone": "+1234567892"}')
ON CONFLICT DO NOTHING;

-- Create view for recent diagnoses with patient info
CREATE OR REPLACE VIEW recent_diagnoses AS
SELECT 
    d.id,
    d.patient_name,
    d.age,
    d.sex,
    d.weight,
    d.allergies,
    d.symptoms,
    d.diagnosis,
    d.confidence,
    d.is_emergency,
    d.needs_referral,
    d.created_at,
    p.contact_info
FROM diagnoses d
LEFT JOIN patients p ON d.patient_name = p.full_name
ORDER BY d.created_at DESC;

-- Grant necessary permissions
GRANT ALL ON patients TO anon;
GRANT ALL ON diagnoses TO anon;
GRANT ALL ON recent_diagnoses TO anon;
GRANT USAGE ON SCHEMA public TO anon;
