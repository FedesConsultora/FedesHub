// frontend/src/components/tasks/PriorityBoostCheckbox.jsx
import React, { useState } from 'react';
import { FaBolt } from 'react-icons/fa';
import './PriorityBoostCheckbox.scss';

export default function PriorityBoostCheckbox({
    taskId,
    enabled = false,
    onChange,
    disabled = false
}) {
    const [busy, setBusy] = useState(false);

    const handleToggle = async () => {
        if (busy || disabled) return;
        setBusy(true);
        try {
            await onChange(!enabled);
        } catch (e) {
            console.error('Error al cambiar prioridad:', e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <label className={`priorityBoostCheckbox ${enabled ? 'active' : ''} ${busy ? 'busy' : ''}`}>
            <input
                type="checkbox"
                checked={enabled}
                onChange={handleToggle}
                disabled={disabled || busy}
            />
            <FaBolt className="icon" />
            <span className="label">Dar prioridad</span>
        </label>
    );
}
