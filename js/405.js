document.addEventListener('DOMContentLoaded', function() {
    feather.replace();
    initSecurityFeatures();
});

function initSecurityFeatures() {
    createSecurityMatrix();
    addShieldAnimation();
    addSecurityMessages();
    addHackerTerminal();
}

function createSecurityMatrix() {
    const container = document.querySelector('.error-container');
    
    // Create matrix rain effect
    const matrixContainer = document.createElement('div');
    matrixContainer.className = 'matrix-container';
    matrixContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: -1;
        opacity: 0.1;
    `;
    
    // Create falling characters
    for (let i = 0; i < 20; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.cssText = `
            position: absolute;
            left: ${i * 5}%;
            top: -100px;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            animation: matrixFall ${Math.random() * 3 + 2}s linear infinite;
            animation-delay: ${Math.random() * 2}s;
        `;
        
        // Add random characters
        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        let columnText = '';
        for (let j = 0; j < 20; j++) {
            columnText += chars[Math.floor(Math.random() * chars.length)] + '<br>';
        }
        column.innerHTML = columnText;
        
        matrixContainer.appendChild(column);
    }
    
    container.appendChild(matrixContainer);
    
    // Add matrix animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes matrixFall {
            0% { transform: translateY(-100px); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
        }
        
        @keyframes shieldPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        @keyframes securityScan {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        
        .shield-animation {
            animation: shieldPulse 2s infinite;
        }
        
        .security-scan {
            animation: securityScan 2s infinite;
        }
        
        .terminal {
            background: #000;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            border: 1px solid #00ff00;
            max-width: 400px;
            margin-left: auto;
            margin-right: auto;
        }
        
        .terminal-line {
            margin: 5px 0;
        }
        
        .cursor {
            animation: blink 1s infinite;
        }
        
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
        
        .security-badge {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.8rem;
            margin: 5px;
            display: inline-block;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .security-badge:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
        }
    `;
    document.head.appendChild(style);
}

function addShieldAnimation() {
    const shieldElement = document.querySelector('#shield-animation');
    if (shieldElement) {
        shieldElement.classList.add('shield-animation');
        
        // Add click interaction
        shieldElement.addEventListener('click', () => {
            shieldElement.classList.add('security-scan');
            showSecurityToast('🔒 Security scan initiated...');
            
            setTimeout(() => {
                shieldElement.classList.remove('security-scan');
                showSecurityToast('✅ No threats detected. Access still denied!');
            }, 2000);
        });
    }
}

function addSecurityMessages() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    const securityBadges = [
        '🔒 ENCRYPTED',
        '🛡️ PROTECTED',
        '🚫 ACCESS DENIED',
        '⚠️ UNAUTHORIZED',
        '🔐 SECURED',
        '🚨 ALERT'
    ];
    
    const badgesContainer = document.createElement('div');
    badgesContainer.style.cssText = `
        margin-top: 20px;
        text-align: center;
    `;
    
    securityBadges.forEach((badge, index) => {
        const badgeElement = document.createElement('span');
        badgeElement.className = 'security-badge';
        badgeElement.textContent = badge;
        badgeElement.addEventListener('click', () => {
            handleSecurityBadgeClick(badge, index);
        });
        badgesContainer.appendChild(badgeElement);
    });
    
    contentWrapper.appendChild(badgesContainer);
}

function addHackerTerminal() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    const terminal = document.createElement('div');
    terminal.className = 'terminal';
    terminal.innerHTML = `
        <div class="terminal-line">$ whoami</div>
        <div class="terminal-line">unauthorized_user</div>
        <div class="terminal-line">$ sudo access_page</div>
        <div class="terminal-line">Permission denied. Nice try! 😏</div>
        <div class="terminal-line">$ exit</div>
        <div class="terminal-line">Connection terminated.<span class="cursor">_</span></div>
    `;
    
    // Add typing effect
    const lines = terminal.querySelectorAll('.terminal-line');
    lines.forEach(line => line.style.opacity = '0');
    
    lines.forEach((line, index) => {
        setTimeout(() => {
            line.style.opacity = '1';
            line.style.animation = 'fadeIn 0.5s ease';
        }, index * 800);
    });
    
    contentWrapper.appendChild(terminal);
    
    // Make terminal clickable for easter egg
    let terminalClicks = 0;
    terminal.addEventListener('click', () => {
        terminalClicks++;
        if (terminalClicks === 3) {
            showHackerEasterEgg();
            terminalClicks = 0;
        }
    });
}

function handleSecurityBadgeClick(badge, index) {
    const messages = [
        "🔒 Data encrypted with military-grade security!",
        "🛡️ Firewall activated! Pew pew pew!",
        "🚫 Access denied! You shall not pass!",
        "⚠️ Unauthorized access attempt logged!",
        "🔐 This page is locked tighter than Fort Knox!",
        "🚨 Security alert! Intruder detected!"
    ];
    
    showSecurityToast(messages[index]);
    
    // Add special effect for the clicked badge
    const badges = document.querySelectorAll('.security-badge');
    badges[index].style.animation = 'securityScan 1s ease';
    
    setTimeout(() => {
        badges[index].style.animation = '';
    }, 1000);
}

function showHackerEasterEgg() {
    showSecurityToast("🎭 Hacker mode activated! But you're still not getting in...");
    
    // Change page colors temporarily
    document.body.style.filter = 'hue-rotate(120deg)';
    
    // Add "hacking" effect
    const hackingOverlay = document.createElement('div');
    hackingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 255, 0, 0.1);
        z-index: 999;
        pointer-events: none;
        animation: hackingFlash 0.1s infinite;
    `;
    
    const hackingStyle = document.createElement('style');
    hackingStyle.textContent = `
        @keyframes hackingFlash {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
    `;
    document.head.appendChild(hackingStyle);
    document.body.appendChild(hackingOverlay);
    
    setTimeout(() => {
        document.body.style.filter = '';
        hackingOverlay.remove();
        hackingStyle.remove();
        showSecurityToast("🔒 Security systems restored. Nice try though!");
    }, 3000);
}

function showSecurityToast(message, duration = 2500) {
    const existingToast = document.querySelector('.security-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'security-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
        z-index: 1000;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-family: 'Courier New', monospace;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}
