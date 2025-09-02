// js/main.js -- FINAL, COMPLETE, AND CORRECTED VERSION

// --- NEW GLOBAL NOTIFICATION FUNCTION ---
function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return; // Exit if the container isn't on the page

    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // e.g., 'notification success'
    notification.textContent = message;

    container.appendChild(notification);

    // Set a timeout to make the notification disappear
    setTimeout(() => {
        notification.classList.add('fade-out');
        // Remove the element from the DOM after the fade-out animation completes
        setTimeout(() => {
            notification.remove();
        }, 500); // This should match the animation duration in the CSS
    }, 4000); // Notification will be visible for 4 seconds
}

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
                alert('You have been signed out.');
                window.location.href = 'login.html';
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
                const serverUrl = fetch(`${API_URL}`);
                const localPlaceholder = 'images/placeholder.svg';
                this.navProfilePic.src = user.profilePicture ? `${serverUrl}/${user.profilePicture.replace(/\\/g, '/')}` : localPlaceholder;
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
        const messagingLink = document.getElementById('messagingLink');
        if (messagingLink) {
            messagingLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'message-center.html';
            });
        }
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
                const item = event.target.closest('.conversation-item');
                if (item) this.openChat(item.dataset.userid, item.dataset.username);
            });
        }
        if (this.chatForm) this.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = this.chatInput.value.trim();
            if (!content || !this.currentReceiverId) return;
            try {
                await fetch(`${API_URL}/api/messages/${this.currentReceiverId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': this.token }, body: JSON.stringify({ content }) });
                this.chatInput.value = '';
                this.openChat(this.currentReceiverId, this.currentReceiverName);
            } catch (err) { console.error("Failed to send message", err); }
        });
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
        } catch (err) { /* Silently fail poll */ }
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
            const unreadDot = convo.unreadCount > 0 ? `<span class="notification-badge" style="display:flex; position:static; margin-left:auto;">${convo.unreadCount}</span>` : '';
            return `
                <div class="conversation-item" data-userid="${convo.withUser._id}" data-username="${convo.withUser.name}">
                    <img src="${convo.withUser.profilePicture ? `${API_URL} /api/users /${convo.withUser.profilePicture.replace(/\\/g, '/')}` : 'images/placeholder.svg'}" alt="${convo.withUser.name}">
                    <div class="conversation-item-info"><h4>${convo.withUser.name}</h4><p>${convo.lastMessage}</p></div>
                    ${unreadDot}
                </div>
            `;
        }).join('');
    },
    // THIS IS THE CORRECTED RENDERMESSAGES FUNCTION
    renderMessages(messages) {
        if (!this.chatMessages) return;
        this.chatMessages.innerHTML = messages.map(msg => `
            <div style="text-align: ${msg.sender === this.loggedInUserId ? 'right' : 'left'};">
                <p style="background-color:${msg.sender === this.loggedInUserId ? '#eef2f9' : '#f0fdf4'};padding:10px;border-radius:10px;display:inline-block;">
                    ${msg.content}
                </p>
            </div>
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

// --- INITIALIZE EVERYTHING WHEN THE PAGE LOADS ---
document.addEventListener('DOMContentLoaded', () => {
    headerModule.init();
    chatModule.init();
    mobileMenuModule.init();
}); 