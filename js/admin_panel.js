// Admin Panel functionality for JobStir
class AdminPanel {
    constructor() {
        this.currentTab = 'dashboard';
        this.charts = {};
        this.data = {
            users: [],
            jobs: [],
            applications: [],
            analytics: {}
        };
        this.init();
    }

    init() {
        this.checkAdminAccess();
        this.initEventListeners();
        this.initCharts();
        this.loadDashboardData();
        this.updateAdminInfo();
    }

    checkAdminAccess() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            window.location.href = 'signin.html';
            return;
        }

        const user = JSON.parse(session);
        if (!user.isAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
    }

    updateAdminInfo() {
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            const user = JSON.parse(session);
            const adminName = document.getElementById('admin-name');
            if (adminName) {
                adminName.textContent = user.email.split('@')[0];
            }
        }
    }

    initEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Sidebar toggle for mobile
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.querySelector('.admin-sidebar').classList.toggle('open');
            });
        }

        // Search functionality
        this.initSearchListeners();

        // Filter functionality
        this.initFilterListeners();

        // Pagination
        this.initPaginationListeners();

        // Settings save
        const saveSettingsBtn = document.querySelector('[onclick="saveSettings()"]');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
    }

    switchTab(tabName) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            jobs: 'Job Management',
            applications: 'Applications',
            analytics: 'Analytics',
            content: 'Content Management',
            settings: 'System Settings',
            security: 'Security'
        };
        document.getElementById('page-title').textContent = titles[tabName];

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsersData();
                break;
            case 'jobs':
                this.loadJobsData();
                break;
            case 'applications':
                this.loadApplicationsData();
                break;
            case 'analytics':
                this.loadAnalyticsData();
                break;
        }
    }

    async loadDashboardData() {
        // Simulate loading dashboard data
        const stats = {
            totalUsers: 1247,
            activeJobs: 89,
            totalApplications: 3456,
            totalRevenue: 45670
        };

        // Update stat cards
        document.getElementById('total-users').textContent = stats.totalUsers.toLocaleString();
        document.getElementById('active-jobs').textContent = stats.activeJobs.toLocaleString();
        document.getElementById('total-applications').textContent = stats.totalApplications.toLocaleString();
        document.getElementById('total-revenue').textContent = `$${stats.totalRevenue.toLocaleString()}`;

        // Load recent activity
        this.loadRecentActivity();

        // Update charts
        this.updateDashboardCharts();
    }

    loadRecentActivity() {
        const activities = [
            {
                icon: 'user-plus',
                title: 'New user registered',
                time: '2 minutes ago',
                type: 'user'
            },
            {
                icon: 'briefcase',
                title: 'New job posted by TechCorp',
                time: '15 minutes ago',
                type: 'job'
            },
            {
                icon: 'file-text',
                title: 'Application submitted for Senior Developer',
                time: '1 hour ago',
                type: 'application'
            },
            {
                icon: 'dollar-sign',
                title: 'Payment received from Premium HR',
                time: '2 hours ago',
                type: 'payment'
            },
            {
                icon: 'alert-triangle',
                title: 'System maintenance scheduled',
                time: '3 hours ago',
                type: 'system'
            }
        ];

        const activityContainer = document.getElementById('recent-activity');
        if (activityContainer) {
            activityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i data-feather="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-title">${activity.title}</p>
                        <p class="activity-time">${activity.time}</p>
                    </div>
                </div>
            `).join('');
            
            feather.replace();
        }
    }

    initCharts() {
        // User Growth Chart
        const userGrowthCtx = document.getElementById('user-growth-chart');
        if (userGrowthCtx) {
            this.charts.userGrowth = new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'New Users',
                        data: [65, 78, 90, 81, 95, 112],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // Applications Chart
        const applicationsCtx = document.getElementById('applications-chart');
        if (applicationsCtx) {
            this.charts.applications = new Chart(applicationsCtx, {
                type: 'bar',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Applications',
                        data: [12, 19, 15, 25, 22, 8, 5],
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0,0,0,0.1)'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }
    }

    updateDashboardCharts() {
        // Update chart data based on selected period
        // This would typically fetch new data from the server
        if (this.charts.userGrowth) {
            this.charts.userGrowth.update();
        }
        if (this.charts.applications) {
            this.charts.applications.update();
        }
    }

    loadUsersData() {
        // Simulate loading users data
        const users = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                role: 'candidate',
                status: 'active',
                joined: '2024-01-15',
                lastActive: '2024-01-20'
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@company.com',
                role: 'hr',
                status: 'active',
                joined: '2024-01-10',
                lastActive: '2024-01-19'
            },
            {
                id: 3,
                name: 'Bob Johnson',
                email: 'bob@example.com',
                role: 'candidate',
                status: 'inactive',
                joined: '2024-01-05',
                lastActive: '2024-01-15'
            }
        ];

        this.renderUsersTable(users);
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><input type="checkbox" value="${user.id}"></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-size: 0.875rem;">
                            ${user.name.charAt(0)}
                        </div>
                        ${user.name}
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="status-badge ${user.role}">${user.role.toUpperCase()}</span></td>
                <td><span class="status-badge ${user.status}">${user.status.toUpperCase()}</span></td>
                <td>${new Date(user.joined).toLocaleDateString()}</td>
                <td>${new Date(user.lastActive).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" onclick="viewUser(${user.id})">View</button>
                        <button class="action-btn edit" onclick="editUser(${user.id})">Edit</button>
                        <button class="action-btn delete" onclick="deleteUser(${user.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadJobsData() {
        // Simulate loading jobs data
        const jobs = [
            {
                id: 1,
                title: 'Senior Frontend Developer',
                company: 'TechCorp',
                type: 'full-time',
                applications: 25,
                status: 'active',
                posted: '2024-01-15'
            },
            {
                id: 2,
                title: 'Product Manager',
                company: 'StartupXYZ',
                type: 'full-time',
                applications: 18,
                status: 'active',
                posted: '2024-01-12'
            },
            {
                id: 3,
                title: 'UX Designer',
                company: 'DesignStudio',
                type: 'contract',
                applications: 12,
                status: 'paused',
                posted: '2024-01-10'
            }
        ];

        this.renderJobsTable(jobs);
    }

    renderJobsTable(jobs) {
        const tbody = document.getElementById('jobs-table-body');
        if (!tbody) return;

        tbody.innerHTML = jobs.map(job => `
            <tr>
                <td><input type="checkbox" value="${job.id}"></td>
                <td>${job.title}</td>
                <td>${job.company}</td>
                <td><span class="status-badge ${job.type}">${job.type.toUpperCase()}</span></td>
                <td>${job.applications}</td>
                <td><span class="status-badge ${job.status}">${job.status.toUpperCase()}</span></td>
                <td>${new Date(job.posted).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" onclick="viewJob(${job.id})">View</button>
                        <button class="action-btn edit" onclick="editJob(${job.id})">Edit</button>
                        <button class="action-btn delete" onclick="deleteJob(${job.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadApplicationsData() {
        // Simulate loading applications data
        const applications = [
            {
                id: 1,
                candidate: 'Alice Johnson',
                jobTitle: 'Senior Frontend Developer',
                company: 'TechCorp',
                status: 'pending',
                matchScore: 85,
                applied: '2024-01-18'
            },
            {
                id: 2,
                candidate: 'Bob Smith',
                jobTitle: 'Product Manager',
                company: 'StartupXYZ',
                status: 'interview',
                matchScore: 92,
                applied: '2024-01-17'
            },
            {
                id: 3,
                candidate: 'Carol Davis',
                jobTitle: 'UX Designer',
                company: 'DesignStudio',
                status: 'rejected',
                matchScore: 67,
                applied: '2024-01-16'
            }
        ];

        this.renderApplicationsTable(applications);
    }

    renderApplicationsTable(applications) {
        const tbody = document.getElementById('applications-table-body');
        if (!tbody) return;

        tbody.innerHTML = applications.map(app => `
            <tr>
                <td><input type="checkbox" value="${app.id}"></td>
                <td>${app.candidate}</td>
                <td>${app.jobTitle}</td>
                <td>${app.company}</td>
                <td><span class="status-badge ${app.status}">${app.status.toUpperCase()}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 40px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${app.matchScore}%; height: 100%; background: ${app.matchScore >= 80 ? '#10b981' : app.matchScore >= 60 ? '#f59e0b' : '#ef4444'};"></div>
                        </div>
                        ${app.matchScore}%
                    </div>
                </td>
                <td>${new Date(app.applied).toLocaleDateString()}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn view" onclick="viewApplication(${app.id})">View</button>
                        <button class="action-btn edit" onclick="updateApplicationStatus(${app.id})">Update</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    loadAnalyticsData() {
        // Initialize analytics charts
        this.initAnalyticsCharts();
        
        // Update performance metrics
        document.getElementById('page-views').textContent = '125,430';
        document.getElementById('unique-visitors').textContent = '45,230';
        document.getElementById('bounce-rate').textContent = '32%';
        document.getElementById('avg-session').textContent = '4m 32s';
    }

    initAnalyticsCharts() {
        // Job Categories Chart
        const jobCategoriesCtx = document.getElementById('job-categories-chart');
        if (jobCategoriesCtx && !this.charts.jobCategories) {
            this.charts.jobCategories = new Chart(jobCategoriesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Technology', 'Marketing', 'Sales', 'Design', 'Other'],
                    datasets: [{
                        data: [45, 25, 15, 10, 5],
                        backgroundColor: [
                            '#6366f1',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // User Engagement Chart
        const userEngagementCtx = document.getElementById('user-engagement-chart');
        if (userEngagementCtx && !this.charts.userEngagement) {
            this.charts.userEngagement = new Chart(userEngagementCtx, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Active Users',
                        data: [1200, 1350, 1180, 1420],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Revenue Chart
        const revenueCtx = document.getElementById('revenue-chart');
        if (revenueCtx && !this.charts.revenue) {
            this.charts.revenue = new Chart(revenueCtx, {
                type: 'bar',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Revenue',
                        data: [5000, 7500, 6200, 8100, 9300, 10500],
                        backgroundColor: '#6366f1',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    initSearchListeners() {
        // User search
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }

        // Job search
        const jobSearch = document.getElementById('job-search');
        if (jobSearch) {
            jobSearch.addEventListener('input', (e) => {
                this.searchJobs(e.target.value);
            });
        }

        // Application search
        const applicationSearch = document.getElementById('application-search');
        if (applicationSearch) {
            applicationSearch.addEventListener('input', (e) => {
                this.searchApplications(e.target.value);
            });
        }
    }

    initFilterListeners() {
        // User filters
        const userRoleFilter = document.getElementById('user-role-filter');
        const userStatusFilter = document.getElementById('user-status-filter');
        
        if (userRoleFilter) {
            userRoleFilter.addEventListener('change', () => this.filterUsers());
        }
        if (userStatusFilter) {
            userStatusFilter.addEventListener('change', () => this.filterUsers());
        }

        // Job filters
        const jobStatusFilter = document.getElementById('job-status-filter');
        const jobTypeFilter = document.getElementById('job-type-filter');
        
        if (jobStatusFilter) {
            jobStatusFilter.addEventListener('change', () => this.filterJobs());
        }
        if (jobTypeFilter) {
            jobTypeFilter.addEventListener('change', () => this.filterJobs());
        }

        // Application filters
        const applicationStatusFilter = document.getElementById('application-status-filter');
        const applicationDateFrom = document.getElementById('application-date-from');
        const applicationDateTo = document.getElementById('application-date-to');
        
        if (applicationStatusFilter) {
            applicationStatusFilter.addEventListener('change', () => this.filterApplications());
        }
        if (applicationDateFrom) {
            applicationDateFrom.addEventListener('change', () => this.filterApplications());
        }
        if (applicationDateTo) {
            applicationDateTo.addEventListener('change', () => this.filterApplications());
        }
    }

    initPaginationListeners() {
        // Users pagination
        const usersPrev = document.getElementById('users-prev');
        const usersNext = document.getElementById('users-next');
        
        if (usersPrev) {
            usersPrev.addEventListener('click', () => this.previousPage('users'));
        }
        if (usersNext) {
            usersNext.addEventListener('click', () => this.nextPage('users'));
        }

        // Jobs pagination
        const jobsPrev = document.getElementById('jobs-prev');
        const jobsNext = document.getElementById('jobs-next');
        
        if (jobsPrev) {
            jobsPrev.addEventListener('click', () => this.previousPage('jobs'));
        }
        if (jobsNext) {
            jobsNext.addEventListener('click', () => this.nextPage('jobs'));
        }

        // Applications pagination
        const applicationsPrev = document.getElementById('applications-prev');
        const applicationsNext = document.getElementById('applications-next');
        
        if (applicationsPrev) {
            applicationsPrev.addEventListener('click', () => this.previousPage('applications'));
        }
        if (applicationsNext) {
            applicationsNext.addEventListener('click', () => this.nextPage('applications'));
        }
    }

    searchUsers(query) {
        // Implement user search logic
        console.log('Searching users:', query);
    }

    searchJobs(query) {
        // Implement job search logic
        console.log('Searching jobs:', query);
    }

    searchApplications(query) {
        // Implement application search logic
        console.log('Searching applications:', query);
    }

    filterUsers() {
        // Implement user filtering logic
        console.log('Filtering users');
    }

    filterJobs() {
        // Implement job filtering logic
        console.log('Filtering jobs');
    }

    filterApplications() {
        // Implement application filtering logic
        console.log('Filtering applications');
    }

    previousPage(type) {
        console.log(`Previous page for ${type}`);
    }

    nextPage(type) {
        console.log(`Next page for ${type}`);
    }

    saveSettings() {
        // Collect all settings
        const settings = {
            siteName: document.getElementById('site-name').value,
            siteDescription: document.getElementById('site-description').value,
            contactEmail: document.getElementById('contact-email').value,
            supportEmail: document.getElementById('support-email').value,
            // Add more settings as needed
        };

        // Save settings (would typically send to server)
        localStorage.setItem('jobstir_admin_settings', JSON.stringify(settings));
        
        this.showMessage('Settings saved successfully!', 'success');
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        container.className = `message-container ${type}`;
        container.textContent = message;
        container.classList.remove('hidden');
        
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

// Global functions for button clicks
window.viewUser = (id) => console.log('View user:', id);
window.editUser = (id) => console.log('Edit user:', id);
window.deleteUser = (id) => console.log('Delete user:', id);
window.viewJob = (id) => console.log('View job:', id);
window.editJob = (id) => console.log('Edit job:', id);
window.deleteJob = (id) => console.log('Delete job:', id);
window.viewApplication = (id) => console.log('View application:', id);
window.updateApplicationStatus = (id) => console.log('Update application:', id);
window.exportUsers = () => console.log('Export users');
window.exportJobs = () => console.log('Export jobs');
window.exportApplications = () => console.log('Export applications');
window.exportData = () => console.log('Export data');
window.showModal = (modalId) => console.log('Show modal:', modalId);
window.editContent = (contentId) => console.log('Edit content:', contentId);
window.editTemplate = (templateId) => console.log('Edit template:', templateId);
window.manageIPWhitelist = () => console.log('Manage IP whitelist');
window.viewSecurityLogs = () => console.log('View security logs');
window.logout = AdminPanel.logout;

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});