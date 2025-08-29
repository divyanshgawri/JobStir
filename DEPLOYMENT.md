# JobStir Deployment Guide

## Environment Setup

### Backend Configuration

1. **Copy environment template:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure your API keys in `.env`:**
   ```env
   # Get your Groq API key from: https://console.groq.com/
   GROQ_API_KEY=your_actual_groq_api_key_here
   
   # Generate a secure secret key
   SECRET_KEY=your_secure_secret_key_here
   
   # Set your allowed origins for CORS
   ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the backend:**
   ```bash
   python resume_evaluator_api.py
   ```

### Frontend Configuration

1. **Configure Supabase in `js/config.js`:**
   ```javascript
   SUPABASE: {
       URL: 'https://your-project-id.supabase.co',
       ANON_KEY: 'your-supabase-anon-key-here'
   }
   ```

2. **Update API base URL for production in `js/config.js`:**
   ```javascript
   API: {
       BASE_URL: 'https://your-production-api-domain.com'
   }
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

### Testing

1. **Backend API testing:**
   ```bash
   curl -X POST http://localhost:5000/api/health
   ```

2. **Frontend testing:**
   - Open browser developer tools
   - Check for console errors
   - Test authentication flow
   - Test resume evaluation
   - Test job applications

### Troubleshooting

#### Common Issues:

1. **CORS errors:**
   - Check `ALLOWED_ORIGINS` in backend `.env`
   - Ensure frontend domain is included

2. **Supabase connection issues:**
   - Verify project URL and anon key
   - Check RLS policies are properly configured

3. **API key errors:**
   - Ensure Groq API key is valid and has sufficient credits
   - Check API key format and permissions

4. **File upload issues:**
   - Check file size limits
   - Verify allowed file types
   - Ensure proper error handling

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
