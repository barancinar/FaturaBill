/**
 * Safely parses any CSS color string (Hex, HSL, RGB, or named colors) and returns an RGBA string with the given opacity.
 * If the input is not a recognized format, it falls back to the original color.
 */
export const getAlphaColor = (color: string | undefined | null, opacity: number): string => {
  if (!color) return `rgba(0, 0, 0, ${opacity})`;

  const trimmed = color.trim().toLowerCase();

  // 1. Hex Colors (e.g., #fff, #1db954, #1db954ff)
  if (trimmed.startsWith('#')) {
    let cleanHex = trimmed.slice(1);
    
    // If it has alpha channel already (8 characters), remove it to apply custom opacity
    if (cleanHex.length === 8) {
      cleanHex = cleanHex.slice(0, 6);
    }
    
    // 3-character hex (e.g., f00 -> ff0000)
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
  }

  // 2. HSL Colors (e.g., hsl(120, 100%, 50%))
  if (trimmed.startsWith('hsl')) {
    const match = trimmed.match(/hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/);
    if (match) {
      const h = parseFloat(match[1]);
      const s = parseFloat(match[2]);
      const l = parseFloat(match[3]);
      
      const sFraction = s / 100;
      const lFraction = l / 100;
      const c = (1 - Math.abs(2 * lFraction - 1)) * sFraction;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = lFraction - c / 2;
      
      let r = 0, g = 0, b = 0;
      if (0 <= h && h < 60) { r = c; g = x; b = 0; }
      else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
      else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
      else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
      else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
      else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
      
      const rVal = Math.round((r + m) * 255);
      const gVal = Math.round((g + m) * 255);
      const bVal = Math.round((b + m) * 255);
      
      return `rgba(${rVal}, ${gVal}, ${bVal}, ${opacity})`;
    }
  }

  // 3. RGB Colors (e.g., rgb(255, 0, 0) or rgba(255, 0, 0, 0.5))
  if (trimmed.startsWith('rgb')) {
    const match = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
    }
  }

  // 4. Standard CSS color names fallback map (for safe-guarding basic colors)
  const nameToHex: Record<string, string> = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    black: '#000000',
    white: '#ffffff',
    gray: '#808080',
    grey: '#808080',
    purple: '#800080',
    orange: '#ffa500',
    pink: '#ffc0cb'
  };

  if (nameToHex[trimmed]) {
    return getAlphaColor(nameToHex[trimmed], opacity);
  }

  // Fallback: If we couldn't parse the color, return it as is.
  return color;
};
