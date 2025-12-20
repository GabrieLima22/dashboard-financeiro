# Dashboard Financeiro (React + PHP + MySQL)

## Requisitos
- Node.js 18+
- XAMPP (Apache + MySQL)

## 1) Criar banco e tabelas
Execute o script SQL em `database/schema.sql`.

Opcao via terminal (MySQL do XAMPP):
```bash
cd c:\xampp\htdocs\dashboard-financeiro
C:\xampp\mysql\bin\mysql.exe -u root < database\schema.sql
```

## 2) Configurar backend
Edite as credenciais em `backend/config.php` se precisar.

O endpoint fica em:
```
http://localhost/dashboard-financeiro/backend/api.php
```

## 3) Rodar o frontend (modo dev)
```bash
cd c:\xampp\htdocs\dashboard-financeiro\frontend
npm install
npm run dev
```

Abra:
```
http://localhost:5173
```

## 4) Primeiro ano
Ao abrir a tela, se nao existir nenhum ano, o sistema cria automaticamente o ano atual.
Se quiser criar outro ano, use o botao "+ Ano" no dashboard.

## 5) Build (opcional)
```bash
cd c:\xampp\htdocs\dashboard-financeiro\frontend
npm run build
```
O build vai para `frontend/dist`.
