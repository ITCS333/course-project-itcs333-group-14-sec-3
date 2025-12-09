const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");
const togglePasswordBtn = document.getElementById("toggle-password");

// ===== Password Visibility Toggle =====
togglePasswordBtn.addEventListener('click', function(e) {
  e.preventDefault();
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  
  // Update button state and icon
  if (isPassword) {
    // Switching to text (showing password)
    togglePasswordBtn.classList.remove('hidden');
    togglePasswordBtn.setAttribute('aria-label', 'Hide password');
    togglePasswordBtn.title = 'Hide password';
  } else {
    // Switching to password (hiding password)
    togglePasswordBtn.classList.add('hidden');
    togglePasswordBtn.setAttribute('aria-label', 'Show password');
    togglePasswordBtn.title = 'Show password';
  }
});

// ===== Form Validation =====
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function showError() {
  errorMessage.style.display = 'block';
  errorMessage.setAttribute('role', 'alert');
}

function hideError() {
  errorMessage.style.display = 'none';
}

// ===== Form Submit Handler =====
async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Validation: check if fields are empty
  if (!email || !password) {
    showError();
    return;
  }

  // Validation: check email format
  if (!isValidEmail(email)) {
    showError();
    return;
  }

  // Hide error if validation passed
  hideError();

  try {
    // Call the PHP API for authentication
    const response = await fetch("api/index.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!result.success) {
      showError();
      return;
    }

    // Login successful - save session
    console.log('Login successful for:', email);
    AuthSession.setSession({
      email: email,
      is_admin: result.user ? result.user.is_admin : 0
    });

    // Redirect based on user role
    if (result.user && result.user.is_admin === 1) {
      window.location.href = "../admin/manage_users.html";
    } else {
      window.location.href = "../index.html";
    }

  } catch (error) {
    console.error("Error during login:", error);
    showError();
  }
}

// ===== Event Listeners =====
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

// Hide error message when user starts typing
emailInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);
