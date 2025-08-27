// HR Dashboard functionality for JobStir
class HRDashboard {
    constructor() {
        this.jobs = [];
        this.candidates = [];
        this.init();
    }

    init() {
        this.checkHRAccess();
        this.updateUserNavigation();
        this.updateUserGreeting();
        this.loadDashboardData();
        this.initEventListeners();
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
            `<a href="hr_dashboard.html" class="btn btn-primary active">HR Dashboard</a>` : '';
        
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
                </div>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </div>
        `;
    }

    checkHRAccess() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            window.location.href = 'signin.html';
            return;
        }

        const user = JSON.parse(session);
        if (!user.isHR) {
            this.showMessage('Access denied. HR privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }
    }

    updateUserGreeting() {
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            const user = JSON.parse(session);
            const greeting = document.getElementById('user-greeting');
            if (greeting) {
                greeting.textContent = `Welcome, ${user.email.split('@')[0]}!`;
            }
        }
    }

    loadDashboardData() {
        // Load jobs and candidates from localStorage (simulate backend)
        this.jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        this.candidates = JSON.parse(localStorage.getItem('jobstir_candidates') || '[]');
        
        this.updateSummaryCards();
        this.renderJobs();
    }

    updateSummaryCards() {
        const totalJobs = this.jobs.length;
        const totalCandidates = this.candidates.length;
        const pendingReviews = this.candidates.filter(c => c.status === 'pending').length;
        const approvedCandidates = this.candidates.filter(c => c.status === 'approved').length;

        document.getElementById('total-jobs').textContent = totalJobs;
        document.getElementById('total-candidates').textContent = totalCandidates;
        document.getElementById('pending-reviews').textContent = pendingReviews;
        document.getElementById('approved-candidates').textContent = approvedCandidates;
    }

    renderJobs() {
        const container = document.getElementById('jobs-container');
        const noJobsElement = document.getElementById('no-jobs');

        if (this.jobs.length === 0) {
            container.innerHTML = '';
            noJobsElement.classList.remove('hidden');
            return;
        }

        noJobsElement.classList.add('hidden');
        
        container.innerHTML = this.jobs.map(job => this.createJobCard(job)).join('');
        
        // Initialize collapsible elements and copy buttons
        this.initJobCardInteractions();
    }

    createJobCard(job) {
        const candidates = this.candidates.filter(c => c.jobId === job.id);
        const shareableLink = `${window.location.origin}/apply/${job.id}`;
        
        return `
            <div class="job-card" data-job-id="${job.id}">
                <div class="job-header">
                    <div class="job-info">
                        <h3>${job.title} at ${job.company}</h3>
                        <div class="job-meta">
                            <span><i data-feather="map-pin"></i> ${job.location}</span>
                            <span><i data-feather="clock"></i> ${job.type}</span>
                            <span><i data-feather="calendar"></i> Posted ${this.formatDate(job.createdAt)}</span>
                        </div>
                    </div>
                    <div class="job-actions">
                        <button class="btn btn-small btn-secondary" onclick="hrDashboard.editJob('${job.id}')">
                            <i data-feather="edit"></i> Edit
                        </button>
                        <button class="btn btn-small btn-secondary" onclick="hrDashboard.deleteJob('${job.id}')">
                            <i data-feather="trash-2"></i> Delete
                        </button>
                    </div>
                </div>

                <div class="share-link-container">
                    <input type="text" class="share-link-input" value="${shareableLink}" readonly>
                    <button class="btn-copy" onclick="hrDashboard.copyShareLink(this)">Copy Link</button>
                </div>

                <div class="collapsible-header" onclick="hrDashboard.toggleCollapsible(this)">
                    <span>View Job Details</span>
                    <i data-feather="chevron-down"></i>
                </div>
                <div class="collapsible-content">
                    <div class="detail-section">
                        <h5>Job Description</h5>
                        <p>${job.description.replace(/\n/g, '<br>')}</p>
                    </div>
                    ${job.salary ? `
                        <div class="detail-section">
                            <h5>Salary Range</h5>
                            <p>${job.salary}</p>
                        </div>
                    ` : ''}
                </div>

                <div class="candidate-list">
                    <h4>Applicants (${candidates.length})</h4>
                    ${candidates.length > 0 ? 
                        candidates.map(candidate => this.createCandidateCard(candidate)).join('') :
                        '<p class="no-candidates">No applications yet.</p>'
                    }
                </div>
            </div>
        `;
    }

    createCandidateCard(candidate) {
        return `
            <div class="candidate-card" data-candidate-id="${candidate.id}">
                <div class="candidate-header">
                    <p class="candidate-name">${candidate.name || 'Anonymous Candidate'}</p>
                    <span class="status-badge ${candidate.status || 'pending'}">${candidate.status || 'Pending'}</span>
                </div>
                
                ${candidate.status !== 'approved' ? `
                    <button class="btn-approve" onclick="hrDashboard.approveCandidate('${candidate.id}')">
                        Approve Candidate
                    </button>
                ` : ''}

                <div class="collapsible-header" onclick="hrDashboard.toggleCollapsible(this)">
                    <span>View Full Profile & Analysis</span>
                    <i data-feather="chevron-down"></i>
                </div>
                <div class="collapsible-content">
                    <div class="detail-section">
                        <h5>Contact Information</h5>
                        <p><strong>Email:</strong> ${candidate.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${candidate.phone || 'N/A'}</p>
                    </div>
                    
                    ${candidate.skills ? `
                        <div class="detail-section">
                            <h5>Skills</h5>
                            <p>${candidate.skills.join(', ')}</p>
                        </div>
                    ` : ''}
                    
                    ${candidate.experience ? `
                        <div class="detail-section">
                            <h5>Experience</h5>
                            <ul>
                                ${candidate.experience.map(exp => `
                                    <li>${exp.title} at ${exp.company} (${exp.duration})</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${candidate.education ? `
                        <div class="detail-section">
                            <h5>Education</h5>
                            <ul>
                                ${candidate.education.map(edu => `
                                    <li>${edu.degree} from ${edu.university}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    initEventListeners() {
        // Filter dropdown
        const filterSelect = document.getElementById('job-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterJobs(e.target.value);
            });
        }
    }

    initJobCardInteractions() {
        // Re-initialize feather icons for dynamically created content
        feather.replace();
    }

    toggleCollapsible(header) {
        const content = header.nextElementSibling;
        const icon = header.querySelector('i');
        
        if (content.classList.contains('show')) {
            content.classList.remove('show');
            icon.setAttribute('data-feather', 'chevron-down');
        } else {
            content.classList.add('show');
            icon.setAttribute('data-feather', 'chevron-up');
        }
        
        feather.replace();
    }

    copyShareLink(button) {
        const input = button.previousElementSibling;
        
        navigator.clipboard.writeText(input.value).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.background = '#10b981';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            this.showMessage('Failed to copy link', 'error');
        });
    }

    approveCandidate(candidateId) {
        const candidateIndex = this.candidates.findIndex(c => c.id === candidateId);
        if (candidateIndex !== -1) {
            this.candidates[candidateIndex].status = 'approved';
            localStorage.setItem('jobstir_candidates', JSON.stringify(this.candidates));
            
            this.showMessage('Candidate approved successfully!', 'success');
            this.loadDashboardData(); // Refresh the display
        }
    }

    editJob(jobId) {
        // Store job ID for editing and redirect to job upload page
        localStorage.setItem('editing_job_id', jobId);
        window.location.href = 'hr_job_upload.html';
    }

    deleteJob(jobId) {
        if (confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
            this.jobs = this.jobs.filter(job => job.id !== jobId);
            localStorage.setItem('jobstir_jobs', JSON.stringify(this.jobs));
            
            // Also remove associated candidates
            this.candidates = this.candidates.filter(candidate => candidate.jobId !== jobId);
            localStorage.setItem('jobstir_candidates', JSON.stringify(this.candidates));
            
            this.showMessage('Job deleted successfully!', 'success');
            this.loadDashboardData();
        }
    }

    filterJobs(filter) {
        const jobCards = document.querySelectorAll('.job-card');
        
        jobCards.forEach(card => {
            switch (filter) {
                case 'all':
                    card.style.display = 'block';
                    break;
                case 'active':
                    // Show all jobs for now (in real app, check if job is still accepting applications)
                    card.style.display = 'block';
                    break;
                case 'closed':
                    // Hide all jobs for now (in real app, show only closed jobs)
                    card.style.display = 'none';
                    break;
            }
        });
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

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        container.className = `message-container ${type}`;
        container.textContent = message;
        container.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }

    // Static method for logout
    static logout() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'signin.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hrDashboard = new HRDashboard();
});

// Global logout function
window.logout = HRDashboard.logout;