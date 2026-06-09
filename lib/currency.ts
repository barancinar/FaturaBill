import { getCachedRates, convertCurrency } from './settingsStore';

export { convertCurrency };

/**
 * Returns a user-friendly exchange rate string relative to the active preferred currency.
 *
 * @param preferredCurrency - The global preferred currency ('TRY', 'USD', 'EUR')
 * @returns A formatted string displaying active conversion rates
 */
export function getDisplayRates(preferredCurrency: 'TRY' | 'USD' | 'EUR'): string {
  const rates = getCachedRates();
  
  const getRate = (from: string, to: string): number => {
    const rateFrom = rates[from.toUpperCase()] || 1.0;
    const rateTo = rates[to.toUpperCase()] || 1.0;
    return (1 / rateFrom) * rateTo;
  };

  if (preferredCurrency === 'TRY') {
    return `1 USD = ${getRate('USD', 'TRY').toFixed(2)} TRY  •  1 EUR = ${getRate('EUR', 'TRY').toFixed(2)} TRY`;
  } else if (preferredCurrency === 'USD') {
    return `1 EUR = ${getRate('EUR', 'USD').toFixed(2)} USD  •  1 TRY = ${getRate('TRY', 'USD').toFixed(4)} USD`;
  } else {
    return `1 USD = ${getRate('USD', 'EUR').toFixed(2)} EUR  •  1 TRY = ${getRate('TRY', 'EUR').toFixed(4)} EUR`;
  }
}
