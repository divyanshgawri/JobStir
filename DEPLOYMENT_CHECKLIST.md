# JobStir Railway Deployment Checklist

## ✅ Pre-Deployment
- [ ] Ensure all code is committed to GitHub
- [ ] Set up a Supabase project
- [ ] Install Railway CLI: `npm install -g @railway/cli`
- [ ] Login to Railway: `railway login`

## 🔧 Environment Setup
Add these variables in Railway dashboard:
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
GROQ_API_KEY=your-groq-key
JWT_SECRET=your-jwt-secret
```

## 🚀 Deployment Steps
1. **Link your project**
   ```bash
   railway link
   ```

2. **Deploy**
   ```bash
   railway up
   ```

3. **Verify deployment**
   - Visit the provided Railway URL
   - Check logs: `railway logs`
   - Test all major features

## 🔍 Post-Deployment
- [ ] Set up custom domain (if needed)
- [ ] Configure SSL/TLS
- [ ] Set up monitoring
- [ ] Test all user flows
- [ ] Verify backups

## 🆘 Need Help?
- Run `railway --help` for CLI options
- Check logs: `railway logs`
- Visit [Railway Status](https://railway.status.page/)

## 🎉 Success!
Your JobStir instance is now live on Railway!
