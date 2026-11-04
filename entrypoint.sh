#!/bin/bash
set -e

cd /app/backend

# `npm start` ya encadena migrate + arranque (ver backend/package.json). Los datos iniciales (roles) van en
# migraciones; la migracion de datos de la app vieja (npm run migrar-datos) es un paso aparte, manual y unico.
exec npm start
