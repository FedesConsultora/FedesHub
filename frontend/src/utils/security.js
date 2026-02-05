/**
 * utilidades de seguridad centralizadas para FedesHub
 */

/**
 * Escapa caracteres especiales de HTML para prevenir inyección básica.
 */
export const escapeHtml = (str = '') => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Convierte URLs en enlaces HTML de forma segura.
 * Solo permite protocolos http y https para prevenir ataques javascript: o data:.
 */
export const linkify = (html = '') => {
    if (!html) return '';

    return html.replace(/(https?:\/\/[^\s<>"']+)/g, (url) => {
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return url; // No convertir en link si el protocolo es dudoso
            }

            const safeUrl = encodeURI(url);
            return `<a href="${safeUrl}" target="_blank" rel="noreferrer noopener">${url}</a>`;
        } catch (e) {
            return url; // Si falla el parseo, devolver texto plano
        }
    });
};

/**
 * Procesa texto plano para mostrarlo en dangerouslySetInnerHTML de forma segura.
 * Escapa HTML, añade saltos de línea y aplica linkify.
 */
export const formatSafeHtml = (text = '') => {
    if (!text) return '';
    const escaped = escapeHtml(text).replace(/\n/g, '<br/>');
    return linkify(escaped);
};
