import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Car, Check, ChevronDown, DoorClosed, Package, X } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import styles from './ParkingSelector.module.css';
function formatFull(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
}
const KIND_META = {
  parqueadero: { Icon: Car, label: 'Parqueadero', labelLower: 'parqueadero', labelPlural: 'parqueaderos' },
  deposito: { Icon: Package, label: 'Depósito', labelLower: 'depósito', labelPlural: 'depósitos' },
  'cuarto-util': { Icon: DoorClosed, label: 'Cuarto útil', labelLower: 'cuarto útil', labelPlural: 'cuartos útiles' },
};
export default function ParkingSelector({ parking, loading, selected, onSelect, kind = 'parqueadero' }) {
  const { Icon, label, labelLower, labelPlural } = KIND_META[kind];
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);
  const updatePosition = () => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };
  useEffect(() => {
    if (open) updatePosition();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const target = e.target;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target)) return;
      updatePosition();
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);
  const handleSelect = (spot) => {
    onSelect(spot.id === selected?.id ? null : spot);
    setOpen(false);
  };
  const isDisabled = loading || (!loading && parking.length === 0);
  // El desplegable se monta en document.body (fuera de `.aed-chrome`), por eso lleva su propia clase de tokens.
  const dropdown =
    open &&
    parking.length > 0 &&
    createPortal(
      <div ref={dropdownRef} className={`aed-chrome ${styles.dropdown}`} style={dropdownStyle}>
        <div className={`${styles.fila} ${styles.encabezado}`}>
          <span className={styles.colNombre}>{label}</span>
          <span className={styles.colValor}>Valor</span>
          <span className={styles.colCheck} />
        </div>

        <div className={styles.lista}>
          {[...parking]
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((spot) => {
              const isSelected = selected?.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => handleSelect(spot)}
                  className={`${styles.fila} ${styles.opcion} ${isSelected ? styles.opcionActiva : ''}`}
                >
                  <span className={styles.colNombre}>
                    <span className={styles.nombre}>{spot.name}</span>
                    {spot.reservedByThisDeal ? (
                      <span className={`${styles.estado} ${styles.estadoOk}`}>Ya reservado para este negocio</span>
                    ) : spot.status ? (
                      <span className={styles.estado}>{spot.status}</span>
                    ) : null}
                  </span>
                  <span className={styles.colValor}>+ {formatFull(spot.price)}</span>
                  <span className={styles.colCheck}>{isSelected && <Check size={14} strokeWidth={2} aria-hidden="true" />}</span>
                </button>
              );
            })}
        </div>

        <div className={styles.pie}>
          <span>El valor se suma antes del bono</span>
          {selected && (
            <button
              type="button"
              className={styles.quitar}
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
            >
              Quitar selección
            </button>
          )}
        </div>
      </div>,
      document.body
    );
  const vacio = parking.length === 0 || loading;
  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>

      <div ref={wrapperRef} className={`${styles.caja} ${selected ? styles.cajaActiva : vacio ? styles.cajaVacia : ''}`}>
        <span className={`${styles.icono} ${selected ? styles.iconoActivo : ''}`}>
          <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        </span>

        <div className={styles.contenido}>
          {loading ? (
            <span className={styles.cargando}>
              <span className={styles.spinner} aria-hidden="true" />
              Cargando {labelPlural}…
            </span>
          ) : selected ? (
            <>
              <span className={styles.seleccionado}>{selected.name}</span>
              <span className={styles.precio}>{formatFull(selected.price)}</span>
            </>
          ) : parking.length === 0 ? (
            <span className={styles.sin}>Sin {labelPlural} disponibles</span>
          ) : (
            <span className={styles.agregar}>
              Agregar {labelLower} <span className={styles.disp}>({parking.length} disp.)</span>
            </span>
          )}
        </div>

        <div className={styles.acciones}>
          {selected && (
            <button
              type="button"
              className={styles.quitarIcono}
              onClick={() => onSelect(null)}
              title={`Quitar ${labelLower}`}
              aria-label={`Quitar ${labelLower}`}
            >
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}

          {!isDisabled && (
            <Button variant={selected ? 'secondary' : 'primary'} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {selected ? 'Cambiar' : 'Agregar'}
              <ChevronDown className={open ? styles.chevronAbierto : ''} size={14} strokeWidth={2} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {dropdown}
    </div>
  );
}
