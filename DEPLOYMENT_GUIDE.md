# JobStir Production Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying JobStir to a production environment. The application has been enhanced with modern features including Bootstrap 5, stars animation system, and production-ready optimizations.

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer, CentOS 8+, or Windows Server 2019+
- **Web Server**: Nginx 1.18+ or Apache 2.4+ 
- **Node.js**: Version 18+ (for build tools and server-side features)
- **Database**: PostgreSQL 13+ (via Supabase)
- **SSL Certificate**: Let's Encrypt or commercial SSL certificate
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 20GB available space
- **CDN**: Cloudflare or AWS CloudFront (recommended)

### Domain and DNS
- Registered domain name (e.g., jobstir.com)
- DNS configuration access
- SSL certificate for HTTPS

## Pre-Deployment Checklist

### 1. Environment Variables
Create a `.env` file in the root directory:

```bash
# Database Configuration (Supabase)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@jobstir.com
SMTP_PASS=your-email-password

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Security
JWT_SECRET=your-super-secure-jwt-secret-here
SESSION_SECRET=your-session-secret-here

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=/var/www/jobstir/uploads

# Production Settings
NODE_ENV=production
DEBUG=false
PORT=3000
```

### 2. File Structure Verification
Ensure the following structure exists:

```
JobStir/
├── html/
│   ├── assets/
│   │   ├── css/
│   │   │   └── stars-animation.css
│   │   └── js/
│   │       └── stars-animation.js
│   ├── index.html
│   ├── signup.html
│   ├── signin.html
│   ├── job_listings.html
│   ├── admin_panel.html
│   ├── hr_dashboard.html
│   ├── candidate_portal.html
│   ├── profile.html
│   ├── contact.html
│   ├── evaluate_resume.html
│   ├── forgot-password.html
│   ├── 404.html
│   ├── 405.html
│   └── 500.html
├── css/
├── js/
├── backend/
├── production-config.js
├── security-config.js
├── optimization-utilities.js
└── meta-tags-template.html
```

## Deployment Steps

### Step 1: Server Setup

#### For Ubuntu/Debian:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### For CentOS/RHEL:
```bash
# Update system packages
sudo yum update -y

# Install Nginx
sudo yum install nginx -y

# Install Node.js
sudo yum install nodejs npm -y

# Install PM2
sudo npm install -g pm2

# Install Certbot
sudo yum install certbot python3-certbot-nginx -y
```

### Step 2: File Upload and Permissions

```bash
# Create application directory
sudo mkdir -p /var/www/jobstir
sudo chown -R $USER:$USER /var/www/jobstir

# Upload files via SCP, FTP, or Git
# Example using rsync:
rsync -avz --progress ./JobStir/ user@your-server:/var/www/jobstir/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/jobstir
sudo chmod -R 755 /var/www/jobstir
sudo chmod -R 777 /var/www/jobstir/uploads
```

### Step 3: Nginx Configuration

Create Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/jobstir
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name jobstir.com www.jobstir.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jobstir.com www.jobstir.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/jobstir.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jobstir.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co;" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Document root
    root /var/www/jobstir/html;
    index index.html index.htm;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main location block
    location / {
        try_files $uri $uri/ @fallback;
    }
    
    # Fallback for SPA routing
    location @fallback {
        rewrite ^.*$ /index.html last;
    }
    
    # API proxy (if using Node.js backend)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # File upload size limit
    client_max_body_size 5M;
    
    # Custom error pages
    error_page 404 /404.html;
    error_page 405 /405.html;
    error_page 500 502 503 504 /500.html;
    
    # Security: Hide server tokens
    server_tokens off;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/jobstir /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d jobstir.com -d www.jobstir.com

# Auto-renewal cron job
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 5: Backend Service Setup (if applicable)

Create PM2 ecosystem file:

```bash
nano /var/www/jobstir/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'jobstir-api',
    script: './backend/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/jobstir-error.log',
    out_file: '/var/log/pm2/jobstir-out.log',
    log_file: '/var/log/pm2/jobstir.log',
    time: true
  }]
};
```

Start the application:
```bash
cd /var/www/jobstir
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 6: Database Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. Set up your database schema using the SQL files in the `sql/` directory
3. Configure Row Level Security (RLS) policies
4. Update environment variables with your Supabase credentials

## Security Hardening

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban for additional security
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Additional Security Measures

1. **Regular Updates**: Set up automatic security updates
2. **Backup Strategy**: Configure daily database backups
3. **Monitoring**: Set up server monitoring (e.g., New Relic, DataDog)
4. **Log Rotation**: Configure logrotate for application logs
5. **Intrusion Detection**: Consider installing AIDE or similar

## Performance Optimization

### 1. CDN Setup
- Configure Cloudflare or AWS CloudFront
- Enable caching for static assets
- Set up minification and compression

### 2. Database Optimization
- Enable connection pooling
- Set up read replicas if needed
- Optimize query performance

### 3. Monitoring Setup
```bash
# Install monitoring tools
npm install -g @google-cloud/profiler
npm install -g newrelic
```

## Testing Production Deployment

### 1. Functional Testing
```bash
# Test all major functionalities
curl -I https://jobstir.com
curl -I https://jobstir.com/signup.html
curl -I https://jobstir.com/job_listings.html
```

### 2. Performance Testing
- Use tools like GTmetrix, PageSpeed Insights, and Lighthouse
- Test mobile responsiveness
- Verify all animations and interactive features work

### 3. Security Testing
- Run SSL Labs test
- Verify CSP headers are working
- Test rate limiting
- Verify file upload restrictions

## Maintenance and Updates

### Regular Tasks
1. **Weekly**: Review server logs and performance metrics
2. **Monthly**: Update system packages and dependencies
3. **Quarterly**: Review and update security configurations
4. **As needed**: Deploy application updates

### Update Process
```bash
# Pull latest changes
cd /var/www/jobstir
git pull origin main

# Restart services if needed
sudo systemctl reload nginx
pm2 reload all

# Clear cache if applicable
sudo systemctl restart nginx
```

### Backup Strategy
```bash
# Database backup (automated via Supabase)
# File backup
tar -czf /backup/jobstir-$(date +%Y%m%d).tar.gz /var/www/jobstir

# Log backup
rsync -av /var/log/nginx/ /backup/logs/
```

## Troubleshooting

### Common Issues

1. **404 Errors**: Check Nginx configuration and file permissions
2. **SSL Issues**: Verify certificate installation and renewal
3. **Performance Issues**: Check server resources and enable caching
4. **Database Connection**: Verify Supabase credentials and network connectivity

### Log Locations
- Nginx: `/var/log/nginx/`
- PM2: `/var/log/pm2/`
- System: `/var/log/syslog`

### Health Check Endpoint
Create a simple health check:
```javascript
// health.js
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
    });
});
```

## Support and Maintenance

For ongoing support and maintenance:
1. Monitor server metrics and logs regularly
2. Keep all software components updated
3. Review security configurations quarterly
4. Maintain regular backup schedules
5. Test disaster recovery procedures

## Contact Information

For technical support or deployment assistance:
- Email: devops@jobstir.com
- Documentation: https://docs.jobstir.com
- Emergency: Create issue at GitHub repository

---

This deployment guide ensures a secure, scalable, and performant production environment for JobStir. Follow all steps carefully and test thoroughly before going live.
