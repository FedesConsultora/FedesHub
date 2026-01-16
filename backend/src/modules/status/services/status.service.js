// backend/src/modules/status/services/status.service.js
import * as repo from '../repositories/status.repo.js';

export async function getEffectiveStatus(feder_id) {
    const feder = await repo.getFederWithStatus(feder_id);
    if (!feder) return null;

    // 1. Check for active absences first (Override)
    const activeAbsence = await repo.getActiveAbsence(feder_id);
    if (activeAbsence) {
        const typeMapping = {
            'vacaciones': '☀️',
            'tristeza': '🌧️',
            'examen': '📖',
            'personal': '👤',
            'no_pagado': '❌',
            'cumpleaños': '🎁'
        };
        return {
            type: 'absence',
            emoji: typeMapping[activeAbsence.tipo?.codigo] || '📅',
            text: activeAbsence.tipo?.nombre || 'Ausente',
            is_absence: true
        };
    }

    // Check for expiration
    const now = new Date();
    if (feder.status_expires_at && feder.status_expires_at < now) {
        return null;
    }

    // 2. Check for manual override in Feder record
    if (feder.status_emoji_override || feder.status_text_override) {
        return {
            type: 'override',
            emoji: feder.status_emoji_override || '📍',
            text: feder.status_text_override || '',
            is_absence: false,
            expires_at: feder.status_expires_at
        };
    }

    // 3. Check for custom status from the 10-item list
    if (feder.currentStatusCustom) {
        return {
            type: 'custom',
            emoji: feder.currentStatusCustom.emoji,
            text: feder.currentStatusCustom.texto,
            is_absence: false,
            expires_at: feder.status_expires_at
        };
    }

    // 4. Default: No status
    return null;
}

export async function setStatus(user_id, { custom_id, emoji, text, expires_at }) {
    const updateData = {
        current_status_custom_id: custom_id || null,
        status_emoji_override: emoji || null,
        status_text_override: text || null,
        status_expires_at: expires_at || null
    };
    return await repo.updateFederStatus(user_id, updateData);
}

export async function createCustomStatus(user_id, { emoji, texto }) {
    const count = await repo.countCustomStatuses(user_id);
    if (count >= 10) {
        throw new Error('Límite de 10 estados personalizados alcanzado.');
    }
    return await repo.createCustomStatus({ user_id, emoji, texto });
}
