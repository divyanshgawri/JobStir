// Admin Panel functionality for JobStir
class AdminPanel {
    constructor() {
        this.currentTab = 'dashboard';
        this.charts = {};
        this.supabase = null;
        this.currentUser = null;
        this.data = {
            users: [],
            jobs: [],
            applications: [],
            analytics: {}
        };
        this.pagination = {
            users: { page: 1, limit: 10, total: 0 },
            jobs: { page: 1, limit: 10, total: 0 },
            applications: { page: 1, limit: 10, total: 0 }
        };
        this.filters = {
            users: { search: '', role: 'all', status: 'all' },
            jobs: { search: '', status: 'all', type: 'all' },
            applications: { search: '', status: 'all', dateFrom: '', dateTo: '' }
        };
        this.init();
    }

    async init() {
        await this.initSupabase();
        this.checkAdminAccess();
        this.initEventListeners();
        this.initCharts();
        await this.loadDashboardData();
        this.updateAdminInfo();
    }

    async initSupabase() {
        try {
            // Wait for config to load
            if (typeof window.getSupabaseClient === 'function') {
                this.supabase = window.getSupabaseClient();
                if (this.supabase) {
                    console.log('✅ Admin Panel: Supabase connected successfully');
                    // Test connection
                    const { data, error } = await this.supabase.from('users').select('count').limit(1);
                    if (error) {
                        console.warn('⚠️ Admin Panel: Supabase connection test failed:', error.message);
                    }
                } else {
                    console.warn('⚠️ Admin Panel: Supabase client not available');
                }
            } else {
                console.warn('⚠️ Admin Panel: Supabase config not loaded');
            }
        } catch (error) {
            console.error('❌ Admin Panel: Failed to initialize Supabase:', error);
        }
    }

    async checkAdminAccess() {
        try {
            // Check localStorage session first
            const session = localStorage.getItem('jobstir_session');
            if (!session) {
                window.location.href = 'signin.html';
                return;
            }

            const user = JSON.parse(session);
            this.currentUser = user;

            // Check Supabase session if available
            if (this.supabase) {
                const { data: { session: supabaseSession } } = await this.supabase.auth.getSession();
                if (supabaseSession) {
                    // Verify admin role from database
                    const { data: userData, error } = await this.supabase
                        .from('users')
                        .select('role, is_admin')
                        .eq('id', supabaseSession.user.id)
                        .single();
                    
                    if (error || !userData?.is_admin) {
                        alert('Access denied. Admin privileges required.');
                        window.location.href = 'index.html';
                        return;
                    }
                    
                    this.currentUser = { ...user, ...userData };
                }
            }

            // Fallback check for localStorage admin flag
            if (!user.isAdmin && !this.currentUser?.is_admin) {
                alert('Access denied. Admin privileges required.');
                window.location.href = 'index.html';
                return;
            }
        } catch (error) {
            console.error('Admin access check failed:', error);
            alert('Authentication error. Please sign in again.');
            window.location.href = 'signin.html';
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
        try {
            let stats = {
                totalUsers: 0,
                activeJobs: 0,
                totalApplications: 0,
                totalRevenue: 0
            };

            if (this.supabase) {
                // Load real data from Supabase
                const [usersResult, jobsResult, applicationsResult] = await Promise.all([
                    this.supabase.from('users').select('id', { count: 'exact', head: true }),
                    this.supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                    this.supabase.from('applications').select('id', { count: 'exact', head: true })
                ]);

                stats.totalUsers = usersResult.count || 0;
                stats.activeJobs = jobsResult.count || 0;
                stats.totalApplications = applicationsResult.count || 0;

                // Calculate revenue (placeholder - implement based on your business model)
                stats.totalRevenue = stats.activeJobs * 150; // Example: $150 per active job
            } else {
                // Fallback to demo data
                stats = {
                    totalUsers: 1247,
                    activeJobs: 89,
                    totalApplications: 3456,
                    totalRevenue: 45670
                };
            }

            // Update stat cards
            document.getElementById('total-users').textContent = stats.totalUsers.toLocaleString();
            document.getElementById('active-jobs').textContent = stats.activeJobs.toLocaleString();
            document.getElementById('total-applications').textContent = stats.totalApplications.toLocaleString();
            document.getElementById('total-revenue').textContent = `$${stats.totalRevenue.toLocaleString()}`;

            // Load recent activity
            await this.loadRecentActivity();

            // Update charts
            this.updateDashboardCharts();
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showMessage('Failed to load dashboard data', 'error');
        }
    }

    async loadRecentActivity() {
        try {
            let activities = [];

            if (this.supabase) {
                // Load recent activities from database
                const { data: recentUsers } = await this.supabase
                    .from('users')
                    .select('email, created_at')
                    .order('created_at', { ascending: false })
                    .limit(2);

                const { data: recentJobs } = await this.supabase
                    .from('jobs')
                    .select('title, company, created_at')
                    .order('created_at', { ascending: false })
                    .limit(2);

                const { data: recentApplications } = await this.supabase
                    .from('applications')
                    .select('*, jobs(title), users(email)')
                    .order('created_at', { ascending: false })
                    .limit(2);

                // Convert to activity format
                if (recentUsers) {
                    recentUsers.forEach(user => {
                        activities.push({
                            icon: 'user-plus',
                            title: `New user registered: ${user.email}`,
                            time: this.formatTimeAgo(user.created_at),
                            type: 'user'
                        });
                    });
                }

                if (recentJobs) {
                    recentJobs.forEach(job => {
                        activities.push({
                            icon: 'briefcase',
                            title: `New job posted: ${job.title} at ${job.company}`,
                            time: this.formatTimeAgo(job.created_at),
                            type: 'job'
                        });
                    });
                }

                if (recentApplications) {
                    recentApplications.forEach(app => {
                        activities.push({
                            icon: 'file-text',
                            title: `Application submitted for ${app.jobs?.title || 'Unknown Job'}`,
                            time: this.formatTimeAgo(app.created_at),
                            type: 'application'
                        });
                    });
                }

                // Sort by time and limit to 5
                activities.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                activities = activities.slice(0, 5);
            } else {
                // Fallback demo data
                activities = [
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
                    }
                ];
            }

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
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
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

    async loadUsersData() {
        try {
            let users = [];
            const { search, role, status } = this.filters.users;
            const { page, limit } = this.pagination.users;
            const offset = (page - 1) * limit;

            if (this.supabase) {
                // Build query with filters
                let query = this.supabase
                    .from('users')
                    .select('id, email, full_name, role, status, created_at, last_sign_in_at', { count: 'exact' });

                // Apply filters
                if (search) {
                    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
                }
                if (role !== 'all') {
                    query = query.eq('role', role);
                }
                if (status !== 'all') {
                    query = query.eq('status', status);
                }

                // Apply pagination
                query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

                const { data, error, count } = await query;

                if (error) {
                    console.error('Failed to load users:', error);
                    this.showMessage('Failed to load users', 'error');
                    return;
                }

                users = data.map(user => ({
                    id: user.id,
                    name: user.full_name || user.email.split('@')[0],
                    email: user.email,
                    role: user.role || 'candidate',
                    status: user.status || 'active',
                    joined: user.created_at,
                    lastActive: user.last_sign_in_at || user.created_at
                }));

                this.pagination.users.total = count;
            } else {
                // Fallback demo data
                users = [
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
                this.pagination.users.total = users.length;
            }

            this.data.users = users;
            this.renderUsersTable(users);
            this.updateUsersPagination();
        } catch (error) {
            console.error('Failed to load users data:', error);
            this.showMessage('Failed to load users data', 'error');
        }
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

    async loadJobsData() {
        try {
            let jobs = [];
            const { search, status, type } = this.filters.jobs;
            const { page, limit } = this.pagination.jobs;
            const offset = (page - 1) * limit;

            if (this.supabase) {
                // Build query with filters
                let query = this.supabase
                    .from('jobs')
                    .select(`
                        id, title, company, job_type, status, created_at,
                        applications:applications(count)
                    `, { count: 'exact' });

                // Apply filters
                if (search) {
                    query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
                }
                if (status !== 'all') {
                    query = query.eq('status', status);
                }
                if (type !== 'all') {
                    query = query.eq('job_type', type);
                }

                // Apply pagination
                query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

                const { data, error, count } = await query;

                if (error) {
                    console.error('Failed to load jobs:', error);
                    this.showMessage('Failed to load jobs', 'error');
                    return;
                }

                jobs = data.map(job => ({
                    id: job.id,
                    title: job.title,
                    company: job.company,
                    type: job.job_type || 'full-time',
                    applications: job.applications?.[0]?.count || 0,
                    status: job.status,
                    posted: job.created_at
                }));

                this.pagination.jobs.total = count;
            } else {
                // Fallback demo data
                jobs = [
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
                this.pagination.jobs.total = jobs.length;
            }

            this.data.jobs = jobs;
            this.renderJobsTable(jobs);
            this.updateJobsPagination();
        } catch (error) {
            console.error('Failed to load jobs data:', error);
            this.showMessage('Failed to load jobs data', 'error');
        }
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

    async loadApplicationsData() {
        try {
            let applications = [];
            const { search, status, dateFrom, dateTo } = this.filters.applications;
            const { page, limit } = this.pagination.applications;
            const offset = (page - 1) * limit;

            if (this.supabase) {
                // Build query with filters
                let query = this.supabase
                    .from('applications')
                    .select(`
                        id, status, match_score, created_at,
                        users(email, full_name),
                        jobs(title, company)
                    `, { count: 'exact' });

                // Apply filters
                if (search) {
                    query = query.or(`users.email.ilike.%${search}%,users.full_name.ilike.%${search}%,jobs.title.ilike.%${search}%`);
                }
                if (status !== 'all') {
                    query = query.eq('status', status);
                }
                if (dateFrom) {
                    query = query.gte('created_at', dateFrom);
                }
                if (dateTo) {
                    query = query.lte('created_at', dateTo);
                }

                // Apply pagination
                query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

                const { data, error, count } = await query;

                if (error) {
                    console.error('Failed to load applications:', error);
                    this.showMessage('Failed to load applications', 'error');
                    return;
                }

                applications = data.map(app => ({
                    id: app.id,
                    candidate: app.users?.full_name || app.users?.email || 'Unknown',
                    jobTitle: app.jobs?.title || 'Unknown Job',
                    company: app.jobs?.company || 'Unknown Company',
                    status: app.status || 'pending',
                    matchScore: app.match_score || 0,
                    applied: app.created_at
                }));

                this.pagination.applications.total = count;
            } else {
                // Fallback demo data
                applications = [
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
                this.pagination.applications.total = applications.length;
            }

            this.data.applications = applications;
            this.renderApplicationsTable(applications);
            this.updateApplicationsPagination();
        } catch (error) {
            console.error('Failed to load applications data:', error);
            this.showMessage('Failed to load applications data', 'error');
        }
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
        this.filters.users.search = query;
        this.pagination.users.page = 1; // Reset to first page
        this.loadUsersData();
    }

    searchJobs(query) {
        this.filters.jobs.search = query;
        this.pagination.jobs.page = 1; // Reset to first page
        this.loadJobsData();
    }

    searchApplications(query) {
        this.filters.applications.search = query;
        this.pagination.applications.page = 1; // Reset to first page
        this.loadApplicationsData();
    }

    filterUsers() {
        const roleFilter = document.getElementById('user-role-filter');
        const statusFilter = document.getElementById('user-status-filter');
        
        this.filters.users.role = roleFilter?.value || 'all';
        this.filters.users.status = statusFilter?.value || 'all';
        this.pagination.users.page = 1; // Reset to first page
        this.loadUsersData();
    }

    filterJobs() {
        const statusFilter = document.getElementById('job-status-filter');
        const typeFilter = document.getElementById('job-type-filter');
        
        this.filters.jobs.status = statusFilter?.value || 'all';
        this.filters.jobs.type = typeFilter?.value || 'all';
        this.pagination.jobs.page = 1; // Reset to first page
        this.loadJobsData();
    }

    filterApplications() {
        const statusFilter = document.getElementById('application-status-filter');
        const dateFrom = document.getElementById('application-date-from');
        const dateTo = document.getElementById('application-date-to');
        
        this.filters.applications.status = statusFilter?.value || 'all';
        this.filters.applications.dateFrom = dateFrom?.value || '';
        this.filters.applications.dateTo = dateTo?.value || '';
        this.pagination.applications.page = 1; // Reset to first page
        this.loadApplicationsData();
    }

    previousPage(type) {
        if (this.pagination[type].page > 1) {
            this.pagination[type].page--;
            this.loadTabData(type);
        }
    }

    nextPage(type) {
        const maxPage = Math.ceil(this.pagination[type].total / this.pagination[type].limit);
        if (this.pagination[type].page < maxPage) {
            this.pagination[type].page++;
            this.loadTabData(type);
        }
    }

    updateUsersPagination() {
        this.updatePagination('users');
    }

    updateJobsPagination() {
        this.updatePagination('jobs');
    }

    updateApplicationsPagination() {
        this.updatePagination('applications');
    }

    updatePagination(type) {
        const { page, limit, total } = this.pagination[type];
        const maxPage = Math.ceil(total / limit);
        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);

        // Update pagination info
        const showingElement = document.getElementById(`${type}-showing`);
        const totalElement = document.getElementById(`${type}-total`);
        
        if (showingElement) showingElement.textContent = `${start}-${end}`;
        if (totalElement) totalElement.textContent = total.toString();

        // Update pagination buttons
        const prevBtn = document.getElementById(`${type}-prev`);
        const nextBtn = document.getElementById(`${type}-next`);
        
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= maxPage;

        // Update page numbers
        const pagesContainer = document.getElementById(`${type}-pages`);
        if (pagesContainer) {
            const pageNumbers = [];
            const startPage = Math.max(1, page - 2);
            const endPage = Math.min(maxPage, page + 2);
            
            for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(`
                    <button class="page-number ${i === page ? 'active' : ''}" 
                            onclick="adminPanel.goToPage('${type}', ${i})">
                        ${i}
                    </button>
                `);
            }
            
            pagesContainer.innerHTML = pageNumbers.join('');
        }
    }

    goToPage(type, pageNumber) {
        this.pagination[type].page = pageNumber;
        this.loadTabData(type);
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

    // CRUD Operations
    async createUser(userData) {
        try {
            if (this.supabase) {
                const { data, error } = await this.supabase.auth.signUp({
                    email: userData.email,
                    password: userData.password,
                    options: {
                        data: {
                            full_name: userData.name,
                            role: userData.role
                        }
                    }
                });
                
                if (error) throw error;
                
                this.showMessage('User created successfully', 'success');
                this.loadUsersData();
            }
        } catch (error) {
            console.error('Failed to create user:', error);
            this.showMessage('Failed to create user: ' + error.message, 'error');
        }
    }

    async updateUser(id, userData) {
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('users')
                    .update({
                        full_name: userData.name,
                        role: userData.role,
                        status: userData.status
                    })
                    .eq('id', id);
                
                if (error) throw error;
                
                this.showMessage('User updated successfully', 'success');
                this.loadUsersData();
            }
        } catch (error) {
            console.error('Failed to update user:', error);
            this.showMessage('Failed to update user: ' + error.message, 'error');
        }
    }

    async deleteUser(id) {
        if (!confirm('Are you sure you want to delete this user?')) return;
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('users')
                    .update({ status: 'deleted' })
                    .eq('id', id);
                
                if (error) throw error;
                
                this.showMessage('User deleted successfully', 'success');
                this.loadUsersData();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            this.showMessage('Failed to delete user: ' + error.message, 'error');
        }
    }

    async updateJob(id, jobData) {
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('jobs')
                    .update(jobData)
                    .eq('id', id);
                
                if (error) throw error;
                
                this.showMessage('Job updated successfully', 'success');
                this.loadJobsData();
            }
        } catch (error) {
            console.error('Failed to update job:', error);
            this.showMessage('Failed to update job: ' + error.message, 'error');
        }
    }

    async deleteJob(id) {
        if (!confirm('Are you sure you want to delete this job?')) return;
        
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('jobs')
                    .update({ status: 'deleted' })
                    .eq('id', id);
                
                if (error) throw error;
                
                this.showMessage('Job deleted successfully', 'success');
                this.loadJobsData();
            }
        } catch (error) {
            console.error('Failed to delete job:', error);
            this.showMessage('Failed to delete job: ' + error.message, 'error');
        }
    }

    async updateApplicationStatus(id, status) {
        try {
            if (this.supabase) {
                const { error } = await this.supabase
                    .from('applications')
                    .update({ status })
                    .eq('id', id);
                
                if (error) throw error;
                
                this.showMessage('Application status updated successfully', 'success');
                this.loadApplicationsData();
            }
        } catch (error) {
            console.error('Failed to update application status:', error);
            this.showMessage('Failed to update application status: ' + error.message, 'error');
        }
    }

    // Export functions
    async exportUsers() {
        try {
            const csvContent = this.convertToCSV(this.data.users, [
                'id', 'name', 'email', 'role', 'status', 'joined', 'lastActive'
            ]);
            this.downloadCSV(csvContent, 'users.csv');
        } catch (error) {
            console.error('Failed to export users:', error);
            this.showMessage('Failed to export users', 'error');
        }
    }

    async exportJobs() {
        try {
            const csvContent = this.convertToCSV(this.data.jobs, [
                'id', 'title', 'company', 'type', 'applications', 'status', 'posted'
            ]);
            this.downloadCSV(csvContent, 'jobs.csv');
        } catch (error) {
            console.error('Failed to export jobs:', error);
            this.showMessage('Failed to export jobs', 'error');
        }
    }

    async exportApplications() {
        try {
            const csvContent = this.convertToCSV(this.data.applications, [
                'id', 'candidate', 'jobTitle', 'company', 'status', 'matchScore', 'applied'
            ]);
            this.downloadCSV(csvContent, 'applications.csv');
        } catch (error) {
            console.error('Failed to export applications:', error);
            this.showMessage('Failed to export applications', 'error');
        }
    }

    convertToCSV(data, headers) {
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Static method for logout
    static logout() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'signin.html';
    }
}

// Global functions for button clicks
window.viewUser = (id) => {
    const user = window.adminPanel.data.users.find(u => u.id == id);
    if (user) {
        alert(`User Details:\n\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}\nJoined: ${new Date(user.joined).toLocaleDateString()}`);
    }
};

window.editUser = (id) => {
    const user = window.adminPanel.data.users.find(u => u.id == id);
    if (user) {
        const name = prompt('Enter new name:', user.name);
        const role = prompt('Enter new role (candidate/hr/admin):', user.role);
        const status = prompt('Enter new status (active/inactive/suspended):', user.status);
        
        if (name && role && status) {
            window.adminPanel.updateUser(id, { name, role, status });
        }
    }
};

window.deleteUser = (id) => window.adminPanel.deleteUser(id);

window.viewJob = (id) => {
    const job = window.adminPanel.data.jobs.find(j => j.id == id);
    if (job) {
        alert(`Job Details:\n\nTitle: ${job.title}\nCompany: ${job.company}\nType: ${job.type}\nApplications: ${job.applications}\nStatus: ${job.status}\nPosted: ${new Date(job.posted).toLocaleDateString()}`);
    }
};

window.editJob = (id) => {
    const job = window.adminPanel.data.jobs.find(j => j.id == id);
    if (job) {
        const title = prompt('Enter new title:', job.title);
        const company = prompt('Enter new company:', job.company);
        const status = prompt('Enter new status (active/paused/closed):', job.status);
        
        if (title && company && status) {
            window.adminPanel.updateJob(id, { title, company, status });
        }
    }
};

window.deleteJob = (id) => window.adminPanel.deleteJob(id);

window.viewApplication = (id) => {
    const app = window.adminPanel.data.applications.find(a => a.id == id);
    if (app) {
        alert(`Application Details:\n\nCandidate: ${app.candidate}\nJob: ${app.jobTitle}\nCompany: ${app.company}\nStatus: ${app.status}\nMatch Score: ${app.matchScore}%\nApplied: ${new Date(app.applied).toLocaleDateString()}`);
    }
};

window.updateApplicationStatus = (id) => {
    const status = prompt('Enter new status (pending/reviewing/interview/offer/hired/rejected):');
    if (status) {
        window.adminPanel.updateApplicationStatus(id, status);
    }
};

window.exportUsers = () => window.adminPanel.exportUsers();
window.exportJobs = () => window.adminPanel.exportJobs();
window.exportApplications = () => window.adminPanel.exportApplications();
window.exportData = () => {
    window.adminPanel.exportUsers();
    window.adminPanel.exportJobs();
    window.adminPanel.exportApplications();
};
window.showModal = (modalId) => alert(`Modal functionality for ${modalId} - To be implemented`);
window.editContent = (contentId) => alert(`Content editing for ${contentId} - To be implemented`);
window.editTemplate = (templateId) => alert(`Template editing for ${templateId} - To be implemented`);
window.manageIPWhitelist = () => alert('IP Whitelist management - To be implemented');
window.viewSecurityLogs = () => alert('Security logs viewer - To be implemented');
window.logout = AdminPanel.logout;

// Initialize admin panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});