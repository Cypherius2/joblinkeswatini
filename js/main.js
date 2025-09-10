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
        this.dropdownUserName = document.getElementById('dropdownUserName');
        this.dropdownUserRole = document.getElementById('dropdownUserRole');
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
                alert('You have been signed out.');
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

            // Populate dropdown user info
            if (this.dropdownUserName) {
                this.dropdownUserName.textContent = user.name || 'User';
            }
            if (this.dropdownUserRole) {
                let roleText = '';
                if (user.role === 'company') {
                    roleText = user.companyName ? `${user.companyName}` : 'Company Account';
                } else {
                    roleText = user.currentPosition || user.headline || 'Professional';
                }
                this.dropdownUserRole.textContent = roleText;
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

        this.chatContainer.classList.add('active');
        this.addEventListeners();
        this.fetchLoggedInUserId();
        this.showConversationListView();
        this.startNotificationPolling();
        this.currentReceiverId = null;
        this.currentReceiverName = null;
    },

    cacheDOMElements() {
        this.chatContainer = document.getElementById('global-chat-container');
        this.chatBubble = document.getElementById('chat-bubble');
        this.chatWindow = document.getElementById('chat-window');
        this.chatHeaderTitle = document.getElementById('chat-header-title');
        this.chatBackBtn = document.getElementById('chat-back-btn');
        this.chatCloseBtn = document.getElementById('chat-close-btn');
        this.conversationList = document.getElementById('chat-conversation-list');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatForm = document.getElementById('chat-form');
        this.chatInput = document.getElementById('chat-input');
        this.messagingNotificationDot = document.getElementById('messaging-notification-dot');
        this.chatNotificationDot = document.getElementById('chat-notification-dot');
    },

    addEventListeners() {
        // Toggle chat window when bubble is clicked
        if (this.chatBubble) {
            this.chatBubble.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleChatWindow();
            });
        }

        // Close chat when close button is clicked
        if (this.chatCloseBtn) {
            this.chatCloseBtn.addEventListener('click', () => {
                this.closeChatWindow();
            });
        }

        // Back to conversation list when back button is clicked
        if (this.chatBackBtn) {
            this.chatBackBtn.addEventListener('click', () => {
                this.showConversationListView();
            });
        }

        // Close chat when clicking outside
        document.addEventListener('click', (event) => {
            if (!this.chatContainer.contains(event.target) && this.chatWindow.classList.contains('is-open')) {
                this.closeChatWindow();
            }

            // Handle message user buttons from other pages
            if (event.target.classList.contains('message-user-btn')) {
                event.preventDefault();
                this.openChat(event.target.dataset.userid, event.target.dataset.username);
            }
        });

        // Handle conversation item clicks
        if (this.conversationList) {
            this.conversationList.addEventListener('click', (event) => {
                const conversationItem = event.target.closest('.conversation-item');
                if (conversationItem) {
                    this.openChat(conversationItem.dataset.userid, conversationItem.dataset.username);
                }
            });
        }

        // Handle message form submission
        if (this.chatForm) {
            this.chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.sendMessage();
            });
        }

        // Handle Enter key in chat input
        if (this.chatInput) {
            this.chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    },

    toggleChatWindow() {
        if (this.chatWindow.classList.contains('is-open')) {
            this.closeChatWindow();
        } else {
            this.openChatWindow();
        }
    },

    openChatWindow() {
        this.chatWindow.classList.add('is-open');
        if (!this.currentReceiverId) {
            this.showConversationListView();
        }
    },

    closeChatWindow() {
        this.chatWindow.classList.remove('is-open');
    },

    async sendMessage() {
        const content = this.chatInput.value.trim();
        if (!content || !this.currentReceiverId) return;

        try {
            // Disable input while sending
            this.chatInput.disabled = true;

            await fetch(`${API_URL}/api/messages/${this.currentReceiverId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': this.token
                },
                body: JSON.stringify({ content })
            });

            this.chatInput.value = '';
            // Refresh the chat to show the new message
            await this.loadMessages(this.currentReceiverId);

        } catch (err) {
            console.error('Failed to send message:', err);
            notificationModule.showNotification('Failed to send message', 'error');
        } finally {
            this.chatInput.disabled = false;
            this.chatInput.focus();
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
                    dot.classList.add('show');
                    dot.textContent = count > 9 ? '9+' : count;
                } else {
                    dot.classList.remove('show');
                    dot.textContent = '';
                }
            }
        });
    },

    async showConversationListView() {
        this.currentReceiverId = null;
        this.currentReceiverName = null;

        // Update header and UI
        if (this.chatHeaderTitle) this.chatHeaderTitle.textContent = 'Messages';
        if (this.chatBackBtn) this.chatBackBtn.style.display = 'none';
        if (this.chatMessages) this.chatMessages.style.display = 'none';
        if (this.chatForm) this.chatForm.style.display = 'none';

        if (this.conversationList) {
            this.conversationList.style.display = 'flex';
            this.conversationList.innerHTML = `
                <div class="chat-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading conversations...</p>
                </div>
            `;
        }

        try {
            const res = await fetch(`${API_URL}/api/messages/conversations`, {
                headers: { 'x-auth-token': this.token }
            });

            if (res.ok) {
                const conversations = await res.json();
                this.renderConversationList(conversations);
            } else {
                throw new Error('Failed to fetch conversations');
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
            if (this.conversationList) {
                this.conversationList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                            </svg>
                        </div>
                        <h4>Could not load conversations</h4>
                        <p>Please try again later.</p>
                    </div>
                `;
            }
        }
    },

    async openChat(userId, userName) {
        this.currentReceiverId = userId;
        this.currentReceiverName = userName;

        // Update header and UI
        if (this.chatHeaderTitle) this.chatHeaderTitle.textContent = `${userName}`;
        if (this.chatBackBtn) this.chatBackBtn.style.display = 'flex';
        if (this.conversationList) this.conversationList.style.display = 'none';
        if (this.chatMessages) this.chatMessages.style.display = 'flex';
        if (this.chatForm) this.chatForm.style.display = 'block';

        // Ensure chat window is open
        if (this.chatWindow) this.chatWindow.classList.add('is-open');

        // Load messages
        await this.loadMessages(userId);

        // Focus on input
        if (this.chatInput) {
            setTimeout(() => this.chatInput.focus(), 100);
        }
    },

    async loadMessages(userId) {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = `
                <div class="loading-messages">
                    <div class="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            `;
        }

        try {
            const res = await fetch(`${API_URL}/api/messages/conversation/${userId}`, {
                headers: { 'x-auth-token': this.token }
            });

            if (res.ok) {
                const messages = await res.json();
                this.renderMessages(messages);
                // Mark messages as read
                this.markAsRead(userId);
                // Update notification count
                this.checkForNewMessages();
            } else {
                throw new Error('Failed to fetch messages');
            }
        } catch (err) {
            console.error('Error loading messages:', err);
            if (this.chatMessages) {
                this.chatMessages.innerHTML = `
                    <div class="messages-empty-state">
                        <div class="empty-message-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                        </div>
                        <p>Could not load messages. Please try again.</p>
                    </div>
                `;
            }
        }
    },

    async markAsRead(userId) {
        try {
            await fetch(`${API_URL}/api/messages/mark-read/${userId}`, {
                method: 'POST',
                headers: { 'x-auth-token': this.token }
            });
        } catch (err) {
            console.error('Failed to mark messages as read:', err);
        }
    },

    renderConversationList(conversations) {
        if (!this.conversationList) return;

        if (!conversations || conversations.length === 0) {
            this.conversationList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                    </div>
                    <h4>No conversations yet</h4>
                    <p>Message someone from their profile to start chatting!</p>
                </div>
            `;
            return;
        }

        this.conversationList.innerHTML = conversations.map(convo => {
            const profilePicSrc = (convo.withUser.profilePicture && convo.withUser.profilePicture.filename)
                ? `${API_URL}/api/files/${convo.withUser.profilePicture.filename}`
                : (window.location.pathname.includes('/pages/') ? '../assets/placeholder.svg' : 'assets/placeholder.svg');

            const unreadBadge = convo.unreadCount > 0
                ? `<span class="notification-badge">${convo.unreadCount > 9 ? '9+' : convo.unreadCount}</span>`
                : '';

            const lastMessage = convo.lastMessage ? this.truncateMessage(convo.lastMessage, 40) : 'No messages yet';

            return `
                <div class="conversation-item" data-userid="${convo.withUser._id}" data-username="${convo.withUser.name}">
                    <img src="${profilePicSrc}" alt="${convo.withUser.name}">
                    <div class="conversation-item-info">
                        <h4>${convo.withUser.name}</h4>
                        <p>${lastMessage}</p>
                    </div>
                    ${unreadBadge}
                </div>
            `;
        }).join('');
    },

    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    },

    renderMessages(messages) {
        if (!this.chatMessages) return;

        if (!messages || messages.length === 0) {
            this.chatMessages.innerHTML = `
                <div class="messages-empty-state">
                    <div class="empty-message-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                        </svg>
                    </div>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        // Group messages by date and render with modern chat bubbles
        let html = '';
        let lastDate = null;

        messages.forEach(msg => {
            const messageDate = new Date(msg.createdAt);
            const currentDate = messageDate.toDateString();

            // Add date divider if date has changed
            if (currentDate !== lastDate) {
                const today = new Date().toDateString();
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                let dateLabel;
                if (currentDate === today) {
                    dateLabel = 'Today';
                } else if (currentDate === yesterday) {
                    dateLabel = 'Yesterday';
                } else {
                    dateLabel = messageDate.toLocaleDateString();
                }

                html += `
                    <div class="message-date-divider">
                        <span>${dateLabel}</span>
                    </div>
                `;
                lastDate = currentDate;
            }

            const isSent = msg.sender === this.loggedInUserId;
            const messageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="message-wrapper ${isSent ? 'sent' : 'received'}">
                    <div class="message-bubble">
                        <div class="message-content">${this.escapeHtml(msg.content)}</div>
                        <div class="message-time">${messageTime}</div>
                    </div>
                </div>
            `;
        });

        this.chatMessages.innerHTML = html;

        // Scroll to bottom
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 50);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

            switch (type) {
                case 'error':
                    if (isDarkTheme) {
                        bgColor = '#dc3545';
                        textColor = '#ffffff';
                        borderColor = '#c82333';
                    } else {
                        bgColor = '#f8d7da';
                        textColor = '#721c24';
                        borderColor = '#f5c6cb';
                    }
                    break;
                case 'warning':
                    if (isDarkTheme) {
                        bgColor = '#ffc107';
                        textColor = '#212529';
                        borderColor = '#ffca2c';
                    } else {
                        bgColor = '#fff3cd';
                        textColor = '#856404';
                        borderColor = '#ffeaa7';
                    }
                    break;
                case 'info':
                    if (isDarkTheme) {
                        bgColor = '#17a2b8';
                        textColor = '#ffffff';
                        borderColor = '#1c7430';
                    } else {
                        bgColor = '#d1ecf1';
                        textColor = '#0c5460';
                        borderColor = '#bee5eb';
                    }
                    break;
                case 'success':
                default:
                    if (isDarkTheme) {
                        bgColor = '#28a745';
                        textColor = '#ffffff';
                        borderColor = '#1e7e34';
                    } else {
                        bgColor = '#d4edda';
                        textColor = '#155724';
                        borderColor = '#c3e6cb';
                    }
                    break;
            }

            // Set notification content and styles
            notification.innerHTML = `
                <div class="notification-content">
                    <span class="notification-message">${message}</span>
                    <button class="notification-close" type="button">&times;</button>
                </div>
                <div class="notification-progress-bar">
                    <div class="notification-progress-fill"></div>
                </div>
            `;

            notification.style.cssText = `
                position: relative;
                background-color: ${bgColor};
                color: ${textColor};
                border: 1px solid ${borderColor};
                border-left: 5px solid ${borderColor};
                padding: 12px 16px 15px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: 'Poppins', sans-serif;
                font-size: 14px;
                font-weight: 500;
                min-width: 300px;
                max-width: 400px;
                animation: slideInFromRight 0.3s ease-out;
                opacity: 0;
                overflow: hidden;
            `;

            // Style the content
            const content = notification.querySelector('.notification-content');
            content.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
            `;

            // Style the progress bar
            const progressBar = notification.querySelector('.notification-progress-bar');
            const progressFill = notification.querySelector('.notification-progress-fill');

            progressBar.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 0 0 6px 6px;
                overflow: hidden;
            `;

            progressFill.style.cssText = `
                height: 100%;
                background: rgba(255, 255, 255, 0.3);
                width: 100%;
                transform: translateX(-100%);
                transition: transform linear;
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
                // Stop progress animation
                progressFill.style.transition = 'none';
                notification.style.animation = 'slideOutToRight 1s ease-in';
                setTimeout(() => notification.remove(), 700);
            });
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '0.5');
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
                // Start progress bar animation
                progressFill.style.transitionDuration = `${duration}ms`;
                progressFill.style.transform = 'translateX(0)';
            }, 10);

            // Auto remove after different durations based on type
            let duration;
            switch (type) {
                case 'error':
                case 'warning':
                    duration = 8000; // 8 seconds for errors and warnings
                    break;
                case 'info':
                    duration = 6000; // 6 seconds for info
                    break;
                case 'success':
                default:
                    duration = 5000; // 5 seconds for success (default)
                    break;
            }

            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutToRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);

        } catch (error) {
            console.error('Error showing notification:', error);
            // Fallback to alert if notification system fails
            alert(message);
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
