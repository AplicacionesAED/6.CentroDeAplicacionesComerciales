// Gestion de usuarios, roles y proyectos asignados (solo administradores) y exportacion de planes de pago.
import client from './client.js';

export async function fetchUsuarios() {
  const { data } = await client.get('/usuarios');
  return data;
}

export async function fetchRoles() {
  const { data } = await client.get('/usuarios/roles');
  return data;
}

// Devuelve { usuario, password }: la contrasena temporal solo se entrega esta vez.
export async function crearUsuario(datos) {
  const { data } = await client.post('/usuarios', datos);
  return data;
}

export async function actualizarUsuario(id, cambios) {
  const { data } = await client.patch(`/usuarios/${id}`, cambios);
  return data;
}

export async function regenerarPassword(id) {
  const { data } = await client.post(`/usuarios/${id}/regenerar-password`);
  return data.password;
}

// Reemplaza los proyectos del asesor. [] = sin restriccion (ve todos).
export async function asignarProyectos(usuarioId, projects) {
  await client.put(`/asesores/${usuarioId}`, { projects });
}

// { count, quotes } con todas las cotizaciones y su plan de pagos.
export async function exportarPlanesDePago() {
  const { data } = await client.get('/cotizaciones/export/payment-plans');
  return data;
}
