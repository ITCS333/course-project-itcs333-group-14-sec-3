
/* all selectors part: */
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("message-container");
const loginButton = document.getElementById("login");


/* all functions part: */
function displayMessage(message, type) {
  const alertType = type === "success" ? "alert-success" : "alert-danger"; // what will be displayed to user based on login data
  messageContainer.innerHTML = `
    <div class="alert ${alertType}" role="alert">
      ${message}
    </div>
  `;
}

function isValidEmail(email) {
  const regex = /\S+@\S+\.\S+/;  // make sure that user input for email is like this : example@example.example
  return regex.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;  // only when password input 8 or longer
}

async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!isValidEmail(email)) {
    displayMessage("Invalid email format.", "error");  // using displayMessage to display the user about his input
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Password must be at least 8 characters.", "error");
    return;
  }


  try {
    const response = await fetch("api/index.php", {  // send the input of the user to the backend
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),  // parse it into json and send it
    });

    const result = await response.json();  // get the response from the backend

    if (!result.success) {
      displayMessage(result.message || "Login failed.", "error");  // using displayMessage to display the user
      return;
    }

    displayMessage("✅ Login successful!", "success");  // using displayMessage that his input was correct 

    setTimeout(() => {                                           // set time counter for about 1 sec before transfer the user to the proper page
      if (result.user && result.user.is_admin === 1) {  
        window.location.href = "../admin/manage_users.html";    // admin will be send to admin portal
      } else {
        window.location.href = "../index.html";                 // student will be send to index page
      }
    }, 1200);

  } catch (error) {
    console.error("Error during login:", error);
    displayMessage("Server error. Please try again.", "error");   // using displayMeassge that some error happened in the backend
  }
}

function setupLoginForm() {
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

setupLoginForm();

/* show/hide password functionality (safe for tests) */
const togglePassword = document.getElementById("togglePassword");

if (togglePassword && passwordInput) {
  const icon = togglePassword.querySelector("i"); // may be null if HTML changes

  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";

    passwordInput.type = isHidden ? "text" : "password";

    if (icon) {
      icon.className = isHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
  });
}
