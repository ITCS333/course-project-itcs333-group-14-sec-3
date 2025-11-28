<?php

// ================= HEADERS =================
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ================= DATABASE =================
require_once __DIR__ . "/../../Database.php";
$db = (new Database())->getConnection();

// ================= REQUEST DATA =================
$method = $_SERVER["REQUEST_METHOD"];
$input  = json_decode(file_get_contents("php://input"), true) ?? [];

// ================= HELPERS =================
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)));
}

// ================= GET STUDENTS (LIST) =================
// Uses users table, only is_admin = 0 (students)
// Adds student_id = part before '@' in email
function getStudents($db) {
    $search = $_GET["search"] ?? "";

    $sql = "SELECT 
                id,
                name,
                email,
                SUBSTRING_INDEX(email, '@', 1) AS student_id
            FROM users
            WHERE is_admin = 0";

    if ($search !== "") {
        $sql .= " AND (
                    name LIKE :search
                    OR email LIKE :search
                    OR SUBSTRING_INDEX(email, '@', 1) LIKE :search
                  )";
    }

    $stmt = $db->prepare($sql);

    if ($search !== "") {
        $stmt->bindValue(":search", "%$search%", PDO::PARAM_STR);
    }

    $stmt->execute();
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(["success" => true, "data" => $students]);
}

// ================= GET ONE STUDENT =================
function getStudentById($db, $id) {
    $stmt = $db->prepare(
        "SELECT 
            id,
            name,
            email,
            SUBSTRING_INDEX(email, '@', 1) AS student_id
         FROM users
         WHERE id = ? AND is_admin = 0"
    );
    $stmt->execute([$id]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        sendResponse(["success" => false, "message" => "Student not found"], 404);
    }

    sendResponse(["success" => true, "data" => $student]);
}

// ================= CREATE STUDENT =================
function createStudent($db, $data) {
    if (
        empty($data["student_id"]) ||
        empty($data["name"]) ||
        empty($data["email"]) ||
        empty($data["password"])
    ) {
        sendResponse(["success" => false, "message" => "Missing fields"], 400);
    }

    if (!validateEmail($data["email"])) {
        sendResponse(["success" => false, "message" => "Invalid email"], 400);
    }

    // Make sure student_id matches part before '@'
    $localPart = strstr($data["email"], '@', true);
    if ($localPart !== $data["student_id"]) {
        sendResponse([
            "success" => false,
            "message" => "Student ID must match the part before '@' in the email."
        ], 400);
    }

    $passwordHash = password_hash($data["password"], PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        "INSERT INTO users (name, email, password, is_admin)
         VALUES (?, ?, ?, 0)"
    );

    try {
        $stmt->execute([
            sanitizeInput($data["name"]),
            sanitizeInput($data["email"]),
            $passwordHash
        ]);

        $id = (int)$db->lastInsertId();

        sendResponse([
            "success" => true,
            "message" => "Student created",
            "data"    => [
                "id"         => $id,
                "student_id" => $data["student_id"],
                "name"       => $data["name"],
                "email"      => $data["email"],
            ]
        ], 201);

    } catch (PDOException $e) {
        // 23000 = unique constraint violation
        if ($e->getCode() === "23000") {
            sendResponse(["success" => false, "message" => "User with this email already exists"], 409);
        }
        sendResponse(["success" => false, "message" => "Database error"], 500);
    }
}

// ================= UPDATE STUDENT =================
function updateStudent($db, $id, $data) {
    if (empty($data["name"]) || empty($data["email"])) {
        sendResponse(["success" => false, "message" => "Name and email are required"], 400);
    }

    if (!validateEmail($data["email"])) {
        sendResponse(["success" => false, "message" => "Invalid email"], 400);
    }

    $stmt = $db->prepare(
        "UPDATE users 
         SET name = ?, email = ?
         WHERE id = ? AND is_admin = 0"
    );

    try {
        $stmt->execute([
            sanitizeInput($data["name"]),
            sanitizeInput($data["email"]),
            $id
        ]);

        if ($stmt->rowCount() === 0) {
            sendResponse(["success" => false, "message" => "Student not found or no changes"], 404);
        }

        sendResponse(["success" => true, "message" => "Student updated"]);

    } catch (PDOException $e) {
        if ($e->getCode() === "23000") {
            sendResponse(["success" => false, "message" => "User with this email already exists"], 409);
        }
        sendResponse(["success" => false, "message" => "Database error"], 500);
    }
}

// ================= DELETE STUDENT =================
function deleteStudent($db, $id) {
    if (!$id) {
        sendResponse(["success" => false, "message" => "User id required"], 400);
    }

    $stmt = $db->prepare("DELETE FROM users WHERE id = ? AND is_admin = 0");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        sendResponse(["success" => false, "message" => "Student not found"], 404);
    }

    sendResponse(["success" => true, "message" => "Student deleted"]);
}

// ================= CHANGE PASSWORD =================
// Uses email to identify the user
function changePassword($db, $data) {
    if (
        empty($data["email"]) ||
        empty($data["current_password"]) ||
        empty($data["new_password"])
    ) {
        sendResponse(["success" => false, "message" => "Missing fields"], 400);
    }

    if (strlen($data["new_password"]) < 8) {
        sendResponse(["success" => false, "message" => "Password too short"], 400);
    }

    $stmt = $db->prepare(
        "SELECT password FROM users WHERE email = ?"
    );
    $stmt->execute([$data["email"]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || !password_verify($data["current_password"], $row["password"])) {
        sendResponse(["success" => false, "message" => "Wrong email or password"], 401);
    }

    $newHash = password_hash($data["new_password"], PASSWORD_DEFAULT);
    $update = $db->prepare(
        "UPDATE users SET password = ? WHERE email = ?"
    );
    $update->execute([$newHash, $data["email"]]);

    sendResponse(["success" => true, "message" => "Password updated"]);
}

// ================= ROUTER =================
try {
    switch ($method) {
        case "GET":
            if (isset($_GET["id"])) {
                getStudentById($db, (int)$_GET["id"]);
            }
            getStudents($db);
            break;

        case "POST":
            if (isset($_GET["action"]) && $_GET["action"] === "change_password") {
                changePassword($db, $input);
            }
            createStudent($db, $input);
            break;

        case "PUT":
            if (!isset($_GET["id"])) {
                sendResponse(["success" => false, "message" => "User id required"], 400);
            }
            updateStudent($db, (int)$_GET["id"], $input);
            break;

        case "DELETE":
            if (!isset($_GET["id"])) {
                sendResponse(["success" => false, "message" => "User id required"], 400);
            }
            deleteStudent($db, (int)$_GET["id"]);
            break;

        default:
            sendResponse(["success" => false, "message" => "Method not allowed"], 405);
    }
} catch (Exception $e) {
    error_log("Admin API error: " . $e->getMessage());
    sendResponse(["success" => false, "message" => "Server error"], 500);
}
