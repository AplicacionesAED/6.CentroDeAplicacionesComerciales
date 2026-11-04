// Crea un usuario ADMIN con una contrasena temporal aleatoria (se imprime UNA sola vez y obliga a
// cambiarla en el primer login). Es la forma de crear el primer admin sin dejar ninguna clave en
// el repo. Uso:  node scripts/crearAdmin.js correo@aed.com.co "Nombre Apellido"
require('dotenv').config();
const sequelize = require('../src/config/db');
require('../src/models');
const Usuario = require('../src/modules/usuario/usuario.model');
const { hashPassword } = require('../src/utils/security');
const { generateRandomPassword } = require('../src/utils/passwordRules');

async function main() {
  const [email, nombre] = process.argv.slice(2);
  if (!email || !nombre) {
    console.error('Uso: node scripts/crearAdmin.js correo@aed.com.co "Nombre Apellido"');
    process.exit(1);
  }
  if (await Usuario.findOne({ where: { email: email.toLowerCase() } })) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }
  const password = generateRandomPassword();
  await Usuario.create({
    email,
    nombre,
    hashed_password: await hashPassword(password),
    roles: ['ADMIN'],
    activo: true,
    debe_cambiar_password: true,
  });
  console.log(`Admin creado: ${email.toLowerCase()}\nContraseña temporal (una sola vez): ${password}`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
