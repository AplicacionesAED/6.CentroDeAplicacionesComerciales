// Usuarios de la app: los da de alta un administrador (nadie entra sin que lo hayan creado), con sus roles y los
// proyectos a los que queda restringido. Sin proyectos asignados el asesor ve todos.
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Field, TextInput } from '../../components/ui/Field.jsx';
import { CheckboxGroup } from '../../components/ui/CheckboxGroup.jsx';
import { EditIconButton, ToggleActivoIconButton } from '../../components/ui/RowIconButtons.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { fetchUsuarios, fetchRoles, crearUsuario, actualizarUsuario, regenerarPassword, asignarProyectos } from '../../api/usuarios.js';
import styles from './Configuracion.module.css';

const VACIO = { id: null, email: '', nombre: '', roles: [], proyectos: [] };

const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca');

export function AsesoresSection() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(null); // objeto del formulario, o null con el modal cerrado
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [clave, setClave] = useState(null); // { email, password }: se muestra una sola vez

  const cargar = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([fetchUsuarios(), fetchRoles()]);
      setUsuarios(u);
      setRoles(r);
      setError(null);
    } catch (e) {
      setError(e.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrir = (u) => {
    setErrorForm(null);
    setEditando(u ? { id: u.id, email: u.email, nombre: u.nombre, roles: u.roles, proyectos: u.proyectos } : { ...VACIO, roles: roles.filter((r) => !r.esAdmin).slice(0, 1).map((r) => r.nombre) });
  };
  const cerrar = () => setEditando(null);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setErrorForm(null);
    try {
      if (editando.id === null) {
        const { usuario, password } = await crearUsuario({ email: editando.email, nombre: editando.nombre, roles: editando.roles });
        if (editando.proyectos.length) await asignarProyectos(usuario.id, editando.proyectos);
        setClave({ email: usuario.email, password });
      } else {
        await actualizarUsuario(editando.id, { nombre: editando.nombre, roles: editando.roles });
        await asignarProyectos(editando.id, editando.proyectos);
      }
      cerrar();
      await cargar();
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function nuevaClave() {
    if (!window.confirm('Se generará una contraseña temporal y la actual dejará de servir. ¿Continuar?')) return;
    try {
      const password = await regenerarPassword(editando.id);
      setClave({ email: editando.email, password });
      cerrar();
    } catch (err) {
      setErrorForm(err.message);
    }
  }

  async function alternarActivo(u) {
    try {
      await actualizarUsuario(u.id, { activo: !u.activo });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  const opcionesRol = roles.map((r) => ({ value: r.nombre, label: r.esAdmin ? `${r.nombre} (acceso total)` : r.nombre }));
  const opcionesProyecto = PROJECTS.map((p) => ({ value: p, label: p }));

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>Usuarios y asesores</h3>
          <p className={styles.hint}>Solo entra quien está en esta lista. Un asesor sin proyectos asignados ve todos los proyectos.</p>
        </div>
        <Button onClick={() => abrir(null)} disabled={cargando || roles.length === 0}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {cargando && <p className={styles.vacio}>Cargando…</p>}

      {!cargando && (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Roles</th>
                <th>Proyectos</th>
                <th>Último acceso</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.persona}>
                      <strong>{u.nombre}</strong>
                      <span className={styles.personaCorreo}>{u.email}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.chips}>
                      {u.roles.map((r) => (
                        <Badge key={r} variant="info">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td>{u.proyectos.length ? u.proyectos.join(', ') : 'Todos'}</td>
                  <td>{fechaCorta(u.ultima_conexion)}</td>
                  <td>
                    <Badge variant={u.activo ? 'success' : 'neutral'} dot={u.activo}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <EditIconButton label={`Editar ${u.nombre}`} onClick={() => abrir(u)} />
                      <ToggleActivoIconButton
                        activo={u.activo}
                        labelActivar={`Activar ${u.nombre}`}
                        labelInactivar={`Inactivar ${u.nombre}`}
                        disabled={u.id === yo?.id}
                        onClick={() => alternarActivo(u)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editando !== null}
        onClose={cerrar}
        title={editando?.id === null ? 'Nuevo usuario' : 'Editar usuario'}
        footer={
          <>
            {editando?.id !== null && editando && (
              <Button variant="secondary" onClick={nuevaClave}>
                Generar contraseña temporal
              </Button>
            )}
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" form="form-usuario" disabled={guardando || !editando?.roles.length}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {editando && (
          <form id="form-usuario" className={styles.modalForm} onSubmit={guardar}>
            <Field label="Nombre" required>
              {(p) => <TextInput value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required {...p} />}
            </Field>
            <Field label="Correo" required helper={editando.id === null ? 'Con este correo entra con contraseña, Microsoft o HubSpot.' : 'El correo no se puede cambiar.'}>
              {(p) => <TextInput type="email" value={editando.email} onChange={(e) => setEditando({ ...editando, email: e.target.value })} disabled={editando.id !== null} required {...p} />}
            </Field>
            <CheckboxGroup label="Roles" options={opcionesRol} value={editando.roles} onChange={(r) => setEditando({ ...editando, roles: r })} />
            <CheckboxGroup
              label="Proyectos"
              hint="Sin ninguno marcado, el asesor ve todos los proyectos."
              options={opcionesProyecto}
              value={editando.proyectos}
              onChange={(p) => setEditando({ ...editando, proyectos: p })}
            />
            {errorForm && (
              <p className={styles.error} role="alert">
                {errorForm}
              </p>
            )}
          </form>
        )}
      </Modal>

      <Modal open={clave !== null} onClose={() => setClave(null)} title="Contraseña temporal" footer={<Button onClick={() => setClave(null)}>Listo</Button>}>
        {clave && (
          <div className={styles.modalForm}>
            <p>
              Entrégale esta contraseña a <strong>{clave.email}</strong>. Solo se muestra ahora y tendrá que cambiarla al entrar. Si usa Microsoft o HubSpot no la necesita.
            </p>
            <code className={styles.clave}>{clave.password}</code>
          </div>
        )}
      </Modal>
    </section>
  );
}
