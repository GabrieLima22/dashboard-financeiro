<?php

$config = require __DIR__ . "/config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

$dsn = sprintf(
    "mysql:host=%s;%sdbname=%s;charset=utf8mb4",
    $config["db_host"],
    !empty($config["db_port"]) ? "port=" . $config["db_port"] . ";" : "",
    $config["db_name"]
);

try {
    $pdo = new PDO($dsn, $config["db_user"], $config["db_pass"], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $e) {
    jsonResponse(["error" => "Falha na conexao com o banco."], 500);
}

$endpoint = $_GET["endpoint"] ?? "";
$method = $_SERVER["REQUEST_METHOD"];

switch ($endpoint) {
    case "years":
        if ($method === "GET") {
            $stmt = $pdo->query("SELECT year FROM years ORDER BY year DESC");
            $years = array_map(fn($row) => (int)$row["year"], $stmt->fetchAll());
            jsonResponse(["years" => $years]);
        }

        if ($method === "POST") {
            $payload = readJsonBody();
            $year = (int)($payload["year"] ?? 0);
            if (!$year) {
                jsonResponse(["error" => "Ano invalido."], 400);
            }
            ensureYear($pdo, $year);
            jsonResponse(["ok" => true, "year" => $year], 201);
        }
        break;

    case "year":
        if ($method !== "GET") {
            jsonResponse(["error" => "Metodo nao permitido."], 405);
        }
        $year = (int)($_GET["year"] ?? 0);
        if (!$year) {
            jsonResponse(["error" => "Ano invalido."], 400);
        }
        ensureYear($pdo, $year);
        jsonResponse(["months" => loadYear($pdo, $year)]);
        break;

    case "month":
        if ($method === "GET") {
            $year = (int)($_GET["year"] ?? 0);
            $month = (int)($_GET["month"] ?? 0);
            if (!$year || !$month) {
                jsonResponse(["error" => "Ano ou mes invalido."], 400);
            }
            ensureYear($pdo, $year);
            jsonResponse(["month" => loadMonth($pdo, $year, $month)]);
        }

        if ($method === "PUT") {
            $payload = readJsonBody();
            $year = (int)($payload["year"] ?? 0);
            $month = (int)($payload["month"] ?? 0);
            $categories = $payload["categories"] ?? [];

            if (!$year || !$month || !is_array($categories)) {
                jsonResponse(["error" => "Payload invalido."], 400);
            }

            ensureYear($pdo, $year);
            $pdo->beginTransaction();
            $stmt = $pdo->prepare(
                "UPDATE monthly_categories
                 SET revenue = :revenue,
                     expense = :expense,
                     revenue_note = :revenue_note,
                     expense_note = :expense_note,
                     target_revenue = :target_revenue
                 WHERE year = :year AND month = :month AND category_code = :code"
            );

            foreach ($categories as $cat) {
                $stmt->execute([
                    ":revenue" => (float)($cat["revenue"] ?? 0),
                    ":expense" => (float)($cat["expense"] ?? 0),
                    ":revenue_note" => $cat["revenueNote"] ?? "",
                    ":expense_note" => $cat["expenseNote"] ?? "",
                    ":target_revenue" => (float)($cat["targetRevenue"] ?? 0),
                    ":year" => $year,
                    ":month" => $month,
                    ":code" => $cat["code"] ?? "",
                ]);
            }
            $pdo->commit();
            jsonResponse(["ok" => true]);
        }
        break;
}

jsonResponse(["error" => "Endpoint nao encontrado."], 404);

function readJsonBody(): array
{
    $raw = file_get_contents("php://input");
    $payload = json_decode($raw, true);
    return is_array($payload) ? $payload : [];
}

function jsonResponse(array $data, int $status = 200): void
{
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function ensureCategories(PDO $pdo): void
{
    $preset = [
        ["code" => "IC", "label" => "IC"],
        ["code" => "ABERTO", "label" => "ABERTO"],
        ["code" => "FIXO", "label" => "FIXO"],
        ["code" => "EAD", "label" => "EAD"],
        ["code" => "PROJETOS", "label" => "PROJETOS CORP."],
        ["code" => "OUTROS", "label" => "OUTROS"],
        ["code" => "INVEST", "label" => "INVESTIMENTOS"],
    ];

    $count = (int)$pdo->query("SELECT COUNT(*) FROM categories")->fetchColumn();
    if ($count > 0) {
        return;
    }

    $stmt = $pdo->prepare("INSERT INTO categories (code, label) VALUES (:code, :label)");
    foreach ($preset as $row) {
        $stmt->execute([
            ":code" => $row["code"],
            ":label" => $row["label"],
        ]);
    }
}

function ensureYear(PDO $pdo, int $year): void
{
    ensureCategories($pdo);
    $exists = $pdo->prepare("SELECT COUNT(*) FROM years WHERE year = :year");
    $exists->execute([":year" => $year]);
    if ((int)$exists->fetchColumn() > 0) {
        return;
    }

    $pdo->beginTransaction();
    $pdo->prepare("INSERT INTO years (year) VALUES (:year)")->execute([":year" => $year]);

    $categories = $pdo->query("SELECT code FROM categories ORDER BY code")->fetchAll();
    $monthInsert = $pdo->prepare("INSERT INTO months (year, month, name) VALUES (:year, :month, :name)");
    $entryInsert = $pdo->prepare(
        "INSERT INTO monthly_categories (year, month, category_code, revenue, expense, revenue_note, expense_note, target_revenue)
         VALUES (:year, :month, :code, 0, 0, '', '', 0)"
    );

    $monthNames = [
        1 => "Janeiro",
        2 => "Fevereiro",
        3 => "Março",
        4 => "Abril",
        5 => "Maio",
        6 => "Junho",
        7 => "Julho",
        8 => "Agosto",
        9 => "Setembro",
        10 => "Outubro",
        11 => "Novembro",
        12 => "Dezembro",
    ];

    for ($m = 1; $m <= 12; $m++) {
        $monthInsert->execute([
            ":year" => $year,
            ":month" => $m,
            ":name" => $monthNames[$m],
        ]);
        foreach ($categories as $cat) {
            $entryInsert->execute([
                ":year" => $year,
                ":month" => $m,
                ":code" => $cat["code"],
            ]);
        }
    }

    $pdo->commit();
}

function loadYear(PDO $pdo, int $year): array
{
    $stmt = $pdo->prepare(
        "SELECT m.month, m.name, c.code, c.label,
                mc.revenue, mc.expense, mc.revenue_note, mc.expense_note, mc.target_revenue
         FROM months m
         JOIN monthly_categories mc ON mc.year = m.year AND mc.month = m.month
         JOIN categories c ON c.code = mc.category_code
         WHERE m.year = :year
         ORDER BY m.month, c.code"
    );
    $stmt->execute([":year" => $year]);

    $months = [];
    foreach ($stmt->fetchAll() as $row) {
        $monthId = (int)$row["month"];
        if (!isset($months[$monthId])) {
            $months[$monthId] = [
                "id" => $monthId,
                "name" => $row["name"],
                "categories" => [],
            ];
        }
        $months[$monthId]["categories"][] = [
            "code" => $row["code"],
            "label" => $row["label"],
            "revenue" => (float)$row["revenue"],
            "revenueNote" => $row["revenue_note"],
            "expense" => (float)$row["expense"],
            "expenseNote" => $row["expense_note"],
            "targetRevenue" => (float)$row["target_revenue"],
        ];
    }

    return array_values($months);
}

function loadMonth(PDO $pdo, int $year, int $month): array
{
    $stmt = $pdo->prepare(
        "SELECT m.month, m.name, c.code, c.label,
                mc.revenue, mc.expense, mc.revenue_note, mc.expense_note, mc.target_revenue
         FROM months m
         JOIN monthly_categories mc ON mc.year = m.year AND mc.month = m.month
         JOIN categories c ON c.code = mc.category_code
         WHERE m.year = :year AND m.month = :month
         ORDER BY c.code"
    );
    $stmt->execute([":year" => $year, ":month" => $month]);
    $rows = $stmt->fetchAll();

    if (!$rows) {
        return [];
    }

    $categories = [];
    foreach ($rows as $row) {
        $categories[] = [
            "code" => $row["code"],
            "label" => $row["label"],
            "revenue" => (float)$row["revenue"],
            "revenueNote" => $row["revenue_note"],
            "expense" => (float)$row["expense"],
            "expenseNote" => $row["expense_note"],
            "targetRevenue" => (float)$row["target_revenue"],
        ];
    }

    return [
        "id" => (int)$rows[0]["month"],
        "name" => $rows[0]["name"],
        "categories" => $categories,
    ];
}




