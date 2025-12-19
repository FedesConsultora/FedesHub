/**
 * Detects if a hex color is light or dark.
 * Returns '#000000' for light colors and '#FFFFFF' for dark colors.
 */
export function getContrastColor(hexColor) {
    if (!hexColor || hexColor.length < 6) return '#FFFFFF';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
}

/**
 * Extracts initials from a name, ignoring leading numbers (e.g., "001 - Fedes" -> "FC").
 */
export function getCleanInitials(name) {
    if (!name) return 'C';

    // Remove leading numbers, spaces, and common separators: e.g., "001 - Fedes" -> "Fedes"
    // This regex matches things like "001 - ", "01. ", etc. at the start.
    const cleanName = name.replace(/^[\d\s\-_.]+/, '').trim();
    if (!cleanName) return name.charAt(0).toUpperCase();

    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

    // Take first char of first two words
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
