// View Profile Manager
class ViewProfileManager {
    constructor() {
        this.currentUser = null;
        this.profileData = null;
        this.profileUserId = null;
        this.isOwner = false;
        this.init();
    }

    init() {
        // Get user ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.profileUserId = urlParams.get('id');
        
        this.loadCurrentUser();
    }

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await fetch(`${API_URL}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.currentUser = await response.json();
                    this.isOwner = this.profileUserId === this.currentUser._id;
                }
            }

            await this.loadProfileData();
        } catch (error) {
            console.error('Error loading current user:', error);
            await this.loadProfileData();
        }
    }

    async loadProfileData() {
        try {
            if (!this.profileUserId) {
                throw new Error('No user ID specified in URL');
            }

            const response = await fetch(`${API_URL}/api/users/profile/${this.profileUserId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Profile not found');
                }
                throw new Error(`Failed to fetch profile. Status: ${response.status}`);
            }

            this.profileData = await response.json();
            
            // Set page title
            document.title = `${this.profileData.name} | JobLink Eswatini`;
            
            this.renderProfile();
            this.updateProfileViews();
        } catch (error) {
            console.error('Error loading profile data:', error);
            this.showError(error.message);
        }
    }

    renderProfile() {
        this.renderProfileHeader();
        this.renderAboutSection();
        this.renderExperienceSection();
        this.renderEducationSection();
        this.renderSkillsSection();
        this.renderDocumentsSection();
        this.renderSidebar();
        this.setupProfileActions();
    }

    renderProfileHeader() {
        const user = this.profileData;
        
        // Profile cover photo
        const coverEl = document.getElementById('profileCover');
        if (user.coverPhoto?.filename) {
            coverEl.style.backgroundImage = `url('${API_URL}/api/files/${user.coverPhoto.filename}')`;
        } else {
            coverEl.style.backgroundImage = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        // Profile avatar
        const avatarEl = document.getElementById('profileAvatar');
        if (user.profilePicture?.filename) {
            avatarEl.src = `${API_URL}/api/files/${user.profilePicture.filename}`;
        } else {
            avatarEl.src = '../assets/placeholder.svg';
        }

        // Basic profile info
        document.getElementById('profileName').textContent = user.name || 'User Name';
        document.getElementById('profileHeadline').textContent = user.headline || '';
        document.getElementById('profileLocation').textContent = user.location || '';
        
        // Connection count
        const connectionsCount = user.connections?.length || 0;
        document.getElementById('connectionsCount').textContent = `${connectionsCount} connections`;

        // Profile stats
        document.getElementById('profileViewsCount').textContent = user.profileViews || 0;
        document.getElementById('postViewsCount').textContent = user.postViews || 0;
        document.getElementById('searchAppearancesCount').textContent = user.searchAppearances || 0;
    }

    renderAboutSection() {
        const user = this.profileData;
        const aboutSection = document.getElementById('aboutSection');
        const aboutText = document.getElementById('profileAbout');

        if (user.bio) {
            aboutSection.style.display = 'block';
            aboutText.textContent = user.bio;
        } else {
            aboutSection.style.display = 'none';
        }
    }

    renderExperienceSection() {
        const experienceSection = document.getElementById('experienceSection');
        const experienceList = document.getElementById('experienceList');
        const experiences = this.profileData.experience || [];

        if (experiences.length === 0) {
            experienceSection.style.display = 'none';
            return;
        }

        experienceSection.style.display = 'block';
        experienceList.innerHTML = `<div class="experience-list">${experiences.map(exp => {
            const startDate = new Date(exp.from).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const endDate = exp.current ? 'Present' : new Date(exp.to).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const duration = this.calculateDuration(exp.from, exp.current ? null : exp.to);

            return `
                <div class="experience-item">
                    <div class="experience-logo">
                        <div class="company-avatar">${exp.company.charAt(0).toUpperCase()}</div>
                    </div>
                    <div class="experience-details">
                        <h4 class="experience-title">${exp.title}</h4>
                        <p class="experience-company">${exp.company}</p>
                        <div class="experience-meta">
                            <span class="experience-duration">${startDate} - ${endDate} • ${duration}</span>
                            ${exp.location ? `<span class="experience-location">${exp.location}</span>` : ''}
                            ${exp.employmentType ? `<span class="experience-type">${exp.employmentType}</span>` : ''}
                        </div>
                        ${exp.description ? `<p class="experience-description">${exp.description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    }

    renderEducationSection() {
        const educationSection = document.getElementById('educationSection');
        const educationList = document.getElementById('educationList');
        const education = this.profileData.education || [];

        if (education.length === 0) {
            educationSection.style.display = 'none';
            return;
        }

        educationSection.style.display = 'block';
        educationList.innerHTML = `<div class="education-list">${education.map(edu => {
            const startYear = new Date(edu.from).getFullYear();
            const endYear = edu.current ? 'Present' : new Date(edu.to).getFullYear();

            return `
                <div class="education-item">
                    <div class="education-logo">
                        <div class="school-avatar">${edu.school.charAt(0).toUpperCase()}</div>
                    </div>
                    <div class="education-details">
                        <h4 class="education-school">${edu.school}</h4>
                        <p class="education-degree">${edu.degree}</p>
                        ${edu.fieldOfStudy ? `<p class="education-field">${edu.fieldOfStudy}</p>` : ''}
                        <p class="education-duration">${startYear} - ${endYear}</p>
                        ${edu.description ? `<p class="education-description">${edu.description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    }

    renderSkillsSection() {
        const skillsSection = document.getElementById('skillsSection');
        const skillsList = document.getElementById('skillsList');
        const skills = this.profileData.skills || [];

        if (skills.length === 0) {
            skillsSection.style.display = 'none';
            return;
        }

        skillsSection.style.display = 'block';
        skillsList.innerHTML = `<div class="skills-list">${skills.map(skill => 
            `<span class="skill-tag">${typeof skill === 'string' ? skill : skill.name}</span>`
        ).join('')}</div>`;
    }

    renderDocumentsSection() {
        const documentsSection = document.getElementById('documentsSection');
        const documentsList = document.getElementById('documentsList');
        const documents = this.profileData.documents || [];

        if (documents.length === 0) {
            documentsSection.style.display = 'none';
            return;
        }

        documentsSection.style.display = 'block';
        documentsList.innerHTML = `<div class="documents-list">${documents.map(doc => {
            const fileIcon = this.getFileIcon(doc.filename);
            const fileSize = this.formatFileSize(doc.size || 0);
            const uploadDate = new Date(doc.uploadDate).toLocaleDateString();
            
            return `
                <div class="document-item">
                    <div class="document-icon">
                        ${fileIcon}
                    </div>
                    <div class="document-info">
                        <h4 class="document-title">${doc.title || doc.originalName}</h4>
                        <p class="document-meta">${fileSize} • Uploaded ${uploadDate}</p>
                    </div>
                </div>
            `;
        }).join('')}</div>`;
    }

    renderSidebar() {
        // Update public profile URL
        const publicProfileUrlEl = document.getElementById('publicProfileUrl');
        if (publicProfileUrlEl) {
            const profileSlug = this.profileData.name.toLowerCase().replace(/\s+/g, '-');
            publicProfileUrlEl.href = `view-profile.html?id=${this.profileData._id}`;
            publicProfileUrlEl.textContent = `joblinkeswatini.com/in/${profileSlug}`;
        }

        // Update analytics
        document.getElementById('viewsAnalytics').textContent = this.profileData.profileViews || 0;
        document.getElementById('searchAnalytics').textContent = this.profileData.searchAppearances || 0;
        document.getElementById('connectionsAnalytics').textContent = this.profileData.connections?.length || 0;
    }

    setupProfileActions() {
        const messageUserBtn = document.getElementById('messageUserBtn');
        const connectBtn = document.getElementById('connectBtn');
        const shareProfileBtn = document.getElementById('shareProfileBtn');

        // Show/hide actions based on ownership
        if (!this.isOwner && this.currentUser) {
            // Show message and connect buttons for other users
            messageUserBtn.style.display = 'inline-flex';
            connectBtn.style.display = 'inline-flex';
            
            messageUserBtn.setAttribute('data-userid', this.profileData._id);
            messageUserBtn.setAttribute('data-username', this.profileData.name);
            
            messageUserBtn.onclick = () => {
                // Implement messaging functionality
                console.log(`Message ${this.profileData.name}`);
                alert('Messaging functionality coming soon!');
            };
            
            connectBtn.onclick = () => {
                // Implement connect functionality
                console.log(`Connect with ${this.profileData.name}`);
                alert('Connect functionality coming soon!');
            };
        }

        // Share profile functionality
        if (shareProfileBtn) {
            shareProfileBtn.onclick = () => this.shareProfile();
        }
    }

    async updateProfileViews() {
        // Only update views if viewing someone else's profile
        if (!this.isOwner && this.currentUser) {
            try {
                await fetch(`${API_URL}/api/users/profile/${this.profileUserId}/view`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
            } catch (error) {
                console.error('Error updating profile views:', error);
            }
        }
    }

    shareProfile() {
        const profileUrl = `${window.location.origin}${window.location.pathname}?id=${this.profileUserId}`;
        
        if (navigator.share) {
            navigator.share({
                title: `${this.profileData.name}'s Profile`,
                text: `Check out ${this.profileData.name}'s profile on JobLink Eswatini`,
                url: profileUrl
            });
        } else {
            // Fallback to copying to clipboard
            navigator.clipboard.writeText(profileUrl).then(() => {
                this.showNotification('Profile link copied to clipboard!');
            });
        }
    }

    calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        
        const years = end.getFullYear() - start.getFullYear();
        const months = end.getMonth() - start.getMonth();
        
        let totalMonths = years * 12 + months;
        if (totalMonths < 0) totalMonths = 0;
        
        if (totalMonths === 0) return '1 month';
        if (totalMonths < 12) return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
        
        const displayYears = Math.floor(totalMonths / 12);
        const displayMonths = totalMonths % 12;
        
        let duration = `${displayYears} year${displayYears !== 1 ? 's' : ''}`;
        if (displayMonths > 0) {
            duration += ` ${displayMonths} month${displayMonths !== 1 ? 's' : ''}`;
        }
        
        return duration;
    }

    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#d32f2f"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
            'doc': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1976d2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
            'docx': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1976d2"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
            'txt': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#757575"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>'
        };
        return iconMap[extension] || iconMap['txt'];
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showError(message) {
        const container = document.querySelector('.profile-container');
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <h1 style="color: #e53e3e; margin-bottom: 16px;">Oops! Something went wrong</h1>
                <p style="color: #718096; font-size: 1.1rem;">${message}</p>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }

    showNotification(message) {
        // Create and show notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the view profile manager
document.addEventListener('DOMContentLoaded', () => {
    new ViewProfileManager();
});
