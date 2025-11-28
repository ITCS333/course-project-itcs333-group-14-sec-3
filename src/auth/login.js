const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("message-container");

// --- Helpers ---

function displayMessage(message, type) {
  messageContainer.textContent = message;
  messageContainer.className = type; // e.g., "success" or "error"
}

function isValidEmail(email) {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

// --- Main submit handler (now talks to PHP) ---

async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Client-side validation
  if (!isValidEmail(email)) {
    displayMessage("Invalid email format.", "error");
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Password must be at least 8 characters.", "error");
    return;
  }

  try {
    // Call the PHP API
    const response = await fetch("api/index.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!result.success) {
      displayMessage(result.message || "Login failed.", "error");
      return;
    }

    // Login OK
    displayMessage("Login successful!", "success");

    // Optional redirect logic:
  if (result.user && result.user.is_admin === 1) {
  window.location.href = "../admin/manage_users.html";
 } else {
    window.location.href = "../index.html"; 
    }

    emailInput.value = "";
    passwordInput.value = "";
  } catch (error) {
    console.error("Error during login:", error);
    displayMessage("Server error. Please try again later.", "error");
  }
}

function setupLoginForm() {
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

// Initialize
setupLoginForm();
