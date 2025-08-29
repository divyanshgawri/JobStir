// Supabase Configuration for JobStir
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    // 🔑 ADD YOUR SUPABASE PROJECT URL HERE
    url: 'https://gvjtrtrjeeqtbkrqpaji.supabase.co', // e.g., 'https://your-project.supabase.co'

    // 🔑 ADD YOUR SUPABASE ANON KEY HERE  
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2anRydHJqZWVxdGJrcnFwYWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNDIxNjMsImV4cCI6MjA3MTgxODE2M30.GAWO0B7xtD0JfSeTw4RlVOZES_gHixql0rPMSgSNf1Y', // Your public anon key

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
    if (SUPABASE_CONFIG.url === 'YOUR_SUPABASE_PROJECT_URL' ||
        SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase not configured. Please add your project URL and anon key to supabase-config.js');
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