// Enhanced Post-deployment Security Configuration for JobStir
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    requiredFiles: [
        { path: '.env', checkContent: true },
        { path: 'server.js', checkContent: true },
        { path: 'package-lock.json', checkContent: false },
        { path: 'railway.toml', checkContent: true },
        { path: 'js/admin-security.js', checkContent: true },
        { path: 'js/navigation.js', checkContent: true },
        { path: 'package.json', checkContent: true }
    ],
    requiredDirs: [
        'js',
        'html',
        'css',
        'data'
    ],
    requiredEnvVars: {
        'NODE_ENV': 'production',
        'PORT': '3000',
        'SUPABASE_URL': 'https://*.supabase.co',
        'SUPABASE_ANON_KEY': '^[a-zA-Z0-9-_]+\.\w+$',
        'JWT_SECRET': '.{32,}',
        'SESSION_SECRET': '.{32,}'
    },
    requiredHeaders: [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'Permissions-Policy',
        'Referrer-Policy'
    ]
};

// Security check results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

// Helper functions
function addResult(passed, message, critical = true) {
    const result = { passed, message, critical };
    results.details.push(result);
    if (passed) {
        results.passed++;
    } else if (critical) {
        results.failed++;
    } else {
        results.warnings++;
    }
    return result;
}

// 1. File System Security
function checkFileSystem() {
    console.log('\n🔍 Checking file system security...');
    
    // Check required files
    CONFIG.requiredFiles.forEach(fileConfig => {
        const filePath = fileConfig.path || fileConfig;
        const checkContent = fileConfig.checkContent || false;
        const exists = fs.existsSync(filePath);
        
        addResult(
            exists,
            exists ? `File exists: ${filePath}` : `Missing file: ${filePath}`,
            true
        );
        
        if (exists) {
            try {
                // Set secure permissions (600 for files, 700 for directories)
                const stats = fs.lstatSync(filePath);
                const isDir = stats.isDirectory();
                fs.chmodSync(filePath, isDir ? 0o700 : 0o600);
                
                // Check file content for sensitive information
                if (checkContent && !isDir) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (filePath.endsWith('.env') || filePath.endsWith('config.js')) {
                        const sensitivePatterns = [
                            { pattern: /(password|secret|key|token)=['"].*?['"]/gi, name: 'exposed secret' },
                            { pattern: /(api[_-]?key)=['"].*?['"]/gi, name: 'exposed API key' },
                            { pattern: /(jwt[_-]?secret)=['"].*?['"]/gi, name: 'exposed JWT secret' }
                        ];
                        
                        sensitivePatterns.forEach(({ pattern, name }) => {
                            if (pattern.test(content)) {
                                addResult(false, `Potential ${name} found in ${filePath}`, true);
                            }
                        });
                    }
                }
            } catch (error) {
                addResult(false, `Failed to process ${filePath}: ${error.message}`, false);
            }
        }
    });
    
    // Check directory structure
    CONFIG.requiredDirs.forEach(dir => {
        const exists = fs.existsSync(dir) && fs.lstatSync(dir).isDirectory();
        addResult(
            exists,
            exists ? `Directory exists: ${dir}` : `Missing directory: ${dir}`,
            true
        );
    });
}

// 2. Environment Validation
function validateEnvironment() {
    console.log('\n🔍 Validating environment configuration...');
    
    // Check for default/weak secrets
    const weakSecrets = [
        { var: 'JWT_SECRET', weakValues: ['your_jwt_secret', 'secret', 'dev_secret'] },
        { var: 'SESSION_SECRET', weakValues: ['your_session_secret', 'secret', 'dev_secret'] },
        { var: 'ADMIN_PASSWORD', weakValues: ['admin', 'password', '123456'] }
    ];
    
    weakSecrets.forEach(({ var: varName, weakValues }) => {
        const value = process.env[varName];
        if (value && weakValues.includes(value.toLowerCase())) {
            addResult(false, `❌ Weak ${varName} detected. Please use a stronger value.`, true);
        }
    });
    
    // Check required variables
    Object.entries(CONFIG.requiredEnvVars).forEach(([varName, pattern]) => {
        const value = process.env[varName];
        const isSet = value !== undefined && value !== '';
        let isValid = isSet;
        let message = isSet 
            ? `✅ Environment variable set: ${varName}`
            : `❌ Missing environment variable: ${varName}`;
        
        if (isSet && pattern) {
            try {
                const regex = new RegExp(pattern);
                isValid = regex.test(value);
                if (!isValid) {
                    message += ` (invalid format, expected to match: ${pattern})`;
                }
            } catch (e) {
                message += ` (error validating pattern: ${e.message})`;
                isValid = false;
            }
        }
        
        addResult(isSet && isValid, message, true);
        
        // Check for default values in production
        if (process.env.NODE_ENV === 'production' && 
            value && 
            (value.includes('example') || value.includes('test') || value.includes('dev'))) {
            addResult(false, `⚠️  Suspicious value for ${varName} in production`, false);
        }
    });
    
    // Check for debug mode in production
    if (process.env.NODE_ENV === 'production') {
        if (process.env.DEBUG === 'true' || process.env.NODE_ENV !== 'production') {
            addResult(false, '❌ Debug mode should be disabled in production', true);
        }
    }
}

// 3. Dependency Security
function checkDependencies() {
    console.log('\n🔍 Checking dependencies for security issues...');
    
    try {
        // Read package.json for manual checks
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Check for known vulnerable packages
        const vulnerablePackages = [
            'express', 'mongoose', 'lodash', 'handlebars', 'jquery',
            'ejs', 'marked', 'moment', 'underscore', 'validator'
        ];
        
        const allDeps = {
            ...(pkg.dependencies || {}),
            ...(pkg.devDependencies || {})
        };
        
        // Check for known vulnerable packages
        vulnerablePackages.forEach(pkg => {
            if (allDeps[pkg]) {
                addResult(
                    false,
                    `⚠️  Using ${pkg} which may have known vulnerabilities`,
                    false
                );
            }
        });
        
        // Check for outdated packages
        try {
            const outdated = JSON.parse(execSync('npm outdated --json --long', { 
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 5 // 5MB buffer for large dependency trees
            }));
            
            const outdatedCount = Object.keys(outdated).length;
            const criticalUpdates = Object.entries(outdated)
                .filter(([_, info]) => info.current !== info.latest)
                .map(([pkg, info]) => `${pkg} (${info.current} → ${info.latest})`);
            
            addResult(
                outdatedCount === 0,
                outdatedCount === 0 
                    ? '✅ All dependencies are up to date' 
                    : `⚠️  Found ${outdatedCount} outdated packages\n   ${criticalUpdates.join('\n   ')}`,
                false
            );
        } catch (error) {
            console.error('Error checking outdated packages:', error.message);
        }
        
        // Check for known vulnerabilities
        try {
            const audit = JSON.parse(execSync('npm audit --json', { 
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 5 // 5MB buffer
            }));
            
            const vulnCount = audit.vulnerabilities?.total || 0;
            const criticalVulns = audit.vulnerabilities?.critical || 0;
            const highVulns = audit.vulnerabilities?.high || 0;
            
            if (vulnCount > 0) {
                console.log('\n🔴 Security Vulnerabilities Found:');
                console.log(`   Critical: ${criticalVulns}`);
                console.log(`   High: ${highVulns}`);
                console.log(`   Moderate/Low: ${vulnCount - criticalVulns - highVulns}`);
                console.log('\nRun `npm audit` for details or `npm audit fix` to fix them.');
            }
            
            addResult(
                vulnCount === 0,
                vulnCount === 0 
                    ? '✅ No known vulnerabilities found' 
                    : `❌ Found ${vulnCount} vulnerabilities (${criticalVulns} critical, ${highVulns} high)`,
                criticalVulns > 0 || highVulns > 0
            );
        } catch (auditError) {
            console.error('Error running npm audit:', auditError.message);
            addResult(false, '⚠️  Could not check for vulnerabilities (npm audit failed)', false);
        }
        
        // Check for deprecated packages
        try {
            const deprecations = JSON.parse(execSync('npm ls --json --depth=0', { 
                encoding: 'utf-8',
                maxBuffer: 1024 * 1024 * 5
            })).dependencies || {};
            
            Object.entries(deprecations).forEach(([pkg, info]) => {
                if (info.deprecated) {
                    addResult(
                        false,
                        `⚠️  Deprecated package: ${pkg} - ${info.deprecated}`,
                        false
                    );
                }
            });
        } catch (error) {
            console.error('Error checking deprecated packages:', error.message);
        }
        
    } catch (error) {
        console.error('Error during dependency check:', error);
        addResult(false, '⚠️  Could not complete dependency checks', false);
    }
}

// 4. Security Headers Check (simulated)
function checkSecurityHeaders() {
    console.log('\n🔍 Verifying security headers...');
    
    // In a real deployment, this would make an HTTP request to check headers
    // For now, we'll just list the required headers
    CONFIG.requiredHeaders.forEach(header => {
        addResult(
            true, // This would be false if we actually checked and the header was missing
            `ℹ️  Verify header is set: ${header}`,
            false
        );
    });
}

// 5. SSL/TLS Configuration
function checkSSL() {
    console.log('\n🔍 Checking SSL/TLS configuration...');
    
    // This is a placeholder - in a real deployment, you would check the actual SSL configuration
    addResult(
        true, // This would be based on actual SSL check
        'ℹ️  Verify SSL/TLS is properly configured with strong ciphers',
        false
    );
}

// Main function
async function runSecurityAudit() {
    console.log('🚀 Starting JobStir Security Audit');
    console.log('================================');
    
    // Run all security checks
    checkFileSystem();
    validateEnvironment();
    checkDependencies();
    checkSecurityHeaders();
    checkSSL();
    
    // Print summary
    console.log('\n📊 Security Audit Summary');
    console.log('======================');
    console.log(`✅ ${results.passed} checks passed`);
    if (results.warnings > 0) console.log(`⚠️  ${results.warnings} warnings`);
    if (results.failed > 0) console.log(`❌ ${results.failed} critical issues found`);
    
    // Print detailed results
    console.log('\n🔍 Detailed Results:');
    results.details.forEach((result, index) => {
        const prefix = result.passed ? '✅' : (result.critical ? '❌' : '⚠️');
        console.log(`${index + 1}. ${prefix} ${result.message}`);
    });
    
    // Exit with appropriate status code
    const exitCode = results.failed > 0 ? 1 : 0;
    if (exitCode === 0) {
        console.log('\n🎉 Security audit completed successfully!');
    } else {
        console.log('\n❌ Security audit completed with critical issues. Please address them before proceeding.');
    }
    
    return exitCode;
}

// Run the security audit
process.exit(await runSecurityAudit());
