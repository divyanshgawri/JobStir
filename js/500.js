// 500 Error Page Interactive Features
class ServerErrorAnimation {
    constructor() {
        this.init();
    }

    init() {
        this.createFloatingElements();
        this.initErrorAnimation();
        this.initInteractiveElements();
        this.startGlitchEffect();
    }

    createFloatingElements() {
        const container = document.querySelector('.error-container');
        
        // Create floating error symbols
        const symbols = ['⚠️', '🔧', '⚡', '🔥', '💻', '🛠️'];
        
        for (let i = 0; i < 15; i++) {
            const element = document.createElement('div');
            element.className = 'floating-element';
            element.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            element.style.cssText = `
                position: absolute;
                font-size: ${Math.random() * 20 + 15}px;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                opacity: 0.3;
                pointer-events: none;
                animation: float ${Math.random() * 10 + 5}s infinite linear;
                z-index: -1;
            `;
            container.appendChild(element);
        }

        // Add CSS for floating animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
                10% { opacity: 0.3; }
                90% { opacity: 0.3; }
                100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
            }
            
            @keyframes glitch {
                0% { transform: translate(0); }
                20% { transform: translate(-2px, 2px); }
                40% { transform: translate(-2px, -2px); }
                60% { transform: translate(2px, 2px); }
                80% { transform: translate(2px, -2px); }
                100% { transform: translate(0); }
            }
            
            @keyframes pulse-error {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            
            .error-code.glitch {
                animation: glitch 0.3s infinite;
                color: #ef4444;
                text-shadow: 2px 2px 0px #ff0000, -2px -2px 0px #00ff00;
            }
            
            .error-animation.pulse {
                animation: pulse-error 1s infinite;
            }
            
            .content-wrapper.shake {
                animation: shake 0.5s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    }

    initErrorAnimation() {
        const errorIcon = document.getElementById('error-animation');
        const errorCode = document.querySelector('.error-code');
        
        if (errorIcon) {
            // Continuous pulsing
            setInterval(() => {
                errorIcon.classList.add('pulse');
                setTimeout(() => {
                    errorIcon.classList.remove('pulse');
                }, 1000);
            }, 3000);
        }

        if (errorCode) {
            // Random glitch effect
            setInterval(() => {
                if (Math.random() < 0.3) { // 30% chance
                    errorCode.classList.add('glitch');
                    setTimeout(() => {
                        errorCode.classList.remove('glitch');
                    }, 300);
                }
            }, 2000);
        }
    }

    initInteractiveElements() {
        const contentWrapper = document.querySelector('.content-wrapper');
        const retryButton = document.querySelector('.btn-retry');
        
        // Shake effect when clicking retry
        if (retryButton && contentWrapper) {
            retryButton.addEventListener('click', (e) => {
                e.preventDefault();
                contentWrapper.classList.add('shake');
                
                setTimeout(() => {
                    contentWrapper.classList.remove('shake');
                    // Add some humor
                    this.showRandomMessage();
                }, 500);
                
                // Actually reload after showing message
                setTimeout(() => {
                    location.reload();
                }, 2000);
            });
        }

        // Easter egg: Click on error code multiple times
        const errorCode = document.querySelector('.error-code');
        let clickCount = 0;
        
        if (errorCode) {
            errorCode.style.cursor = 'pointer';
            errorCode.addEventListener('click', () => {
                clickCount++;
                if (clickCount === 5) {
                    this.showEasterEgg();
                    clickCount = 0;
                }
            });
        }
    }

    startGlitchEffect() {
        const title = document.querySelector('.error-title');
        if (!title) return;

        const originalText = title.textContent;
        const glitchTexts = [
            'S3rv3r M3ltd0wn',
            'System.exe stopped working',
            'Have you tried turning it off and on again?',
            'Error 404: Error message not found',
            'The server is taking a coffee break ☕',
            originalText
        ];

        setInterval(() => {
            if (Math.random() < 0.2) { // 20% chance
                const randomText = glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
                title.textContent = randomText;
                
                setTimeout(() => {
                    title.textContent = originalText;
                }, 1000);
            }
        }, 4000);
    }

    showRandomMessage() {
        const messages = [
            "🤖 Beep boop... still broken!",
            "🔧 Turning it off and on again...",
            "☕ Server is still on coffee break",
            "🎯 Error successfully reproduced!",
            "🚀 Launching recovery rockets...",
            "🧙‍♂️ Casting debugging spells..."
        ];
        
        const message = messages[Math.floor(Math.random() * messages.length)];
        this.showToast(message);
    }

    showEasterEgg() {
        const easterEggMessages = [
            "🎉 You found the secret! But the server is still broken...",
            "🕵️ Nice detective work! Here's a virtual cookie 🍪",
            "🎮 Achievement unlocked: Persistent Clicker!",
            "🦄 You've discovered the mythical 500 unicorn!"
        ];
        
        const message = easterEggMessages[Math.floor(Math.random() * easterEggMessages.length)];
        this.showToast(message, 3000);
        
        // Add rainbow effect to error code
        const errorCode = document.querySelector('.error-code');
        if (errorCode) {
            errorCode.style.background = 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
            errorCode.style.webkitBackgroundClip = 'text';
            errorCode.style.webkitTextFillColor = 'transparent';
            errorCode.style.backgroundSize = '200% 200%';
            errorCode.style.animation = 'rainbow 2s linear infinite';
            
            // Add rainbow animation
            const rainbowStyle = document.createElement('style');
            rainbowStyle.textContent = `
                @keyframes rainbow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `;
            document.head.appendChild(rainbowStyle);
            
            setTimeout(() => {
                errorCode.style.background = '';
                errorCode.style.webkitBackgroundClip = '';
                errorCode.style.webkitTextFillColor = '';
                errorCode.style.animation = '';
            }, 5000);
        }
    }

    showToast(message, duration = 2000) {
        // Remove existing toast
        const existingToast = document.querySelector('.error-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1e293b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ServerErrorAnimation();
});