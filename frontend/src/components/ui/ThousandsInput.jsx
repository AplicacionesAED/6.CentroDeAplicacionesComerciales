import { useEffect, useRef, useState } from 'react';
import styles from './Field.module.css';

// Las columnas NUMERIC de Postgres llegan como string con 2 decimales fijos
// (ej. "1931058.00", el salario real es 1.931.058). Sin cortar en el punto
// antes de quitar lo que no sea digito, el ".00" se pegaba como si fueran
// mas digitos ("1931058" + "00" = "193105800") e inflaba la cifra x100 en
// pantalla -- no se guardaba mal (el submit usa el valor real, no lo que se
// ve), pero se veia mal, y si alguien editaba el campo sin notarlo terminaba
// guardando la cifra inflada de verdad. Cortar en el primer "." antes de
// limpiar evita las dos cosas.
function soloDigitos(value) {
  const parteEntera = String(value ?? '').split('.')[0];
  return parteEntera.replace(/\D/g, '');
}

function conPuntosDeMiles(digitos) {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Input numerico agrupado de a miles con puntos (dinero, cedulas, cualquier
// numero largo que se lea mejor agrupado) -- `type="number"` no puede
// mostrar separadores de miles (limitacion nativa del navegador, no del
// codigo), asi que este es un `<input type="text">` que formatea con puntos
// mientras se escribe y mantiene la posicion del cursor. Expone el mismo
// contrato que `TextInput` (`onChange` recibe un evento con `target.value` =
// solo digitos, sin puntos) para no tener que tocar los manejadores que ya
// existian (`onChange={(e) => setField('x', e.target.value)}`).
export function ThousandsInput({ className = '', invalid, value, onChange, ...props }) {
  const inputRef = useRef(null);
  const [display, setDisplay] = useState(conPuntosDeMiles(soloDigitos(value)));

  // Sincroniza si `value` cambia desde afuera (carga de datos, reset de
  // formulario) y no por el propio onChange de este input.
  useEffect(() => {
    setDisplay(conPuntosDeMiles(soloDigitos(value)));
  }, [value]);

  function handleChange(event) {
    const input = event.target;
    const cursorPos = input.selectionStart ?? input.value.length;
    const digitosAntesDelCursor = soloDigitos(input.value.slice(0, cursorPos)).length;

    const digitos = soloDigitos(input.value);
    const formateado = conPuntosDeMiles(digitos);
    setDisplay(formateado);
    // Los `onChange` que ya existian en el proyecto solo leen `e.target.value`
    // (nunca `preventDefault` ni otros metodos del evento), asi que un objeto
    // minimo alcanza -- no hace falta reconstruir el SyntheticEvent completo.
    onChange?.({ target: { value: digitos } });

    // Reubica el cursor tras el re-render: cuenta la misma cantidad de
    // digitos desde el inicio del string ya formateado (los puntos nuevos no
    // deben "empujar" el cursor hacia atras mientras se escribe).
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let vistos = 0;
      let pos = formateado.length;
      for (let i = 0; i < formateado.length; i++) {
        if (/\d/.test(formateado[i])) vistos++;
        if (vistos === digitosAntesDelCursor) {
          pos = i + 1;
          break;
        }
      }
      if (digitosAntesDelCursor === 0) pos = 0;
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={`${styles.control} ${invalid ? styles.invalid : ''} ${className}`}
      value={display}
      onChange={handleChange}
      {...props}
    />
  );
}
