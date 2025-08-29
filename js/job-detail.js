// Job Detail Page JavaScript
class JobDetailManager {
    constructor() {
        this.jobId = null;
        this.jobData = null;
        this.supabase = null;
        this.currentUser = null;
        
        this.init();
    }

    async init() {
        // Get job ID from URL
        this.jobId = this.getJobIdFromUrl();
        
        // Initialize Supabase
        this.supabase = getSupabaseClient();
        
        // Check authentication
        if (this.supabase) {
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
        }
        
        // Load job data
        await this.loadJobData();
        
        // Bind events
        this.bindEvents();
        
        // Load similar jobs
        this.loadSimilarJobs();
    }

    getJobIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || '1';
    }

    async loadJobData() {
        try {
            if (this.supabase) {
                // Try to load from Supabase first
                const { data, error } = await this.supabase
                    .from('jobs')
                    .select(`
                        *,
                        companies (
                            name,
                            description,
                            logo_url,
                            website
                        )
                    `)
                    .eq('id', this.jobId)
                    .single();

                if (data && !error) {
                    this.jobData = data;
                    this.renderJobData();
                    this.incrementViewCount();
                    return;
                }
            }
            
            // Fallback to sample data
            this.jobData = this.getSampleJobData();
            this.renderJobData();
            
        } catch (error) {
            console.error('Error loading job data:', error);
            this.jobData = this.getSampleJobData();
            this.renderJobData();
        }
    }

    getSampleJobData() {
        const sampleJobs = {
            '1': {
                id: '1',
                title: 'Senior Frontend Developer',
                company_name: 'Innovate Solutions',
                location: 'Remote (Global)',
                type: 'full-time',
                salary_display: '$120,000 - $150,000',
                description: `
                    <p>We are looking for a Senior Frontend Developer to join our dynamic team and help build the next generation of web applications. You'll work with cutting-edge technologies and collaborate with talented designers and backend developers.</p>
                    <p>In this role, you'll be responsible for creating responsive, performant, and accessible user interfaces that delight our users. You'll have the opportunity to mentor junior developers and contribute to architectural decisions.</p>
                    <p>We value innovation, continuous learning, and work-life balance. Join us in building products that make a real impact!</p>
                `,
                requirements: [
                    '5+ years of experience with React and modern JavaScript',
                    'Strong understanding of HTML5, CSS3, and responsive design',
                    'Experience with TypeScript and modern build tools',
                    'Knowledge of GraphQL and REST APIs',
                    'Familiarity with testing frameworks (Jest, Cypress)',
                    'Experience with version control (Git) and CI/CD',
                    'Strong problem-solving and communication skills'
                ],
                benefits: [
                    'Competitive salary and equity package',
                    'Comprehensive health, dental, and vision insurance',
                    'Flexible working hours and remote-first culture',
                    'Annual learning and development budget',
                    'Top-tier equipment and home office setup',
                    'Unlimited PTO and mental health support',
                    'Regular team retreats and social events'
                ],
                tags: ['React', 'TypeScript', 'GraphQL', 'Remote'],
                posted_at: '2025-01-15',
                applications_count: 23,
                views_count: 156,
                company: {
                    name: 'Innovate Solutions',
                    description: 'A leading technology company focused on creating innovative solutions for modern businesses. We specialize in web applications, mobile development, and cloud infrastructure.',
                    logo_url: null,
                    website: 'https://innovatesolutions.com'
                }
            },
            '2': {
                id: '2',
                title: 'Product Marketing Manager',
                company_name: 'QuantumLeap',
                location: 'New York, NY',
                type: 'full-time',
                salary_display: '$100,000 - $130,000',
                description: `
                    <p>Join our product marketing team to drive growth and market expansion for our innovative SaaS platform. You'll work closely with product, sales, and engineering teams to bring new features to market.</p>
                    <p>This role involves developing go-to-market strategies, creating compelling messaging, and analyzing market trends to identify opportunities for growth.</p>
                `,
                requirements: [
                    '3+ years of product marketing experience',
                    'Experience with SaaS products and B2B marketing',
                    'Strong analytical and data-driven mindset',
                    'Excellent written and verbal communication skills',
                    'Experience with marketing automation tools',
                    'Understanding of customer journey and lifecycle marketing'
                ],
                benefits: [
                    'Competitive salary and performance bonuses',
                    'Health and wellness benefits',
                    'Professional development opportunities',
                    'Flexible work arrangements',
                    'Stock options and 401k matching'
                ],
                tags: ['SaaS', 'Marketing', 'Strategy', 'B2B'],
                posted_at: '2025-01-12',
                applications_count: 18,
                views_count: 89,
                company: {
                    name: 'QuantumLeap',
                    description: 'A fast-growing fintech startup revolutionizing how businesses manage their financial operations.',
                    logo_url: null,
                    website: 'https://quantumleap.com'
                }
            },
            '3': {
                id: '3',
                title: 'Cloud Infrastructure Engineer',
                company_name: 'NextGen Systems',
                location: 'London, UK',
                type: 'full-time',
                salary_display: '£70,000 - £90,000',
                description: `
                    <p>We're seeking a Cloud Infrastructure Engineer to design, implement, and maintain our cloud infrastructure. You'll work with cutting-edge technologies and help scale our platform to serve millions of users.</p>
                    <p>This role involves working with AWS services, Kubernetes, and infrastructure as code to build reliable and scalable systems.</p>
                `,
                requirements: [
                    '4+ years of experience with AWS or similar cloud platforms',
                    'Strong knowledge of Kubernetes and containerization',
                    'Experience with Infrastructure as Code (Terraform, CloudFormation)',
                    'Understanding of DevOps practices and CI/CD pipelines',
                    'Knowledge of monitoring and logging tools',
                    'Experience with networking and security best practices'
                ],
                benefits: [
                    'Competitive salary and annual bonuses',
                    'Comprehensive benefits package',
                    'Learning and certification budget',
                    'Flexible working arrangements',
                    'Modern office in central London'
                ],
                tags: ['AWS', 'Kubernetes', 'DevOps', 'Infrastructure'],
                posted_at: '2025-01-10',
                applications_count: 31,
                views_count: 203,
                company: {
                    name: 'NextGen Systems',
                    description: 'A technology consultancy specializing in cloud infrastructure and digital transformation for enterprise clients.',
                    logo_url: null,
                    website: 'https://nextgensystems.co.uk'
                }
            }
        };

        return sampleJobs[this.jobId] || sampleJobs['1'];
    }

    renderJobData() {
        if (!this.jobData) return;

        // Update page title
        document.title = `${this.jobData.title} at ${this.jobData.company_name} - JobStir`;

        // Update breadcrumb
        document.getElementById('job-title-breadcrumb').textContent = this.jobData.title;

        // Update job header
        document.getElementById('job-title').textContent = this.jobData.title;
        document.getElementById('company-name').textContent = this.jobData.company_name;
        document.getElementById('job-location').innerHTML = `<i data-feather="map-pin"></i> ${this.jobData.location}`;
        document.getElementById('job-type').innerHTML = `<i data-feather="clock"></i> ${this.formatJobType(this.jobData.type)}`;
        document.getElementById('job-salary').innerHTML = `<i data-feather="dollar-sign"></i> ${this.jobData.salary_display}`;
        document.getElementById('posted-date').innerHTML = `<i data-feather="calendar"></i> ${this.formatDate(this.jobData.posted_at)}`;

        // Update company logo
        const companyLogo = document.getElementById('company-logo');
        if (this.jobData.company?.logo_url) {
            companyLogo.innerHTML = `<img src="${this.jobData.company.logo_url}" alt="${this.jobData.company_name}">`;
        } else {
            companyLogo.textContent = this.jobData.company_name.charAt(0);
        }

        // Update job tags
        this.renderJobTags();

        // Update job description
        document.getElementById('job-description').innerHTML = this.jobData.description;

        // Update requirements
        this.renderRequirements();

        // Update benefits
        this.renderBenefits();

        // Update company description
        document.getElementById('company-description').innerHTML = `<p>${this.jobData.company?.description || 'Company information not available.'}</p>`;

        // Update job stats
        document.getElementById('application-count').textContent = this.jobData.applications_count || 0;
        document.getElementById('view-count').textContent = this.jobData.views_count || 0;
        document.getElementById('posted-time').textContent = this.formatDate(this.jobData.posted_at);

        // Re-render feather icons
        feather.replace();
    }

    renderJobTags() {
        const tagsContainer = document.getElementById('job-tags');
        if (!this.jobData.tags || this.jobData.tags.length === 0) {
            tagsContainer.style.display = 'none';
            return;
        }

        tagsContainer.innerHTML = this.jobData.tags.map((tag, index) => {
            const tagClass = index % 3 === 0 ? 'job-tag' : index % 3 === 1 ? 'job-tag secondary' : 'job-tag accent';
            return `<span class="${tagClass}">${tag}</span>`;
        }).join('');
    }

    renderRequirements() {
        const requirementsList = document.getElementById('requirements-list');
        if (!this.jobData.requirements || this.jobData.requirements.length === 0) {
            requirementsList.innerHTML = '<li>Requirements not specified</li>';
            return;
        }

        requirementsList.innerHTML = this.jobData.requirements.map(req => `<li>${req}</li>`).join('');
    }

    renderBenefits() {
        const benefitsList = document.getElementById('benefits-list');
        if (!this.jobData.benefits || this.jobData.benefits.length === 0) {
            benefitsList.innerHTML = '<li>Benefits information not available</li>';
            return;
        }

        benefitsList.innerHTML = this.jobData.benefits.map(benefit => `<li>${benefit}</li>`).join('');
    }

    async loadSimilarJobs() {
        try {
            const similarJobsContainer = document.getElementById('similar-jobs-list');
            
            // Sample similar jobs for now
            const similarJobs = [
                { id: '1', title: 'Frontend Developer', company: 'TechCorp' },
                { id: '2', title: 'React Developer', company: 'StartupXYZ' },
                { id: '3', title: 'UI/UX Developer', company: 'DesignStudio' }
            ].filter(job => job.id !== this.jobId);

            if (similarJobs.length === 0) {
                similarJobsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No similar jobs found</p>';
                return;
            }

            similarJobsContainer.innerHTML = similarJobs.map(job => `
                <div class="similar-job-item" onclick="window.location.href='job-detail.html?id=${job.id}'">
                    <div class="similar-job-title">${job.title}</div>
                    <div class="similar-job-company">${job.company}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error loading similar jobs:', error);
        }
    }

    bindEvents() {
        // Apply button events
        document.getElementById('apply-btn')?.addEventListener('click', () => this.handleApply());
        document.getElementById('quick-apply-btn')?.addEventListener('click', () => this.handleApply());

        // Save job button
        document.getElementById('save-btn')?.addEventListener('click', () => this.handleSaveJob());

        // Share button
        document.getElementById('share-btn')?.addEventListener('click', () => this.handleShare());

        // Modal events
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-application')?.addEventListener('click', () => this.closeModal());
        document.getElementById('submit-application')?.addEventListener('click', () => this.handleSubmitApplication());

        // Close modal on outside click
        document.getElementById('application-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'application-modal') {
                this.closeModal();
            }
        });
    }

    handleApply() {
        if (!this.currentUser) {
            // Redirect to sign in
            window.location.href = 'signin.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        // Show application modal
        document.getElementById('application-modal').classList.remove('hidden');
        
        // Pre-fill user data if available
        if (this.currentUser) {
            document.getElementById('applicant-email').value = this.currentUser.email || '';
        }
    }

    async handleSaveJob() {
        if (!this.currentUser) {
            window.location.href = 'signin.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }

        try {
            const saveBtn = document.getElementById('save-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i data-feather="loader"></i> Saving...';
            
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('saved_jobs')
                    .insert({
                        user_id: this.currentUser.id,
                        job_id: this.jobId
                    });

                if (error && !error.message.includes('duplicate')) {
                    throw error;
                }
            }

            saveBtn.innerHTML = '<i data-feather="check"></i> Saved';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                feather.replace();
            }, 2000);

        } catch (error) {
            console.error('Error saving job:', error);
            const saveBtn = document.getElementById('save-btn');
            saveBtn.innerHTML = '<i data-feather="x"></i> Error';
            setTimeout(() => {
                saveBtn.innerHTML = '<i data-feather="bookmark"></i> Save Job';
                feather.replace();
            }, 2000);
        }
        
        feather.replace();
    }

    handleShare() {
        if (navigator.share) {
            navigator.share({
                title: `${this.jobData.title} at ${this.jobData.company_name}`,
                text: `Check out this job opportunity: ${this.jobData.title}`,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                const shareBtn = document.getElementById('share-btn');
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i data-feather="check"></i> Copied';
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    feather.replace();
                }, 2000);
                feather.replace();
            });
        }
    }

    async handleSubmitApplication() {
        const form = document.getElementById('application-form');
        const formData = new FormData(form);
        
        const applicationData = {
            name: document.getElementById('applicant-name').value,
            email: document.getElementById('applicant-email').value,
            phone: document.getElementById('applicant-phone').value,
            coverLetter: document.getElementById('cover-letter').value,
            jobId: this.jobId
        };

        // Basic validation
        if (!applicationData.name || !applicationData.email) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const submitBtn = document.getElementById('submit-application');
            submitBtn.innerHTML = '<i data-feather="loader"></i> Submitting...';
            submitBtn.disabled = true;

            if (this.supabase && this.currentUser) {
                const { error } = await this.supabase
                    .from('job_applications')
                    .insert({
                        job_id: this.jobId,
                        user_id: this.currentUser.id,
                        cover_letter: applicationData.coverLetter,
                        status: 'pending'
                    });

                if (error) throw error;
            }

            // Show success message
            alert('Application submitted successfully!');
            this.closeModal();

        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Error submitting application. Please try again.');
        } finally {
            const submitBtn = document.getElementById('submit-application');
            submitBtn.innerHTML = '<i data-feather="send"></i> Submit Application';
            submitBtn.disabled = false;
            feather.replace();
        }
    }

    closeModal() {
        document.getElementById('application-modal').classList.add('hidden');
        document.getElementById('application-form').reset();
    }

    async incrementViewCount() {
        try {
            if (this.supabase) {
                // Increment view count
                await this.supabase
                    .from('job_views')
                    .insert({
                        job_id: this.jobId,
                        user_id: this.currentUser?.id || null,
                        ip_address: null,
                        user_agent: navigator.userAgent
                    });

                // Update jobs table view count
                await this.supabase.rpc('increment_job_views', { job_id: this.jobId });
            }
        } catch (error) {
            console.error('Error incrementing view count:', error);
        }
    }

    formatJobType(type) {
        const types = {
            'full-time': 'Full-time',
            'part-time': 'Part-time',
            'contract': 'Contract',
            'internship': 'Internship'
        };
        return types[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JobDetailManager();
});
