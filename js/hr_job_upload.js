// HR Job Upload functionality for JobStir
class HRJobUpload {
    constructor() {
        this.isEditing = false;
        this.editingJobId = null;
        this.init();
    }

    init() {
        this.checkHRAccess();
        this.updateUserGreeting();
        this.checkEditMode();
        this.initEventListeners();
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

    checkEditMode() {
        const editingJobId = localStorage.getItem('editing_job_id');
        if (editingJobId) {
            this.isEditing = true;
            this.editingJobId = editingJobId;
            this.loadJobForEditing(editingJobId);
            localStorage.removeItem('editing_job_id'); // Clean up
        }
    }

    loadJobForEditing(jobId) {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        const job = jobs.find(j => j.id === jobId);
        
        if (job) {
            // Update page title and button text
            document.querySelector('.hero-title').textContent = 'Edit Job Posting';
            document.querySelector('.hero-subtitle').textContent = 'Update your job posting details.';
            document.querySelector('#submit-btn .btn-text').innerHTML = '<i data-feather="save"></i> Update Job';
            
            // Populate form fields
            document.getElementById('company-name').value = job.company || '';
            document.getElementById('job-title').value = job.title || '';
            document.getElementById('job-location').value = job.location || '';
            document.getElementById('job-type').value = job.type || '';
            document.getElementById('salary-range').value = job.salary || '';
            document.getElementById('job-description').value = job.description || '';
            
            this.updateCharCounter();
            feather.replace();
        }
    }

    initEventListeners() {
        // Form submission
        const form = document.getElementById('job-upload-form');
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Character counter for job description
        const jobDescription = document.getElementById('job-description');
        jobDescription.addEventListener('input', () => this.updateCharCounter());

        // Post another job button
        const postAnotherBtn = document.getElementById('post-another-btn');
        if (postAnotherBtn) {
            postAnotherBtn.addEventListener('click', () => this.resetForm());
        }

        // Real-time validation
        this.initRealTimeValidation();
    }

    initRealTimeValidation() {
        const fields = ['company-name', 'job-title', 'job-location', 'job-type', 'job-description'];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    updateCharCounter() {
        const textarea = document.getElementById('job-description');
        const counter = document.getElementById('char-counter');
        const currentLength = textarea.value.length;
        const maxLength = 5000;
        
        counter.textContent = `${currentLength} / ${maxLength}`;
        
        if (currentLength > maxLength * 0.9) {
            counter.style.color = '#ef4444';
        } else if (currentLength > maxLength * 0.8) {
            counter.style.color = '#f59e0b';
        } else {
            counter.style.color = '#64748b';
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        const submitBtn = document.getElementById('submit-btn');
        this.setLoading(submitBtn, true);
        
        try {
            const formData = this.getFormData();
            
            if (this.isEditing) {
                await this.updateJob(formData);
            } else {
                await this.createJob(formData);
            }
            
        } catch (error) {
            this.showMessage('An error occurred. Please try again.', 'error');
        } finally {
            this.setLoading(submitBtn, false);
        }
    }

    getFormData() {
        return {
            company: document.getElementById('company-name').value.trim(),
            title: document.getElementById('job-title').value.trim(),
            location: document.getElementById('job-location').value.trim(),
            type: document.getElementById('job-type').value,
            salary: document.getElementById('salary-range').value.trim(),
            description: document.getElementById('job-description').value.trim()
        };
    }

    async createJob(jobData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
                
                const newJob = {
                    id: Date.now().toString(),
                    ...jobData,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                };
                
                jobs.push(newJob);
                localStorage.setItem('jobstir_jobs', JSON.stringify(jobs));
                
                this.showSuccessMessage('Job posted successfully!');
                resolve(newJob);
            }, 1500);
        });
    }

    async updateJob(jobData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
                const jobIndex = jobs.findIndex(j => j.id === this.editingJobId);
                
                if (jobIndex !== -1) {
                    jobs[jobIndex] = {
                        ...jobs[jobIndex],
                        ...jobData,
                        updatedAt: new Date().toISOString()
                    };
                    
                    localStorage.setItem('jobstir_jobs', JSON.stringify(jobs));
                    this.showMessage('Job updated successfully!', 'success');
                    
                    // Redirect to dashboard after update
                    setTimeout(() => {
                        window.location.href = 'hr_dashboard.html';
                    }, 2000);
                } else {
                    throw new Error('Job not found');
                }
                
                resolve();
            }, 1500);
        });
    }

    validateForm() {
        const fields = [
            'company-name',
            'job-title', 
            'job-location',
            'job-type',
            'job-description'
        ];
        
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
            case 'company-name':
                if (!value) {
                    errorMessage = 'Company name is required';
                    isValid = false;
                } else if (value.length < 2) {
                    errorMessage = 'Company name must be at least 2 characters';
                    isValid = false;
                }
                break;
                
            case 'job-title':
                if (!value) {
                    errorMessage = 'Job title is required';
                    isValid = false;
                } else if (value.length < 3) {
                    errorMessage = 'Job title must be at least 3 characters';
                    isValid = false;
                }
                break;
                
            case 'job-location':
                if (!value) {
                    errorMessage = 'Location is required';
                    isValid = false;
                }
                break;
                
            case 'job-type':
                if (!value) {
                    errorMessage = 'Please select a job type';
                    isValid = false;
                }
                break;
                
            case 'job-description':
                if (!value) {
                    errorMessage = 'Job description is required';
                    isValid = false;
                } else if (value.length < 50) {
                    errorMessage = 'Job description must be at least 50 characters';
                    isValid = false;
                } else if (value.length > 5000) {
                    errorMessage = 'Job description must not exceed 5000 characters';
                    isValid = false;
                }
                break;
        }
        
        if (!isValid) {
            this.showFieldError(fieldId + '-error', errorMessage);
        }
        
        return isValid;
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

    showSuccessMessage(message) {
        const form = document.getElementById('job-upload-form');
        const successMessage = document.getElementById('success-message');
        
        form.style.display = 'none';
        successMessage.classList.remove('hidden');
        successMessage.classList.add('show');
        
        // Update success message text if provided
        const successText = successMessage.querySelector('p');
        if (successText && message) {
            successText.textContent = message;
        }
    }

    resetForm() {
        const form = document.getElementById('job-upload-form');
        const successMessage = document.getElementById('success-message');
        
        form.reset();
        form.style.display = 'block';
        successMessage.classList.add('hidden');
        successMessage.classList.remove('show');
        
        this.clearAllErrors();
        this.updateCharCounter();
        
        // Reset editing state
        this.isEditing = false;
        this.editingJobId = null;
        
        // Reset page title and button text
        document.querySelector('.hero-title').textContent = 'Post a Job Opportunity';
        document.querySelector('.hero-subtitle').textContent = 'Attract top-matched talent using JobStir\'s AI-powered matching engine.';
        document.querySelector('#submit-btn .btn-text').innerHTML = '<i data-feather="upload"></i> Post Job';
        
        feather.replace();
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

    // Static method for logout
    static logout() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'signin.html';
    }
}

// Initialize job upload when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.hrJobUpload = new HRJobUpload();
});

// Global logout function
window.logout = HRJobUpload.logout;