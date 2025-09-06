// Enhanced Theme Manager for JobStir
// Handles theme switching with persistence across all pages
// Follows the new earthy color palette design principles

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.toggles = [];
        this.callbacks = [];
        this.storageKey = 'jobstir_theme_preference';
        this.systemPreferenceKey = 'jobstir_respect_system_preference';
        this.transitionDuration = 300; // ms
        
        this.init();
    }

    init() {
        // Initialize theme system
        this.detectSystemPreference();
        this.loadSavedTheme();
        this.findThemeToggles();
        this.bindEvents();
        this.applyTheme(this.currentTheme, false); // Apply without animation on init
        
        console.log(`🎨 Theme Manager initialized - Current theme: ${this.currentTheme}`);
    }

    detectSystemPreference() {
        // Check if user prefers dark mode
        this.systemPrefersDark = window.matchMedia && 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Listen for system preference changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener(() => {
                this.systemPrefersDark = mediaQuery.matches;
                // Only auto-switch if user hasn't manually set a preference
                if (this.shouldRespectSystemPreference()) {
                    this.setTheme(this.systemPrefersDark ? 'dark' : 'light');
                }
            });
        }
    }

    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem(this.storageKey);
            const respectSystem = localStorage.getItem(this.systemPreferenceKey);
            
            if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
                this.currentTheme = savedTheme;
            } else if (respectSystem !== 'false' && this.systemPrefersDark) {
                // Default to system preference if no saved theme
                this.currentTheme = 'dark';
            }
        } catch (error) {
            console.warn('Failed to load theme preference:', error);
            // Fallback to system preference or light
            this.currentTheme = this.systemPrefersDark ? 'dark' : 'light';
        }
    }

    findThemeToggles() {
        // Find all theme toggle elements
        this.toggles = document.querySelectorAll('.dark-mode-toggle, .theme-toggle');
        
        if (this.toggles.length === 0) {
            console.warn('No theme toggles found on page');
        } else {
            console.log(`Found ${this.toggles.length} theme toggle(s)`);
        }
    }

    bindEvents() {
        // Bind toggle events
        this.toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                this.setTheme(newTheme);
                // Mark that user has manually set preference
                localStorage.setItem(this.systemPreferenceKey, 'false');
            });
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + D to toggle theme
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Handle focus trap for better accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isTransitioning) {
                // Prevent tabbing during transitions to avoid visual glitches
                e.preventDefault();
            }
        });
    }

    setTheme(theme, animate = true) {
        if (!['light', 'dark'].includes(theme)) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }

        if (theme === this.currentTheme) return;

        const previousTheme = this.currentTheme;
        this.currentTheme = theme;

        // Apply theme
        this.applyTheme(theme, animate);
        
        // Save preference
        this.saveThemePreference(theme);
        
        // Update toggles
        this.updateToggles();
        
        // Notify callbacks
        this.notifyCallbacks(theme, previousTheme);
        
        console.log(`🎨 Theme changed: ${previousTheme} → ${theme}`);
    }

    applyTheme(theme, animate = true) {
        const html = document.documentElement;
        
        if (animate) {
            // Add transition class
            this.isTransitioning = true;
            html.style.transition = `background-color ${this.transitionDuration}ms ease, color ${this.transitionDuration}ms ease`;
            
            // Remove transition after animation
            setTimeout(() => {
                html.style.transition = '';
                this.isTransitioning = false;
            }, this.transitionDuration);
        }

        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }

        // Update meta theme-color for mobile browsers
        this.updateThemeColor(theme);
        
        // Re-initialize icons if available (for feather icons, etc.)
        if (typeof feather !== 'undefined') {
            setTimeout(() => feather.replace(), 50);
        }
    }

    updateThemeColor(theme) {
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.name = 'theme-color';
            document.head.appendChild(themeColorMeta);
        }
        
        // Use theme colors from CSS variables
        const themeColors = {
            light: '#FFFFFF', // --white
            dark: '#2C3424'   // --moss
        };
        
        themeColorMeta.content = themeColors[theme];
    }

    updateToggles() {
        const isDark = this.currentTheme === 'dark';
        this.toggles.forEach(toggle => {
            if (toggle.checked !== isDark) {
                toggle.checked = isDark;
            }
        });
    }

    saveThemePreference(theme) {
        try {
            localStorage.setItem(this.storageKey, theme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }

    shouldRespectSystemPreference() {
        try {
            return localStorage.getItem(this.systemPreferenceKey) !== 'false';
        } catch {
            return true;
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        localStorage.setItem(this.systemPreferenceKey, 'false');
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDark() {
        return this.currentTheme === 'dark';
    }

    isLight() {
        return this.currentTheme === 'light';
    }

    // Callback system for other components to listen to theme changes
    onThemeChange(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }

    offThemeChange(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
    }

    notifyCallbacks(newTheme, previousTheme) {
        this.callbacks.forEach(callback => {
            try {
                callback(newTheme, previousTheme);
            } catch (error) {
                console.error('Theme change callback error:', error);
            }
        });
    }

    // Utility methods for components
    getThemeColors() {
        const root = getComputedStyle(document.documentElement);
        return {
            primary: root.getPropertyValue('--primary').trim(),
            secondary: root.getPropertyValue('--secondary').trim(),
            background: root.getPropertyValue('--background').trim(),
            surface: root.getPropertyValue('--surface').trim(),
            textPrimary: root.getPropertyValue('--text-primary').trim(),
            textSecondary: root.getPropertyValue('--text-secondary').trim(),
            border: root.getPropertyValue('--border').trim()
        };
    }

    // Reset to system preference
    resetToSystemPreference() {
        localStorage.removeItem(this.storageKey);
        localStorage.setItem(this.systemPreferenceKey, 'true');
        this.setTheme(this.systemPrefersDark ? 'dark' : 'light');
    }

    // Export/import theme settings (for advanced users)
    exportSettings() {
        return {
            theme: this.currentTheme,
            respectSystemPreference: this.shouldRespectSystemPreference(),
            timestamp: new Date().toISOString()
        };
    }

    importSettings(settings) {
        try {
            if (settings.theme && ['light', 'dark'].includes(settings.theme)) {
                this.setTheme(settings.theme);
            }
            if (typeof settings.respectSystemPreference === 'boolean') {
                localStorage.setItem(this.systemPreferenceKey, 
                    settings.respectSystemPreference.toString());
            }
            return true;
        } catch (error) {
            console.error('Failed to import theme settings:', error);
            return false;
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.jobstirTheme = new ThemeManager();
    });
} else {
    window.jobstirTheme = new ThemeManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}

// Additional utility functions for other scripts
window.getTheme = () => window.jobstirTheme?.getCurrentTheme() || 'light';
window.setTheme = (theme) => window.jobstirTheme?.setTheme(theme);
window.toggleTheme = () => window.jobstirTheme?.toggleTheme();
