# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

JobStir is a comprehensive job search and resume evaluation platform with AI-powered features. The application consists of:

- **Frontend**: Static HTML/CSS/JavaScript application with modular architecture
- **Backend**: Flask-based Python API with AI/ML capabilities using Groq LLM and LangChain
- **Database**: Optional Supabase integration with localStorage fallback
- **AI Features**: Resume parsing, job matching, and semantic analysis

## Development Commands

### Backend Setup and Operations

```bash
# Navigate to backend directory
cd backend

# Setup environment
cp .env.example .env
# Edit .env to add your GROQ_API_KEY

# Install dependencies
pip install -r requirements.txt

# Run backend server
python resume_evaluator_api.py

# Health check
curl http://localhost:5000/api/health
```

### Frontend Development

```bash
# Serve frontend (from project root)
python -m http.server 8000

# Or use any static file server
# Frontend files are in /html directory
```

### Testing API Endpoints

```bash
# Test resume evaluation
curl -X POST http://localhost:5000/api/evaluate-resume \
  -H "Content-Type: application/json" \
  -d '{"resume_text":"Software Engineer with 5 years experience","job_description":"Looking for experienced developer"}'

# Get job listings
curl "http://localhost:5000/api/jobs?search=python&location=remote"

# Apply to job
curl -X POST http://localhost:5000/api/jobs/1/apply \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","resume_text":"Resume content...","cover_letter":"Cover letter..."}'
```

## Architecture Overview

### Backend Architecture (Flask API)

**Core Components:**
- `resume_evaluator_api.py`: Main Flask application with all API endpoints
- **AI Pipeline**: LangChain + Groq LLM for resume parsing and analysis
- **Models**: Pydantic models for structured data (Education, ExperienceItem, ProjectItem, ResumeInfo)
- **Endpoints**: RESTful API with comprehensive job management and resume evaluation

**Key AI Features:**
- Resume text extraction and structuring using LLM chains
- Semantic job matching with SentenceTransformer embeddings
- Detailed resume scoring against job descriptions
- Job recommendation system based on resume content

**Database Strategy:**
- Primary: Supabase (PostgreSQL) for production
- Fallback: In-memory sample data for development/demo
- No local database dependencies required

### Frontend Architecture

**Modular JavaScript Design:**
- `job-api-integration.js`: Central API client with retry logic, caching, and error handling
- `supabase-integration.js`: Database operations with localStorage fallbacks
- `config.js`: Environment-specific configuration management
- Page-specific modules for each HTML page

**Key Frontend Features:**
- **Robust Error Handling**: Data sanitization prevents undefined property errors
- **Caching System**: 5-minute cache with user isolation for better performance  
- **Retry Logic**: Exponential backoff for failed API requests
- **Fallback Data**: Graceful degradation when backend is unavailable
- **Session Management**: Token-based authentication with automatic renewal

**Data Flow Pattern:**
1. API calls go through `JobAPIIntegration` class
2. Data is cached and sanitized before reaching UI components
3. Supabase operations have localStorage fallbacks
4. All job objects are validated to prevent runtime errors

## Environment Configuration

### Required Environment Variables

**Backend (.env):**
```env
GROQ_API_KEY=your_groq_api_key  # Required for AI features
FLASK_ENV=development
PORT=5000
SECRET_KEY=your_secret_key
ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com
```

**Frontend Configuration (js/config.js):**
- API endpoints auto-detect localhost vs production
- Supabase configuration (optional)
- Feature flags for enabling/disabling functionality

### External Service Dependencies

**Required:**
- **Groq API**: For LLM-powered resume analysis and job matching
  - Models used: `llama3-70b-8192` for analysis, `all-MiniLM-L6-v2` for embeddings

**Optional:**
- **Supabase**: For user management and data persistence
  - Falls back to localStorage if not configured
  - Full database schema available in supabase integration files

## Common Development Patterns

### Adding New API Endpoints

1. Add route in `resume_evaluator_api.py`
2. Update `job-api-integration.js` with new method
3. Handle errors and implement fallbacks
4. Add endpoint to main index route documentation

### Frontend Data Handling

**Always use the sanitized data pattern:**
```javascript
// Bad - can cause undefined errors
const title = job.title;

// Good - data is pre-sanitized by JobAPIIntegration
const data = await jobAPI.getJobs(filters);
const title = data.jobs[0].title; // Guaranteed to exist
```

### AI Feature Integration

**Resume Analysis Pipeline:**
1. Extract structured data with `extract_resume_info_llm()`
2. Score against job description with `get_resume_score_with_breakdown()`
3. Find similar jobs with `find_similar_jobs()`
4. Combine results with detailed reasoning

## File Structure Significance

### Critical Files

- `backend/resume_evaluator_api.py`: Complete backend implementation
- `js/job-api-integration.js`: Frontend API client and error handling
- `js/supabase-integration.js`: Database operations with fallbacks
- `js/config.js`: Environment configuration
- `DEPLOYMENT.md`: Comprehensive deployment and setup guide

### Generated/Demo Data

The backend includes sample job data for development. In production:
- Replace sample jobs with database queries
- Implement proper user authentication
- Add rate limiting and monitoring

## Error Handling Strategy

**Backend:**
- Structured exceptions (ResumeExtractionError)
- Retry logic for rate-limited AI API calls
- Comprehensive logging with context

**Frontend:**
- Data sanitization prevents undefined errors
- Automatic API retry with exponential backoff
- Toast notifications for user feedback
- Graceful fallback to demo data when backend unavailable

## Testing Approaches

### Backend Testing
```bash
# Test individual endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/jobs

# Test with malformed data to verify error handling
curl -X POST http://localhost:5000/api/evaluate-resume -H "Content-Type: application/json" -d '{}'
```

### Frontend Testing
- Open browser developer tools
- Verify no console errors
- Test with backend stopped (should show fallback data)
- Test slow network conditions
- Verify responsive design on mobile

## Development Workflows

### Full Stack Development

1. Start backend: `cd backend && python resume_evaluator_api.py`
2. Start frontend server: `python -m http.server 8000`
3. Open `http://localhost:8000/html/index.html`
4. Backend API available at `http://localhost:5000`

### AI Feature Development

When modifying AI features, understand the chain:
- **Input**: Raw resume text + job description
- **Processing**: LangChain prompt templates + Groq LLM
- **Output**: Structured JSON with scoring and recommendations
- **Error Handling**: Graceful degradation with fallback responses

### Database Development

The app works in three modes:
1. **Full Supabase**: Complete features with real-time data
2. **LocalStorage**: Basic functionality for development
3. **Demo Mode**: Sample data when no backend connection

Choose mode based on development needs and configure accordingly.
