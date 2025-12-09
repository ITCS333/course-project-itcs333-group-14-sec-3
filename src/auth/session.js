// ===== Session Management Utility =====

const AuthSession = {
  // Store user session in localStorage
  setSession: function(user) {
    localStorage.setItem('authUser', JSON.stringify(user));
  },

  // Get current user session
  getSession: function() {
    const user = localStorage.getItem('authUser');
    return user ? JSON.parse(user) : null;
  },

  // Check if user is logged in
  isLoggedIn: function() {
    return this.getSession() !== null;
  },

  // Get user email
  getUserEmail: function() {
    const user = this.getSession();
    return user ? user.email : null;
  },

  // Check if user is admin
  isAdmin: function() {
    const user = this.getSession();
    return user ? user.is_admin === 1 : false;
  },

  // Clear session (logout)
  clearSession: function() {
    localStorage.removeItem('authUser');
  },

  // Redirect to login if not authenticated
  requireAuth: function(redirectPath = '../auth/login.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectPath;
    }
  }
};
