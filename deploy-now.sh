#!/bin/bash
export NVM_DIR="/root/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd /www/kannan-pos/sistema_pos

echo "=== git stash (descartar cambios locales) ==="
git stash

echo "=== git pull ==="
git pull origin main

echo "=== build ==="
npm run build 2>&1

echo "=== restart ==="
pm2 restart all

echo "=== DONE ==="
