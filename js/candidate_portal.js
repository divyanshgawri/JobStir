// Candidate Portal functionality for JobStir
class CandidatePortal {
    constructor() {
        this.applications = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    init() {
        this.checkUserAccess();
        this.updateUserNavigation();
        this.updateUserGreeting();
        this.loadApplicationsData();
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
            `<a href="hr_dashboard.html" class="btn btn-primary">HR Dashboard</a>` : '';
        
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
                    <a href="profile.html" class="btn btn-info">My Profile</a>
                </div>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </div>
        `;
    }

    checkUserAccess() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            window.location.href = 'signin.html';
            return;
        }

        const user = JSON.parse(session);
        if (user.isHR || user.isAdmin) {
            // Redirect HR/Admin users to their respective dashboards
            if (user.isAdmin) {
                window.location.href = 'admin_panel.html';
            } else if (user.isHR) {
                window.location.href = 'hr_dashboard.html';
            }
            return;
        }
    }

    updateUserGreeting() {
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            const user = JSON.parse(session);
            const greeting = document.querySelector('.user-greeting');
            if (greeting) {
                greeting.textContent = `Welcome, ${user.email.split('@')[0]}!`;
            }
        }
    }

    loadApplicationsData() {
        // Simulate loading applications data
        this.applications = [
            {
                id: 1,
                jobTitle: 'Senior Frontend Developer',
                company: 'TechCorp Inc.',
                appliedDate: '2024-01-15',
                status: 'reviewing',
                salary: '$85,000 - $110,000',
                location: 'San Francisco, CA'
            },
            {
                id: 2,
                jobTitle: 'Full Stack Engineer',
                company: 'StartupXYZ',
                appliedDate: '2024-01-12',
                status: 'interview',
                salary: '$75,000 - $95,000',
                location: 'Remote'
            },
            {
                id: 3,
                jobTitle: 'React Developer',
                company: 'WebSolutions',
                appliedDate: '2024-01-10',
                status: 'offer',
                salary: '$70,000 - $85,000',
                location: 'New York, NY'
            },
            {
                id: 4,
                jobTitle: 'JavaScript Developer',
                company: 'CodeFactory',
                appliedDate: '2024-01-08',
                status: 'rejected',
                salary: '$60,000 - $75,000',
                location: 'Austin, TX'
            }
        ];

        this.updateStats();
        this.renderApplications();
    }

    updateStats() {
        const totalApplications = this.applications.length;
        const pendingApplications = this.applications.filter(app => app.status === 'pending' || app.status === 'reviewing').length;
        const interviewsScheduled = this.applications.filter(app => app.status === 'interview').length;
        const offersReceived = this.applications.filter(app => app.status === 'offer').length;

        document.getElementById('totalApplications').textContent = totalApplications;
        document.getElementById('pendingApplications').textContent = pendingApplications;
        document.getElementById('interviewsScheduled').textContent = interviewsScheduled;
        document.getElementById('offersReceived').textContent = offersReceived;
    }

    renderApplications() {
        const container = document.getElementById('applicationsContainer');
        const noApplications = document.getElementById('noApplications');

        if (this.applications.length === 0) {
            container.innerHTML = '';
            noApplications.classList.remove('hidden');
            return;
        }

        noApplications.classList.add('hidden');
        
        const filteredApplications = this.getFilteredApplications();
        const paginatedApplications = this.getPaginatedApplications(filteredApplications);

        container.innerHTML = paginatedApplications.map(app => `
            <div class="application-card">
                <div class="application-header">
                    <div class="application-info">
                        <h3>${app.jobTitle}</h3>
                        <div class="application-meta">
                            <span><i data-lucide="building"></i> ${app.company}</span>
                            <span><i data-lucide="calendar"></i> Applied ${this.formatDate(app.appliedDate)}</span>
                            <span><i data-lucide="map-pin"></i> ${app.location}</span>
                            <span><i data-lucide="dollar-sign"></i> ${app.salary}</span>
                        </div>
                    </div>
                    <div class="application-status">
                        <span class="status-badge ${app.status}">${this.formatStatus(app.status)}</span>
                    </div>
                </div>
                <div class="application-actions">
                    <button class="btn btn-primary btn-small" onclick="candidatePortal.viewApplication(${app.id})">
                        <i data-lucide="eye"></i> View Details
                    </button>
                    ${app.status === 'interview' ? `
                        <button class="btn btn-secondary btn-small" onclick="candidatePortal.scheduleInterview(${app.id})">
                            <i data-lucide="calendar"></i> Schedule
                        </button>
                    ` : ''}
                    ${app.status === 'offer' ? `
                        <button class="btn btn-success btn-small" onclick="candidatePortal.respondToOffer(${app.id})">
                            <i data-lucide="check"></i> Respond
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    getFilteredApplications() {
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        
        if (statusFilter === 'all') {
            return this.applications;
        }
        
        return this.applications.filter(app => app.status === statusFilter);
    }

    getPaginatedApplications(applications) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return applications.slice(startIndex, endIndex);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'reviewing': 'Under Review',
            'interview': 'Interview',
            'offer': 'Offer Received',
            'rejected': 'Not Selected'
        };
        return statusMap[status] || status;
    }

    viewApplication(applicationId) {
        const application = this.applications.find(app => app.id === applicationId);
        if (application) {
            this.showMessage(`Viewing application for ${application.jobTitle} at ${application.company}`, 'success');
            // In a real app, this would open a detailed view
        }
    }

    scheduleInterview(applicationId) {
        const application = this.applications.find(app => app.id === applicationId);
        if (application) {
            this.showMessage(`Interview scheduling for ${application.jobTitle} - feature coming soon!`, 'success');
        }
    }

    respondToOffer(applicationId) {
        const application = this.applications.find(app => app.id === applicationId);
        if (application) {
            this.showMessage(`Offer response for ${application.jobTitle} - feature coming soon!`, 'success');
        }
    }

    initEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.currentPage = 1;
                this.renderApplications();
            });
        }

        // Logout functionality
        const logoutBtn = document.querySelector('[onclick="logout()"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    showMessage(message, type = 'success') {
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.textContent = message;
            messageContainer.className = `message-container ${type}`;
            messageContainer.classList.remove('hidden');
            
            setTimeout(() => {
                messageContainer.classList.add('hidden');
            }, 5000);
        }
    }

    logout() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'index.html';
    }
}

// Initialize the candidate portal when the page loads
let candidatePortal;
document.addEventListener('DOMContentLoaded', () => {
    candidatePortal = new CandidatePortal();
});

// Global logout function for backward compatibility
function logout() {
    if (candidatePortal) {
        candidatePortal.logout();
    }
}