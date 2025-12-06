/*
  Requirement: Populate the assignment detail page and discussion forum.

  Instructions:
  1. Link this file to `details.html` using:
     <script src="details.js" defer></script>

  2. In `details.html`, add the following IDs:
     - To the <h1>: `id="assignment-title"`
     - To the "Due" <p>: `id="assignment-due-date"`
     - To the "Description" <p>: `id="assignment-description"`
     - To the "Attached Files" <ul>: `id="assignment-files-list"`
     - To the <div> for comments: `id="comment-list"`
     - To the "Add a Comment" <form>: `id="comment-form"`
     - To the <textarea>: `id="new-comment-text"`

  3. Implement the TODOs below.
*/

// --- Global Data Store ---
// These will hold the data related to *this* assignment.
let currentAssignmentId = null;
let currentComments = [];

// --- Element Selections ---
// Select all the elements you added IDs for in step 2.
const assignmentTitle = document.getElementById('assignment-title');
const assignmentDueDate = document.getElementById('assignment-due-date');
const assignmentDescription = document.getElementById('assignment-description');
const assignmentFilesList = document.getElementById('assignment-files-list');
const commentList = document.getElementById('comment-list');
const commentForm = document.getElementById('comment-form');
const newCommentText = document.getElementById('new-comment-text');

// --- Functions ---

/**
 * TODO: Implement the getAssignmentIdFromURL function.
 * It should:
 * 1. Get the query string from `window.location.search`.
 * 2. Use the `URLSearchParams` object to get the value of the 'id' parameter.
 * 3. Return the id.
 */
function getAssignmentIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/**
 * TODO: Implement the renderAssignmentDetails function.
 * It takes one assignment object.
 * It should:
 * 1. Set the `textContent` of `assignmentTitle` to the assignment's title.
 * 2. Set the `textContent` of `assignmentDueDate` to "Due: " + assignment's dueDate.
 * 3. Set the `textContent` of `assignmentDescription`.
 * 4. Clear `assignmentFilesList` and then create and append
 * `<li><a href="#">...</a></li>` for each file in the assignment's 'files' array.
 */
function renderAssignmentDetails(assignment) {
  if (!assignment) return;
  if (assignmentTitle) assignmentTitle.textContent = assignment.title || '';
  if (assignmentDueDate) assignmentDueDate.textContent = 'Due: ' + (assignment.dueDate || '');
  if (assignmentDescription) assignmentDescription.textContent = assignment.description || '';

  if (assignmentFilesList) {
    assignmentFilesList.innerHTML = '';
    const files = assignment.files || [];
    files.forEach(f => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = f;
      li.appendChild(a);
      assignmentFilesList.appendChild(li);
    });
  }
}

/**
 * TODO: Implement the createCommentArticle function.
 * It takes one comment object {author, text}.
 * It should return an <article> element matching the structure in `details.html`.
 */
function createCommentArticle(comment) {
  const art = document.createElement('article');
  art.className = 'comment';
  const p = document.createElement('p');
  p.textContent = comment.text || '';
  const footer = document.createElement('footer');
  footer.textContent = 'Posted by: ' + (comment.author || '');
  art.appendChild(p);
  art.appendChild(footer);
  return art;
}

/**
 * TODO: Implement the renderComments function.
 * It should:
 * 1. Clear the `commentList`.
 * 2. Loop through the global `currentComments` array.
 * 3. For each comment, call `createCommentArticle()`, and
 * append the resulting <article> to `commentList`.
 */
function renderComments() {
  if (!commentList) return;
  commentList.innerHTML = '';
  currentComments.forEach(c => {
    const art = createCommentArticle(c);
    commentList.appendChild(art);
  });
}

/**
 * TODO: Implement the handleAddComment function.
 * This is the event handler for the `commentForm` 'submit' event.
 * It should:
 * 1. Prevent the form's default submission.
 * 2. Get the text from `newCommentText.value`.
 * 3. If the text is empty, return.
 * 4. Create a new comment object: { author: 'Student', text: commentText }
 * (For this exercise, 'Student' is a fine hardcoded author).
 * 5. Add the new comment to the global `currentComments` array (in-memory only).
 * 6. Call `renderComments()` to refresh the list.
 * 7. Clear the `newCommentText` textarea.
 */
async function handleAddComment(event) {
  event.preventDefault();
  if (!newCommentText) return;

  const text = newCommentText.value.trim();
  if (!text) return;

  // Determine author based on logged-in user (if available)
  let author = 'Student';

  try {
  if (typeof AuthSession !== 'undefined' && AuthSession.isLoggedIn()) {
    const user = AuthSession.getSession ? AuthSession.getSession() : null;

    if (user) {
      // Show the user's real name if available, otherwise email
       author = user.name && user.name.trim() !== '' ? user.name : user.email;

        // If the user is admin, add a label
        if (AuthSession.isAdmin && AuthSession.isAdmin()) {
          author += ' (Admin)';
        }
      }
    }
  } catch (e) {
    console.warn('Could not read auth session, defaulting to \"Student\".', e);
  }

  const newComment = { author, text };

  // Try to save the comment via the API first
  try {
    const resp = await fetch('api/index.php?resource=comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: currentAssignmentId,
        author: newComment.author,
        text: newComment.text
      })
    });

    if (resp.ok) {
      const saved = await resp.json();
      currentComments.push(saved);
    } else {
      // Fallback: in-memory only if API fails
      currentComments.push(newComment);
    }
  } catch (err) {
    // Fallback: in-memory only on network error
    currentComments.push(newComment);
  }

  renderComments();
  newCommentText.value = '';
}


/**
 * TODO: Implement an `initializePage` function.
 * This function needs to be 'async'.
 * It should:
 * 1. Get the `currentAssignmentId` by calling `getAssignmentIdFromURL()`.
 * 2. If no ID is found, display an error and stop.
 * 3. `fetch` both 'assignments.json' and 'comments.json' (you can use `Promise.all`).
 * 4. Find the correct assignment from the assignments array using the `currentAssignmentId`.
 * 5. Get the correct comments array from the comments object using the `currentAssignmentId`.
 * Store this in the global `currentComments` variable.
 * 6. If the assignment is found:
 * - Call `renderAssignmentDetails()` with the assignment object.
 * - Call `renderComments()` to show the initial comments.
 * - Add the 'submit' event listener to `commentForm` (calls `handleAddComment`).
 * 7. If the assignment is not found, display an error.
 */
async function initializePage() {
  currentAssignmentId = getAssignmentIdFromURL();
  if (!currentAssignmentId) {
    console.error('No assignment id in URL');
    return;
  }

  try {
    // Prefer the PHP API for a single assignment + its comments
    const assignmentUrl = `api/index.php?resource=assignments&id=${encodeURIComponent(currentAssignmentId)}`;
    const commentsUrl = `api/index.php?resource=comments&assignment_id=${encodeURIComponent(currentAssignmentId)}`;

    const [aResp, cResp] = await Promise.all([
      fetch(assignmentUrl),
      fetch(commentsUrl)
    ]);

    let assignment = null;
    let comments = [];

    // Assignment - API first, then JSON fallback
    if (aResp.ok) {
      assignment = await aResp.json();
    } else {
      const aFallback = await fetch('assignments.json');
      const assignmentsData = aFallback.ok ? await aFallback.json() : [];
      if (Array.isArray(assignmentsData)) {
        assignment = assignmentsData.find(a => a.id === currentAssignmentId) || null;
      }
    }

    // Comments - API first, then JSON fallback
    if (cResp.ok) {
      comments = await cResp.json(); // API returns an array
    } else {
      const cFallback = await fetch('comments.json');
      const commentsData = cFallback.ok ? await cFallback.json() : {};
      comments = (commentsData && commentsData[currentAssignmentId]) ? commentsData[currentAssignmentId] : [];
    }

    currentComments = Array.isArray(comments) ? comments : [];

    if (assignment) {
      renderAssignmentDetails(assignment);
      renderComments();
      if (commentForm) commentForm.addEventListener('submit', handleAddComment);
    } else {
      console.error('Assignment not found for id:', currentAssignmentId);
    }
  } catch (err) {
    console.error('Failed to initialize page', err);
  }
}

// --- Initial Page Load ---
initializePage();