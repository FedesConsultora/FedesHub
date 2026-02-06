import { FaFilePdf, FaFileWord, FaFileExcel, FaFileArchive, FaFileCode, FaFileAlt, FaFolder } from 'react-icons/fa';

/**
 * Detect the type of file based on MIME type and filename
 * @param {Object} file - File object with mime/mimeType and nombre/name properties
 * @returns {string} - File type: 'image', 'video', 'pdf', 'word', 'excel', 'zip', 'html', 'folder', 'other'
 */
export const getFileType = (file) => {
    if (!file) return 'other';
    const mime = (file.mime || file.mimeType || '').toLowerCase();
    const name = (file.nombre || file.name || file.originalname || '').toLowerCase();

    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/') || name.match(/\.(mp4|webm|mov|avi)$/)) return 'video';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (name.match(/\.(doc|docx)$/) || mime.includes('word')) return 'word';
    if (name.match(/\.(xls|xlsx)$/) || mime.includes('excel') || mime.includes('spreadsheet')) return 'excel';
    if (name.match(/\.(zip|rar|7z|tar|gz)$/) || mime.includes('zip') || mime.includes('compressed')) return 'zip';
    if (name.match(/\.(html|htm)$/) || mime === 'text/html') return 'html';

    const url = (file.url || file.drive_url || '').toLowerCase();
    if (url.includes('/drive/folders/') || mime?.includes('folder')) return 'folder';

    return 'other';
};

/**
 * Get proxy URL for file display (handles Google Drive files)
 * @param {Object} file - File object
 * @param {boolean} thumbnail - Whether to get thumbnail version
 * @returns {string|null} - URL for file display
 */
export const getProxyUrl = (file, thumbnail = false) => {
    if (!file) return null;

    // If has drive_file_id, use proxy directly
    if (file.drive_file_id) {
        const baseUrl = `/api/tareas/drive/image/${file.drive_file_id}`;
        return thumbnail ? `${baseUrl}?thumb=1` : baseUrl;
    }

    const url = file.url || file.drive_url;
    if (!url) return null;

    // If local URL, return as-is
    if (url.startsWith('/uploads') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        return url;
    }

    // If Google Drive URL, extract fileId and use proxy
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

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

/**
 * Get icon component and color for file type
 * @param {string} type - File type from getFileType()
 * @returns {Object} - { Icon, color }
 */
export const getFileIcon = (type) => {
    switch (type) {
        case 'pdf':
            return { Icon: FaFilePdf, color: '#ff3d00' };
        case 'word':
            return { Icon: FaFileWord, color: '#2b579a' };
        case 'excel':
            return { Icon: FaFileExcel, color: '#217346' };
        case 'zip':
            return { Icon: FaFileArchive, color: '#fb8c00' };
        case 'html':
            return { Icon: FaFileCode, color: '#e44d26' };
        case 'folder':
            return { Icon: FaFolder, color: '#FFD700' };
        default:
            return { Icon: FaFileAlt, color: '#94a3b8' };
    }
};
