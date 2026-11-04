// Configuracion del Centro (solo administradores): parametros financieros por proyecto y usuarios.
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { useAppConfig } from '../../context/AppConfigContext.jsx';
import { PROJECTS } from '../../utils/cotizador.js';
import { exportarPlanesDePago } from '../../api/usuarios.js';
import { aFormulario, aConfig, tiposDuplicados } from './formulario.js';
import { SeccionProyecto, SeccionFinanciera, SeccionDescuentos, SeccionSubsidios, SeccionAdicionales, SeccionFechasExtraordinarias } from './SeccionesProyecto.jsx';
import { AsesoresSection } from './AsesoresSection.jsx';
import styles from './Configuracion.module.css';

// Pestanas con formulario (por proyecto, comparten la barra de guardado) y pestanas propias.
const PESTANAS = [
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'financiero', label: 'Financiero' },
  { key: 'descuentos', label: 'Descuentos' },
  { key: 'subsidios', label: 'Subsidios' },
  { key: 'adicionales', label: 'Adicionales' },
  { key: 'fechas', label: 'Fechas extraordinarias' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'exportar', label: 'Exportar' },
];
const CON_FORMULARIO = new Set(['proyecto', 'financiero', 'descuentos', 'subsidios', 'adicionales', 'fechas']);

function SeccionExportar() {
  const [estado, setEstado] = useState('idle'); // idle | cargando | error
  async function descargar() {
    setEstado('cargando');
    try {
      const datos = await exportarPlanesDePago();
      const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `planes-de-pago-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setEstado('idle');
    } catch {
      setEstado('error');
    }
  }
  return (
    <section className={styles.card}>
      <div>
        <h3 className={styles.cardTitle}>Exportar planes de pago</h3>
        <p className={styles.hint}>Descarga un JSON con todas las cotizaciones y su plan de pagos (negocio, estado, fecha, cuotas), para analizarlo con una herramienta externa.</p>
      </div>
      <div>
        <Button onClick={descargar} disabled={estado === 'cargando'}>
          {estado === 'cargando' ? 'Preparando…' : 'Descargar JSON'}
        </Button>
      </div>
      {estado === 'error' && (
        <p className={styles.error} role="alert">
          No se pudo exportar. Intenta de nuevo.
        </p>
      )}
    </section>
  );
}

export default function ConfiguracionPage() {
  const { config, updateConfig, setActiveProject } = useAppConfig();
  const [pestana, setPestana] = useState('proyecto');
  const [proyecto, setProyecto] = useState('Oliv');
  const [form, setForm] = useState(() => aFormulario(config));
  const [guardado, setGuardado] = useState(false);

  // Todo lo que sigue lee y escribe la configuracion del proyecto elegido.
  useEffect(() => {
    setActiveProject(proyecto);
  }, [proyecto, setActiveProject]);

  // Resincroniza el formulario al cambiar de proyecto o al llegar la configuracion del servidor.
  useEffect(() => {
    setForm(aFormulario(config));
  }, [config]);

  const set = (parche) => setForm((f) => ({ ...f, ...parche }));
  const hayDuplicados = tiposDuplicados(form.descuentos).size > 0;

  function guardar(e) {
    e.preventDefault();
    updateConfig(aConfig(form));
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  }

  const conFormulario = CON_FORMULARIO.has(pestana);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>Ajustes financieros por proyecto, módulos opcionales y usuarios.</p>
      </header>

      <Tabs tabs={PESTANAS} value={pestana} onChange={setPestana} ariaLabel="Secciones de configuración" />

      {conFormulario && (
        <div className={styles.proyectos}>
          <span className={styles.proyectosLabel}>Proyecto</span>
          {PROJECTS.map((p) => (
            <Button key={p} variant={p === proyecto ? 'primary' : 'secondary'} aria-pressed={p === proyecto} onClick={() => setProyecto(p)}>
              {p}
            </Button>
          ))}
        </div>
      )}

      {conFormulario && (
        <form onSubmit={guardar} className={styles.formulario}>
          {pestana === 'proyecto' && <SeccionProyecto form={form} set={set} />}
          {pestana === 'financiero' && <SeccionFinanciera form={form} set={set} />}
          {pestana === 'descuentos' && <SeccionDescuentos form={form} set={set} />}
          {pestana === 'subsidios' && <SeccionSubsidios form={form} set={set} proyecto={proyecto} />}
          {pestana === 'adicionales' && <SeccionAdicionales form={form} set={set} />}
          {pestana === 'fechas' && <SeccionFechasExtraordinarias form={form} set={set} />}

          <div className={styles.guardar}>
            <span className={styles.guardado} role="status">
              {guardado ? 'Configuración guardada' : hayDuplicados ? '' : 'Estos valores afectan a todas las cotizaciones nuevas del proyecto.'}
            </span>
            <Button type="submit" disabled={hayDuplicados}>
              Guardar cambios
            </Button>
          </div>
        </form>
      )}

      {pestana === 'usuarios' && <AsesoresSection />}
      {pestana === 'exportar' && <SeccionExportar />}
    </div>
  );
}
