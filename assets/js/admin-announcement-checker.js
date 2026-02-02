/**
 * Admin Announcements Component
 * Fetches and displays announcements based on user role and date.
 */

import { supabase } from './supabase-client.js';

async function checkAnnouncements() {
    // ONLY display on dashboard
    const path = window.location.pathname;
    const isDashboard = path.endsWith('dashboard.html') || path.endsWith('dashboard') || (path.endsWith('/admin/') || path.endsWith('/admin'));

    if (!isDashboard) return;

    try {
        // 1. Get current user and role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const REGISTRY_KEY = 'admin_users_registry';
        const { data: registryData } = await supabase.from('site_content').select('value').eq('key', REGISTRY_KEY).maybeSingle();

        let registry = [];
        try { registry = registryData ? JSON.parse(registryData.value) : []; } catch (e) { }

        const userEntry = registry.find(u => u.email.toLowerCase() === user.email.toLowerCase());
        const userRole = userEntry?.role || user.user_metadata?.role || (registry.length === 0 ? 'super_admin' : 'admin');

        // 2. Fetch active announcements
        const now = new Date().toISOString();
        const { data: announcements, error } = await supabase
            .from('announcements')
            .select('*')
            .lte('start_date', now)
            .gte('end_date', now)
            .order('created_at', { ascending: false });

        if (error) return;

        // 3. Strict Filter by role
        const filteredAnnouncements = announcements.filter(anc => {
            const hasRole = Array.isArray(anc.target_roles) && anc.target_roles.includes(userRole);
            const isSuper = userRole === 'super_admin';
            return hasRole || isSuper;
        });

        if (filteredAnnouncements.length > 0) {
            // Queue up announcements to show one after another
            window.announcementQueue = filteredAnnouncements;
            showNextAnnouncement();
        }
    } catch (err) {
        console.error('Error in announcement checker:', err);
    }
}

function showNextAnnouncement() {
    if (!window.announcementQueue || window.announcementQueue.length === 0) return;

    const nextAnc = window.announcementQueue.shift();
    displayAnnouncementPopup(nextAnc);
}

function displayAnnouncementPopup(anc) {
    // Create modal structure if not exists
    let modalEl = document.getElementById('announcementPopupModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'announcementPopupModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.setAttribute('data-bs-backdrop', 'static'); // Prevent clicking outside
        modalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                    <div class="modal-body p-0">
                        <button type="button" class="btn-close position-absolute end-0 top-0 m-3 z-3" data-bs-dismiss="modal" style="background-color: white; padding: 10px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"></button>
                        <div id="announcementPopupBody"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);

        // Listen for when modal is closed to show the next one
        modalEl.addEventListener('hidden.bs.modal', function () {
            showNextAnnouncement();
        });
    }

    const bodyContainer = document.getElementById('announcementPopupBody');

    // Premium styling for the popup content
    if (!document.getElementById('announcement-popup-styles')) {
        const style = document.createElement('style');
        style.id = 'announcement-popup-styles';
        style.textContent = `
            .popup-text-content {
                padding: 40px 30px;
                background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                text-align: center;
            }
            .popup-icon-wrapper {
                width: 70px;
                height: 70px;
                background: rgba(232, 96, 76, 0.1);
                color: #e8604c;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2rem;
                margin: 0 auto 20px;
            }
            .popup-subject {
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 15px;
                font-size: 1.5rem;
            }
            .popup-message {
                color: #64748b;
                font-size: 1rem;
                line-height: 1.6;
                margin-bottom: 25px;
            }
            .popup-poster {
                width: 100%;
                display: block;
                cursor: pointer;
                transition: transform 0.3s;
            }
            .popup-poster:hover {
                transform: scale(1.01);
            }
            .btn-popup-action {
                background: #e8604c;
                color: white;
                padding: 12px 30px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
                transition: 0.3s;
                border: none;
            }
            .btn-popup-action:hover {
                background: #d44d3a;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(232, 96, 76, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    if (anc.poster_url) {
        bodyContainer.innerHTML = `
            <img src="${anc.poster_url}" class="popup-poster" alt="Announcement"
                 onclick="${anc.redirect_url ? `window.open('${anc.redirect_url}', '_blank')` : ''}">
        `;
    } else {
        bodyContainer.innerHTML = `
            <div class="popup-text-content">
                <div class="popup-icon-wrapper">
                    <i class="fas fa-bullhorn"></i>
                </div>
                <h3 class="popup-subject">${anc.subject}</h3>
                <p class="popup-message">${anc.body}</p>
                <div class="d-flex flex-column gap-2 align-items-center">
                    ${anc.redirect_url ? `
                        <a href="${anc.redirect_url}" target="_blank" class="btn-popup-action">
                            View Details <i class="fas fa-external-link-alt ms-2"></i>
                        </a>
                    ` : ''}
                    <button class="btn btn-link text-muted text-decoration-none small" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        `;
    }

    // Initialize and show modal
    const bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();
}

// Initial Call
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAnnouncements);
} else {
    checkAnnouncements();
}
