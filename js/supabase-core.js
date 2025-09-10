// Optimized JobStir Supabase Core Integration
// This file consolidates all database operations and auth functionality

class JobStirCore {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.config = {
            url: null,
            anonKey: null,
            options: {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storageKey: 'jobstir-auth'
                }
            }
        };
        this.init();
    }

    // ====================================
    // INITIALIZATION
    // ====================================
    
    async init() {
        try {
            // Load config from server environment or fallback to development
            await this.loadConfig();
            
            if (this.config.url && this.config.anonKey && 
                !this.config.url.includes('your-project-id') && 
                !this.config.anonKey.includes('your-supabase-anon-key')) {
                
                await this.initializeSupabase();
            } else {
                console.info('ℹ️ Supabase not configured. Running in demo mode with localStorage.');
            }
            
            await this.loadSession();
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize JobStir:', error);
            this.isInitialized = true; // Continue with localStorage fallback
        }
    }

    async loadConfig() {
        // Try to fetch config from server
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const serverConfig = await response.json();
                this.config.url = serverConfig.supabaseUrl;
                this.config.anonKey = serverConfig.supabaseAnonKey;
            }
        } catch (error) {
            // Fallback to client-side config (for development)
            this.config.url = window.SUPABASE_URL || 'https://your-project-id.supabase.co';
            this.config.anonKey = window.SUPABASE_ANON_KEY || 'your-supabase-anon-key-here';
        }
    }

    async initializeSupabase() {
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.warn('⚠️ Supabase library not loaded. Using localStorage fallback.');
            return;
        }

        this.supabase = window.supabase.createClient(
            this.config.url,
            this.config.anonKey,
            this.config.options
        );

        // Set up auth state change listener
        this.supabase.auth.onAuthStateChange((event, session) => {
            this.handleAuthStateChange(event, session);
        });

        console.log('✅ Supabase initialized successfully');
    }

    async loadSession() {
        if (this.supabase) {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session?.user) {
                this.currentUser = session.user;
            }
        } else {
            // Load from localStorage
            const session = localStorage.getItem('jobstir_session');
            if (session) {
                try {
                    this.currentUser = JSON.parse(session);
                } catch (error) {
                    localStorage.removeItem('jobstir_session');
                }
            }
        }
    }

    handleAuthStateChange(event, session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            this.currentUser = session?.user || null;
            this.saveSession();
            if (this.currentUser) {
                // Ensure a profile row exists for OAuth users (Google/GitHub/LinkedIn)
                this.upsertProfileFromAuth(this.currentUser).catch(err => {
                    console.warn('Profile upsert failed:', err?.message || err);
                });
            }
        } else if (event === 'SIGNED_OUT') {
            this.currentUser = null;
            this.clearSession();
        }
    }

    saveSession() {
        if (this.currentUser) {
            const sessionData = {
                id: this.currentUser.id,
                email: this.currentUser.email,
                user_metadata: this.currentUser.user_metadata || {}
            };
            localStorage.setItem('jobstir_session', JSON.stringify(sessionData));
        }
    }

    clearSession() {
        localStorage.removeItem('jobstir_session');
        localStorage.removeItem('jobstir_user_profile');
    }

    // ====================================
    // AUTHENTICATION METHODS
    // ====================================

    async signUp({ email, password, metadata = {} }) {
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase.auth.signUp({
                    email,
                    password,
                    options: { data: metadata }
                });
                
                if (error) throw error;
                return { success: true, data, needsConfirmation: !data.session };
            } else {
                // Fallback localStorage signup
                return this.fallbackSignUp(email, password, metadata);
            }
        } catch (error) {
            throw new Error(error.message || 'Sign up failed');
        }
    }

    async signIn({ email, password }) {
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase.auth.signInWithPassword({ 
                    email, 
                    password 
                });
                
                if (error) throw error;
                return { success: true, data };
            } else {
                // Fallback localStorage signin
                return this.fallbackSignIn(email, password);
            }
        } catch (error) {
            throw new Error(error.message || 'Sign in failed');
        }
    }

    async signInWithGoogle() {
        if (!this.supabase) {
            throw new Error('Google sign-in requires Supabase configuration');
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            throw new Error(error.message || 'Google sign-in failed');
        }
    }

    async signInWithGithub() {
        if (!this.supabase) throw new Error('GitHub sign-in requires Supabase configuration');
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw new Error(error.message || 'GitHub sign-in failed');
        return { success: true, data };
    }

    /**
     * Send a password reset email to the user
     * @param {string} email - User's email address
     * @returns {Promise<{success: boolean, data: any}>}
     */
    async resetPassword(email) {
        try {
            if (!this.supabase) {
                console.warn('Password reset is not available in demo mode');
                return { success: true, data: { email } };
            }

            const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Password reset error:', error);
            throw new Error(error.message || 'Failed to send password reset email');
        }
    }

    /**
     * Update user's password using a recovery token
     * @param {string} token - Password reset token from URL
     * @param {string} newPassword - New password
     * @returns {Promise<{success: boolean, data: any}>}
     */
    async updatePassword(token, newPassword) {
        try {
            if (!this.supabase) {
                console.warn('Password update is not available in demo mode');
                return { success: true, data: { updated: true } };
            }

            // First, update the session with the token
            const { data: sessionData, error: sessionError } = await this.supabase.auth.verifyOtp({
                token_hash: token,
                type: 'recovery',
                email: '' // Email will be extracted from the token
            });

            if (sessionError) throw sessionError;

            // Then update the password
            const { data, error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update password error:', error);
            throw new Error(error.message || 'Failed to update password');
        }
    }

    /**
     * Update the current user's password (requires user to be signed in)
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<{success: boolean, data: any}>}
     */
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.supabase) {
                console.warn('Password change is not available in demo mode');
                return { success: true, data: { updated: true } };
            }

            // First, reauthenticate the user
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: this.currentUser.email,
                password: currentPassword
            });

            if (authError) throw authError;

            // Then update the password
            const { data, error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Change password error:', error);
            throw new Error(error.message || 'Failed to change password');
        }
    }

    async signInWithLinkedIn() {
        if (!this.supabase) throw new Error('LinkedIn sign-in requires Supabase configuration');
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider: 'linkedin_oidc',
            options: { redirectTo: window.location.origin }
        });
        if (error) throw new Error(error.message || 'LinkedIn sign-in failed');
        return { success: true, data };
    }

    async signOut() {
        try {
            if (this.supabase) {
                const { error } = await this.supabase.auth.signOut();
                if (error) throw error;
            }
            
            this.currentUser = null;
            this.clearSession();
            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Sign out failed');
        }
    }

    async resetPassword(email) {
        if (!this.supabase) {
            throw new Error('Password reset requires Supabase configuration');
        }

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            throw new Error(error.message || 'Password reset failed');
        }
    }

    // ====================================
    // USER PROFILE METHODS
    // ====================================

    async getUserProfile(userId = null) {
        const targetUserId = userId || this.currentUser?.id;
        if (!targetUserId) return null;

        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('user_profiles')
                    .select(`
                        *,
                        user_skills(skill, proficiency_level),
                        job_preferences(*),
                        notification_preferences(*)
                    `)
                    .eq('id', targetUserId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;
                return data || this.createDefaultProfile(targetUserId);
            } else {
                return this.fallbackGetUserProfile(targetUserId);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return this.fallbackGetUserProfile(targetUserId);
        }
    }

    async updateUserProfile(updates) {
        if (!this.currentUser) throw new Error('User not authenticated');

        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('user_profiles')
                    .upsert({
                        id: this.currentUser.id,
                        ...updates,
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                return this.fallbackUpdateUserProfile(this.currentUser.id, updates);
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            return this.fallbackUpdateUserProfile(this.currentUser.id, updates);
        }
    }

    // Create or update profile row based on OAuth user metadata
    async upsertProfileFromAuth(user) {
        try {
            const meta = user?.user_metadata || {};
            const fullName = meta.full_name || meta.name || `${meta.given_name || ''} ${meta.family_name || ''}`.trim();
            const firstName = meta.given_name || (fullName ? fullName.split(' ')[0] : '');
            const lastName = meta.family_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '');
            const avatarUrl = meta.avatar_url || meta.picture || '';
            const provider = user?.app_metadata?.provider || meta.provider || null;

            const profileRow = {
                id: user.id,
                email: user.email,
                first_name: firstName,
                last_name: lastName,
                full_name: fullName || null,
                avatar_url: avatarUrl || null,
                auth_provider: provider,
                updated_at: new Date().toISOString()
            };

            if (this.supabase) {
                const { error } = await this.supabase
                    .from('user_profiles')
                    .upsert(profileRow, { onConflict: 'id' });
                if (error) throw error;
            } else {
                // localStorage fallback
                const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
                profiles[user.id] = { ...(profiles[user.id] || {}), ...profileRow };
                localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
            }
        } catch (error) {
            console.warn('upsertProfileFromAuth error:', error?.message || error);
        }
    }

    // ====================================
    // JOBS METHODS
    // ====================================

    async getJobs(filters = {}) {
        try {
            if (this.supabase) {
                let query = this.supabase
                    .from('jobs')
                    .select(`
                        *,
                        companies(name, logo_url)
                    `)
                    .eq('status', 'active');

                // Apply filters
                if (filters.search) {
                    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
                }
                if (filters.location) {
                    query = query.ilike('location', `%${filters.location}%`);
                }
                if (filters.jobType) {
                    query = query.eq('type', filters.jobType);
                }
                if (filters.remote !== undefined) {
                    query = query.eq('remote_option', filters.remote);
                }

                // Apply sorting and pagination
                query = query.order('created_at', { ascending: false });
                
                if (filters.limit) {
                    query = query.limit(filters.limit);
                }

                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            } else {
                return this.fallbackGetJobs(filters);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
            return this.fallbackGetJobs(filters);
        }
    }

    async getJobById(jobId) {
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('jobs')
                    .select(`
                        *,
                        companies(name, logo_url, website),
                        user_profiles!jobs_posted_by_fkey(first_name, last_name)
                    `)
                    .eq('id', jobId)
                    .single();

                if (error) throw error;
                
                // Increment view count
                this.incrementJobViews(jobId);
                
                return data;
            } else {
                return this.fallbackGetJobById(jobId);
            }
        } catch (error) {
            console.error('Error fetching job:', error);
            return this.fallbackGetJobById(jobId);
        }
    }

    async createJob(jobData) {
        if (!this.currentUser) throw new Error('Authentication required');

        try {
            const newJob = {
                ...jobData,
                posted_by: this.currentUser.id,
                created_at: new Date().toISOString(),
                status: 'active'
            };

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('jobs')
                    .insert(newJob)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                return this.fallbackCreateJob(newJob);
            }
        } catch (error) {
            console.error('Error creating job:', error);
            throw new Error('Failed to create job');
        }
    }

    async incrementJobViews(jobId) {
        if (!this.supabase) return;

        try {
            await this.supabase
                .from('job_views')
                .insert({
                    job_id: jobId,
                    user_id: this.currentUser?.id,
                    viewed_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error incrementing job views:', error);
        }
    }

    // ====================================
    // APPLICATIONS METHODS
    // ====================================

    async getUserApplications() {
        if (!this.currentUser) return [];

        try {
            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('job_applications')
                    .select(`
                        *,
                        jobs(title, company_name, location, type)
                    `)
                    .eq('user_id', this.currentUser.id)
                    .order('applied_at', { ascending: false });

                if (error) throw error;
                return data || [];
            } else {
                return this.fallbackGetUserApplications(this.currentUser.id);
            }
        } catch (error) {
            console.error('Error fetching user applications:', error);
            return this.fallbackGetUserApplications(this.currentUser.id);
        }
    }

    async applyForJob(jobId, coverLetter = '') {
        if (!this.currentUser) throw new Error('Authentication required');

        try {
            const applicationData = {
                user_id: this.currentUser.id,
                job_id: jobId,
                cover_letter: coverLetter,
                status: 'pending',
                applied_at: new Date().toISOString()
            };

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('job_applications')
                    .insert(applicationData)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                return this.fallbackCreateApplication(applicationData);
            }
        } catch (error) {
            console.error('Error applying for job:', error);
            throw new Error('Failed to submit application');
        }
    }

    // ====================================
    // CONTACT & SUPPORT
    // ====================================

    async submitContactForm({ name, email, subject, message }) {
        try {
            const contactData = {
                name,
                email,
                subject,
                message,
                submitted_at: new Date().toISOString(),
                status: 'new'
            };

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('contact_messages')
                    .insert(contactData)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data };
            } else {
                // Fallback - store locally and show success
                const messages = JSON.parse(localStorage.getItem('jobstir_contact_messages') || '[]');
                const newMessage = { ...contactData, id: Date.now().toString() };
                messages.push(newMessage);
                localStorage.setItem('jobstir_contact_messages', JSON.stringify(messages));
                return { success: true, data: newMessage };
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            throw new Error('Failed to submit message');
        }
    }

    // ====================================
    // RESUME EVALUATION
    // ====================================

    async evaluateResume(fileData, fileName) {
        try {
            if (!this.currentUser) {
                // Allow anonymous resume evaluation
            }

            const evaluationData = {
                user_id: this.currentUser?.id || null,
                file_name: fileName,
                file_size: fileData.size || 0,
                evaluation_score: this.generateMockScore(),
                suggestions: this.generateMockSuggestions(),
                evaluated_at: new Date().toISOString()
            };

            if (this.supabase) {
                const { data, error } = await this.supabase
                    .from('resume_evaluations')
                    .insert(evaluationData)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Fallback - return mock evaluation
                return {
                    ...evaluationData,
                    id: Date.now().toString()
                };
            }
        } catch (error) {
            console.error('Error evaluating resume:', error);
            throw new Error('Resume evaluation failed');
        }
    }

    generateMockScore() {
        return Math.floor(Math.random() * 40) + 60; // Score between 60-100
    }

    generateMockSuggestions() {
        const suggestions = [
            'Add more quantifiable achievements with specific numbers and percentages',
            'Include relevant keywords from the job description you\'re targeting',
            'Improve the formatting and visual hierarchy of your resume',
            'Add a professional summary section at the top',
            'Include more technical skills relevant to your field',
            'Consider adding links to your portfolio or LinkedIn profile'
        ];
        
        return suggestions.slice(0, Math.floor(Math.random() * 3) + 3);
    }

    // ====================================
    // FALLBACK METHODS (localStorage)
    // ====================================

    fallbackSignUp(email, password, metadata) {
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        if (users.some(u => u.email === email)) {
            throw new Error('User already exists');
        }

        const newUser = {
            id: 'local_' + Date.now(),
            email,
            password,
            user_metadata: metadata,
            created_at: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('jobstir_users', JSON.stringify(users));
        
        this.currentUser = { id: newUser.id, email: newUser.email, user_metadata: metadata };
        this.saveSession();
        
        return { success: true, data: { user: this.currentUser } };
    }

    fallbackSignIn(email, password) {
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error('Invalid credentials');
        }

        this.currentUser = { 
            id: user.id, 
            email: user.email, 
            user_metadata: user.user_metadata || {} 
        };
        this.saveSession();
        
        return { success: true, data: { user: this.currentUser } };
    }

    fallbackGetUserProfile(userId) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        return profiles[userId] || this.createDefaultProfile(userId);
    }

    fallbackUpdateUserProfile(userId, updates) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        profiles[userId] = { 
            ...profiles[userId], 
            ...updates, 
            id: userId,
            updated_at: new Date().toISOString() 
        };
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        return profiles[userId];
    }

    fallbackGetJobs(filters) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || JSON.stringify(this.getMockJobs()));
        return jobs.filter(job => job.status === 'active');
    }

    fallbackGetJobById(jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || JSON.stringify(this.getMockJobs()));
        return jobs.find(job => job.id === jobId);
    }

    fallbackCreateJob(jobData) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const newJob = { 
            ...jobData, 
            id: Date.now().toString(),
            created_at: new Date().toISOString() 
        };
        jobs.push(newJob);
        localStorage.setItem('jobstir_jobs', JSON.stringify(jobs));
        return newJob;
    }

    fallbackGetUserApplications(userId) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        return applications.filter(app => app.user_id === userId);
    }

    fallbackCreateApplication(applicationData) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        const newApplication = { 
            ...applicationData, 
            id: Date.now().toString() 
        };
        applications.push(newApplication);
        localStorage.setItem('jobstir_applications', JSON.stringify(applications));
        return newApplication;
    }

    createDefaultProfile(userId) {
        return {
            id: userId,
            first_name: '',
            last_name: '',
            email: this.currentUser?.email || '',
            phone: '',
            location: '',
            bio: '',
            skills: [],
            preferences: {},
            notifications: {
                email_job_matches: true,
                email_application_updates: true,
                push_new_jobs: false
            }
        };
    }

    getMockJobs() {
        return [
            {
                id: "1",
                title: "Senior Software Engineer",
                company_name: "TechCorp Inc",
                location: "San Francisco, CA",
                type: "full-time",
                remote_option: "hybrid",
                salary_min: 120000,
                salary_max: 180000,
                description: "Join our team to build scalable web applications using modern technologies.",
                requirements: ["5+ years experience", "React/Node.js", "AWS knowledge"],
                status: "active",
                created_at: new Date().toISOString()
            },
            {
                id: "2",
                title: "Frontend Developer",
                company_name: "StartupXYZ",
                location: "Remote",
                type: "full-time",
                remote_option: "remote",
                salary_min: 80000,
                salary_max: 120000,
                description: "Build beautiful user interfaces and improve user experience.",
                requirements: ["3+ years experience", "React/Vue.js", "CSS/SCSS"],
                status: "active",
                created_at: new Date().toISOString()
            }
        ];
    }

    // ====================================
    // UTILITY METHODS
    // ====================================

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async waitForInitialization() {
        while (!this.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// Initialize JobStir Core
const jobStirCore = new JobStirCore();

// Export globally
window.JobStir = jobStirCore;
window.jobStirCore = jobStirCore; // Backward compatibility

// Legacy exports for existing code
window.getSupabaseClient = () => jobStirCore.supabase;
window.authService = {
    signUp: (data) => jobStirCore.signUp(data),
    signIn: (data) => jobStirCore.signIn(data),
    signOut: () => jobStirCore.signOut(),
    resetPassword: (email) => jobStirCore.resetPassword(email),
    updatePassword: (token, newPassword) => jobStirCore.updatePassword(token, newPassword),
    changePassword: (currentPassword, newPassword) => jobStirCore.changePassword(currentPassword, newPassword),
    signInWithGoogle: () => jobStirCore.signInWithGoogle(),
    signInWithGithub: () => jobStirCore.signInWithGithub(),
    signInWithLinkedIn: () => jobStirCore.signInWithLinkedIn(),
    currentUser: jobStirCore.currentUser
};
window.dbService = {
    getUserProfile: (id) => jobStirCore.getUserProfile(id),
    updateUserProfile: (id, data) => jobStirCore.updateUserProfile(data),
    getJobs: (filters) => jobStirCore.getJobs(filters),
    getJobById: (id) => jobStirCore.getJobById(id),
    getUserApplications: (id) => jobStirCore.getUserApplications(),
    createApplication: (data) => jobStirCore.applyForJob(data.job_id, data.cover_letter)
};

console.log('✅ JobStir Core initialized');
