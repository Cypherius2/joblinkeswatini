// Theme Toggle Functionality for JobLinkEswatini
// This script manages switching between light and dark themes

const ThemeController = {
    // Initialize theme controller
    init() {
        this.applyStoredTheme();
        this.setupToggleButton();
    },

    // Apply the theme stored in localStorage or default to light
    applyStoredTheme() {
        const storedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // Use stored theme, or default to system preference, or light as fallback
        const theme = storedTheme || (prefersDark ? 'dark' : 'light');
        
        this.applyTheme(theme);
    },

    // Apply the specified theme
    applyTheme(theme) {
        const body = document.body;
        const themeToggleIcon = document.getElementById('themeToggleIcon');
        const themeToggleText = document.getElementById('themeToggleText');

        if (theme === 'dark') {
            body.classList.add('dark-theme');
            if (themeToggleIcon) themeToggleIcon.textContent = '☀️';
            if (themeToggleText) themeToggleText.textContent = 'Light Theme';
        } else {
            body.classList.remove('dark-theme');
            if (themeToggleIcon) themeToggleIcon.textContent = '🌙';
            if (themeToggleText) themeToggleText.textContent = 'Dark Theme';
        }
    },

    // Set up the toggle button event listener
    setupToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });
        }
    },

    // Toggle between light and dark themes
    toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply the new theme
        this.applyTheme(newTheme);
        
        // Store the preference
        localStorage.setItem('theme', newTheme);
        
        // Optionally show a notification
        this.showThemeChangeNotification(newTheme);
    },

    // Show a brief notification when theme changes
    showThemeChangeNotification(theme) {
        try {
            // Wait a bit to ensure showNotification is available
            setTimeout(() => {
                if (typeof showNotification === 'function') {
                    const message = theme === 'dark' ? '🌙 Dark theme enabled' : '☀️ Light theme enabled';
                    showNotification(message, 'success');
                } else if (typeof window.showNotification === 'function') {
                    const message = theme === 'dark' ? '🌙 Dark theme enabled' : '☀️ Light theme enabled';
                    window.showNotification(message, 'success');
                } else {
                    console.log(`Theme changed to ${theme}`);
                }
            }, 100);
        } catch (error) {
            console.error('Error showing theme change notification:', error);
        }
    }
};

// Initialize the theme controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ThemeController.init();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ThemeController.init();
    });
} else {
    ThemeController.init();
}
