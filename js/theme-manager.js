// JobStir Theme Manager: applies and persists theme across pages
(function () {
	var THEME_KEY = 'theme';
	var DARK_CLASS = 'dark';

	function applyTheme(theme) {
		var body = document.body;
		if (!body) return;
		if (theme === 'dark') body.classList.add(DARK_CLASS); else body.classList.remove(DARK_CLASS);
		try { document.documentElement.setAttribute('data-theme', theme); } catch (_) {}
	}

	function getSavedTheme() {
		try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (_) { return 'light'; }
	}

	function saveTheme(theme) {
		try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
	}

	function syncToggle(toggle) {
		if (!toggle || toggle.dataset.tmBound) return;
		// UI semantics: checked = light mode, unchecked = dark mode
		toggle.checked = getSavedTheme() === 'light';
		toggle.addEventListener('change', function () {
			var theme = this.checked ? 'light' : 'dark';
			applyTheme(theme);
			saveTheme(theme);
			if (window.jobstirTheme && typeof window.jobstirTheme._notify === 'function') {
				window.jobstirTheme._notify(theme);
			}
		});
		toggle.dataset.tmBound = '1';
	}

	// Public API for optional callbacks
	window.jobstirTheme = window.jobstirTheme || {
		listeners: [],
		onThemeChange: function (cb) { if (typeof cb === 'function') this.listeners.push(cb); },
		_notify: function (theme) { this.listeners.forEach(function (cb) { try { cb(theme); } catch (_) {} }); }
	};

	// Apply immediately on DOMContentLoaded
	document.addEventListener('DOMContentLoaded', function () {
		var current = getSavedTheme();
		applyTheme(current);
		syncToggle(document.getElementById('dark-mode-toggle'));
	});
})();


