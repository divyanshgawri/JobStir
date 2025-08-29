// Supabase Integration Helper for JobStir
// This file provides easy-to-use functions for integrating Supabase with your JobStir application

class SupabaseManager {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
    }

    // Initialize Supabase client
    async init(supabaseUrl, supabaseAnonKey) {
        try {
            // Prefer shared singleton from supabase-config to avoid multiple clients
            if (window && window.getSupabaseClient) {
                const shared = window.getSupabaseClient();
                if (shared) {
                    this.supabase = shared;
                    this.isInitialized = true;
                    console.log('✅ Supabase initialized via shared singleton');
                    return true;
                }
            }

            // Fallback: direct createClient from global if available
            if (typeof createClient === 'undefined') {
                console.error('Supabase client library not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
                return false;
            }
            
            this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { storageKey: 'jobstir-auth' }
            });
            this.isInitialized = true;
            console.log('✅ Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            return false;
        }
    }

    // Check if Supabase is initialized
    checkInitialization() {
        if (!this.isInitialized) {
            console.error('❌ Supabase not initialized. Call init() first.');
            return false;
        }
        return true;
    }

    // ==================== AUTHENTICATION ====================

    // Sign up a new user
    async signUp(email, password, userData = {}) {
        if (!this.checkInitialization()) return null;

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData // Additional user metadata
                }
            });

            if (error) throw error;
            
            console.log('✅ User signed up successfully:', data.user?.email);
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('❌ Sign up failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Sign in existing user
    async signIn(email, password) {
        if (!this.checkInitialization()) return null;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            
            console.log('✅ User signed in successfully:', data.user?.email);
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('❌ Sign in failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Sign out current user
    async signOut() {
        if (!this.checkInitialization()) return null;

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            console.log('✅ User signed out successfully');
            return { success: true };
        } catch (error) {
            console.error('❌ Sign out failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get current user
    async getCurrentUser() {
        if (!this.checkInitialization()) return null;

        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            
            return user;
        } catch (error) {
            console.error('❌ Failed to get current user:', error.message);
            return null;
        }
    }

    // Listen to auth state changes
    onAuthStateChange(callback) {
        if (!this.checkInitialization()) return null;

        return this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event);
            callback(event, session);
        });
    }

    // ==================== DATABASE OPERATIONS ====================

    // Generic insert function
    async insert(table, data) {
        if (!this.checkInitialization()) return null;

        try {
            const { data: result, error } = await this.supabase
                .from(table)
                .insert(data)
                .select();

            if (error) throw error;
            
            console.log(`✅ Data inserted into ${table}:`, result);
            return { success: true, data: result };
        } catch (error) {
            console.error(`❌ Failed to insert into ${table}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Generic select function
    async select(table, columns = '*', filters = {}) {
        if (!this.checkInitialization()) return null;

        try {
            let query = this.supabase.from(table).select(columns);
            
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                if (typeof value === 'object' && value.operator) {
                    // Advanced filtering: { operator: 'gte', value: 18 }
                    query = query[value.operator](key, value.value);
                } else {
                    // Simple equality filter
                    query = query.eq(key, value);
                }
            });

            const { data, error } = await query;
            if (error) throw error;
            
            console.log(`✅ Data selected from ${table}:`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`❌ Failed to select from ${table}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Generic update function
    async update(table, updates, filters) {
        if (!this.checkInitialization()) return null;

        try {
            let query = this.supabase.from(table).update(updates);
            
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query.select();
            if (error) throw error;
            
            console.log(`✅ Data updated in ${table}:`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`❌ Failed to update ${table}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // Generic delete function
    async delete(table, filters) {
        if (!this.checkInitialization()) return null;

        try {
            let query = this.supabase.from(table).delete();
            
            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });

            const { data, error } = await query;
            if (error) throw error;
            
            console.log(`✅ Data deleted from ${table}:`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`❌ Failed to delete from ${table}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ==================== JOBSTIR SPECIFIC FUNCTIONS ====================

    // User Management
    async createUserProfile(userId, profileData) {
        return await this.insert('user_profiles', {
            user_id: userId,
            ...profileData,
            created_at: new Date().toISOString()
        });
    }

    async getUserProfile(userId) {
        const result = await this.select('user_profiles', '*', { user_id: userId });
        return result.success ? result.data[0] : null;
    }

    // Job Management
    async createJob(jobData) {
        const user = await this.getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        return await this.insert('jobs', {
            ...jobData,
            created_by: user.id,
            created_at: new Date().toISOString(),
            status: 'active'
        });
    }

    async getJobs(filters = {}) {
        return await this.select('jobs', '*', filters);
    }

    async updateJob(jobId, updates) {
        return await this.update('jobs', updates, { id: jobId });
    }

    async deleteJob(jobId) {
        return await this.delete('jobs', { id: jobId });
    }

    // Application Management
    async createApplication(applicationData) {
        const user = await this.getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        return await this.insert('applications', {
            ...applicationData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            status: 'pending'
        });
    }

    async getUserApplications(userId = null) {
        const user = userId || await this.getCurrentUser();
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        return await this.select('applications', '*', { 
            user_id: typeof user === 'string' ? user : user.id 
        });
    }

    async updateApplicationStatus(applicationId, status) {
        return await this.update('applications', { status }, { id: applicationId });
    }

    // Contact Messages
    async createContactMessage(messageData) {
        return await this.insert('contact_messages', {
            ...messageData,
            created_at: new Date().toISOString(),
            status: 'unread'
        });
    }

    // ==================== REAL-TIME SUBSCRIPTIONS ====================

    // Subscribe to table changes
    subscribeToTable(table, callback, filters = {}) {
        if (!this.checkInitialization()) return null;

        let subscription = this.supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: table,
                    ...filters 
                }, 
                callback
            )
            .subscribe();

        console.log(`🔔 Subscribed to ${table} changes`);
        return subscription;
    }

    // Unsubscribe from changes
    unsubscribe(subscription) {
        if (subscription) {
            this.supabase.removeChannel(subscription);
            console.log('🔕 Unsubscribed from changes');
        }
    }

    // ==================== FILE STORAGE ====================

    // Upload file to Supabase Storage
    async uploadFile(bucket, path, file) {
        if (!this.checkInitialization()) return null;

        try {
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, file);

            if (error) throw error;
            
            console.log('✅ File uploaded successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('❌ File upload failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Get public URL for uploaded file
    getPublicUrl(bucket, path) {
        if (!this.checkInitialization()) return null;

        const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // Delete file from storage
    async deleteFile(bucket, paths) {
        if (!this.checkInitialization()) return null;

        try {
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .remove(Array.isArray(paths) ? paths : [paths]);

            if (error) throw error;
            
            console.log('✅ File(s) deleted successfully:', data);
            return { success: true, data };
        } catch (error) {
            console.error('❌ File deletion failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.supabaseManager = new SupabaseManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseManager;
}

// ==================== USAGE EXAMPLES ====================

/*
// 1. Initialize Supabase (call this once in your app)
await supabaseManager.init('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

// 2. Authentication
const signUpResult = await supabaseManager.signUp('user@example.com', 'password123', {
    full_name: 'John Doe',
    is_hr: false
});

const signInResult = await supabaseManager.signIn('user@example.com', 'password123');

// 3. Database Operations
const jobResult = await supabaseManager.createJob({
    title: 'Software Engineer',
    company: 'Tech Corp',
    description: 'Great opportunity...',
    location: 'Remote'
});

const jobs = await supabaseManager.getJobs({ status: 'active' });

// 4. Real-time subscriptions
const subscription = supabaseManager.subscribeToTable('jobs', (payload) => {
    console.log('Job updated:', payload);
});

// 5. File uploads
const fileInput = document.getElementById('resume-upload');
const file = fileInput.files[0];
const uploadResult = await supabaseManager.uploadFile('resumes', `${userId}/${file.name}`, file);
*/