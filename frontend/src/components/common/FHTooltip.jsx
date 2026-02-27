import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import './fh-tooltip.scss';

export default function FHTooltip({ text, children, delay = 0 }) {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const timerRef = useRef(null);

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();

        timerRef.current = setTimeout(() => {
            setPosition({
                top: rect.top - 10,
                left: rect.left + rect.width / 2
            });
            setShow(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setShow(false);
    };

    return (
        <>
            <div
                className="fh-tooltip-trigger"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{ display: 'inline-flex' }}
            >
                {children}
            </div>

            {show && createPortal(
                <div
                    className="fh-tooltip-content"
                    style={{
                        position: 'fixed',
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9999
                    }}
                >
                    {text}
                    <div className="fh-tooltip-arrow" />
                </div>,
                document.body
            )}
        </>
    );
}
