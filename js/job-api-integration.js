// Job API Integration - Enhanced backend connectivity for JobStir
class JobAPIIntegration {
    constructor() {
        this.baseURL = this.getBaseURL();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.retryAttempts = 3;
        this.retryDelay = 1000;
    }

    getBaseURL() {
        // Determine API base URL based on environment
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        // For production, use the deployed API URL
        return 'https://your-api-domain.com';
    }

    // Enhanced fetch with retry logic and error handling
    async fetchWithRetry(url, options = {}, retries = this.retryAttempts) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed: ${error.message}`);
            
            if (retries > 0 && (error.name === 'TypeError' || error.message.includes('fetch'))) {
                console.log(`Retrying request... (${this.retryAttempts - retries + 1}/${this.retryAttempts})`);
                await this.delay(this.retryDelay);
                return this.fetchWithRetry(url, options, retries - 1);
            }
            
            throw error;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cache management
    getCacheKey(url, params = {}) {
        const paramString = Object.keys(params).length > 0 ? 
            '?' + new URLSearchParams(params).toString() : '';
        return url + paramString;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    // API Methods
    async getJobs(filters = {}) {
        try {
            const cacheKey = this.getCacheKey('/api/jobs', filters);
            const cached = this.getCache(cacheKey);
            
            if (cached) {
                console.log('Returning cached jobs data');
                return cached;
            }

            const url = new URL(`${this.baseURL}/api/jobs`);
            
            // Add filters as query parameters
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== '') {
                    url.searchParams.append(key, filters[key]);
                }
            });

            const data = await this.fetchWithRetry(url.toString());
            
            // Ensure jobs array exists and has proper structure
            if (!data.jobs || !Array.isArray(data.jobs)) {
                console.warn('Invalid jobs data structure received');
                return { jobs: [], total: 0 };
            }

            // Validate and sanitize job objects
            const sanitizedJobs = data.jobs.map(job => this.sanitizeJobObject(job));
            const result = {
                ...data,
                jobs: sanitizedJobs
            };

            this.setCache(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
            
            // Return fallback data to prevent undefined errors
            return {
                jobs: this.getFallbackJobs(),
                total: 0,
                error: error.message
            };
        }
    }

    async getJobDetails(jobId) {
        try {
            if (!jobId) {
                throw new Error('Job ID is required');
            }

            const cacheKey = this.getCacheKey(`/api/jobs/${jobId}`);
            const cached = this.getCache(cacheKey);
            
            if (cached) {
                return cached;
            }

            const data = await this.fetchWithRetry(`${this.baseURL}/api/jobs/${jobId}`);
            const sanitizedJob = this.sanitizeJobObject(data);
            
            this.setCache(cacheKey, sanitizedJob);
            return sanitizedJob;
            
        } catch (error) {
            console.error(`Failed to fetch job details for ${jobId}:`, error);
            throw error;
        }
    }

    async applyToJob(jobId, applicationData) {
        try {
            if (!jobId || !applicationData) {
                throw new Error('Job ID and application data are required');
            }

            const data = await this.fetchWithRetry(`${this.baseURL}/api/jobs/${jobId}/apply`, {
                method: 'POST',
                body: JSON.stringify(applicationData)
            });

            // Clear relevant caches
            this.clearApplicationCaches();
            
            return data;
            
        } catch (error) {
            console.error(`Failed to apply to job ${jobId}:`, error);
            throw error;
        }
    }

    async getUserApplications(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const cacheKey = this.getCacheKey('/api/applications', { user_id: userId });
            const cached = this.getCache(cacheKey);
            
            if (cached) {
                return cached;
            }

            const url = `${this.baseURL}/api/applications?user_id=${encodeURIComponent(userId)}`;
            const data = await this.fetchWithRetry(url);
            
            // Ensure applications array exists
            if (!data.applications || !Array.isArray(data.applications)) {
                return { applications: [], total: 0 };
            }

            this.setCache(cacheKey, data);
            return data;
            
        } catch (error) {
            console.error('Failed to fetch user applications:', error);
            return { applications: [], total: 0, error: error.message };
        }
    }

    async evaluateResume(resumeText, jobDescription) {
        try {
            if (!resumeText || !jobDescription) {
                throw new Error('Resume text and job description are required');
            }

            const data = await this.fetchWithRetry(`${this.baseURL}/api/evaluate-resume`, {
                method: 'POST',
                body: JSON.stringify({
                    resume_text: resumeText,
                    job_description: jobDescription
                })
            });

            return data;
            
        } catch (error) {
            console.error('Failed to evaluate resume:', error);
            throw error;
        }
    }

    async checkHealth() {
        try {
            const data = await this.fetchWithRetry(`${this.baseURL}/api/health`);
            return data;
        } catch (error) {
            console.error('Health check failed:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    // Utility methods
    sanitizeJobObject(job) {
        if (!job || typeof job !== 'object') {
            return this.getDefaultJobObject();
        }

        return {
            id: job.id || '',
            title: job.title || 'Untitled Position',
            company: job.company || 'Unknown Company',
            location: job.location || 'Location not specified',
            type: job.type || 'full-time',
            salary: job.salary || 'Salary not disclosed',
            description: job.description || 'No description available',
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
            benefits: Array.isArray(job.benefits) ? job.benefits : [],
            remote: job.remote || 'onsite',
            experienceLevel: job.experienceLevel || 'mid',
            createdAt: job.createdAt || new Date().toISOString(),
            status: job.status || 'active',
            applicants: typeof job.applicants === 'number' ? job.applicants : 0,
            views: typeof job.views === 'number' ? job.views : 0
        };
    }

    getDefaultJobObject() {
        return {
            id: '',
            title: 'Position Not Found',
            company: 'Unknown Company',
            location: 'Location not specified',
            type: 'full-time',
            salary: 'Salary not disclosed',
            description: 'No description available',
            requirements: [],
            responsibilities: [],
            benefits: [],
            remote: 'onsite',
            experienceLevel: 'mid',
            createdAt: new Date().toISOString(),
            status: 'inactive',
            applicants: 0,
            views: 0
        };
    }

    getFallbackJobs() {
        return [
            {
                id: 'fallback_1',
                title: 'Software Engineer',
                company: 'Tech Company',
                location: 'Remote',
                type: 'full-time',
                salary: 'Competitive',
                description: 'Join our team as a Software Engineer. We are looking for talented developers.',
                requirements: ['JavaScript', 'React', 'Node.js'],
                remote: 'remote',
                experienceLevel: 'mid',
                createdAt: new Date().toISOString(),
                status: 'active'
            }
        ];
    }

    clearApplicationCaches() {
        // Clear caches related to applications
        for (const key of this.cache.keys()) {
            if (key.includes('/api/applications')) {
                this.cache.delete(key);
            }
        }
    }

    clearJobCaches() {
        // Clear caches related to jobs
        for (const key of this.cache.keys()) {
            if (key.includes('/api/jobs')) {
                this.cache.delete(key);
            }
        }
    }

    clearAllCaches() {
        this.cache.clear();
    }

    // Connection status
    async testConnection() {
        try {
            const health = await this.checkHealth();
            return health.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    // Error handling helpers
    handleAPIError(error, context = '') {
        const errorMessage = error.message || 'Unknown error occurred';
        
        console.error(`API Error ${context}:`, {
            message: errorMessage,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });

        // Show user-friendly error message
        this.showErrorToast(`Failed to ${context}. Please try again.`);
        
        return {
            success: false,
            error: errorMessage,
            userMessage: `Unable to ${context}. Please check your connection and try again.`
        };
    }

    showErrorToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 500;
            max-width: 300px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize global instance
window.jobAPI = new JobAPIIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JobAPIIntegration;
}
