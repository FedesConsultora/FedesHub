import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiPlus, FiTrash2, FiCheck, FiSmile, FiClock } from 'react-icons/fi';
import { useCustomStatuses, useManageCustomStatuses, useSetStatus } from '../../../hooks/useStatus';
import EmojiPicker from '../../common/EmojiPicker.jsx';
import './StatusPicker.scss';

const EXPIRY_OPTIONS = [
    { label: 'No limpiar', value: null },
    { label: '30 minutos', value: 30 },
    { label: '1 hora', value: 60 },
    { label: 'Hoy', value: 'today' },
    { label: 'Esta semana', value: 'week' },
];

export default function StatusPicker({ onClose }) {
    const { data: custom = [], isLoading } = useCustomStatuses();
    const { add, remove } = useManageCustomStatuses();
    const setStatus = useSetStatus();

    const [newEmoji, setNewEmoji] = useState('💬');
    const [newText, setNewText] = useState('');
    const [expiry, setExpiry] = useState(null); // value in minutes or special string
    const [showAdd, setShowAdd] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Block scroll and ESC key
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.() };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const calculateExpiryDate = (val) => {
        if (!val) return null;
        const d = new Date();
        if (typeof val === 'number') {
            d.setMinutes(d.getMinutes() + val);
        } else if (val === 'today') {
            d.setHours(23, 59, 59, 999);
        } else if (val === 'week') {
            // End of week (Sunday 23:59:59)
            const day = d.getDay();
            const diff = 7 - (day === 0 ? 7 : day); // days to next sunday
            d.setDate(d.getDate() + diff);
            d.setHours(23, 59, 59, 999);
        }
        return d;
    };

    const handleSetStatus = async (s) => {
        const expires_at = calculateExpiryDate(expiry);
        await setStatus.mutateAsync({
            custom_id: s?.id || null,
            emoji: s?.emoji || null,
            text: s?.texto || null,
            expires_at
        });
        onClose();
    };

    const clearStatus = async () => {
        await setStatus.mutateAsync({ custom_id: null, emoji: null, text: null, expires_at: null });
        onClose();
    };

    const handleAddCustom = async (e) => {
        e.preventDefault();
        if (!newText.trim()) return;
        try {
            await add.mutateAsync({ emoji: newEmoji, texto: newText });
            setNewText('');
            setShowAdd(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al agregar estado');
        }
    };

    const modal = (
        <div className="status-modal-wrap" role="dialog" aria-modal="true">
            <div className="status-backdrop" onClick={onClose} />
            <div className="status-card" onClick={e => e.stopPropagation()}>
                <header className="status-header">
                    <div className="brand">
                        <div className="logo">Mi estado</div>
                        <div className="subtitle">Poné un estado para que otros sepan qué hacés</div>
                    </div>
                    <button className="close-btn" onClick={onClose}><FiX /></button>
                </header>

                <div className="status-body">
                    {/* Expiration Dropdown */}
                    <div className="expiry-section">
                        <label className="lbl"><FiClock /> Limpiar estado después de:</label>
                        <select
                            className="expiry-select"
                            value={expiry === null ? '' : expiry}
                            onChange={e => setExpiry(e.target.value === '' ? null : (isNaN(e.target.value) ? e.target.value : Number(e.target.value)))}
                        >
                            {EXPIRY_OPTIONS.map(opt => (
                                <option key={opt.label} value={opt.value === null ? '' : opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="status-actions">
                        <button className="clear-btn" onClick={clearStatus}>
                            Limpiar estado actual
                        </button>
                    </div>

                    <div className="custom-section">
                        <div className="section-header">
                            <span className="lbl">Mis estados personalizados</span>
                            <span className="muted">{custom.length}/10</span>
                        </div>

                        <div className="custom-list">
                            {isLoading ? (
                                <div className="loader">Cargando...</div>
                            ) : (
                                <>
                                    {custom.map(s => (
                                        <div key={s.id} className="status-item">
                                            <button className="select-btn" onClick={() => handleSetStatus(s)}>
                                                <span className="emoji">{s.emoji}</span>
                                                <span className="text">{s.texto}</span>
                                            </button>
                                            <button className="delete-btn" title="Eliminar" onClick={() => remove.mutate(s.id)}>
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {!showAdd && custom.length < 10 && (
                                        <button className="add-trigger" onClick={() => setShowAdd(true)}>
                                            <FiPlus /> Crear nuevo estado
                                        </button>
                                    )}

                                    {showAdd && (
                                        <form className="add-form" onSubmit={handleAddCustom}>
                                            <div className="form-inner">
                                                <div className="emoji-wrap" onClick={() => setShowEmojiPicker(true)}>
                                                    <span className="current-emoji">{newEmoji}</span>
                                                    <FiSmile className="smile-ico" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="¿Qué estás haciendo?"
                                                    value={newText}
                                                    onChange={e => setNewText(e.target.value)}
                                                    autoFocus
                                                    className="text-input"
                                                />
                                                <div className="btn-group">
                                                    <button type="submit" className="save-btn"><FiCheck /></button>
                                                    <button type="button" className="cancel-btn" onClick={() => setShowAdd(false)}><FiX /></button>
                                                </div>
                                            </div>

                                            {showEmojiPicker && createPortal(
                                                <div className="emoji-picker-container" onClick={() => setShowEmojiPicker(false)}>
                                                    <div className="picker-modal" onClick={e => e.stopPropagation()}>
                                                        <EmojiPicker
                                                            onSelect={(emoji) => {
                                                                setNewEmoji(emoji);
                                                                setShowEmojiPicker(false);
                                                            }}
                                                            onClickOutside={() => setShowEmojiPicker(false)}
                                                        />
                                                    </div>
                                                </div>,
                                                document.body
                                            )}
                                        </form>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
