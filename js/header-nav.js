/**
 * Universal Header Navigation Module
 * Provides consistent dropdown functionality across all pages
 */
class UniversalHeaderNav {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.loadCurrentUser();
            this.cacheDOMElements();
            this.setupEventListeners();
            this.renderHeaderState();
            this.isInitialized = true;
        } catch (error) {
            console.error('Header navigation initialization failed:', error);
            this.renderLoggedOutState();
        }
    }

    async loadCurrentUser() {
        if (!this.token) return null;

        try {
            const response = await fetch(`${API_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load user data');
            }

            this.currentUser = await response.json();
            return this.currentUser;
        } catch (error) {
            console.error('Failed to load current user:', error);
            localStorage.removeItem('token');
            this.token = null;
            this.currentUser = null;
            return null;
        }
    }

    cacheDOMElements() {
        // Main navigation elements
        this.loggedOutNav = document.getElementById('loggedOutNav');
        this.loggedInNav = document.getElementById('loggedInNav');
        
        // Profile elements
        this.navProfilePic = document.getElementById('navProfilePic');
        this.dropdownUserName = document.getElementById('dropdownUserName');
        this.dropdownUserRole = document.getElementById('dropdownUserRole');
        this.dropdownUserInfo = document.getElementById('dropdownUserInfo');
        this.dropdownAvatar = document.getElementById('dropdownAvatar');
        
        // Dropdown menu
        this.profileDropdownMenu = document.getElementById('profileDropdownMenu');
        this.userMenuButton = document.getElementById('userMenuButton');
        this.userDropdown = document.getElementById('userDropdown');
        
        // Header elements that might exist in different page layouts
        this.headerUsername = document.getElementById('headerUsername');
        this.userAvatar = document.getElementById('userAvatar');
        this.dropdownUsername = document.getElementById('dropdownUsername');
        this.dropdownUserRole = document.getElementById('dropdownUserRole');
        
        // Sign out button
        this.signOutBtn = document.getElementById('signOutBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
    }

    setupEventListeners() {
        // Profile dropdown toggle - handle multiple possible dropdown implementations
        if (this.loggedInNav) {
            this.loggedInNav.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        if (this.userMenuButton) {
            this.userMenuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.isDropdownClick(e.target)) {
                this.closeDropdown();
            }
        });

        // Sign out functionality - handle multiple button implementations
        const signOutButtons = [this.signOutBtn, this.logoutBtn].filter(btn => btn);
        signOutButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignOut();
            });
        });

        // Handle navigation link adjustments based on current page
        this.adjustNavigationLinks();
    }

    toggleDropdown() {
        if (this.profileDropdownMenu) {
            this.profileDropdownMenu.classList.toggle('is-open');
        }
        
        if (this.userDropdown) {
            const isVisible = this.userDropdown.style.display === 'block';
            this.userDropdown.style.display = isVisible ? 'none' : 'block';
        }
    }

    closeDropdown() {
        if (this.profileDropdownMenu) {
            this.profileDropdownMenu.classList.remove('is-open');
        }
        
        if (this.userDropdown) {
            this.userDropdown.style.display = 'none';
        }
    }

    isDropdownClick(target) {
        // Check if click is within any dropdown-related element
        const dropdownElements = [
            this.loggedInNav,
            this.userMenuButton,
            this.profileDropdownMenu,
            this.userDropdown
        ].filter(el => el);

        return dropdownElements.some(el => el.contains(target));
    }

    renderHeaderState() {
        if (this.token && this.currentUser) {
            this.renderLoggedInState();
        } else {
            this.renderLoggedOutState();
        }
    }

    renderLoggedInState() {
        // Show/hide navigation states
        if (this.loggedOutNav) this.loggedOutNav.style.display = 'none';
        if (this.loggedInNav) this.loggedInNav.style.display = 'flex';

        if (!this.currentUser) return;

        // Update profile pictures
        const profileImageUrl = this.getProfileImageUrl();
        if (this.navProfilePic) this.navProfilePic.src = profileImageUrl;
        if (this.userAvatar) this.userAvatar.src = profileImageUrl;
        if (this.dropdownAvatar) this.dropdownAvatar.src = profileImageUrl;

        // Update user names
        const userName = this.currentUser.name || 'User';
        if (this.headerUsername) this.headerUsername.textContent = userName;
        if (this.dropdownUserName) this.dropdownUserName.textContent = userName;
        if (this.dropdownUsername) this.dropdownUsername.textContent = userName;

        // Update user roles/headlines
        const userRole = this.getUserRoleText();
        if (this.dropdownUserRole) this.dropdownUserRole.textContent = userRole;

        // Update dropdown user info section if it exists
        if (this.dropdownUserInfo) {
            this.dropdownUserInfo.innerHTML = `
                <div class="dropdown-user-name">${userName}</div>
                <div class="dropdown-user-role">${userRole}</div>
            `;
        }
    }

    renderLoggedOutState() {
        if (this.loggedOutNav) this.loggedOutNav.style.display = 'flex';
        if (this.loggedInNav) this.loggedInNav.style.display = 'none';
    }

    getProfileImageUrl() {
        if (this.currentUser?.profilePicture?.filename) {
            return `${API_URL}/api/files/${this.currentUser.profilePicture.filename}`;
        }
        
        // Determine correct path for placeholder based on current location
        const currentPath = window.location.pathname;
        if (currentPath.includes('/pages/')) {
            return '../assets/placeholder.svg';
        }
        return 'assets/placeholder.svg';
    }

    getUserRoleText() {
        if (!this.currentUser) return 'User';

        if (this.currentUser.role === 'company') {
            return this.currentUser.companyName || 'Company Account';
        } else {
            return this.currentUser.currentPosition || 
                   this.currentUser.headline || 
                   'Job Seeker';
        }
    }

    adjustNavigationLinks() {
        // Adjust navigation links based on current page location
        const currentPath = window.location.pathname;
        const isInPages = currentPath.includes('/pages/');
        
        const navigationLinks = document.querySelectorAll('.header-nav-item[href], .dropdown-link[href]');
        
        navigationLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#')) return;
            
            // Skip if already has correct path structure
            if (href.includes('../') || href.startsWith('/')) return;
            
            // Adjust relative paths based on current location
            if (isInPages && !href.includes('../')) {
                // We're in pages folder, but link doesn't go up one level
                if (!href.startsWith('pages/')) {
                    // Only adjust if it's a page that should be in pages folder
                    const pageFiles = ['profile.html', 'edit-profile.html', 'jobs.html', 'settings.html', 
                                     'my-network.html', 'message-center.html', 'apply.html'];
                    if (pageFiles.some(page => href.includes(page))) {
                        // Don't change - we're already in the pages folder
                    }
                }
            } else if (!isInPages && !href.includes('pages/')) {
                // We're in root, link should go to pages folder
                const pageFiles = ['profile.html', 'edit-profile.html', 'jobs.html', 'settings.html',
                                 'my-network.html', 'message-center.html', 'apply.html'];
                if (pageFiles.some(page => href.includes(page))) {
                    link.setAttribute('href', `pages/${href}`);
                }
            }
        });
    }

    handleSignOut() {
        // Clear authentication
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        
        // Show confirmation
        this.showNotification('You have been signed out successfully', 'info');
        
        // Redirect to login
        setTimeout(() => {
            const currentPath = window.location.pathname;
            if (currentPath.includes('/pages/')) {
                window.location.href = 'login.html';
            } else {
                window.location.href = 'pages/login.html';
            }
        }, 1000);
    }

    showNotification(message, type = 'info') {
        // Create notification if notification system doesn't exist
        const existingNotification = document.querySelector('.temp-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = `temp-notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Public method to refresh user data (useful for profile updates)
    async refreshUserData() {
        await this.loadCurrentUser();
        this.renderHeaderState();
    }

    // Public method to check if user is logged in
    isLoggedIn() {
        return this.token && this.currentUser;
    }

    // Public method to get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize the universal header navigation
let headerNav;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    headerNav = new UniversalHeaderNav();
});

// Make it globally accessible
window.headerNav = headerNav;
