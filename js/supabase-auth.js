// Auth service bridging UI to Supabase (with localStorage fallback)
class AuthService {
    constructor() {
        this.currentUser = null;
        this.supabase = null;
        this._init();
    }

    _init() {
        try {
            if (window && window.getSupabaseClient) {
                this.supabase = window.getSupabaseClient();
            }
        } catch (e) {
            this.supabase = null;
        }
        if (!this.supabase) {
            console.warn('Supabase not available. AuthService will use localStorage fallback.');
        }
        this._loadSessionFromStorage();
    }

    _loadSessionFromStorage() {
        const session = localStorage.getItem('jobstir_session');
        if (session) {
            try {
                this.currentUser = JSON.parse(session);
            } catch (_) {
                this.currentUser = null;
            }
        }
    }

    _saveSession(user) {
        this.currentUser = user ? { id: user.id, email: user.email } : null;
        if (this.currentUser) {
            localStorage.setItem('jobstir_session', JSON.stringify(this.currentUser));
            // Mark geolocation allowed only upon explicit consent later
        } else {
            localStorage.removeItem('jobstir_session');
        }
    }

    async signUp({ email, password, isHR }) {
        if (this.supabase) {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: { data: { is_hr: !!isHR } }
            });
            if (error) throw error;
            if (data.user) this._saveSession(data.user);
            // After successful signup, ask once for geolocation permission (deferred trigger)
            try { localStorage.setItem('jobstir_geo_allowed', 'true'); } catch (_) {}
            return { success: true, data, isNewUser: true };
        }
        // Fallback local signup
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        if (users.some(u => u.email === email)) {
            throw new Error('User already exists');
        }
        const newUser = { id: 'loc_' + Date.now(), email, password, isHR: !!isHR };
        users.push(newUser);
        localStorage.setItem('jobstir_users', JSON.stringify(users));
        this._saveSession(newUser);
        try { localStorage.setItem('jobstir_geo_allowed', 'true'); } catch (_) {}
        return { success: true, data: { user: newUser }, isNewUser: true };
    }

    async signIn({ email, password }) {
        if (this.supabase) {
            const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            if (data.user) this._saveSession(data.user);
            try { localStorage.setItem('jobstir_geo_allowed', 'true'); } catch (_) {}
            return { success: true, data };
        }
        // Fallback local signin
        const users = JSON.parse(localStorage.getItem('jobstir_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('Invalid credentials');
        this._saveSession(user);
        try { localStorage.setItem('jobstir_geo_allowed', 'true'); } catch (_) {}
        return { success: true, data: { user } };
    }

    async signInWithGoogle() {
        if (!this.supabase) throw new Error('Supabase not loaded');
        const { data, error } = await this.supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) throw error;
        return { success: true, data };
    }

    async signOut() {
        if (this.supabase) {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
        }
        this._saveSession(null);
        return { success: true };
    }

    redirectAfterLogin() {
        // Placeholder for any post-login routing logic
    }
}

// Expose globally
window.authService = new AuthService();


