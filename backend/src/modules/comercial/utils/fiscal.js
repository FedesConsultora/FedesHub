// backend/src/modules/comercial/utils/fiscal.js
import { differenceInMonths } from 'date-fns';

/**
 * Obtiene el mes calendario (1-12) a partir del mes fiscal (1-12) y el mes de inicio (1-12).
 */
export const getCalendarMonth = (fiscalMonth, startMonth) => {
    return ((startMonth - 1 + (fiscalMonth - 1)) % 12) + 1;
};

/**
 * Obtiene el mes fiscal (1-12) a partir del mes calendario (1-12) y el mes de inicio (1-12).
 */
export const getFiscalMonth = (calendarMonth, startMonth) => {
    return ((calendarMonth - startMonth + 12) % 12) + 1;
};

/**
 * Obtiene el trimestre fiscal (1-4) a partir del mes fiscal (1-12).
 */
export const getFiscalQuarter = (fiscalMonth) => {
    return Math.floor((fiscalMonth - 1) / 3) + 1;
};

/**
 * Obtiene los meses calendario (1-12) que componen un trimestre fiscal (1-4).
 */
export const getCalendarMonthsOfQuarter = (q, startMonth) => {
    const m1 = (q - 1) * 3 + 1;
    const m2 = m1 + 1;
    const m3 = m1 + 2;
    return [
        getCalendarMonth(m1, startMonth),
        getCalendarMonth(m2, startMonth),
        getCalendarMonth(m3, startMonth)
    ];
};

/**
 * Calcula el Q fiscal y el mes fiscal actual basado en la fecha de inicio del EECC.
 */
export const getFiscalStatus = (date, startAt) => {
    const startDate = new Date(startAt);
    const startMonth = startDate.getUTCMonth() + 1;

    // Usamos differenceInMonths para saber cuántos meses completos pasaron desde el inicio
    const monthsDiff = differenceInMonths(date, startDate);
    const fiscalMonth = monthsDiff + 1;
    const fiscalQ = getFiscalQuarter(fiscalMonth);

    return { fiscalMonth, fiscalQ, startMonth };
};
