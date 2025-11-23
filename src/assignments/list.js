/*
  Requirement: Populate the "Course Assignments" list page.

  Instructions:
  1. Link this file to `list.html` using:
     <script src="list.js" defer></script>

  2. In `list.html`, add an `id="assignment-list-section"` to the
     <section> element that will contain the assignment articles.

  3. Implement the TODOs below.
*/

// --- Element Selections ---
// TODO: Select the section for the assignment list ('#assignment-list-section').
// Be tolerant of either id: 'assignment-list-section' (requested in comments)
// or 'assignments-list' (present in `list.html`). Fall back to the first
// <section> on the page if neither id exists.
const listSection = document.getElementById('assignment-list-section')
  || document.getElementById('assignments-list')
  || document.querySelector('section');

// --- Functions ---

/**
 * TODO: Implement the createAssignmentArticle function.
 * It takes one assignment object {id, title, dueDate, description}.
 * It should return an <article> element matching the structure in `list.html`.
 * The "View Details" link's `href` MUST be set to `details.html?id=${id}`.
 * This is how the detail page will know which assignment to load.
 */
function createAssignmentArticle(assignment) {
  const article = document.createElement('article');
  article.className = 'assignment';

  const h2 = document.createElement('h2');
  h2.textContent = assignment.title || '';
  article.appendChild(h2);

  const due = document.createElement('p');
  due.className = 'due-date';
  due.textContent = 'Due: ' + (assignment.dueDate || '');
  article.appendChild(due);

  const brief = document.createElement('p');
  brief.className = 'brief';
  brief.textContent = assignment.description || '';
  article.appendChild(brief);

  const link = document.createElement('a');
  const id = assignment.id || '';
  link.href = `details.html?id=${encodeURIComponent(id)}`;
  link.textContent = 'View Details & Discussion';
  article.appendChild(link);

  return article;
}

/**
 * TODO: Implement the loadAssignments function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use `fetch()` to get data from 'assignments.json'.
 * 2. Parse the JSON response into an array.
 * 3. Clear any existing content from `listSection`.
 * 4. Loop through the assignments array. For each assignment:
 * - Call `createAssignmentArticle()`.
 * - Append the returned <article> element to `listSection`.
 */
async function loadAssignments() {
  if (!listSection) return;

  // Try to fetch from the PHP API first, then fall back to JSON files.
  const candidates = [
    'api/index.php?resource=assignments',
    'api/assignments.json',
    'assignments.json'
  ];
  let assignments = [];

  for (const path of candidates) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) continue;
      const data = await resp.json();
      if (Array.isArray(data)) {
        assignments = data;
        break;
      }
    } catch (err) {
      // ignore and try next candidate
    }
  }

  // Clear existing content
  listSection.innerHTML = '';

  // If no assignments found, keep a friendly message
  if (!assignments || assignments.length === 0) {
    const msg = document.createElement('p');
    msg.textContent = 'No assignments available.';
    listSection.appendChild(msg);
    return;
  }

  // Populate the section with articles
  assignments.forEach(a => {
    const art = createAssignmentArticle(a);
    listSection.appendChild(art);
  });
}

// --- Initial Page Load ---
// Call the function to populate the page.
loadAssignments();
