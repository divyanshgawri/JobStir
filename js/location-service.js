// Location-based search service for JobStir
class LocationService {
    constructor() {
        this.userLocation = null;
        this.locationCache = new Map();
        this.init();
    }

    async init() {
        // Only attempt geolocation if the user has allowed it post-signup/signin
        const geoAllowed = localStorage.getItem('jobstir_geo_allowed') === 'true';
        if (geoAllowed) {
            await this.getCurrentLocation();
        }
        
        // Initialize location autocomplete
        this.initLocationAutocomplete();
    }

    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.log('Geolocation is not supported by this browser');
                resolve(null);
                return;
            }

            // Use cached location first to avoid re-prompting users every visit
            try {
                const cached = localStorage.getItem('jobstir_geo_cache');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    this.userLocation = parsed;
                    if (parsed.city) {
                        this.updateLocationInputs(parsed.city);
                    }
                    resolve(parsed);
                    return;
                }
            } catch (_) {}

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    this.userLocation = { lat: latitude, lng: longitude };
                    
                    // Get city name from coordinates
                    const cityName = await this.getCityFromCoordinates(latitude, longitude);
                    if (cityName) {
                        this.userLocation.city = cityName;
                        this.updateLocationInputs(cityName);
                    }
                    
                    console.log('User location detected:', this.userLocation);
                    try { localStorage.setItem('jobstir_geo_cache', JSON.stringify(this.userLocation)); } catch (_) {}
                    resolve(this.userLocation);
                },
                (error) => {
                    console.log('Error getting location:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    async getCityFromCoordinates(lat, lng) {
        try {
            // Using a free geocoding service (you can replace with Google Maps API)
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
            const data = await response.json();
            
            return data.city || data.locality || data.principalSubdivision || null;
        } catch (error) {
            console.error('Error getting city from coordinates:', error);
            return null;
        }
    }

    updateLocationInputs(cityName) {
        const locationInputs = document.querySelectorAll('#location-search, input[placeholder*="Location"]');
        locationInputs.forEach(input => {
            if (!input.value) {
                input.placeholder = `${cityName} (detected)`;
                input.setAttribute('data-detected-location', cityName);
            }
        });
    }

    initLocationAutocomplete() {
        const locationInputs = document.querySelectorAll('#location-search, input[placeholder*="Location"]');
        
        locationInputs.forEach(input => {
            this.setupLocationAutocomplete(input);
        });
    }

    setupLocationAutocomplete(input) {
        let debounceTimer;
        let suggestionsList;

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            if (query.length < 2) {
                this.hideSuggestions(suggestionsList);
                return;
            }

            debounceTimer = setTimeout(async () => {
                const suggestions = await this.getLocationSuggestions(query);
                this.showLocationSuggestions(input, suggestions);
            }, 300);
        });

        input.addEventListener('blur', () => {
            // Delay hiding to allow clicking on suggestions
            setTimeout(() => {
                this.hideSuggestions(suggestionsList);
            }, 200);
        });

        input.addEventListener('focus', () => {
            const detectedLocation = input.getAttribute('data-detected-location');
            if (detectedLocation && !input.value) {
                input.value = detectedLocation;
            }
        });
    }

    async getLocationSuggestions(query) {
        // Check cache first
        if (this.locationCache.has(query)) {
            return this.locationCache.get(query);
        }

        try {
            // Using a combination of predefined locations and API
            const predefinedLocations = this.getPredefinedLocations(query);
            
            // You can integrate with Google Places API or similar service here
            // For now, using predefined locations with smart filtering
            const suggestions = predefinedLocations.filter(location => 
                location.toLowerCase().includes(query.toLowerCase())
            ).slice(0, 8);

            // Cache the results
            this.locationCache.set(query, suggestions);
            
            return suggestions;
        } catch (error) {
            console.error('Error getting location suggestions:', error);
            return [];
        }
    }

    getPredefinedLocations(query) {
        const locations = [
            // Major US Cities
            'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX',
            'Phoenix, AZ', 'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA',
            'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
            'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'San Francisco, CA',
            'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
            'Boston, MA', 'El Paso, TX', 'Nashville, TN', 'Detroit, MI',
            'Oklahoma City, OK', 'Portland, OR', 'Las Vegas, NV', 'Memphis, TN',
            'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI', 'Albuquerque, NM',
            'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA', 'Mesa, AZ',
            'Kansas City, MO', 'Atlanta, GA', 'Long Beach, CA', 'Colorado Springs, CO',
            'Raleigh, NC', 'Miami, FL', 'Virginia Beach, VA', 'Omaha, NE',
            'Oakland, CA', 'Minneapolis, MN', 'Tulsa, OK', 'Arlington, TX',
            'Tampa, FL', 'New Orleans, LA',
            
            // Remote options
            'Remote', 'Remote - US', 'Remote - Global', 'Work from Home',
            
            // States
            'California', 'Texas', 'Florida', 'New York', 'Pennsylvania',
            'Illinois', 'Ohio', 'Georgia', 'North Carolina', 'Michigan',
            'New Jersey', 'Virginia', 'Washington', 'Arizona', 'Massachusetts',
            'Tennessee', 'Indiana', 'Missouri', 'Maryland', 'Wisconsin',
            'Colorado', 'Minnesota', 'South Carolina', 'Alabama', 'Louisiana',
            'Kentucky', 'Oregon', 'Oklahoma', 'Connecticut', 'Utah',
            
            // International
            'London, UK', 'Toronto, Canada', 'Vancouver, Canada', 'Sydney, Australia',
            'Melbourne, Australia', 'Berlin, Germany', 'Amsterdam, Netherlands',
            'Paris, France', 'Dublin, Ireland', 'Zurich, Switzerland'
        ];

        return locations;
    }

    showLocationSuggestions(input, suggestions) {
        // Remove existing suggestions
        this.hideSuggestions();

        if (suggestions.length === 0) return;

        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'location-suggestions';
        suggestionsList.innerHTML = suggestions.map(location => 
            `<div class="location-suggestion" data-location="${location}">
                <i data-feather="map-pin"></i>
                <span>${location}</span>
            </div>`
        ).join('');

        // Position the suggestions
        const inputRect = input.getBoundingClientRect();
        suggestionsList.style.position = 'absolute';
        suggestionsList.style.top = `${inputRect.bottom + window.scrollY}px`;
        suggestionsList.style.left = `${inputRect.left + window.scrollX}px`;
        suggestionsList.style.width = `${inputRect.width}px`;
        suggestionsList.style.zIndex = '1000';

        document.body.appendChild(suggestionsList);

        // Add click handlers
        suggestionsList.querySelectorAll('.location-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                input.value = suggestion.getAttribute('data-location');
                this.hideSuggestions(suggestionsList);
                
                // Trigger search if this is a search input
                if (input.id === 'location-search') {
                    this.triggerLocationSearch(input.value);
                }
            });
        });

        // Initialize feather icons
        feather.replace();
    }

    hideSuggestions(specificList = null) {
        if (specificList) {
            specificList.remove();
        } else {
            document.querySelectorAll('.location-suggestions').forEach(list => list.remove());
        }
    }

    triggerLocationSearch(location) {
        // Trigger the job search with location filter
        if (window.jobListings && typeof window.jobListings.performSearch === 'function') {
            window.jobListings.performSearch();
        }
        
        // Dispatch custom event for other components
        document.dispatchEvent(new CustomEvent('locationSearchTriggered', {
            detail: { location }
        }));
    }

    // Calculate distance between two locations (approximate)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Get coordinates for a location (you can integrate with geocoding API)
    async getCoordinatesForLocation(location) {
        // This is a simplified version - in production, use a proper geocoding service
        const locationCoords = {
            'New York, NY': { lat: 40.7128, lng: -74.0060 },
            'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
            'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
            'Houston, TX': { lat: 29.7604, lng: -95.3698 },
            'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
            'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
            'Boston, MA': { lat: 42.3601, lng: -71.0589 },
            'Austin, TX': { lat: 30.2672, lng: -97.7431 },
            'Denver, CO': { lat: 39.7392, lng: -104.9903 },
            'Atlanta, GA': { lat: 33.7490, lng: -84.3880 }
        };

        return locationCoords[location] || null;
    }

    // Filter jobs by location
    filterJobsByLocation(jobs, searchLocation, maxDistance = 50) {
        if (!searchLocation || searchLocation.toLowerCase() === 'remote') {
            return jobs.filter(job => 
                job.remote === 'remote' || 
                job.location.toLowerCase().includes('remote')
            );
        }

        return jobs.filter(job => {
            // Simple text matching for now
            const jobLocation = job.location.toLowerCase();
            const search = searchLocation.toLowerCase();
            
            // Exact match or contains
            if (jobLocation.includes(search) || search.includes(jobLocation)) {
                return true;
            }

            // Check for state matches
            const searchState = this.extractState(search);
            const jobState = this.extractState(jobLocation);
            
            if (searchState && jobState && searchState === jobState) {
                return true;
            }

            return false;
        });
    }

    extractState(location) {
        const stateAbbreviations = {
            'california': 'CA', 'texas': 'TX', 'florida': 'FL', 'new york': 'NY',
            'pennsylvania': 'PA', 'illinois': 'IL', 'ohio': 'OH', 'georgia': 'GA',
            'north carolina': 'NC', 'michigan': 'MI', 'new jersey': 'NJ',
            'virginia': 'VA', 'washington': 'WA', 'arizona': 'AZ', 'massachusetts': 'MA'
        };

        const location_lower = location.toLowerCase();
        
        // Check for state abbreviations
        const stateMatch = location.match(/\b([A-Z]{2})\b/);
        if (stateMatch) {
            return stateMatch[1];
        }

        // Check for full state names
        for (const [fullName, abbr] of Object.entries(stateAbbreviations)) {
            if (location_lower.includes(fullName)) {
                return abbr;
            }
        }

        return null;
    }
}

// Initialize location service
let locationService;
document.addEventListener('DOMContentLoaded', () => {
    locationService = new LocationService();
    window.locationService = locationService;
});

// Export for use in other modules
window.LocationService = LocationService;