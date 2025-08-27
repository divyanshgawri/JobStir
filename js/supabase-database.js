// Supabase Database Service for JobStir
class SupabaseDatabaseService {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        this.supabase = getSupabaseClient();
        if (!this.supabase) {
            console.warn('Supabase not initialized. Using localStorage fallback.');
        }
    }

    // =============================================
    // USER PROFILE METHODS
    // =============================================

    async getUserProfile(userId) {
        if (!this.supabase) {
            return this.fallbackGetUserProfile(userId);
        }

        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    *,
                    user_skills(skill, proficiency_level, years_experience),
                    job_preferences(*),
                    notification_preferences(*)
                `)
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return this.fallbackGetUserProfile(userId);
        }
    }

    async updateUserProfile(userId, updates) {
        if (!this.supabase) {
            return this.fallbackUpdateUserProfile(userId, updates);
        }

        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user profile:', error);
            return this.fallbackUpdateUserProfile(userId, updates);
        }
    }

    async updateUserSkills(userId, skills) {
        if (!this.supabase) {
            return this.fallbackUpdateUserSkills(userId, skills);
        }

        try {
            // Delete existing skills
            await this.supabase
                .from('user_skills')
                .delete()
                .eq('user_id', userId);

            // Insert new skills
            if (skills.length > 0) {
                const skillsData = skills.map(skill => ({
                    user_id: userId,
                    skill: typeof skill === 'string' ? skill : skill.name,
                    proficiency_level: typeof skill === 'object' ? skill.proficiency : 'intermediate'
                }));

                const { data, error } = await this.supabase
                    .from('user_skills')
                    .insert(skillsData)
                    .select();

                if (error) throw error;
                return data;
            }
            return [];
        } catch (error) {
            console.error('Error updating user skills:', error);
            return this.fallbackUpdateUserSkills(userId, skills);
        }
    }

    async updateJobPreferences(userId, preferences) {
        if (!this.supabase) {
            return this.fallbackUpdateJobPreferences(userId, preferences);
        }

        try {
            const { data, error } = await this.supabase
                .from('job_preferences')
                .upsert({
                    user_id: userId,
                    ...preferences
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating job preferences:', error);
            return this.fallbackUpdateJobPreferences(userId, preferences);
        }
    }

    async updateNotificationPreferences(userId, preferences) {
        if (!this.supabase) {
            return this.fallbackUpdateNotificationPreferences(userId, preferences);
        }

        try {
            const { data, error } = await this.supabase
                .from('notification_preferences')
                .upsert({
                    user_id: userId,
                    ...preferences
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return this.fallbackUpdateNotificationPreferences(userId, preferences);
        }
    }

    // =============================================
    // JOBS METHODS
    // =============================================

    async getJobs(filters = {}) {
        if (!this.supabase) {
            return this.fallbackGetJobs(filters);
        }

        try {
            let query = this.supabase
                .from('jobs')
                .select(`
                    *,
                    companies(name, logo_url, size)
                `)
                .eq('status', 'active');

            // Apply filters
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
            }
            if (filters.location) {
                query = query.ilike('location', `%${filters.location}%`);
            }
            if (filters.jobTypes && filters.jobTypes.length > 0) {
                query = query.in('type', filters.jobTypes);
            }
            if (filters.remoteOptions && filters.remoteOptions.length > 0) {
                query = query.in('remote_option', filters.remoteOptions);
            }
            if (filters.salaryMin) {
                query = query.gte('salary_min', filters.salaryMin);
            }
            if (filters.salaryMax) {
                query = query.lte('salary_max', filters.salaryMax);
            }

            // Apply sorting
            const sortBy = filters.sortBy || 'newest';
            switch (sortBy) {
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'salary_high':
                    query = query.order('salary_max', { ascending: false });
                    break;
                case 'salary_low':
                    query = query.order('salary_min', { ascending: true });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }

            // Apply pagination
            if (filters.page && filters.limit) {
                const from = (filters.page - 1) * filters.limit;
                const to = from + filters.limit - 1;
                query = query.range(from, to);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching jobs:', error);
            return this.fallbackGetJobs(filters);
        }
    }

    async getJobById(jobId) {
        if (!this.supabase) {
            return this.fallbackGetJobById(jobId);
        }

        try {
            const { data, error } = await this.supabase
                .from('jobs')
                .select(`
                    *,
                    companies(name, logo_url, size, description, website),
                    user_profiles!jobs_posted_by_fkey(first_name, last_name)
                `)
                .eq('id', jobId)
                .single();

            if (error) throw error;

            // Increment view count
            await this.incrementJobViews(jobId);

            return data;
        } catch (error) {
            console.error('Error fetching job:', error);
            return this.fallbackGetJobById(jobId);
        }
    }

    async createJob(jobData) {
        if (!this.supabase) {
            return this.fallbackCreateJob(jobData);
        }

        try {
            const { data, error } = await this.supabase
                .from('jobs')
                .insert(jobData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating job:', error);
            return this.fallbackCreateJob(jobData);
        }
    }

    async updateJob(jobId, updates) {
        if (!this.supabase) {
            return this.fallbackUpdateJob(jobId, updates);
        }

        try {
            const { data, error } = await this.supabase
                .from('jobs')
                .update(updates)
                .eq('id', jobId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating job:', error);
            return this.fallbackUpdateJob(jobId, updates);
        }
    }

    async deleteJob(jobId) {
        if (!this.supabase) {
            return this.fallbackDeleteJob(jobId);
        }

        try {
            const { error } = await this.supabase
                .from('jobs')
                .delete()
                .eq('id', jobId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting job:', error);
            return this.fallbackDeleteJob(jobId);
        }
    }

    async incrementJobViews(jobId, userId = null) {
        if (!this.supabase) return;

        try {
            // Add view record
            await this.supabase
                .from('job_views')
                .insert({
                    job_id: jobId,
                    user_id: userId,
                    ip_address: null, // Could be populated server-side
                    user_agent: navigator.userAgent
                });

            // Update job views count
            await this.supabase
                .from('jobs')
                .update({ views_count: this.supabase.raw('views_count + 1') })
                .eq('id', jobId);
        } catch (error) {
            console.error('Error incrementing job views:', error);
        }
    }

    // =============================================
    // APPLICATIONS METHODS
    // =============================================

    async getUserApplications(userId) {
        if (!this.supabase) {
            return this.fallbackGetUserApplications(userId);
        }

        try {
            const { data, error } = await this.supabase
                .from('job_applications')
                .select(`
                    *,
                    jobs(title, company_name, location, type, salary_display)
                `)
                .eq('user_id', userId)
                .order('applied_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching user applications:', error);
            return this.fallbackGetUserApplications(userId);
        }
    }

    async getJobApplications(jobId) {
        if (!this.supabase) {
            return this.fallbackGetJobApplications(jobId);
        }

        try {
            const { data, error } = await this.supabase
                .from('job_applications')
                .select(`
                    *,
                    user_profiles(first_name, last_name, email, phone, resume_url)
                `)
                .eq('job_id', jobId)
                .order('applied_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching job applications:', error);
            return this.fallbackGetJobApplications(jobId);
        }
    }

    async createApplication(applicationData) {
        if (!this.supabase) {
            return this.fallbackCreateApplication(applicationData);
        }

        try {
            const { data, error } = await this.supabase
                .from('job_applications')
                .insert(applicationData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating application:', error);
            return this.fallbackCreateApplication(applicationData);
        }
    }

    async updateApplicationStatus(applicationId, status, feedback = null) {
        if (!this.supabase) {
            return this.fallbackUpdateApplicationStatus(applicationId, status, feedback);
        }

        try {
            const updates = { status };
            if (feedback) updates.feedback = feedback;

            const { data, error } = await this.supabase
                .from('job_applications')
                .update(updates)
                .eq('id', applicationId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating application status:', error);
            return this.fallbackUpdateApplicationStatus(applicationId, status, feedback);
        }
    }

    // =============================================
    // ADMIN METHODS
    // =============================================

    async getAllUsers(filters = {}) {
        if (!this.supabase) {
            return this.fallbackGetAllUsers(filters);
        }

        try {
            let query = this.supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters.role) {
                query = query.eq('role', filters.role);
            }
            if (filters.search) {
                query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching all users:', error);
            return this.fallbackGetAllUsers(filters);
        }
    }

    async getAllApplications(filters = {}) {
        if (!this.supabase) {
            return this.fallbackGetAllApplications(filters);
        }

        try {
            let query = this.supabase
                .from('application_details_view')
                .select('*')
                .order('applied_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.dateFrom) {
                query = query.gte('applied_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('applied_at', filters.dateTo);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching all applications:', error);
            return this.fallbackGetAllApplications(filters);
        }
    }

    async getAnalytics() {
        if (!this.supabase) {
            return this.fallbackGetAnalytics();
        }

        try {
            // Get basic stats
            const [usersResult, jobsResult, applicationsResult] = await Promise.all([
                this.supabase.from('user_profiles').select('id', { count: 'exact' }),
                this.supabase.from('jobs').select('id', { count: 'exact' }).eq('status', 'active'),
                this.supabase.from('job_applications').select('id', { count: 'exact' })
            ]);

            const analytics = {
                totalUsers: usersResult.count || 0,
                activeJobs: jobsResult.count || 0,
                totalApplications: applicationsResult.count || 0,
                // Add more analytics as needed
            };

            return analytics;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return this.fallbackGetAnalytics();
        }
    }

    // =============================================
    // FALLBACK METHODS (localStorage)
    // =============================================

    fallbackGetUserProfile(userId) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        return profiles[userId] || null;
    }

    fallbackUpdateUserProfile(userId, updates) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        profiles[userId] = { ...profiles[userId], ...updates };
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        return profiles[userId];
    }

    fallbackUpdateUserSkills(userId, skills) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        if (!profiles[userId]) profiles[userId] = {};
        profiles[userId].skills = skills;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        return skills;
    }

    fallbackUpdateJobPreferences(userId, preferences) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        if (!profiles[userId]) profiles[userId] = {};
        profiles[userId].preferences = preferences;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        return preferences;
    }

    fallbackUpdateNotificationPreferences(userId, preferences) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        if (!profiles[userId]) profiles[userId] = {};
        profiles[userId].notifications = preferences;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        return preferences;
    }

    fallbackGetJobs(filters) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        // Apply basic filtering (simplified)
        return jobs.filter(job => job.status === 'active');
    }

    fallbackGetJobById(jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        return jobs.find(job => job.id === jobId);
    }

    fallbackCreateJob(jobData) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const newJob = { ...jobData, id: Date.now().toString(), created_at: new Date().toISOString() };
        jobs.push(newJob);
        localStorage.setItem('jobstir_jobs', JSON.stringify(jobs));
        return newJob;
    }

    fallbackUpdateJob(jobId, updates) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const index = jobs.findIndex(job => job.id === jobId);
        if (index !== -1) {
            jobs[index] = { ...jobs[index], ...updates };
            localStorage.setItem('jobstir_jobs', JSON.stringify(jobs));
            return jobs[index];
        }
        return null;
    }

    fallbackDeleteJob(jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const filteredJobs = jobs.filter(job => job.id !== jobId);
        localStorage.setItem('jobstir_jobs', JSON.stringify(filteredJobs));
        return true;
    }

    fallbackGetUserApplications(userId) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        return applications.filter(app => app.user_id === userId);
    }

    fallbackGetJobApplications(jobId) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        return applications.filter(app => app.job_id === jobId);
    }

    fallbackCreateApplication(applicationData) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        const newApplication = { ...applicationData, id: Date.now().toString(), applied_at: new Date().toISOString() };
        applications.push(newApplication);
        localStorage.setItem('jobstir_applications', JSON.stringify(applications));
        return newApplication;
    }

    fallbackUpdateApplicationStatus(applicationId, status, feedback) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        const index = applications.findIndex(app => app.id === applicationId);
        if (index !== -1) {
            applications[index].status = status;
            if (feedback) applications[index].feedback = feedback;
            localStorage.setItem('jobstir_applications', JSON.stringify(applications));
            return applications[index];
        }
        return null;
    }

    fallbackGetAllUsers(filters) {
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        return users;
    }

    fallbackGetAllApplications(filters) {
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        return applications;
    }

    fallbackGetAnalytics() {
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');

        return {
            totalUsers: users.length,
            activeJobs: jobs.filter(job => job.status === 'active').length,
            totalApplications: applications.length
        };
    }
}

// Initialize the database service
const dbService = new SupabaseDatabaseService();

// Export for global use
window.dbService = dbService;