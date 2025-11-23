<?php
/**
 * Assignment Management API
 * 
 * This is a RESTful API that handles all CRUD operations for course assignments
 * and their associated discussion comments.
 * It uses PDO to interact with a MySQL database.
 * 
 * Database Table Structures (for reference):
 * 
 * Table: assignments
 * Columns:
 *   - id (INT, PRIMARY KEY, AUTO_INCREMENT)
 *   - title (VARCHAR(200))
 *   - description (TEXT)
 *   - due_date (DATE)
 *   - files (TEXT)
 *   - created_at (TIMESTAMP)
 *   - updated_at (TIMESTAMP)
 * 
 * Table: comments
 * Columns:
 *   - id (INT, PRIMARY KEY, AUTO_INCREMENT)
 *   - assignment_id (VARCHAR(50), FOREIGN KEY)
 *   - author (VARCHAR(100))
 *   - text (TEXT)
 *   - created_at (TIMESTAMP)
 * 
 * HTTP Methods Supported:
 *   - GET: Retrieve assignment(s) or comment(s)
 *   - POST: Create a new assignment or comment
 *   - PUT: Update an existing assignment
 *   - DELETE: Delete an assignment or comment
 * 
 * Response Format: JSON
 */

// ============================================================================
// HEADERS AND CORS CONFIGURATION
// ============================================================================

// Set Content-Type header to JSON
header('Content-Type: application/json; charset=utf-8');

// Basic CORS headers - permissive for development. Adjust in production.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request and exit early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// Configure database connection using environment variables with sensible defaults.
$dbHost   = getenv('DB_HOST') ?: '127.0.0.1';
$dbName   = getenv('DB_NAME') ?: 'course';
$dbUser   = getenv('DB_USER') ?: 'admin';
$dbPass   = getenv('DB_PASS') ?: 'password123';
$dbCharset = 'utf8mb4';


$dsn = "mysql:host={$dbHost};dbname={$dbName};charset={$dbCharset}";
try {
    $db = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error'   => 'Database connection failed',
        'details' => $e->getMessage()
    ]);
    exit;
}

// ============================================================================
// REQUEST PARSING
// ============================================================================

$method = $_SERVER['REQUEST_METHOD'];

$rawBody = file_get_contents('php://input');
$data    = json_decode($rawBody, true);

$resource         = isset($_GET['resource']) ? $_GET['resource'] : null;
$queryId          = isset($_GET['id']) ? $_GET['id'] : null;
$queryAssignmentId = isset($_GET['assignment_id']) ? $_GET['assignment_id'] : null;

// ============================================================================
// ASSIGNMENT CRUD FUNCTIONS
// ============================================================================

function getAllAssignments($db) {
    $sql        = 'SELECT id, title, description, due_date, files, created_at, updated_at FROM assignments';
    $conditions = [];
    $params     = [];

    if (!empty($_GET['search'])) {
        $conditions[]      = '(title LIKE :search OR description LIKE :search)';
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    if (count($conditions) > 0) {
        $sql .= ' WHERE ' . implode(' AND ', $conditions);
    }

    // Sorting
    $allowedSort = ['title', 'due_date', 'created_at'];
    $sort  = in_array($_GET['sort'] ?? '', $allowedSort, true) ? $_GET['sort'] : 'due_date';
    $order = strtolower($_GET['order'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';
    $sql  .= " ORDER BY {$sort} {$order}";

    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $result = array_map(function ($row) {
        $row['files']   = $row['files'] ? json_decode($row['files'], true) : [];
        $row['dueDate'] = $row['due_date'] ?? null;
        return $row;
    }, $rows);

    sendResponse($result);
}

function getAssignmentById($db, $assignmentId) {
    if (empty($assignmentId)) {
        sendResponse(['error' => 'Missing assignment id'], 400);
    }

    $stmt = $db->prepare('SELECT id, title, description, due_date, files, created_at, updated_at FROM assignments WHERE id = :id');
    $stmt->bindValue(':id', $assignmentId);
    $stmt->execute();
    $row = $stmt->fetch();

    if (!$row) {
        sendResponse(['error' => 'Assignment not found'], 404);
    }

    $row['files']   = $row['files'] ? json_decode($row['files'], true) : [];
    $row['dueDate'] = $row['due_date'] ?? null;

    sendResponse($row);
}

function createAssignment($db, $data) {
    $title       = isset($data['title']) ? sanitizeInput($data['title']) : '';
    $description = isset($data['description']) ? sanitizeInput($data['description']) : '';
    $due_date    = isset($data['due_date']) ? sanitizeInput($data['due_date']) : '';
    $files       = isset($data['files']) && is_array($data['files']) ? $data['files'] : [];

    if (!$title || !$description || !$due_date) {
        sendResponse(['error' => 'Missing required fields: title, description, due_date'], 400);
    }

    if (!validateDate($due_date)) {
        sendResponse(['error' => 'Invalid due_date format, expected YYYY-MM-DD'], 400);
    }

    $filesJson = json_encode(array_values($files));

    $stmt = $db->prepare(
        'INSERT INTO assignments (title, description, due_date, files, created_at, updated_at)
         VALUES (:title, :description, :due_date, :files, NOW(), NOW())'
    );
    $stmt->bindValue(':title', $title);
    $stmt->bindValue(':description', $description);
    $stmt->bindValue(':due_date', $due_date);
    $stmt->bindValue(':files', $filesJson);

    if ($stmt->execute()) {
        $id = $db->lastInsertId();
        getAssignmentById($db, $id);
    } else {
        sendResponse(['error' => 'Failed to create assignment'], 500);
    }
}

function updateAssignment($db, $data) {
    if (empty($data['id'])) {
        sendResponse(['error' => 'Missing id for update'], 400);
    }
    $id = $data['id'];

    $stmtCheck = $db->prepare('SELECT id FROM assignments WHERE id = :id');
    $stmtCheck->bindValue(':id', $id);
    $stmtCheck->execute();
    if (!$stmtCheck->fetch()) {
        sendResponse(['error' => 'Assignment not found'], 404);
    }

    $fields = [];
    $params = [];

    if (isset($data['title'])) {
        $fields[]        = 'title = :title';
        $params[':title'] = sanitizeInput($data['title']);
    }
    if (isset($data['description'])) {
        $fields[]            = 'description = :description';
        $params[':description'] = sanitizeInput($data['description']);
    }
    if (isset($data['due_date'])) {
        if (!validateDate($data['due_date'])) {
            sendResponse(['error' => 'Invalid due_date format'], 400);
        }
        $fields[]           = 'due_date = :due_date';
        $params[':due_date'] = sanitizeInput($data['due_date']);
    }
    if (isset($data['files']) && is_array($data['files'])) {
        $fields[]        = 'files = :files';
        $params[':files'] = json_encode(array_values($data['files']));
    }

    if (empty($fields)) {
        sendResponse(['error' => 'No fields to update'], 400);
    }

    $sql             = 'UPDATE assignments SET ' . implode(', ', $fields) . ', updated_at = NOW() WHERE id = :id';
    $params[':id']   = $id;
    $stmt            = $db->prepare($sql);

    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        getAssignmentById($db, $id);
    } else {
        sendResponse(['message' => 'No changes made'], 200);
    }
}

function deleteAssignment($db, $assignmentId) {
    if (empty($assignmentId)) {
        sendResponse(['error' => 'Missing assignment id'], 400);
    }

    // Match INT UNSIGNED in the schema
    $id = (int)$assignmentId;

    try {
        // Delete comments for this assignment (use comments_assignment)
        $stmtComments = $db->prepare('DELETE FROM comments_assignment WHERE assignment_id = :aid');
        $stmtComments->bindValue(':aid', $id, PDO::PARAM_INT);
        $stmtComments->execute();

        // Delete the assignment itself
        $stmt = $db->prepare('DELETE FROM assignments WHERE id = :id');
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        if ($stmt->rowCount() === 0) {
            sendResponse(['message' => 'Assignment not found or already deleted'], 200);
        } else {
            sendResponse(['message' => 'Assignment deleted'], 200);
        }
    } catch (PDOException $e) {
        sendResponse(['error' => 'Delete failed', 'details' => $e->getMessage()], 500);
    }
}



// ============================================================================
// COMMENT CRUD FUNCTIONS
// ============================================================================

function getCommentsByAssignment($db, $assignmentId) {
    if (empty($assignmentId)) {
        sendResponse(['error' => 'Missing assignment_id'], 400);
    }

    $stmt = $db->prepare(
        'SELECT id, assignment_id, author, text, created_at
         FROM comments_assignment
         WHERE assignment_id = :aid
         ORDER BY created_at ASC'
    );
    $stmt->bindValue(':aid', (int)$assignmentId, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    sendResponse($rows);
}


function createComment($db, $data) {
    $assignment_id = isset($data['assignment_id']) ? sanitizeInput($data['assignment_id']) : '';
    $author        = isset($data['author']) ? sanitizeInput($data['author']) : '';
    $text          = isset($data['text']) ? sanitizeInput($data['text']) : '';

    if (!$assignment_id || !$author || !$text) {
        sendResponse(['error' => 'Missing required fields: assignment_id, author, text'], 400);
    }

    // Verify assignment exists
    $stmtChk = $db->prepare('SELECT id FROM assignments WHERE id = :id');
    $stmtChk->bindValue(':id', (int)$assignment_id, PDO::PARAM_INT);
    $stmtChk->execute();
    if (!$stmtChk->fetch()) {
        sendResponse(['error' => 'Assignment not found'], 404);
    }

    // Insert into comments_assignment
    $stmt = $db->prepare(
        'INSERT INTO comments_assignment (assignment_id, author, text, created_at)
         VALUES (:aid, :author, :text, NOW())'
    );
    $stmt->bindValue(':aid', (int)$assignment_id, PDO::PARAM_INT);
    $stmt->bindValue(':author', $author);
    $stmt->bindValue(':text', $text);
    $stmt->execute();

    $id = $db->lastInsertId();

    $stmtGet = $db->prepare(
        'SELECT id, assignment_id, author, text, created_at
         FROM comments_assignment
         WHERE id = :id'
    );
    $stmtGet->bindValue(':id', $id, PDO::PARAM_INT);
    $stmtGet->execute();
    $row = $stmtGet->fetch();

    sendResponse($row, 201);
}


function deleteComment($db, $commentId) {
    if (empty($commentId)) {
        sendResponse(['error' => 'Missing comment id'], 400);
    }

    $stmt = $db->prepare('DELETE FROM comments_assignment WHERE id = :id');
    $stmt->bindValue(':id', (int)$commentId, PDO::PARAM_INT);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        sendResponse(['message' => 'Comment deleted']);
    } else {
        sendResponse(['error' => 'Comment not found'], 404);
    }
}


// ============================================================================
// MAIN REQUEST ROUTER
// ============================================================================

try {
    if ($method === 'GET') {
        if ($resource === 'assignments') {
            if ($queryId) {
                getAssignmentById($db, $queryId);
            } else {
                getAllAssignments($db);
            }
        } elseif ($resource === 'comments') {
            if ($queryAssignmentId) {
                getCommentsByAssignment($db, $queryAssignmentId);
            } else {
                sendResponse(['error' => 'Missing assignment_id'], 400);
            }
        } else {
            sendResponse(['error' => 'Invalid resource'], 400);
        }
    } elseif ($method === 'POST') {
        if ($resource === 'assignments') {
            createAssignment($db, $data ?: []);
        } elseif ($resource === 'comments') {
            createComment($db, $data ?: []);
        } else {
            sendResponse(['error' => 'Invalid resource'], 400);
        }
    } elseif ($method === 'PUT') {
        if ($resource === 'assignments') {
            updateAssignment($db, $data ?: []);
        } else {
            sendResponse(['error' => 'PUT not supported for this resource'], 400);
        }
    } elseif ($method === 'DELETE') {
        if ($resource === 'assignments') {
            $idToDelete = $queryId ?: ($data['id'] ?? null);
            deleteAssignment($db, $idToDelete);
        } elseif ($resource === 'comments') {
            $commentId = $queryId ?: ($data['id'] ?? null);
            deleteComment($db, $commentId);
        } else {
            sendResponse(['error' => 'Invalid resource'], 400);
        }
    } else {
        sendResponse(['error' => 'Method not supported'], 405);
    }

} catch (PDOException $e) {
    sendResponse(['error' => 'Database error', 'details' => $e->getMessage()], 500);
} catch (Exception $e) {
    sendResponse(['error' => 'Server error', 'details' => $e->getMessage()], 500);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    if (!is_array($data) && !is_object($data)) {
        $data = ['data' => $data];
    }
    echo json_encode($data);
    exit;
}

function sanitizeInput($data) {
    $data = trim($data);
    $data = strip_tags($data);
    $data = htmlspecialchars($data, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return $data;
}

function validateDate($date) {
    $d = DateTime::createFromFormat('Y-m-d', $date);
    return $d && $d->format('Y-m-d') === $date;
}

function validateAllowedValue($value, $allowedValues) {
    return in_array($value, $allowedValues, true);
}

?>
