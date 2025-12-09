// ===== Logout Functionality =====

function handleLogout(e) {
  if (e) {
    e.preventDefault();
  }
  
  // Clear the session
  AuthSession.clearSession();
  
  // Redirect to home page
  window.location.href = '../index.html';
}

// Initialize logout buttons when page loads
document.addEventListener('DOMContentLoaded', function() {
  const logoutButtons = document.querySelectorAll('.logout-btn');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', handleLogout);
  });
});
