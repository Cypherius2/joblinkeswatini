// --- MODULE FOR HEADER/NAVIGATION LOGIC ---
const headerModule = {
    async init() {
        this.token = localStorage.getItem('token');
        this.cacheDOMElements();
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
                showNotification('You have been signed out.', 'success');
                const currentPath = window.location.pathname;
                if (currentPath.includes('/pages/')) {
                    window.location.href = 'login.html';
                } else {
                    window.location.href = 'pages/login.html';
                }
            });
        }
    },

    async renderLoggedInState() {
        if (!this.loggedOutNav || !this.loggedInNav) return;
        this.loggedOutNav.style.display = 'none';
        this.loggedInNav.style.display = 'flex';

        try {
            const response = await fetch(`${API_URL}/api/users/me`, { headers: { 'x-auth-token': this.token } });
            if (!response.ok) throw new Error('Token invalid');
            const user = await response.json();

            if (this.navProfilePic) {
                const currentPath = window.location.pathname;
                const localPlaceholder = currentPath.includes('/pages/') ? '../assets/placeholder.svg' : 'assets/placeholder.svg';
                this.navProfilePic.src = (user.profilePicture && user.profilePicture.filename) 
                    ? `${API_URL}/api/files/${user.profilePicture.filename}` 
                    : localPlaceholder;
            }

            if (this.connectLink) {
                const currentPath = window.location.pathname;
                const isInPages = currentPath.includes('/pages/');
                if (user.role === 'company') {
                    this.connectLink.href = isInPages ? 'connect.html' : 'pages/connect.html';
                    this.connectLink.querySelector('span').textContent = 'Connect';
                } else {
                    this.connectLink.href = isInPages ? 'my-network.html' : 'pages/my-network.html';
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
        if (!this.loggedOutNav || !this.loggedInNav) return;
        this.loggedOutNav.style.display = 'flex';
        this.loggedInNav.style.display = 'none';
    }
};

// --- MODULE FOR GLOBAL CHAT LOGIC ---
const chatModule = {
    init() {
        this.token = localStorage.getItem('token');
        if (!this.token) return;

        this.cacheDOMElements();
        if (!this.chatContainer) return;

        this.chatContainer.style.display = 'block';
        this.addEventListeners();
        this.fetchLoggedInUserId();
        this.showConversationListView();
        this.startNotificationPolling();
    },

    cacheDOMElements() {
        this.chatContainer = document.getElementById('global-chat-container');
        this.chatBubble = document.getElementById('chat-bubble');
        this.chatWindow = document.getElementById('chat-window');
        this.chatHeaderTitle = document.getElementById('chat-header-title');
        this.chatBackBtn = document.getElementById('chat-back-btn');
        this.conversationList = document.getElementById('chat-conversation-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.messagingNotificationDot = document.getElementById('messaging-notification-dot');
        this.chatNotificationDot = document.getElementById('chat-notification-dot');
    },

    addEventListeners() {
        if (this.chatBubble) this.chatBubble.addEventListener('click', () => {
            this.chatWindow.classList.toggle('is-open');
            if (this.chatWindow.classList.contains('is-open') && this.conversationList.style.display === 'block') {
                this.showConversationListView();
            }
        });
        if (this.chatBackBtn) this.chatBackBtn.addEventListener('click', () => this.showConversationListView());

        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('message-user-btn')) {
                event.preventDefault();
                this.openChat(event.target.dataset.userid, event.target.dataset.username);
            }
        });

        if (this.conversationList) {
            this.conversationList.addEventListener('click', (event) => {
                const conversationItem = event.target.closest('.conversation-item');
                if (conversationItem) {
                    this.openChat(conversationItem.dataset.userid, conversationItem.dataset.username);
                }
            });
        }

        if (this.chatForm) {
            this.chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const content = this.chatInput.value.trim();
                if (!content || !this.currentReceiverId) return;
                try {
                    await fetch(`${API_URL}/api/messages/${this.currentReceiverId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': this.token }, body: JSON.stringify({ content }) });
                    this.chatInput.value = '';
                    this.openChat(this.currentReceiverId, this.currentReceiverName);
                } catch (err) { console.error("Failed to send message", err); }
            });
        }
    },

    async fetchLoggedInUserId() {
        try {
            const res = await fetch(`${API_URL}/api/users/me`, { headers: { 'x-auth-token': this.token } });
            const me = await res.json();
            this.loggedInUserId = me._id;
        } catch (err) { console.error("Could not fetch user ID for chat", err); }
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
                this.updateTotalNotificationUI(data.unreadCount);
            }
        } catch (err) { console.error("Notification poll failed:", err); }
    },

    updateTotalNotificationUI(count) {
        const dots = [this.messagingNotificationDot, this.chatNotificationDot];
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
    },

    async showConversationListView() {
        this.currentReceiverId = null;
        if (this.chatHeaderTitle) this.chatHeaderTitle.textContent = 'Messages';
        if (this.chatBackBtn) this.chatBackBtn.style.display = 'none';
        if (this.chatMessages) this.chatMessages.style.display = 'none';
        if (this.chatForm) this.chatForm.style.display = 'none';
        if (this.conversationList) {
            this.conversationList.style.display = 'block';
            this.conversationList.innerHTML = '<p>Loading conversations...</p>';
        }
        try {
            const res = await fetch(`${API_URL}/api/messages/conversations`, { headers: { 'x-auth-token': this.token } });
            const conversations = await res.json();
            this.renderConversationList(conversations);
        } catch (err) { if (this.conversationList) this.conversationList.innerHTML = '<p>Could not load conversations.</p>'; }
    },

    async openChat(userId, userName) {
        this.currentReceiverId = userId;
        this.currentReceiverName = userName;
        if (this.chatHeaderTitle) this.chatHeaderTitle.textContent = `Chat with ${userName}`;
        if (this.chatBackBtn) this.chatBackBtn.style.display = 'block';
        if (this.conversationList) this.conversationList.style.display = 'none';
        if (this.chatMessages) this.chatMessages.style.display = 'flex';
        if (this.chatForm) this.chatForm.style.display = 'flex';
        if (this.chatMessages) this.chatMessages.innerHTML = '<p>Loading messages...</p>';
        if (this.chatWindow) this.chatWindow.classList.add('is-open');
        try {
            const res = await fetch(`${API_URL}/api/messages/conversation/${userId}`, { headers: { 'x-auth-token': this.token } });
            const messages = await res.json();
            this.renderMessages(messages);
            this.checkForNewMessages();
        } catch (err) { if (this.chatMessages) this.chatMessages.innerHTML = '<p>Could not load messages.</p>'; }
    },

    renderConversationList(conversations) {
        if (!this.conversationList) return;
        if (!conversations || conversations.length === 0) {
            this.conversationList.innerHTML = '<p>No conversations yet. Message a user from their profile to start!</p>';
            return;
        }
        this.conversationList.innerHTML = conversations.map(convo => {
            const unreadDot = convo.unreadCount > 0 ? `<span class.notification-badge" style="display:flex; position:static; margin-left:auto;">${convo.unreadCount}</span>` : '';
            return `
                <div class="conversation-item" data-userid="${convo.withUser._id}" data-username="${convo.withUser.name}">
                    <img src="${(convo.withUser.profilePicture && convo.withUser.profilePicture.filename) ? `${API_URL}/api/files/${convo.withUser.profilePicture.filename}` : (window.location.pathname.includes('/pages/') ? '../assets/placeholder.svg' : 'assets/placeholder.svg')}" alt="${convo.withUser.name}">
                    <div class="conversation-item-info"><h4>${convo.withUser.name}</h4><p>${convo.lastMessage}</p></div>
                    ${unreadDot}
                </div>
            `;
        }).join('');
    },

    renderMessages(messages) {
        if (!this.chatMessages) return;
        this.chatMessages.innerHTML = messages.map(msg => `
            <div style="text-align: ${msg.sender === this.loggedInUserId ? 'right' : 'left'};"><p style="background-color:${msg.sender === this.loggedInUserId ? '#eef2f9' : '#f0fdf4'}; padding:10px; border-radius:10px; display:inline-block;">${msg.content}</p></div>
        `).join('');
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
};

// --- MODULE FOR MOBILE MENU LOGIC ---
const mobileMenuModule = {
    init() {
        this.mainNav = document.getElementById('main-nav');
        this.mobileMenuButton = document.getElementById('mobile-menu-button');
        if (this.mobileMenuButton && this.mainNav) {
            this.mobileMenuButton.addEventListener('click', () => {
                this.mainNav.classList.toggle('is-open');
            });
        }
    }
};

// --- NOTIFICATION MODULE ---
const notificationModule = {
    showNotification(message, type = 'success') {
        try {
            // Remove any existing notifications
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notif => notif.remove());

            // Check if we have a notification container
            let container = document.getElementById('notification-container');
            if (!container) {
                // Create container if it doesn't exist
                container = document.createElement('div');
                container.id = 'notification-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                `;
                document.body.appendChild(container);
            }

            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            
            // Determine colors based on theme and type
            const isDarkTheme = document.body.classList.contains('dark-theme');
            let bgColor, textColor, borderColor;
            
            if (type === 'error') {
                if (isDarkTheme) {
                    bgColor = '#dc3545';
                    textColor = '#ffffff';
                    borderColor = '#c82333';
                } else {
                    bgColor = '#f8d7da';
                    textColor = '#721c24';
                    borderColor = '#f5c6cb';
                }
            } else { // success
                if (isDarkTheme) {
                    bgColor = '#28a745';
                    textColor = '#ffffff';
                    borderColor = '#1e7e34';
                } else {
                    bgColor = '#d4edda';
                    textColor = '#155724';
                    borderColor = '#c3e6cb';
                }
            }

            // Set notification content and styles
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close" type="button">&times;</button>
                </div>
            `;

            notification.style.cssText = `
                background-color: ${bgColor};
                color: ${textColor};
                border: 1px solid ${borderColor};
                border-left: 5px solid ${borderColor};
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: 'Poppins', sans-serif;
                font-size: 14px;
                font-weight: 500;
                min-width: 300px;
                max-width: 400px;
                animation: slideInFromRight 0.3s ease-out;
                opacity: 0;
            `;

            // Style the content
            const content = notification.querySelector('.notification-content');
            content.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            `;

            // Style and setup the close button
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                color: inherit;
                opacity: 0.8;
                padding: 0;
                margin: 0;
                line-height: 1;
            `;
            
            closeBtn.addEventListener('click', () => {
                notification.style.animation = 'slideOutToRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            });
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.8');

            // Add animation styles if not already present
            if (!document.querySelector('style[data-notification-animations]')) {
                const style = document.createElement('style');
                style.setAttribute('data-notification-animations', 'true');
                style.textContent = `
                    @keyframes slideInFromRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes slideOutToRight {
                        from {
                            transform: translateX(0);
                            opacity: 1;
                        }
                        to {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Add to container
            container.appendChild(notification);
            
            // Trigger animation
            setTimeout(() => {
                notification.style.opacity = '1';
            }, 10);

            // Auto remove after 4 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutToRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 4000);
            
        } catch (error) {
            console.error('Error showing notification:', error);
            // Fallback to console if notification system fails
            console.error('Notification system failed:', message);
        }
    }
};

// Make showNotification globally available
window.showNotification = notificationModule.showNotification;

// --- INITIALIZE EVERYTHING WHEN THE PAGE LOADS ---
document.addEventListener('DOMContentLoaded', () => {
    headerModule.init();
    chatModule.init();
    mobileMenuModule.init();
});
