/*
  Requirement: Populate the "Weekly Course Breakdown" list page.

  Instructions:
  1. Link this file to list.html using:
     <script src="list.js" defer></script>

  2. In list.html, add an id="week-list-section" to the
     <section> element that will contain the weekly articles.

  3. Implement the TODOs below.
*/

// --- Element Selections ---
// TODO: Select the section for the week list ('#week-list-section').
const listSection = document.querySelector('#week-list-section');

// --- Functions ---

/**
 * TODO: Implement the createWeekArticle function.
 * It takes one week object {id, title, startDate, description}.
 * It should return an <article> element matching the structure in list.html.
 * - The "View Details & Discussion" link's href MUST be set to details.html?id=${id}.
 * (This is how the detail page will know which week to load).
 */
function createWeekArticle(week) {
  // ... your implementation here ...
    const article = document.createElement('article');
  
  // Create and append title (h2)
  const title = document.createElement('h2');
  title.textContent = week.title;
  article.appendChild(title);
  
  // Create and append start date (p)
  const startDate = document.createElement('p');
  startDate.textContent = `Starts on: ${week.startDate}`;
  article.appendChild(startDate);
  
  // Create and append description (p)
  const description = document.createElement('p');
  description.textContent = week.description;
  article.appendChild(description);
  
  // Create and append "View Details & Discussion" link
  const link = document.createElement('a');
  link.href = `details.html?id=${week.id}`;
  link.textContent = 'View Details & Discussion';
  link.className = 'week-link'; // Optional: add a class for styling
  article.appendChild(link);
  
  return article;
}

/**
 * TODO: Implement the loadWeeks function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use fetch() to get data from 'weeks.json'.
 * 2. Parse the JSON response into an array.
 * 3. Clear any existing content from listSection.
 * 4. Loop through the weeks array. For each week:
 * - Call createWeekArticle().
 * - Append the returned <article> element to listSection.
 */
async function loadWeeks() {
  // ... your implementation here ...
    try {
    // Fetch data from weeks.json
    const response = await fetch('weeks.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load weeks data: ${response.status}`);
    }
    
    // Parse JSON response
    const weeks = await response.json();
    
    // Clear existing content
    listSection.innerHTML = '';
    
    // Loop through weeks and create articles
    weeks.forEach(week => {
      const article = createWeekArticle(week);
      listSection.appendChild(article);
    });
    
  } catch (error) {
    console.error('Error loading weeks:', error);
    // Display error message to user
    listSection.innerHTML = '<p>Sorry, there was an error loading the weekly breakdown. Please try again later.</p>';
  }
}

// --- Initial Page Load ---
// Call the function to populate the page.
loadWeeks();