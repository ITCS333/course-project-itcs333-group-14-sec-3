<?php
session_start();

// ===== HEADERS (JSON + CORS) =====
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Only allow POST for login
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        'success' => false,
        'message' => "Invalid request method"
    ]);
    exit;
}

// ===== READ JSON BODY =====
$rawData = file_get_contents("php://input");
$data = json_decode($rawData, true) ?? [];

if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Missing email or password'
    ]);
    exit;
}

$email    = trim($data['email']);
$password = $data['password'];

// ===== VALIDATION =====
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email format'
    ]);
    exit;
}

if (strlen($password) < 8) {
    echo json_encode([
        'success' => false,
        'message' => 'Password must be at least 8 characters'
    ]);
    exit;
}

// ===== DATABASE =====
// Use the SAME Database.php you used in admin/api
require_once __DIR__ . "/../../Database.php";

try {
    $pdo = (new Database())->getConnection();

    $sql = "SELECT id, name, email, password, is_admin 
            FROM users 
            WHERE email = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['email' => $email]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
        // Login OK – set session variables
        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['is_admin']   = (int)$user['is_admin'];
        $_SESSION['logged_in']  = true;

        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'id'       => (int)$user['id'],
                'name'     => $user['name'],
                'email'    => $user['email'],
                'is_admin' => (int)$user['is_admin'],
            ]
        ]);
        exit;
    }

    // Wrong email or password
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email or password'
    ]);
    exit;

} catch (PDOException $e) {
    error_log("Login Error: " . $e->getMessage());

    echo json_encode([
        'success' => false,
        'message' => 'Something went wrong. Please try again later.'
    ]);
    exit;
}
