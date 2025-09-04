// Configuration file for frontend environment variables
// This file should be updated for different environments (dev, staging, prod)

const CONFIG = {
    // Environment
    ENV: 'development', // 'development', 'staging', 'production'
    
    // API Configuration
    API: {
        BASE_URL: window.location.hostname === 'localhost' 
            ? 'http://localhost:5000' 
            : 'https://your-api-domain.com',
        ENDPOINTS: {
            EVALUATE_RESUME: '/api/evaluate-resume',
            HEALTH: '/api/health'
        },
        TIMEOUT: 30000 // 30 seconds
    },
    
    // Supabase Configuration
    SUPABASE: {
        URL: null, // Set to null to disable Supabase for now
        ANON_KEY: null // Set to null to disable Supabase for now
    },
    
    // Feature Flags
    FEATURES: {
        RESUME_EVALUATION: true,
        JOB_APPLICATIONS: true,
        SOCIAL_AUTH: true,
        DARK_MODE: true,
        ANALYTICS: false
    },
    
    // UI Configuration
    UI: {
        ITEMS_PER_PAGE: 12,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx'],
        DEBOUNCE_DELAY: 300
    },
    
    // External Services
    EXTERNAL: {
        GOOGLE_ANALYTICS_ID: null,
        SENTRY_DSN: null
    }
};

// Environment-specific overrides
if (CONFIG.ENV === 'production') {
    CONFIG.API.BASE_URL = 'https://your-production-api.com';
    CONFIG.FEATURES.ANALYTICS = true;
    CONFIG.EXTERNAL.GOOGLE_ANALYTICS_ID = 'GA_MEASUREMENT_ID';
}

// Validation
function validateConfig() {
    const warnings = [];
    
    if (!CONFIG.SUPABASE.URL) {
        warnings.push('Supabase URL not configured - running in local mode');
    }
    
    if (!CONFIG.SUPABASE.ANON_KEY) {
        warnings.push('Supabase anonymous key not configured - running in local mode');
    }
    
    if (warnings.length > 0) {
        console.info('Configuration info:', warnings);
    }
}

// Initialize configuration
validateConfig();

// Export configuration
window.APP_CONFIG = CONFIG;
