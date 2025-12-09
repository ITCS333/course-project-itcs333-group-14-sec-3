<?php
class Database {
    private $host = "localhost";
    private $db   = "course";
    private $user = "admin";
    private $pass = "password123";

    public function getConnection() {
        try {
            $pdo = new PDO(
                "mysql:host={$this->host};dbname={$this->db}",
                $this->user,
                $this->pass
            );
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $pdo;
        } catch (PDOException $e) {
            die("DB Error");
        }
    }
}