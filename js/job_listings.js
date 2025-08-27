// Job Listings functionality for JobStir
class JobListings {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 1;
        this.jobsPerPage = 10;
        this.filters = {
            search: '',
            location: '',
            jobTypes: [],
            experienceLevels: [],
            remoteOptions: [],
            salaryMin: 0,
            salaryMax: 200000
        };
        this.sortBy = 'newest';
        this.init();
    }

    init() {
        this.updateUserNavigation();
        this.loadJobs();
        this.initEventListeners();
        this.initFilters();
        this.handleUrlParameters();
    }

    handleUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const jobQuery = urlParams.get('q');
        const locationQuery = urlParams.get('location');
        
        if (jobQuery) {
            const jobSearchInput = document.getElementById('job-search');
            if (jobSearchInput) {
                jobSearchInput.value = jobQuery;
            }
        }
        
        if (locationQuery) {
            const locationSearchInput = document.getElementById('location-search');
            if (locationSearchInput) {
                locationSearchInput.value = locationQuery;
            }
        }
        
        // Perform search if parameters exist
        if (jobQuery || locationQuery) {
            setTimeout(() => {
                this.performSearch();
            }, 500); // Small delay to ensure everything is loaded
        }
    }

    updateUserNavigation() {
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            const user = JSON.parse(session);
            const navButtons = document.querySelector('.nav-buttons');
            
            if (navButtons) {
                const userMenu = this.createUserMenu(user);
                navButtons.innerHTML = userMenu;
            }
        }
    }

    createUserMenu(user) {
        const adminPanelLink = user.isAdmin ? 
            `<a href="admin_panel.html" class="btn btn-danger">Admin Panel</a>` : '';
        const hrDashboardLink = user.isHR ? 
            `<a href="hr_dashboard.html" class="btn btn-primary">HR Dashboard</a>` : '';
        const candidatePortalLink = (!user.isHR && !user.isAdmin) ? 
            `<a href="candidate_portal.html" class="btn btn-primary">My Applications</a>` : '';
        
        return `
            <div class="theme-switch-wrapper">
                <label class="theme-switch" for="dark-mode-toggle">
                    <input type="checkbox" id="dark-mode-toggle" class="dark-mode-toggle" />
                    <div class="slider round">
                        <i data-feather="sun" class="sun-icon"></i>
                        <i data-feather="moon" class="moon-icon"></i>
                    </div>
                </label>
            </div>
            <div class="user-menu">
                <span class="user-greeting">Welcome, ${user.email.split('@')[0]}!</span>
                <div class="dashboard-buttons">
                    ${adminPanelLink}
                    ${hrDashboardLink}
                    ${candidatePortalLink}
                    <a href="profile.html" class="btn btn-info">My Profile</a>
                </div>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </div>
        `;
    }

    loadJobs() {
        // Load jobs from localStorage (simulate backend)
        this.jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        
        // Add some demo jobs if none exist
        if (this.jobs.length === 0) {
            this.jobs = this.generateDemoJobs();
            localStorage.setItem('jobstir_jobs', JSON.stringify(this.jobs));
        }
        
        this.filteredJobs = [...this.jobs];
        this.updateResultsCount();
        this.renderJobs();
        this.hideLoading();
    }

    generateDemoJobs() {
        const demoJobs = [
            {
                id: '1',
                title: 'Senior Frontend Developer',
                company: 'TechCorp Inc.',
                location: 'San Francisco, CA',
                type: 'full-time',
                salary: '$120,000 - $160,000',
                description: 'We are looking for a skilled Frontend Developer to join our dynamic team. You will be responsible for developing user interface components and implementing them following well-known React.js workflows.',
                requirements: ['React', 'TypeScript', 'CSS', '5+ years experience'],
                remote: 'hybrid',
                experienceLevel: 'senior',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            },
            {
                id: '2',
                title: 'Product Manager',
                company: 'StartupXYZ',
                location: 'Remote',
                type: 'full-time',
                salary: '$100,000 - $140,000',
                description: 'Join our fast-growing startup as a Product Manager. You will drive product strategy, work with engineering teams, and help shape the future of our platform.',
                requirements: ['Product Management', 'Agile', 'Analytics', '3+ years experience'],
                remote: 'remote',
                experienceLevel: 'mid',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            },
            {
                id: '3',
                title: 'Data Scientist',
                company: 'DataFlow Solutions',
                location: 'New York, NY',
                type: 'full-time',
                salary: '$130,000 - $180,000',
                description: 'We are seeking a talented Data Scientist to analyze large datasets and provide actionable insights to drive business decisions.',
                requirements: ['Python', 'Machine Learning', 'SQL', 'Statistics'],
                remote: 'onsite',
                experienceLevel: 'senior',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            },
            {
                id: '4',
                title: 'UX Designer',
                company: 'DesignStudio',
                location: 'Austin, TX',
                type: 'contract',
                salary: '$80 - $120 per hour',
                description: 'Looking for a creative UX Designer to help design intuitive and engaging user experiences for our clients.',
                requirements: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
                remote: 'hybrid',
                experienceLevel: 'mid',
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            },
            {
                id: '5',
                title: 'DevOps Engineer',
                company: 'CloudTech',
                location: 'Seattle, WA',
                type: 'full-time',
                salary: '$110,000 - $150,000',
                description: 'Join our DevOps team to help build and maintain scalable cloud infrastructure and deployment pipelines.',
                requirements: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'],
                remote: 'remote',
                experienceLevel: 'senior',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active'
            }
        ];
        return demoJobs;
    }

    initEventListeners() {
        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.performSearch());
        }

        if (jobSearch) {
            jobSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        if (locationSearch) {
            locationSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }

        // Filter checkboxes
        const filterCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        filterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Salary range sliders
        const salaryMin = document.getElementById('salary-min');
        const salaryMax = document.getElementById('salary-max');

        if (salaryMin && salaryMax) {
            salaryMin.addEventListener('input', () => this.updateSalaryDisplay());
            salaryMax.addEventListener('input', () => this.updateSalaryDisplay());
            salaryMin.addEventListener('change', () => this.applyFilters());
            salaryMax.addEventListener('change', () => this.applyFilters());
        }

        // Sort dropdown
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.sortJobs();
                this.renderJobs();
            });
        }

        // Clear filters
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearAllFilters());
        }

        // Pagination
        const prevPage = document.getElementById('prev-page');
        const nextPage = document.getElementById('next-page');

        if (prevPage) {
            prevPage.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }
    }

    initFilters() {
        this.updateSalaryDisplay();
    }

    performSearch() {
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');

        this.filters.search = jobSearch ? jobSearch.value.toLowerCase() : '';
        this.filters.location = locationSearch ? locationSearch.value.toLowerCase() : '';

        // Use location service for enhanced location filtering
        if (window.locationService && this.filters.location) {
            this.filteredJobs = window.locationService.filterJobsByLocation(this.jobs, this.filters.location);
            
            // Apply other filters on top of location filtering
            this.filteredJobs = this.filteredJobs.filter(job => this.matchesOtherFilters(job));
        } else {
            this.applyFilters();
        }
        
        this.sortJobs();
        this.currentPage = 1;
        this.updateResultsCount();
        this.renderJobs();
        this.hideLoading();
    }

    matchesOtherFilters(job) {
        // Search filter (excluding location since it's handled separately)
        if (this.filters.search) {
            const searchTerm = this.filters.search;
            const searchableText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Job type filter
        const jobTypeCheckboxes = document.querySelectorAll('input[name="job-types"]:checked');
        if (jobTypeCheckboxes.length > 0) {
            const selectedTypes = Array.from(jobTypeCheckboxes).map(cb => cb.value);
            if (!selectedTypes.includes(job.type)) {
                return false;
            }
        }

        // Experience level filter
        const experienceCheckboxes = document.querySelectorAll('input[value="entry"], input[value="mid"], input[value="senior"], input[value="executive"]');
        const checkedExperience = Array.from(experienceCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedExperience.length > 0) {
            if (!checkedExperience.includes(job.experienceLevel)) {
                return false;
            }
        }

        // Remote options filter
        const remoteCheckboxes = document.querySelectorAll('input[value="remote"], input[value="hybrid"], input[value="onsite"]');
        const checkedRemote = Array.from(remoteCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedRemote.length > 0) {
            if (!checkedRemote.includes(job.remote)) {
                return false;
            }
        }

        return true;
    }

    applyFilters() {
        this.showLoading();
        
        // Simulate API delay
        setTimeout(() => {
            this.filteredJobs = this.jobs.filter(job => this.matchesFilters(job));
            this.sortJobs();
            this.currentPage = 1;
            this.updateResultsCount();
            this.renderJobs();
            this.hideLoading();
        }, 500);
    }

    matchesFilters(job) {
        // Search filter
        if (this.filters.search) {
            const searchTerm = this.filters.search;
            const searchableText = `${job.title} ${job.company} ${job.description}`.toLowerCase();
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }

        // Location filter
        if (this.filters.location) {
            const locationTerm = this.filters.location;
            if (!job.location.toLowerCase().includes(locationTerm)) {
                return false;
            }
        }

        // Job type filter
        const jobTypeCheckboxes = document.querySelectorAll('input[name="job-types"]:checked');
        if (jobTypeCheckboxes.length > 0) {
            const selectedTypes = Array.from(jobTypeCheckboxes).map(cb => cb.value);
            if (!selectedTypes.includes(job.type)) {
                return false;
            }
        }

        // Experience level filter
        const experienceCheckboxes = document.querySelectorAll('input[value="entry"], input[value="mid"], input[value="senior"], input[value="executive"]');
        const checkedExperience = Array.from(experienceCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedExperience.length > 0) {
            if (!checkedExperience.includes(job.experienceLevel)) {
                return false;
            }
        }

        // Remote options filter
        const remoteCheckboxes = document.querySelectorAll('input[value="remote"], input[value="hybrid"], input[value="onsite"]');
        const checkedRemote = Array.from(remoteCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (checkedRemote.length > 0) {
            if (!checkedRemote.includes(job.remote)) {
                return false;
            }
        }

        return true;
    }

    sortJobs() {
        this.filteredJobs.sort((a, b) => {
            switch (this.sortBy) {
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'oldest':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'salary-high':
                    return this.extractSalary(b.salary) - this.extractSalary(a.salary);
                case 'salary-low':
                    return this.extractSalary(a.salary) - this.extractSalary(b.salary);
                case 'relevance':
                default:
                    return 0; // Keep original order for relevance
            }
        });
    }

    extractSalary(salaryString) {
        if (!salaryString) return 0;
        const numbers = salaryString.match(/\d+/g);
        return numbers ? parseInt(numbers[0]) : 0;
    }

    updateSalaryDisplay() {
        const salaryMin = document.getElementById('salary-min');
        const salaryMax = document.getElementById('salary-max');
        const salaryMinDisplay = document.getElementById('salary-min-display');
        const salaryMaxDisplay = document.getElementById('salary-max-display');

        if (salaryMin && salaryMax && salaryMinDisplay && salaryMaxDisplay) {
            const minValue = parseInt(salaryMin.value);
            const maxValue = parseInt(salaryMax.value);

            salaryMinDisplay.textContent = minValue === 0 ? '$0' : `$${Math.round(minValue / 1000)}k`;
            salaryMaxDisplay.textContent = maxValue >= 200000 ? '$200k+' : `$${Math.round(maxValue / 1000)}k`;

            this.filters.salaryMin = minValue;
            this.filters.salaryMax = maxValue;
        }
    }

    clearAllFilters() {
        // Clear search inputs
        const jobSearch = document.getElementById('job-search');
        const locationSearch = document.getElementById('location-search');
        if (jobSearch) jobSearch.value = '';
        if (locationSearch) locationSearch.value = '';

        // Clear checkboxes
        const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);

        // Reset salary sliders
        const salaryMin = document.getElementById('salary-min');
        const salaryMax = document.getElementById('salary-max');
        if (salaryMin) salaryMin.value = 0;
        if (salaryMax) salaryMax.value = 200000;

        // Reset filters object
        this.filters = {
            search: '',
            location: '',
            jobTypes: [],
            experienceLevels: [],
            remoteOptions: [],
            salaryMin: 0,
            salaryMax: 200000
        };

        this.updateSalaryDisplay();
        this.applyFilters();
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            const count = this.filteredJobs.length;
            resultsCount.textContent = `${count} job${count !== 1 ? 's' : ''} found`;
        }
    }

    renderJobs() {
        const container = document.getElementById('jobs-container');
        const noJobs = document.getElementById('no-jobs');

        if (this.filteredJobs.length === 0) {
            container.innerHTML = '';
            noJobs.classList.remove('hidden');
            return;
        }

        noJobs.classList.add('hidden');

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(startIndex, endIndex);

        container.innerHTML = jobsToShow.map(job => this.createJobCard(job)).join('');
        
        this.updatePagination();
        
        // Re-initialize feather icons
        feather.replace();
    }

    createJobCard(job) {
        const postedDate = this.formatDate(job.createdAt);
        const requirements = job.requirements || [];
        
        return `
            <div class="job-card" data-job-id="${job.id}" onclick="jobListings.viewJobDetails('${job.id}')">
                <div class="job-header">
                    <div class="job-info">
                        <h3>${job.title}</h3>
                        <p class="company-name">${job.company}</p>
                        <div class="job-meta">
                            <span><i data-feather="map-pin"></i> ${job.location}</span>
                            <span><i data-feather="clock"></i> ${this.formatJobType(job.type)}</span>
                            <span><i data-feather="calendar"></i> ${postedDate}</span>
                            ${job.remote ? `<span><i data-feather="wifi"></i> ${this.formatRemote(job.remote)}</span>` : ''}
                        </div>
                    </div>
                    <div class="job-actions">
                        <button class="btn-apply" onclick="event.stopPropagation(); jobListings.applyToJob('${job.id}')">
                            <i data-feather="send"></i> Apply
                        </button>
                        <button class="btn-save" onclick="event.stopPropagation(); jobListings.saveJob('${job.id}')">
                            <i data-feather="bookmark"></i>
                        </button>
                    </div>
                </div>
                
                <p class="job-description">${this.truncateText(job.description, 150)}</p>
                
                ${job.salary ? `<div class="salary-info">${job.salary}</div>` : ''}
                
                <div class="job-tags">
                    ${requirements.slice(0, 4).map(req => `<span class="job-tag">${req}</span>`).join('')}
                    ${requirements.length > 4 ? `<span class="job-tag">+${requirements.length - 4} more</span>` : ''}
                </div>
            </div>
        `;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return `${Math.ceil(diffDays / 30)} months ago`;
    }

    formatJobType(type) {
        const typeMap = {
            'full-time': 'Full-time',
            'part-time': 'Part-time',
            'contract': 'Contract',
            'internship': 'Internship'
        };
        return typeMap[type] || type;
    }

    formatRemote(remote) {
        const remoteMap = {
            'remote': 'Remote',
            'hybrid': 'Hybrid',
            'onsite': 'On-site'
        };
        return remoteMap[remote] || remote;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageNumbers = document.getElementById('page-numbers');

        if (!pagination) return;

        const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);

        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');

        // Update prev/next buttons
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === totalPages;
        }

        // Update page numbers
        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('div');
                pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => this.goToPage(i));
                pageNumbers.appendChild(pageBtn);
            }
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.renderJobs();
        
        // Scroll to top of jobs section
        const jobsSection = document.querySelector('.jobs-section');
        if (jobsSection) {
            jobsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    viewJobDetails(jobId) {
        // In a real app, this would navigate to a job details page
        console.log('Viewing job details for:', jobId);
        // For now, just show a message
        this.showToast('Job details page coming soon!');
    }

    applyToJob(jobId) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            this.showToast('Please sign in to apply for jobs');
            setTimeout(() => {
                window.location.href = 'signin.html';
            }, 1500);
            return;
        }

        const user = JSON.parse(session);
        if (user.isHR) {
            this.showToast('HR users cannot apply to jobs');
            return;
        }

        // Create application
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        const application = {
            id: Date.now().toString(),
            userId: user.id,
            jobId: jobId,
            jobTitle: job.title,
            company: job.company,
            location: job.location,
            status: 'pending',
            appliedAt: new Date().toISOString(),
            matchScore: Math.floor(Math.random() * 40) + 60 // Demo score
        };

        // Save application
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        applications.push(application);
        localStorage.setItem('jobstir_applications', JSON.stringify(applications));

        this.showToast('Application submitted successfully!');
    }

    saveJob(jobId) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            this.showToast('Please sign in to save jobs');
            return;
        }

        // Save job to user's saved jobs
        const savedJobs = JSON.parse(localStorage.getItem('jobstir_saved_jobs') || '[]');
        if (!savedJobs.includes(jobId)) {
            savedJobs.push(jobId);
            localStorage.setItem('jobstir_saved_jobs', JSON.stringify(savedJobs));
            this.showToast('Job saved successfully!');
        } else {
            this.showToast('Job already saved');
        }
    }

    showLoading() {
        const loading = document.getElementById('loading-spinner');
        const container = document.getElementById('jobs-container');
        if (loading) loading.style.display = 'block';
        if (container) container.style.display = 'none';
    }

    hideLoading() {
        const loading = document.getElementById('loading-spinner');
        const container = document.getElementById('jobs-container');
        if (loading) loading.style.display = 'none';
        if (container) container.style.display = 'block';
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1e293b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Global function for clearing filters
window.clearAllFilters = function() {
    if (window.jobListings) {
        window.jobListings.clearAllFilters();
    }
};

// Initialize job listings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.jobListings = new JobListings();
});