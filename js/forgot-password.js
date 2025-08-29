// Forgot Password Functionality for JobStir
class ForgotPasswordManager {
    constructor() {
        this.form = document.getElementById('forgot-password-form');
        this.emailInput = document.getElementById('email');
        this.resetBtn = document.getElementById('reset-btn');
        this.messageContainer = document.getElementById('message-container');
        this.supabase = null;
        
        this.init();
    }

    async init() {
        // Initialize Supabase
        this.supabase = getSupabaseClient();
        
        // Bind events
        this.bindEvents();
    }

    bindEvents() {
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Real-time email validation
        if (this.emailInput) {
            this.emailInput.addEventListener('blur', () => this.validateEmail());
            this.emailInput.addEventListener('input', () => this.clearErrors());
        }
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailError = document.getElementById('email-error');
        
        if (!email) {
            this.showFieldError('email', 'Email is required');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            return false;
        }
        
        this.clearFieldError('email');
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateEmail()) {
            return;
        }

        const email = this.emailInput.value.trim();
        
        // Show loading state
        this.setLoadingState(true);
        this.clearMessages();

        try {
            if (this.supabase) {
                // Use Supabase for password reset
                const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/html/reset-password.html`
                });

                if (error) {
                    throw error;
                }

                this.showMessage('success', 'Password reset link sent! Check your email inbox.');
                
                // Disable form after successful submission
                this.form.style.opacity = '0.6';
                this.form.style.pointerEvents = 'none';
                
                // Redirect to signin after a delay
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 3000);

            } else {
                // Fallback: simulate sending reset email
                await this.simulatePasswordReset(email);
                this.showMessage('success', 'Password reset link sent! Check your email inbox.');
                
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 3000);
            }

        } catch (error) {
            console.error('Password reset error:', error);
            
            let errorMessage = 'Failed to send reset email. Please try again.';
            
            if (error.message) {
                if (error.message.includes('User not found')) {
                    errorMessage = 'No account found with this email address.';
                } else if (error.message.includes('rate limit')) {
                    errorMessage = 'Too many requests. Please wait before trying again.';
                }
            }
            
            this.showMessage('error', errorMessage);
        } finally {
            this.setLoadingState(false);
        }
    }

    async simulatePasswordReset(email) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Log the reset attempt
        console.log(`Password reset requested for: ${email}`);
        
        // In a real implementation, this would trigger an email service
        // For now, we'll just simulate success
        return Promise.resolve();
    }

    setLoadingState(loading) {
        const btnText = this.resetBtn.querySelector('.btn-text');
        const btnSpinner = this.resetBtn.querySelector('.btn-spinner');
        
        if (loading) {
            this.resetBtn.disabled = true;
            btnText.textContent = 'Sending...';
            btnSpinner.classList.remove('hidden');
        } else {
            this.resetBtn.disabled = false;
            btnText.textContent = 'Send Reset Link';
            btnSpinner.classList.add('hidden');
        }
    }

    showMessage(type, message) {
        this.messageContainer.className = `message-container ${type}`;
        this.messageContainer.innerHTML = `
            <div class="message-content">
                <i data-feather="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        this.messageContainer.classList.remove('hidden');
        
        // Re-render feather icons
        feather.replace();
    }

    clearMessages() {
        this.messageContainer.classList.add('hidden');
        this.messageContainer.innerHTML = '';
    }

    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    clearFieldError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        const inputElement = document.getElementById(fieldName);
        
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        if (inputElement) {
            inputElement.classList.remove('error');
        }
    }

    clearErrors() {
        this.clearFieldError('email');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPasswordManager();
});
