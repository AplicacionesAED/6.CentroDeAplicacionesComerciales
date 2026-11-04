// Secciones del formulario de configuracion por proyecto. Cada una recibe el estado del formulario (`form`) y
// `set(parche)` para actualizarlo; la pagina decide cuando guardar.
import { Plus, X } from 'lucide-react';
import { Field, TextInput, Select } from '../../components/ui/Field.jsx';
import { ThousandsInput } from '../../components/ui/ThousandsInput.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { formatCOP } from '../../utils/format.js';
import { annualToMonthly, nuevoId, tiposDuplicados } from './formulario.js';
import styles from './Configuracion.module.css';

// Cambia un elemento de una lista del formulario por su posicion.
const editar = (lista, idx, parche) => lista.map((x, i) => (i === idx ? { ...x, ...parche } : x));
const quitar = (lista, idx) => lista.filter((_, i) => i !== idx);

function BotonQuitar({ onClick, etiqueta }) {
  return (
    <Button variant="ghost" className={styles.fijo} onClick={onClick} aria-label={etiqueta} title={etiqueta}>
      <X size={16} strokeWidth={1.75} aria-hidden="true" />
    </Button>
  );
}

// Encabezado de un modulo que se enciende o apaga por proyecto.
function CabeceraModulo({ titulo, descripcion, activo, onChange }) {
  return (
    <div className={styles.cardHead}>
      <div>
        <h3 className={styles.cardTitle}>{titulo}</h3>
        <p className={styles.hint}>{descripcion}</p>
      </div>
      <Switch checked={activo} onChange={onChange} label={`${activo ? 'Desactivar' : 'Activar'} ${titulo}`} />
    </div>
  );
}

function Segmentos({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className={styles.segmentos} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" className={`${styles.segmento} ${valor === o.valor ? styles.segmentoActivo : ''}`} aria-pressed={valor === o.valor} onClick={() => onChange(o.valor)}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

export function SeccionProyecto({ form, set }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.cardTitle}>Proyecto inmobiliario</h3>
      <div className={styles.grid}>
        <Field label="Fecha de entrega" helper="Determina el plazo máximo para cuotas estándar.">
          {(p) => <TextInput type="date" value={form.fechaEntrega} onChange={(e) => set({ fechaEntrega: e.target.value })} {...p} />}
        </Field>
      </div>
    </section>
  );
}

export function SeccionFinanciera({ form, set }) {
  const saldoPct = 100 - (Number(form.cuotaInicialPct) || 0);
  return (
    <section className={styles.card}>
      <div>
        <h3 className={styles.cardTitle}>Restricciones financieras</h3>
        <p className={styles.hint}>Cuota mínima y separación aplican a toda cotización (Estándar y Modelador); la tasa de interés solo afecta al Modelador.</p>
      </div>

      <div className={styles.grid}>
        <Field label="Cuota inicial (% del precio)" helper={`El resto (${saldoPct}%) es el saldo contra entrega.`}>
          {(p) => <TextInput type="number" step="0.01" min="1" max="99" value={form.cuotaInicialPct} onChange={(e) => set({ cuotaInicialPct: e.target.value })} {...p} />}
        </Field>
        <Field label="Plazo estándar (meses)" helper="Número de cuotas en Estándar y tope máximo por defecto en Modelador.">
          {(p) => <TextInput type="number" min="1" value={form.cuotasEstandar} onChange={(e) => set({ cuotasEstandar: e.target.value })} {...p} />}
        </Field>
        <Field label="Cuota mensual mínima" helper={`Actual: ${formatCOP(Number(form.minMonthlyQuota))}`}>
          {(p) => <ThousandsInput value={form.minMonthlyQuota} onChange={(e) => set({ minMonthlyQuota: e.target.value })} {...p} />}
        </Field>
        <Field label="Tasa nominal anual (N.A.) fiduciaria" helper="En porcentaje.">
          {(p) => <TextInput type="number" step="0.01" value={form.tasaAnual} onChange={(e) => set({ tasaAnual: e.target.value })} {...p} />}
        </Field>
        <Field label="Tasa efectiva mensual (M.V.)" helper="Calculada desde la tasa anual.">
          {(p) => <TextInput type="number" value={annualToMonthly(Number(form.tasaAnual) || 0)} readOnly disabled {...p} />}
        </Field>
      </div>

      <hr className={styles.divider} />

      <div className={styles.lista}>
        <h4 className={styles.cardTitle}>Separación mínima</h4>
        <Segmentos
          etiqueta="Modo de la separación mínima"
          valor={form.separacionModo}
          onChange={(separacionModo) => set({ separacionModo })}
          opciones={[
            { valor: 'porcentaje', texto: 'Porcentaje' },
            { valor: 'fijo', texto: 'Monto fijo' },
          ]}
        />
        <div className={styles.grid}>
          {form.separacionModo === 'porcentaje' ? (
            <Field label="Porcentaje del precio" helper={`Separación = ${form.separacionPct || 0}% del precio de la unidad, en Estándar y como mínimo en Modelador.`}>
              {(p) => <TextInput type="number" step="0.01" min="0" value={form.separacionPct} onChange={(e) => set({ separacionPct: e.target.value })} {...p} />}
            </Field>
          ) : (
            <Field label="Monto fijo" helper={`Separación = ${formatCOP(Number(form.minSeparation))} fijo, sin importar el precio de la unidad.`}>
              {(p) => <ThousandsInput value={form.minSeparation} onChange={(e) => set({ minSeparation: e.target.value })} {...p} />}
            </Field>
          )}
        </div>
      </div>
    </section>
  );
}

export function SeccionDescuentos({ form, set }) {
  const repetidos = tiposDuplicados(form.descuentos);
  const cambiar = (idx, parche) => set({ descuentos: editar(form.descuentos, idx, parche) });
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h3 className={styles.cardTitle}>Descuentos especiales</h3>
          <p className={styles.hint}>El tipo debe coincidir exactamente con el valor del campo en HubSpot (sensible a mayúsculas).</p>
        </div>
        <Button variant="secondary" onClick={() => set({ descuentos: [...form.descuentos, { tipo: '', porcentaje: 0, incluyeParqueadero: false, modo: 'porcentaje' }] })}>
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          Agregar tipo
        </Button>
      </div>

      {form.descuentos.length === 0 && <p className={styles.vacio}>No hay descuentos configurados.</p>}

      <div className={styles.lista}>
        {form.descuentos.map((d, idx) => (
          <div key={idx} className={styles.item}>
            <Field label="Tipo (valor en HubSpot)" error={repetidos.has(d.tipo.trim()) ? 'Tipo duplicado' : undefined}>
              {(p) => <TextInput placeholder="ej: empleado" value={d.tipo} onChange={(e) => cambiar(idx, { tipo: e.target.value })} invalid={repetidos.has(d.tipo.trim())} {...p} />}
            </Field>
            <div className={styles.fijo}>
              <Segmentos
                etiqueta="Modo del descuento"
                valor={d.modo}
                onChange={(modo) => cambiar(idx, { modo })}
                opciones={[
                  { valor: 'porcentaje', texto: '%' },
                  { valor: 'montoFijo', texto: '$' },
                ]}
              />
            </div>
            <Field label={d.modo === 'porcentaje' ? 'Descuento (%)' : 'Monto fijo'}>
              {(p) =>
                d.modo === 'porcentaje' ? (
                  <TextInput type="number" min="0" max="100" step="0.01" value={d.porcentaje} onChange={(e) => cambiar(idx, { porcentaje: Number(e.target.value) })} {...p} />
                ) : (
                  <ThousandsInput value={d.porcentaje} onChange={(e) => cambiar(idx, { porcentaje: Number(e.target.value) })} {...p} />
                )
              }
            </Field>
            <div className={styles.conmutador}>
              <Switch checked={d.incluyeParqueadero} onChange={(v) => cambiar(idx, { incluyeParqueadero: v })} label="Aplica a parqueadero" />
              <span>Aplica a parqueadero</span>
            </div>
            <BotonQuitar etiqueta="Quitar tipo de descuento" onClick={() => set({ descuentos: quitar(form.descuentos, idx) })} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SeccionSubsidios({ form, set, proyecto }) {
  const smlv = Number(form.smlv);
  const cambiar = (idx, parche) => set({ subsidios: editar(form.subsidios, idx, parche) });
  return (
    <section className={styles.card}>
      <CabeceraModulo
        titulo="Módulo de subsidios"
        descripcion="Apagado por defecto en todos los proyectos. Actívalo solo donde aplique (ej. Alegra, por ser VIS)."
        activo={form.subsidiosEnabled}
        onChange={(v) => set({ subsidiosEnabled: v })}
      />

      {form.subsidiosEnabled && (
        <>
          <hr className={styles.divider} />
          <p className={styles.hint}>
            El subsidio elegible se calcula automáticamente según los ingresos mensuales del contacto (propiedad{' '}
            <span className={styles.mono}>{proyecto === 'Alegra' ? 'ingresos_mensuales_alegra' : 'ingresos_mensuales'}</span> en HubSpot), comparados contra el rango en SMLV de cada subsidio. El asesor puede ajustarlo
            manualmente en el Cotizador si lo necesita.
          </p>

          <div className={styles.grid}>
            <Field label="Valor del SMLV vigente" helper={smlv > 0 ? `Actual: ${formatCOP(smlv)}` : undefined}>
              {(p) => <ThousandsInput placeholder="ej: 1.423.500" value={form.smlv} onChange={(e) => set({ smlv: e.target.value })} {...p} />}
            </Field>
          </div>
          {smlv <= 0 && <p className={styles.alerta}>Sin configurar: los subsidios por rango de SMLV no se podrán calcular hasta que definas este valor.</p>}

          <div className={styles.toolbar}>
            <p className={styles.hint}>Subsidios configurados.</p>
            <Button variant="secondary" onClick={() => set({ subsidios: [...form.subsidios, { id: nuevoId('sub'), nombre: '', monto: 0, aplicaA: 'cuotaInicial', smlvMin: 0, smlvMax: 0 }] })}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Agregar subsidio
            </Button>
          </div>

          {form.subsidios.length === 0 && <p className={styles.vacio}>No hay subsidios configurados.</p>}

          <div className={styles.lista}>
            {form.subsidios.map((sub, idx) => (
              <div key={sub.id} className={styles.item}>
                <Field label="Nombre">{(p) => <TextInput placeholder="ej: Mi Casa Ya" value={sub.nombre} onChange={(e) => cambiar(idx, { nombre: e.target.value })} {...p} />}</Field>
                <Field label="Monto">{(p) => <ThousandsInput value={sub.monto} onChange={(e) => cambiar(idx, { monto: Number(e.target.value) })} {...p} />}</Field>
                <Field label="Aplica a">
                  {(p) => (
                    <Select value={sub.aplicaA} onChange={(e) => cambiar(idx, { aplicaA: e.target.value })} {...p}>
                      <option value="cuotaInicial">Cuota inicial</option>
                      <option value="saldo">Saldo contraentrega</option>
                    </Select>
                  )}
                </Field>
                <Field label="SMLV mínimo">{(p) => <TextInput type="number" min="0" step="0.1" value={sub.smlvMin} onChange={(e) => cambiar(idx, { smlvMin: Number(e.target.value) })} {...p} />}</Field>
                <Field
                  label="SMLV máximo"
                  helper={`Se aplica si el ingreso del contacto está entre ${sub.smlvMin} y ${sub.smlvMax} SMLV${smlv > 0 ? ` (${formatCOP(sub.smlvMin * smlv)} – ${formatCOP(sub.smlvMax * smlv)})` : ''}.`}
                >
                  {(p) => <TextInput type="number" min="0" step="0.1" value={sub.smlvMax} onChange={(e) => cambiar(idx, { smlvMax: Number(e.target.value) })} {...p} />}
                </Field>
                <BotonQuitar etiqueta="Quitar subsidio" onClick={() => set({ subsidios: quitar(form.subsidios, idx) })} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function SeccionAdicionales({ form, set }) {
  const cambiar = (idx, parche) => set({ adicionales: editar(form.adicionales, idx, parche) });
  return (
    <section className={styles.card}>
      <CabeceraModulo
        titulo="Módulo de adicionales"
        descripcion="Apagado por defecto en todos los proyectos. Actívalo solo donde aplique (ej. acabados, aire acondicionado)."
        activo={form.adicionalesEnabled}
        onChange={(v) => set({ adicionalesEnabled: v })}
      />

      {form.adicionalesEnabled && (
        <>
          <hr className={styles.divider} />
          <div className={styles.toolbar}>
            <p className={styles.hint}>En el Cotizador aparecerá un selector múltiple con estos adicionales (Estándar y Modelador). Su monto se suma al precio del inmueble.</p>
            <Button variant="secondary" onClick={() => set({ adicionales: [...form.adicionales, { id: nuevoId('adic'), nombre: '', monto: 0 }] })}>
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Agregar adicional
            </Button>
          </div>

          {form.adicionales.length === 0 && <p className={styles.vacio}>No hay adicionales configurados.</p>}

          <div className={styles.lista}>
            {form.adicionales.map((adi, idx) => (
              <div key={adi.id} className={styles.item}>
                <Field label="Nombre">{(p) => <TextInput placeholder="ej: Acabados" value={adi.nombre} onChange={(e) => cambiar(idx, { nombre: e.target.value })} {...p} />}</Field>
                <Field label="Monto">{(p) => <ThousandsInput value={adi.monto} onChange={(e) => cambiar(idx, { monto: Number(e.target.value) })} {...p} />}</Field>
                <BotonQuitar etiqueta="Quitar adicional" onClick={() => set({ adicionales: quitar(form.adicionales, idx) })} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function SeccionFechasExtraordinarias({ form, set }) {
  return (
    <section className={styles.card}>
      <CabeceraModulo
        titulo="Fechas extraordinarias"
        descripcion="Apagado por defecto en todos los proyectos. Actívalo solo donde aplique."
        activo={form.fechasExtraordinariasEnabled}
        onChange={(v) => set({ fechasExtraordinariasEnabled: v })}
      />

      {form.fechasExtraordinariasEnabled && (
        <>
          <hr className={styles.divider} />
          <p className={styles.hint}>
            Cuando el contacto tiene ingresos mensuales registrados en HubSpot, el Cotizador abona automáticamente un extra a la cuota que caiga en marzo, junio o diciembre de cada año del plan (Estándar y
            Modelador), simulando el ingreso adicional por cesantías y primas:
          </p>
          <div className={styles.tres}>
            <div className={styles.dato}>
              <p className={styles.datoTitulo}>Marzo — Cesantías</p>
              <p className={styles.datoTexto}>+50% del ingreso mensual</p>
            </div>
            <div className={styles.dato}>
              <p className={styles.datoTitulo}>Junio — Prima</p>
              <p className={styles.datoTexto}>+25% del ingreso mensual</p>
            </div>
            <div className={styles.dato}>
              <p className={styles.datoTitulo}>Diciembre — Prima</p>
              <p className={styles.datoTexto}>+25% del ingreso mensual</p>
            </div>
          </div>
          <p className={styles.hint}>Estos porcentajes están fijados por ley (cesantías = 1 sueldo al año, prima = medio sueldo cada semestre) y no son editables aquí.</p>
        </>
      )}
    </section>
  );
}
