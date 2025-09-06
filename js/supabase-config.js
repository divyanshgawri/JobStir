// Supabase configuration for JobStir
const SUPABASE_CONFIG = {
    // Load from environment variables or use defaults for development
    url: import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-id.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key-here',
    
    // Optional: Custom configuration
    options: {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            // Use a unique storage key to avoid multiple GoTrueClient warnings across instances
            storageKey: 'jobstir-auth'
        },
        db: {
            schema: 'public'
        }
    }
};

// Initialize Supabase client
let supabase = null;

// Function to initialize Supabase (call this after setting your credentials)
function initializeSupabase() {
    // Return existing singleton if already initialized
    if (window.__JOBSTIR_SUPABASE__) {
        return window.__JOBSTIR_SUPABASE__;
    }
    
    // Check if Supabase is configured
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || 
        SUPABASE_CONFIG.url === 'YOUR_SUPABASE_PROJECT_URL' ||
        SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY' ||
        SUPABASE_CONFIG.url.includes('your-project-id') ||
        SUPABASE_CONFIG.anonKey.includes('your-supabase-anon-key')) {
        console.info('ℹ️ Supabase not configured. Running in local mode.');
        return null;
    }

    try {
        // Check if Supabase library is loaded
        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.warn('⚠️ Supabase library not loaded. Using localStorage fallback.');
            return null;
        }

        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey,
            SUPABASE_CONFIG.options
        );

        // Store as global singleton to prevent multiple instances per browser context
        window.__JOBSTIR_SUPABASE__ = supabase;

        console.log('✅ Supabase initialized successfully');
        return supabase;
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return null;
    }
}

// Get Supabase client instance
function getSupabaseClient() {
    if (window.__JOBSTIR_SUPABASE__) {
        return window.__JOBSTIR_SUPABASE__;
    }
    if (!supabase) {
        supabase = initializeSupabase();
    }
    return supabase;
}

// Export for use in other modules
window.getSupabaseClient = getSupabaseClient;
window.initializeSupabase = initializeSupabase;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSupabase();
});