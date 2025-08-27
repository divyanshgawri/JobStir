// admin_site_mode.js
// Add this script to your admin page (e.g., hr_dashboard.html for HR/admins)

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch and show the current mode
    const mode = await getSiteMode();
    if (mode) {
        document.getElementById('site-mode-select').value = mode;
        updateModeBanner(mode);
    }

    document.getElementById('site-mode-select').addEventListener('change', async (e) => {
        const selectedMode = e.target.value;
        await setSiteMode(selectedMode);
        updateModeBanner(selectedMode);
        alert('Site mode updated to: ' + selectedMode);
    });
});

async function getSiteMode() {
    // Fetches the mode from the 'site_settings' table
    const { data, error } = await supabaseManager.select('site_settings', 'value', { key: 'mode' });
    if (error || !data || !data.length) return 'production'; // default
    return data[0].value;
}

async function setSiteMode(mode) {
    // Upsert the mode in the 'site_settings' table
    let result = await supabaseManager.update('site_settings', { value: mode }, { key: 'mode' });
    if (!result.success) {
        // If not existing, insert
        await supabaseManager.insert('site_settings', { key: 'mode', value: mode });
    }
}

function updateModeBanner(mode) {
    let banner = document.getElementById('dev-mode-banner');
    if (!banner) return;
    if (mode === 'development') {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}