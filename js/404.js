document.addEventListener('DOMContentLoaded', function() {
    feather.replace();

    const container = document.getElementById('animation-container');
    if (container && typeof THREE !== 'undefined') {
        let scene, camera, renderer, stars;
        let mouseX = 0, mouseY = 0;

        function init() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 5;

            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);
            
            // Starfield
            const starGeometry = new THREE.BufferGeometry();
            const starCount = 15000;
            const starPosArray = new Float32Array(starCount * 3);
            for(let i=0; i < starCount * 3; i++) {
                starPosArray[i] = (Math.random() - 0.5) * 100;
            }
            starGeometry.setAttribute('position', new THREE.BufferAttribute(starPosArray, 3));
            const starMaterial = new THREE.PointsMaterial({
                size: 0.05,
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);

            document.addEventListener('mousemove', onDocumentMouseMove);
            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        function onDocumentMouseMove(event) {
            mouseX = (event.clientX - window.innerWidth / 2) / 200;
            mouseY = (event.clientY - window.innerHeight / 2) / 200;
        }

        function animate() {
            requestAnimationFrame(animate);
            stars.rotation.y += 0.0001;
            stars.rotation.x += 0.0001;
            
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }

        init();
        animate();
    }
    
    // Add interactive features
    initInteractiveFeatures();
});

function initInteractiveFeatures() {
    // Add floating astronaut emoji
    createFloatingElements();
    
    // Add click interactions
    addClickInteractions();
    
    // Add typing effect to error message
    addTypingEffect();
    
    // Add search suggestions
    addSearchSuggestions();
}

function createFloatingElements() {
    const container = document.querySelector('.error-container');
    const astronauts = ['🚀', '🛸', '👨‍🚀', '🌟', '🪐', '🌙'];
    
    for (let i = 0; i < 8; i++) {
        const element = document.createElement('div');
        element.className = 'floating-astronaut';
        element.textContent = astronauts[Math.floor(Math.random() * astronauts.length)];
        element.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 30 + 20}px;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            opacity: 0.6;
            pointer-events: none;
            animation: floatSpace ${Math.random() * 15 + 10}s infinite linear;
            z-index: -1;
        `;
        container.appendChild(element);
    }

    // Add CSS for space floating animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatSpace {
            0% { transform: translate(0, 100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.6; }
            90% { opacity: 0.6; }
            100% { transform: translate(${Math.random() * 200 - 100}px, -100px) rotate(360deg); opacity: 0; }
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        .error-code:hover {
            animation: bounce 1s ease;
            cursor: pointer;
        }
        
        .search-suggestion {
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.3);
            padding: 8px 16px;
            margin: 4px;
            border-radius: 20px;
            display: inline-block;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
        }
        
        .search-suggestion:hover {
            background: rgba(99, 102, 241, 0.2);
            transform: translateY(-2px);
        }
        
        .suggestions-container {
            margin-top: 20px;
            text-align: center;
        }
        
        .suggestions-title {
            color: #64748b;
            font-size: 0.9rem;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);
}

function addClickInteractions() {
    const errorCode = document.querySelector('.error-code');
    let clickCount = 0;
    
    if (errorCode) {
        errorCode.addEventListener('click', () => {
            clickCount++;
            
            const messages = [
                "🚀 Houston, we have a problem!",
                "🛸 Searching the galaxy for your page...",
                "👨‍🚀 Even astronauts get lost sometimes!",
                "🌟 Your page is in another solar system!",
                "🪐 Maybe it's orbiting Saturn?",
                "🌙 One small step for 404, one giant leap for confusion!"
            ];
            
            if (clickCount <= messages.length) {
                showSpaceToast(messages[clickCount - 1]);
            }
            
            if (clickCount === 7) {
                showEasterEgg();
                clickCount = 0;
            }
        });
    }
}

function addTypingEffect() {
    const errorMessage = document.querySelector('.error-message');
    if (!errorMessage) return;
    
    const originalText = errorMessage.textContent;
    errorMessage.textContent = '';
    
    let i = 0;
    const typeWriter = () => {
        if (i < originalText.length) {
            errorMessage.textContent += originalText.charAt(i);
            i++;
            setTimeout(typeWriter, 50);
        }
    };
    
    // Start typing after a short delay
    setTimeout(typeWriter, 1000);
}

function addSearchSuggestions() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (!contentWrapper) return;
    
    const suggestions = [
        'Home', 'About', 'Contact', 'Jobs', 'Resume Evaluator', 'Sign Up', 'Sign In'
    ];
    
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggestions-container';
    suggestionsContainer.innerHTML = `
        <div class="suggestions-title">Maybe you were looking for:</div>
    `;
    
    suggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('span');
        suggestionElement.className = 'search-suggestion';
        suggestionElement.textContent = suggestion;
        suggestionElement.addEventListener('click', () => {
            handleSuggestionClick(suggestion);
        });
        suggestionsContainer.appendChild(suggestionElement);
    });
    
    contentWrapper.appendChild(suggestionsContainer);
}

function handleSuggestionClick(suggestion) {
    const routes = {
        'Home': 'index.html',
        'About': 'about.html',
        'Contact': 'contact.html',
        'Jobs': 'index.html#latest-jobs',
        'Resume Evaluator': 'evaluate_resume.html',
        'Sign Up': 'signup.html',
        'Sign In': 'signin.html'
    };
    
    showSpaceToast(`🚀 Navigating to ${suggestion}...`);
    
    setTimeout(() => {
        window.location.href = routes[suggestion] || 'index.html';
    }, 1000);
}

function showEasterEgg() {
    showSpaceToast("🎉 You've discovered the space secret! Here's a shooting star! ⭐");
    
    // Create shooting star effect
    const star = document.createElement('div');
    star.style.cssText = `
        position: fixed;
        top: 10%;
        right: -50px;
        font-size: 30px;
        z-index: 1000;
        animation: shootingStar 2s ease-out;
    `;
    star.textContent = '⭐';
    document.body.appendChild(star);
    
    const shootingStarStyle = document.createElement('style');
    shootingStarStyle.textContent = `
        @keyframes shootingStar {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate(-100vw, 80vh) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(shootingStarStyle);
    
    setTimeout(() => {
        star.remove();
        shootingStarStyle.remove();
    }, 2000);
}

function showSpaceToast(message, duration = 2500) {
    const existingToast = document.querySelector('.space-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'space-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        z-index: 1000;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.2);
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
