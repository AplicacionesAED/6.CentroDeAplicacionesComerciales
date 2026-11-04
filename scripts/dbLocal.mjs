// Postgres local de desarrollo, sin instalar nada: levanta un servidor embebido en el puerto 5433 con sus datos en
// .pgdata/ (ignorado por git) y crea la base `comercial_aed` en UTF8. Dejalo corriendo en una terminal aparte:
//   npm run db:local
// Credenciales locales de desarrollo (no son un secreto): usuario `comercial`, clave `comercial_dev_local`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.pgdata');
const pg = new EmbeddedPostgres({ databaseDir, user: 'comercial', password: 'comercial_dev_local', port: 5433, persistent: true, initdbFlags: ['--encoding=UTF8', '--locale=C'] });

if (!fs.existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
await pg.start();
await pg.createDatabase('comercial_aed').catch(() => {}); // ya existe
console.log('Postgres local listo: postgres://comercial:comercial_dev_local@127.0.0.1:5433/comercial_aed');

const apagar = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
setInterval(() => {}, 1 << 30);
