// Migra los datos de la app vieja (Centro de Aplicaciones Comerciales, `pg` directo) a esta base (Sequelize).
//
// Uso (desde backend/):
//   LEGACY_DATABASE_URL=postgres://... node scripts/migrarDatosLegado.js            # simulacro: no escribe nada
//   LEGACY_DATABASE_URL=postgres://... node scripts/migrarDatosLegado.js --aplicar  # escribe
// La base destino es la de DATABASE_URL / PG* (ya migrada con `npm run db:migrate`).
// Opcionales: LEGACY_QUOTES_DIR (carpeta con los PDF viejos, server/data/quotes), LEGACY_ADMIN_EMAILS (lista de
// correos admin por defecto de la app vieja, separados por coma).
//
// Reglas:
//  - La base vieja es SOLO LECTURA: este script nunca ejecuta INSERT/UPDATE/DELETE contra ella.
//  - Es idempotente: se puede correr varias veces; lo que ya existe se omite (los ajustes solo se copian si faltan).
//  - Todo se escribe en UNA transaccion; el simulacro la deshace al final.
//  - La app vieja no tenia tabla de usuarios: se crean usuarios para los correos con rol o proyectos asignados (y los
//    admin por defecto). Los duenos de cotizaciones sin cuenta se listan al final para que un admin los cree si hace falta.
//  - Las cotizaciones conservan su id. Las cachés (deals_cache, units_cache) no se migran: se regeneran solas.
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const sequelize = require('../src/config/db');
require('../src/models');
const { PROYECTOS } = require('../src/utils/comercial');
const { hashPassword } = require('../src/utils/security');
const { generateRandomPassword } = require('../src/utils/passwordRules');
const { QUOTES_DIR } = require('../src/modules/cotizacion/cotizacion.service');

const APLICAR = process.argv.includes('--aplicar');
const LEGACY_URL = process.env.LEGACY_DATABASE_URL;
const LEGACY_QUOTES_DIR = process.env.LEGACY_QUOTES_DIR || '';
const ADMIN_POR_DEFECTO = (process.env.LEGACY_ADMIN_EMAILS || 'rgalindo@aed.com.co,gvaldelamar@aed.com.co')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

if (!LEGACY_URL) {
  console.error('Falta LEGACY_DATABASE_URL (conexión a la base de la app vieja, solo lectura).');
  process.exit(1);
}

const resumen = {};
const cuenta = (clave, n = 1) => {
  resumen[clave] = (resumen[clave] ?? 0) + n;
};

// "juan.perez@aed.com.co" -> "Juan Perez": la app vieja no guardaba nombres de usuario.
const nombreDesdeCorreo = (email) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ') || email;

function parsearJson(texto) {
  if (texto == null) return null;
  if (typeof texto === 'object') return texto;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

async function main() {
  const legado = new Client({ connectionString: LEGACY_URL, ssl: process.env.LEGACY_PGSSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await legado.connect();
  // Doble seguro: la sesion de lectura rechaza cualquier escritura.
  await legado.query('SET default_transaction_read_only = on');

  const leer = async (sql) => (await legado.query(sql)).rows;
  const existe = async (tabla) => (await leer(`SELECT to_regclass('public.${tabla}') AS t`))[0].t !== null;

  const roles = (await existe('user_roles')) ? await leer('SELECT user_email, role FROM user_roles') : [];
  const asesores = (await existe('advisor_projects')) ? await leer('SELECT user_email, project FROM advisor_projects') : [];
  const cotizaciones = (await existe('quotes')) ? await leer('SELECT * FROM quotes ORDER BY id') : [];
  const ajustes = (await existe('app_settings')) ? await leer('SELECT key, value FROM app_settings') : [];
  await legado.end();

  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULACRO'} -- origen: ${roles.length} roles, ${asesores.length} asignaciones, ${cotizaciones.length} cotizaciones, ${ajustes.length} ajustes`);

  await sequelize.transaction(async (transaction) => {
    const q = (sql, replacements) => sequelize.query(sql, { replacements, transaction });

    // ── Usuarios ──
    const rolDe = new Map(roles.map((r) => [r.user_email.toLowerCase(), r.role]));
    const correos = new Set([...rolDe.keys(), ...asesores.map((a) => a.user_email.toLowerCase()), ...ADMIN_POR_DEFECTO]);
    const idPorCorreo = new Map();
    for (const email of correos) {
      const [filas] = await q('SELECT id FROM usuarios WHERE email = :email', { email });
      if (filas.length) {
        idPorCorreo.set(email, filas[0].id);
        cuenta('usuarios ya existentes');
        continue;
      }
      // Sin fila en user_roles, la app vieja trataba como admin a los de la lista por defecto y como vendedor al resto.
      const esAdmin = rolDe.get(email) === 'admin' || (!rolDe.has(email) && ADMIN_POR_DEFECTO.includes(email));
      const [nuevo] = await q(
        `INSERT INTO usuarios (email, nombre, hashed_password, roles, funcionalidades_adicionales, activo, debe_cambiar_password, creado_en, actualizado_en)
         VALUES (:email, :nombre, :hash, CAST(:roles AS jsonb), '[]'::jsonb, true, true, NOW(), NOW()) RETURNING id`,
        { email, nombre: nombreDesdeCorreo(email), hash: await hashPassword(generateRandomPassword()), roles: JSON.stringify([esAdmin ? 'ADMIN' : 'VENDEDOR']) }
      );
      idPorCorreo.set(email, nuevo[0].id);
      cuenta(esAdmin ? 'usuarios creados (ADMIN)' : 'usuarios creados (VENDEDOR)');
    }

    // ── Proyectos asignados ──
    for (const { user_email, project } of asesores) {
      if (!PROYECTOS.includes(project)) {
        cuenta('asignaciones omitidas (proyecto desconocido)');
        continue;
      }
      const [r] = await q('INSERT INTO asesor_proyectos (usuario_id, proyecto) VALUES (:id, :proyecto) ON CONFLICT DO NOTHING RETURNING usuario_id', {
        id: idPorCorreo.get(user_email.toLowerCase()),
        proyecto: project,
      });
      cuenta(r.length ? 'asignaciones migradas' : 'asignaciones ya existentes');
    }

    // ── Cotizaciones (conservan su id) y sus PDF ──
    const sinCuenta = new Set();
    for (const c of cotizaciones) {
      const dueno = (c.user_email || '').toLowerCase();
      if (dueno && !idPorCorreo.has(dueno)) sinCuenta.add(dueno);
      const snapshot = parsearJson(c.snapshot_json);
      if (c.snapshot_json && snapshot === null) cuenta('snapshots ilegibles (se dejan vacíos)');
      const [r] = await q(
        `INSERT INTO cotizaciones (id, deal_id, deal_name, unit_id, unit_code, unit_tower, unit_floor, user_email, generated_by_email, quote_type,
            total_price, separation, monthly_payment, num_installments, balance, pdf_filename, status, snapshot_json, parking_id, parking_name,
            deposito_id, deposito_name, cuarto_util_id, cuarto_util_name, project, created_at)
         VALUES (:id, :deal_id, :deal_name, :unit_id, :unit_code, :unit_tower, :unit_floor, :user_email, :generated_by_email, :quote_type,
            :total_price, :separation, :monthly_payment, :num_installments, :balance, :pdf_filename, :status, CAST(:snapshot AS jsonb), :parking_id, :parking_name,
            :deposito_id, :deposito_name, :cuarto_util_id, :cuarto_util_name, :project, CAST(:created_at AS timestamp) AT TIME ZONE 'UTC')
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        {
          id: c.id,
          deal_id: String(c.deal_id),
          deal_name: c.deal_name ?? null,
          unit_id: String(c.unit_id),
          unit_code: c.unit_code ?? null,
          unit_tower: c.unit_tower ?? null,
          unit_floor: c.unit_floor ?? null,
          user_email: dueno || null,
          generated_by_email: c.generated_by_email ? c.generated_by_email.toLowerCase() : null,
          quote_type: c.quote_type ?? null,
          total_price: c.total_price ?? null,
          separation: c.separation ?? null,
          monthly_payment: c.monthly_payment ?? null,
          num_installments: c.num_installments ?? null,
          balance: c.balance ?? null,
          pdf_filename: c.pdf_filename ?? null,
          status: c.status === 'aceptada' ? 'aceptada' : 'pendiente',
          snapshot: snapshot === null ? null : JSON.stringify(snapshot),
          parking_id: c.parking_id ?? null,
          parking_name: c.parking_name ?? null,
          deposito_id: c.deposito_id ?? null,
          deposito_name: c.deposito_name ?? null,
          cuarto_util_id: c.cuarto_util_id ?? null,
          cuarto_util_name: c.cuarto_util_name ?? null,
          // Las cotizaciones anteriores a la columna `project` no la traen: se deduce del snapshot (negocio o unidad).
          project: [c.project, snapshot?.deal?.proyecto_inmobiliario_cac, snapshot?.unit?.proyecto_inmobiliario].find((p) => PROYECTOS.includes(p)) ?? null,
          created_at: c.created_at,
        }
      );
      cuenta(r.length ? 'cotizaciones migradas' : 'cotizaciones ya existentes');

      if (c.pdf_filename && LEGACY_QUOTES_DIR) {
        const origen = path.join(LEGACY_QUOTES_DIR, path.basename(c.pdf_filename));
        const destino = path.join(QUOTES_DIR, path.basename(c.pdf_filename));
        if (!fs.existsSync(origen)) cuenta('PDF no encontrados en LEGACY_QUOTES_DIR');
        else if (fs.existsSync(destino)) cuenta('PDF ya existentes');
        else {
          if (APLICAR) {
            fs.mkdirSync(QUOTES_DIR, { recursive: true });
            fs.copyFileSync(origen, destino);
          }
          cuenta('PDF copiados');
        }
      }
    }
    if (cotizaciones.length) await q("SELECT setval(pg_get_serial_sequence('cotizaciones', 'id'), (SELECT MAX(id) FROM cotizaciones))");

    // ── Ajustes: config por proyecto, enlaces y carpetas de documentacion (solo si faltan) ──
    for (const { key, value } of ajustes) {
      if (!(key.startsWith('projectConfig:') || key === 'docUrls' || key === 'docFolders')) {
        cuenta('ajustes omitidos (clave que ya no se usa)');
        continue;
      }
      const json = parsearJson(value);
      if (json === null) {
        cuenta('ajustes ilegibles (omitidos)');
        continue;
      }
      const [r] = await q('INSERT INTO app_settings (key, value) VALUES (:key, CAST(:value AS jsonb)) ON CONFLICT (key) DO NOTHING RETURNING key', { key, value: JSON.stringify(json) });
      cuenta(r.length ? 'ajustes migrados' : 'ajustes ya existentes (no se pisan)');
    }

    console.log('\nResumen:');
    for (const [k, v] of Object.entries(resumen)) console.log(`  ${k}: ${v}`);
    if (sinCuenta.size) {
      console.log(`\nDueños de cotizaciones SIN cuenta de usuario (${sinCuenta.size}); sus cotizaciones se migraron igual y solo las verá un admin hasta que se les cree la cuenta:`);
      [...sinCuenta].sort().forEach((e) => console.log(`  - ${e}`));
    }

    if (!APLICAR) {
      console.log('\nSimulacro: se deshace todo. Para escribir de verdad, agrega --aplicar.');
      throw new Error('__SIMULACRO__');
    }
  });
  console.log('\nListo: migración aplicada.');
}

main()
  .catch((err) => {
    if (err.message !== '__SIMULACRO__') {
      console.error('\nERROR:', err.message);
      process.exitCode = 1;
    }
  })
  .finally(() => sequelize.close());
