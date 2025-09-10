// Profile View Manager
class ProfileViewManager {
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
        this.setupEventListeners();
    }

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.handleUnauthenticated();
                return;
            }

            const response = await fetch(`${API_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load current user');
            }

            this.currentUser = await response.json();
            
            // If no profile ID specified, show current user's profile
            if (!this.profileUserId) {
                this.profileUserId = this.currentUser._id;
                this.isOwner = true;
            } else {
                this.isOwner = this.profileUserId === this.currentUser._id;
            }

            await this.loadProfileData();
        } catch (error) {
            console.error('Error loading current user:', error);
            this.handleUnauthenticated();
        }
    }

    handleUnauthenticated() {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }

    async loadProfileData() {
        try {
            const response = await fetch(`${API_URL}/api/users/profile/${this.profileUserId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load profile data');
            }

            this.profileData = await response.json();
            this.renderProfile();
            this.updateProfileViews();
        } catch (error) {
            console.error('Error loading profile data:', error);
            this.showError('Failed to load profile');
        }
    }

    renderProfile() {
        this.renderProfileHeader();
        this.renderAboutSection();
        this.renderExperienceSection();
        this.renderEducationSection();
        this.renderSkillsSection();
        this.renderDocumentsSection();
        this.renderSocialLinksSection();
        this.renderSidebar();
        this.setupProfileActions();
    }

    renderProfileHeader() {
        const user = this.profileData;
        console.log('Rendering profile header for user:', user);
        
        // Profile cover photo
        const coverEl = document.getElementById('profileCover');
        if (user.coverPhoto?.filename) {
            coverEl.style.backgroundImage = `url('${API_URL}/api/files/${user.coverPhoto.filename}')`;
        } else if (user.coverPhoto) {
            coverEl.style.backgroundImage = `url('${API_URL}/api/files/${user.coverPhoto}')`;
        } else {
            coverEl.style.backgroundImage = 'linear-gradient(135deg, #667eea, #764ba2)';
        }

        // Profile avatar
        const avatarEl = document.getElementById('profileAvatar');
        if (user.profilePicture?.filename) {
            avatarEl.src = `${API_URL}/api/files/${user.profilePicture.filename}`;
        } else if (user.profilePicture) {
            avatarEl.src = `${API_URL}/api/files/${user.profilePicture}`;
        } else {
            avatarEl.src = '../assets/placeholder.svg';
        }

        // Basic profile info
        const nameEl = document.getElementById('profileName');
        const headlineEl = document.getElementById('profileHeadline');
        const locationEl = document.getElementById('profileLocation');
        const connectionsEl = document.getElementById('connectionsCount');
        
        if (nameEl) nameEl.textContent = user.name || user.firstName + ' ' + (user.lastName || '') || 'User Name';
        if (headlineEl) headlineEl.textContent = user.headline || user.title || '';
        if (locationEl) locationEl.textContent = user.location || '';
        
        // Connection count
        const connectionsCount = user.connections?.length || 0;
        if (connectionsEl) connectionsEl.textContent = `${connectionsCount} connections`;

        // Profile stats
        const viewsCountEl = document.getElementById('profileViewsCount');
        const postViewsEl = document.getElementById('postViewsCount');
        const searchAppearancesEl = document.getElementById('searchAppearancesCount');
        
        if (viewsCountEl) viewsCountEl.textContent = user.profileViews || 0;
        if (postViewsEl) postViewsEl.textContent = user.postViews || 0;
        if (searchAppearancesEl) searchAppearancesEl.textContent = user.searchAppearances || 0;
    }

        // Check for bio, about, or description field
        const aboutText = user.bio || user.about || user.description || '';
        
        if (aboutText && aboutText.trim()) {
            aboutSection.style.display = 'block';
            aboutEl.textContent = aboutText;
        } else {
            aboutSection.style.display = 'none';
        }
    }

    renderExperienceSection() {
        const experienceList = document.getElementById('experienceList');
        const noExperience = document.getElementById('noExperience');
        const experiences = this.profileData.experience || [];

        if (experiences.length === 0) {
            experienceList.style.display = 'none';
            noExperience.style.display = 'block';
            return;
        }

        noExperience.style.display = 'none';
        experienceList.style.display = 'block';

        experienceList.innerHTML = experiences.map(exp => {
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
                        <p class="experience-duration">${startDate} - ${endDate} • ${duration}</p>
                        ${exp.location ? `<p class="experience-location">${exp.location}</p>` : ''}
                        ${exp.employmentType ? `<p class="experience-type">${exp.employmentType}</p>` : ''}
                        ${exp.description ? `<p class="experience-description">${exp.description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderEducationSection() {
        const educationList = document.getElementById('educationList');
        const noEducation = document.getElementById('noEducation');
        const education = this.profileData.education || [];

        if (education.length === 0) {
            educationList.style.display = 'none';
            noEducation.style.display = 'block';
            return;
        }

        noEducation.style.display = 'none';
        educationList.style.display = 'block';

        educationList.innerHTML = education.map(edu => {
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
        }).join('');
    }

    renderSkillsSection() {
        const skillsList = document.getElementById('skillsList');
        const noSkills = document.getElementById('noSkills');
        const skills = this.profileData.skills || [];

        if (skills.length === 0) {
            skillsList.style.display = 'none';
            noSkills.style.display = 'block';
            return;
        }

        noSkills.style.display = 'none';
        skillsList.style.display = 'flex';

        skillsList.innerHTML = skills.map(skill => `
            <span class="skill-tag">${skill}</span>
        `).join('');
    }

    renderDocumentsSection() {
        // Add documents section to the main content if it doesn't exist
        let documentsSection = document.getElementById('documentsSection');
        if (!documentsSection) {
            documentsSection = this.createDocumentsSection();
        }

        const documentsList = document.getElementById('documentsList');
        const noDocuments = document.getElementById('noDocuments');
        const documents = this.profileData.documents || [];

        if (documents.length === 0) {
            if (documentsList) documentsList.style.display = 'none';
            if (noDocuments) noDocuments.style.display = 'block';
            return;
        }

        if (noDocuments) noDocuments.style.display = 'none';
        if (documentsList) {
            documentsList.style.display = 'block';
            documentsList.innerHTML = documents.map(doc => {
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
                            ${doc.description ? `<p class="document-description">${doc.description}</p>` : ''}
                        </div>
                        <div class="document-actions">
                            <button class="btn btn-small btn-outline" onclick="window.open('${API_URL}/api/files/${doc.filename}', '_blank')">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
                                </svg>
                                Download
                            </button>
                            ${this.isOwner ? `
                                <button class="btn btn-small btn-outline btn-danger" onclick="profileManager.deleteDocument('${doc._id}')">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19ZM8,9H16V19H8V9ZM15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z"/>
                                    </svg>
                                    Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    createDocumentsSection() {
        const mainContent = document.querySelector('.profile-main-content');
        if (!mainContent) return null;

        const documentsSection = document.createElement('div');
        documentsSection.id = 'documentsSection';
        documentsSection.className = 'profile-section';
        documentsSection.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">Documents</h2>
                <button class="btn btn-icon add-section-btn" id="uploadDocumentBtn" ${!this.isOwner ? 'style="display: none;"' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
            </div>
            <div class="section-content">
                <div id="documentsList" class="documents-list"></div>
                <div id="noDocuments" class="empty-state" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <p>No documents uploaded yet</p>
                </div>
            </div>
        `;

        mainContent.appendChild(documentsSection);
        return documentsSection;
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

    async deleteDocument(documentId) {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/users/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            const updatedUser = await response.json();
            this.profileData = updatedUser;
            
            this.showNotification('Document deleted successfully!', 'success');
            this.renderDocumentsSection();
            
        } catch (error) {
            console.error('Error deleting document:', error);
            this.showNotification('Failed to delete document', 'error');
        }
    }

    renderSocialLinksSection() {
        const socialLinksList = document.getElementById('socialLinksList');
        const noSocialLinks = document.getElementById('noSocialLinks');
        const socialLinks = this.profileData.socialLinks || {};

        const hasLinks = Object.values(socialLinks).some(link => link);

        if (!hasLinks) {
            socialLinksList.style.display = 'none';
            noSocialLinks.style.display = 'block';
            return;
        }

        noSocialLinks.style.display = 'none';
        socialLinksList.style.display = 'block';

        const socialLinksHTML = [];

        if (socialLinks.linkedin) {
            socialLinksHTML.push(`
                <a href="${socialLinks.linkedin}" target="_blank" class="social-link">
                    <div class="social-icon linkedin">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                    </div>
                    <span>LinkedIn</span>
                </a>
            `);
        }

        if (socialLinks.github) {
            socialLinksHTML.push(`
                <a href="${socialLinks.github}" target="_blank" class="social-link">
                    <div class="social-icon github">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                    </div>
                    <span>GitHub</span>
                </a>
            `);
        }

        if (socialLinks.twitter) {
            socialLinksHTML.push(`
                <a href="${socialLinks.twitter}" target="_blank" class="social-link">
                    <div class="social-icon twitter">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                    </div>
                    <span>Twitter</span>
                </a>
            `);
        }

        socialLinksList.innerHTML = socialLinksHTML.join('');
    }

    renderSidebar() {
        this.renderProfileStrength();
        this.renderProfileAnalytics();
        this.renderRecentActivity();
    }

    renderProfileStrength() {
        const user = this.profileData;
        let strength = 0;
        let suggestions = [];

        // Calculate profile strength
        if (user.name) strength += 10;
        if (user.headline) strength += 15;
        if (user.location) strength += 10;
        if (user.bio) strength += 20;
        if (user.profilePicture) strength += 15;
        if (user.experience?.length > 0) strength += 20;
        if (user.skills?.length > 0) strength += 10;

        // Add suggestions
        if (!user.headline) suggestions.push('Add a professional headline');
        if (!user.bio) suggestions.push('Write a compelling summary');
        if (!user.profilePicture) suggestions.push('Upload a professional photo');
        if (!user.experience?.length) suggestions.push('Add your work experience');
        if (!user.skills?.length) suggestions.push('List your skills');

        // Update UI
        const progressEl = document.getElementById('strengthProgress');
        const percentageEl = document.getElementById('strengthPercentage');
        const suggestionsEl = document.getElementById('strengthSuggestions');

        if (progressEl) progressEl.style.width = `${strength}%`;
        if (percentageEl) percentageEl.textContent = `${strength}%`;

        if (suggestionsEl) {
            suggestionsEl.innerHTML = suggestions.map(suggestion => 
                `<li>${suggestion}</li>`
            ).join('');
        }
    }

    renderProfileAnalytics() {
        // Mock analytics data - replace with real data from backend
        const profileViewsEl = document.getElementById('profileViews');
        const searchAppearancesEl = document.getElementById('searchAppearances');
        const postViewsEl = document.getElementById('postViews');

        if (profileViewsEl) profileViewsEl.textContent = this.profileData.profileViews || 0;
        if (searchAppearancesEl) searchAppearancesEl.textContent = this.profileData.searchAppearances || 0;
        if (postViewsEl) postViewsEl.textContent = this.profileData.postViews || 0;
    }

    renderRecentActivity() {
        const recentActivityEl = document.getElementById('recentActivity');
        if (!recentActivityEl) return;

        // Mock recent activity - replace with real data
        const activities = [
            { type: 'profile_update', message: 'Updated profile picture', time: '2 days ago' },
            { type: 'connection', message: 'Connected with 3 new people', time: '1 week ago' }
        ];

        recentActivityEl.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div class="activity-details">
                    <p class="activity-message">${activity.message}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    setupProfileActions() {
        const editProfileBtn = document.getElementById('editProfileBtn');
        const shareProfileBtn = document.getElementById('shareProfileBtn');
        const messageUserBtn = document.getElementById('messageUserBtn');

        // Show/hide actions based on ownership
        if (this.isOwner) {
            if (editProfileBtn) {
                editProfileBtn.style.display = 'inline-flex';
                editProfileBtn.onclick = () => {
                    window.location.href = 'edit-profile.html';
                };
            }
            if (messageUserBtn) {
                messageUserBtn.style.display = 'none';
            }
            
            // Show edit controls for profile owners
            this.showEditControls();
        } else {
            if (editProfileBtn) {
                editProfileBtn.style.display = 'none';
            }
            if (messageUserBtn) {
                messageUserBtn.style.display = 'inline-flex';
                messageUserBtn.setAttribute('data-userid', this.profileData._id);
                messageUserBtn.setAttribute('data-username', this.profileData.name);
            }
            
            // Hide edit controls for non-owners
            this.hideEditControls();
        }

        // Share profile functionality
        if (shareProfileBtn) {
            shareProfileBtn.onclick = () => this.shareProfile();
        }
    }

    setupEventListeners() {
        // Profile picture upload
        const profilePictureInput = document.getElementById('profilePictureInput');
        const editAvatarBtn = document.getElementById('editAvatarBtn');
        
        if (editAvatarBtn && profilePictureInput) {
            editAvatarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                profilePictureInput.click();
            });
            
            profilePictureInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.uploadProfilePicture(e.target.files[0]);
                }
            });
        }

        // Cover photo upload
        const coverPhotoInput = document.getElementById('coverPhotoInput');
        const editCoverBtn = document.getElementById('editCoverBtn');
        
        if (editCoverBtn && coverPhotoInput) {
            editCoverBtn.addEventListener('click', (e) => {
                e.preventDefault();
                coverPhotoInput.click();
            });
            
            coverPhotoInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.uploadCoverPhoto(e.target.files[0]);
                }
            });
        }

        // Inline editing for name
        const editNameBtn = document.getElementById('editNameBtn');
        if (editNameBtn) {
            editNameBtn.addEventListener('click', () => {
                this.enableInlineEdit('profileName', 'name', 'text');
            });
        }

        // Inline editing for headline
        const editHeadlineBtn = document.getElementById('editHeadlineBtn');
        if (editHeadlineBtn) {
            editHeadlineBtn.addEventListener('click', () => {
                this.enableInlineEdit('profileHeadline', 'headline', 'text');
            });
        }

        // Inline editing for location
        const editLocationBtn = document.getElementById('editLocationBtn');
        if (editLocationBtn) {
            editLocationBtn.addEventListener('click', () => {
                this.enableInlineEdit('profileLocation', 'location', 'text');
            });
        }

        // About section editing
        const editAboutBtn = document.getElementById('editAboutBtn');
        if (editAboutBtn) {
            editAboutBtn.addEventListener('click', () => {
                this.enableInlineEdit('profileAbout', 'bio', 'textarea');
            });
        }

        // Document upload functionality
        this.setupDocumentUpload();
    }

    async updateProfileViews() {
        // Only update views if viewing someone else's profile
        if (!this.isOwner) {
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
        const profileUrl = `${window.location.origin}/pages/view-profile.html?id=${this.profileUserId}`;
        
        if (navigator.share) {
            navigator.share({
                title: `${this.profileData.name}'s Profile`,
                text: `Check out ${this.profileData.name}'s profile on JobLink Eswatini`,
                url: profileUrl
            });
        } else {
            // Fallback to copying to clipboard
            navigator.clipboard.writeText(profileUrl).then(() => {
                this.showNotification('Profile link copied to clipboard!', 'success');
            });
        }
    }

    downloadDocument(documentId) {
        // Implement document download functionality
        window.open(`/api/documents/${documentId}/download`);
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

    showError(message) {
        // Implement error display
        console.error(message);
    }

    showNotification(message, type = 'info') {
        // Create and show notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Close button functionality
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
    }

    async uploadProfilePicture(file) {
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showNotification('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                this.showNotification('Image must be smaller than 5MB', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('profilePicture', file);

            this.showNotification('Uploading profile picture...', 'info');

            const response = await fetch(`${API_URL}/api/users/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }

            const updatedUser = await response.json();
            this.profileData = updatedUser;
            
            // Update the profile picture in UI
            const avatarEl = document.getElementById('profileAvatar');
            if (updatedUser.profilePicture?.filename) {
                avatarEl.src = `${API_URL}/api/files/${updatedUser.profilePicture.filename}`;
            }

            this.showNotification('Profile picture updated successfully!', 'success');
            
            // Update profile strength
            this.renderProfileStrength();
            
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showNotification('Failed to upload profile picture', 'error');
        }
    }

    async uploadCoverPhoto(file) {
        try {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                this.showNotification('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (10MB limit)
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('Image must be smaller than 10MB', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('coverPhoto', file);

            this.showNotification('Uploading cover photo...', 'info');

            const response = await fetch(`${API_URL}/api/users/cover-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload cover photo');
            }

            const updatedUser = await response.json();
            this.profileData = updatedUser;
            
            // Update the cover photo in UI
            const coverEl = document.getElementById('profileCover');
            if (updatedUser.coverPhoto?.filename) {
                coverEl.style.backgroundImage = `url('${API_URL}/api/files/${updatedUser.coverPhoto.filename}')`;
            }

            this.showNotification('Cover photo updated successfully!', 'success');
            
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            this.showNotification('Failed to upload cover photo', 'error');
        }
    }

    enableInlineEdit(elementId, fieldName, inputType = 'text') {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = this.profileData[fieldName] || '';
        const originalContent = element.innerHTML;

        // Create input element
        let inputElement;
        if (inputType === 'textarea') {
            inputElement = document.createElement('textarea');
            inputElement.rows = 4;
            inputElement.style.resize = 'vertical';
        } else {
            inputElement = document.createElement('input');
            inputElement.type = inputType;
        }

        inputElement.value = currentValue;
        inputElement.className = 'inline-edit-input';
        inputElement.style.cssText = `
            width: 100%;
            padding: 8px 12px;
            border: 2px solid #0066cc;
            border-radius: 6px;
            font-family: inherit;
            font-size: inherit;
            background: white;
            box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
            outline: none;
        `;

        // Create action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'margin-top: 8px; display: flex; gap: 8px;';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn btn-primary btn-small';
        saveBtn.style.cssText = 'padding: 4px 12px; font-size: 0.85rem;';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'btn btn-secondary btn-small';
        cancelBtn.style.cssText = 'padding: 4px 12px; font-size: 0.85rem;';

        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(cancelBtn);

        // Replace element content
        element.innerHTML = '';
        element.appendChild(inputElement);
        element.appendChild(actionsDiv);
        
        inputElement.focus();
        if (inputType === 'text') {
            inputElement.select();
        }

        // Save functionality
        const save = async () => {
            const newValue = inputElement.value.trim();
            if (newValue === currentValue) {
                cancel();
                return;
            }

            try {
                const updateData = { [fieldName]: newValue };
                
                const response = await fetch(`${API_URL}/api/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }

                const updatedUser = await response.json();
                this.profileData = updatedUser;
                
                // Update the element with new value
                element.innerHTML = newValue || (fieldName === 'bio' ? '<em>No bio added yet.</em>' : 'Not specified');
                
                this.showNotification('Profile updated successfully!', 'success');
                
                // Update profile strength if needed
                this.renderProfileStrength();
                
            } catch (error) {
                console.error('Error updating profile:', error);
                this.showNotification('Failed to update profile', 'error');
                element.innerHTML = originalContent;
            }
        };

        // Cancel functionality
        const cancel = () => {
            element.innerHTML = originalContent;
        };

        // Event listeners
        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', cancel);
        
        // Save on Enter (except for textarea)
        if (inputType !== 'textarea') {
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    save();
                } else if (e.key === 'Escape') {
                    cancel();
                }
            });
        } else {
            // For textarea, save on Ctrl+Enter
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    save();
                } else if (e.key === 'Escape') {
                    cancel();
                }
            });
        }
    }

    setupDocumentUpload() {
        // Create document upload modal if it doesn't exist
        this.createDocumentUploadModal();
        
        // Add upload button event listener
        const uploadBtn = document.getElementById('uploadDocumentBtn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.showDocumentUploadModal();
            });
        }
    }

    createDocumentUploadModal() {
        // Check if modal already exists
        if (document.getElementById('documentUploadModal')) return;

        const modal = document.createElement('div');
        modal.id = 'documentUploadModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" id="modalOverlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Upload Document</h3>
                    <button class="modal-close" id="closeModal">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="documentUploadForm">
                        <div class="form-group">
                            <label for="documentTitle">Document Title</label>
                            <input type="text" id="documentTitle" name="title" required placeholder="e.g., Resume, Cover Letter">
                        </div>
                        <div class="form-group">
                            <label for="documentDescription">Description (Optional)</label>
                            <textarea id="documentDescription" name="description" rows="3" placeholder="Brief description of the document"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="documentFile">Select File</label>
                            <input type="file" id="documentFile" name="document" accept=".pdf,.doc,.docx,.txt" required>
                            <small class="form-hint">Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" id="cancelUpload">Cancel</button>
                            <button type="submit" class="btn btn-primary" id="uploadDocument">Upload</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('closeModal').addEventListener('click', () => this.hideDocumentUploadModal());
        document.getElementById('modalOverlay').addEventListener('click', () => this.hideDocumentUploadModal());
        document.getElementById('cancelUpload').addEventListener('click', () => this.hideDocumentUploadModal());
        document.getElementById('documentUploadForm').addEventListener('submit', (e) => this.handleDocumentUpload(e));
    }

    showDocumentUploadModal() {
        const modal = document.getElementById('documentUploadModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideDocumentUploadModal() {
        const modal = document.getElementById('documentUploadModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Reset form
        document.getElementById('documentUploadForm').reset();
    }

    async handleDocumentUpload(event) {
        event.preventDefault();
        
        const formData = new FormData();
        const title = document.getElementById('documentTitle').value;
        const description = document.getElementById('documentDescription').value;
        const file = document.getElementById('documentFile').files[0];

        if (!file) {
            this.showNotification('Please select a file', 'error');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File must be smaller than 10MB', 'error');
            return;
        }

        formData.append('document', file);
        formData.append('title', title);
        if (description) formData.append('description', description);

        try {
            this.showNotification('Uploading document...', 'info');
            
            const response = await fetch(`${API_URL}/api/users/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload document');
            }

            const updatedUser = await response.json();
            this.profileData = updatedUser;
            
            this.showNotification('Document uploaded successfully!', 'success');
            this.hideDocumentUploadModal();
            
            // Re-render documents section
            this.renderDocumentsSection();
            
        } catch (error) {
            console.error('Error uploading document:', error);
            this.showNotification('Failed to upload document', 'error');
        }
    }

    showEditControls() {
        // Show cover photo edit controls
        const coverEditControls = document.getElementById('coverEditControls');
        if (coverEditControls) {
            coverEditControls.style.display = 'block';
        }

        // Show avatar edit overlay
        const avatarEditOverlay = document.getElementById('avatarEditOverlay');
        if (avatarEditOverlay) {
            avatarEditOverlay.style.display = 'block';
        }

        // Show inline edit buttons
        const editButtons = [
            'editNameBtn', 'editHeadlineBtn', 'editLocationBtn', 'editAboutBtn',
            'addExperienceBtn', 'addEducationBtn', 'addSkillsBtn'
        ];
        
        editButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = 'flex';
            }
        });
    }

    hideEditControls() {
        // Hide cover photo edit controls
        const coverEditControls = document.getElementById('coverEditControls');
        if (coverEditControls) {
            coverEditControls.style.display = 'none';
        }

        // Hide avatar edit overlay
        const avatarEditOverlay = document.getElementById('avatarEditOverlay');
        if (avatarEditOverlay) {
            avatarEditOverlay.style.display = 'none';
        }

        // Hide inline edit buttons
        const editButtons = [
            'editNameBtn', 'editHeadlineBtn', 'editLocationBtn', 'editAboutBtn',
            'addExperienceBtn', 'addEducationBtn', 'addSkillsBtn'
        ];
        
        editButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.display = 'none';
            }
        });
    }
}

// Global variable for profile manager access
let profileManager;

// Initialize the profile view manager
document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileViewManager();
});
