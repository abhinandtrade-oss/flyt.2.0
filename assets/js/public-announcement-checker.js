/**
 * Public Announcements Component
 * Fetches and displays announcements for the public page (index.html).
 */

import { supabase } from './supabase-client.js';

async function checkPublicAnnouncements() {
    try {
        // 1. Fetch active announcements specifically marked for 'public'
        const now = new Date().toISOString();
        const { data: announcements, error } = await supabase
            .from('announcements')
            .select('*')
            .lte('start_date', now)
            .gte('end_date', now)
            .contains('target_roles', ['public'])
            .order('created_at', { ascending: false });

        if (error || !announcements || announcements.length === 0) return;

        // 2. Queue up announcements to show one after another
        window.publicAnnouncementQueue = announcements;
        showNextPublicAnnouncement();
    } catch (err) {
        console.error('Error in public announcement checker:', err);
    }
}

function showNextPublicAnnouncement() {
    if (!window.publicAnnouncementQueue || window.publicAnnouncementQueue.length === 0) return;

    const nextAnc = window.publicAnnouncementQueue.shift();
    displayPublicAnnouncementPopup(nextAnc);
}

function displayPublicAnnouncementPopup(anc) {
    // Create modal structure if not exists (using Bootstrap which is already in index.html)
    let modalEl = document.getElementById('publicAnnouncementModal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'publicAnnouncementModal';
        modalEl.className = 'modal fade';
        modalEl.setAttribute('tabindex', '-1');
        modalEl.setAttribute('data-bs-backdrop', 'static');
        modalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                    <div class="modal-body p-0">
                        <button type="button" class="btn-close position-absolute end-0 top-0 m-3 z-3" data-bs-dismiss="modal" style="background-color: white; padding: 10px; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.1); border: none;"></button>
                        <div id="publicAnnouncementBody"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);

        modalEl.addEventListener('hidden.bs.modal', function () {
            showNextPublicAnnouncement();
        });
    }

    const bodyContainer = document.getElementById('publicAnnouncementBody');

    if (!document.getElementById('public-announcement-styles')) {
        const style = document.createElement('style');
        style.id = 'public-announcement-styles';
        style.textContent = `
            .public-popup-content {
                padding: 40px 30px;
                background: #fff;
                text-align: center;
            }
            .public-popup-icon {
                width: 60px;
                height: 60px;
                background: rgba(var(--jetly-base-rgb, 232, 96, 76), 0.1);
                color: var(--jetly-base, #e8604c);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                margin: 0 auto 20px;
            }
            .public-popup-subject {
                font-weight: 700;
                color: #222;
                margin-bottom: 15px;
            }
            .public-popup-message {
                color: #666;
                font-size: 0.95rem;
                line-height: 1.6;
                margin-bottom: 25px;
            }
            .public-popup-poster {
                width: 100%;
                display: block;
                cursor: pointer;
            }
            .btn-public-anc {
                background: var(--jetly-base, #e8604c);
                color: white;
                padding: 12px 25px;
                border-radius: 8px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
                transition: 0.3s;
                border: none;
            }
            .btn-public-anc:hover {
                background: #333;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    if (anc.poster_url) {
        bodyContainer.innerHTML = `
            <img src="${anc.poster_url}" class="public-popup-poster" alt="Announcement" 
                 onclick="${anc.redirect_url ? `window.open('${anc.redirect_url}', '_blank')` : ''}">
        `;
    } else {
        bodyContainer.innerHTML = `
            <div class="public-popup-content">
                <div class="public-popup-icon">
                    <i class="fas fa-bullhorn"></i>
                </div>
                <h3 class="public-popup-subject">${anc.subject}</h3>
                <p class="public-popup-message">${anc.body}</p>
                ${anc.redirect_url ? `
                    <a href="${anc.redirect_url}" target="_blank" class="btn-public-anc">
                        View Details <i class="fas fa-external-link-alt ms-2"></i>
                    </a>
                ` : `
                    <button class="btn-public-anc" data-bs-dismiss="modal">Dismiss</button>
                `}
            </div>
        `;
    }

    // Using window.bootstrap as index.html loads it
    if (window.bootstrap) {
        const bootstrapModal = new window.bootstrap.Modal(modalEl);
        bootstrapModal.show();
    }
}

// Start checking
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPublicAnnouncements);
} else {
    checkPublicAnnouncements();
}
