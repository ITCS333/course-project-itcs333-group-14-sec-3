/*
  Requirement: Make the "Manage Assignments" page interactive.

  Instructions:
  1. Link this file to `admin.html` using:
     <script src="admin.js" defer></script>

  2. In `admin.html`, add an `id="assignments-tbody"` to the <tbody> element
     so you can select it.

  3. Implement the TODOs below.
*/

// --- Global Data Store ---
// This will hold the assignments loaded from the JSON file.
let assignments = [];

// Track which assignment (if any) is being edited.
let editingAssignmentId = null;

// API base (admin.html is inside /assignments/, API is in /assignments/api/)
const API_BASE = 'api/index.php?resource=assignments';

// --- Element Selections ---
// Select the assignment form ('#assignment-form').
const assignmentForm = document.getElementById('assignment-form');

// Select the assignments table body ('#assignments-tbody').
const assignmentsTableBody = document.getElementById('assignments-tbody');


/**
 * Helper: normalize assignment objects coming from API or JSON.
 * Always returns an object with: {id, title, description, dueDate, files[]}
 */
function normalizeAssignment(raw) {
  if (!raw) return null;

  const files = Array.isArray(raw.files)
    ? raw.files
    : typeof raw.files === 'string'
      ? raw.files.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
      : [];

  return {
    id: raw.id,
    title: raw.title || '',
    description: raw.description || '',
    dueDate: raw.dueDate || raw.due_date || '',
    files
  };
}

/**
 * TODO: Implement the createAssignmentRow function.
 * It takes one assignment object {id, title, dueDate}.
 * It should return a <tr> element with the following <td>s:
 * 1. A <td> for the `title`.
 * 2. A <td> for the `dueDate`.
 * 3. A <td> containing two buttons:
 * - An "Edit" button with class "edit-btn" and `data-id="${id}"`.
 * - A "Delete" button with class "delete-btn" and `data-id="${id}"`.
 */
function createAssignmentRow(assignment) {
  const tr = document.createElement('tr');
  tr.dataset.id = assignment.id;

  const tdTitle = document.createElement('td');
  tdTitle.textContent = assignment.title || '';

  const tdDue = document.createElement('td');
  tdDue.textContent = assignment.dueDate || '';

  const tdActions = document.createElement('td');

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  // Keep "edit-btn" for the requirement; also works with Bootstrap if you add classes in HTML.
  editBtn.className = 'edit-btn';
  editBtn.dataset.id = assignment.id;
  editBtn.textContent = 'Edit';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  // Keep "delete-btn" for the requirement.
  deleteBtn.className = 'delete-btn';
  deleteBtn.dataset.id = assignment.id;
  deleteBtn.textContent = 'Delete';

  tdActions.appendChild(editBtn);
  tdActions.appendChild(deleteBtn);

  tr.appendChild(tdTitle);
  tr.appendChild(tdDue);
  tr.appendChild(tdActions);

  return tr;
}

/**
 * TODO: Implement the renderTable function.
 * It should:
 * 1. Clear the `assignmentsTableBody`.
 * 2. Loop through the global `assignments` array.
 * 3. For each assignment, call `createAssignmentRow()`, and
 * append the resulting <tr> to `assignmentsTableBody`.
 */
function renderTable() {
  if (!assignmentsTableBody) return;

  assignmentsTableBody.innerHTML = '';

  assignments.forEach(asg => {
    const row = createAssignmentRow(asg);
    assignmentsTableBody.appendChild(row);
  });
}

/**
 * TODO: Implement the handleAddAssignment function.
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Prevent the form's default submission.
 * 2. Get the values from the title, description, due date, and files inputs.
 * 3. Create a new assignment object with a unique ID (e.g., `id: `asg_${Date.now()}`).
 * 4. Add this new assignment object to the global `assignments` array (in-memory only).
 * 5. Call `renderTable()` to refresh the list.
 * 6. Reset the form.
 *
 * (In Phase 3, we use the API to actually create/update in the database.)
 */
async function handleAddAssignment(event) {
  event.preventDefault();
  if (!assignmentForm) return;

  const titleInput = document.getElementById('assignment-title');
  const descInput = document.getElementById('assignment-description');
  const dueInput = document.getElementById('assignment-due-date');
  const filesInput = document.getElementById('assignment-files');

  const title = titleInput ? titleInput.value.trim() : '';
  const description = descInput ? descInput.value.trim() : '';
  const dueDate = dueInput ? dueInput.value : '';
  const filesRaw = filesInput ? filesInput.value : '';
  const files = filesRaw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  if (!title || !description || !dueDate) {
    alert('Please fill in title, description, and due date.');
    return;
  }

  const submitBtn = document.getElementById('add-assignment');

  // EDIT MODE
  if (editingAssignmentId !== null) {
    const id = editingAssignmentId;

    // Update in-memory object
    const existing = assignments.find(a => String(a.id) === String(id));
    if (existing) {
      existing.title = title;
      existing.description = description;
      existing.dueDate = dueDate;
      existing.files = files;
    }

    // Call API to update DB
    try {
      await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title,
          description,
          due_date: dueDate,
          files
        })
      });
    } catch (err) {
      console.error('Error updating assignment via API:', err);
    }

    editingAssignmentId = null;
    if (submitBtn) submitBtn.textContent = 'Add Assignment';
    renderTable();
    assignmentForm.reset();
    return;
  }

  // ADD MODE
  // (Let the database generate the real numeric id.)
  try {
    const resp = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        due_date: dueDate,
        files
      })
    });

    if (resp.ok) {
      const data = await resp.json();
      const created = normalizeAssignment(data);
      if (created) {
        assignments.push(created);
      }
    } else {
      console.error('Failed to create assignment via API, status:', resp.status);
    }
  } catch (err) {
    console.error('Error creating assignment via API:', err);
  }

  renderTable();
  assignmentForm.reset();
}

/**
 * TODO: Implement the handleTableClick function.
 * This is an event listener on the `assignmentsTableBody` (for delegation).
 * It should:
 * 1. Check if the clicked element (`event.target`) has the class "delete-btn".
 * 2. If it does, get the `data-id` attribute from the button.
 * 3. Update the global `assignments` array by filtering out the assignment
 * with the matching ID (in-memory only).
 * 4. Call `renderTable()` to refresh the list.
 *
 * (We also handle "edit-btn" here for editing.)
 */
async function handleTableClick(event) {
  const target = event.target;
  if (!target) return;

  const isDelete = target.classList.contains('delete-btn');
  const isEdit = target.classList.contains('edit-btn');

  if (!isDelete && !isEdit) return;

  const id = target.dataset.id || target.closest('tr')?.dataset.id;
  if (!id) return;

  // DELETE
  if (isDelete) {
    try {
      await fetch(`${API_BASE}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error calling delete API:', err);
    }

    // Update in-memory list so UI responds immediately
    assignments = assignments.filter(a => String(a.id) !== String(id));

    // If we were editing this one, reset form
    if (editingAssignmentId !== null && String(editingAssignmentId) === String(id)) {
      editingAssignmentId = null;
      const submitBtn = document.getElementById('add-assignment');
      if (submitBtn) submitBtn.textContent = 'Add Assignment';
      if (assignmentForm) assignmentForm.reset();
    }

    renderTable();
    return;
  }

  // EDIT
  if (isEdit) {
    const asg = assignments.find(a => String(a.id) === String(id));
    if (!asg) return;

    const titleInput = document.getElementById('assignment-title');
    const descInput = document.getElementById('assignment-description');
    const dueInput = document.getElementById('assignment-due-date');
    const filesInput = document.getElementById('assignment-files');

    if (titleInput) titleInput.value = asg.title || '';
    if (descInput) descInput.value = asg.description || '';
    if (dueInput) dueInput.value = asg.dueDate || '';
    if (filesInput) filesInput.value = (asg.files || []).join('\n');

    editingAssignmentId = id;
    const submitBtn = document.getElementById('add-assignment');
    if (submitBtn) submitBtn.textContent = 'Update Assignment';
  }
}

/**
 * TODO: Implement the loadAndInitialize function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use `fetch()` to get data from 'assignments.json'.
 * 2. Parse the JSON response and store the result in the global `assignments` array.
 * 3. Call `renderTable()` to populate the table for the first time.
 * 4. Add the 'submit' event listener to `assignmentForm` (calls `handleAddAssignment`).
 * 5. Add the 'click' event listener to `assignmentsTableBody` (calls `handleTableClick`).
 *
 * (In Phase 3 we try the API first, then fallback to assignments.json.)
 */
async function loadAndInitialize() {
  try {
    // Prefer loading from the API
    const resp = await fetch(API_BASE);
    if (resp.ok) {
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : [];
      assignments = arr.map(normalizeAssignment);
    } else {
      assignments = [];
    }
  } catch (err) {
    console.error('Error loading from API, falling back to assignments.json:', err);

    // Fallback to JSON file from Phase 2
    try {
      const resp = await fetch('assignments.json');
      if (resp.ok) {
        const data = await resp.json();
        assignments = Array.isArray(data)
          ? data.map(normalizeAssignment)
          : [];
      } else {
        assignments = [];
      }
    } catch (e) {
      assignments = [];
    }
  }

  renderTable();

  if (assignmentForm) {
    assignmentForm.addEventListener('submit', handleAddAssignment);
  }
  if (assignmentsTableBody) {
    assignmentsTableBody.addEventListener('click', handleTableClick);
  }
}

// --- Initial Page Load ---
// Call the main async function to start the application.
loadAndInitialize();