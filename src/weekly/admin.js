/*
  Requirement: Make the "Manage Weekly Breakdown" page interactive.

  Instructions:
  1. Link this file to admin.html using:
     <script src="admin.js" defer></script>
  
  2. In admin.html, add an id="weeks-tbody" to the <tbody> element
     inside your weeks-table.
  
  3. Implement the TODOs below.
*/

// --- Global Data Store ---
// This will hold the weekly data loaded from the JSON file.
let weeks = [];

// --- Element Selections ---
// TODO: Select the week form ('#week-form').
const weekForm = document.querySelector('#week-form');

// TODO: Select the weeks table body ('#weeks-tbody').
const weeksTableBody = document.querySelector('#weeks-tbody');

// --- Functions ---

/**
 * TODO: Implement the createWeekRow function.
 * It takes one week object {id, title, description}.
 * It should return a <tr> element with the following <td>s:
 * 1. A <td> for the title.
 * 2. A <td> for the description.
 * 3. A <td> containing two buttons:
 * - An "Edit" button with class "edit-btn" and data-id="${id}".
 * - A "Delete" button with class "delete-btn" and data-id="${id}".
 */
function createWeekRow(week) {
  // ... your implementation here ...
  const row = document.createElement('tr');

  // Title cell
  const titleCell = document.createElement('td');
  titleCell.textContent = week.title;
  row.appendChild(titleCell);

  // Description cell
  const descCell = document.createElement('td');
  descCell.textContent = week.description;
  row.appendChild(descCell);

  // Actions cell
  const actionsCell = document.createElement('td');

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  editBtn.className = 'edit-btn';
  editBtn.setAttribute('data-id', week.id);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('data-id', week.id);

  actionsCell.appendChild(editBtn);
  actionsCell.appendChild(deleteBtn);
  row.appendChild(actionsCell);

  return row;
}

/**
 * TODO: Implement the renderTable function.
 * It should:
 * 1. Clear the weeksTableBody.
 * 2. Loop through the global weeks array.
 * 3. For each week, call createWeekRow(), and
 * append the resulting <tr> to weeksTableBody.
 */
function renderTable() {
  // ... your implementation here ...
  // Clear the table body
  weeksTableBody.innerHTML = '';

  // Loop through weeks and create rows
  weeks.forEach(week => {
    const row = createWeekRow(week);
    weeksTableBody.appendChild(row);
  });
}

/**
 * TODO: Implement the handleAddWeek function.
 * This is the event handler for the form's 'submit' event.
 * It should:
 * 1. Prevent the form's default submission.
 * 2. Get the values from the title, start date, and description inputs.
 * 3. Get the value from the 'week-links' textarea. Split this value
 * by newlines (\n) to create an array of link strings.
 * 4. Create a new week object with a unique ID (e.g., `id: \week_${Date.now()}\`).
 * 5. Add this new week object to the global weeks array (in-memory only).
 * 6. Call renderTable() to refresh the list.
 * 7. Reset the form.
 */
function handleAddWeek(event) {
  // ... your implementation here ...
  event.preventDefault();

  // Get form values
  const titleInput = document.querySelector('#week-title');
  const startDateInput = document.querySelector('#week-start-date');
  const descriptionInput = document.querySelector('#week-description');
  const linksTextarea = document.querySelector('#week-links');

  const title = titleInput.value;
  const startDate = startDateInput.value;
  const description = descriptionInput.value;

  // Process links - split by newlines and filter out empty strings
  const links = linksTextarea.value
    .split('\n')
    .map(link => link.trim())
    .filter(link => link !== '');

  // Create new week object
  const newWeek = `{
    id: week_${Date.now()},
    title: title,
    startDate: startDate,
    description: description,
    links: links
  }`;

  // Add to global weeks array
  weeks.push(newWeek);

  // Refresh table
  renderTable();

  // Reset form
  event.target.reset();
}

/**
 * TODO: Implement the handleTableClick function.
 * This is an event listener on the weeksTableBody (for delegation).
 * It should:
 * 1. Check if the clicked element (event.target) has the class "delete-btn".
 * 2. If it does, get the data-id attribute from the button.
 * 3. Update the global weeks array by filtering out the week
 * with the matching ID (in-memory only).
 * 4. Call renderTable() to refresh the list.
 */
function handleTableClick(event) {
  // ... your implementation here ...
  // Delete button
  if (event.target.classList.contains('delete-btn')) {
    const weekId = event.target.getAttribute('data-id');

    // Filter out the week with the matching ID
    weeks = weeks.filter(week => week.id !== weekId);

    // Refresh table
    renderTable();
  }

  if (event.target.classList.contains('edit-btn')) {
    const weekId = event.target.getAttribute('data-id');
    const weekToEdit = weeks.find(week => week.id === weekId);

    if (weekToEdit) {
      document.querySelector('#week-title').value = weekToEdit.title;
      document.querySelector('#week-start-date').value = weekToEdit.startDate;
      document.querySelector('#week-description').value = weekToEdit.description;
      document.querySelector('#week-links').value = weekToEdit.links.join('\n');

      weeks = weeks.filter(week => week.id !== weekId);
      renderTable();
    }
  }
}

/**
 * TODO: Implement the loadAndInitialize function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use fetch() to get data from 'weeks.json'.
 * 2. Parse the JSON response and store the result in the global weeks array.
 * 3. Call renderTable() to populate the table for the first time.
 * 4. Add the 'submit' event listener to weekForm (calls handleAddWeek).
 * 5. Add the 'click' event listener to weeksTableBody (calls handleTableClick).
 */
async function loadAndInitialize() {
  // ... your implementation here ...
  try {
    console.log('Starting initialization...');

    // Try to load from the file
    const response = await fetch('./weeks.json');

    if (response.ok) {
      weeks = await response.json();
      console.log('✅ Loaded weeks from file:', weeks);
    } else {
      console.log('⚠ weeks.json not found, starting with empty array');
      weeks = []; // Start with empty array
    }

    // Populate the table
    renderTable();

    // Add event listeners
    weekForm.addEventListener('submit', handleAddWeek);
    weeksTableBody.addEventListener('click', handleTableClick);

    console.log('✅ Admin page initialized successfully');

  } catch (error) {
    console.error('❌ Error:', error);

    // Even if there's an error, work with empty array
    weeks = [];
    renderTable();
    weekForm.addEventListener('submit', handleAddWeek);
    weeksTableBody.addEventListener('click', handleTableClick);

    console.log('✅ Page working with empty data');
  }
}

// --- Initial Page Load ---
// Call the main async function to start the application.
loadAndInitialize();