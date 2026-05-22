import dayjs from "dayjs";

/**
 * Formats a numeric value or string representation of a number as standard U.S. money.
 * Uses Intl.NumberFormat with the 'en-US' locale by default.
 * In case of failure or invalid values, falls back to standard '$' formatting.
 *
 * @param value - The value to format (number or string representation of a number)
 * @param currency - The currency code (e.g., 'USD', 'EUR', 'TRY'), defaults to 'USD'
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string,
  currency: string = 'USD'
): string {
  try {
    const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) {
      return '$0.00';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parsedValue);
  } catch (error) {
    const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
    if (parsedValue === null || parsedValue === undefined || isNaN(parsedValue)) {
      return '$0.00';
    }

    // Standard U.S. money fallback with exactly two decimal places
    return `$${parsedValue.toFixed(2)}`;
  }
}

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate.format("MM/DD/YYYY") : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};
