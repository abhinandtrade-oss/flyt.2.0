
/**
 * GDPR Consent Management Logic
 * Fly Light Tours and Travels
 */

(function () {
    const STORAGE_KEY = 'fltt_consent_v1';

    const defaultConsent = {
        necessary: true,
        analytics: false,
        marketing: false,
        functional: false,
        timestamp: null
    };

    window.GDPR = {
        consent: JSON.parse(localStorage.getItem(STORAGE_KEY)) || null,

        init: function () {
            this.injectStyles();
            this.injectBanner();
            this.checkAndExecute();

            if (!this.consent) {
                setTimeout(() => {
                    document.getElementById('gdprBanner').classList.add('active');
                }, 1000);
            }
        },

        injectStyles: function () {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'assets/css/gdpr-banner.css';
            document.head.appendChild(link);
        },

        injectBanner: function () {
            const bannerHtml = `
                <div id="gdprBanner" class="gdpr-banner">
                    <h3>Cookie Preferences</h3>
                    <p>We use cookies to enhance your experience, analyze site traffic, and serve better content. By clicking "Accept All", you consent to our use of all cookies. View our <a href="privacy-policy.html">Privacy Policy</a>.</p>
                    <div class="gdpr-buttons">
                        <button class="gdpr-btn gdpr-btn-accept" onclick="GDPR.acceptAll()">Accept All</button>
                        <button class="gdpr-btn gdpr-btn-reject" onclick="GDPR.rejectAll()">Reject All</button>
                    </div>
                    <button class="gdpr-btn gdpr-btn-settings" onclick="GDPR.showSettings()">Customize Settings</button>
                </div>

                <div id="gdprSettingsOverlay" class="gdpr-settings-overlay">
                    <div class="gdpr-settings-modal">
                        <h2>Cookie Settings</h2>
                        
                        <div class="gdpr-category">
                            <div class="gdpr-cat-info">
                                <h4>Necessary</h4>
                                <p>Essential for the website to function properly.</p>
                            </div>
                            <label class="gdpr-switch">
                                <input type="checkbox" checked disabled>
                                <span class="gdpr-slider"></span>
                            </label>
                        </div>

                        <div class="gdpr-category">
                            <div class="gdpr-cat-info">
                                <h4>Functional</h4>
                                <p>Personalization, Google Maps, and video preferences.</p>
                            </div>
                            <label class="gdpr-switch">
                                <input type="checkbox" id="cat-functional">
                                <span class="gdpr-slider"></span>
                            </label>
                        </div>

                        <div class="gdpr-category">
                            <div class="gdpr-cat-info">
                                <h4>Analytics</h4>
                                <p>Helps us understand how visitors interact with the site.</p>
                            </div>
                            <label class="gdpr-switch">
                                <input type="checkbox" id="cat-analytics">
                                <span class="gdpr-slider"></span>
                            </label>
                        </div>

                        <div class="gdpr-category">
                            <div class="gdpr-cat-info">
                                <h4>Marketing</h4>
                                <p>Used for showing you relevant advertisements.</p>
                            </div>
                            <label class="gdpr-switch">
                                <input type="checkbox" id="cat-marketing">
                                <span class="gdpr-slider"></span>
                            </label>
                        </div>

                        <div class="gdpr-buttons" style="margin-top: 2rem;">
                            <button class="gdpr-btn gdpr-btn-accept" onclick="GDPR.saveCustom()">Save Preferences</button>
                        </div>
                    </div>
                </div>
            `;
            const div = document.createElement('div');
            div.innerHTML = bannerHtml;
            document.body.appendChild(div);
        },

        acceptAll: function () {
            this.setConsent({
                necessary: true,
                analytics: true,
                marketing: true,
                functional: true
            });
        },

        rejectAll: function () {
            this.setConsent({
                necessary: true,
                analytics: false,
                marketing: false,
                functional: false
            });
        },

        showSettings: function () {
            const overlay = document.getElementById('gdprSettingsOverlay');
            overlay.classList.add('active');

            // Set current values
            const current = this.consent || defaultConsent;
            document.getElementById('cat-functional').checked = current.functional;
            document.getElementById('cat-analytics').checked = current.analytics;
            document.getElementById('cat-marketing').checked = current.marketing;
        },

        saveCustom: function () {
            this.setConsent({
                necessary: true,
                functional: document.getElementById('cat-functional').checked,
                analytics: document.getElementById('cat-analytics').checked,
                marketing: document.getElementById('cat-marketing').checked
            });
            document.getElementById('gdprSettingsOverlay').classList.remove('active');
        },

        setConsent: function (consentObj) {
            consentObj.timestamp = new Date().toISOString();
            this.consent = consentObj;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.consent));
            document.getElementById('gdprBanner').classList.remove('active');
            this.checkAndExecute();

            // Reload if necessary to trigger scripts that were blocked
            if (Object.values(consentObj).includes(true)) {
                // Actually, checkAndExecute handles it, but some heavy scripts might need reload
                // For now, we manually trigger the loaders
            }
        },

        checkAndExecute: function () {
            if (!this.consent) return;

            // 1. Load Third Party Scripts
            document.querySelectorAll('script[data-consent-category]').forEach(script => {
                const category = script.getAttribute('data-consent-category');
                if (this.consent[category]) {
                    this.loadScript(script);
                }
            });

            // 2. Load Iframes
            document.querySelectorAll('iframe[data-consent-category]').forEach(iframe => {
                const category = iframe.getAttribute('data-consent-category');
                if (this.consent[category]) {
                    this.loadIframe(iframe);
                } else {
                    this.showIframePlaceholder(iframe);
                }
            });

            // 3. Handle External Stylesheets (e.g. Fonts)
            document.querySelectorAll('link[data-consent-category]').forEach(link => {
                const category = link.getAttribute('data-consent-category');
                if (this.consent[category]) {
                    if (link.dataset.href) {
                        link.href = link.dataset.href;
                    }
                    link.rel = 'stylesheet';
                }
            });
        },

        loadScript: function (scriptEl) {
            if (scriptEl.getAttribute('loaded')) return;

            const newScript = document.createElement('script');
            // Copy attributes
            Array.from(scriptEl.attributes).forEach(attr => {
                if (attr.name !== 'data-consent-category' && attr.name !== 'type') {
                    newScript.setAttribute(attr.name, attr.value);
                }
            });

            if (scriptEl.dataset.src) {
                newScript.src = scriptEl.dataset.src;
            } else {
                newScript.textContent = scriptEl.textContent;
            }

            scriptEl.parentNode.replaceChild(newScript, scriptEl);
            newScript.setAttribute('loaded', 'true');
        },

        loadIframe: function (iframeEl) {
            if (iframeEl.getAttribute('src')) return;
            const src = iframeEl.getAttribute('data-src');
            if (src) {
                iframeEl.setAttribute('src', src);
                // Remove placeholder if exists
                const placeholder = iframeEl.parentNode.querySelector('.consent-placeholder');
                if (placeholder) placeholder.remove();
                iframeEl.style.display = 'block';
            }
        },

        showIframePlaceholder: function (iframeEl) {
            if (iframeEl.parentNode.querySelector('.consent-placeholder')) return;

            iframeEl.style.display = 'none';
            const category = iframeEl.getAttribute('data-consent-category');

            const placeholder = document.createElement('div');
            placeholder.className = 'consent-placeholder';
            placeholder.innerHTML = `
                <p>This content is blocked. Please accept <b>${category}</b> cookies to view it.</p>
                <button class="thm-btn" onclick="GDPR.showSettings()">Manage Cookies</button>
            `;
            iframeEl.parentNode.insertBefore(placeholder, iframeEl);
        }
    };

    // Initialize on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.GDPR.init());
    } else {
        window.GDPR.init();
    }
})();
