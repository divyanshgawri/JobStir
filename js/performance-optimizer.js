// Performance Optimization Utilities for JobStir
class PerformanceOptimizer {
    constructor() {
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.init();
    }

    init() {
        this.setupLazyLoading();
        this.setupImageOptimization();
        this.setupCaching();
        this.setupPreloading();
    }

    // Debounce function for search inputs
    debounce(func, delay, key = 'default') {
        return (...args) => {
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }
            
            const timer = setTimeout(() => {
                func.apply(this, args);
                this.debounceTimers.delete(key);
            }, delay);
            
            this.debounceTimers.set(key, timer);
        };
    }

    // Throttle function for scroll events
    throttle(func, delay) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, delay);
            }
        };
    }

    // Cache management
    setCache(key, data, ttl = 300000) { // 5 minutes default
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // Lazy loading for images
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });

            // Observe all lazy images
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    // Image optimization
    setupImageOptimization() {
        // Add loading="lazy" to images
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.loading = 'lazy';
        });

        // Optimize image formats
        this.optimizeImageFormats();
    }

    optimizeImageFormats() {
        // Check for WebP support
        const supportsWebP = () => {
            const canvas = document.createElement('canvas');
            return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
        };

        if (supportsWebP()) {
            document.documentElement.classList.add('webp-support');
        }
    }

    // Setup caching for API calls
    setupCaching() {
        // Cache job listings
        this.cacheJobListings = this.debounce(async (filters = {}) => {
            const cacheKey = `jobs_${JSON.stringify(filters)}`;
            const cached = this.getCache(cacheKey);
            
            if (cached) {
                return cached;
            }

            // Simulate API call (replace with actual Supabase call)
            const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
            this.setCache(cacheKey, jobs);
            return jobs;
        }, 300, 'job-search');

        // Cache user data
        this.cacheUserData = async (userId) => {
            const cacheKey = `user_${userId}`;
            const cached = this.getCache(cacheKey);
            
            if (cached) {
                return cached;
            }

            const userData = JSON.parse(localStorage.getItem('jobstir_session') || '{}');
            this.setCache(cacheKey, userData, 600000); // 10 minutes
            return userData;
        };
    }

    // Preload critical resources
    setupPreloading() {
        // Preload critical CSS
        this.preloadCSS([
            'css/style.css',
            'css/job_listings.css',
            'css/admin_panel.css'
        ]);

        // Preload critical JS
        this.preloadJS([
            'js/navigation.js',
            'js/auth.js'
        ]);

        // Preload likely next pages
        this.preloadPages();
    }

    preloadCSS(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = url;
            document.head.appendChild(link);
        });
    }

    preloadJS(urls) {
        urls.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = url;
            document.head.appendChild(link);
        });
    }

    preloadPages() {
        // Preload likely next pages based on current page
        const currentPage = window.location.pathname.split('/').pop();
        const preloadMap = {
            'index.html': ['job_listings.html', 'profile.html'],
            'signin.html': ['index.html', 'signup.html'],
            'signup.html': ['index.html', 'signin.html'],
            'job_listings.html': ['candidate_portal.html', 'profile.html'],
            'admin_panel.html': ['hr_dashboard.html'],
            'hr_dashboard.html': ['hr_job_upload.html']
        };

        const pagesToPreload = preloadMap[currentPage] || [];
        pagesToPreload.forEach(page => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = page;
            document.head.appendChild(link);
        });
    }

    // Virtual scrolling for large lists
    setupVirtualScrolling(container, items, renderItem, itemHeight = 100) {
        const containerHeight = container.clientHeight;
        const visibleItems = Math.ceil(containerHeight / itemHeight) + 2;
        let startIndex = 0;

        const render = () => {
            const endIndex = Math.min(startIndex + visibleItems, items.length);
            const visibleData = items.slice(startIndex, endIndex);
            
            container.innerHTML = '';
            container.style.paddingTop = `${startIndex * itemHeight}px`;
            container.style.paddingBottom = `${(items.length - endIndex) * itemHeight}px`;
            
            visibleData.forEach((item, index) => {
                const element = renderItem(item, startIndex + index);
                container.appendChild(element);
            });
        };

        const handleScroll = this.throttle(() => {
            const scrollTop = container.scrollTop;
            const newStartIndex = Math.floor(scrollTop / itemHeight);
            
            if (newStartIndex !== startIndex) {
                startIndex = newStartIndex;
                render();
            }
        }, 16); // 60fps

        container.addEventListener('scroll', handleScroll);
        render();

        return { render, updateItems: (newItems) => { items = newItems; render(); } };
    }

    // Optimize form submissions
    optimizeForm(form, submitHandler) {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        // Add real-time validation
        inputs.forEach(input => {
            const validateInput = this.debounce(() => {
                this.validateField(input);
            }, 300, `validate_${input.name}`);
            
            input.addEventListener('input', validateInput);
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Optimize submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            try {
                await submitHandler(new FormData(form));
            } catch (error) {
                console.error('Form submission error:', error);
                this.showError('Submission failed. Please try again.');
            } finally {
                // Restore button state
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    validateField(input) {
        const value = input.value.trim();
        const type = input.type;
        const required = input.required;
        
        let isValid = true;
        let message = '';

        if (required && !value) {
            isValid = false;
            message = 'This field is required';
        } else if (type === 'email' && value && !this.isValidEmail(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        } else if (type === 'password' && value && value.length < 8) {
            isValid = false;
            message = 'Password must be at least 8 characters';
        }

        this.updateFieldValidation(input, isValid, message);
        return isValid;
    }

    updateFieldValidation(input, isValid, message) {
        const container = input.closest('.form-group') || input.parentElement;
        const errorElement = container.querySelector('.error-message') || 
                           this.createErrorElement();
        
        if (!container.querySelector('.error-message')) {
            container.appendChild(errorElement);
        }

        if (isValid) {
            input.classList.remove('error');
            errorElement.style.display = 'none';
        } else {
            input.classList.add('error');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    createErrorElement() {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.style.cssText = 'color: #e74c3c; font-size: 0.875rem; margin-top: 0.25rem;';
        return error;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showError(message) {
        // Create or update error notification
        let notification = document.querySelector('.error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #e74c3c;
                color: white;
                padding: 1rem;
                border-radius: 0.5rem;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }

    // Performance monitoring
    measurePerformance(name, fn) {
        return async (...args) => {
            const start = performance.now();
            const result = await fn(...args);
            const end = performance.now();
            
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        };
    }

    // Memory cleanup
    cleanup() {
        this.cache.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Export for global use
window.performanceOptimizer = performanceOptimizer;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    performanceOptimizer.cleanup();
});

// Export utilities for other modules
window.debounce = (func, delay, key) => performanceOptimizer.debounce(func, delay, key);
window.throttle = (func, delay) => performanceOptimizer.throttle(func, delay);
window.cache = {
    set: (key, data, ttl) => performanceOptimizer.setCache(key, data, ttl),
    get: (key) => performanceOptimizer.getCache(key),
    clear: (pattern) => performanceOptimizer.clearCache(pattern)
};