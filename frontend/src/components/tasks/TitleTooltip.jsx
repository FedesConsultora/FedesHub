import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaInfoCircle } from 'react-icons/fa';
import './TitleTooltip.scss';

export default function TitleTooltip() {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const handleMouseEnter = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2
        });
        setShow(true);
    };

    return (
        <>
            <div
                className="titleTooltipWrap"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setShow(false)}
            >
                <FaInfoCircle className="infoIcon" />
            </div>

            {show && createPortal(
                <div
                    className="titleTooltipContent"
                    style={{
                        position: 'fixed',
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: 'translateX(-50%)'
                    }}
                    onMouseEnter={() => setShow(true)}
                    onMouseLeave={() => setShow(false)}
                >
                    
                    <div className="tooltipHeader">Formato de título</div>
                    <div className="tooltipExamples">
                        <div className="example">
                            <strong>Contenido</strong> - Redacción de copies de enero
                        </div>
                        <div className="example">
                            <strong>IT</strong> - Creación de email corporativo
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
