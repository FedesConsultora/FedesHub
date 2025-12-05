import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdContentCopy } from 'react-icons/md';
import './ImageFullscreen.scss';

export default function ImageFullscreen({ src, alt, isVideo = false, onClose }) {
    const [copied, setCopied] = useState(false);

    // Close on ESC key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose?.();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = alt || 'archivo';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading:', err);
        }
    };

    const handleCopy = async () => {
        try {
            if (isVideo) {
                // Para videos copiamos la URL
                await navigator.clipboard.writeText(window.location.origin + src);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                // Para imágenes copiamos la imagen al portapapeles
                const response = await fetch(src);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.error('Error copying:', err);
            // Fallback: copiar URL
            await navigator.clipboard.writeText(window.location.origin + src);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return createPortal(
        <div className="image-fullscreen-overlay" onClick={handleBackdropClick}>
            {/* Action buttons */}
            <div className="action-buttons">
                <button className="action-btn" onClick={handleCopy} title={copied ? "¡Copiado!" : "Copiar"}>
                    <MdContentCopy size={22} />
                    {copied && <span className="tooltip">¡Copiado!</span>}
                </button>
                <button className="action-btn" onClick={handleDownload} title="Descargar">
                    <MdDownload size={22} />
                </button>
                <button className="action-btn close" onClick={onClose} title="Cerrar">
                    <MdClose size={24} />
                </button>
            </div>

            <div className="media-container">
                {isVideo ? (
                    <video
                        src={src}
                        controls
                        autoPlay
                        loop
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <img
                        src={src}
                        alt={alt || 'Imagen en pantalla completa'}
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </div>,
        document.body
    );
}
