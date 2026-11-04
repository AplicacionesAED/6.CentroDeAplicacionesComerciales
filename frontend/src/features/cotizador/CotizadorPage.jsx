import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useUserDeals } from '../../hooks/useUserDeals.js';
import { useUnits } from '../../hooks/useUnits.js';
import { useAvailableUnits } from '../../hooks/useAvailableUnits.js';
import { useDeal } from '../../hooks/useDeal.js';
import DealSelectionTable from './DealSelectionTable.jsx';
import CotizadorForm from './CotizadorForm.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { CurrencyProvider, useCurrency } from '../../context/CurrencyContext.jsx';
import styles from './CotizadorPage.module.css';
// ─── Banderas (SVG propio, no emoji) ───────────────────────────────────────
// Windows/Chrome no trae glifos de color para los emoji de bandera regional
// (🇨🇴/🇺🇸 renderizan como texto plano o en blanco y negro) — se dibujan a
// mano con SVG para que se vean siempre, sin depender de la fuente del SO.
function FlagCO() {
  return (
    <svg viewBox="0 0 24 16" className={styles.bandera}>
      <rect width="24" height="16" fill="#FCD116" />
      <rect y="8" width="24" height="4" fill="#003893" />
      <rect y="12" width="24" height="4" fill="#CE1126" />
    </svg>
  );
}
function FlagUS() {
  return (
    <svg viewBox="0 0 24 16" className={styles.bandera}>
      <rect width="24" height="16" fill="#fff" />
      <rect y="0" width="24" height="2" fill="#B22234" />
      <rect y="4" width="24" height="2" fill="#B22234" />
      <rect y="8" width="24" height="2" fill="#B22234" />
      <rect y="12" width="24" height="2" fill="#B22234" />
      <rect width="10" height="8" fill="#3C3B6E" />
    </svg>
  );
}
// ─── Selector de moneda compacto (banderas) ───────────────────────────────
// Antes era una barra propia arriba de la columna izquierda del cotizador,
// ocupando una línea entera para algo que casi no se usa — se movió acá,
// al extremo derecho de la línea de "Cambiar negocio", para no robarle
// espacio al cotizador en sí.
function CurrencyFlagToggle() {
  const { isUSD, toggleCurrency, exchangeRate, rateLoading, rateError } = useCurrency();
  const usdTitle = rateLoading
    ? 'Cargando tasa…'
    : rateError
      ? rateError
      : exchangeRate
        ? `1 USD = ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(exchangeRate)} COP`
        : 'Ver precios en USD';
  return (
    <div className={styles.moneda}>
      <button
        type="button"
        onClick={() => {
          if (isUSD) toggleCurrency();
        }}
        title="Ver precios en COP"
        className={`${styles.monedaBtn} ${!isUSD ? styles.monedaActiva : ''}`}
      >
        <FlagCO /> COP
      </button>
      <button
        type="button"
        onClick={() => {
          if (!isUSD) toggleCurrency();
        }}
        title={usdTitle}
        className={`${styles.monedaBtn} ${isUSD ? styles.monedaActiva : ''}`}
      >
        <FlagUS /> USD
      </button>
    </div>
  );
}
export default function CotizadorPage() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const selectedDeal = dealId ? { id: dealId } : null;
  const { deals, loading: dealsLoading, error: dealsError, refresh: refreshDeals } = useUserDeals();
  // Load the full deal (needed for its proyecto_inmobiliario_cac, to scope units)
  const { deal, loading: dealLoading } = useDeal(selectedDeal?.id ?? null);
  // Fetch associated units when a deal is selected
  const { units: associatedUnits, loading: unitsLoading } = useUnits(selectedDeal?.id ?? null);
  // Fetch all available units for the deal's project
  const { units: availableUnits, loading: availableLoading, refresh: refreshAvailable } = useAvailableUnits(deal?.proyecto_inmobiliario_cac ?? null);
  // ─── Step 1: Deal Selection ───
  if (!selectedDeal) {
    return (
      <div className={`aed-chrome ${styles.root}`}>
        <DealSelectionTable deals={deals} loading={dealsLoading} error={dealsError} onSelect={(d) => navigate(`/cotizador/${d.id}`)} onRefresh={refreshDeals} />
      </div>
    );
  }
  // ─── Step 2: Cotizador Form ───
  // Loading deal or associated units
  if (unitsLoading || dealLoading) {
    return (
      <div className={`aed-chrome ${styles.root}`}>
        <div className={styles.cargando} role="status">
          <div className={styles.spinner} />
          <p>Cargando unidades del negocio…</p>
        </div>
      </div>
    );
  }
  return (
    <CurrencyProvider>
      <div className={`aed-chrome ${styles.root}`}>
        {/* Volver a la izquierda, selector de moneda al extremo derecho */}
        <div className={styles.barra}>
          <Button variant="ghost" onClick={() => navigate('/cotizador')}>
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Cambiar negocio
          </Button>
          <CurrencyFlagToggle />
        </div>

        <CotizadorForm
          dealId={selectedDeal.id}
          deal={deal}
          dealLoading={dealLoading}
          associatedUnits={associatedUnits}
          availableUnits={availableUnits}
          availableLoading={availableLoading}
          onRefreshAvailable={refreshAvailable}
        />
      </div>
    </CurrencyProvider>
  );
}
