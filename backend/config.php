<?php

return [
    "db_host" => getenv("MYSQLHOST") ?: "127.0.0.1",
    "db_name" => getenv("MYSQLDATABASE") ?: "dashboard_financeiro",
    "db_user" => getenv("MYSQLUSER") ?: "root",
    "db_pass" => getenv("MYSQLPASSWORD") ?: "",
    "db_port" => getenv("MYSQLPORT") ?: null,
];
