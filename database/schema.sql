CREATE DATABASE IF NOT EXISTS dashboard_financeiro
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE dashboard_financeiro;

CREATE TABLE IF NOT EXISTS categories (
  code VARCHAR(20) PRIMARY KEY,
  label VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS years (
  year INT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS months (
  year INT NOT NULL,
  month TINYINT NOT NULL,
  name VARCHAR(20) NOT NULL,
  PRIMARY KEY (year, month),
  CONSTRAINT fk_months_years FOREIGN KEY (year) REFERENCES years (year)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_categories (
  year INT NOT NULL,
  month TINYINT NOT NULL,
  category_code VARCHAR(20) NOT NULL,
  revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
  expense DECIMAL(14,2) NOT NULL DEFAULT 0,
  revenue_note VARCHAR(255) NOT NULL DEFAULT '',
  expense_note VARCHAR(255) NOT NULL DEFAULT '',
  target_revenue DECIMAL(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (year, month, category_code),
  CONSTRAINT fk_monthly_months FOREIGN KEY (year, month) REFERENCES months (year, month)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_monthly_categories FOREIGN KEY (category_code) REFERENCES categories (code)
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT IGNORE INTO categories (code, label) VALUES
  ('IC', 'IC'),
  ('ABERTO', 'ABERTO'),
  ('FIXO', 'FIXO'),
  ('EAD', 'EAD'),
  ('PROJETOS', 'PROJETOS CORP.'),
  ('OUTROS', 'OUTROS'),
  ('INVEST', 'INVESTIMENTOS');
