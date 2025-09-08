// ===== JOBSTIR UNIFIED THEME & STARS FUNCTIONALITY =====

// ===== THEME TOGGLE =====
function initializeTheme() {
    const toggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    
    if (!toggle) return; // Skip if no theme toggle on this page
    
    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark');
        toggle.checked = true;
    }
    
    // Theme toggle handler
    toggle.addEventListener('change', function() {
        if (this.checked) {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        updateStarsTheme();
    });
}

// ===== THEME READER (for pages without toggle) =====
function applyStoredTheme() {
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        body.classList.add('dark');
    }
}

// ===== FLOATING STARS ANIMATION =====
function createStars() {
    const container = document.getElementById('starsContainer');
    if (!container) return; // Skip if no stars container
    
    // Create static twinkling stars
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.innerHTML = ['✦', '✧', '⋆', '✩', '⭐'][Math.floor(Math.random() * 5)];
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.fontSize = (Math.random() * 6 + 8) + 'px';
        container.appendChild(star);
    }
    
    // Create floating stars
    setInterval(() => {
        if (Math.random() < 0.3) {
            const floatingStar = document.createElement('div');
            floatingStar.className = 'floating-star';
            floatingStar.innerHTML = ['✦', '✧', '⋆'][Math.floor(Math.random() * 3)];
            floatingStar.style.left = Math.random() * 100 + '%';
            floatingStar.style.bottom = '0px';
            floatingStar.style.animationDuration = (Math.random() * 4 + 4) + 's';
            container.appendChild(floatingStar);
            
            setTimeout(() => {
                if (floatingStar.parentNode) {
                    floatingStar.remove();
                }
            }, 8000);
        }
    }, 2000);
}

function updateStarsTheme() {
    // Stars automatically update via CSS based on body.dark class
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener('DOMContentLoaded', function() {
    // Apply stored theme first (for all pages)
    applyStoredTheme();
    
    // Initialize theme toggle if present
    initializeTheme();
    
    // Create stars background
    createStars();
    
    // Add sparkle animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes sparkleEffect {
            0% {
                transform: scale(1) translate(0, 0);
                opacity: 1;
            }
            100% {
                transform: scale(0.5) translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});
