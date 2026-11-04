import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useExchangeRate } from '../hooks/useExchangeRate.js';
import { formatCOP, formatUSD } from '../utils/format.js';
const CurrencyContext = createContext(null);
export function CurrencyProvider({ children }) {
  const [isUSD, setIsUSD] = useState(false);
  const { rate, loading: rateLoading, error: rateError } = useExchangeRate();
  const toggleCurrency = useCallback(() => {
    setIsUSD((prev) => !prev);
  }, []);
  const formatPrice = useCallback(
    (value) => {
      if (isUSD && rate) {
        return formatUSD(value / rate);
      }
      return formatCOP(value);
    },
    [isUSD, rate]
  );
  const contextValue = useMemo(
    () => ({
      isUSD,
      toggleCurrency,
      formatPrice,
      exchangeRate: rate,
      rateLoading,
      rateError,
    }),
    [isUSD, toggleCurrency, formatPrice, rate, rateLoading, rateError]
  );
  return <CurrencyContext.Provider value={contextValue}>{children}</CurrencyContext.Provider>;
}
export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used inside <CurrencyProvider>');
  }
  return ctx;
}
