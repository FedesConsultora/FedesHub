import React from 'react';
import { useFederStatus } from '../../../hooks/useStatus';
import { format, isToday } from 'date-fns';
import { es } from 'date-fns/locale/es';
import './StatusBanner.scss';

export default function StatusBanner({ feder_id, federName }) {
    const { data: status, isLoading } = useFederStatus(feder_id);

    if (isLoading || !status) return null;

    const renderExpiry = () => {
        if (!status.expires_at) return null;
        const date = new Date(status.expires_at);
        const timePart = format(date, 'HH:mm');
        const dayPart = isToday(date) ? 'hoy' : format(date, "eeee 'a las'", { locale: es });
        return <span className="expiry-text"> — hasta {dayPart} {timePart}</span>;
    };

    return (
        <div className={`status-banner ${status.type === 'absence' ? 'is-absence' : ''}`}>
            <span className="emoji">{status.emoji || '💬'}</span>
            <span className="text">
                <span className="name-prefix">{federName || 'Usuario'}: </span>
                {status.text}
                {renderExpiry()}
            </span>
        </div>
    );
}
