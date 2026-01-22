/**
 * Parses a string amount using Argentine/Spanish locale rules:
 * - Dots (.) are treated as thousand separators and removed.
 * - Commas (,) are treated as decimal separators and replaced with dots.
 * @param {string|number} val 
 * @returns {number}
 */
export const parseLocaleAmount = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;

    let str = val.toString().trim();

    // If there's a comma AND a dot, we assume dot is thousand and comma is decimal
    // If there's ONLY a dot, and it's followed by 3 digits (e.g. 1.000), it's probably a thousand separator.
    // However, to be consistent with es-AR locale, we always:
    // 1. Remove all dots
    // 2. Replace comma with dot
    // 3. Parse

    const clean = str
        .replace(/\./g, '')
        .replace(',', '.');

    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Strips characters that aren't digits, commas or dots.
 * Allows multiple dots if they are thousand separators.
 */
export const cleanPriceInput = (val) => {
    return val.replace(/[^0-9,.]/g, '');
};
