// Profile management functionality for JobStir
class ProfileManager {
    constructor() {
        this.currentTab = 'personal';
        this.skills = [];
        this.init();
    }

    init() {
        this.checkAccess();
        this.updateUserNavigation();
        this.updateUserGreeting();
        this.checkNewUserWelcome();
        this.loadUserProfile();
        this.initEventListeners();
        this.initTabs();
    }

    checkNewUserWelcome() {
        // Check if this is a new user's first visit to profile page
        const isNewUser = localStorage.getItem('jobstir_new_user') === 'true';
        const hasSeenWelcome = localStorage.getItem('jobstir_profile_welcome_seen') === 'true';
        
        if (isNewUser && !hasSeenWelcome) {
            this.showNewUserWelcome();
            localStorage.setItem('jobstir_profile_welcome_seen', 'true');
            localStorage.removeItem('jobstir_new_user'); // Clean up the flag
        }
    }

    showNewUserWelcome() {
        // Create welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'new-user-welcome';
        welcomeMessage.innerHTML = `
            <div class="welcome-content">
                <div class="welcome-icon">🎉</div>
                <h3>Welcome to JobStir!</h3>
                <p>Complete your profile to get personalized job recommendations and improve your visibility to employers.</p>
                <div class="welcome-checklist">
                    <div class="checklist-item">
                        <i data-feather="user"></i>
                        <span>Add your personal information</span>
                    </div>
                    <div class="checklist-item">
                        <i data-feather="briefcase"></i>
                        <span>Upload your resume</span>
                    </div>
                    <div class="checklist-item">
                        <i data-feather="settings"></i>
                        <span>Set your job preferences</span>
                    </div>
                </div>
                <button class="btn-close-welcome" onclick="this.parentElement.parentElement.remove()">
                    <i data-feather="x"></i>
                </button>
            </div>
        `;
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('.profile-container');
        if (mainContent) {
            mainContent.insertBefore(welcomeMessage, mainContent.firstChild);
            feather.replace();
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
                </div>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </div>
        `;
    }

    checkAccess() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            window.location.href = 'signin.html';
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

    async loadUserProfile() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) return;

        const user = JSON.parse(session);
        const supabase = window.getSupabaseClient();
        
        let userProfile = {};
        
        try {
            if (supabase) {
                // Try to load from Supabase first
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (data && !error) {
                    userProfile = data;
                    console.log('✅ Profile loaded from Supabase');
                    
                    // Also save to localStorage as backup
                    const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
                    profiles[user.id] = userProfile;
                    localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
                } else {
                    throw error;
                }
            } else {
                throw new Error('Supabase not available');
            }
        } catch (error) {
            console.warn('Loading from localStorage:', error);
            
            // Fallback to localStorage
            const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
            userProfile = profiles[user.id] || {};
        }

        // Update profile display
        this.updateProfileDisplay(user, userProfile);
        
        // Load form data
        this.loadFormData(userProfile);
        
        // Load skills
        this.skills = userProfile.skills || [];
        this.renderSkills();
    }

    updateProfileDisplay(user, profile) {
        // Update profile name and email
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const userTypeBadge = document.getElementById('user-type-badge');

        if (profileName) {
            profileName.textContent = profile.firstName && profile.lastName 
                ? `${profile.firstName} ${profile.lastName}` 
                : user.email.split('@')[0];
        }

        if (profileEmail) {
            profileEmail.textContent = user.email;
        }

        if (userTypeBadge) {
            userTypeBadge.textContent = user.isHR ? 'HR Manager' : 'Candidate';
        }

        // Update avatar if available
        if (profile.avatarUrl) {
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.innerHTML = `<img src="${profile.avatarUrl}" alt="Profile Picture">`;
            }
        }
    }

    loadFormData(profile) {
        // Personal info form
        const fields = [
            'first-name', 'last-name', 'email', 'phone', 'location', 'bio',
            'job-titles', 'salary-min', 'salary-max'
        ];

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && profile[fieldId.replace('-', '')]) {
                field.value = profile[fieldId.replace('-', '')];
            }
        });

        // Load checkboxes and radio buttons
        this.loadPreferences(profile);
        this.loadNotificationSettings(profile);
    }

    loadPreferences(profile) {
        // Job types
        if (profile.jobTypes) {
            profile.jobTypes.forEach(type => {
                const checkbox = document.querySelector(`input[name="job-types"][value="${type}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Remote preference
        if (profile.remotePref) {
            const radio = document.querySelector(`input[name="remote-pref"][value="${profile.remotePref}"]`);
            if (radio) radio.checked = true;
        }
    }

    loadNotificationSettings(profile) {
        const notificationSettings = profile.notifications || {};
        
        Object.keys(notificationSettings).forEach(setting => {
            const checkbox = document.querySelector(`input[name="${setting}"]`);
            if (checkbox) {
                checkbox.checked = notificationSettings[setting];
            }
        });
    }

    initEventListeners() {
        // Tab navigation
        const tabLinks = document.querySelectorAll('.nav-link');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Form submissions
        const forms = ['personal-form', 'preferences-form', 'notifications-form'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', (e) => this.handleFormSubmit(e, formId));
            }
        });

        // Avatar upload
        const avatarUploadBtn = document.getElementById('avatar-upload-btn');
        const avatarInput = document.getElementById('avatar-input');
        
        if (avatarUploadBtn && avatarInput) {
            avatarUploadBtn.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Resume upload
        const resumeInput = document.getElementById('resume-input');
        if (resumeInput) {
            resumeInput.addEventListener('change', (e) => this.handleResumeUpload(e));
        }

        // Skills management
        const skillInput = document.getElementById('skill-input');
        if (skillInput) {
            skillInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSkill();
                }
            });
        }

        // Drag and drop for resume
        this.initDragAndDrop();
    }

    initTabs() {
        // Show first tab by default
        this.switchTab('personal');
    }

    switchTab(tabId) {
        // Update navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });

        // Update content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.getElementById(`${tabId}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        this.currentTab = tabId;
    }

    async handleFormSubmit(e, formId) {
        e.preventDefault();
        
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        this.setLoading(submitBtn, true);
        
        try {
            const formData = new FormData(form);
            await this.saveFormData(formId, formData);
            this.showMessage('Profile updated successfully!', 'success');
        } catch (error) {
            this.showMessage('Failed to update profile. Please try again.', 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    async saveFormData(formId, formData) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) throw new Error('No session found');

        const user = JSON.parse(session);
        const supabase = window.jobStirCore?.supabase || window.getSupabaseClient?.();
        
        if (!supabase) {
            console.warn('Supabase client not available, using localStorage fallback');
            const profileData = this.prepareProfileData(formId, formData);
            this.saveToLocalStorage(user, profileData);
            return;
        }
        
        // Prepare profile data based on form
        const profileData = this.prepareProfileData(formId, formData);

        profileData.updated_at = new Date().toISOString();

        try {
            if (supabase) {
                // Try to save to Supabase first
                const { data, error } = await supabase
                    .from('user_profiles')
                    .upsert({
                        id: user.id,  // Use id as the primary key
                        user_id: user.id,
                        email: user.email,
                        ...profileData,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'  // Handle conflicts on the id column
                    })
                    .select();

                if (error) {
                    console.warn('Supabase save failed, using localStorage:', error);
                    throw error;
                }

                console.log('✅ Profile saved to Supabase successfully');
                
                // Also update localStorage as backup
                this.saveToLocalStorage(user, profileData);
                
                // Update display
                this.updateProfileDisplay(user, { ...profileData });
                
            } else {
                throw new Error('Supabase not available');
            }
        } catch (error) {
            console.warn('Falling back to localStorage:', error);
            
            // Fallback to localStorage
            this.saveToLocalStorage(user, profileData);
            this.updateProfileDisplay(user, profileData);
        }
    }

    prepareProfileData(formId, formData) {
        let profileData = {};
        
        switch (formId) {
            case 'personal-form':
                profileData = {
                    first_name: formData.get('first-name') || '',
                    last_name: formData.get('last-name') || '',
                    phone: formData.get('phone') || '',
                    location: formData.get('location') || '',
                    bio: formData.get('bio') || ''
                };
                break;
                
            case 'preferences-form':
                profileData = {
                    job_titles: formData.get('job-titles') || '',
                    salary_min: parseInt(formData.get('salary-min')) || null,
                    salary_max: parseInt(formData.get('salary-max')) || null,
                    job_types: formData.getAll('job-types') || [],
                    remote_preference: formData.get('remote-pref') || 'any'
                };
                break;
                
            case 'notifications-form':
                profileData = {
                    notifications: {
                        email_job_matches: formData.has('email-job-matches'),
                        email_application_updates: formData.has('email-application-updates'),
                        email_newsletter: formData.has('email-newsletter'),
                        push_new_jobs: formData.has('push-new-jobs'),
                        push_messages: formData.has('push-messages')
                    }
                };
                break;
        }
        
        return profileData;
    }
    
    saveToLocalStorage(user, profileData) {
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        const userProfile = profiles[user.id] || {};
        
        // Merge new data with existing profile
        Object.assign(userProfile, profileData);
        
        profiles[user.id] = userProfile;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
    }

    handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showMessage('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showMessage('Image size must be less than 5MB', 'error');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatar = document.getElementById('user-avatar');
            if (avatar) {
                avatar.innerHTML = `<img src="${e.target.result}" alt="Profile Picture">`;
            }

            // Save to profile
            this.saveAvatarUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    saveAvatarUrl(dataUrl) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) return;

        const user = JSON.parse(session);
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        const userProfile = profiles[user.id] || {};

        userProfile.avatarUrl = dataUrl;
        userProfile.updatedAt = new Date().toISOString();
        
        profiles[user.id] = userProfile;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));

        this.showMessage('Profile picture updated!', 'success');
    }

    handleResumeUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showMessage('Please select a PDF, DOC, or DOCX file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showMessage('File size must be less than 10MB', 'error');
            return;
        }

        // Show preview
        this.showResumePreview(file);
        
        // Save resume info
        this.saveResumeInfo(file);
    }

    showResumePreview(file) {
        const uploadArea = document.getElementById('resume-upload-area');
        const preview = document.getElementById('resume-preview');
        const filename = document.getElementById('resume-filename');
        const filesize = document.getElementById('resume-filesize');

        if (uploadArea) uploadArea.style.display = 'none';
        if (preview) preview.classList.remove('hidden');
        if (filename) filename.textContent = file.name;
        if (filesize) filesize.textContent = this.formatFileSize(file.size);
    }

    saveResumeInfo(file) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) return;

        const user = JSON.parse(session);
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        const userProfile = profiles[user.id] || {};

        userProfile.resume = {
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString()
        };

        profiles[user.id] = userProfile;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));

        this.showMessage('Resume uploaded successfully!', 'success');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    addSkill() {
        const skillInput = document.getElementById('skill-input');
        if (!skillInput) return;

        const skill = skillInput.value.trim();
        if (!skill) return;

        if (this.skills.includes(skill)) {
            this.showMessage('Skill already added', 'error');
            return;
        }

        this.skills.push(skill);
        skillInput.value = '';
        this.renderSkills();
        this.saveSkills();
    }

    removeSkill(skill) {
        this.skills = this.skills.filter(s => s !== skill);
        this.renderSkills();
        this.saveSkills();
    }

    renderSkills() {
        const container = document.getElementById('skills-container');
        if (!container) return;

        container.innerHTML = this.skills.map(skill => `
            <div class="skill-tag">
                ${skill}
                <button class="skill-remove" onclick="profileManager.removeSkill('${skill}')">
                    <i data-feather="x"></i>
                </button>
            </div>
        `).join('');

        feather.replace();
    }

    saveSkills() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) return;

        const user = JSON.parse(session);
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        const userProfile = profiles[user.id] || {};

        userProfile.skills = this.skills;
        userProfile.updatedAt = new Date().toISOString();

        profiles[user.id] = userProfile;
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
    }

    initDragAndDrop() {
        const uploadArea = document.getElementById('resume-upload-area');
        if (!uploadArea) return;

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary-color)';
            uploadArea.style.background = 'rgba(99, 102, 241, 0.05)';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            uploadArea.style.background = '';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const resumeInput = document.getElementById('resume-input');
                if (resumeInput) {
                    resumeInput.files = files;
                    this.handleResumeUpload({ target: { files } });
                }
            }
        });
    }

    removeResume() {
        const uploadArea = document.getElementById('resume-upload-area');
        const preview = document.getElementById('resume-preview');
        const resumeInput = document.getElementById('resume-input');

        if (uploadArea) uploadArea.style.display = 'block';
        if (preview) preview.classList.add('hidden');
        if (resumeInput) resumeInput.value = '';

        // Remove from profile
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            const user = JSON.parse(session);
            const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
            const userProfile = profiles[user.id] || {};

            delete userProfile.resume;
            profiles[user.id] = userProfile;
            localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));
        }

        this.showMessage('Resume removed', 'info');
    }

    showPasswordModal() {
        this.showMessage('Password change feature coming soon!', 'info');
    }

    setup2FA() {
        this.showMessage('Two-factor authentication setup coming soon!', 'info');
    }

    showSessions() {
        this.showMessage('Session management feature coming soon!', 'info');
    }

    showDeleteModal() {
        const confirm = window.confirm(
            'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
        );
        
        if (confirm) {
            const doubleConfirm = window.confirm(
                'This is your final warning. Deleting your account will remove all your applications, saved jobs, and profile data. Are you absolutely sure?'
            );
            
            if (doubleConfirm) {
                this.deleteAccount();
            }
        }
    }

    deleteAccount() {
        const session = localStorage.getItem('jobstir_session');
        if (!session) return;

        const user = JSON.parse(session);

        // Remove user data
        const profiles = JSON.parse(localStorage.getItem('jobstir_profiles') || '{}');
        delete profiles[user.id];
        localStorage.setItem('jobstir_profiles', JSON.stringify(profiles));

        // Remove applications
        const applications = JSON.parse(localStorage.getItem('jobstir_applications') || '[]');
        const filteredApplications = applications.filter(app => app.userId !== user.id);
        localStorage.setItem('jobstir_applications', JSON.stringify(filteredApplications));

        // Remove saved jobs
        localStorage.removeItem('jobstir_saved_jobs');

        // Remove session
        localStorage.removeItem('jobstir_session');

        this.showMessage('Account deleted successfully. Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.textContent = 'Saving...';
        } else {
            button.disabled = false;
            button.textContent = button.textContent.replace('Saving...', 'Save Changes');
        }
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

// Global functions
window.addSkill = function() {
    if (window.profileManager) {
        window.profileManager.addSkill();
    }
};

window.removeResume = function() {
    if (window.profileManager) {
        window.profileManager.removeResume();
    }
};

window.resetForm = function(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
    }
};

window.showPasswordModal = function() {
    if (window.profileManager) {
        window.profileManager.showPasswordModal();
    }
};

window.setup2FA = function() {
    if (window.profileManager) {
        window.profileManager.setup2FA();
    }
};

window.showSessions = function() {
    if (window.profileManager) {
        window.profileManager.showSessions();
    }
};

window.showDeleteModal = function() {
    if (window.profileManager) {
        window.profileManager.showDeleteModal();
    }
};

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

// Global logout function
window.logout = ProfileManager.logout;