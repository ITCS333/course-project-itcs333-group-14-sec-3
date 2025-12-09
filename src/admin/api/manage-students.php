<?php
session_start();
header("Content-Type: application/json");

// Check if user is authenticated and is admin
if (!isset($_SESSION['is_admin']) || $_SESSION['is_admin'] !== 1) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once __DIR__ . "/../../Database.php";

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;

try {
    $pdo = (new Database())->getConnection();

    // GET - List all students
    if ($method === 'GET' && $action === 'list') {
        $sql = "SELECT id, name, email FROM users WHERE is_admin = 0 ORDER BY name ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'students' => $students
        ]);
        exit;
    }

    // GET student by ID
    if ($method === 'GET' && $action === 'get') {
        $studentId = $_GET['id'] ?? null;

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'Missing student ID']);
            exit;
        }

        $sql = "SELECT id, name, email FROM users WHERE id = :id AND is_admin = 0";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $studentId]);
        $student = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$student) {
            echo json_encode(['success' => false, 'message' => 'Student not found']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'student' => $student
        ]);
        exit;
    }

    // POST - Add new student
    if ($method === 'POST' && $action === 'add') {
        $data = json_decode(file_get_contents("php://input"), true) ?? [];

        $name = $data['name'] ?? null;
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? 'password';

        // Validation
        if (!$name || !$email) {
            echo json_encode(['success' => false, 'message' => 'Missing name or email']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            exit;
        }

        // Check if email already exists
        $checkSql = "SELECT id FROM users WHERE email = :email";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute(['email' => $email]);
        
        if ($checkStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            exit;
        }

        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // Insert student
        $insertSql = "INSERT INTO users (name, email, password, is_admin) VALUES (:name, :email, :password, 0)";
        $insertStmt = $pdo->prepare($insertSql);
        $insertStmt->execute([
            'name' => $name,
            'email' => $email,
            'password' => $hashedPassword
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Student added successfully',
            'student' => [
                'id' => $pdo->lastInsertId(),
                'name' => $name,
                'email' => $email
            ]
        ]);
        exit;
    }

    // DELETE - Delete student
    if ($method === 'DELETE' && $action === 'delete') {
        $data = json_decode(file_get_contents("php://input"), true) ?? [];
        $studentId = $data['id'] ?? null;

        if (!$studentId) {
            echo json_encode(['success' => false, 'message' => 'Missing student ID']);
            exit;
        }

        // Cannot delete if is_admin
        $checkSql = "SELECT is_admin FROM users WHERE id = :id";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute(['id' => $studentId]);
        $user = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || $user['is_admin'] === 1) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete this user']);
            exit;
        }

        $deleteSql = "DELETE FROM users WHERE id = :id";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute(['id' => $studentId]);

        echo json_encode(['success' => true, 'message' => 'Student deleted successfully']);
        exit;
    }

    // PUT - Update student
    if ($method === 'PUT' && $action === 'update') {
        $data = json_decode(file_get_contents("php://input"), true) ?? [];

        $id = $data['id'] ?? null;
        $name = $data['name'] ?? null;
        $email = $data['email'] ?? null;
        $resetPassword = $data['resetPassword'] ?? false;

        if (!$id || !$name || !$email) {
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            exit;
        }

        // Check if email is already used by another student
        $checkEmailSql = "SELECT id FROM users WHERE email = :email AND id != :id";
        $checkEmailStmt = $pdo->prepare($checkEmailSql);
        $checkEmailStmt->execute(['email' => $email, 'id' => $id]);
        
        if ($checkEmailStmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email already in use']);
            exit;
        }

        // Update student
        if ($resetPassword) {
            $hashedPassword = password_hash('Password123', PASSWORD_DEFAULT);
            $updateSql = "UPDATE users SET name = :name, email = :email, password = :password WHERE id = :id";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                'name' => $name,
                'email' => $email,
                'password' => $hashedPassword,
                'id' => $id
            ]);
        } else {
            $updateSql = "UPDATE users SET name = :name, email = :email WHERE id = :id";
            $updateStmt = $pdo->prepare($updateSql);
            $updateStmt->execute([
                'name' => $name,
                'email' => $email,
                'id' => $id
            ]);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Student updated successfully' . ($resetPassword ? ' and password reset to Password123' : '')
        ]);
        exit;
    }

    // POST - Change password
    if ($method === 'POST' && $action === 'changePassword') {
        $data = json_decode(file_get_contents("php://input"), true) ?? [];

        $currentPassword = $data['currentPassword'] ?? null;
        $newPassword = $data['newPassword'] ?? null;
        $confirmPassword = $data['confirmPassword'] ?? null;

        // Validation
        if (!$currentPassword || !$newPassword || !$confirmPassword) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            exit;
        }

        if ($newPassword !== $confirmPassword) {
            echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
            exit;
        }

        if (strlen($newPassword) < 8) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
            exit;
        }

        // Get current user's hashed password
        $sql = "SELECT password FROM users WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            exit;
        }

        // Verify current password
        if (!password_verify($currentPassword, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
            exit;
        }

        // Hash new password and update
        $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $updateSql = "UPDATE users SET password = :password WHERE id = :id";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute([
            'password' => $hashedNewPassword,
            'id' => $_SESSION['user_id']
        ]);

        echo json_encode(['success' => true, 'message' => 'Password updated successfully']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    error_log("Student Management Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
?>
