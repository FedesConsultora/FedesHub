import { useState, useRef, useCallback } from 'react';
import { MdAdd, MdClose, MdPlayArrow } from 'react-icons/md';
import ImageFullscreen from '../common/ImageFullscreen';
import './ContentGallery.scss';

// Límite de archivo (50GB - los archivos se suben a Google Drive)
const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024;

// Helper para detectar si es video
const isVideo = (file) => {
    if (!file) return false;
    const mime = file.mime || file.mimeType || '';
    const name = (file.nombre || file.name || '').toLowerCase();
    return mime.startsWith('video/') ||
        name.endsWith('.mp4') ||
        name.endsWith('.webm') ||
        name.endsWith('.mov') ||
        name.endsWith('.avi');
};

// Helper para convertir URLs de Drive a proxy URL
const getProxyUrl = (file, thumbnail = false) => {
    if (!file) return null;

    // Si tiene drive_file_id, usar el proxy directamente
    if (file.drive_file_id) {
        const baseUrl = `/api/tareas/drive/image/${file.drive_file_id}`;
        return thumbnail ? `${baseUrl}?thumb=1` : baseUrl;
    }

    const url = file.url || file.drive_url;
    if (!url) return null;

    // Si es una URL local, devolverla tal cual
    if (url.startsWith('/uploads') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        return url;
    }

    // Si es una URL de Google Drive, extraer el fileId y usar el proxy
    if (url.includes('drive.google.com')) {
        const match = url.match(/\/file\/d\/([^\/]+)/);
        if (match && match[1]) {
            return `/api/tareas/drive/image/${match[1]}`;
        }
        const matchOpen = url.match(/[?&]id=([^&]+)/);
        if (matchOpen && matchOpen[1]) {
            return `/api/tareas/drive/image/${matchOpen[1]}`;
        }
    }

    return url;
};

// Formatear tamaño de archivo
const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

export default function ContentGallery({
    images = [],
    onUpload,
    onRemove,
    title = 'Galería',
    accept = 'image/*,video/*',
    disabled = false,
    showAddButton = true
}) {
    const [mainImage, setMainImage] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isOver, setIsOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [loadingImages, setLoadingImages] = useState({}); // Track loading state per image
    const fileInputRef = useRef(null);

    // When images change, update mainImage if needed
    if (!mainImage && images.length > 0) {
        setMainImage(images[0]);
    } else if (mainImage && !images.find(img => img.id === mainImage.id)) {
        setMainImage(images[0] || null);
    }

    // Validate files before upload
    const validateFiles = useCallback((files) => {
        const errors = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`"${file.name}" excede el límite de ${formatFileSize(MAX_FILE_SIZE)}`);
            }
        }
        return errors;
    }, []);

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsOver(false);
        setUploadError(null);
        if (disabled || isUploading) return;

        const files = Array.from(e.dataTransfer?.files || []);
        if (!files.length) return;

        const errors = validateFiles(files);
        if (errors.length > 0) {
            setUploadError(errors.join('\n'));
            return;
        }

        if (onUpload) {
            setIsUploading(true);
            try {
                await onUpload(files);
            } catch (err) {
                setUploadError(err.message || 'Error al subir archivo');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled && !isUploading) setIsOver(true);
    };

    const handleDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsOver(false);
        }
    };

    const handleFileSelect = async (e) => {
        setUploadError(null);
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const errors = validateFiles(files);
        if (errors.length > 0) {
            setUploadError(errors.join('\n'));
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        if (onUpload) {
            setIsUploading(true);
            try {
                await onUpload(files);
            } catch (err) {
                setUploadError(err.message || 'Error al subir archivo');
            } finally {
                setIsUploading(false);
            }
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemove = (e, imageId) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove(imageId);
        }
    };

    const handleThumbnailClick = (image) => {
        // Mark main image as loading
        setLoadingImages(prev => ({ ...prev, [`main-${image.id}`]: true }));
        setMainImage(image);
    };

    const handleMainClick = () => {
        if (mainImage && !isUploading) {
            setFullscreenImage(mainImage);
        }
    };

    // Handle image load events
    const handleImageLoad = (imageId) => {
        setLoadingImages(prev => {
            const next = { ...prev };
            delete next[imageId];
            return next;
        });
    };

    // Render media (image or video) with loading state
    const renderMedia = (file, className, onClick, isThumbnail = false) => {
        const url = getProxyUrl(file, isThumbnail);
        const isVideoFile = isVideo(file);
        const imageId = isThumbnail ? `thumb-${file.id}` : `main-${file.id}`;
        const isLoading = loadingImages[imageId];

        if (isVideoFile) {
            return (
                <div className={`video-wrapper ${className}`} onClick={onClick}>
                    <video
                        src={url}
                        className={className}
                        controls={className === 'main-image'}
                        muted
                        loop
                        playsInline
                        preload={isThumbnail ? "metadata" : "auto"}
                        onLoadedData={() => handleImageLoad(imageId)}
                    />
                    {isThumbnail && <MdPlayArrow className="play-icon" size={24} />}
                </div>
            );
        }

        return (
            <div className={`image-wrapper ${isLoading ? 'loading' : ''}`}>
                {isLoading && <div className="image-loader"><div className="spinner-small"></div></div>}
                <img
                    src={url}
                    alt={file.nombre || 'Media'}
                    className={className}
                    onClick={onClick}
                    loading={isThumbnail ? "lazy" : "eager"}
                    onLoad={() => handleImageLoad(imageId)}
                    onError={() => handleImageLoad(imageId)}
                />
            </div>
        );
    };

    // Trigger file input
    const triggerFileInput = () => {
        if (!disabled && !isUploading) {
            setUploadError(null);
            fileInputRef.current?.click();
        }
    };

    return (
        <div
            className={`content-gallery ${isOver ? 'is-over' : ''} ${disabled ? 'disabled' : ''} ${isUploading ? 'uploading' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* Title */}
            <div className="gallery-header">
                <h4>{title}</h4>
                {showAddButton && !disabled && (
                    <button
                        className="add-btn"
                        onClick={triggerFileInput}
                        title="Agregar archivo"
                        disabled={isUploading}
                    >
                        <MdAdd size={20} />
                    </button>
                )}
            </div>

            {/* Error message */}
            {uploadError && (
                <div className="upload-error">
                    <span>{uploadError}</span>
                    <button onClick={() => setUploadError(null)}>✕</button>
                </div>
            )}

            {/* Loading overlay */}
            {isUploading && (
                <div className="upload-overlay">
                    <div className="spinner"></div>
                    <p>Subiendo archivo...</p>
                    <p className="hint">Los videos pueden tardar varios minutos</p>
                </div>
            )}

            {/* Main Image/Video */}
            <div className="main-image-container">
                {mainImage ? (
                    renderMedia(mainImage, 'main-image', handleMainClick)
                ) : (
                    <div className="empty-state">
                        <p>Arrastra imágenes o videos aquí</p>
                        {!disabled && (
                            <button onClick={triggerFileInput} disabled={isUploading}>
                                o haz click para seleccionar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="thumbnails-container">
                    <div className="thumbnails-slider">
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className={`thumbnail ${mainImage?.id === image.id ? 'selected' : ''}`}
                                onClick={() => handleThumbnailClick(image)}
                            >
                                {isVideo(image) ? (
                                    <div className="video-thumb">
                                        <video src={getProxyUrl(image, true)} muted preload="metadata" />
                                        <MdPlayArrow className="play-icon" size={24} />
                                    </div>
                                ) : (
                                    <img src={getProxyUrl(image, true)} alt={image.nombre || 'Thumbnail'} loading="lazy" />
                                )}
                                {!disabled && (
                                    <button
                                        className="remove-btn"
                                        onClick={(e) => handleRemove(e, image.id)}
                                        title="Eliminar"
                                    >
                                        <MdClose size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Single image remove button */}
            {images.length === 1 && !disabled && (
                <button
                    className="single-remove-btn"
                    onClick={(e) => handleRemove(e, images[0].id)}
                >
                    <MdClose size={16} /> Eliminar {isVideo(images[0]) ? 'video' : 'imagen'}
                </button>
            )}

            {/* Fullscreen Modal */}
            {fullscreenImage && (
                <ImageFullscreen
                    src={getProxyUrl(fullscreenImage)}
                    alt={fullscreenImage.nombre || 'Media'}
                    isVideo={isVideo(fullscreenImage)}
                    onClose={() => setFullscreenImage(null)}
                />
            )}
        </div>
    );
}
