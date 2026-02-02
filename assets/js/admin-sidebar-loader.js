/**
 * Admin Sidebar Loader
 * Fetches and injects the sidebar into the page.
 */

async function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    try {
        // 1. Get Supabase client
        let supabaseClient = window.supabaseClient;
        if (!supabaseClient) {
            try {
                const mod = await import('/assets/js/supabase-client.js');
                supabaseClient = mod.supabase;
            } catch (e) {
                // Fallback for local servers that don't serve from root
                const mod = await import('./supabase-client.js');
                supabaseClient = mod.supabase;
            }
        }

        // 2. Auth Check & Role Fetching
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const ROLES_KEY = 'admin_roles_config';
        const REGISTRY_KEY = 'admin_users_registry';

        const { data: dRoles, error: eRoles } = await supabaseClient.from('site_content').select('value').eq('key', ROLES_KEY).maybeSingle();
        const { data: dRegistry, error: eRegistry } = await supabaseClient.from('site_content').select('value').eq('key', REGISTRY_KEY).maybeSingle();

        if (eRoles?.status === 406 || eRegistry?.status === 406) {
            window.showAlert("Supabase Project Paused. Please go to Supabase dashboard to unpause it.", "error");
            return;
        }

        let rolesConfig = {};
        try { rolesConfig = dRoles ? JSON.parse(dRoles.value) : {}; } catch (e) { }

        // Default roles if none exist
        if (!rolesConfig || Object.keys(rolesConfig).length === 0) {
            rolesConfig = {
                'super_admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-hr', 'nav-taxi-portal'] },
                'admin': { permissions: ['nav-dashboard', 'nav-enquiries', 'nav-bookings', 'nav-insurance', 'nav-sales', 'nav-accounts', 'nav-email-config', 'nav-manage-images', 'nav-manage-booking-site', 'nav-manage-fleet', 'nav-manage-destinations', 'nav-announcements', 'nav-taxi-portal'] },
                'taxi_driver': { permissions: ['nav-dashboard', 'nav-taxi-portal'] }
            };
        }

        let userRegistry = [];
        try { userRegistry = dRegistry ? JSON.parse(dRegistry.value) : []; } catch (e) { }

        const userEntry = userRegistry.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        // If registry is empty, treat the first user as super_admin to allow setup
        const userRole = userEntry?.role || user.user_metadata?.role || (userRegistry.length === 0 ? 'super_admin' : 'admin');

        // 3. Fetch & Inject Sidebar
        const response = await fetch('components/sidebar.html');
        if (!response.ok) throw new Error('Failed to fetch sidebar');
        const html = await response.text();
        sidebarContainer.innerHTML = html;

        // Map pages to nav IDs
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const pageMap = {
            'dashboard.html': 'nav-dashboard',
            'bookings.html': 'nav-bookings',
            'insurance.html': 'nav-insurance',
            'enquiries.html': 'nav-enquiries',
            'sales.html': 'nav-sales',
            'accounts.html': 'nav-accounts',
            'email-config.html': 'nav-email-config',
            'manage-images.html': 'nav-manage-images',
            'manage-booking-site.html': 'nav-manage-booking-site',
            'manage-fleet.html': 'nav-manage-fleet',
            'manage-destinations.html': 'nav-manage-destinations',
            'taxi-portal.html': 'nav-taxi-portal',
            'announcements.html': 'nav-announcements',
            'public-announcements.html': 'nav-public-announcements',
            'hr.html': 'nav-hr'
        };

        // 4. Sidebar Filtering (RBAC)
        const isSuperAdmin = userRole === 'super_admin';
        const allowedNavs = rolesConfig[userRole]?.permissions || [];

        // If we have no rolesConfig at all (not even defaults), show everything
        const showAll = !rolesConfig || Object.keys(rolesConfig).length === 0;

        document.querySelectorAll('.nav-link[id]').forEach(link => {
            const navId = link.id;

            // ALWAYS show the link for the page we are currently on to avoid confusing UI
            const isCurrentPage = (pageMap[page] === navId);

            if (!showAll && !isSuperAdmin && !allowedNavs.includes(navId) && !isCurrentPage) {
                link.closest('.nav-item').style.display = 'none';
            }
        });

        // 5. Inject Footer
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !document.querySelector('.admin-footer')) {
            const footer = document.createElement('footer');
            footer.className = 'admin-footer';
            footer.innerHTML = `Powered by <a href="https://www.gridify.in" target="_blank" style="text-decoration: none;"><span>GRIDIFY</span></a>`;
            mainContent.appendChild(footer);
        }

        // 6. Set Active State
        const activeId = pageMap[page] || 'nav-dashboard';
        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            activeLink.classList.add('active');
        }

        // 7. Update Topbar User Info
        const nameEl = document.querySelector('.user-name');
        const roleEl = document.querySelector('.user-role');
        const avatarEl = document.querySelector('.avatar');

        if (nameEl && roleEl && avatarEl) {
            // Get name from metadata or use email prefix
            let name = user.user_metadata?.full_name || user.email.split('@')[0];

            // If it's a generic admin email, keep it simple
            if (name.toLowerCase() === 'admin') name = 'Admin';

            nameEl.innerText = name.toUpperCase();
            roleEl.innerText = userRole.replace('_', ' ').toUpperCase();
            avatarEl.innerText = name.charAt(0).toUpperCase();


            // 8. Make Profile Clickable
            const userProfile = document.querySelector('.user-profile');
            if (userProfile) {
                // Style for pointer cursor on non-button elements
                userProfile.querySelectorAll('.user-info, .avatar').forEach(el => {
                    el.style.cursor = 'pointer';
                });

                userProfile.addEventListener('click', (e) => {
                    // Only redirect if NOT clicking the logout button or its icon
                    if (!e.target.closest('button')) {
                        window.location.href = 'profile.html';
                    }
                });
            }

            // 9. Init Mobile Sidebar
            initMobileSidebar();

        }

    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Global Logout function (shared across pages)
window.handleLogout = async () => {
    if (window.supabaseClient) {
        const { error } = await window.supabaseClient.auth.signOut();
        if (!error) window.location.href = 'login.html';
    } else {
        try {
            const mod = await import('/assets/js/supabase-client.js');
            const { error } = await mod.supabase.auth.signOut();
            if (!error) window.location.href = 'login.html';
        } catch (e) {
            const mod = await import('./supabase-client.js');
            const { error } = await mod.supabase.auth.signOut();
            if (!error) window.location.href = 'login.html';
        }
    }
};

/**
 * Inactivity Auto-Logout (30 Minutes)
 */
function setupInactivityTimer() {
    const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    let timeoutId;

    const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            console.log("Inactivity limit reached. Logging out...");
            window.handleLogout();
        }, INACTIVITY_LIMIT);
    };

    // Events to track user activity
    const activityEvents = [
        'mousedown', 'mousemove', 'keypress',
        'scroll', 'touchstart', 'click'
    ];

    // Throttle event listener to improve performance
    let lastActivity = Date.now();
    const handleActivity = () => {
        const now = Date.now();
        if (now - lastActivity > 1000) { // Only reset if 1 second has passed
            lastActivity = now;
            resetTimer();
        }
    };

    activityEvents.forEach(event => {
        document.addEventListener(event, handleActivity, true);
    });

    // Initial start
    resetTimer();
}

/**
 * In-Portal Alert System (Toast)
 * Replaces native browser alert()
 */
window.showAlert = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-alert ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle',
        warning: 'fas fa-exclamation-triangle'
    };

    toast.innerHTML = `
        <i class="toast-icon ${icons[type] || icons.info}"></i>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// Override native alert if possible (optional but helpful)
// window.alert = (msg) => window.showAlert(msg);

/**
 * Custom Confirmation Component
 * Replaces native confirm()
 */
window.showConfirm = (title, message) => {
    return new Promise((resolve) => {
        let overlay = document.querySelector('.confirm-modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal">
                    <div class="confirm-title"></div>
                    <div class="confirm-message"></div>
                    <div class="confirm-actions">
                        <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                        <button class="confirm-btn confirm-btn-confirm">Confirm</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = overlay.querySelector('.confirm-title');
        const msgEl = overlay.querySelector('.confirm-message');
        const cancelBtn = overlay.querySelector('.confirm-btn-cancel');
        const confirmBtn = overlay.querySelector('.confirm-btn-confirm');

        titleEl.innerText = title;
        msgEl.innerText = message;

        const handleAction = (result) => {
            overlay.classList.remove('show');
            // Remove listeners to prevent memory leaks and multiple triggers
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            setTimeout(() => resolve(result), 300);
        };

        confirmBtn.onclick = () => handleAction(true);
        cancelBtn.onclick = () => handleAction(false);

        overlay.classList.add('show');
    });
};

/**
 * Mobile Sidebar Logic
 */
function initMobileSidebar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;

    // Check Duplicate
    if (document.querySelector('.mobile-nav-toggle')) return;

    // Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-nav-toggle';
    toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
    toggleBtn.setAttribute('aria-label', 'Toggle Sidebar');

    // Prepend to Topbar
    topbar.insertBefore(toggleBtn, topbar.firstChild);

    // Create Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    function closeSidebar() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    function openSidebar() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebar.classList.contains('active')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    overlay.addEventListener('click', closeSidebar);

    // Close on link click (only on mobile)
    sidebar.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 991) {
                closeSidebar();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSidebar();
    setupInactivityTimer();
});
