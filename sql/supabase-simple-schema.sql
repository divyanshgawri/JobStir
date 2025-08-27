-- JobStir Database Schema for Supabase (Simple & Working)
-- This version uses minimal RLS to avoid recursion issues

-- Create custom types
CREATE TYPE user_role AS ENUM ('candidate', 'hr', 'admin');
CREATE TYPE job_type AS ENUM ('full-time', 'part-time', 'contract', 'internship');
CREATE TYPE job_status AS ENUM ('active', 'paused', 'closed', 'draft');
CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'interview', 'offer', 'hired', 'rejected');
CREATE TYPE remote_preference AS ENUM ('remote', 'hybrid', 'onsite', 'any');

-- =============================================
-- USER PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    location TEXT,
    bio TEXT,
    avatar_url TEXT,
    resume_url TEXT,
    role user_role DEFAULT 'candidate',
    is_hr BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COMPANIES TABLE
-- =============================================
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    location TEXT,
    size TEXT,
    industry TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- JOBS TABLE
-- =============================================
CREATE TABLE jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    type job_type NOT NULL,
    remote_option remote_preference DEFAULT 'any',
    salary_min INTEGER,
    salary_max INTEGER,
    salary_display TEXT,
    description TEXT NOT NULL,
    requirements TEXT[],
    benefits TEXT[],
    experience_level TEXT,
    status job_status DEFAULT 'active',
    posted_by UUID REFERENCES user_profiles(id),
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- JOB APPLICATIONS TABLE
-- =============================================
CREATE TABLE job_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    status application_status DEFAULT 'pending',
    cover_letter TEXT,
    resume_url TEXT,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    feedback TEXT,
    notes TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- =============================================
-- USER SKILLS TABLE
-- =============================================
CREATE TABLE user_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    proficiency_level TEXT,
    years_experience INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill)
);

-- =============================================
-- JOB PREFERENCES TABLE
-- =============================================
CREATE TABLE job_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
    preferred_job_titles TEXT[],
    preferred_locations TEXT[],
    salary_min INTEGER,
    salary_max INTEGER,
    job_types job_type[],
    remote_preference remote_preference DEFAULT 'any',
    preferred_company_sizes TEXT[],
    preferred_industries TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================
CREATE TABLE notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
    email_job_matches BOOLEAN DEFAULT TRUE,
    email_application_updates BOOLEAN DEFAULT TRUE,
    email_newsletter BOOLEAN DEFAULT FALSE,
    push_new_jobs BOOLEAN DEFAULT FALSE,
    push_messages BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SAVED JOBS TABLE
-- =============================================
CREATE TABLE saved_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- =============================================
-- RESUME EVALUATIONS TABLE
-- =============================================
CREATE TABLE resume_evaluations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    
    -- Resume data
    resume_text TEXT NOT NULL,
    job_description TEXT NOT NULL,
    
    -- Parsed resume information
    parsed_resume JSONB,
    
    -- Evaluation scores
    total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),
    skills_score INTEGER CHECK (skills_score >= 0 AND skills_score <= 35),
    experience_score INTEGER CHECK (experience_score >= 0 AND experience_score <= 25),
    education_score INTEGER CHECK (education_score >= 0 AND education_score <= 20),
    project_score INTEGER CHECK (project_score >= 0 AND project_score <= 20),
    
    -- Analysis results
    matched_keywords TEXT[],
    missing_keywords TEXT[],
    quick_suggestions TEXT[],
    strengths TEXT[],
    improvements TEXT[],
    
    -- Detailed reasoning
    skills_reasoning TEXT,
    experience_reasoning TEXT,
    education_reasoning TEXT,
    project_reasoning TEXT,
    overall_assessment TEXT,
    summary TEXT,
    
    -- Job recommendations
    job_recommendations JSONB,
    
    -- Processing metadata
    processing_time_ms INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RESUME SKILLS EXTRACTED TABLE
-- =============================================
CREATE TABLE resume_skills_extracted (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluation_id UUID REFERENCES resume_evaluations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source TEXT, -- 'resume_text', 'experience', 'projects', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RESUME EXPERIENCE EXTRACTED TABLE
-- =============================================
CREATE TABLE resume_experience_extracted (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluation_id UUID REFERENCES resume_evaluations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_title TEXT,
    company TEXT,
    duration TEXT,
    location TEXT,
    description TEXT[],
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RESUME EDUCATION EXTRACTED TABLE
-- =============================================
CREATE TABLE resume_education_extracted (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluation_id UUID REFERENCES resume_evaluations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    degree TEXT,
    university TEXT,
    start_year TEXT,
    end_year TEXT,
    concentration TEXT,
    gpa TEXT,
    relevant_coursework TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RESUME PROJECTS EXTRACTED TABLE
-- =============================================
CREATE TABLE resume_projects_extracted (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    evaluation_id UUID REFERENCES resume_evaluations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT,
    description TEXT[],
    link TEXT,
    technologies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- JOB VIEWS TABLE (for analytics)
-- =============================================
CREATE TABLE job_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SYSTEM SETTINGS TABLE
-- =============================================
CREATE TABLE system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES user_profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_hr ON user_profiles(is_hr);
CREATE INDEX idx_user_profiles_is_admin ON user_profiles(is_admin);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_posted_by ON jobs(posted_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

CREATE INDEX idx_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_applications_status ON job_applications(status);
CREATE INDEX idx_applications_applied_at ON job_applications(applied_at DESC);

CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON user_skills(skill);

CREATE INDEX idx_job_views_job_id ON job_views(job_id);
CREATE INDEX idx_job_views_viewed_at ON job_views(viewed_at DESC);

-- Resume evaluation indexes
CREATE INDEX idx_resume_evaluations_user_id ON resume_evaluations(user_id);
CREATE INDEX idx_resume_evaluations_job_id ON resume_evaluations(job_id);
CREATE INDEX idx_resume_evaluations_created_at ON resume_evaluations(created_at DESC);
CREATE INDEX idx_resume_evaluations_total_score ON resume_evaluations(total_score DESC);

CREATE INDEX idx_resume_skills_evaluation_id ON resume_skills_extracted(evaluation_id);
CREATE INDEX idx_resume_skills_user_id ON resume_skills_extracted(user_id);
CREATE INDEX idx_resume_skills_skill ON resume_skills_extracted(skill);

CREATE INDEX idx_resume_experience_evaluation_id ON resume_experience_extracted(evaluation_id);
CREATE INDEX idx_resume_experience_user_id ON resume_experience_extracted(user_id);

CREATE INDEX idx_resume_education_evaluation_id ON resume_education_extracted(evaluation_id);
CREATE INDEX idx_resume_education_user_id ON resume_education_extracted(user_id);

CREATE INDEX idx_resume_projects_evaluation_id ON resume_projects_extracted(evaluation_id);
CREATE INDEX idx_resume_projects_user_id ON resume_projects_extracted(user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON job_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_evaluations_updated_at BEFORE UPDATE ON resume_evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, role, is_hr, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        'candidate',
        FALSE,
        CASE WHEN NEW.email = 'admin@jobstir.com' THEN TRUE ELSE FALSE END
    );
    
    -- Create default notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update job application count
CREATE OR REPLACE FUNCTION update_job_application_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE jobs SET applications_count = applications_count - 1 WHERE id = OLD.job_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update application count
CREATE TRIGGER update_job_application_count_trigger
    AFTER INSERT OR DELETE ON job_applications
    FOR EACH ROW EXECUTE FUNCTION update_job_application_count();

-- =============================================
-- SIMPLE RLS POLICIES (NO RECURSION)
-- =============================================

-- Enable RLS on tables that need it
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

-- User Profiles - Simple policies
CREATE POLICY "Users can access own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- Job Applications - Users can manage their own applications
CREATE POLICY "Users can manage own applications" ON job_applications
    FOR ALL USING (user_id = auth.uid());

-- Job Applications - Job posters can view applications for their jobs
CREATE POLICY "Job posters can view applications" ON job_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs 
            WHERE jobs.id = job_applications.job_id 
            AND jobs.posted_by = auth.uid()
        )
    );

-- User Skills - Users can manage their own skills
CREATE POLICY "Users can manage own skills" ON user_skills
    FOR ALL USING (user_id = auth.uid());

-- Job Preferences - Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON job_preferences
    FOR ALL USING (user_id = auth.uid());

-- Notification Preferences - Users can manage their own notifications
CREATE POLICY "Users can manage own notifications" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Saved Jobs - Users can manage their own saved jobs
CREATE POLICY "Users can manage own saved jobs" ON saved_jobs
    FOR ALL USING (user_id = auth.uid());

-- Resume Evaluations - Users can manage their own evaluations
ALTER TABLE resume_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own resume evaluations" ON resume_evaluations
    FOR ALL USING (user_id = auth.uid());

-- Resume Skills Extracted - Users can view their own extracted skills
ALTER TABLE resume_skills_extracted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own extracted skills" ON resume_skills_extracted
    FOR ALL USING (user_id = auth.uid());

-- Resume Experience Extracted - Users can view their own extracted experience
ALTER TABLE resume_experience_extracted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own extracted experience" ON resume_experience_extracted
    FOR ALL USING (user_id = auth.uid());

-- Resume Education Extracted - Users can view their own extracted education
ALTER TABLE resume_education_extracted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own extracted education" ON resume_education_extracted
    FOR ALL USING (user_id = auth.uid());

-- Resume Projects Extracted - Users can view their own extracted projects
ALTER TABLE resume_projects_extracted ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own extracted projects" ON resume_projects_extracted
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- PUBLIC ACCESS (NO RLS)
-- =============================================

-- These tables are publicly accessible or have simple access patterns
-- jobs - Anyone can view active jobs
-- companies - Anyone can view companies
-- job_views - Anyone can add views
-- system_settings - Admin only (handled in application layer)

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
('site_name', '"JobStir"', 'Website name'),
('site_description', '"Find your dream job with AI-powered precision"', 'Website description'),
('contact_email', '"contact@jobstir.com"', 'Contact email address'),
('support_email', '"support@jobstir.com"', 'Support email address'),
('max_applications_per_day', '10', 'Maximum applications per user per day'),
('job_expiry_days', '30', 'Default job expiry in days');

-- Insert sample companies
INSERT INTO companies (name, description, location, industry) VALUES
('TechCorp Inc.', 'Leading technology company specializing in web development', 'San Francisco, CA', 'Technology'),
('StartupXYZ', 'Fast-growing startup in the fintech space', 'Remote', 'Financial Technology'),
('DesignStudio', 'Creative agency focused on user experience design', 'Austin, TX', 'Design'),
('DataFlow Solutions', 'Data analytics and business intelligence company', 'New York, NY', 'Data & Analytics');

-- Insert sample jobs
INSERT INTO jobs (title, company_name, location, type, salary_display, description, requirements, posted_by) VALUES
('Senior Frontend Developer', 'TechCorp Inc.', 'San Francisco, CA', 'full-time', '$120,000 - $150,000', 'We are looking for a Senior Frontend Developer to join our team and build amazing user interfaces.', ARRAY['React', 'TypeScript', '5+ years experience'], (SELECT id FROM user_profiles WHERE email = 'admin@jobstir.com' LIMIT 1)),
('Product Manager', 'StartupXYZ', 'Remote', 'full-time', '$100,000 - $130,000', 'Join our product team to drive innovation and shape the future of our platform.', ARRAY['Product Management', 'Agile', '3+ years experience'], (SELECT id FROM user_profiles WHERE email = 'admin@jobstir.com' LIMIT 1)),
('UX Designer', 'DesignStudio', 'Austin, TX', 'contract', '$80 - $120 per hour', 'Create amazing user experiences for our diverse client base.', ARRAY['Figma', 'User Research', 'Design Systems'], (SELECT id FROM user_profiles WHERE email = 'admin@jobstir.com' LIMIT 1));