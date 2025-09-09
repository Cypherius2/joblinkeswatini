// Debug script for notification system
// Add this to any page to test notifications

function debugNotifications() {
    console.log('=== NOTIFICATION DEBUG ===');
    
    // Check if notification container exists
    const container = document.getElementById('notification-container');
    console.log('Notification container exists:', !!container);
    if (container) {
        console.log('Container element:', container);
    }
    
    // Check if showNotification function exists
    console.log('showNotification function exists:', typeof showNotification);
    console.log('window.showNotification exists:', typeof window.showNotification);
    
    // Check if main.js is loaded
    console.log('notificationModule exists:', typeof notificationModule !== 'undefined');
    
    // Check current theme
    const isDarkTheme = document.body.classList.contains('dark-theme');
    console.log('Dark theme active:', isDarkTheme);
    
    // Test basic functionality
    if (typeof showNotification === 'function') {
        console.log('Testing showNotification...');
        try {
            showNotification('🧪 Debug test notification', 'success');
            console.log('✅ Success notification test passed');
            
            setTimeout(() => {
                showNotification('❌ Debug error notification', 'error');
                console.log('✅ Error notification test passed');
            }, 1000);
        } catch (error) {
            console.error('❌ Notification test failed:', error);
        }
    } else {
        console.error('❌ showNotification function not available');
    }
    
    console.log('=== END DEBUG ===');
}

// Auto-run debug when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(debugNotifications, 1000);
    });
} else {
    setTimeout(debugNotifications, 1000);
}

// Make it globally available
window.debugNotifications = debugNotifications;
