// js/google-auth.js - Google OAuth integration for JobLinkEswatini
// Note: GOOGLE_CLIENT_ID is defined in config.js

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    if (typeof GOOGLE_CLIENT_ID === 'undefined' || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        console.warn('Google Client ID not configured. Please set GOOGLE_CLIENT_ID in config.js');
        return;
    }
    
    if (typeof google !== 'undefined' && google.accounts) {
        // Initialize Google Identity Services
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
    } else {
        console.warn('Google Identity Services not loaded');
    }
}

// Handle the credential response from Google
async function handleCredentialResponse(response) {
    try {
        const credential = response.credential;
        
        // Determine if we're on login or signup page
        const isSignupPage = window.location.pathname.includes('signup');
        const role = isSignupPage ? getSelectedRole() : 'seeker';
        
        const endpoint = isSignupPage ? '/api/auth/google/register' : '/api/auth/google';
        
        const apiResponse = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ credential, role })
        });

        const result = await apiResponse.json();

        if (apiResponse.ok) {
            // Store the JWT token
            localStorage.setItem('token', result.token);
            
            // Show success notification
            const action = result.isNewUser ? 'Registration' : 'Login';
            showNotification(`${action} successful! Welcome ${result.user.name}!`);
            
            // Redirect to profile page after a delay
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1500);
        } else {
            showNotification(result.msg || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Google OAuth error:', error);
        showNotification('Authentication failed. Please try again.', 'error');
    }
}

// Get selected role from signup form
function getSelectedRole() {
    const roleRadio = document.querySelector('input[name="role"]:checked');
    return roleRadio ? roleRadio.value : 'seeker';
}

// Render Google Sign-In button
function renderGoogleButton(containerId) {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.renderButton(
            document.getElementById(containerId),
            {
                theme: 'outline',
                size: 'large',
                width: '100%',
                text: window.location.pathname.includes('signup') ? 'signup_with' : 'signin_with'
            }
        );
    }
}

// Custom Google Sign-In trigger for existing buttons
function triggerGoogleSignIn() {
    if (typeof GOOGLE_CLIENT_ID === 'undefined' || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        showNotification('Google Sign-In is not configured. Please contact the administrator.', 'error');
        return;
    }
    
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.prompt();
    } else {
        showNotification('Google Sign-In is not available. Please try again later.', 'error');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Google Client ID is configured
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        console.log('Google OAuth not configured. Disabling Google Sign-In buttons.');
        
        // Disable Google buttons and show message
        const googleButtons = document.querySelectorAll('.google-btn');
        googleButtons.forEach(button => {
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.addEventListener('click', (e) => {
                e.preventDefault();
                showNotification('Google Sign-In is not configured yet. Please use email/password login.', 'error');
            });
        });
        return;
    }
    
    // Load Google Identity Services script
    loadGoogleScript(() => {
        initializeGoogleSignIn();
        
        // Bind click events to existing Google buttons
        const googleButtons = document.querySelectorAll('.google-btn');
        googleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                triggerGoogleSignIn();
            });
        });
    });
});

// Load Google Identity Services script dynamically
function loadGoogleScript(callback) {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        callback();
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = callback;
    script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        showNotification('Failed to load Google Sign-In. Please refresh the page.', 'error');
    };
    document.head.appendChild(script);
}
