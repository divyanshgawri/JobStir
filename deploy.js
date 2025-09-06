#!/usr/bin/env node

// JobStir Railway Deployment Script
// This script helps automate the deployment process

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 JobStir Railway Deployment Script');
console.log('=====================================');

// Check if package.json exists
if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.error('❌ package.json not found. Make sure you\'re in the JobStir directory.');
    process.exit(1);
}

// Check if Railway CLI is installed
try {
    execSync('railway --version', { stdio: 'ignore' });
    console.log('✅ Railway CLI is installed');
} catch (error) {
    console.log('❌ Railway CLI not found. Installing...');
    try {
        execSync('npm install -g @railway/cli', { stdio: 'inherit' });
        console.log('✅ Railway CLI installed successfully');
    } catch (installError) {
        console.error('❌ Failed to install Railway CLI. Please install manually:');
        console.error('npm install -g @railway/cli');
        process.exit(1);
    }
}

// Check if user is logged in to Railway
try {
    execSync('railway whoami', { stdio: 'ignore' });
    console.log('✅ Logged in to Railway');
} catch (error) {
    console.log('❌ Not logged in to Railway. Please login...');
    try {
        execSync('railway login', { stdio: 'inherit' });
        console.log('✅ Successfully logged in to Railway');
    } catch (loginError) {
        console.error('❌ Failed to login to Railway');
        process.exit(1);
    }
}

// Check for required files
const requiredFiles = [
    'server.js',
    'package.json',
    'railway.toml',
    'Procfile'
];

console.log('\n📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing!`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Missing required files. Please ensure all Railway configuration files are present.');
    process.exit(1);
}

// Check if HTML directory exists
if (!fs.existsSync(path.join(__dirname, 'html'))) {
    console.error('❌ html/ directory not found. Please ensure your HTML files are in the html/ directory.');
    process.exit(1);
} else {
    console.log('✅ html/ directory found');
}

// Check for stars animation assets
const starsAnimationCSS = path.join(__dirname, 'html', 'assets', 'css', 'stars-animation.css');
const starsAnimationJS = path.join(__dirname, 'html', 'assets', 'js', 'stars-animation.js');

if (fs.existsSync(starsAnimationCSS)) {
    console.log('✅ stars-animation.css found');
} else {
    console.log('⚠️  stars-animation.css not found - animations may not work');
}

if (fs.existsSync(starsAnimationJS)) {
    console.log('✅ stars-animation.js found');
} else {
    console.log('⚠️  stars-animation.js not found - animations may not work');
}

console.log('\n🔧 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
}

console.log('\n🚀 Deploying to Railway...');
try {
    // Initialize Railway project if not already initialized
    if (!fs.existsSync(path.join(__dirname, 'railway.json'))) {
        console.log('Initializing Railway project...');
        execSync('railway init', { stdio: 'inherit' });
    }
    
    // Deploy to Railway
    execSync('railway up', { stdio: 'inherit' });
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to your Railway dashboard');
    console.log('2. Configure environment variables (see railway-env-template.txt)');
    console.log('3. Set up your Supabase database credentials');
    console.log('4. Test your deployment');
    console.log('\n🔗 Your app will be available at:');
    console.log('https://your-app-name.up.railway.app');
    
} catch (error) {
    console.error('\n❌ Deployment failed. Check the error messages above.');
    console.error('For help, see: RAILWAY_DEPLOYMENT_GUIDE.md');
    process.exit(1);
}

console.log('\n📚 Documentation:');
console.log('- Railway Deployment Guide: RAILWAY_DEPLOYMENT_GUIDE.md');
console.log('- Environment Variables: railway-env-template.txt');
console.log('- Full Documentation: FINAL_PROJECT_REPORT.md');

console.log('\n🆘 Need help?');
console.log('- Railway Discord: https://discord.gg/railway');
console.log('- GitHub Issues: Create an issue for technical questions');

console.log('\n🌟 JobStir deployment script completed!');
