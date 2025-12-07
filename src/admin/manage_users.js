// ===== Admin Panel Functionality =====

// Get references to DOM elements
const addStudentToggleBtn = document.getElementById('add-student-toggle');
const addStudentFormContainer = document.getElementById('add-student-form-container');
const addStudentForm = document.getElementById('add-student-form');
const cancelAddStudentBtn = document.getElementById('cancel-add-student');
const changePasswordForm = document.getElementById('change-password-form');
const searchStudentsInput = document.getElementById('search-students');
const studentsTableBody = document.getElementById('students-table-body');
const noStudentsDiv = document.getElementById('no-students');

// Edit modal references
const editStudentModal = document.getElementById('edit-student-modal');
const editStudentForm = document.getElementById('edit-student-form');
const editStudentSubmitBtn = document.getElementById('edit-student-submit');
const cancelEditStudentBtn = document.getElementById('cancel-edit-student');
const editStudentName = document.getElementById('edit-student-name');
const editStudentEmail = document.getElementById('edit-student-email');
const resetPasswordCheckbox = document.getElementById('reset-password-checkbox');

// Modal references
const confirmationModal = document.getElementById('confirmation-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalOverlay = document.querySelector('.modal-overlay');

let allStudents = [];
let pendingAction = null;

// ===== Initialize Page =====
document.addEventListener('DOMContentLoaded', function() {
  // Update welcome message with admin name from session
  updateWelcomeMessage();
  
  // Load students on page load
  loadStudents();
  
  // Setup tab switching
  setupTabs();
  
  // Setup modal close handlers
  setupModalHandlers();

  // Setup edit modal handlers
  setupEditModalHandlers();

  // Setup password field toggles
  setupPasswordToggles();
});

// ===== Modal Handlers =====
function setupModalHandlers() {
  modalCancelBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  modalOverlay.addEventListener('click', closeModal);
  
  // Close modal when clicking on overlay
  confirmationModal.addEventListener('click', function(e) {
    if (e.target === confirmationModal || e.target === modalOverlay) {
      closeModal();
    }
  });
}

function showModal(title, message, onConfirm) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  pendingAction = onConfirm;
  confirmationModal.style.display = 'flex';
}

function closeModal() {
  confirmationModal.style.display = 'none';
  pendingAction = null;
}

modalConfirmBtn.addEventListener('click', async function(e) {
  e.preventDefault();
  e.stopPropagation();
  if (pendingAction && typeof pendingAction === 'function') {
    try {
      // disable confirm button while running to prevent double clicks
      modalConfirmBtn.disabled = true;
      await pendingAction();
    } catch (err) {
      console.error('Error in modal confirm action:', err);
    } finally {
      modalConfirmBtn.disabled = false;
    }
  }
  closeModal();
});

// ===== Tab Switching =====
function setupTabs() {
  const tabButtons = document.querySelectorAll('.admin-tab-btn');
  const tabContents = document.querySelectorAll('.admin-tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const tabName = this.dataset.tab;

      // Remove active class from all
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      // Add active to clicked
      this.classList.add('active');
      document.getElementById(tabName + '-tab').classList.add('active');
    });
  });
}

// ===== Update Welcome Message =====
function updateWelcomeMessage() {
  const welcomeMsg = document.getElementById('welcome-message');
  const user = AuthSession.getSession();
  
  if (user && user.email) {
    // Extract name from email (before @)
    const name = user.email.split('@')[0];
    const displayName = name.charAt(0).toUpperCase() + name.slice(1).replace(/[._-]/g, ' ');
    welcomeMsg.textContent = `Welcome, ${displayName}`;
  }
}

// ===== Add Student Form =====
addStudentToggleBtn.addEventListener('click', function() {
  addStudentFormContainer.style.display = addStudentFormContainer.style.display === 'none' ? 'block' : 'none';
});

cancelAddStudentBtn.addEventListener('click', function() {
  addStudentFormContainer.style.display = 'none';
  addStudentForm.reset();
  clearMessages('add-student');
});

addStudentForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const name = document.getElementById('student-name').value.trim();
  const email = document.getElementById('student-email').value.trim();
  const password = document.getElementById('default-password').value;

  if (!name || !email) {
    showError('add-student', 'Please fill in all fields');
    return;
  }

  try {
    const response = await fetch('api/manage-students.php?action=add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const result = await response.json();

    if (!result.success) {
      showError('add-student', result.message || 'Failed to add student');
      return;
    }

    showSuccess('add-student', 'Student added successfully!');
    addStudentForm.reset();
    setTimeout(() => {
      addStudentFormContainer.style.display = 'none';
      loadStudents();
    }, 1500);

  } catch (error) {
    console.error('Error:', error);
    showError('add-student', 'An error occurred while adding student');
  }
});

// ===== Load Students =====
async function loadStudents() {
  try {
    const response = await fetch('api/manage-students.php?action=list');
    const result = await response.json();

    if (!result.success) {
      noStudentsDiv.style.display = 'block';
      studentsTableBody.innerHTML = '';
      return;
    }

    allStudents = result.students;
    displayStudents(allStudents);

  } catch (error) {
    console.error('Error loading students:', error);
    noStudentsDiv.style.display = 'block';
  }
}

// ===== Display Students =====
function displayStudents(students) {
  if (students.length === 0) {
    studentsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No students found</td></tr>';
    noStudentsDiv.style.display = 'block';
    return;
  }

  noStudentsDiv.style.display = 'none';
  studentsTableBody.innerHTML = students.map(student => `
    <tr>
      <td>${student.name}</td>
      <td>${student.id}</td>
      <td>${student.email}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="btn-edit" onclick="editStudent(${student.id})">Edit</button>
          <button type="button" class="btn-delete" onclick="deleteStudent(${student.id}, '${student.name}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== Search Students =====
searchStudentsInput.addEventListener('input', function() {
  const query = this.value.toLowerCase();
  const filtered = allStudents.filter(student => 
    student.name.toLowerCase().includes(query) || 
    student.email.toLowerCase().includes(query)
  );
  displayStudents(filtered);
});

// ===== Delete Student =====
async function deleteStudent(studentId, studentName) {
  showModal(
    'Delete Student',
    `Are you sure you want to delete ${studentName}? This action cannot be undone.`,
    async function() {
      try {
        const response = await fetch('api/manage-students.php?action=delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: studentId })
        });

        const result = await response.json();

        if (!result.success) {
          alert(result.message || 'Failed to delete student');
          return;
        }

        alert('Student deleted successfully');
        loadStudents();

      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting student');
      }
    }
  );
}

// ===== Setup Edit Modal Handlers =====
function setupEditModalHandlers() {
  // Cancel button: close modal immediately
  cancelEditStudentBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeEditModal();
  });
  
  // Save Changes button: trigger form submission
  editStudentSubmitBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    handleEditFormSubmit(e);
  });
  
  // Close modal when clicking on overlay
  editStudentModal.addEventListener('click', function(e) {
    if (e.target === editStudentModal) {
      closeEditModal();
    }
  });
}

function closeEditModal() {
  editStudentModal.style.display = 'none';
  editStudentForm.reset();
  clearMessages('edit-student');
}

// ===== Open Edit Modal =====
async function editStudent(studentId) {
  try {
    // Fetch student data
    const response = await fetch(`api/manage-students.php?action=get&id=${studentId}`);
    const result = await response.json();

    if (!result.success) {
      alert(result.message || 'Failed to load student data');
      return;
    }

    const student = result.student;

    // Populate form fields
    editStudentName.value = student.name;
    editStudentEmail.value = student.email;
    resetPasswordCheckbox.checked = false;

    // Show modal
    editStudentModal.style.display = 'flex';
    
    // Store current student ID (database ID) for submit
    editStudentForm.dataset.studentId = studentId;

  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while loading student data');
  }
}

// ===== Handle Edit Form Submit =====
async function handleEditFormSubmit(e) {
  e.preventDefault();

  const studentId = parseInt(editStudentForm.dataset.studentId);
  const name = editStudentName.value.trim();
  const email = editStudentEmail.value.trim();
  const resetPassword = resetPasswordCheckbox.checked;

  if (!name || !email) {
    showError('edit-student', 'Please fill in all fields');
    return;
  }

  // Perform update directly without confirmation modal
  try {
    const response = await fetch('api/manage-students.php?action=update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: studentId,
        name, 
        email, 
        resetPassword 
      })
    });

    const result = await response.json();

    if (!result.success) {
      showError('edit-student', result.message || 'Failed to update student');
      return;
    }

    showSuccess('edit-student', 'Student updated successfully!');
    setTimeout(() => {
      closeEditModal();
      loadStudents();
    }, 1500);

  } catch (error) {
    console.error('Error:', error);
    showError('edit-student', 'An error occurred while updating student');
  }
}

// ===== Change Password =====
changePasswordForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showError('password', 'All fields are required');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError('password', 'New passwords do not match');
    return;
  }

  if (newPassword.length < 8) {
    showError('password', 'Password must be at least 8 characters');
    return;
  }

  // Show confirmation modal
  showModal(
    'Confirm Password Change',
    'Are you sure you want to change your password? You will need to login again with the new password.',
    async function() {
      try {
        const response = await fetch('api/change-password.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentPassword, 
            newPassword, 
            confirmPassword 
          })
        });

        const result = await response.json();

        if (!result.success) {
          showError('password', result.message || 'Failed to change password');
          return;
        }

        showSuccess('password', 'Password changed successfully! Redirecting to login...');
        changePasswordForm.reset();
        
        // Redirect to login after 2 seconds
        setTimeout(function() {
          AuthSession.clearSession();
          window.location.href = '../auth/login.html';
        }, 2000);

      } catch (error) {
        console.error('Error:', error);
        showError('password', 'An error occurred');
      }
    }
  );
});

// ===== Helper Functions =====
function showError(section, message) {
  const errorDiv = document.getElementById(section + '-error');
  const successDiv = document.getElementById(section + '-success');
  
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  if (successDiv) {
    successDiv.style.display = 'none';
  }
}

function showSuccess(section, message) {
  const errorDiv = document.getElementById(section + '-error');
  const successDiv = document.getElementById(section + '-success');
  
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

// ===== Password Field Toggle Handlers =====
function setupPasswordToggles() {
  // Toggle current password
  const toggleCurrent = document.querySelector('.toggle-current');
  const currentPasswordInput = document.getElementById('current-password');
  if (toggleCurrent && currentPasswordInput) {
    toggleCurrent.addEventListener('click', function(e) {
      e.preventDefault();
      togglePasswordVisibility(currentPasswordInput, toggleCurrent);
    });
  }

  // Toggle new password
  const toggleNew = document.querySelector('.toggle-new');
  const newPasswordInput = document.getElementById('new-password');
  if (toggleNew && newPasswordInput) {
    toggleNew.addEventListener('click', function(e) {
      e.preventDefault();
      togglePasswordVisibility(newPasswordInput, toggleNew);
    });
  }

  // Toggle confirm password
  const toggleConfirm = document.querySelector('.toggle-confirm');
  const confirmPasswordInput = document.getElementById('confirm-password');
  if (toggleConfirm && confirmPasswordInput) {
    toggleConfirm.addEventListener('click', function(e) {
      e.preventDefault();
      togglePasswordVisibility(confirmPasswordInput, toggleConfirm);
    });
  }
}

function togglePasswordVisibility(inputElement, toggleButton) {
  const isPassword = inputElement.type === 'password';
  inputElement.type = isPassword ? 'text' : 'password';
  
  if (isPassword) {
    // Switching to text (showing password)
    toggleButton.classList.remove('hidden');
    toggleButton.setAttribute('aria-label', 'Hide password');
    toggleButton.title = 'Hide password';
  } else {
    // Switching to password (hiding password)
    toggleButton.classList.add('hidden');
    toggleButton.setAttribute('aria-label', 'Show password');
    toggleButton.title = 'Show password';
  }
}

function clearMessages(section) {
  const errorDiv = document.getElementById(section + '-error');
  const successDiv = document.getElementById(section + '-success');
  
  if (errorDiv) errorDiv.style.display = 'none';
  if (successDiv) successDiv.style.display = 'none';
}
