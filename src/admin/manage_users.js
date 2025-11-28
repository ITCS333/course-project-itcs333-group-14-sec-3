const API_BASE_URL = "api/index.php"; // relative to /admin/

let students = [];

const studentTableBody = document.querySelector("#student-table tbody");
const addStudentForm = document.getElementById("add-student-form");
const changePasswordForm = document.getElementById("password-form");
const searchInput = document.getElementById("search-input");
const tableHeaders = document.querySelectorAll("#student-table thead th");

// --- Helpers ---

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

// --- Password change ---

async function handleChangePassword(event) {
  event.preventDefault();

  const current = document.getElementById("current-password").value;
  const newPass = document.getElementById("new-password").value;
  const confirm = document.getElementById("confirm-password").value;

  if (newPass !== confirm) {
    alert("Passwords do not match.");
    return;
  }

  if (newPass.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  const email = prompt("Enter your email to change password:");

  if (!email) {
    alert("Email is required.");
    return;
  }

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
      alert(result.message || "Failed to change password.");
      return;
    }

    alert("Password updated successfully!");

    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
  } catch (error) {
    console.error(error);
    alert("Server error while changing password.");
  }
}

// --- Add student (CREATE) ---

async function handleAddStudent(event) {
  event.preventDefault();

  const name = document.getElementById("student-name").value.trim();
  const id = document.getElementById("student-id").value.trim(); // student ID
  const email = document.getElementById("student-email").value.trim();
  const defaultPasswordInput = document.getElementById("default-password");
  const password =
    (defaultPasswordInput && defaultPasswordInput.value.trim()) ||
    "password123";

  if (!name || !id || !email) {
    alert("Please fill out all required fields.");
    return;
  }

  const exists = students.some((student) => student.id === id);
  if (exists) {
    alert("Student with this ID already exists.");
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
      alert(result.message || "Failed to create student.");
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

    document.getElementById("student-name").value = "";
    document.getElementById("student-id").value = "";
    document.getElementById("student-email").value = "";
    if (defaultPasswordInput) defaultPasswordInput.value = "password123";
  } catch (error) {
    console.error(error);
    alert("Server error while creating student.");
  }
}

// --- Edit / Delete student (UPDATE / DELETE) ---

async function handleTableClick(event) {
  const target = event.target;

  // DELETE
  if (target.classList.contains("delete-btn")) {
    const dbId = target.dataset.dbId;

    if (!confirm("Are you sure you want to delete this student?")) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}?id=${encodeURIComponent(dbId)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "Failed to delete student.");
        return;
      }

      students = students.filter(
        (student) => String(student.dbId) !== String(dbId)
      );
      renderTable(students);
    } catch (error) {
      console.error(error);
      alert("Server error while deleting student.");
    }
  }

  // UPDATE
  if (target.classList.contains("edit-btn")) {
    const dbId = target.dataset.dbId;
    const student = students.find(
      (s) => String(s.dbId) === String(dbId)
    );
    if (!student) return;

    const newName = prompt("New name:", student.name);
    if (newName === null) return;

    const newEmail = prompt("New email:", student.email);
    if (newEmail === null) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}?id=${encodeURIComponent(dbId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName.trim(),
            email: newEmail.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "Failed to update student.");
        return;
      }

      student.name = newName.trim();
      student.email = newEmail.trim();
      renderTable(students);
    } catch (error) {
      console.error(error);
      alert("Server error while updating student.");
    }
  }
}

// --- Search ---

function handleSearch() {
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

// --- Sorting ---

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
      result = a[key].localeCompare(b[key]); // student ID is string
    } else {
      result = a[key].localeCompare(b[key]);
    }

    return newDir === "asc" ? result : -result;
  });

  renderTable(students);
}

// --- Initial load from API (READ) ---

async function loadStudentsAndInitialize() {
  try {
    const response = await fetch(API_BASE_URL);

    if (!response.ok) {
      console.error("Failed to load students from API");
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error(result.message || "API error while loading students");
      return;
    }

    // Map DB fields -> front-end fields
    students = result.data.map((row) => ({
      dbId: row.id,                    // DB primary key
      id: row.student_id,             // student ID (from email prefix)
      name: row.name,
      email: row.email,
    }));

    renderTable(students);

    // Event listeners
    changePasswordForm.addEventListener("submit", handleChangePassword);
    addStudentForm.addEventListener("submit", handleAddStudent);
    studentTableBody.addEventListener("click", handleTableClick);
    searchInput.addEventListener("input", handleSearch);
    tableHeaders.forEach((th) => th.addEventListener("click", handleSort));
  } catch (error) {
    console.error("Error loading students:", error);
  }
}

// Start app
loadStudentsAndInitialize();
