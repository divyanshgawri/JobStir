// Mobile menu functionality
        document.addEventListener('DOMContentLoaded', () => {
            const menuToggle = document.getElementById('menuToggle');
            const mobileNav = document.getElementById('mobileNav');
            const closeMenu = document.getElementById('closeMenu');
            const body = document.body;

            function openMobileMenu() {
                mobileNav.classList.add('active');
                body.style.overflow = 'hidden';
            }

            function closeMobileMenu() {
                mobileNav.classList.remove('active');
                body.style.overflow = '';
            }

            if (menuToggle) {
                menuToggle.addEventListener('click', openMobileMenu);
            }

            if (closeMenu) {
                closeMenu.addEventListener('click', closeMobileMenu);
            }

            // Close mobile menu when clicking on a link
            const mobileNavLinks = document.querySelectorAll('.mobile-nav-links a');
            mobileNavLinks.forEach(link => {
                link.addEventListener('click', closeMobileMenu);
            });

            // Close mobile menu when clicking outside
            mobileNav.addEventListener('click', (e) => {
                if (e.target === mobileNav) {
                    closeMobileMenu();
                }
            });

            // Close mobile menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileNav.classList.contains('active')) {
                    closeMobileMenu();
                }
            });

            // Close mobile menu on window resize
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768 && mobileNav.classList.contains('active')) {
                    closeMobileMenu();
                }
            });
        });

        // Login form functionality
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const loginButton = document.getElementById('loginButton');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Add loading state
            loginButton.classList.add('loading');
            loginButton.style.position = 'relative';
            loginButton.textContent = 'Signing In...';
            
            // Simulate API call (replace with actual login logic)
            setTimeout(() => {
                // Remove loading state
                loginButton.classList.remove('loading');
                loginButton.style.position = '';
                loginButton.textContent = 'Sign In';
                
                // Here you would typically send the form data to your server
                // For now, we'll just show an alert
                alert('Login functionality would be implemented here');
                
                // Example of how you might handle the actual form submission:
                // this.submit(); // Uncomment this to actually submit the form
            }, 2000);
        });