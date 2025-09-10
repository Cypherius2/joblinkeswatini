// Enhanced Profile Manager for JobLink Eswatini
class EnhancedProfileManager {
    constructor() {
        this.currentUser = null;
        this.profileData = null;
        this.profileUserId = null;
        this.isOwner = false;
        this.profileCache = new Map();
        this.analyticsTimer = null;
        this.init();
    }

    init() {
        console.log('Initializing Enhanced Profile Manager...');
        
        // Debug session storage
        this.debugSessionData();
        
        // Get user ID from URL parameters or use current user
        const urlParams = new URLSearchParams(window.location.search);
        this.profileUserId = urlParams.get('id');
        
        // Initialize components
        this.setupEventListeners();
        this.loadCurrentUser();
        this.initializeAnalytics();
        this.initializeNotifications();
        this.initializeModals();
        this.initializeImageUpload();
    }

    // ========================================
    // Debug & Cache Management
    // ========================================

    debugSessionData() {
        console.log('🐞 ======== SESSION STORAGE DEBUG ========');
        
        const token = localStorage.getItem('token');
        console.log('- Token exists:', !!token);
        
        if (token) {
            try {
                // Decode JWT token to see what user ID it contains
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('- Token payload:', {
                    userId: payload.user.id,
                    exp: new Date(payload.exp * 1000).toLocaleString()
                });
            } catch (e) {
                console.log('- Token decode error:', e.message);
            }
        }
        
        const currentUser = sessionStorage.getItem('currentUser');
        if (currentUser) {
            try {
                const userData = JSON.parse(currentUser);
                console.log('- Cached user:', {
                    id: userData._id,
                    name: userData.name,
                    role: userData.role,
                    email: userData.email
                });
            } catch (e) {
                console.log('- Cached user data is corrupted:', currentUser);
                sessionStorage.removeItem('currentUser');
            }
        } else {
            console.log('- No cached user data');
        }
        
        console.log('- Profile cache size:', this.profileCache.size);
        console.log('- URL profile ID:', new URLSearchParams(window.location.search).get('id'));
        console.log('- Current profile user ID (this.profileUserId):', this.profileUserId);
        console.log('- Is owner (this.isOwner):', this.isOwner);
        
        if (this.currentUser) {
            console.log('- Current user object:', {
                id: this.currentUser._id,
                name: this.currentUser.name,
                role: this.currentUser.role
            });
        }
        
        if (this.profileData) {
            console.log('- Profile data object:', {
                id: this.profileData._id,
                name: this.profileData.name,
                role: this.profileData.role
            });
        }
        
        console.log('========================================');
    }

    clearCache() {
        console.log('🗑️ Clearing all caches...');
        sessionStorage.removeItem('currentUser');
        this.profileCache.clear();
        this.currentUser = null;
        this.profileData = null;
    }

    // ========================================
    // User Authentication & Loading
    // ========================================

    async loadCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.handleUnauthenticated();
                return;
            }

            console.log('🔐 Loading current user...');

            // Check cache first
            let currentUserData = sessionStorage.getItem('currentUser');
            if (currentUserData) {
                this.currentUser = JSON.parse(currentUserData);
                console.log('📱 Loaded user from cache:', {
                    id: this.currentUser._id,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                });
            } else {
                console.log('🌐 Fetching user from API...');
                const response = await fetch(`${API_URL}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Failed to load current user:', response.status, errorText);
                    throw new Error('Failed to load current user');
                }

                this.currentUser = await response.json();
                console.log('✅ Current user loaded from API:', {
                    id: this.currentUser._id,
                    name: this.currentUser.name,
                    role: this.currentUser.role
                });
                sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            }

            // Determine which profile to show
            const urlProfileId = new URLSearchParams(window.location.search).get('id');
            console.log('🔍 URL profile ID:', urlProfileId);
            
            if (!this.profileUserId) {
                this.profileUserId = this.currentUser._id;
                this.isOwner = true;
                console.log('👤 Showing own profile (no URL ID specified)');
            } else {
                this.isOwner = this.profileUserId === this.currentUser._id;
                console.log('👁️ Showing profile:', {
                    profileUserId: this.profileUserId,
                    currentUserId: this.currentUser._id,
                    isOwner: this.isOwner
                });
            }

            await this.loadProfileData();
        } catch (error) {
            console.error('💥 Error loading current user:', error);
            this.handleUnauthenticated();
        }
    }

    handleUnauthenticated() {
        this.showNotification('Please log in to view profiles', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }

    async loadProfileData() {
        try {
            console.log('📋 Loading profile data for ID:', this.profileUserId);
            
            // Check cache first
            const cacheKey = `profile_${this.profileUserId}`;
            if (this.profileCache.has(cacheKey)) {
                this.profileData = this.profileCache.get(cacheKey);
                console.log('💾 Profile data loaded from cache:', {
                    id: this.profileData._id,
                    name: this.profileData.name,
                    role: this.profileData.role
                });
            } else {
                console.log('🌐 Fetching profile data from API for ID:', this.profileUserId);
                const response = await fetch(`${API_URL}/api/users/profile/${this.profileUserId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Failed to load profile data:', response.status, errorText);
                    if (response.status === 404) {
                        this.showError('Profile not found');
                        return;
                    }
                    throw new Error('Failed to load profile data');
                }

                this.profileData = await response.json();
                console.log('✅ Profile data loaded from API:', {
                    id: this.profileData._id,
                    name: this.profileData.name,
                    role: this.profileData.role,
                    requestedId: this.profileUserId
                });
                this.profileCache.set(cacheKey, this.profileData);
            }

            // Verify profile data matches what was requested
            if (this.profileData._id !== this.profileUserId) {
                console.error('⚠️ PROFILE MISMATCH! Requested:', this.profileUserId, 'Got:', this.profileData._id);
                this.showError('Profile data mismatch. Please refresh the page.');
                return;
            }

            await this.renderProfile();
            this.setupProfileSpecificFeatures();
            
            // Update profile views (only for viewing other profiles)
            if (!this.isOwner) {
                this.updateProfileViews();
            }
        } catch (error) {
            console.error('💥 Error loading profile data:', error);
            this.showError('Failed to load profile. Please try again.');
        }
    }

    // ========================================
    // Profile Rendering
    // ========================================

    async renderProfile() {
        // Show profile container and hide loading state
        const loadingState = document.getElementById('loadingState');
        const profileContainer = document.getElementById('profileContainer');
        
        if (loadingState) loadingState.style.display = 'none';
        if (profileContainer) {
            profileContainer.style.display = 'block';
            // Set user role for role-based visibility
            profileContainer.setAttribute('data-user-role', this.profileData.role || 'jobseeker');
        }
        
        // Hide/show sections based on user role
        this.applyRoleBasedVisibility();
        
        await Promise.all([
            this.renderProfileHeader(),
            this.renderAboutSection(),
            this.renderExperienceSection(),
            this.renderEducationSection(),
            this.renderSkillsSection(),
            this.renderDocumentsSection(),
            this.renderCompanyInfoSection(),
            this.renderJobPostingsSection(),
            this.renderSidebar()
        ]);

        this.setupProfileActions();
        this.calculateProfileStrength();
        
        // Show owner-specific controls
        if (this.isOwner) {
            this.showOwnerControls();
        } else {
            this.showViewerControls();
        }
    }

    showLoading(show = true) {
        const elements = [
            'profileName',
            'profileHeadline',
            'profileLocation',
            'profileAbout'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = show ? 'Loading...' : '';
            }
        });
    }

    async renderProfileHeader() {
        const user = this.profileData;
        
        // Update document title
        document.title = `${user.name || user.firstName + ' ' + (user.lastName || '')} | JobLink Eswatini`;

        // Profile cover photo
        const coverEl = document.getElementById('profileCover');
        if (coverEl) {
            if (user.coverPhoto?.filename) {
                coverEl.style.backgroundImage = `url('${API_URL}/api/files/${user.coverPhoto.filename}')`;
            } else if (user.coverPhoto) {
                coverEl.style.backgroundImage = `url('${API_URL}/api/files/${user.coverPhoto}')`;
            }
        }

        // Profile avatar
        const avatarEl = document.getElementById('profileAvatar');
        const navProfilePic = document.getElementById('navProfilePic');
        const mobileProfilePic = document.getElementById('mobileProfilePic');
        
        const avatarUrl = this.getProfileImageUrl(user);
        [avatarEl, navProfilePic, mobileProfilePic].forEach(el => {
            if (el) el.src = avatarUrl;
        });

        // Basic profile info with fallbacks
        this.updateElement('profileName', user.name || 
            (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 
            user.firstName || user.email?.split('@')[0] || 'User'));
        
        this.updateElement('profileHeadline', user.headline || user.title || user.jobTitle || '');
        this.updateElement('profileLocation', user.location || user.city || user.country || '');

        // Connection count
        const connectionsCount = user.connections?.length || 0;
        this.updateElement('connectionsCount', `${connectionsCount} connection${connectionsCount !== 1 ? 's' : ''}`);

        // Profile statistics
        this.updateElement('profileViewsCount', user.profileViews || 0);
        this.updateElement('postViewsCount', user.postViews || user.postImpressions || 0);
        this.updateElement('searchAppearancesCount', user.searchAppearances || 0);

        // Update profile views in meta
        this.updateElement('profileViews', `${user.profileViews || 0} profile view${(user.profileViews || 0) !== 1 ? 's' : ''}`);
    }

    getProfileImageUrl(user) {
        if (user.profilePicture?.filename) {
            return `${API_URL}/api/files/${user.profilePicture.filename}`;
        } else if (user.profilePicture) {
            return `${API_URL}/api/files/${user.profilePicture}`;
        } else if (user.avatar) {
            return `${API_URL}/api/files/${user.avatar}`;
        }
        return '../assets/placeholder.svg';
    }

    async renderAboutSection() {
        const aboutEl = document.getElementById('profileAbout');
        const aboutSection = document.getElementById('aboutSection');
        
        if (!aboutEl || !aboutSection) return;

        let aboutText = '';
        
        // For companies, use companyDescription or bio
        if (this.profileData.role === 'company') {
            aboutText = this.profileData.companyDescription || 
                       this.profileData.bio || 
                       this.profileData.about || 
                       this.profileData.description || '';
        } else {
            // For job seekers, use bio or about
            aboutText = this.profileData.bio || 
                       this.profileData.about || 
                       this.profileData.description || 
                       this.profileData.summary || '';
        }

        if (aboutText && aboutText.trim()) {
            // Format the text properly
            aboutEl.innerHTML = this.formatText(aboutText);
            aboutSection.style.display = 'block';
        } else {
            if (this.isOwner) {
                const placeholderText = this.profileData.role === 'company' ? 
                    'Add a description about your company to help job seekers learn more about you.' :
                    'Add a description about yourself to help employers and connections learn more about you.';
                aboutEl.innerHTML = `<em>${placeholderText}</em>`;
                aboutSection.style.display = 'block';
            } else {
                aboutSection.style.display = 'none';
            }
        }
    }

    async renderExperienceSection() {
        if (this.profileData.role === 'company') return; // Skip for companies
        
        const experienceList = document.getElementById('experienceList');
        if (!experienceList) return;

        const experiences = this.profileData.experience || [];

        if (experiences.length === 0) {
            this.renderEmptyState(experienceList, 'experience');
            return;
        }

        experienceList.innerHTML = experiences.map(exp => {
            const startDate = exp.from ? new Date(exp.from).toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
            }) : 'Unknown';
            
            const endDate = exp.current ? 'Present' : 
                           (exp.to ? new Date(exp.to).toLocaleDateString('en-US', { 
                               month: 'short', 
                               year: 'numeric' 
                           }) : 'Unknown');
            
            const duration = this.calculateDuration(exp.from, exp.current ? null : exp.to);

            return `
                <div class="experience-item">
                    <div class="experience-logo">
                        <div class="company-avatar">
                            ${(exp.company || exp.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="experience-details">
                        <h4 class="experience-title">${exp.title || exp.position || 'Position'}</h4>
                        <p class="experience-company">${exp.company || exp.companyName || 'Company'}</p>
                        <div class="experience-meta">
                            <span class="experience-duration">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                    <path d="M17 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                                </svg>
                                ${startDate} - ${endDate} • ${duration}
                            </span>
                            ${exp.location ? `
                                <span class="experience-location">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                    ${exp.location}
                                </span>
                            ` : ''}
                            ${exp.employmentType || exp.type ? `
                                <span class="experience-type">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
                                    </svg>
                                    ${exp.employmentType || exp.type}
                                </span>
                            ` : ''}
                        </div>
                        ${exp.description ? `<p class="experience-description">${exp.description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderEducationSection() {
        if (this.profileData.role === 'company') return; // Skip for companies
        
        const educationList = document.getElementById('educationList');
        if (!educationList) return;

        const education = this.profileData.education || [];

        if (education.length === 0) {
            this.renderEmptyState(educationList, 'education');
            return;
        }

        educationList.innerHTML = education.map(edu => {
            const startYear = edu.from ? new Date(edu.from).getFullYear() : '';
            const endYear = edu.to ? new Date(edu.to).getFullYear() : 
                          (edu.current ? 'Present' : '');
            const duration = startYear && endYear ? `${startYear} - ${endYear}` : 
                           (startYear ? `${startYear}` : 'Dates not specified');

            return `
                <div class="education-item">
                    <div class="education-logo">
                        <div class="school-avatar">
                            ${(edu.school || edu.institution || 'S').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="education-details">
                        <h4 class="education-school">${edu.school || edu.institution || 'Institution'}</h4>
                        <p class="education-degree">${edu.degree || edu.qualification || 'Degree'}</p>
                        ${edu.fieldOfStudy || edu.field ? 
                            `<p class="education-field">${edu.fieldOfStudy || edu.field}</p>` : ''}
                        <p class="education-duration">${duration}</p>
                        ${edu.description ? `<p class="education-description">${edu.description}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderSkillsSection() {
        if (this.profileData.role === 'company') return; // Skip for companies
        
        const skillsList = document.getElementById('skillsList');
        if (!skillsList) return;

        const skills = this.profileData.skills || [];

        if (skills.length === 0) {
            this.renderEmptyState(skillsList, 'skills');
            return;
        }

        skillsList.innerHTML = `
            <div class="skills-list">
                ${skills.map(skill => {
                    const skillName = typeof skill === 'string' ? skill : 
                                    skill.name || skill.skill || skill;
                    const endorsements = typeof skill === 'object' ? 
                                       skill.endorsements || 0 : 0;
                    
                    return `
                        <span class="skill-tag" title="${endorsements} endorsement${endorsements !== 1 ? 's' : ''}">
                            ${skillName}
                            ${endorsements > 0 ? ` (${endorsements})` : ''}
                        </span>
                    `;
                }).join('')}
            </div>
        `;
    }

    async renderDocumentsSection() {
        if (this.profileData.role === 'company') return; // Skip for companies
        
        const documentsList = document.getElementById('documentsList');
        if (!documentsList) return;

        const documents = this.profileData.documents || [];

        if (documents.length === 0) {
            this.renderEmptyState(documentsList, 'documents');
            return;
        }

        documentsList.innerHTML = `
            <div class="documents-list">
                ${documents.map(doc => {
                    const fileSize = this.formatFileSize(doc.size || 0);
                    const uploadDate = doc.uploadDate ? 
                        new Date(doc.uploadDate).toLocaleDateString() : 'Unknown date';
                    
                    return `
                        <div class="document-item">
                            <div class="document-icon">
                                ${this.getDocumentIcon(doc.type || doc.mimetype)}
                            </div>
                            <div class="document-info">
                                <h4 class="document-title">${doc.title || doc.originalname || 'Document'}</h4>
                                <div class="document-meta">
                                    <span>Type: ${this.getDocumentType(doc.type || doc.mimetype)}</span>
                                    <span>Size: ${fileSize}</span>
                                    <span>Uploaded: ${uploadDate}</span>
                                </div>
                                ${doc.description ? `<p class="document-description">${doc.description}</p>` : ''}
                            </div>
                            <div class="document-actions">
                                <button class="btn btn-outline btn-small" onclick="window.open('${API_URL}/api/files/${doc.filename}', '_blank')">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                                    </svg>
                                    View
                                </button>
                                ${this.isOwner ? `
                                    <button class="btn btn-outline btn-small btn-danger" onclick="profileManager.deleteDocument('${doc._id || doc.id}')">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                        Delete
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Add upload area for owners
        if (this.isOwner) {
            documentsList.innerHTML += `
                <div class="document-upload-area" onclick="document.getElementById('documentUpload').click()">
                    <svg class="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <p class="upload-text">Upload Document</p>
                    <p class="upload-hint">Click here or drag and drop files (PDF, DOC, DOCX, TXT)</p>
                    <input type="file" id="documentUpload" accept=".pdf,.doc,.docx,.txt" multiple style="display: none;">
                </div>
            `;
        }
    }

    async renderCompanyInfoSection() {
        if (this.profileData.role !== 'company') return; // Skip for job seekers
        
        const companyInfoContent = document.getElementById('companyInfoContent');
        if (!companyInfoContent) return;

        const company = this.profileData;
        
        // Format website URL if provided
        const formatWebsiteUrl = (url) => {
            if (!url) return null;
            // Add https:// if not present
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `https://${url}`;
            }
            return url;
        };
        
        const websiteUrl = formatWebsiteUrl(company.website);
        
        companyInfoContent.innerHTML = `
            <div class="company-info-grid">
                <div class="company-info-item">
                    <div class="company-info-label">Industry</div>
                    <div class="company-info-value">${company.industry || (this.isOwner ? '<em>Add your industry</em>' : 'Not specified')}</div>
                </div>
                <div class="company-info-item">
                    <div class="company-info-label">Company Size</div>
                    <div class="company-info-value">${this.formatCompanySize(company.companySize) || (this.isOwner ? '<em>Add company size</em>' : 'Not specified')}</div>
                </div>
                <div class="company-info-item">
                    <div class="company-info-label">Founded</div>
                    <div class="company-info-value">${company.foundedYear ? company.foundedYear : (this.isOwner ? '<em>Add founding year</em>' : 'Not specified')}</div>
                </div>
                <div class="company-info-item">
                    <div class="company-info-label">Website</div>
                    <div class="company-info-value">
                        ${websiteUrl ? 
                            `<a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${company.website}</a>` : 
                            (this.isOwner ? '<em>Add company website</em>' : 'Not specified')
                        }
                    </div>
                </div>
                ${company.phoneNumber ? `
                    <div class="company-info-item">
                        <div class="company-info-label">Phone</div>
                        <div class="company-info-value">
                            <a href="tel:${company.phoneNumber}">${company.phoneNumber}</a>
                        </div>
                    </div>
                ` : ''}
                ${company.location ? `
                    <div class="company-info-item">
                        <div class="company-info-label">Location</div>
                        <div class="company-info-value">${company.location}</div>
                    </div>
                ` : ''}
            </div>
            
            ${this.renderSocialLinksSection(company.socialLinks)}
            
            <div class="company-stats">
                <div class="company-stat">
                    <span class="company-stat-number" id="activeJobsCount">0</span>
                    <span class="company-stat-label">Active Jobs</span>
                </div>
                <div class="company-stat">
                    <span class="company-stat-number">${company.connections?.length || 0}</span>
                    <span class="company-stat-label">Connections</span>
                </div>
                <div class="company-stat">
                    <span class="company-stat-number">${company.profileViews || 0}</span>
                    <span class="company-stat-label">Profile Views</span>
                </div>
            </div>
        `;
        
        // Load active jobs count asynchronously
        this.loadActiveJobsCount();
    }

    async renderJobPostingsSection() {
        if (this.profileData.role !== 'company') return; // Skip for job seekers
        
        const jobPostingsList = document.getElementById('jobPostingsList');
        if (!jobPostingsList) return;

        try {
            // Fetch job postings for this company
            let jobPostings = [];
            
            if (this.isOwner) {
                // If viewing own profile, get all own job postings with management controls
                const response = await fetch(`${API_URL}/api/jobs/company/${this.profileUserId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    jobPostings = await response.json();
                } else {
                    console.log('Could not fetch job postings, using profile data');
                    jobPostings = this.profileData.jobPostings || [];
                }
            } else {
                // If viewing another company's profile, get only public/active job postings
                const response = await fetch(`${API_URL}/api/jobs/public/company/${this.profileUserId}`);
                
                if (response.ok) {
                    jobPostings = await response.json();
                } else {
                    console.log('Could not fetch public job postings, using profile data');
                    jobPostings = this.profileData.jobPostings?.filter(job => job.status === 'active') || [];
                }
            }

            if (jobPostings.length === 0) {
                this.renderEmptyState(jobPostingsList, 'jobPostings');
                return;
            }

            jobPostingsList.innerHTML = jobPostings.map(job => {
                const postedDate = job.postedDate ? 
                    new Date(job.postedDate).toLocaleDateString() : 'Recently';
                const applicants = job.applicants?.length || 0;
                
                // Determine if this job posting belongs to the current user
                const isOwnJob = this.isOwner && (
                    job.companyId === this.currentUser._id || 
                    job.company === this.currentUser._id ||
                    job.postedBy === this.currentUser._id
                );
                
                return `
                    <div class="job-posting-item ${job.status === 'closed' ? 'job-closed' : ''}">
                        <div class="job-posting-icon">
                            ${job.title ? job.title.charAt(0).toUpperCase() : 'J'}
                        </div>
                        <div class="job-posting-details">
                            <h4 class="job-posting-title">
                                ${job.title || 'Job Title'}
                                ${job.status === 'closed' ? '<span class="job-status-badge closed">Closed</span>' : ''}
                                ${job.status === 'draft' ? '<span class="job-status-badge draft">Draft</span>' : ''}
                            </h4>
                            <div class="job-posting-meta">
                                <span class="job-posting-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                    ${job.location || 'Remote'}
                                </span>
                                <span class="job-posting-meta-item">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                        <path d="M17 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                                    </svg>
                                    Posted ${postedDate}
                                </span>
                                ${this.isOwner ? `
                                    <span class="job-posting-meta-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                        </svg>
                                        ${applicants} applicant${applicants !== 1 ? 's' : ''}
                                    </span>
                                ` : ''}
                            </div>
                            ${job.description ? `<p class="job-posting-description">${job.description}</p>` : ''}
                            
                            <div class="job-posting-actions">
                                ${isOwnJob ? `
                                    <!-- Management controls for own job postings -->
                                    <button class="btn btn-primary btn-small" onclick="profileManager.editJobPosting('${job._id || job.id}')">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                        Edit
                                    </button>
                                    <button class="btn btn-outline btn-small" onclick="profileManager.viewJobApplicants('${job._id || job.id}')">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                                        </svg>
                                        Applicants (${applicants})
                                    </button>
                                    ${job.status !== 'closed' ? `
                                        <button class="btn btn-outline btn-small btn-warning" onclick="profileManager.closeJobPosting('${job._id || job.id}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                                            </svg>
                                            Close Job
                                        </button>
                                    ` : `
                                        <button class="btn btn-outline btn-small btn-success" onclick="profileManager.reopenJobPosting('${job._id || job.id}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                                            </svg>
                                            Reopen Job
                                        </button>
                                    `}
                                    <button class="btn btn-outline btn-small btn-danger" onclick="profileManager.deleteJobPosting('${job._id || job.id}')">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                                        </svg>
                                        Delete
                                    </button>
                                ` : `
                                    <!-- View-only controls for other companies' job postings -->
                                    <button class="btn btn-primary btn-small" onclick="window.location.href='job-details.html?id=${job._id || job.id}'">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                        </svg>
                                        View Details
                                    </button>
                                    ${this.currentUser.role === 'jobseeker' ? `
                                        <button class="btn btn-secondary btn-small" onclick="profileManager.applyToJob('${job._id || job.id}')">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                                            </svg>
                                            Apply Now
                                        </button>
                                    ` : ''}
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error rendering job postings:', error);
            this.renderEmptyState(jobPostingsList, 'jobPostings');
        }
    }

    renderEmptyState(container, type) {
        const emptyStates = {
            experience: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
                </svg>`,
                title: 'No work experience added yet',
                message: this.isOwner ? 'Add your work experience to showcase your career journey.' : 
                        'This user hasn\'t added any work experience yet.'
            },
            education: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
                </svg>`,
                title: 'No education added yet',
                message: this.isOwner ? 'Add your educational background to complete your profile.' : 
                        'This user hasn\'t added any educational information yet.'
            },
            skills: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                </svg>`,
                title: 'No skills added yet',
                message: this.isOwner ? 'Add skills to highlight your expertise.' : 
                        'This user hasn\'t added any skills yet.'
            },
            documents: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>`,
                title: 'No documents uploaded yet',
                message: this.isOwner ? 'Upload your resume, portfolio, or certificates to showcase your qualifications.' : 
                        'This user hasn\'t uploaded any documents yet.'
            },
            jobPostings: {
                icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                </svg>`,
                title: 'No job postings yet',
                message: this.isOwner ? 'Post your first job opening to attract qualified candidates.' : 
                        'This company hasn\'t posted any jobs yet.'
            }
        };

        const state = emptyStates[type];
        container.innerHTML = `
            <div class="empty-state">
                ${state.icon}
                <h3>${state.title}</h3>
                <p>${state.message}</p>
            </div>
        `;
    }

    // ========================================
    // Sidebar Components
    // ========================================

    async renderSidebar() {
        await Promise.all([
            this.renderProfileStrength(),
            this.renderAnalytics(),
            this.renderSuggestedConnections()
        ]);
    }

    async renderProfileStrength() {
        const strengthProgress = document.getElementById('strengthProgress');
        const strengthLevel = document.querySelector('.strength-level');
        const suggestionsList = document.getElementById('strengthSuggestions');
        
        if (!strengthProgress) return;

        const strength = this.calculateProfileStrength();
        
        // Update progress bar
        strengthProgress.style.width = `${strength.percentage}%`;
        
        // Update level
        if (strengthLevel) {
            strengthLevel.textContent = strength.level;
        }

        // Update suggestions
        if (suggestionsList && strength.suggestions.length > 0) {
            suggestionsList.innerHTML = strength.suggestions.map(suggestion => 
                `<li>${suggestion}</li>`
            ).join('');
        }
    }

    calculateProfileStrength() {
        const user = this.profileData;
        const userRole = user.role || 'jobseeker';
        let score = 0;
        let maxScore = 100;
        const suggestions = [];

        // Profile picture (15 points) - Important for all roles
        if (user.profilePicture) {
            score += 15;
        } else {
            suggestions.push('Add a professional profile photo');
        }

        // Headline (10 points) - Important for all roles
        if (user.headline || user.title) {
            score += 10;
        } else {
            suggestions.push('Write a compelling headline');
        }

        // About section (20 points) - Important for all roles
        if (user.bio || user.about || user.description) {
            score += 20;
        } else {
            suggestions.push('Complete your about section');
        }

        // Location (5 points) - Important for all roles
        if (user.location) {
            score += 5;
        } else {
            suggestions.push('Add your location');
        }

        // Role-specific criteria
        if (userRole === 'jobseeker') {
            // Skills (15 points) - Important for job seekers
            if (user.skills && user.skills.length > 0) {
                score += 15;
            } else {
                suggestions.push('List your skills');
            }

            // Experience (25 points) - Critical for job seekers
            if (user.experience && user.experience.length > 0) {
                score += 25;
            } else {
                suggestions.push('Add your work experience');
            }

            // Education (10 points) - Important for job seekers
            if (user.education && user.education.length > 0) {
                score += 10;
            } else {
                suggestions.push('Add your education');
            }
        } else if (userRole === 'company') {
            // Company information (25 points) - Critical for companies
            if (user.industry || user.companySize || user.foundedYear) {
                score += 25;
            } else {
                suggestions.push('Complete your company information');
            }

            // Website/contact (10 points) - Important for companies
            if (user.website) {
                score += 10;
            } else {
                suggestions.push('Add your company website');
            }
        }

        const percentage = Math.min(100, (score / maxScore) * 100);
        let level = 'Beginner';
        
        if (percentage >= 80) level = 'Expert';
        else if (percentage >= 60) level = 'Intermediate';
        else if (percentage >= 40) level = 'Developing';

        return {
            score,
            percentage,
            level,
            suggestions: suggestions.slice(0, 5) // Show top 5 suggestions
        };
    }

    async renderAnalytics() {
        const viewsAnalytics = document.getElementById('viewsAnalytics');
        const searchAnalytics = document.getElementById('searchAnalytics');
        const connectionsAnalytics = document.getElementById('connectionsAnalytics');

        if (!this.isOwner) {
            // Hide analytics for non-owners
            const analyticsCard = document.getElementById('profileAnalyticsCard');
            if (analyticsCard) {
                analyticsCard.style.display = 'none';
            }
            return;
        }

        // Load analytics data with fallback
        try {
            const response = await fetch(`${API_URL}/api/users/analytics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const analytics = await response.json();
                
                if (viewsAnalytics) viewsAnalytics.textContent = analytics.profileViews || 0;
                if (searchAnalytics) searchAnalytics.textContent = analytics.searchAppearances || 0;
                if (connectionsAnalytics) connectionsAnalytics.textContent = analytics.newConnections || 0;
            } else {
                // Handle any API error gracefully - show fallback data
                console.log(`Analytics API responded with ${response.status}, using fallback data`);
                if (viewsAnalytics) viewsAnalytics.textContent = this.profileData.profileViews || 0;
                if (searchAnalytics) searchAnalytics.textContent = this.profileData.searchAppearances || 0;
                if (connectionsAnalytics) connectionsAnalytics.textContent = '0';
            }
        } catch (error) {
            console.log('Analytics API error:', error.message);
            // Use fallback data from profile
            if (viewsAnalytics) viewsAnalytics.textContent = this.profileData.profileViews || 0;
            if (searchAnalytics) searchAnalytics.textContent = this.profileData.searchAppearances || 0;
            if (connectionsAnalytics) connectionsAnalytics.textContent = '0';
        }
    }

    async renderSuggestedConnections() {
        const suggestionsList = document.getElementById('suggestedConnectionsList');
        
        if (!suggestionsList) return;

        try {
            const response = await fetch(`${API_URL}/api/users/suggested-connections`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const suggestions = await response.json();
                
                if (suggestions.length === 0) {
                    this.renderEmptyState(suggestionsList, 'suggestions');
                    return;
                }

                suggestionsList.innerHTML = suggestions.slice(0, 3).map(user => `
                    <div class="suggested-connection-item">
                        <img src="${this.getProfileImageUrl(user)}" 
                             alt="${user.name}" class="suggestion-avatar">
                        <div class="suggestion-info">
                            <h4>${user.name}</h4>
                            <p>${user.headline || user.title || 'Professional'}</p>
                            <button class="btn btn-secondary btn-small connect-suggestion-btn" 
                                    data-user-id="${user._id}">
                                Connect
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                // Handle any API error gracefully
                console.log(`Suggested connections API responded with ${response.status}`);
                this.renderSuggestedConnectionsFallback(suggestionsList);
            }
        } catch (error) {
            console.log('Suggested connections API not available:', error.message);
            this.renderSuggestedConnectionsFallback(suggestionsList);
        }
    }

    renderSuggestedConnectionsFallback(container) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.996 1.996 0 0 0 17.98 8H16.02a2 2 0 0 0-1.98 1.37L11.5 16H14v6h6zM12.5 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9V9.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V15H6V9.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V15H3v7h4.5z"/>
                </svg>
                <h3>Suggestions Loading...</h3>
                <p>We're working on finding great connections for you.</p>
            </div>
        `;
    }

    // ========================================
    // Profile Actions & Interactions
    // ========================================

    setupProfileActions() {
        // Edit Profile Button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = 'edit-profile.html';
            });
        }

        // Share Profile Button
        const shareProfileBtn = document.getElementById('shareProfileBtn');
        if (shareProfileBtn) {
            shareProfileBtn.addEventListener('click', () => this.shareProfile());
        }

        // Message User Button
        const messageUserBtn = document.getElementById('messageUserBtn');
        if (messageUserBtn) {
            messageUserBtn.addEventListener('click', () => this.startConversation());
        }

        // Connect Button
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.sendConnectionRequest());
        }

        // Edit About Button
        const editAboutBtn = document.getElementById('editAboutBtn');
        if (editAboutBtn) {
            editAboutBtn.addEventListener('click', () => this.editAboutSection());
        }

        // Edit Company Info Button
        const editCompanyInfoBtn = document.getElementById('editCompanyInfoBtn');
        if (editCompanyInfoBtn) {
            editCompanyInfoBtn.addEventListener('click', () => this.editCompanyInfoSection());
        }
    }

    setupProfileSpecificFeatures() {
        // Setup connection suggestions
        document.querySelectorAll('.connect-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.sendConnectionRequest(userId);
            });
        });

        // Setup skill endorsements
        document.querySelectorAll('.skill-tag').forEach(tag => {
            if (!this.isOwner) {
                tag.style.cursor = 'pointer';
                tag.addEventListener('click', () => {
                    this.endorseSkill(tag.textContent.trim());
                });
            }
        });
    }

    showOwnerControls() {
        // Show edit controls for profile owner
        const ownerControls = [
            'coverEditControls',
            'avatarEditOverlay',
            'editNameBtn',
            'editHeadlineBtn',
            'editLocationBtn',
            'editAboutBtn',
            'addExperienceBtn',
            'addEducationBtn',
            'addSkillsBtn',
            'editProfileBtn'
        ];

        ownerControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = element.tagName === 'BUTTON' ? 'flex' : 'block';
            }
        });
    }

    showViewerControls() {
        // Show interaction controls for profile viewers
        const viewerControls = [
            'messageUserBtn',
            'connectBtn'
        ];

        viewerControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'flex';
            }
        });

        // Check connection status
        this.updateConnectionStatus();
    }

    async updateConnectionStatus() {
        try {
            const response = await fetch(`${API_URL}/api/connections/status/${this.profileUserId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const status = await response.json();
                const connectBtn = document.getElementById('connectBtn');
                
                if (connectBtn) {
                    switch (status.status) {
                        case 'connected':
                            connectBtn.textContent = '✓ Connected';
                            connectBtn.disabled = true;
                            connectBtn.classList.add('btn-success');
                            break;
                        case 'pending':
                            connectBtn.textContent = 'Request Sent';
                            connectBtn.disabled = true;
                            connectBtn.classList.add('btn-warning');
                            break;
                        case 'received':
                            connectBtn.textContent = 'Accept Request';
                            connectBtn.onclick = () => this.acceptConnectionRequest();
                            break;
                        default:
                            connectBtn.textContent = 'Connect';
                            break;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking connection status:', error);
        }
    }

    // ========================================
    // Social Interactions
    // ========================================

    async sendConnectionRequest(userId = null) {
        const targetUserId = userId || this.profileUserId;
        
        try {
            const response = await fetch(`${API_URL}/api/connections/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipientId: targetUserId,
                    message: `I'd like to connect with you on JobLink Eswatini.`
                })
            });

            if (response.ok) {
                this.showNotification('Connection request sent!', 'success');
                this.updateConnectionStatus();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send connection request');
            }
        } catch (error) {
            console.error('Error sending connection request:', error);
            this.showNotification('Failed to send connection request', 'error');
        }
    }

    async acceptConnectionRequest() {
        try {
            const response = await fetch(`${API_URL}/api/connections/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    requesterId: this.profileUserId
                })
            });

            if (response.ok) {
                this.showNotification('Connection request accepted!', 'success');
                this.updateConnectionStatus();
                // Refresh profile data to update connection count
                this.profileCache.delete(`profile_${this.profileUserId}`);
                await this.loadProfileData();
            } else {
                throw new Error('Failed to accept connection request');
            }
        } catch (error) {
            console.error('Error accepting connection request:', error);
            this.showNotification('Failed to accept connection request', 'error');
        }
    }

    async startConversation() {
        try {
            const response = await fetch(`${API_URL}/api/messages/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    recipientId: this.profileUserId
                })
            });

            if (response.ok) {
                const conversation = await response.json();
                // Redirect to message center or open chat
                window.location.href = `message-center.html?conversation=${conversation._id}`;
            } else {
                throw new Error('Failed to start conversation');
            }
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showNotification('Failed to start conversation', 'error');
        }
    }

    async endorseSkill(skillName) {
        try {
            const response = await fetch(`${API_URL}/api/users/endorse-skill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    userId: this.profileUserId,
                    skill: skillName
                })
            });

            if (response.ok) {
                this.showNotification(`Endorsed ${skillName}!`, 'success');
                // Refresh skills section
                await this.renderSkillsSection();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to endorse skill');
            }
        } catch (error) {
            console.error('Error endorsing skill:', error);
            this.showNotification('Failed to endorse skill', 'error');
        }
    }

    async shareProfile() {
        const profileUrl = `${window.location.origin}${window.location.pathname}?id=${this.profileUserId}`;
        const profileName = this.profileData.name || 'JobLink Eswatini Profile';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: profileName,
                    text: `Check out ${profileName} on JobLink Eswatini`,
                    url: profileUrl
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    this.fallbackShare(profileUrl);
                }
            }
        } else {
            this.fallbackShare(profileUrl);
        }
    }

    fallbackShare(url) {
        // Copy URL to clipboard
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('Profile URL copied to clipboard!', 'success');
        }).catch(() => {
            // Show URL in modal for manual copy
            this.showShareModal(url);
        });
    }

    showShareModal(url) {
        const modal = this.createModal('Share Profile', `
            <div class="form-group">
                <label>Profile URL:</label>
                <input type="text" value="${url}" readonly onclick="this.select()">
                <div class="form-hint">Copy this URL to share the profile</div>
            </div>
        `);
        this.showModal(modal);
    }

    // ========================================
    // Profile Views & Analytics
    // ========================================

    async updateProfileViews() {
        if (this.isOwner) return; // Don't track own profile views

        try {
            await fetch(`${API_URL}/api/users/profile-view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    profileId: this.profileUserId,
                    viewerId: this.currentUser._id
                })
            });
        } catch (error) {
            console.error('Error tracking profile view:', error);
        }
    }

    initializeAnalytics() {
        if (!this.isOwner) return;

        // Track time spent on profile
        this.analyticsTimer = setInterval(() => {
            this.trackTimeSpent();
        }, 30000); // Track every 30 seconds
    }

    async trackTimeSpent() {
        try {
            await fetch(`${API_URL}/api/analytics/time-spent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    page: 'profile',
                    duration: 30 // seconds
                })
            });
        } catch (error) {
            console.error('Error tracking time spent:', error);
        }
    }

    // ========================================
    // Event Listeners & UI Interactions
    // ========================================

    setupEventListeners() {
        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || 
                e.target.classList.contains('modal-close')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal[style*="flex"]');
                if (activeModal) {
                    this.closeModal(activeModal);
                }
            }
        });

        // Notification close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                this.closeNotification(e.target.closest('.notification'));
            }
        });
    }

    // ========================================
    // Image Upload & File Handling
    // ========================================

    initializeImageUpload() {
        // Cover photo upload
        const coverEditBtn = document.getElementById('editCoverBtn');
        const coverPhotoInput = document.getElementById('coverPhotoInput');
        
        if (coverEditBtn && coverPhotoInput) {
            coverEditBtn.addEventListener('click', () => coverPhotoInput.click());
            coverPhotoInput.addEventListener('change', (e) => this.handleCoverPhotoUpload(e));
        }

        // Profile picture upload
        const editAvatarBtn = document.getElementById('editAvatarBtn');
        const profilePictureInput = document.getElementById('profilePictureInput');
        
        if (editAvatarBtn && profilePictureInput) {
            editAvatarBtn.addEventListener('click', () => profilePictureInput.click());
            profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }
    }

    async handleCoverPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.validateImage(file)) return;

        try {
            const formData = new FormData();
            formData.append('coverPhoto', file);

            const response = await fetch(`${API_URL}/api/users/cover-photo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Cover photo updated successfully!', 'success');
                
                // Update UI immediately
                const coverEl = document.getElementById('profileCover');
                if (coverEl) {
                    coverEl.style.backgroundImage = `url('${API_URL}/api/files/${result.filename}')`;
                }
            } else {
                throw new Error('Failed to upload cover photo');
            }
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            this.showNotification('Failed to upload cover photo', 'error');
        }
    }

    async handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.validateImage(file)) return;

        try {
            const formData = new FormData();
            formData.append('profilePicture', file);

            const response = await fetch(`${API_URL}/api/users/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Profile picture updated successfully!', 'success');
                
                // Update UI immediately
                const imageUrl = `${API_URL}/api/files/${result.filename}`;
                const avatarElements = [
                    document.getElementById('profileAvatar'),
                    document.getElementById('navProfilePic'),
                    document.getElementById('mobileProfilePic')
                ];
                
                avatarElements.forEach(el => {
                    if (el) el.src = imageUrl;
                });
            } else {
                throw new Error('Failed to upload profile picture');
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showNotification('Failed to upload profile picture', 'error');
        }
    }

    validateImage(file) {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Please select a valid image file (JPEG, PNG, WebP)', 'error');
            return false;
        }

        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            this.showNotification('File size must be less than 5MB', 'error');
            return false;
        }

        return true;
    }

    // ========================================
    // Utility Functions
    // ========================================

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Format text with line breaks and basic formatting
    formatText(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    // Format company size for display
    formatCompanySize(size) {
        if (!size) return null;
        const sizeMap = {
            '1-10': '1-10 employees',
            '11-50': '11-50 employees', 
            '51-200': '51-200 employees',
            '201-500': '201-500 employees',
            '501-1000': '501-1000 employees',
            '1000+': '1000+ employees'
        };
        return sizeMap[size] || size;
    }

    // Render social links section
    renderSocialLinksSection(socialLinks) {
        if (!socialLinks || Object.keys(socialLinks).length === 0) {
            return this.isOwner ? '<div class="company-info-note"><em>Add social media links to connect with your audience</em></div>' : '';
        }

        const linkItems = Object.entries(socialLinks)
            .filter(([platform, url]) => url && url.trim())
            .map(([platform, url]) => {
                const formatUrl = (url) => {
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        return `https://${url}`;
                    }
                    return url;
                };
                
                const platformIcons = {
                    linkedin: '💼',
                    twitter: '🐦',
                    facebook: '📘',
                    instagram: '📷',
                    github: '💻'
                };
                
                return `
                    <a href="${formatUrl(url)}" target="_blank" rel="noopener noreferrer" class="social-link">
                        <span class="social-icon">${platformIcons[platform] || '🌐'}</span>
                        <span class="social-platform">${platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                    </a>
                `;
            }).join('');

        return linkItems ? `
            <div class="company-info-section">
                <h4 class="company-info-section-title">Social Media</h4>
                <div class="social-links">${linkItems}</div>
            </div>
        ` : '';
    }

    // Load active jobs count for company
    async loadActiveJobsCount() {
        if (this.profileData.role !== 'company') return;
        
        try {
            const response = await fetch(`${API_URL}/api/jobs/company/${this.profileUserId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const jobs = await response.json();
                const activeJobs = jobs.filter(job => 
                    job.status === 'active' || job.status === 'published'
                ).length;
                
                const activeJobsEl = document.getElementById('activeJobsCount');
                if (activeJobsEl) {
                    activeJobsEl.textContent = activeJobs;
                }
            }
        } catch (error) {
            console.log('Could not load active jobs count:', error.message);
        }
    }

    calculateDuration(startDate, endDate) {
        if (!startDate) return 'Duration unknown';

        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        
        const diffTime = Math.abs(end - start);
        const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
        
        if (diffMonths < 1) return 'Less than a month';
        if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
        
        const years = Math.floor(diffMonths / 12);
        const remainingMonths = diffMonths % 12;
        
        let duration = `${years} year${years !== 1 ? 's' : ''}`;
        if (remainingMonths > 0) {
            duration += ` ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
        }
        
        return duration;
    }

    // ========================================
    // Notification System
    // ========================================

    initializeNotifications() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.closeNotification(notification);
        }, 5000);
    }

    closeNotification(notification) {
        if (notification) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    // ========================================
    // Modal System
    // ========================================

    initializeModals() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-container')) {
            const container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }
    }

    createModal(title, content, actions = '') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
            </div>
        `;
        return modal;
    }

    showModal(modal) {
        const container = document.getElementById('modal-container');
        if (container) {
            container.appendChild(modal);
            modal.style.display = 'flex';
            // Focus trap for accessibility
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            }
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            setTimeout(() => {
                modal.remove();
            }, 100);
        }
    }

    // ========================================
    // Document Management
    // ========================================

    initializeDocumentUpload() {
        const documentUpload = document.getElementById('documentUpload');
        if (documentUpload) {
            documentUpload.addEventListener('change', (e) => this.handleDocumentUpload(e));
        }

        // Setup drag and drop for document upload area
        const uploadArea = document.querySelector('.document-upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                this.handleDocumentDrop(e);
            });
        }
    }

    async handleDocumentUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            if (!this.validateDocument(file)) continue;
            await this.uploadDocument(file);
        }
    }

    async handleDocumentDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;

        for (const file of files) {
            if (!this.validateDocument(file)) continue;
            await this.uploadDocument(file);
        }
    }

    validateDocument(file) {
        // Check file type
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'image/jpeg',
            'image/png'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Please select a valid document file (PDF, DOC, DOCX, TXT, JPG, PNG)', 'error');
            return false;
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('File size must be less than 10MB', 'error');
            return false;
        }

        return true;
    }

    async uploadDocument(file) {
        try {
            const formData = new FormData();
            formData.append('document', file);
            
            // Add document metadata
            const title = prompt(`Enter a title for "${file.name}":`) || file.name;
            const description = prompt('Enter a description (optional):') || '';
            
            formData.append('title', title);
            formData.append('description', description);
            formData.append('type', this.getDocumentType(file.type));

            const response = await fetch(`${API_URL}/api/users/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification('Document uploaded successfully!', 'success');
                
                // Refresh profile data and re-render documents section
                this.profileCache.delete(`profile_${this.profileUserId}`);
                await this.loadProfileData();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload document');
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            this.showNotification('Failed to upload document: ' + error.message, 'error');
        }
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

            if (response.ok) {
                this.showNotification('Document deleted successfully!', 'success');
                
                // Refresh profile data and re-render documents section
                this.profileCache.delete(`profile_${this.profileUserId}`);
                await this.loadProfileData();
            } else {
                throw new Error('Failed to delete document');
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            this.showNotification('Failed to delete document', 'error');
        }
    }

    getDocumentIcon(mimetype) {
        const iconMap = {
            'application/pdf': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20,8L14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8M18,20H6V4H13V9H18V20Z"/></svg>`,
            'application/msword': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`,
            'text/plain': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>`,
            'image/jpeg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/></svg>`,
            'image/png': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/></svg>`
        };
        
        return iconMap[mimetype] || iconMap['text/plain'];
    }

    getDocumentType(mimetype) {
        const typeMap = {
            'application/pdf': 'PDF',
            'application/msword': 'Word Document',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
            'text/plain': 'Text File',
            'image/jpeg': 'Image',
            'image/png': 'Image'
        };
        
        return typeMap[mimetype] || 'Document';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ========================================
    // Enhanced Profile Setup
    // ========================================

    setupProfileSpecificFeatures() {
        // Call parent method
        this.setupConnectionSuggestions();
        this.setupSkillEndorsements();
        
        // Initialize document upload if owner
        if (this.isOwner) {
            setTimeout(() => {
                this.initializeDocumentUpload();
            }, 100);
        }
    }

    setupConnectionSuggestions() {
        // Setup connection suggestions
        document.querySelectorAll('.connect-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.sendConnectionRequest(userId);
            });
        });
    }

    setupSkillEndorsements() {
        // Setup skill endorsements
        document.querySelectorAll('.skill-tag').forEach(tag => {
            if (!this.isOwner) {
                tag.style.cursor = 'pointer';
                tag.addEventListener('click', () => {
                    this.endorseSkill(tag.textContent.trim());
                });
            }
        });
    }

    // ========================================
    // Enhanced Owner Controls
    // ========================================

    showOwnerControls() {
        // Show edit controls for profile owner
        const ownerControls = [
            'coverEditControls',
            'avatarEditOverlay',
            'editNameBtn',
            'editHeadlineBtn',
            'editLocationBtn',
            'editAboutBtn',
            'addExperienceBtn',
            'addEducationBtn',
            'addSkillsBtn',
            'editProfileBtn'
        ];

        // Add role-specific controls
        if (this.profileData.role === 'jobseeker') {
            ownerControls.push('addDocumentBtn');
        } else if (this.profileData.role === 'company') {
            ownerControls.push('editCompanyInfoBtn', 'addJobPostingBtn');
        }

        ownerControls.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = element.tagName === 'BUTTON' ? 'flex' : 'block';
            }
        });
    }

    // ========================================
    // Job Posting Management
    // ========================================

    async editJobPosting(jobId) {
        // Redirect to job editing page
        window.location.href = `edit-job.html?id=${jobId}`;
    }

    async viewJobApplicants(jobId) {
        // Redirect to job applicants page
        window.location.href = `job-applicants.html?id=${jobId}`;
    }

    async closeJobPosting(jobId) {
        if (!confirm('Are you sure you want to close this job posting? Applicants will no longer be able to apply.')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/jobs/${jobId}/close`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Job posting closed successfully', 'success');
                // Refresh job postings
                await this.renderJobPostingsSection();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to close job posting');
            }
        } catch (error) {
            console.error('Error closing job posting:', error);
            this.showNotification('Failed to close job posting: ' + error.message, 'error');
        }
    }

    async reopenJobPosting(jobId) {
        if (!confirm('Are you sure you want to reopen this job posting?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/jobs/${jobId}/reopen`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Job posting reopened successfully', 'success');
                // Refresh job postings
                await this.renderJobPostingsSection();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reopen job posting');
            }
        } catch (error) {
            console.error('Error reopening job posting:', error);
            this.showNotification('Failed to reopen job posting: ' + error.message, 'error');
        }
    }

    async deleteJobPosting(jobId) {
        if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Job posting deleted successfully', 'success');
                // Refresh job postings
                await this.renderJobPostingsSection();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete job posting');
            }
        } catch (error) {
            console.error('Error deleting job posting:', error);
            this.showNotification('Failed to delete job posting: ' + error.message, 'error');
        }
    }

    async applyToJob(jobId) {
        if (this.currentUser.role !== 'jobseeker') {
            this.showNotification('Only job seekers can apply to jobs', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/jobs/${jobId}/apply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Application submitted successfully!', 'success');
                // Refresh job postings to update applicant count
                await this.renderJobPostingsSection();
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to submit application');
            }
        } catch (error) {
            console.error('Error applying to job:', error);
            this.showNotification('Failed to submit application: ' + error.message, 'error');
        }
    }

    // ========================================
    // Profile Editing Functions
    // ========================================

    async editAboutSection() {
        const currentAbout = this.profileData.role === 'company' ? 
            (this.profileData.companyDescription || this.profileData.bio || '') :
            (this.profileData.bio || this.profileData.about || '');
        
        const title = this.profileData.role === 'company' ? 'Edit Company Description' : 'Edit About Section';
        const placeholder = this.profileData.role === 'company' ? 
            'Describe your company, mission, values, and what makes you unique...' :
            'Tell others about yourself, your experience, goals, and interests...';
        
        const modal = this.createModal(title, `
            <div class="form-group">
                <label for="aboutTextArea">Description:</label>
                <textarea id="aboutTextArea" rows="6" placeholder="${placeholder}">${currentAbout}</textarea>
                <div class="form-hint">Share what makes you unique and what you're looking for.</div>
            </div>
        `, `
            <button type="button" class="btn btn-secondary" onclick="profileManager.closeModal(this.closest('.modal'))">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" onclick="profileManager.saveAboutSection()">
                Save Changes
            </button>
        `);
        
        this.showModal(modal);
    }

    async saveAboutSection() {
        const aboutTextArea = document.getElementById('aboutTextArea');
        if (!aboutTextArea) return;
        
        const aboutText = aboutTextArea.value.trim();
        
        try {
            let endpoint = '/api/users/profile';
            let requestBody = {};
            
            if (this.profileData.role === 'company') {
                endpoint = '/api/users/profile/company';
                requestBody.companyDescription = aboutText;
            } else {
                requestBody.bio = aboutText;
            }
            
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                
                // Update local profile data
                if (this.profileData.role === 'company') {
                    this.profileData.companyDescription = aboutText;
                } else {
                    this.profileData.bio = aboutText;
                    this.profileData.about = aboutText;
                }
                
                // Re-render the about section
                await this.renderAboutSection();
                
                // Close modal and show success message
                const activeModal = document.querySelector('.modal[style*="flex"]');
                if (activeModal) this.closeModal(activeModal);
                
                this.showNotification('Profile updated successfully!', 'success');
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            console.error('Error saving about section:', error);
            this.showNotification('Failed to update profile', 'error');
        }
    }

    async editCompanyInfoSection() {
        if (this.profileData.role !== 'company') return;
        
        const company = this.profileData;
        
        const modal = this.createModal('Edit Company Information', `
            <div class="form-group">
                <label for="industryInput">Industry:</label>
                <input type="text" id="industryInput" value="${company.industry || ''}" placeholder="e.g., Technology, Healthcare, Finance">
            </div>
            <div class="form-group">
                <label for="companySizeSelect">Company Size:</label>
                <select id="companySizeSelect">
                    <option value="">Select company size</option>
                    <option value="1-10" ${company.companySize === '1-10' ? 'selected' : ''}>1-10 employees</option>
                    <option value="11-50" ${company.companySize === '11-50' ? 'selected' : ''}>11-50 employees</option>
                    <option value="51-200" ${company.companySize === '51-200' ? 'selected' : ''}>51-200 employees</option>
                    <option value="201-500" ${company.companySize === '201-500' ? 'selected' : ''}>201-500 employees</option>
                    <option value="501-1000" ${company.companySize === '501-1000' ? 'selected' : ''}>501-1000 employees</option>
                    <option value="1000+" ${company.companySize === '1000+' ? 'selected' : ''}>1000+ employees</option>
                </select>
            </div>
            <div class="form-group">
                <label for="foundedYearInput">Founded Year:</label>
                <input type="number" id="foundedYearInput" value="${company.foundedYear || ''}" placeholder="e.g., 2010" min="1800" max="${new Date().getFullYear()}">
            </div>
            <div class="form-group">
                <label for="websiteInput">Website:</label>
                <input type="url" id="websiteInput" value="${company.website || ''}" placeholder="https://www.yourcompany.com">
            </div>
            <div class="form-group">
                <label for="phoneInput">Phone Number:</label>
                <input type="tel" id="phoneInput" value="${company.phoneNumber || ''}" placeholder="+268 123 4567">
            </div>
        `, `
            <button type="button" class="btn btn-secondary" onclick="profileManager.closeModal(this.closest('.modal'))">
                Cancel
            </button>
            <button type="button" class="btn btn-primary" onclick="profileManager.saveCompanyInfo()">
                Save Changes
            </button>
        `);
        
        this.showModal(modal);
    }

    async saveCompanyInfo() {
        const industry = document.getElementById('industryInput')?.value.trim() || '';
        const companySize = document.getElementById('companySizeSelect')?.value || '';
        const foundedYear = document.getElementById('foundedYearInput')?.value || null;
        const website = document.getElementById('websiteInput')?.value.trim() || '';
        const phoneNumber = document.getElementById('phoneInput')?.value.trim() || '';
        
        try {
            const response = await fetch(`${API_URL}/api/users/profile/company`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    industry,
                    companySize,
                    foundedYear: foundedYear ? parseInt(foundedYear) : null,
                    website,
                    phoneNumber
                })
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                
                // Update local profile data
                this.profileData.industry = industry;
                this.profileData.companySize = companySize;
                this.profileData.foundedYear = foundedYear ? parseInt(foundedYear) : null;
                this.profileData.website = website;
                this.profileData.phoneNumber = phoneNumber;
                
                // Re-render the company info section
                await this.renderCompanyInfoSection();
                
                // Close modal and show success message
                const activeModal = document.querySelector('.modal[style*="flex"]');
                if (activeModal) this.closeModal(activeModal);
                
                this.showNotification('Company information updated successfully!', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update company information');
            }
        } catch (error) {
            console.error('Error saving company info:', error);
            this.showNotification('Failed to update company information: ' + error.message, 'error');
        }
    }

    // ========================================
    // Role-Based Section Visibility
    // ========================================

    applyRoleBasedVisibility() {
        const userRole = this.profileData.role || 'jobseeker';
        
        // Define sections that should only appear for specific roles
        const roleSections = {
            jobseeker: [
                'experienceSection',
                'educationSection',
                'skillsSection',
                'documentsSection'
            ],
            company: [
                'companyInfoSection',
                'jobPostingsSection'
            ]
        };
        
        // Hide all role-specific sections first
        Object.values(roleSections).flat().forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });
        
        // Show sections appropriate for the current role
        const sectionsToShow = roleSections[userRole] || roleSections.jobseeker;
        sectionsToShow.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'block';
            }
        });
    }

    // ========================================
    // Cleanup
    // ========================================

    destroy() {
        // Clear timers
        if (this.analyticsTimer) {
            clearInterval(this.analyticsTimer);
        }

        // Clear cache
        this.profileCache.clear();

        // Remove event listeners
        // (Event listeners are handled via event delegation, so no manual removal needed)
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new EnhancedProfileManager();
    
    // Add global debug functions
    window.clearProfileCache = () => {
        console.log('🗑️ Clearing profile cache from console...');
        if (window.profileManager) {
            window.profileManager.clearCache();
            console.log('✅ Profile cache cleared');
        } else {
            sessionStorage.removeItem('currentUser');
            console.log('✅ Session storage cleared');
        }
    };
    
    window.debugProfile = () => {
        if (window.profileManager) {
            window.profileManager.debugSessionData();
        } else {
            console.log('🐞 No profile manager available');
        }
    };
    
    window.reloadProfile = async () => {
        if (window.profileManager) {
            console.log('🔄 Reloading profile...');
            window.profileManager.clearCache();
            await window.profileManager.loadCurrentUser();
        } else {
            window.location.reload();
        }
    };
    
    window.testUserAPI = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found');
            return;
        }
        
        try {
            console.log('🌐 Testing /api/users/me...');
            const response = await fetch(`${API_URL}/api/users/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ Current user from API:', {
                    id: userData._id,
                    name: userData.name,
                    role: userData.role,
                    email: userData.email
                });
                return userData;
            } else {
                const errorText = await response.text();
                console.error('❌ API Error:', response.status, errorText);
            }
        } catch (error) {
            console.error('💥 Network Error:', error.message);
        }
    };
    
    window.testCurrentProfile = async () => {
        if (!window.profileManager) {
            console.error('❌ Profile manager not available');
            return;
        }
        
        const currentUserId = window.profileManager.currentUser?._id;
        if (!currentUserId) {
            console.error('❌ No current user ID available');
            return;
        }
        
        console.log('🌐 Testing profile endpoint for current user:', currentUserId);
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/users/profile/${currentUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const profileData = await response.json();
                console.log('✅ Profile data from API:', {
                    requestedId: currentUserId,
                    returnedId: profileData._id,
                    name: profileData.name,
                    role: profileData.role,
                    match: profileData._id === currentUserId ? 'YES' : 'NO - MISMATCH!'
                });
                
                if (profileData._id !== currentUserId) {
                    console.error('⚠️ CRITICAL: Profile data mismatch detected!');
                }
                
                return profileData;
            } else {
                const errorText = await response.text();
                console.error('❌ Profile API Error:', response.status, errorText);
            }
        } catch (error) {
            console.error('💥 Network Error:', error.message);
        }
    };
    
    console.log('🔧 Debug functions: clearProfileCache(), debugProfile(), reloadProfile(), testUserAPI(), testCurrentProfile()');
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.profileManager) {
        window.profileManager.destroy();
    }
});
