// Contact form functionality for JobStir
class ContactManager {
    constructor() {
        this.init();
    }

    init() {
        this.initContactForm();
    }

    initContactForm() {
        const form = document.getElementById('contact-form');
        const submitBtn = document.getElementById('submit-btn');
        
        if (!form || !submitBtn) return;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateForm()) {
                return;
            }
            
            this.setLoading(submitBtn, true);
            
            try {
                const formData = new FormData(form);
                const contactData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    subject: formData.get('subject'),
                    message: formData.get('message')
                };
                
                await this.submitContact(contactData);
                
            } catch (error) {
                this.showMessage('An error occurred while sending your message. Please try again.', 'error');
            } finally {
                this.setLoading(submitBtn, false);
            }
        });

        // Send another message button
        const sendAnotherBtn = document.getElementById('send-another-btn');
        if (sendAnotherBtn) {
            sendAnotherBtn.addEventListener('click', () => this.resetForm());
        }

        // Real-time validation
        this.initRealTimeValidation();
    }

    initRealTimeValidation() {
        const fields = ['name', 'email', 'subject', 'message'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    validateForm() {
        const fields = ['name', 'email', 'subject', 'message'];
        let isValid = true;
        
        // Clear previous errors
        this.clearAllErrors();
        
        fields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldId) {
            case 'name':
                if (!value) {
                    errorMessage = 'Name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Name must be at least 2 characters';
                    isValid = false;
                }
                break;
                
            case 'email':
                if (!value) {
                    errorMessage = 'Email is required';
                    isValid = false;
                } else if (!this.isValidEmail(value)) {
                    errorMessage = 'Please enter a valid email address';
                    isValid = false;
                }
                break;
                
            case 'subject':
                if (!value) {
                    errorMessage = 'Subject is required';
                    isValid = false;
                } else if (value.length < 5) {
                    errorMessage = 'Subject must be at least 5 characters';
                    isValid = false;
                }
                break;
                
            case 'message':
                if (!value) {
                    errorMessage = 'Message is required';
                    isValid = false;
                } else if (value.length < 10) {
                    errorMessage = 'Message must be at least 10 characters';
                    isValid = false;
                } else if (value.length > 1000) {
                    errorMessage = 'Message must not exceed 1000 characters';
                    isValid = false;
                }
                break;
        }
        
        if (!isValid) {
            this.showFieldError(fieldId + '-error', errorMessage);
        }
        
        return isValid;
    }

    async submitContact(contactData) {
        // Simulate API call - replace with actual backend integration
        return new Promise((resolve) => {
            setTimeout(() => {
                // Store contact message in localStorage for demo purposes
                const contacts = JSON.parse(localStorage.getItem('jobstir_contacts') || '[]');
                
                const newContact = {
                    id: Date.now().toString(),
                    ...contactData,
                    timestamp: new Date().toISOString(),
                    status: 'received'
                };
                
                contacts.push(newContact);
                localStorage.setItem('jobstir_contacts', JSON.stringify(contacts));
                
                this.showSuccessMessage();
                resolve(newContact);
            }, 1500);
        });
    }

    showSuccessMessage() {
        const form = document.getElementById('contact-form');
        const successMessage = document.getElementById('success-message');
        
        form.style.display = 'none';
        successMessage.classList.remove('hidden');
        successMessage.classList.add('show');
    }

    resetForm() {
        const form = document.getElementById('contact-form');
        const successMessage = document.getElementById('success-message');
        
        form.reset();
        form.style.display = 'block';
        successMessage.classList.add('hidden');
        successMessage.classList.remove('show');
        
        this.clearAllErrors();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showFieldError(fieldId, message) {
        const errorElement = document.getElementById(fieldId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(fieldId + '-error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    clearAllErrors() {
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
}

// Initialize contact manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ContactManager();
});