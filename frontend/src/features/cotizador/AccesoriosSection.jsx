import { Lock, CircleCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import ParkingSelector from './ParkingSelector.jsx';
import styles from './AccesoriosSection.module.css';
// Accesorios Inmobiliarios del paso 1. Bloqueados hasta elegir inmueble (se ofrecen segun su torre). Si hay accesorios
// disponibles, el asesor decide: elige uno o confirma "Sin accesorios". Mientras no decida, la seccion queda pendiente.
export default function AccesoriosSection({
  bloqueado,
  cargando,
  opciones,
  seleccion,
  onSeleccion,
  sinAccesorios,
  onSinAccesorios,
  pendiente,
  aviso,
}) {
  const total = opciones.parking.length + opciones.depositos.length + opciones.cuartosUtiles.length;
  if (bloqueado) {
    return (
      <section className={`${styles.root} ${styles.bloqueado}`} aria-label="Accesorios Inmobiliarios">
        <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h3 className={styles.titulo}>Accesorios Inmobiliarios</h3>
          <p className={styles.nota}>Se habilitan al elegir un inmueble, porque se ofrecen según su torre.</p>
        </div>
      </section>
    );
  }
  if (!cargando && total === 0 && !seleccion.parking && !seleccion.deposito && !seleccion.cuartoUtil) {
    return <p className={styles.vacio}>Este inmueble no tiene accesorios inmobiliarios disponibles para seleccionar.</p>;
  }
  return (
    <section className={`${styles.root} ${pendiente ? styles.pendiente : ''}`} aria-label="Accesorios Inmobiliarios">
      <header className={styles.cabecera}>
        <h3 className={styles.titulo}>Accesorios Inmobiliarios</h3>
        {pendiente && <span className={styles.etiquetaPendiente}>Pendiente: elige uno o confirma «Sin accesorios»</span>}
      </header>

      {aviso && <p className={styles.aviso}>{aviso}</p>}

      {sinAccesorios ? (
        <div className={styles.confirmado}>
          <span className={styles.confirmadoTexto}>
            <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            Sin accesorios: confirmado por el asesor
          </span>
          <Button variant="secondary" onClick={() => onSinAccesorios(false)}>
            Agregar accesorios
          </Button>
        </div>
      ) : (
        <>
          <ParkingSelector parking={opciones.parking} loading={cargando} selected={seleccion.parking} onSelect={(v) => onSeleccion('parking', v)} kind="parqueadero" />
          <ParkingSelector parking={opciones.depositos} loading={cargando} selected={seleccion.deposito} onSelect={(v) => onSeleccion('deposito', v)} kind="deposito" />
          <ParkingSelector parking={opciones.cuartosUtiles} loading={cargando} selected={seleccion.cuartoUtil} onSelect={(v) => onSeleccion('cuartoUtil', v)} kind="cuarto-util" />
          {pendiente && (
            <div className={styles.decision}>
              <Button variant="secondary" onClick={() => onSinAccesorios(true)}>
                Sin accesorios
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
