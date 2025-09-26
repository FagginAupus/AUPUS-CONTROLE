# Sistema CRM Aupus Energia

Sistema de gerenciamento de relacionamento com cliente da Aupus Energia, desenvolvido com React.js para o frontend e Laravel para a API backend.

## 📋 Índice
- [Visão Geral do Sistema](#visão-geral-do-sistema)
- [Arquitetura](#arquitetura)
- [Pré-requisitos do Servidor](#pré-requisitos-do-servidor)
- [Instalação Inicial do Servidor](#instalação-inicial-do-servidor)
- [Configuração do Sistema](#configuração-do-sistema)
- [Deploy e Produção](#deploy-e-produção)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Manutenção](#manutenção)
- [Troubleshooting](#troubleshooting)

## 🚀 Visão Geral do Sistema

O sistema é composto por:

### Frontend (React.js)
- **Produção**: `https://crm.aupusenergia.com.br` (`/var/www/aupus-frontend`)
- **Staging**: `https://staging-crm.aupusenergia.com.br` (`/var/www/aupus-frontend-staging`)

### Backend API (Laravel)
- **Produção**: `https://api-crm.aupusenergia.com.br` (`/var/www/aupus-backend`)
- **Staging**: `https://staging-api-crm.aupusenergia.com.br` (`/var/www/aupus-backend-staging`)

## 🏗 Arquitetura

```
├── Frontend (React) → Nginx → HTTPS (Certbot)
├── Backend API (Laravel) → PHP-FPM → Nginx → PostgreSQL
├── Certificados SSL (Let's Encrypt)
└── Scripts de Deploy e Manutenção
```

## 🔧 Pré-requisitos do Servidor

### Sistema Operacional
- **Ubuntu 24.04.3 LTS** (Noble Numbat)

### Software Instalado e Configurado

#### Web Server & Proxy
- **Nginx 1.24.0** (Ubuntu)
  - Configuração para SPA React
  - Proxy reverso para API
  - Configuração SSL
  - Headers de segurança e CORS

#### Runtime Environments
- **Node.js v20.19.4**
- **npm 11.6.0**
- **PHP 8.3.24** (CLI) com Zend OPcache
- **PHP-FPM 8.3** (habilitado e rodando)

#### Package Managers
- **Composer 2.8.11** (para Laravel)

#### Database
- **PostgreSQL 16.10** (Ubuntu 16.10-0ubuntu0.24.04.1)
  - Configurado para conexões locais
  - Usuário e database específicos para produção e staging

#### SSL & Security
- **Certbot 2.9.0** (Let's Encrypt)
- **UFW (Uncomplicated Firewall)** ativo
  - Porta 22 (SSH)
  - Porta 80 (HTTP - redirecionamento)
  - Porta 443 (HTTPS)
  - Porta 5432 (PostgreSQL - restrito)

#### Serviços Habilitados
- `nginx.service`
- `php8.3-fpm.service`
- `postgresql.service`
- `phpsessionclean.timer`

## 🛠 Instalação Inicial do Servidor

### 1. Atualização do Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalação do Nginx
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. Instalação do Node.js e npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

### 4. Instalação do PHP 8.3 e extensões
```bash
sudo apt install php8.3 php8.3-fpm php8.3-cli php8.3-common php8.3-curl php8.3-zip php8.3-gd php8.3-mysql php8.3-xml php8.3-mbstring php8.3-pgsql php8.3-tokenizer php8.3-bcmath php8.3-ctype php8.3-fileinfo php8.3-json -y
sudo systemctl enable php8.3-fpm
sudo systemctl start php8.3-fpm
```

### 5. Instalação do Composer
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

### 6. Instalação do PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 7. Configuração do PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE aupus_prod;
CREATE DATABASE aupus_staging;
CREATE USER aupus_prod WITH PASSWORD 'AupusProd2024Hashtag';
CREATE USER aupus_staging WITH PASSWORD 'AupusStaging2024';
GRANT ALL PRIVILEGES ON DATABASE aupus_prod TO aupus_prod;
GRANT ALL PRIVILEGES ON DATABASE aupus_staging TO aupus_staging;
\q
```

### 8. Configuração do Firewall
```bash
sudo ufw enable
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow from 177.200.0.0/16 to any port 5432
```

### 9. Instalação do Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

## ⚙️ Configuração do Sistema

### Estrutura de Diretórios
```
/var/www/
├── aupus-frontend/              # Frontend produção
├── aupus-frontend-staging/      # Frontend staging
├── aupus-backend/              # Backend produção
├── aupus-backend-staging/      # Backend staging
├── backups/                    # Backups do banco
├── scripts/                    # Scripts de manutenção
├── clear_rate_limit.sh         # Script limpeza rate limit produção
└── clear_rate_limit_staging.sh # Script limpeza rate limit staging
```

### Configuração do Nginx

#### Sites Disponíveis
```bash
/etc/nginx/sites-available/
├── crm                 # Frontend produção
├── api-crm            # Backend produção
├── staging-crm        # Frontend staging
└── staging-api        # Backend staging
```

#### Configuração Frontend Produção (`/etc/nginx/sites-available/crm`)
```nginx
server {
    server_name crm.aupusenergia.com.br;
    root /var/www/aupus-frontend;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy storage requests to API
    location /storage/ {
        proxy_pass https://api-crm.aupusenergia.com.br;
        proxy_set_header Host api-crm.aupusenergia.com.br;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    access_log /var/log/aupus/crm-access.log;
    error_log /var/log/aupus/crm-error.log;

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/crm.aupusenergia.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.aupusenergia.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = crm.aupusenergia.com.br) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name crm.aupusenergia.com.br;
    return 404;
}
```

### Configuração de SSL
```bash
# Gerar certificados SSL para todos os domínios
sudo certbot --nginx -d crm.aupusenergia.com.br
sudo certbot --nginx -d api-crm.aupusenergia.com.br
sudo certbot --nginx -d staging-crm.aupusenergia.com.br
sudo certbot --nginx -d staging-api-crm.aupusenergia.com.br

# Renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Configuração de Logs
```bash
sudo mkdir -p /var/log/aupus
sudo chown www-data:www-data /var/log/aupus
```

## 🚀 Deploy e Produção

### Primeiro Deploy

#### 1. Clone dos Repositórios
```bash
cd /var/www
git clone [REPO_FRONTEND] aupus-frontend
git clone [REPO_FRONTEND] aupus-frontend-staging
git clone [REPO_BACKEND] aupus-backend
git clone [REPO_BACKEND] aupus-backend-staging
```

#### 2. Configuração Frontend
```bash
cd /var/www/aupus-frontend-staging
npm install
npm run build
sudo chown -R www-data:www-data /var/www/aupus-frontend-staging
```

#### 3. Configuração Backend
```bash
cd /var/www/aupus-backend-staging
composer install
cp .env.example .env
# Configurar .env com dados do PostgreSQL
php artisan key:generate
php artisan migrate
sudo chown -R www-data:www-data /var/www/aupus-backend-staging
```

### Deploy Automático

O sistema possui um script de deploy automatizado em `/var/www/scripts/deploy.sh`:

```bash
# Deploy staging para produção
sudo /var/www/scripts/deploy.sh
```

**O script realiza:**
1. Backup automático do banco de produção
2. Commit automático de mudanças pendentes
3. Sincronização forçada dos repositórios
4. Instalação de dependências
5. Migração do banco
6. Cache clearing e rebuild
7. Restart dos serviços

## 📁 Estrutura de Diretórios

### Frontend (aupus-frontend-staging)
```
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── utils/
├── package.json
└── README.md
```

### Backend (aupus-backend-staging)
```
├── app/
│   ├── Http/Controllers/
│   ├── Models/
│   └── Services/
├── config/
├── database/
├── routes/
├── storage/
├── composer.json
└── .env.example
```

## 🔨 Scripts Disponíveis

### Frontend
```bash
npm start          # Desenvolvimento (porta 3000)
npm run build      # Build para produção
npm test           # Testes
```

### Backend
```bash
php artisan serve                    # Desenvolvimento
php artisan migrate                  # Executar migrações
php artisan config:clear            # Limpar cache config
php artisan route:clear              # Limpar cache rotas
php artisan view:clear              # Limpar cache views
```

### Scripts de Manutenção
```bash
/var/www/clear_rate_limit.sh         # Limpar rate limiting produção
/var/www/clear_rate_limit_staging.sh # Limpar rate limiting staging
/var/www/scripts/deploy.sh           # Deploy staging → produção
/var/www/scripts/copy-db-prod-to-staging.sh  # Copiar DB prod → staging
```

## 🔧 Manutenção

### Backups
- **Localização**: `/var/www/backups/`
- **Automático**: Criado a cada deploy
- **Manual**:
```bash
PGPASSWORD="AupusProd2024Hashtag" pg_dump -h 127.0.0.1 -U aupus_prod -d aupus_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Logs
- **Nginx**: `/var/log/aupus/`
- **PHP-FPM**: `/var/log/php8.3-fpm.log`
- **PostgreSQL**: `/var/log/postgresql/`

### Monitoramento de Serviços
```bash
systemctl status nginx
systemctl status php8.3-fpm
systemctl status postgresql
```

## 🔍 Troubleshooting

### Rate Limiting Issues
```bash
# Executar script de limpeza
sudo /var/www/clear_rate_limit.sh

# No navegador (Console)
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### Problemas de Deploy
```bash
# Verificar status dos serviços
systemctl status nginx php8.3-fpm postgresql

# Verificar logs
tail -f /var/log/aupus/crm-error.log
tail -f /var/log/aupus/api-error.log

# Recarregar configurações
sudo nginx -s reload
sudo systemctl restart php8.3-fpm
```

### Problemas SSL
```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Testar configuração Nginx
sudo nginx -t
```

### Problemas de Banco
```bash
# Conectar ao PostgreSQL
sudo -u postgres psql -d aupus_prod

# Verificar conexões
SELECT * FROM pg_stat_activity;

# Backup e restore
pg_dump -h localhost -U aupus_prod aupus_prod > backup.sql
psql -h localhost -U aupus_prod aupus_prod < backup.sql
```

## 📞 Suporte

Para problemas específicos:
1. Verificar logs em `/var/log/aupus/`
2. Executar scripts de limpeza disponíveis
3. Verificar status dos serviços
4. Consultar este README para procedimentos

---

## Informações Técnicas Adicionais

### Dependências Frontend
```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.1.1",
    "date-fns": "^4.1.0",
    "html2canvas": "^1.4.1",
    "js-cookie": "^3.0.5",
    "jspdf": "^3.0.1",
    "lucide-react": "^0.525.0",
    "papaparse": "^5.5.3",
    "pdf-lib": "^1.17.1",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.61.1",
    "react-router-dom": "^7.7.0",
    "react-scripts": "5.0.1",
    "recharts": "^3.2.1",
    "web-vitals": "^2.1.4",
    "xlsx": "^0.18.5",
    "yup": "^1.6.1"
  }
}
```

### Dependências Backend (Laravel)
```json
{
  "require": {
    "php": "^8.2",
    "doctrine/dbal": "^4.3",
    "laravel/framework": "^12.0",
    "laravel/tinker": "^2.10.1",
    "setasign/fpdf": "^1.8",
    "setasign/fpdi": "^2.6",
    "spatie/laravel-permission": "^6.21",
    "tymon/jwt-auth": "^2.2"
  }
}
```
