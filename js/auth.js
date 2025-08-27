// Authentication functionality for JobStir
class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        // Check if Supabase is available
        if (window.getSupabaseClient && window.getSupabaseClient()) {
            console.log('Using Supabase authentication');
            // Supabase handles auth, skip localStorage setup
        } else {
            console.log('Using localStorage authentication fallback');
            // NEW: Add a default admin user for development.
            // Comment out the line below for production.
            this._ensureDefaultAdminExists();
        }

        // Initialize form handlers based on current page
        if (document.getElementById('signup-form')) {
            this.initSignupForm();
        }
        if (document.getElementById('signin-form')) {
            this.initSigninForm();
        }
        this.initGoogleAuth();
    }

   // NEW: Method to create a default admin user if one doesn't exist.
_ensureDefaultAdminExists() {
    console.log('Running _ensureDefaultAdminExists...'); // Log that the function is called

    try {
        const ADMIN_EMAIL = 'admin@jobstir.com';
        const ADMIN_PASSWORD = 'password123';

        const usersJSON = localStorage.getItem('jobstir_users');
        console.log('localStorage content for jobstir_users:', usersJSON); // Log the raw data

        const users = JSON.parse(usersJSON || '[]');
        const adminExists = users.some(user => user.email === ADMIN_EMAIL);

        console.log('Does admin exist in storage?', adminExists); // Log the result of the check

        if (!adminExists) {
            console.log('Default admin user not found. CREATING ONE...');
            const adminUser = {
                id: 'admin_user_01',
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                isHR: true,
                isAdmin: true,
                createdAt: new Date().toISOString()
            };

            users.push(adminUser);
            localStorage.setItem('jobstir_users', JSON.stringify(users));
            console.log('Default admin user created successfully.');
        } else {
            console.log('Admin user already exists. Skipping creation.');
        }
    } catch (error) {
        console.error('An error occurred in _ensureDefaultAdminExists:', error);
    }
}
    initSignupForm() {
        const form = document.getElementById('signup-form');
        const submitBtn = document.getElementById('signup-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateSignupForm()) {
                return;
            }
            
            this.setLoading(submitBtn, true);
            
            try {
                const formData = new FormData(form);
                const userData = {
                    email: formData.get('email'),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirm-password'),
                    isHR: formData.get('is-hr') === 'on'
                };
                
                await this.signup(userData);
                
            } catch (error) {
                this.showMessage('An error occurred during signup. Please try again.', 'error');
            } finally {
                this.setLoading(submitBtn, false);
            }
        });
    }

    initSigninForm() {
        const form = document.getElementById('signin-form');
        const submitBtn = document.getElementById('signin-btn');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateSigninForm()) {
                return;
            }
            
            this.setLoading(submitBtn, true);
            
            try {
                const formData = new FormData(form);
                const userData = {
                    email: formData.get('email'),
                    password: formData.get('password')
                };
                
                await this.signin(userData);
                
            } catch (error) {
                this.showMessage('An error occurred during signin. Please try again.', 'error');
            } finally {
                this.setLoading(submitBtn, false);
            }
        });
    }

    validateSignupForm() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        let isValid = true;
        
        // Clear previous errors
        this.clearErrors();
        
        // Email validation
        if (!this.isValidEmail(email)) {
            this.showFieldError('email-error', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Password validation
        if (password.length < 8) {
            this.showFieldError('password-error', 'Password must be at least 8 characters long');
            isValid = false;
        }
        
        // Confirm password validation
        if (password !== confirmPassword) {
            this.showFieldError('confirm-password-error', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }

    validateSigninForm() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        let isValid = true;
        
        // Clear previous errors
        this.clearErrors();
        
        // Email validation
        if (!this.isValidEmail(email)) {
            this.showFieldError('email-error', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Password validation
        if (!password) {
            this.showFieldError('password-error', 'Password is required');
            isValid = false;
        }
        
        return isValid;
    }

    async signup(userData) {
        try {
            const result = await authService.signUp(userData);
            this.showMessage('Account created successfully! Please complete your profile...', 'success');
            
            // For new users, redirect to profile page
            setTimeout(() => {
                if (result.data && result.data.user) {
                    if (result.isNewUser) {
                        console.log('New user signup, redirecting to profile page');
                        window.location.href = 'profile.html';
                    } else {
                        // Fallback redirect handled by authService.redirectAfterLogin()
                        if (!authService.currentUser) {
                            window.location.href = 'index.html';
                        }
                    }
                }
            }, 2000);
            
            return result;
        } catch (error) {
            if (error.message.includes('already exists') || error.message.includes('already registered')) {
                this.showMessage('An account with this email already exists', 'error');
            } else {
                this.showMessage('Failed to create account. Please try again.', 'error');
            }
            throw error;
        }
    }

    async signin(userData) {
        try {
            const result = await authService.signIn(userData);
            this.showMessage('Sign in successful! Redirecting...', 'success');
            
            // Redirect will be handled by authService
            setTimeout(() => {
                if (result.data && result.data.user) {
                    // Redirect is handled by authService.redirectAfterLogin()
                    // But we can add a fallback here
                    if (!authService.currentUser) {
                        window.location.href = 'index.html';
                    }
                }
            }, 1500);
            
            return result;
        } catch (error) {
            if (error.message.includes('Invalid') || error.message.includes('credentials')) {
                this.showMessage('Invalid email or password', 'error');
            } else {
                this.showMessage('Failed to sign in. Please try again.', 'error');
            }
            throw error;
        }
    }

    initGoogleAuth() {
        const googleSignupBtn = document.querySelector('#google-signup');
        const googleSigninBtn = document.querySelector('#google-signin');
        
        if (googleSignupBtn) {
            googleSignupBtn.addEventListener('click', () => {
                this.handleGoogleAuth('signup');
            });
        }
        
        if (googleSigninBtn) {
            googleSigninBtn.addEventListener('click', () => {
                this.handleGoogleAuth('signin');
            });
        }
    }

    async handleGoogleAuth(type) {
        try {
            this.showMessage('Connecting to Google...', 'info');
            
            const result = await authService.signInWithGoogle();
            
            if (result.success) {
                if (result.isNewUser) {
                    this.showMessage('Welcome to JobStir! Please complete your profile...', 'success');
                } else {
                    this.showMessage('Google authentication successful! Redirecting...', 'success');
                }
                // Redirect will be handled by authService
            }
        } catch (error) {
            console.error('Google auth error:', error);
            if (error.message.includes('not loaded')) {
                this.showMessage('Google authentication is not available. Please use email/password.', 'warning');
            } else {
                this.showMessage('Google authentication failed. Please try again.', 'error');
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        container.className = `message-container ${type}`;
        container.textContent = message;
        container.classList.remove('hidden');
        
        // Auto-hide after 5 seconds for non-success messages
        if (type !== 'success') {
            setTimeout(() => {
                container.classList.add('hidden');
            }, 5000);
        }
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
    }

    setLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');
        
        if (isLoading) {
            button.disabled = true;
            btnText.style.opacity = '0';
            btnSpinner.classList.remove('hidden');
        } else {
            button.disabled = false;
            btnText.style.opacity = '1';
            btnSpinner.classList.add('hidden');
        }
    }

    // Static method to check if user is logged in
    static isLoggedIn() {
        const session = localStorage.getItem('jobstir_session');
        return session !== null;
    }

    // Static method to get current user
    static getCurrentUser() {
        const session = localStorage.getItem('jobstir_session');
        return session ? JSON.parse(session) : null;
    }

    // Static method to logout
    static logout() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'signin.html';
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Export for use in other scripts
window.AuthManager = AuthManager;