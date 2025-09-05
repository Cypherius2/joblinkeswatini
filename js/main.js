// js/main.js -- FINAL, COMPLETE, AND CORRECTED VERSION
// --- THIS IS THE MISSING GLOBAL NOTIFICATION FUNCTION ---
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) {
        // Fallback to alert if the container is missing for any reason
        console.error('Notification container not found. Falling back to alert.');
        alert(message);
        return;
    }
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500); // Animation duration
    }, 4000); // Time visible
}
// --- MODULE FOR HEADER/NAVIGATION LOGIC (DESKTOP) ---
const headerModule = {
    async init() {
        this.token = localStorage.getItem('token');
        this.cacheDOMElements();
        if (!this.loggedInNav) return; // Exit if header elements aren't on the page

        this.setupEventListeners();
        if (this.token) {
            await this.renderLoggedInState();
        } else {
            this.renderLoggedOutState();
        }
    },

    cacheDOMElements() {
        this.loggedOutNav = document.getElementById('loggedOutNav');
        this.loggedInNav = document.getElementById('loggedInNav');
        this.navProfilePic = document.getElementById('navProfilePic');
        this.connectLink = document.getElementById('connectLink');
        this.profileDropdownMenu = document.getElementById('profileDropdownMenu');
    },

    setupEventListeners() {
        if (this.loggedInNav) {
            this.loggedInNav.addEventListener('click', (event) => {
                event.stopPropagation();
                if (this.profileDropdownMenu) this.profileDropdownMenu.classList.toggle('is-open');
            });
        }
        window.addEventListener('click', () => {
            if (this.profileDropdownMenu && this.profileDropdownMenu.classList.contains('is-open')) {
                this.profileDropdownMenu.classList.remove('is-open');
            }
        });
        const signOutBtn = document.getElementById('signOutBtn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                showNotification('You have been signed out.');
                setTimeout(() => window.location.href = 'login.html', 1500);
            });
        }
    },

    async renderLoggedInState() {
        this.loggedOutNav.style.display = 'none';
        this.loggedInNav.style.display = 'flex';
        try {
            const response = await fetch(`${API_URL}/api/users/me`, { headers: { 'x-auth-token': this.token } });
            if (!response.ok) throw new Error('Token invalid');
            const user = await response.json();

            if (this.navProfilePic) {
                this.navProfilePic.src = user.profilePicture || 'images/placeholder.svg';
            }

            if (this.connectLink) {
                if (user.role === 'company') {
                    this.connectLink.href = 'connect.html';
                    this.connectLink.querySelector('span').textContent = 'Connect';
                } else {
                    this.connectLink.href = 'my-network.html';
                    this.connectLink.querySelector('span').textContent = 'My Network';
                }
            }
        } catch (error) {
            console.error('Auth check failed for header:', error);
            localStorage.removeItem('token');
            this.renderLoggedOutState();
        }
    },

    renderLoggedOutState() {
        if (this.loggedOutNav) this.loggedOutNav.style.display = 'flex';
        if (this.loggedInNav) this.loggedInNav.style.display = 'none';
    }
};

// --- MODULE FOR MOBILE BOTTOM NAVIGATION LOGIC ---
const mobileNavModule = {
    async init() {
        this.token = localStorage.getItem('token');
        if (!this.token) return; // Don't run if not logged in

        this.cacheDOMElements();
        if (!this.mobileNav) return;

        await this.renderMobileState();
    },
    cacheDOMElements() {
        this.mobileNav = document.getElementById('mobile-bottom-nav');
        this.mobileProfilePic = document.getElementById('mobileProfilePic');
        this.mobileConnectLink = document.getElementById('mobileConnectLink');
        this.mobileConnectText = document.getElementById('mobileConnectText');
    },
    async renderMobileState() {
        try {
            const response = await fetch(`${API_URL}/api/users/me`, { headers: { 'x-auth-token': this.token } });
            if (!response.ok) throw new Error('Token invalid');
            const user = await response.json();

            if (this.mobileProfilePic) {
                this.mobileProfilePic.src = user.profilePicture || 'images/placeholder.svg';
            }

            if (this.mobileConnectLink) {
                if (user.role === 'company') {
                    this.mobileConnectLink.href = 'connect.html';
                    this.mobileConnectText.textContent = 'Connect';
                } else {
                    this.mobileConnectLink.href = 'my-network.html';
                    this.mobileConnectText.textContent = 'My Network';
                }
            }
        } catch (error) {
            console.error('Auth check failed for mobile nav:', error);
        }
    }
};

// --- MODULE FOR GLOBAL NOTIFICATIONS ---
const notificationModule = {
    init() {
        this.token = localStorage.getItem('token');
        if (!this.token) return;
        this.cacheDOMElements();
        this.startNotificationPolling();
    },
    cacheDOMElements() {
        this.messagingDot = document.getElementById('messaging-notification-dot');
        this.mobileMessagingDot = document.getElementById('mobile-messaging-dot');
    },
    startNotificationPolling() {
        this.checkForNewMessages();
        setInterval(() => this.checkForNewMessages(), 20000);
    },
    async checkForNewMessages() {
        if (!this.token) return;
        try {
            const res = await fetch(`${API_URL}/api/messages/unread-count`, { headers: { 'x-auth-token': this.token } });
            if (res.ok) {
                const data = await res.json();
                this.updateNotificationUI(data.unreadCount);
            }
        } catch (err) { /* Silently fail poll */ }
    },
    updateNotificationUI(count) {
        const dots = [this.messagingDot, this.mobileMessagingDot];
        dots.forEach(dot => {
            if (dot) {
                if (count > 0) {
                    dot.style.display = 'flex';
                    dot.textContent = count > 9 ? '9+' : count;
                } else {
                    dot.style.display = 'none';
                }
            }
        });
    }
};

// --- GLOBAL "MESSAGE" BUTTON TRIGGER ---
// This module's only job is to redirect to the message center
const messageTriggerModule = {
    init() {
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('message-user-btn')) {
                event.preventDefault();
                const userId = event.target.dataset.userid;
                const userName = event.target.dataset.username;
                const userPic = event.target.closest('.profile-info')?.querySelector('img')?.src || 'images/placeholder.svg';

                localStorage.setItem('startChatWithId', userId);
                localStorage.setItem('startChatWithName', userName);
                localStorage.setItem('startChatWithPic', userPic);

                window.location.href = 'message-center.html';
            }
        });
    }
};

// --- INITIALIZE ALL MODULES WHEN THE PAGE LOADS ---
document.addEventListener('DOMContentLoaded', () => {
    headerModule.init();
    mobileNavModule.init();
    notificationModule.init();
    messageTriggerModule.init();
});