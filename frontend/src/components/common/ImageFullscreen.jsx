import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdContentCopy } from 'react-icons/md';
import { FaFileWord, FaFileExcel, FaFileArchive, FaFileAlt } from 'react-icons/fa';
import './ImageFullscreen.scss';

export default function ImageFullscreen({ src, alt, type = 'image', driveId = null, onClose }) {
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
            // Si tenemos driveId, podemos intentar usar la URL de Drive directa para descargar
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
            // Fallback: abrir en nueva pestaña
            window.open(src, '_blank');
        }
    };

    const handleCopy = async () => {
        try {
            if (type === 'image') {
                // Para imágenes copiamos la imagen al portapapeles
                const response = await fetch(src);
                const blob = await response.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
            } else {
                // Para otros copiamos la URL
                await navigator.clipboard.writeText(window.location.origin + src);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error copying:', err);
            // Fallback: copiar URL
            try {
                await navigator.clipboard.writeText(window.location.origin + src);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) { }
        }
    };

    const renderMedia = () => {
        // Si es un archivo de Drive y es tipo Word, Excel o ZIP, usamos el visor de Drive
        if (driveId && (['word', 'excel', 'zip'].includes(type))) {
            return (
                <iframe
                    src={`https://drive.google.com/file/d/${driveId}/preview`}
                    title={alt}
                    className="preview-iframe"
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }

        switch (type) {
            case 'video':
                return (
                    <video
                        src={src}
                        controls
                        autoPlay
                        loop
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            case 'pdf':
            case 'html':
                return (
                    <iframe
                        src={src}
                        title={alt}
                        className="preview-iframe"
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            case 'image':
                return (
                    <img
                        src={src}
                        alt={alt || 'Imagen en pantalla completa'}
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            default: {
                // Iconos para otros tipos sin preview directo
                const Icon = type === 'word' ? FaFileWord :
                    type === 'excel' ? FaFileExcel :
                        type === 'zip' ? FaFileArchive : FaFileAlt;

                const iconColor = type === 'word' ? '#2b579a' :
                    type === 'excel' ? '#217346' :
                        type === 'zip' ? '#fb8c00' : '#94a3b8';

                return (
                    <div className="no-preview-container" onClick={(e) => e.stopPropagation()}>
                        <Icon size={120} style={{ color: iconColor }} />
                        <h3>{alt}</h3>
                        <p>Previsualización no disponible para este tipo de archivo.</p>
                        <button className="download-btn" onClick={handleDownload}>
                            <MdDownload /> Descargar para ver
                        </button>
                    </div>
                );
            }
        }
    };

    return createPortal(
        <div className="image-fullscreen-overlay" onClick={handleBackdropClick}>
            {/* Header bar to avoid overlap */}
            <header className="fullscreen-header">
                <div className="file-info">
                    <span className="file-name">{alt}</span>
                </div>
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
            </header>

            <div className={`media-container type-${type}`}>
                {renderMedia()}
            </div>
        </div>,
        document.body
    );
}
