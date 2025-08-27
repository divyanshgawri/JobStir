// Navigation helper for JobStir website
class NavigationManager {
    constructor() {
        this.init();
    }

    init() {
        this.updateNavigationLinks();
        this.handleBrandClicks();
        this.initThemeManagement();
        this.initMobileMenu();
    }

    // Initialize theme management for all pages
    initThemeManagement() {
        // Apply saved theme on page load
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }

        // Update dark mode toggles if they exist
        const darkModeToggles = document.querySelectorAll('.dark-mode-toggle');
        darkModeToggles.forEach(toggle => {
            toggle.checked = document.documentElement.classList.contains('dark');
            toggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    document.documentElement.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                }
            });
        });
    }

    // Ensure all navigation links work correctly
    updateNavigationLinks() {
        // Update any remaining # links to proper navigation
        const brandLinks = document.querySelectorAll('a[href="#"]');
        brandLinks.forEach(link => {
            if (link.classList.contains('site-title-main') || 
                link.classList.contains('logo') || 
                link.classList.contains('logo-link')) {
                link.href = 'index.html';
            }
        });

        // Update evaluate resume links to use proper path
        const evaluateLinks = document.querySelectorAll('a[href*="evaluate_resume"]');
        evaluateLinks.forEach(link => {
            if (!link.href.includes('/')) {
                link.href = 'evaluate_resume.html';
            }
        });

        // Update auth links
        const loginLinks = document.querySelectorAll('a[href*="login"], a[href*="Login"]');
        loginLinks.forEach(link => {
            if (!link.href.includes('signin.html')) {
                link.href = 'signin.html';
            }
        });

        const signupLinks = document.querySelectorAll('a[href*="signup"], a[href*="Sign Up"], a[href*="Get Started"]');
        signupLinks.forEach(link => {
            if (!link.href.includes('signup.html')) {
                link.href = 'signup.html';
            }
        });
    }

    handleBrandClicks() {
        // Handle brand/logo clicks to always go to home
        const brandElements = document.querySelectorAll('.site-title-main, .logo, .logo-link');
        brandElements.forEach(element => {
            element.addEventListener('click', (e) => {
                if (element.tagName === 'A') {
                    e.preventDefault();
                    window.location.href = 'index.html';
                }
            });
        });
    }

    // Static method to navigate to a specific page
    static navigateTo(page) {
        const pages = {
            'home': 'index.html',
            'index': 'index.html',
            'signin': 'signin.html',
            'login': 'signin.html',
            'signup': 'signup.html',
            'register': 'signup.html',
            'evaluate': 'evaluate_resume.html',
            'resume': 'evaluate_resume.html'
        };

        const targetPage = pages[page.toLowerCase()] || page;
        window.location.href = targetPage;
    }

    // Static method to get current page name
    static getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    // Static method to check if we're on a specific page
    static isCurrentPage(pageName) {
        return this.getCurrentPage() === pageName;
    }

    // Initialize mobile menu functionality
    initMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileNav = document.getElementById('mobileNav');
        const closeMenu = document.getElementById('closeMenu');

        if (menuToggle && mobileNav) {
            menuToggle.addEventListener('click', () => {
                mobileNav.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeMenu && mobileNav) {
            closeMenu.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close mobile menu when clicking outside
        if (mobileNav) {
            mobileNav.addEventListener('click', (e) => {
                if (e.target === mobileNav) {
                    mobileNav.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }

        // Close mobile menu when clicking on nav links
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (mobileNav) {
                    mobileNav.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });
    }
}

// Initialize navigation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NavigationManager();
});

// Export for use in other scripts
window.NavigationManager = NavigationManager;