// Optimized Navigation Manager for JobStir
(function() {
    'use strict';

    class NavigationManager {
        constructor() {
            if (NavigationManager.instance) {
                return NavigationManager.instance;
            }
            NavigationManager.instance = this;
            
            this.isInitialized = false;
            this.currentPage = this.getCurrentPage();
            this.cachedElements = {};
            this.init();
        }

        init() {
            if (this.isInitialized) return;
            
            try {
                // Cache frequently used elements
                this.cacheElements();
                
                // Initialize all navigation features
                this.updateNavigationLinks();
                this.initThemeManagement();
                this.initMobileMenu();
                this.initAuthStatus();
                this.initAccessibility();
                this.setActiveNavItem();
                
                this.isInitialized = true;
                console.log('✅ Navigation manager initialized');
            } catch (error) {
                console.error('Navigation initialization error:', error);
            }
        }

        cacheElements() {
            this.cachedElements = {
                menuToggle: document.getElementById('menuToggle'),
                mobileNav: document.getElementById('mobileNav'),
                closeMenu: document.getElementById('closeMenu'),
                darkModeToggles: document.querySelectorAll('.dark-mode-toggle'),
                navLinks: document.querySelectorAll('.nav-links a, .mobile-nav-links a'),
                brandLinks: document.querySelectorAll('.site-title-main, .logo, .logo-link'),
                authLinks: {
                    login: document.querySelectorAll('[href*="signin"], [href*="login"]'),
                    signup: document.querySelectorAll('[href*="signup"], [href*="register"]'),
                    logout: document.querySelectorAll('[onclick*="logout"]')
                }
            };
        }

        // Enhanced theme management with smooth transitions
        initThemeManagement() {
            // Add smooth transition to document
            document.documentElement.style.transition = 'color-scheme 0.3s ease, background-color 0.3s ease';
            
            const savedTheme = localStorage.getItem('jobstir_theme') || 'auto';
            this.applyTheme(savedTheme);

            // Initialize theme toggles
            this.cachedElements.darkModeToggles.forEach(toggle => {
                toggle.checked = this.isDarkMode();
                toggle.addEventListener('change', this.handleThemeToggle.bind(this));
            });

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (savedTheme === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }

        handleThemeToggle(event) {
            const isDark = event.target.checked;
            const newTheme = isDark ? 'dark' : 'light';
            
            this.applyTheme(newTheme);
            localStorage.setItem('jobstir_theme', newTheme);
            
            // Update other toggles
            this.cachedElements.darkModeToggles.forEach(toggle => {
                if (toggle !== event.target) {
                    toggle.checked = isDark;
                }
            });
            
            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('themeChanged', { 
                detail: { theme: newTheme, isDark } 
            }));
        }

        applyTheme(theme) {
            const html = document.documentElement;
            
            if (theme === 'dark' || (theme === 'auto' && this.getSystemTheme() === 'dark')) {
                html.classList.add('dark');
                html.setAttribute('data-theme', 'dark');
            } else {
                html.classList.remove('dark');
                html.setAttribute('data-theme', 'light');
            }
        }

        getSystemTheme() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        isDarkMode() {
            return document.documentElement.classList.contains('dark');
        }

        // Optimized navigation link updates
        updateNavigationLinks() {
            // Fix brand links
            this.cachedElements.brandLinks.forEach(link => {
                if (link.tagName === 'A' && (link.href === '#' || !link.href)) {
                    link.href = 'index.html';
                }
            });

            // Update auth links with proper paths
            this.cachedElements.authLinks.login.forEach(link => {
                if (!link.href.includes('signin.html')) {
                    link.href = 'signin.html';
                }
            });

            this.cachedElements.authLinks.signup.forEach(link => {
                if (!link.href.includes('signup.html')) {
                    link.href = 'signup.html';
                }
            });

            // Add loading states to links
            this.cachedElements.navLinks.forEach(link => {
                link.addEventListener('click', this.handleLinkClick.bind(this));
            });
        }

        handleLinkClick(event) {
            const link = event.target.closest('a');
            if (!link || link.href === '#' || link.href === '') return;

            // Don't handle external links or same-page links
            if (link.hostname !== window.location.hostname || 
                link.pathname === window.location.pathname) return;

            // Add loading state
            link.classList.add('loading');
            
            // Remove loading state after navigation (fallback)
            setTimeout(() => {
                link.classList.remove('loading');
            }, 1000);
        }

        // Enhanced mobile menu with improved accessibility
        initMobileMenu() {
            const { menuToggle, mobileNav, closeMenu } = this.cachedElements;
            
            if (!menuToggle || !mobileNav) return;

            // Toggle mobile menu
            menuToggle.addEventListener('click', () => this.toggleMobileMenu(true));
            
            if (closeMenu) {
                closeMenu.addEventListener('click', () => this.toggleMobileMenu(false));
            }

            // Close on outside click
            mobileNav.addEventListener('click', (e) => {
                if (e.target === mobileNav) this.toggleMobileMenu(false);
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                    this.toggleMobileMenu(false);
                }
            });

            // Close when navigation link is clicked
            const mobileNavLinks = mobileNav.querySelectorAll('a');
            mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => this.toggleMobileMenu(false));
            });
        }

        toggleMobileMenu(isOpen) {
            const { mobileNav } = this.cachedElements;
            
            if (isOpen) {
                mobileNav.classList.add('active');
                document.body.style.overflow = 'hidden';
                mobileNav.setAttribute('aria-hidden', 'false');
                
                // Focus first link for accessibility
                const firstLink = mobileNav.querySelector('a');
                if (firstLink) firstLink.focus();
            } else {
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
                mobileNav.setAttribute('aria-hidden', 'true');
            }
        }

        // Initialize authentication status display
        async initAuthStatus() {
            try {
                // Wait for JobStir core to initialize
                if (window.JobStir) {
                    await window.JobStir.waitForInitialization();
                    this.updateAuthStatus();
                } else {
                    // Fallback: check for session in localStorage
                    const session = localStorage.getItem('jobstir_session');
                    this.updateAuthStatus(session ? JSON.parse(session) : null);
                }
            } catch (error) {
                console.error('Error initializing auth status:', error);
            }
        }

        updateAuthStatus(user = null) {
            const currentUser = user || (window.JobStir && window.JobStir.getCurrentUser());
            const userGreetings = document.querySelectorAll('.user-greeting, #user-greeting');
            const authButtons = document.querySelectorAll('[data-auth-state]');
            
            if (currentUser) {
                // User is logged in
                userGreetings.forEach(greeting => {
                    const name = currentUser.user_metadata?.first_name || 
                               currentUser.email.split('@')[0];
                    greeting.textContent = `Welcome, ${name}!`;
                });
                
                authButtons.forEach(btn => {
                    if (btn.dataset.authState === 'logged-in') {
                        btn.style.display = '';
                    } else if (btn.dataset.authState === 'logged-out') {
                        btn.style.display = 'none';
                    }
                });
            } else {
                // User is not logged in
                userGreetings.forEach(greeting => {
                    greeting.textContent = 'Welcome!';
                });
                
                authButtons.forEach(btn => {
                    if (btn.dataset.authState === 'logged-in') {
                        btn.style.display = 'none';
                    } else if (btn.dataset.authState === 'logged-out') {
                        btn.style.display = '';
                    }
                });
            }
        }

        // Enhanced accessibility features
        initAccessibility() {
            // Add skip navigation link
            this.addSkipNavigation();
            
            // Improve focus management
            this.improveFocusManagement();
            
            // Add aria labels to interactive elements
            this.addAriaLabels();
            
            // Handle reduced motion preferences
            this.handleReducedMotion();
        }

        addSkipNavigation() {
            if (document.querySelector('.skip-nav')) return;
            
            const skipNav = document.createElement('a');
            skipNav.className = 'skip-nav';
            skipNav.href = '#main-content';
            skipNav.textContent = 'Skip to main content';
            skipNav.style.cssText = `
                position: fixed;
                top: -100px;
                left: 20px;
                z-index: 1000;
                background: var(--primary-color, #667eea);
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                text-decoration: none;
                transition: top 0.3s ease;
            `;
            
            skipNav.addEventListener('focus', () => skipNav.style.top = '20px');
            skipNav.addEventListener('blur', () => skipNav.style.top = '-100px');
            
            document.body.insertBefore(skipNav, document.body.firstChild);
        }

        improveFocusManagement() {
            // Add focus indicators for keyboard navigation
            const focusableElements = document.querySelectorAll(
                'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
            );
            
            focusableElements.forEach(element => {
                element.addEventListener('focus', () => {
                    element.setAttribute('data-focus-visible', '');
                });
                
                element.addEventListener('blur', () => {
                    element.removeAttribute('data-focus-visible');
                });
            });
        }

        addAriaLabels() {
            // Add aria-labels to buttons without text
            const buttons = document.querySelectorAll('button:not([aria-label])');
            buttons.forEach(button => {
                if (!button.textContent.trim()) {
                    const icon = button.querySelector('i[data-feather]');
                    if (icon) {
                        const iconName = icon.getAttribute('data-feather');
                        button.setAttribute('aria-label', this.getButtonLabel(iconName));
                    }
                }
            });

            // Add aria-labels to navigation items
            this.cachedElements.navLinks.forEach(link => {
                if (!link.getAttribute('aria-label') && link.textContent) {
                    link.setAttribute('aria-label', `Navigate to ${link.textContent}`);
                }
            });
        }

        getButtonLabel(iconName) {
            const labels = {
                'menu': 'Open menu',
                'x': 'Close',
                'sun': 'Switch to light theme',
                'moon': 'Switch to dark theme',
                'search': 'Search',
                'user': 'User profile',
                'bell': 'Notifications',
                'settings': 'Settings'
            };
            return labels[iconName] || 'Button';
        }

        handleReducedMotion() {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.documentElement.classList.add('reduced-motion');
                
                // Disable CSS transitions for users who prefer reduced motion
                const style = document.createElement('style');
                style.textContent = `
                    .reduced-motion *, 
                    .reduced-motion *::before, 
                    .reduced-motion *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        // Static logout method for global access
        static logout() {
            localStorage.removeItem('adminToken');
            window.location.href = 'index.html';
        }

        // Update auth status when user state changes
        updateAuthStatus(user) {
            // Implementation for updating UI based on auth status
            const authElements = document.querySelectorAll('[data-auth]');
            authElements.forEach(el => {
                if (user) {
                    el.classList.add('authenticated');
                    el.classList.remove('anonymous');
                } else {
                    el.classList.add('anonymous');
                    el.classList.remove('authenticated');
                }
            });
        }
    }

    // Initialize navigation manager
    function initNavigation() {
        if (!window.navigationManager) {
            window.navigationManager = new NavigationManager();
        }
        return window.navigationManager;
    }

    // Initialize when DOM is ready
    function initialize() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initNavigation);
        } else {
            initNavigation();
        }
    }

    // Export to window
    window.NavigationManager = NavigationManager;
    window.initNavigation = initNavigation;

    // Start initialization
    initialize();

    // Listen for auth state changes to update navigation
    document.addEventListener('authStateChanged', (event) => {
        if (window.navigationManager) {
            window.navigationManager.updateAuthStatus(event.detail.user);
        }
    });

    console.log('✅ Optimized Navigation loaded');
})();

// Global logout function for backward compatibility
function logout() {
    if (window.NavigationManager) {
        window.NavigationManager.logout();
    } else {
        // Fallback if NavigationManager isn't available
        localStorage.removeItem('adminToken');
        window.location.href = 'index.html';
    }
}
