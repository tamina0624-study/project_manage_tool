<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

function privateDataDirectory(): string
{
    return dirname(__DIR__) . '/.local-data';
}

function loadEnvironmentFile(): void
{
    $path = privateDataDirectory() . '/.env';
    if (!is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if ($name === '' || getenv($name) !== false) {
            continue;
        }

        if (strlen($value) >= 2 && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))) {
            $value = substr($value, 1, -1);
        }
        putenv($name . '=' . $value);
    }
}

loadEnvironmentFile();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function resolveDatabaseConfig(): array
{
    $driver = getenv('DB_DRIVER') ?: 'mysql';

    if ($driver === 'sqlite') {
        $path = getenv('DB_PATH') ?: 'project_manager.sqlite';
        if (!str_starts_with($path, '/') && !str_starts_with($path, '\\') && !preg_match('/^[A-Za-z]:[\\\\\/]/', $path)) {
            $path = privateDataDirectory() . '/' . $path;
        }
        return [
            'sqlite',
            $path,
            null,
            null,
            null,
        ];
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $name = getenv('DB_NAME') ?: 'project_manager';
    $user = getenv('DB_USER') ?: 'root';
    $pass = getenv('DB_PASS') ?: '';

    return ['mysql', $host, $port, $name, $user, $pass];
}

function getDefaultState(): array
{
    return [
        'projects' => [
            [
                'id' => 1,
                'name' => 'My App',
                'path' => '/workspace/my-app',
                'favorite' => true,
                'tags' => ['app', 'react'],
                'gitBranch' => 'main',
                'repoStatus' => 'clean',
                'comments' => []
            ],
            [
                'id' => 2,
                'name' => 'API Service',
                'path' => '/workspace/api-service',
                'favorite' => true,
                'tags' => ['backend'],
                'gitBranch' => 'develop',
                'repoStatus' => 'dirty',
                'comments' => []
            ],
        ],
        'tickets' => [
            [
                'id' => 101,
                'ticketId' => 'EPIC-001',
                'title' => 'Application foundation',
                'projectId' => 1,
                'sprint' => 'Sprint 1',
                'ticketType' => 'Epic',
                'parentId' => null,
                'order' => 0,
                'assignee' => 'Alice',
                'status' => 'doing'
            ],
            [
                'id' => 102,
                'ticketId' => 'TASK-001',
                'title' => 'Documentation',
                'projectId' => 1,
                'sprint' => 'Sprint 1',
                'ticketType' => 'Task',
                'parentId' => 101,
                'order' => 0,
                'assignee' => 'Bob',
                'status' => 'todo'
            ],
            [
                'id' => 103,
                'ticketId' => 'FEAT-001',
                'title' => 'API endpoints',
                'projectId' => 2,
                'sprint' => '',
                'ticketType' => 'Feature',
                'parentId' => null,
                'order' => 0,
                'assignee' => '',
                'status' => 'done'
            ],
        ],
        'sprints' => [],
        'recent' => []
    ];
}

function parseJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function ensureDatabase(): PDO
{
    $config = resolveDatabaseConfig();
    $driver = $config[0];

    if ($driver === 'sqlite') {
        $path = $config[1];
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY AUTOINCREMENT, `key` TEXT NOT NULL UNIQUE, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
        return $pdo;
    }

    [$host, $port, $name, $user, $pass] = array_slice($config, 1);
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS app_state (
                id INT AUTO_INCREMENT PRIMARY KEY,
                `key` VARCHAR(64) NOT NULL UNIQUE,
                value JSON NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
        return $pdo;
    } catch (Throwable $e) {
        $sqlitePath = privateDataDirectory() . '/project_manager.sqlite';
        $pdo = new PDO('sqlite:' . $sqlitePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY AUTOINCREMENT, `key` TEXT NOT NULL UNIQUE, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
        return $pdo;
    }
}

function readState(PDO $pdo): array
{
    $defaultState = getDefaultState();

    try {
        $stmt = $pdo->query("SELECT `key`, value FROM app_state");
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        return $defaultState;
    }

    $state = $defaultState;
    foreach ($rows as $row) {
        $key = $row['key'];
        $decoded = json_decode($row['value'], true);
        if (is_array($decoded)) {
            $state[$key] = $decoded;
        }
    }

    return $state;
}

function writeState(PDO $pdo, string $key, mixed $value): void
{
    $json = json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Unable to encode value for database storage');
    }

    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'mysql') {
        $stmt = $pdo->prepare(
            "INSERT INTO app_state (`key`, value) VALUES (:key, :value)
             ON DUPLICATE KEY UPDATE value = VALUES(value)"
        );
        $stmt->execute([
            ':key' => $key,
            ':value' => $json,
        ]);
        return;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO app_state (`key`, value) VALUES (:key, :value)
         ON CONFLICT(`key`) DO UPDATE SET value = excluded.value"
    );
    $stmt->execute([
        ':key' => $key,
        ':value' => $json,
    ]);
}

try {
    $pdo = ensureDatabase();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'database_connection_failed',
        'message' => $e->getMessage(),
    ]);
    exit;
}

$action = $_GET['action'] ?? ($_POST['action'] ?? null);

if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'missing_action']);
    exit;
}

$state = readState($pdo);

switch ($action) {
    case 'projects':
        echo json_encode(['data' => $state['projects'] ?? []]);
        break;

    case 'tickets':
        echo json_encode(['data' => $state['tickets'] ?? []]);
        break;

    case 'sprints':
        echo json_encode(['data' => $state['sprints'] ?? []]);
        break;

    case 'recent':
        echo json_encode(['data' => $state['recent'] ?? []]);
        break;

    case 'save-projects':
        $body = parseJsonBody();
        $value = $body['data'] ?? $state['projects'] ?? [];
        writeState($pdo, 'projects', $value);
        echo json_encode(['data' => $value]);
        break;

    case 'save-tickets':
        $body = parseJsonBody();
        $value = $body['data'] ?? $state['tickets'] ?? [];
        writeState($pdo, 'tickets', $value);
        echo json_encode(['data' => $value]);
        break;

    case 'save-sprints':
        $body = parseJsonBody();
        $value = $body['data'] ?? $state['sprints'] ?? [];
        writeState($pdo, 'sprints', $value);
        echo json_encode(['data' => $value]);
        break;

    case 'save-recent':
        $body = parseJsonBody();
        $value = $body['data'] ?? $state['recent'] ?? [];
        writeState($pdo, 'recent', $value);
        echo json_encode(['data' => $value]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'unsupported_action', 'action' => $action]);
        break;
}
