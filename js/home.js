document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather Icons
    feather.replace();
    
    // Check authentication state and update UI
    updateAuthUI();

    // Theme management is now handled by theme-manager.js
    // Just register callback for theme changes if needed
    if (window.jobstirTheme) {
        window.jobstirTheme.onThemeChange((newTheme, oldTheme) => {
            console.log(`Home page: Theme changed from ${oldTheme} to ${newTheme}`);
            // Any page-specific theme change logic can go here
        });
    }


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

    // --- GitHub Globe Animation ---
    const container = document.getElementById('hero-animation-container');
    if (container && typeof THREE !== 'undefined') {
        // Check if ThreeGlobe is loaded
        if (typeof ThreeGlobe === 'undefined') {
            console.error('ThreeGlobe library not loaded. Please check the script tag.');
            return;
        }
        let scene, camera, renderer, globe, controls;
        let mouseX = 0, mouseY = 0;
        let windowHalfX = window.innerWidth / 2;
        let windowHalfY = window.innerHeight / 2;
        let globeData = [];
        let arcsData = [];

        // Sample data for arcs (connections between cities)
        const sampleArcs = [
            { startLat: 40.7128, startLng: -74.0060, endLat: 51.5074, endLng: -0.1278, color: '#ff6b6b', order: 1, arcAlt: 0.3 }, // NYC to London
            { startLat: 37.7749, startLng: -122.4194, endLat: 35.6762, endLng: 139.6503, color: '#4ecdc4', order: 2, arcAlt: 0.4 }, // SF to Tokyo
            { startLat: 51.5074, startLng: -0.1278, endLat: -33.8688, endLng: 151.2093, color: '#45b7d1', order: 3, arcAlt: 0.5 }, // London to Sydney
            { startLat: 48.8566, startLng: 2.3522, endLat: 55.7558, endLng: 37.6173, color: '#f9ca24', order: 4, arcAlt: 0.3 }, // Paris to Moscow
            { startLat: 28.6139, startLng: 77.2090, endLat: 1.3521, endLng: 103.8198, color: '#6c5ce7', order: 5, arcAlt: 0.4 }, // Delhi to Singapore
            { startLat: -23.5505, startLng: -46.6333, endLat: 40.7128, endLng: -74.0060, color: '#fd79a8', order: 6, arcAlt: 0.6 }, // São Paulo to NYC
            { startLat: 39.9042, startLng: 116.4074, endLat: 37.7749, endLng: -122.4194, color: '#00b894', order: 7, arcAlt: 0.5 }, // Beijing to SF
            { startLat: 25.2048, startLng: 55.2708, endLat: 51.5074, endLng: -0.1278, color: '#e17055', order: 8, arcAlt: 0.4 }, // Dubai to London
        ];

        function loadGlobeData() {
            // Use embedded globe data instead of fetch to avoid file:// protocol issues
            if (typeof GLOBE_DATA !== 'undefined') {
                return GLOBE_DATA;
            } else {
                console.error('GLOBE_DATA not available. Please ensure globe-data.js is loaded.');
                return null;
            }
        }

        function hexToRgb(hex) {
            const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
            hex = hex.replace(shorthandRegex, function (m, r, g, b) {
                return r + r + g + g + b + b;
            });
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            } : null;
        }

        function genRandomNumbers(min, max, count) {
            const arr = [];
            while (arr.length < count) {
                const r = Math.floor(Math.random() * (max - min)) + min;
                if (arr.indexOf(r) === -1) arr.push(r);
            }
            return arr;
        }

        async function init() {
            // Scene
            scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0x000000, 400, 2000);

            // Camera
            camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 180, 1800);
            camera.position.z = 400;

            // Renderer
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            // Load globe data
            const countries = loadGlobeData();
            
            // Initialize Globe
            globe = new ThreeGlobe()
                .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
                .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png');

            // Configure globe appearance
            const globeConfig = {
                pointSize: 1,
                atmosphereColor: '#ffffff',
                showAtmosphere: true,
                atmosphereAltitude: 0.1,
                polygonColor: 'rgba(255,255,255,0.7)',
                globeColor: '#1d072e',
                emissive: '#000000',
                emissiveIntensity: 0.1,
                shininess: 0.9,
                arcTime: 2000,
                arcLength: 0.9,
                rings: 1,
                maxRings: 3,
            };

            if (countries && countries.features) {
                globe
                    .hexPolygonsData(countries.features)
                    .hexPolygonResolution(3)
                    .hexPolygonMargin(0.7)
                    .showAtmosphere(globeConfig.showAtmosphere)
                    .atmosphereColor(globeConfig.atmosphereColor)
                    .atmosphereAltitude(globeConfig.atmosphereAltitude)
                    .hexPolygonColor(() => globeConfig.polygonColor);
            } else {
                console.warn('Country data not available, globe will display without country polygons');
                globe
                    .showAtmosphere(globeConfig.showAtmosphere)
                    .atmosphereColor(globeConfig.atmosphereColor)
                    .atmosphereAltitude(globeConfig.atmosphereAltitude);
            }

            // Add arcs
            globe
                .arcsData(sampleArcs)
                .arcStartLat(d => d.startLat)
                .arcStartLng(d => d.startLng)
                .arcEndLat(d => d.endLat)
                .arcEndLng(d => d.endLng)
                .arcColor(d => d.color)
                .arcAltitude(d => d.arcAlt)
                .arcStroke(() => [0.32, 0.28, 0.3][Math.round(Math.random() * 2)])
                .arcDashLength(globeConfig.arcLength)
                .arcDashInitialGap(d => d.order)
                .arcDashGap(15)
                .arcDashAnimateTime(() => globeConfig.arcTime);

            // Add points
            let points = [];
            sampleArcs.forEach(arc => {
                points.push({
                    lat: arc.startLat,
                    lng: arc.startLng,
                    size: globeConfig.pointSize,
                    color: arc.color
                });
                points.push({
                    lat: arc.endLat,
                    lng: arc.endLng,
                    size: globeConfig.pointSize,
                    color: arc.color
                });
            });

            // Remove duplicates
            const filteredPoints = points.filter(
                (v, i, a) => a.findIndex(v2 => 
                    ['lat', 'lng'].every(k => v2[k] === v[k])
                ) === i
            );

            globe
                .pointsData(filteredPoints)
                .pointColor(d => d.color)
                .pointsMerge(true)
                .pointAltitude(0.0)
                .pointRadius(2);

            // Add rings animation
            globe
                .ringsData([])
                .ringColor(() => globeConfig.polygonColor)
                .ringMaxRadius(globeConfig.maxRings)
                .ringPropagationSpeed(3)
                .ringRepeatPeriod((globeConfig.arcTime * globeConfig.arcLength) / globeConfig.rings);

            scene.add(globe);

            // Lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight1.position.set(-400, 100, 400);
            scene.add(directionalLight1);
            
            const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight2.position.set(-200, 500, 200);
            scene.add(directionalLight2);
            
            const pointLight = new THREE.PointLight(0xffffff, 0.8);
            pointLight.position.set(-200, 500, 200);
            scene.add(pointLight);

            // Add rings animation interval
            const ringsInterval = setInterval(() => {
                if (globe) {
                    const newNumbersOfRings = genRandomNumbers(0, sampleArcs.length, Math.floor((sampleArcs.length * 4) / 5));
                    const ringsData = sampleArcs
                        .filter((d, i) => newNumbersOfRings.includes(i))
                        .map(d => ({
                            lat: d.startLat,
                            lng: d.startLng,
                            color: d.color,
                        }));
                    globe.ringsData(ringsData);
                }
            }, 2000);

            // Event Listeners
            document.addEventListener('mousemove', onDocumentMouseMove);
            window.addEventListener('resize', onWindowResize);
        }

        function onWindowResize() {
            if (!container || !camera || !renderer) return;
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
            
            // Auto-rotate globe
            if (globe) {
                globe.rotation.y += 0.002;
            }

            // Mouse interaction
            if (camera && scene && renderer) {
                camera.position.x += (mouseX - camera.position.x) * 0.05;
                camera.position.y += (-mouseY - camera.position.y) * 0.05;
                camera.lookAt(scene.position);
                renderer.render(scene, camera);
            }
        }

        // Initialize with error handling
        try {
            init();
            animate();
        } catch (error) {
            console.error('Error initializing globe:', error);
        }
    } else if (container) {
        console.warn('Three.js or ThreeGlobe not available. Globe will not be displayed.');
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
