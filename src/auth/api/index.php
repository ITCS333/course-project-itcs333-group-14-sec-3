<?php
session_start();
/*headers part: */
header("Content-Type: application/json");  // frontend only allowed to send to the backend in JSON type
header("Access-Control-Allow-Origin: *");  // can came from any frontend 
header("Access-Control-Allow-Methods: POST, OPTIONS"); // only post method is allowed
header("Access-Control-Allow-Headers: Content-Type");


if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {  // checking before sending post method
    http_response_code(200);
    exit;
}


if ($_SERVER["REQUEST_METHOD"] !== "POST") {  // block any methods that isn't post
    echo json_encode([
        'success' => false,
        'message' => "Invalid request method"
    ]);
    exit;
}

$rawData = file_get_contents("php://input");  // store the data in JSON that came from frontend
$data = json_decode($rawData, true) ?? [];   // make the JSON to php array

if (!isset($data['email']) || !isset($data['password'])) {    // return error if email or password not exist 
    echo json_encode([
        'success' => false,
        'message' => 'Missing email or password'
    ]);
    exit;
}

$email    = trim($data['email']);  // store the email and passwords and remove any spaces from email input
$password = $data['password'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {  // using filter_var with FILTER_VALIDATE_EMAIL to check the format of user input
    echo json_encode([
        'success' => false,
        'message' => 'Invalid email format'
    ]);
    exit;
}

if (strlen($password) < 8) {  // return false to the frontend since password must be at least 8 characters
    echo json_encode([
        'success' => false,
        'message' => 'Password must be at least 8 characters'
    ]);
    exit;
}

require_once __DIR__ . "/../../Database.php";   // using database file that connect to database

try {
    $pdo = (new Database())->getConnection();
// send sql command to the database
    $sql = "SELECT id, name, email, password, is_admin  
            FROM users 
            WHERE email = :email";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['email' => $email]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);  // fetch user data

    if ($user && password_verify($password, $user['password'])) {

        $_SESSION['user_id']    = $user['id'];
        $_SESSION['user_name']  = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['is_admin']   = (int)$user['is_admin'];
        $_SESSION['logged_in']  = true;

        echo json_encode([    // send the to frontend that the input data was correct
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
