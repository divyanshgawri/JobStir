// Theme Reader for JobStir - Used by all pages EXCEPT index.html
// This script only READS the theme from localStorage and applies it
// The theme toggle is ONLY available on the main page (index.html)

document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    
    // Load saved theme from localStorage (set by main page)
    const savedTheme = localStorage.getItem('jobstir-theme') || 'light';
    
    if (savedTheme === 'dark') {
        body.classList.add('dark');
        console.log('Applied DARK theme from main page setting');
    } else {
        body.classList.remove('dark');
        console.log('Applied LIGHT theme from main page setting');
    }
    
    // Optional: Listen for theme changes from other tabs/windows
    window.addEventListener('storage', function(e) {
        if (e.key === 'jobstir-theme') {
            if (e.newValue === 'dark') {
                body.classList.add('dark');
                console.log('Theme changed to DARK from another tab');
            } else {
                body.classList.remove('dark');
                console.log('Theme changed to LIGHT from another tab');
            }
        }
    });
});
