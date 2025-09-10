// JobStir Express Server for Railway Deployment
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

// Slow down repeated requests
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 50
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);
app.use(speedLimiter);

// Enhanced Security Headers Middleware
app.use((req, res, next) => {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Security middleware with enhanced CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'strict-dynamic'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com",
                "https://www.google-analytics.com",
                "https://www.googletagmanager.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for some libraries
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "blob:",
                "https://*.supabase.co"
            ],
            connectSrc: [
                "'self'",
                "https://*.supabase.co",
                "https://www.google-analytics.com"
            ],
            frameSrc: [
                "'self'"
            ],
            formAction: [
                "'self'"
            ],
            frameAncestors: [
                "'none'"
            ],
            objectSrc: [
                "'none'"
            ],
            baseUri: [
                "'self'"
            ],
            upgradeInsecureRequests: []
            ]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// Specific rate limiting for forms
const formLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 form submissions per windowMs
    message: 'Too many form submissions, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from html directory
app.use(express.static(path.join(__dirname, 'html'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache');
        }
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.set('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

// Serve other static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('./package.json').version,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Contact form endpoint
app.post('/api/contact', formLimiter, (req, res) => {
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Name, email, and message are required'
        });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email address'
        });
    }

    // Here you would integrate with your email service
    // For now, we'll just log and return success
    console.log('Contact form submission:', { name, email, subject, message });

    res.json({
        success: true,
        message: 'Thank you for your message. We\'ll get back to you soon!'
    });
});

// File upload endpoint for resume evaluation
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
        }
    }
});

app.post('/api/upload-resume', formLimiter, upload.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    // Here you would process the resume with AI
    // For now, we'll return a mock response
    res.json({
        success: true,
        message: 'Resume uploaded successfully',
        analysis: {
            score: Math.floor(Math.random() * 40) + 60, // Random score between 60-100
            suggestions: [
                'Add more specific technical skills',
                'Include quantifiable achievements',
                'Improve formatting consistency'
            ]
        }
    });
});

// Route handlers for HTML pages
const routes = [
    '/',
    '/index.html',
    '/signup.html',
    '/signin.html',
    '/job_listings.html',
    '/admin_panel.html',
    '/hr_dashboard.html',
    '/candidate_portal.html',
    '/profile.html',
    '/contact.html',
    '/evaluate_resume.html',
    '/forgot-password.html',
    '/about.html',
    '/privacy-policy.html',
    '/terms-of-service.html'
];

routes.forEach(route => {
    app.get(route, (req, res) => {
        let filePath;
        if (route === '/') {
            filePath = path.join(__dirname, 'html', 'index.html');
        } else {
            filePath = path.join(__dirname, 'html', route);
        }

        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).sendFile(path.join(__dirname, 'html', '404.html'));
        }
    });
});

// Error handling for 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'html', '404.html'));
});

// Error handling for 405
app.use((req, res) => {
    res.status(405).sendFile(path.join(__dirname, 'html', '405.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.'
        });
    }

    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    res.status(500).sendFile(path.join(__dirname, 'html', '500.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 JobStir server running on port ${PORT}`);
    console.log(`🌟 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Access at: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
