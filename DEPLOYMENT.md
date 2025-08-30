# JobStir Deployment Guide

## Overview

JobStir is a comprehensive job search and resume evaluation platform with:
- **Enhanced Backend API** with job listings, applications, and AI-powered resume analysis
- **Frontend Integration** with robust error handling and caching
- **Database Integration** via Supabase for user management and data persistence
- **AI Features** powered by Groq LLM for resume evaluation and job matching

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js (for development tools, optional)
- Groq API key
- Supabase account (optional, for full features)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Configure your API keys in `.env`:**
   ```env
   # Required: Get your Groq API key from: https://console.groq.com/
   GROQ_API_KEY=your_actual_groq_api_key_here
   
   # Optional: Generate a secure secret key for sessions
   SECRET_KEY=your_secure_secret_key_here
   
   # Optional: Set your allowed origins for CORS
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
   
   # Optional: Set environment and port
   FLASK_ENV=development
   PORT=5000
   ```

4. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the backend server:**
   ```bash
   python resume_evaluator_api.py
   ```

   The API will be available at `http://localhost:5000`

### Frontend Setup

1. **Open the frontend:**
   - Simply open `html/index.html` in your browser, or
   - Use a local server: `python -m http.server 8000` from the root directory

2. **Configure API endpoints (if needed):**
   - The frontend automatically detects localhost and uses `http://localhost:5000`
   - For production, update `js/job-api-integration.js` with your API domain

### Frontend Configuration

1. **Configure Supabase in `js/config.js`:**
   ```javascript
   SUPABASE: {
       URL: 'https://your-project-id.supabase.co',
       ANON_KEY: 'your-supabase-anon-key-here'
   }
   ```

2. **Update API base URL for production in `js/job-api-integration.js`:**
   ```javascript
   getBaseURL() {
       if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
           return 'http://localhost:5000';
       }
       return 'https://your-production-api-domain.com'; // Update this
   }
   ```

## Enhanced API Endpoints

The JobStir backend now includes comprehensive API endpoints:

### Core Endpoints
- `GET /` - API information and available endpoints
- `GET /api/health` - Health check endpoint
- `POST /api/evaluate-resume` - AI-powered resume evaluation

### Job Management Endpoints
- `GET /api/jobs` - Get all jobs with filtering support
  - Query parameters: `search`, `location`, `type`, `remote`, `experience`
- `GET /api/jobs/<job_id>` - Get detailed job information
- `POST /api/jobs/<job_id>/apply` - Submit job application
- `GET /api/applications?user_id=<id>` - Get user's applications

### Example API Usage

**Get Jobs with Filters:**
```bash
curl "http://localhost:5000/api/jobs?search=python&location=remote&type=full-time"
```

**Evaluate Resume:**
```bash
curl -X POST http://localhost:5000/api/evaluate-resume \
  -H "Content-Type: application/json" \
  -d '{
    "resume_text": "Your resume content here...",
    "job_description": "Job description here..."
  }'
```

**Apply to Job:**
```bash
curl -X POST http://localhost:5000/api/jobs/1/apply \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "resume_text": "Resume content...",
    "cover_letter": "Cover letter..."
  }'
```

### Security Checklist

- [ ] **Never commit `.env` files** - They are in `.gitignore`
- [ ] **Use environment variables** for all sensitive data
- [ ] **Generate strong secret keys** for production
- [ ] **Configure CORS** properly for your domain
- [ ] **Use HTTPS** in production
- [ ] **Validate all user inputs** on both frontend and backend
- [ ] **Implement rate limiting** for API endpoints
- [ ] **Set up proper error handling** without exposing sensitive info

### Database Setup (Supabase)

1. **Create a new Supabase project** at https://supabase.com
2. **Run the SQL schema** from `sql/supabase-simple-schema.sql`
3. **Configure Row Level Security (RLS)** policies
4. **Set up authentication** providers as needed
5. **Get your project URL and anon key** from Settings > API

### Production Deployment

#### Backend (Flask API)
- Use a production WSGI server like Gunicorn
- Set up reverse proxy with Nginx
- Configure SSL certificates
- Set up monitoring and logging
- Use environment variables for all configuration

#### Frontend
- Serve static files through a CDN or web server
- Minify and compress assets
- Configure proper caching headers
- Set up error monitoring (e.g., Sentry)

### Environment Variables Reference

#### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key
FLASK_ENV=production
PORT=5000
SECRET_KEY=your_secret_key
ALLOWED_ORIGINS=https://yourdomain.com
LOG_LEVEL=INFO
```

#### Frontend (js/config.js)
```javascript
{
    ENV: 'production',
    API: {
        BASE_URL: 'https://api.yourdomain.com'
    },
    SUPABASE: {
        URL: 'https://your-project.supabase.co',
        ANON_KEY: 'your_anon_key'
    }
}
```

## Frontend Architecture

### Key Components

1. **Job API Integration (`js/job-api-integration.js`)**
   - Handles all API communication with retry logic
   - Implements caching for better performance
   - Provides fallback data when API is unavailable
   - Sanitizes data to prevent undefined property errors

2. **Job Listings (`js/job_listings.js`)**
   - Enhanced with API integration
   - Robust error handling and data validation
   - Graceful fallback to localStorage/demo data
   - Advanced filtering and search capabilities

3. **Resume Evaluator (`js/evaluate-resume.js`)**
   - AI-powered resume analysis
   - Integration with job matching algorithms
   - Enhanced UI with real-time feedback

### Error Handling Features

- **Data Sanitization**: All job objects guaranteed to have required properties
- **API Fallbacks**: Automatic fallback to demo data when API unavailable
- **Retry Logic**: Automatic retry for failed API requests
- **User Feedback**: Toast notifications for errors and success states
- **Caching**: Reduces API calls and improves performance

## Testing

### Backend API Testing

1. **Health Check:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Get Jobs:**
   ```bash
   curl http://localhost:5000/api/jobs
   ```

3. **Test Resume Evaluation:**
   ```bash
   curl -X POST http://localhost:5000/api/evaluate-resume \
     -H "Content-Type: application/json" \
     -d '{"resume_text":"Software Engineer with 5 years experience","job_description":"Looking for experienced developer"}'
   ```

### Frontend Testing

1. **Open Developer Tools** and check for:
   - No console errors
   - Successful API calls in Network tab
   - Proper error handling when API is down

2. **Test Core Features:**
   - Job search and filtering
   - Resume evaluation
   - User authentication (if Supabase configured)
   - Job applications
   - Responsive design on mobile devices

3. **Test Error Scenarios:**
   - Stop backend server and verify graceful fallback
   - Test with invalid API responses
   - Test with slow network conditions

### Troubleshooting

#### Common Issues:

1. **"Cannot read properties of undefined" errors:**
   - These are now fixed with data sanitization in `job-api-integration.js`
   - All job objects are validated and have default values
   - Check browser console for any remaining issues

2. **CORS errors:**
   - Check `ALLOWED_ORIGINS` in backend `.env`
   - Ensure frontend domain is included
   - For localhost testing, use `http://localhost:8000,http://127.0.0.1:8000`

3. **API connection failures:**
   - Verify backend is running on correct port (default: 5000)
   - Check network connectivity
   - Frontend will automatically fallback to demo data

4. **Groq API errors:**
   - Ensure Groq API key is valid and has sufficient credits
   - Check API key format in `.env` file
   - Monitor rate limits and usage

5. **Supabase connection issues:**
   - Verify project URL and anon key in `js/config.js`
   - Check RLS policies are properly configured
   - System works without Supabase (limited features)

6. **File upload issues:**
   - PDF processing requires PDF.js library
   - Check file size limits (10MB default)
   - Verify allowed file types

### Monitoring

- Set up application monitoring (e.g., New Relic, DataDog)
- Configure error tracking (e.g., Sentry)
- Monitor API usage and rate limits
- Set up database performance monitoring
- Configure uptime monitoring

### Backup Strategy

- **Database:** Supabase provides automatic backups
- **Files:** If storing files, set up regular backups
- **Code:** Use version control (Git) with proper branching strategy
- **Configuration:** Document all environment variables and settings
