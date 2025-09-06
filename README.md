# 🌟 JobStir - AI-Powered Career Platform

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/your-template-id)

JobStir is a modern, AI-powered career platform featuring interactive stars animations, Bootstrap 5 design, and enterprise-level security. Built with Node.js and optimized for Railway deployment.

## ✨ Features

- 🎨 **Modern UI/UX**: Bootstrap 5 with custom stars animation system
- 🔐 **Enterprise Security**: XSS protection, rate limiting, and secure file uploads
- 📱 **Fully Responsive**: Mobile-first design that works on all devices
- ⚡ **Performance Optimized**: Fast loading times with 60fps animations
- 🚀 **Railway Ready**: One-click deployment to Railway platform
- 🛡️ **Production Ready**: Comprehensive error handling and monitoring

## 🎯 Interactive Features

### Stars Animation System
- **15+ Enhanced Pages** with custom stars animations
- **Interactive Sparkle Effects** on click with themed emojis
- **Responsive Design** that adapts to all screen sizes
- **Performance Optimized** using requestAnimationFrame

### Page-Specific Themes
- **Signup**: Cosmic purple/blue with rocket animations 🚀
- **Job Listings**: Emerald green/teal with briefcase effects 💼
- **Admin Panel**: Professional theme with power symbols ⚡
- **Profile**: Soft gradients with achievement icons 🏆
- **Error Pages**: Themed designs with helpful navigation

## 🚀 Quick Start with Railway

### Method 1: One-Click Deploy
1. Click the "Deploy on Railway" button above
2. Connect your GitHub account
3. Configure environment variables (see below)
4. Deploy automatically!

### Method 2: Manual Deploy
1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/jobstir.git
   cd JobStir
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

## 🔧 Environment Variables

Set these variables in your Railway dashboard:

### Required Variables
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-session-secret
```

### Optional Variables
```
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@jobstir.com
SMTP_PASS=your-email-password
MAX_FILE_SIZE=5242880
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🗄️ Database Setup

1. Create a [Supabase](https://supabase.com) project
2. Get your project URL and API keys from Settings → API
3. Add the credentials to Railway environment variables
4. (Optional) Run your database migrations

## 📁 Project Structure

```
JobStir/
├── server.js              # Express server for Railway
├── package.json           # Dependencies and scripts
├── railway.toml           # Railway configuration
├── Procfile               # Process file
├── html/                  # Frontend files
│   ├── assets/
│   │   ├── css/
│   │   │   └── stars-animation.css
│   │   └── js/
│   │       └── stars-animation.js
│   ├── index.html         # Landing page
│   ├── signup.html        # Registration
│   ├── signin.html        # Login
│   ├── job_listings.html  # Job search
│   ├── admin_panel.html   # Admin dashboard
│   ├── hr_dashboard.html  # HR management
│   ├── candidate_portal.html # Candidate interface
│   ├── profile.html       # User profiles
│   └── ... (more pages)
├── css/                   # Additional stylesheets
├── js/                    # JavaScript modules
└── docs/                  # Documentation
```

## 🛠️ Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp railway-env-template.txt .env
   # Edit .env with your actual values
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   Visit http://localhost:3000

## 🔒 Security Features

- **Content Security Policy (CSP)** headers
- **Rate limiting** for forms and API endpoints
- **File upload security** with type and size validation
- **XSS and SQL injection** protection
- **HTTPS enforcement** with security headers
- **Input sanitization** and validation

## 📊 Performance

- **Core Web Vitals Optimized**
  - First Contentful Paint (FCP): < 1.5s
  - Largest Contentful Paint (LCP): < 2.5s
  - Cumulative Layout Shift (CLS): < 0.1
- **60fps Animations** with GPU acceleration
- **Lazy loading** for images and assets
- **Compression** and caching enabled

## 🎨 Enhanced Pages

| Page | Features | Animations |
|------|----------|------------|
| Index | Hero section, particles | Gradient backgrounds |
| Signup | Glass morphism forms | Cosmic stars + rocket 🚀 |
| Job Listings | Card layouts | Briefcase float 💼 |
| Admin Panel | Dashboard metrics | Power symbols ⚡ |
| HR Dashboard | Analytics charts | Business icons 📊 |
| Profile | Tabbed interface | Achievement icons 🏆 |
| Contact | Multi-form contact | Office theme 🏢 |
| Error Pages | Custom designs | Themed animations |

## 📱 Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile browsers ✅

## 🆘 Support

### Documentation
- **[Railway Deployment Guide](RAILWAY_DEPLOYMENT_GUIDE.md)** - Complete setup instructions
- **[Final Project Report](FINAL_PROJECT_REPORT.md)** - Technical specifications
- **[Production Checklist](PRODUCTION_CHECKLIST.md)** - Go-live verification

### Getting Help
- **Railway Issues**: [Railway Discord](https://discord.gg/railway)
- **Database Issues**: [Supabase Support](https://supabase.com/support)
- **Technical Questions**: Create a GitHub issue

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Deployment Status

✅ **Production Ready**  
✅ **Railway Compatible**  
✅ **Security Hardened**  
✅ **Performance Optimized**  
✅ **Mobile Responsive**  

---

**🚀 Deploy JobStir to Railway in minutes!**

Experience the power of modern web development with interactive animations, enterprise security, and seamless Railway deployment.

[Deploy Now](https://railway.app/new/template/your-template-id) • [View Demo](https://jobstir-demo.up.railway.app) • [Documentation](RAILWAY_DEPLOYMENT_GUIDE.md)
