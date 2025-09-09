// Emergency fallback notification system
// This provides basic notifications if main system fails

(function() {
    'use strict';
    
    // Only create if showNotification doesn't exist
    if (typeof window.showNotification === 'undefined') {
        
        function createEmergencyNotification(message, type = 'success') {
            // Remove any existing notifications
            const existing = document.querySelectorAll('.emergency-notification');
            existing.forEach(el => el.remove());
            
            // Create notification
            const notification = document.createElement('div');
            notification.className = 'emergency-notification';
            notification.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <span>${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; opacity: 0.8; padding: 0; margin: 0;">&times;</button>
                </div>
            `;
            
            // Determine colors
            const isDark = document.body.classList.contains('dark-theme');
            let bgColor, textColor, borderColor;
            
            if (type === 'error') {
                if (isDark) {
                    bgColor = '#dc3545'; textColor = '#ffffff'; borderColor = '#c82333';
                } else {
                    bgColor = '#f8d7da'; textColor = '#721c24'; borderColor = '#f5c6cb';
                }
            } else {
                if (isDark) {
                    bgColor = '#28a745'; textColor = '#ffffff'; borderColor = '#1e7e34';
                } else {
                    bgColor = '#d4edda'; textColor = '#155724'; borderColor = '#c3e6cb';
                }
            }
            
            // Apply styles
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                background-color: ${bgColor};
                color: ${textColor};
                border: 1px solid ${borderColor};
                border-left: 5px solid ${borderColor};
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                font-weight: 500;
                min-width: 300px;
                max-width: 400px;
                animation: emergencySlideIn 0.3s ease-out;
            `;
            
            // Add animation CSS if not exists
            if (!document.querySelector('style[data-emergency-notification]')) {
                const style = document.createElement('style');
                style.setAttribute('data-emergency-notification', 'true');
                style.textContent = `
                    @keyframes emergencySlideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Add to page
            document.body.appendChild(notification);
            
            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'emergencySlideIn 0.3s ease-in reverse';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 4000);
        }
        
        // Make it available globally
        window.showNotification = createEmergencyNotification;
        
        console.log('✅ Emergency notification system activated');
    }
    
})();
