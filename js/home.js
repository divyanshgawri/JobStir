document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather Icons
    feather.replace();
    
    // Check authentication state and update UI
    updateAuthUI();

    // --- Dark Mode Logic ---
    const darkModeToggles = document.querySelectorAll('.dark-mode-toggle');
    const currentTheme = localStorage.getItem('theme');

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            darkModeToggles.forEach(toggle => toggle.checked = true);
        } else {
            document.documentElement.classList.remove('dark');
            darkModeToggles.forEach(toggle => toggle.checked = false);
        }
        feather.replace(); // Re-initialize icons after theme change
    };

    if (currentTheme) {
        applyTheme(currentTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    }

    darkModeToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const theme = this.checked ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            applyTheme(theme);
        });
    });


    // Mobile Menu Toggle Logic
    const menuToggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const closeMenu = document.getElementById('closeMenu');

    if (menuToggle && mobileNav && closeMenu) {
        menuToggle.addEventListener('click', () => mobileNav.classList.add('active'));
        closeMenu.addEventListener('click', () => mobileNav.classList.remove('active'));
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileNav.classList.remove('active'));
        });
    }

    // Smooth scroll for anchor links (only for same-page navigation)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Scroll-based animations for cards
    const animatedCards = document.querySelectorAll('.step, .feature-card, .testimonial, .job-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.5s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animatedCards.forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });

    // Add animation keyframes to the stylesheet
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = `
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleSheet);

    // --- Three.js 3D Globe Animation ---
    const container = document.getElementById('hero-animation-container');
    if (container && typeof THREE !== 'undefined') {
        let scene, camera, renderer, globe, clouds, particles, stars, moonsGroup;
        let mouseX = 0, mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;

        function init() {
            // Scene
            scene = new THREE.Scene();

            // Camera
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.z = 5;

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);

            // Texture Loader with error handling
            const textureLoader = new THREE.TextureLoader();
            const loadTexture = (url, name) => {
                return textureLoader.load(url, 
                    () => console.log(`Successfully loaded ${name} texture.`),
                    undefined,
                    (err) => console.error(`An error occurred loading the ${name} texture.`, err)
                );
            };

            // Globe
            const globeGeometry = new THREE.SphereGeometry(2, 64, 64);
            const globeMaterial = new THREE.MeshPhongMaterial({
                map: loadTexture('https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets/images/earthmap1k.jpg', 'Earth Day'),
                specularMap: loadTexture('https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets/images/earthspec1k.jpg', 'Earth Specular'),
                bumpMap: loadTexture('https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets/images/earthbump1k.jpg', 'Earth Bump'),
                bumpScale: 0.05,
                shininess: 10,
            });
            globe = new THREE.Mesh(globeGeometry, globeMaterial);
            scene.add(globe);
            
            // Clouds
            const cloudGeometry = new THREE.SphereGeometry(2.05, 64, 64);
            const cloudMaterial = new THREE.MeshPhongMaterial({
                map: loadTexture('https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets/images/earthcloudmaptrans.png', 'Clouds'),
                transparent: true,
                opacity: 0.4
            });
            clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
            scene.add(clouds);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 3, 5);
            scene.add(directionalLight);

            // Particles (Flowing dots)
            const particlesGeometry = new THREE.BufferGeometry();
            const particlesCount = 2000;
            const posArray = new Float32Array(particlesCount * 3);
            for (let i = 0; i < particlesCount * 3; i++) {
                posArray[i] = (Math.random() - 0.5) * 10;
            }
            particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const particlesMaterial = new THREE.PointsMaterial({
                size: 0.01,
                color: 0xa855f7,
            });
            particles = new THREE.Points(particlesGeometry, particlesMaterial);
            scene.add(particles);
            
            // Starfield
            const starGeometry = new THREE.BufferGeometry();
            const starCount = 10000;
            const starPosArray = new Float32Array(starCount * 3);
            for(let i=0; i < starCount * 3; i++) {
                starPosArray[i] = (Math.random() - 0.5) * 200;
            }
            starGeometry.setAttribute('position', new THREE.BufferAttribute(starPosArray, 3));
            const starMaterial = new THREE.PointsMaterial({
                size: 0.05,
                color: 0xffffff,
            });
            stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);

            // Orbiting Moons (Dots)
            moonsGroup = new THREE.Group();
            const moonGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const moonMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xdddddd, shininess: 50 });

            for (let i = 0; i < 3; i++) {
                const moon = new THREE.Mesh(moonGeometry, moonMaterial);
                
                const angle = (i / 3) * Math.PI * 2;
                const radius = 2.8 + (Math.random() * 0.2);
                moon.position.x = Math.cos(angle) * radius;
                moon.position.z = Math.sin(angle) * radius;
                moon.position.y = (Math.random() - 0.5) * 0.5;
                
                moonsGroup.add(moon);
            }
            scene.add(moonsGroup);


            // Event Listeners
            document.addEventListener('mousemove', onDocumentMouseMove);
            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            if (!container) return;
            windowHalfX = window.innerWidth / 2;
            windowHalfY = window.innerHeight / 2;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        function onDocumentMouseMove(event) {
            mouseX = (event.clientX - windowHalfX) / 100;
            mouseY = (event.clientY - windowHalfY) / 100;
        }

        function animate() {
            requestAnimationFrame(animate);
            
            // Animations
            globe.rotation.y += 0.001;
            clouds.rotation.y += 0.0015;
            particles.rotation.y += 0.0005;
            stars.rotation.y += 0.0001;
            moonsGroup.rotation.y += 0.003; // Animate the orbit


            // Mouse interaction
            camera.position.x += (mouseX - camera.position.x) * 0.05;
            camera.position.y += (-mouseY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        }

        init();
        animate();
    }
    
    // Authentication UI Management
    function updateAuthUI() {
        const session = localStorage.getItem('jobstir_session');
        const navButtons = document.querySelector('.nav-buttons');
        const mobileNavButtons = document.querySelector('.mobile-nav-buttons');
        
        if (session) {
            const user = JSON.parse(session);
            const userMenu = createUserMenu(user);
            
            // Update desktop nav
            if (navButtons) {
                navButtons.innerHTML = navButtons.innerHTML.replace(
                    /<a href="signin\.html".*?<\/a>\s*<a href="signup\.html".*?<\/a>/,
                    userMenu
                );
            }
            
            // Update mobile nav
            if (mobileNavButtons) {
                mobileNavButtons.innerHTML = userMenu;
            }
        }
    }
    
    function createUserMenu(user) {
        const adminPanelLink = user.isAdmin ? 
            `<a href="admin_panel.html" class="btn btn-danger">Admin Panel</a>` : '';
        const hrDashboardLink = user.isHR ? 
            `<a href="hr_dashboard.html" class="btn btn-primary">HR Dashboard</a>` : '';
        const candidatePortalLink = (!user.isHR && !user.isAdmin) ? 
            `<a href="candidate_portal.html" class="btn btn-primary">My Applications</a>` : '';
        
        return `
            <div class="user-menu">
                <span class="user-greeting">Welcome, ${user.email.split('@')[0]}!</span>
                <div class="dashboard-buttons">
                    ${adminPanelLink}
                    ${hrDashboardLink}
                    ${candidatePortalLink}
                    <a href="profile.html" class="btn btn-info">My Profile</a>
                </div>
                <button onclick="logout()" class="btn btn-secondary">Logout</button>
            </div>
        `;
    }
    
    // Load latest jobs dynamically
    function loadLatestJobs() {
        const jobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
        
        // Generate demo jobs if none exist
        if (jobs.length === 0) {
            const demoJobs = [
                {
                    id: '1',
                    title: 'Senior Frontend Developer',
                    company: 'TechCorp Inc.',
                    location: 'San Francisco, CA',
                    requirements: ['React', 'TypeScript', 'CSS'],
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    title: 'Product Manager',
                    company: 'StartupXYZ',
                    location: 'Remote',
                    requirements: ['Product Management', 'Agile', 'Analytics'],
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: '3',
                    title: 'UX Designer',
                    company: 'DesignStudio',
                    location: 'Austin, TX',
                    requirements: ['Figma', 'User Research', 'Prototyping'],
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            localStorage.setItem('jobstir_jobs', JSON.stringify(demoJobs));
            renderLatestJobs(demoJobs);
        } else {
            // Get 3 most recent jobs
            const latestJobs = jobs
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 3);
            renderLatestJobs(latestJobs);
        }
    }
    
    function renderLatestJobs(jobs) {
        const jobsGrid = document.querySelector('.jobs-grid');
        if (!jobsGrid) return;
        
        jobsGrid.innerHTML = jobs.map(job => `
            <div class="job-card">
                <div class="job-card-header">
                    <div class="company-logo logo${Math.floor(Math.random() * 4) + 1}"></div>
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <p class="company-name">${job.company}</p>
                    </div>
                </div>
                <p class="job-location"><i data-feather="map-pin"></i> ${job.location}</p>
                <div class="job-tags">
                    ${job.requirements.slice(0, 3).map(req => 
                        `<span class="tag tag-${['blue', 'green', 'purple'][Math.floor(Math.random() * 3)]}">${req}</span>`
                    ).join('')}
                </div>
                <a href="job_listings.html?job=${job.id}" class="btn btn-job-details">View Details</a>
            </div>
        `).join('');
        
        // Re-initialize feather icons for new content
        feather.replace();
    }
    
    // Load latest jobs when page loads
    loadLatestJobs();

    // Global logout function
    window.logout = function() {
        localStorage.removeItem('jobstir_session');
        window.location.href = 'index.html';
    };
});
