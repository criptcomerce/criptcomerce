#!/bin/sh
set -e

echo "▶ Aguardando banco de dados..."

# Espera o postgres aceitar conexões (safety extra além do healthcheck)
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  echo "  postgres não disponível, aguardando 2s..."
  sleep 2
done

echo "✅ Banco disponível"
echo "▶ Executando migrations..."

node -e "
const { AppDataSource } = require('./dist/data-source');
AppDataSource.initialize()
  .then(() => AppDataSource.runMigrations())
  .then(() => { console.log('✅ Migrations OK'); process.exit(0); })
  .catch(e => { console.error('❌ Migrations falhou:', e.message); process.exit(1); });
"

echo "▶ Iniciando aplicação..."
exec node dist/main.js
