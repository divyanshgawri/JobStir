// Stars Animation JavaScript
class StarsAnimation {
    constructor(options = {}) {
        this.options = {
            starCount: options.starCount || 150,
            shootingStarCount: options.shootingStarCount || 3,
            constellationCount: options.constellationCount || 20,
            enableGalaxy: options.enableGalaxy !== false,
            enableNebula: options.enableNebula !== false,
            enableMovingStars: options.enableMovingStars !== false,
            colors: options.colors || ['#ffffff', '#f0f8ff', '#e6e6fa', '#fff8dc'],
            container: options.container || document.body
        };
        
        this.starsContainer = null;
        this.galaxyElement = null;
        this.nebulaElement = null;
        this.init();
    }

    init() {
        this.createStarsContainer();
        this.createNebula();
        this.createGalaxy();
        this.createStars();
        this.createShootingStars();
        this.createConstellations();
        this.startAnimation();
    }

    createStarsContainer() {
        this.starsContainer = document.createElement('div');
        this.starsContainer.className = 'stars-container';
        this.starsContainer.id = 'starsContainer';
        this.options.container.appendChild(this.starsContainer);
    }

    createNebula() {
        if (!this.options.enableNebula) return;
        
        this.nebulaElement = document.createElement('div');
        this.nebulaElement.className = 'nebula';
        this.options.container.appendChild(this.nebulaElement);
    }

    createGalaxy() {
        if (!this.options.enableGalaxy) return;
        
        this.galaxyElement = document.createElement('div');
        this.galaxyElement.className = 'galaxy-bg';
        this.options.container.appendChild(this.galaxyElement);
    }

    createStars() {
        for (let i = 0; i < this.options.starCount; i++) {
            const star = document.createElement('div');
            const size = this.getRandomStarSize();
            const color = this.getRandomColor();
            
            star.className = `star ${size}`;
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.backgroundColor = color;
            star.style.animationDelay = Math.random() * 3 + 's';
            star.style.animationDuration = (Math.random() * 3 + 1) + 's';

            // Add moving animation to some stars
            if (this.options.enableMovingStars && Math.random() < 0.1) {
                star.classList.add('moving');
                star.style.animationDuration = (Math.random() * 20 + 15) + 's';
            }

            this.starsContainer.appendChild(star);
        }
    }

    createShootingStars() {
        for (let i = 0; i < this.options.shootingStarCount; i++) {
            const shootingStar = document.createElement('div');
            shootingStar.className = 'shooting-star';
            shootingStar.style.left = Math.random() * 100 + '%';
            shootingStar.style.top = Math.random() * 100 + '%';
            shootingStar.style.animationDelay = Math.random() * 10 + 's';
            shootingStar.style.animationDuration = (Math.random() * 3 + 2) + 's';
            
            this.starsContainer.appendChild(shootingStar);
        }
    }

    createConstellations() {
        for (let i = 0; i < this.options.constellationCount; i++) {
            const constellation = document.createElement('div');
            constellation.className = 'constellation';
            constellation.style.left = Math.random() * 100 + '%';
            constellation.style.top = Math.random() * 100 + '%';
            constellation.style.animationDelay = Math.random() * 4 + 's';
            
            this.starsContainer.appendChild(constellation);
        }
    }

    getRandomStarSize() {
        const rand = Math.random();
        if (rand < 0.6) return 'small';
        if (rand < 0.9) return 'medium';
        return 'large';
    }

    getRandomColor() {
        return this.options.colors[Math.floor(Math.random() * this.options.colors.length)];
    }

    startAnimation() {
        // Add some interactive effects
        this.addInteractiveEffects();
        
        // Periodically add new shooting stars
        setInterval(() => {
            this.addNewShootingStar();
        }, 5000);

        // Add twinkling effect to random stars
        setInterval(() => {
            this.addTwinkleEffect();
        }, 2000);
    }

    addInteractiveEffects() {
        // Mouse movement effect
        let mouseX = 0, mouseY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX / window.innerWidth;
            mouseY = e.clientY / window.innerHeight;
            
            if (this.galaxyElement) {
                const rotateX = (mouseY - 0.5) * 10;
                const rotateY = (mouseX - 0.5) * 10;
                this.galaxyElement.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            }
        });

        // Click effect - create burst of stars
        document.addEventListener('click', (e) => {
            this.createStarBurst(e.clientX, e.clientY);
        });
    }

    addNewShootingStar() {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        shootingStar.style.left = Math.random() * 100 + '%';
        shootingStar.style.top = Math.random() * 30 + '%'; // Start from top
        shootingStar.style.animationDuration = (Math.random() * 2 + 1) + 's';
        
        this.starsContainer.appendChild(shootingStar);
        
        // Remove after animation
        setTimeout(() => {
            if (shootingStar.parentNode) {
                shootingStar.parentNode.removeChild(shootingStar);
            }
        }, 3000);
    }

    addTwinkleEffect() {
        const stars = this.starsContainer.querySelectorAll('.star:not(.moving)');
        const randomStar = stars[Math.floor(Math.random() * stars.length)];
        
        if (randomStar) {
            randomStar.style.animation = 'none';
            randomStar.offsetHeight; // Trigger reflow
            randomStar.style.animation = 'twinkle 0.5s ease-in-out';
        }
    }

    createStarBurst(x, y) {
        for (let i = 0; i < 10; i++) {
            const burstStar = document.createElement('div');
            burstStar.className = 'star small';
            burstStar.style.position = 'fixed';
            burstStar.style.left = x + 'px';
            burstStar.style.top = y + 'px';
            burstStar.style.backgroundColor = this.getRandomColor();
            burstStar.style.zIndex = '9999';
            burstStar.style.pointerEvents = 'none';
            
            const angle = (i / 10) * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;
            
            burstStar.style.animation = `burstOut 1s ease-out forwards`;
            burstStar.style.setProperty('--targetX', targetX + 'px');
            burstStar.style.setProperty('--targetY', targetY + 'px');
            
            document.body.appendChild(burstStar);
            
            setTimeout(() => {
                if (burstStar.parentNode) {
                    burstStar.parentNode.removeChild(burstStar);
                }
            }, 1000);
        }
    }

    // Method to update star count dynamically
    updateStarCount(newCount) {
        this.options.starCount = newCount;
        this.clearStars();
        this.createStars();
    }

    clearStars() {
        const stars = this.starsContainer.querySelectorAll('.star');
        stars.forEach(star => star.remove());
    }

    // Method to destroy the animation
    destroy() {
        if (this.starsContainer) {
            this.starsContainer.remove();
        }
        if (this.galaxyElement) {
            this.galaxyElement.remove();
        }
        if (this.nebulaElement) {
            this.nebulaElement.remove();
        }
    }

    // Static method to create with default settings
    static createDefault(container = document.body) {
        return new StarsAnimation({ container });
    }

    // Static method for minimal stars (performance friendly)
    static createMinimal(container = document.body) {
        return new StarsAnimation({
            container,
            starCount: 80,
            shootingStarCount: 1,
            constellationCount: 10,
            enableGalaxy: false,
            enableNebula: false,
            enableMovingStars: false
        });
    }

    // Static method for full experience
    static createFull(container = document.body) {
        return new StarsAnimation({
            container,
            starCount: 200,
            shootingStarCount: 5,
            constellationCount: 30,
            enableGalaxy: true,
            enableNebula: true,
            enableMovingStars: true
        });
    }
}

// Add burst animation to CSS if not present
if (!document.querySelector('#burstAnimationStyles')) {
    const burstStyles = document.createElement('style');
    burstStyles.id = 'burstAnimationStyles';
    burstStyles.textContent = `
        @keyframes burstOut {
            0% {
                transform: scale(1) translate(0, 0);
                opacity: 1;
            }
            100% {
                transform: scale(0.5) translate(var(--targetX), var(--targetY));
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(burstStyles);
}

// Auto-initialize if page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Auto-initialize with default settings if no custom initialization
        if (!window.starsAnimationInitialized) {
            window.jobStirStars = StarsAnimation.createDefault();
            window.starsAnimationInitialized = true;
        }
    });
} else {
    // Page is already loaded
    if (!window.starsAnimationInitialized) {
        window.jobStirStars = StarsAnimation.createDefault();
        window.starsAnimationInitialized = true;
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StarsAnimation;
}

// Global access
window.StarsAnimation = StarsAnimation;
