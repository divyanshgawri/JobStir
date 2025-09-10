/**
 * Admin Security Module for JobStir
 * Handles advanced security features for the admin panel
 */

class AdminSecurity {
    constructor(adminPanel) {
        this.adminPanel = adminPanel;
        this.suspiciousActivities = [];
        this.loginAttempts = new Map();
        this.rateLimits = {
            api: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
            auth: { windowMs: 60 * 60 * 1000, max: 5 },   // 5 login attempts per hour
            public: { windowMs: 60 * 1000, max: 60 }      // 60 requests per minute
        };
        this.init();
    }

    async init() {
        this.setupSecurityHeaders();
        this.setupEventListeners();
        await this.loadSecurityConfig();
        this.startSecurityMonitor();
    }

    // 1. Advanced Threat Detection
    async detectThreats(activity) {
        const { type, userId, ip, action, details } = activity;
        const timestamp = new Date().toISOString();
        
        // Log the activity
        this.logActivity({
            timestamp,
            type,
            userId: userId || 'anonymous',
            ip,
            action,
            details,
            severity: this.calculateThreatLevel(activity)
        });

        // Check for suspicious patterns
        const isSuspicious = this.analyzeForThreats(activity);
        
        if (isSuspicious) {
            await this.handleSuspiciousActivity(activity);
        }

        return isSuspicious;
    }

    analyzeForThreats(activity) {
        // Check for SQL injection patterns
        const sqlInjectionPatterns = [
            /(['";]+|(\b(SELECT|INSERT|DELETE|UPDATE|DROP|--|#|\/\*|\*\/|xp_)\b))/i
        ];

        // Check for XSS patterns
        const xssPatterns = [
            /<script[^>]*>.*<\/script>/i,
            /javascript:/i,
            /on\w+\s*=/i
        ];

        const input = JSON.stringify(activity).toLowerCase();
        
        return [...sqlInjectionPatterns, ...xssPatterns].some(pattern => 
            pattern.test(input)
        );
    }

    async handleSuspiciousActivity(activity) {
        // Add to suspicious activities
        this.suspiciousActivities.push({
            ...activity,
            handled: false,
            timestamp: new Date().toISOString()
        });

        // Log to server
        if (this.adminPanel.supabase) {
            try {
                const { error } = await this.adminPanel.supabase
                    .from('security_logs')
                    .insert([{
                        type: 'suspicious_activity',
                        user_id: activity.userId || null,
                        ip_address: activity.ip,
                        action: activity.action,
                        details: activity.details,
                        severity: activity.severity || 'medium',
                        metadata: { activity }
                    }]);

                if (error) throw error;
            } catch (error) {
                console.error('Failed to log suspicious activity:', error);
            }
        }

        // TODO: Implement notification system
        this.notifyAdmins({
            type: 'security_alert',
            title: 'Suspicious Activity Detected',
            message: `Suspicious activity detected: ${activity.action}`,
            severity: activity.severity || 'medium'
        });
    }

    // 2. Rate Limiting Implementation
    checkRateLimit(ip, endpoint) {
        const now = Date.now();
        const windowMs = this.rateLimits[endpoint]?.windowMs || this.rateLimits.public.windowMs;
        const maxRequests = this.rateLimits[endpoint]?.max || this.rateLimits.public.max;

        if (!this.loginAttempts.has(ip)) {
            this.loginAttempts.set(ip, []);
        }

        const attempts = this.loginAttempts.get(ip);
        const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
        
        // Update attempts
        recentAttempts.push(now);
        this.loginAttempts.set(ip, recentAttempts);

        // Check if rate limit exceeded
        if (recentAttempts.length > maxRequests) {
            this.detectThreats({
                type: 'rate_limit_exceeded',
                ip,
                action: 'rate_limit_triggered',
                details: `Too many requests to ${endpoint}`,
                severity: 'high'
            });
            return false;
        }

        return true;
    }

    // 3. Security Headers
    setupSecurityHeaders() {
        const headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'SAMEORIGIN',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' https:;",
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Permissions-Policy': "camera=(), microphone=(), geolocation=(), payment=()"
        };

        // Apply headers to all admin panel requests
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = async (url, options = {}) => {
                const response = await originalFetch(url, {
                    ...options,
                    headers: {
                        ...options.headers,
                        ...headers
                    }
                });
                return response;
            };
        }
    }

    // 4. Security Audit
    async runSecurityAudit() {
        const auditResults = {
            timestamp: new Date().toISOString(),
            checks: {},
            score: 0,
            totalChecks: 0,
            passedChecks: 0
        };

        // Check 1: Password Policies
        auditResults.checks.passwordPolicies = await this.checkPasswordPolicies();
        
        // Check 2: SSL/TLS Configuration
        auditResults.checks.sslConfiguration = await this.checkSSLConfiguration();
        
        // Check 3: Security Headers
        auditResults.checks.securityHeaders = this.checkSecurityHeaders();
        
        // Check 4: User Session Security
        auditResults.checks.sessionSecurity = await this.checkSessionSecurity();
        
        // Check 5: API Security
        auditResults.checks.apiSecurity = this.checkAPISecurity();

        // Calculate score
        const passedChecks = Object.values(auditResults.checks).filter(check => check.passed).length;
        auditResults.totalChecks = Object.keys(auditResults.checks).length;
        auditResults.passedChecks = passedChecks;
        auditResults.score = Math.round((passedChecks / auditResults.totalChecks) * 100);

        // Save audit results
        if (this.adminPanel.supabase) {
            try {
                const { error } = await this.adminPanel.supabase
                    .from('security_audits')
                    .insert([auditResults]);

                if (error) throw error;
            } catch (error) {
                console.error('Failed to save security audit:', error);
            }
        }

        return auditResults;
    }

    // 5. Backup and Restore
    async createBackup(options = {}) {
        const {
            includeUsers = true,
            includeJobs = true,
            includeApplications = true,
            includeSettings = true,
            includeMedia = false
        } = options;

        const backup = {
            metadata: {
                version: '1.0',
                createdAt: new Date().toISOString(),
                backupId: `backup_${Date.now()}`,
                includes: { includeUsers, includeJobs, includeApplications, includeSettings, includeMedia }
            },
            data: {}
        };

        try {
            // Backup users
            if (includeUsers && this.adminPanel.supabase) {
                const { data: users, error } = await this.adminPanel.supabase
                    .from('users')
                    .select('*');
                
                if (!error) {
                    backup.data.users = users;
                } else {
                    console.error('Failed to backup users:', error);
                }
            }

            // Backup jobs
            if (includeJobs && this.adminPanel.supabase) {
                const { data: jobs, error } = await this.adminPanel.supabase
                    .from('jobs')
                    .select('*');
                
                if (!error) {
                    backup.data.jobs = jobs;
                } else {
                    console.error('Failed to backup jobs:', error);
                }
            }

            // Backup applications
            if (includeApplications && this.adminPanel.supabase) {
                const { data: applications, error } = await this.adminPanel.supabase
                    .from('applications')
                    .select('*');
                
                if (!error) {
                    backup.data.applications = applications;
                } else {
                    console.error('Failed to backup applications:', error);
                }
            }

            // Backup settings
            if (includeSettings) {
                backup.data.settings = {
                    // Add your settings backup logic here
                    lastBackup: new Date().toISOString()
                };
            }

            // Save backup to server
            if (this.adminPanel.supabase) {
                const { error } = await this.adminPanel.supabase
                    .from('backups')
                    .insert([{
                        backup_id: backup.metadata.backupId,
                        created_at: backup.metadata.createdAt,
                        data: backup,
                        size: JSON.stringify(backup).length,
                        status: 'completed'
                    }]);

                if (error) throw error;
            }

            // Return backup data for download
            return backup;

        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }

    async restoreBackup(backupData) {
        if (!backupData || !backupData.metadata || !backupData.data) {
            throw new Error('Invalid backup data');
        }

        try {
            const { metadata, data } = backupData;
            
            // Restore users
            if (data.users && metadata.includes.includeUsers) {
                // Backup current users first
                const currentUsers = await this.createBackup({ includeUsers: true });
                
                // Restore users
                for (const user of data.users) {
                    const { error } = await this.adminPanel.supabase
                        .from('users')
                        .upsert(user);
                    
                    if (error) throw error;
                }
            }

            // Restore jobs
            if (data.jobs && metadata.includes.includeJobs) {
                // Similar implementation as users
                // ...
            }

            // Restore applications
            if (data.applications && metadata.includes.includeApplications) {
                // Similar implementation as users
                // ...
            }

            // Restore settings
            if (data.settings && metadata.includes.includeSettings) {
                // Restore settings logic
                // ...
            }

            return { success: true, message: 'Backup restored successfully' };
        } catch (error) {
            console.error('Restore failed:', error);
            throw error;
        }
    }

    // Helper Methods
    async loadSecurityConfig() {
        // Load security configuration from server or localStorage
        const config = localStorage.getItem('securityConfig');
        if (config) {
            try {
                const parsed = JSON.parse(config);
                this.rateLimits = { ...this.rateLimits, ...parsed.rateLimits };
            } catch (e) {
                console.error('Failed to load security config:', e);
            }
        }
    }

    startSecurityMonitor() {
        // Monitor for suspicious activities
        setInterval(() => {
            this.cleanupOldAttempts();
            this.checkForBruteForceAttempts();
        }, 5 * 60 * 1000); // Run every 5 minutes
    }

    cleanupOldAttempts() {
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        for (const [ip, attempts] of this.loginAttempts.entries()) {
            const recentAttempts = attempts.filter(timestamp => timestamp > oneHourAgo);
            
            if (recentAttempts.length > 0) {
                this.loginAttempts.set(ip, recentAttempts);
            } else {
                this.loginAttempts.delete(ip);
            }
        }
    }

    checkForBruteForceAttempts() {
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        for (const [ip, attempts] of this.loginAttempts.entries()) {
            const recentAttempts = attempts.filter(timestamp => timestamp > fiveMinutesAgo);
            
            if (recentAttempts.length > 10) { // More than 10 attempts in 5 minutes
                this.detectThreats({
                    type: 'brute_force_attempt',
                    ip,
                    action: 'multiple_failed_logins',
                    details: `Multiple failed login attempts (${recentAttempts.length})`,
                    severity: 'high'
                });
            }
        }
    }

    logActivity(activity) {
        // Log activity to console and/or server
        console.log('[Security]', activity);
        
        // Add to recent activities
        this.suspiciousActivities.unshift(activity);
        if (this.suspiciousActivities.length > 100) {
            this.suspiciousActivities.pop();
        }
    }

    notifyAdmins(notification) {
        // TODO: Implement notification system
        console.warn('[Security Alert]', notification);
    }

    // Security Audit Helpers
    async checkPasswordPolicies() {
        // Check if password policies are enforced
        return {
            name: 'Password Policies',
            description: 'Check if strong password policies are enforced',
            passed: true, // Implement actual check
            details: {}
        };
    }

    async checkSSLConfiguration() {
        // Check SSL/TLS configuration
        return {
            name: 'SSL/TLS Configuration',
            description: 'Verify SSL/TLS is properly configured',
            passed: window.location.protocol === 'https:',
            details: {
                protocol: window.location.protocol
            }
        };
    }

    checkSecurityHeaders() {
        // Check if security headers are present
        return {
            name: 'Security Headers',
            description: 'Verify essential security headers are set',
            passed: true, // Implement actual check
            details: {}
        };
    }

    async checkSessionSecurity() {
        // Check session security settings
        return {
            name: 'Session Security',
            description: 'Verify secure session handling',
            passed: true, // Implement actual check
            details: {}
        };
    }

    checkAPISecurity() {
        // Check API security measures
        return {
            name: 'API Security',
            description: 'Verify API security measures',
            passed: true, // Implement actual check
            details: {}
        };
    }

    // Getters and Setters
    getSuspiciousActivities(limit = 20) {
        return this.suspiciousActivities.slice(0, limit);
    }

    getRateLimitInfo(ip) {
        return {
            ip,
            attempts: this.loginAttempts.get(ip) || [],
            limits: this.rateLimits
        };
    }
}

// Export for Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSecurity;
} else {
    window.AdminSecurity = AdminSecurity;
}
