const API_BASE_URL = "api/index.php";

let students = [];

const studentTableBody = document.querySelector("#student-table tbody");
const addStudentForm = document.getElementById("add-student-form");
const changePasswordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#student-table thead th");

// Toast notification helper
function showToast(message, type = 'info') {
  toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: "toast-top-right",
    timeOut: 4000,
    extendedTimeOut: 1000,
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "slideDown",
    hideMethod: "slideUp"
  };
  
  switch(type) {
    case 'success':
      toastr.success(message);
      break;
    case 'error':
      toastr.error(message);
      break;
    case 'warning':
      toastr.warning(message);
      break;
    default:
      toastr.info(message);
  }
}


function createStudentRow(student) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${student.name}</td>
    <td>${student.id}</td>
    <td>${student.email}</td>
    <td>
      <button class="edit-btn" data-db-id="${student.dbId}">Edit</button>
      <button class="delete-btn secondary" data-db-id="${student.dbId}">Delete</button>
    </td>
  `;
  return tr;
}

function renderTable(studentArray) {
  studentTableBody.innerHTML = "";
  studentArray.forEach((student) => {
    const row = createStudentRow(student);
    studentTableBody.appendChild(row);
  });
}



async function handleChangePassword(event) {
  event.preventDefault();

  const current = document.getElementById("current-password").value;
  const newPass = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;

  if (newPass !== confirm) {
    showToast("Passwords do not match.", 'error');
    return;
  }

  if (newPass.length < 8) {
    showToast("Password must be at least 8 characters.", 'warning');
    return;
  }

  // Use SweetAlert for better UX
  const { value: email } = await Swal.fire({
    title: 'Confirm Password Change',
    input: 'email',
    inputLabel: 'Enter your email to change password',
    inputPlaceholder: 'your@email.com',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Change Password',
    inputValidator: (value) => {
      if (!value) {
        return 'Email is required!'
      }
    }
  });

  if (!email) return;

  try {
    const response = await fetch(`${API_BASE_URL}?action=change_password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        current_password: current,
        new_password: newPass,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message || "Failed to change password.", 'error');
      return;
    }

    showToast("Password updated successfully!", 'success');

    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
  } catch (error) {
    console.error(error);
    showToast("Server error while changing password.", 'error');
  }
}



async function handleAddStudent(event) {
  event.preventDefault();

  const name = document.getElementById("student-name").value.trim();
  const id = document.getElementById("student-id").value.trim();
  const email = document.getElementById("student-email").value.trim();
  const defaultPasswordInput = document.getElementById("default-password");
  const password =
    (defaultPasswordInput && defaultPasswordInput.value.trim()) ||
    "password123";

  if (!name || !id || !email) {
    showToast("Please fill out all required fields.", 'warning');
    return;
  }

  const exists = students.some((student) => student.id === id);
  if (exists) {
    showToast("Student with this ID already exists.", 'error');
    return;
  }

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: id,
        name,
        email,
        password,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message || "Failed to create student.", 'error');
      return;
    }

    const newStudent = {
      dbId: result.data.id,
      id,
      name,
      email,
    };

    students.push(newStudent);
    renderTable(students);

    showToast(`Student "${name}" added successfully! 🎉`, 'success');

    document.getElementById("student-name").value = "";
    document.getElementById("student-id").value = "";
    document.getElementById("student-email").value = "";
    if (defaultPasswordInput) defaultPasswordInput.value = "password123";
  } catch (error) {
    console.error(error);
    showToast("Server error while creating student.", 'error');
  }
}



async function handleTableClick(event) {
  const target = event.target;

  if (target.classList.contains("delete-btn")) {
    const dbId = target.dataset.dbId;
    const student = students.find((s) => String(s.dbId) === String(dbId));

    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${student?.name}. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}?id=${encodeURIComponent(dbId)}`,
          { method: "DELETE" }
        );

        const result = await response.json();

        if (!result.success) {
          showToast(result.message || "Failed to delete student.", 'error');
          return;
        }

        students = students.filter(
          (student) => String(student.dbId) !== String(dbId)
        );
        renderTable(students);
        showToast(`Student deleted successfully.`, 'success');
      } catch (error) {
        console.error(error);
        showToast("Server error while deleting student.", 'error');
      }
    });
  }

  if (target.classList.contains("edit-btn")) {
    const dbId = target.dataset.dbId;
    const student = students.find(
      (s) => String(s.dbId) === String(dbId)
    );
    if (!student) return;

    Swal.fire({
      title: 'Edit Student',
      html: `
        <div style="text-align: left;">
          <label style="display: block; margin-bottom: 1rem;">
            Name:
            <input type="text" id="edit-name" class="swal2-input" value="${student.name}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.5rem;">
          </label>
          <label style="display: block;">
            Email:
            <input type="email" id="edit-email" class="swal2-input" value="${student.email}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.5rem;">
          </label>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Update',
      preConfirm: () => {
        const newName = document.getElementById('edit-name').value.trim();
        const newEmail = document.getElementById('edit-email').value.trim();
        
        if (!newName || !newEmail) {
          Swal.showValidationMessage('Please fill out all fields');
          return false;
        }
        return { newName, newEmail };
      }
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      
      const { newName, newEmail } = result.value;

      try {
        const response = await fetch(
          `${API_BASE_URL}?id=${encodeURIComponent(dbId)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newName,
              email: newEmail,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          showToast(result.message || "Failed to update student.", 'error');
          return;
        }

        student.name = newName;
        student.email = newEmail;
        renderTable(students);
        showToast(`Student updated successfully.`, 'success');
      } catch (error) {
        console.error(error);
        showToast("Server error while updating student.", 'error');
      }
    });
  }
}



function handleSearch(event) {
  const term = searchInput.value.toLowerCase();

  if (term === "") {
    renderTable(students);
    return;
  }

  const filtered = students.filter((student) =>
    student.name.toLowerCase().includes(term)
  );

  renderTable(filtered);
}



function handleSort(event) {
  const index = event.currentTarget.cellIndex;

  const keyMap = {
    0: "name",
    1: "id",
    2: "email",
  };

  if (!(index in keyMap)) return;

  const key = keyMap[index];
  const currentDir = event.currentTarget.dataset.sortDir || "asc";
  const newDir = currentDir === "asc" ? "desc" : "asc";
  event.currentTarget.dataset.sortDir = newDir;

  students.sort((a, b) => {
    let result;

    if (key === "id") {
      result = a[key].localeCompare(b[key]); 
    } else {
      result = a[key].localeCompare(b[key]);
    }

    return newDir === "asc" ? result : -result;
  });

  renderTable(students);
}


async function loadStudentsAndInitialize() {
  try {
    const response = await fetch(API_BASE_URL);
    console.log(response)
    if(response.status === 403){
      showToast("Only admins can access this page.", 'error');
      setTimeout(() => {
        window.location.href = "../auth/login.html";
      }, 2000);
      return;
    }

    if (!response.ok) {
      console.error("Failed to load students from API");
      showToast("Failed to load students from the server.", 'error');
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error(result.message || "API error while loading students");
      showToast(result.message || "Failed to load students.", 'error');
      return;
    }

    students = result.data.map((row) => ({
      dbId: row.id,
      id: row.student_id,
      name: row.name,
      email: row.email,
    }));

    renderTable(students);
    showToast("Students loaded successfully!", 'success');

    // Event listeners
    changePasswordForm.addEventListener("submit", handleChangePassword);
    addStudentForm.addEventListener("submit", handleAddStudent);
    studentTableBody.addEventListener("click", handleTableClick);
    searchInput.addEventListener("input", handleSearch);
    tableHeaders.forEach((th) => th.addEventListener("click", handleSort));
  } catch (error) {
    console.error("Error loading students:", error);
    showToast("Error loading students. Please refresh the page.", 'error');
  }
}

// Start app
loadStudentsAndInitialize();
