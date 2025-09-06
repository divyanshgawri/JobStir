# 🚀 JobStir Railway Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying JobStir to Railway, a modern cloud platform that offers seamless deployment for web applications.

## Prerequisites

### 🔑 Required Accounts
- [Railway Account](https://railway.app) (free tier available)
- [Supabase Account](https://supabase.com) (for database)
- [GitHub Account](https://github.com) (for repository hosting)

### 🛠️ Required Tools
- Git
- Node.js 18+ (for local development)
- Code editor (VS Code recommended)

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Create a GitHub Repository**
   ```bash
   # Initialize git if not already done
   git init
   
   # Add all files
   git add .
   
   # Commit changes
   git commit -m "Initial commit: JobStir ready for Railway deployment"
   
   # Add remote repository (replace with your GitHub repo URL)
   git remote add origin https://github.com/your-username/jobstir.git
   
   # Push to GitHub
   git push -u origin main
   ```

2. **Verify File Structure**
   Ensure your project has the following Railway-compatible structure:
   ```
   JobStir/
   ├── package.json          # ✅ Created
   ├── server.js            # ✅ Created
   ├── Procfile            # ✅ Created
   ├── railway.toml        # ✅ Created
   ├── railway-env-template.txt  # ✅ Created
   ├── html/               # All your HTML files
   │   ├── assets/
   │   │   ├── css/
   │   │   │   └── stars-animation.css
   │   │   └── js/
   │   │       └── stars-animation.js
   │   ├── index.html
   │   ├── signup.html
   │   ├── signin.html
   │   └── ... (all other HTML files)
   ├── css/               # Original CSS files
   ├── js/                # Original JS files
   └── README.md
   ```

### Step 2: Set Up Supabase Database

1. **Create Supabase Project**
   - Go to [Supabase](https://supabase.com)
   - Click "New Project"
   - Choose organization and enter project details
   - Select a region (choose closest to your users)
   - Wait for project to be created

2. **Get Database Credentials**
   - Go to Settings → API
   - Copy these values:
     - `Project URL` (SUPABASE_URL)
     - `anon public` key (SUPABASE_ANON_KEY)
     - `service_role` key (SUPABASE_SERVICE_ROLE_KEY)

3. **Set Up Database Schema** (Optional)
   - Go to SQL Editor in Supabase
   - Run your database migration scripts if you have any
   - Set up Row Level Security (RLS) policies as needed

### Step 3: Deploy to Railway

#### Method 1: Deploy from GitHub (Recommended)

1. **Connect Railway to GitHub**
   - Go to [Railway](https://railway.app)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your JobStir repository

2. **Configure Deployment Settings**
   - Railway will automatically detect your Node.js project
   - It will read your `package.json` and `railway.toml`
   - No additional configuration needed for basic setup

#### Method 2: Deploy via Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Deploy**
   ```bash
   # Login to Railway
   railway login
   
   # Initialize Railway project in your directory
   railway init
   
   # Deploy
   railway up
   ```

### Step 4: Configure Environment Variables

1. **Access Railway Dashboard**
   - Go to your Railway dashboard
   - Select your JobStir project
   - Click on "Variables" tab

2. **Add Required Environment Variables**
   Copy from `railway-env-template.txt` and add these variables:

   **Essential Variables:**
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
   SESSION_SECRET=your-session-secret-minimum-32-characters
   ```

   **Optional Variables:**
   ```
   GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=noreply@jobstir.com
   SMTP_PASS=your-email-password
   MAX_FILE_SIZE=5242880
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   FORM_RATE_LIMIT_MAX=5
   ```

3. **Generate Secure Secrets**
   ```bash
   # Generate JWT_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate SESSION_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 5: Configure Custom Domain (Optional)

1. **Get Railway Domain**
   - Railway provides a free `.up.railway.app` domain
   - Your app will be accessible at: `https://your-app-name.up.railway.app`

2. **Add Custom Domain** (Pro Plan Required)
   - Go to Settings → Domains
   - Click "Add Domain"
   - Enter your custom domain
   - Update your DNS settings as instructed

### Step 6: Verify Deployment

1. **Check Deployment Status**
   - Monitor the deployment logs in Railway dashboard
   - Wait for "Build completed" and "Deployment live" messages

2. **Test Application**
   - Visit your Railway app URL
   - Test key functionalities:
     - ✅ Home page loads with stars animation
     - ✅ All navigation links work
     - ✅ Forms submit properly
     - ✅ File upload works (resume evaluation)
     - ✅ Error pages display correctly
     - ✅ Mobile responsiveness

3. **Check API Endpoints**
   ```bash
   # Health check
   curl https://your-app-name.up.railway.app/api/health
   
   # Should return:
   {
     "status": "healthy",
     "timestamp": "2025-09-06T17:55:14Z",
     "version": "1.0.0",
     "environment": "production"
   }
   ```

### Step 7: Configure Monitoring & Alerts

1. **Railway Monitoring**
   - Railway provides built-in monitoring
   - Check Metrics tab for:
     - CPU usage
     - Memory usage
     - Request volume
     - Response times

2. **Set Up Alerts** (Pro Plan)
   - Configure alerts for high CPU/memory usage
   - Set up alerts for deployment failures
   - Monitor response time thresholds

## Railway-Specific Features

### 🔄 Automatic Deployments
- Railway automatically deploys when you push to your main branch
- No manual intervention required
- Rollback to previous deployments easily

### 📊 Built-in Analytics
- Request metrics and performance monitoring
- CPU and memory usage graphs
- Error tracking and logging

### 🛡️ Security Features
- HTTPS enabled by default
- Environment variable encryption
- Private networking between services

### 💰 Pricing
- **Hobby Plan**: $5/month per user + resource usage
- **Pro Plan**: $20/month per user + resource usage
- Free trial available

## Troubleshooting

### Common Issues and Solutions

1. **Deployment Fails - Missing Dependencies**
   ```bash
   # Ensure all dependencies are in package.json
   npm install --save express helmet compression cors
   ```

2. **Environment Variables Not Working**
   - Double-check variable names match exactly
   - Ensure no extra spaces in values
   - Redeploy after adding variables

3. **Static Files Not Serving**
   - Verify file paths in server.js
   - Check case sensitivity of file names
   - Ensure HTML directory structure is correct

4. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check Supabase project is active
   - Test connection from Railway logs

5. **Stars Animation Not Working**
   - Check browser console for JavaScript errors
   - Verify asset paths are correct
   - Ensure CDN resources are loading

### Debugging Commands

```bash
# View Railway logs
railway logs

# Connect to Railway project
railway connect

# Check environment variables
railway variables

# Open Railway dashboard
railway open
```

## Performance Optimization for Railway

### 1. Enable Compression
```javascript
// Already configured in server.js
app.use(compression());
```

### 2. Set Proper Caching Headers
```javascript
// Already configured in server.js for static files
app.use(express.static(path.join(__dirname, 'html'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));
```

### 3. Optimize Images
- Use WebP format with fallbacks
- Implement lazy loading (already included)
- Consider using Railway's storage for large assets

### 4. Database Optimization
- Use connection pooling (Supabase handles this)
- Implement proper indexing
- Use read replicas for high traffic

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to repository
- Use strong, unique secrets for JWT and session
- Rotate secrets regularly

### 2. Content Security Policy
```javascript
// Already implemented in server.js
app.use(helmet({
    contentSecurityPolicy: {
        // ... configured directives
    }
}));
```

### 3. Rate Limiting
```javascript
// Already implemented in server.js
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
```

### 4. File Upload Security
```javascript
// Already implemented in server.js
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: // ... validation logic
});
```

## Maintenance and Updates

### Regular Tasks

1. **Weekly**
   - Monitor Railway dashboard for performance metrics
   - Check error logs for any issues
   - Review security alerts

2. **Monthly**
   - Update dependencies: `npm update`
   - Review and rotate secrets if needed
   - Check Supabase usage and optimize queries

3. **Quarterly**
   - Review Railway usage and costs
   - Optimize performance based on metrics
   - Update security configurations

### Updating Your Application

1. **Make Changes Locally**
   ```bash
   # Make your changes
   git add .
   git commit -m "Update: describe your changes"
   ```

2. **Deploy Updates**
   ```bash
   # Push to GitHub (triggers automatic Railway deployment)
   git push origin main
   ```

3. **Monitor Deployment**
   - Watch Railway dashboard for deployment progress
   - Test updated functionality
   - Rollback if issues occur

## Support and Resources

### Railway Resources
- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord Community](https://discord.gg/railway)
- [Railway Status Page](https://status.railway.app/)

### JobStir Support
- **Technical Issues**: Create GitHub issue
- **Railway-Specific Questions**: Railway Discord #help
- **Database Issues**: Supabase support

## Cost Estimation

### Railway Pricing Breakdown
- **Starter Usage**: ~$5-10/month
- **Medium Traffic**: ~$15-25/month  
- **High Traffic**: ~$50-100/month

### Factors Affecting Cost
- CPU usage (processing time)
- Memory usage (RAM consumption)
- Network egress (data transfer)
- Storage usage (file uploads)

---

## 🎉 Deployment Checklist

Before going live, ensure:

- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] File uploads work
- [ ] Stars animations display properly
- [ ] Mobile responsiveness verified
- [ ] Security headers active
- [ ] Health check endpoint responding
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

---

**🚀 Your JobStir application is now live on Railway!**

Access your application at: `https://your-app-name.up.railway.app`

Railway provides excellent performance, security, and scalability for your JobStir platform. The automatic deployments and built-in monitoring make it perfect for both development and production use.
