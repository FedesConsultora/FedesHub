import { DecoratorNode } from 'lexical';
import { MdInsertDriveFile, MdImage, MdPictureAsPdf, MdTableChart, MdVideoLibrary, MdAudiotrack } from 'react-icons/md';

const FILE_ICONS = {
    pdf: MdPictureAsPdf,
    doc: MdInsertDriveFile,
    docx: MdInsertDriveFile,
    xls: MdTableChart,
    xlsx: MdTableChart,
    csv: MdTableChart,
    jpg: MdImage,
    jpeg: MdImage,
    png: MdImage,
    gif: MdImage,
    webp: MdImage,
    mp4: MdVideoLibrary,
    mov: MdVideoLibrary,
    avi: MdVideoLibrary,
    mp3: MdAudiotrack,
    wav: MdAudiotrack,
    default: MdInsertDriveFile
};

export function getFileIcon(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext] || FILE_ICONS.default;
}

export class FileNode extends DecoratorNode {
    __fileId;
    __fileName;
    __fileUrl;

    static getType() {
        return 'file';
    }

    static clone(node) {
        return new FileNode(node.__fileId, node.__fileName, node.__fileUrl, node.__key);
    }

    constructor(fileId, fileName, fileUrl, key) {
        super(key);
        this.__fileId = fileId;
        this.__fileName = fileName;
        this.__fileUrl = fileUrl;
    }

    createDOM() {
        const span = document.createElement('span');
        span.className = 'editor-file-node';
        return span;
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return (
            <FileChipComponent
                fileId={this.__fileId}
                fileName={this.__fileName}
                fileUrl={this.__fileUrl}
                nodeKey={this.__key}
            />
        );
    }

    exportJSON() {
        return {
            fileId: this.__fileId,
            fileName: this.__fileName,
            fileUrl: this.__fileUrl,
            type: 'file',
            version: 1,
        };
    }

    static importJSON(serializedNode) {
        const { fileId, fileName, fileUrl } = serializedNode;
        return $createFileNode(fileId, fileName, fileUrl);
    }
}

export function $createFileNode(fileId, fileName, fileUrl) {
    return new FileNode(fileId, fileName, fileUrl);
}

export function $isFileNode(node) {
    return node instanceof FileNode;
}

// Component rendered by the decorator
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey } from 'lexical';
import './FileNode.scss';

function FileChipComponent({ fileId, fileName, fileUrl, nodeKey }) {
    const [editor] = useLexicalComposerContext();
    const IconComponent = getFileIcon(fileName);

    const handleRemove = (e) => {
        e.preventDefault();
        e.stopPropagation();

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node) {
                node.remove();
            }
        });

        // Emit custom event to notify parent component
        window.dispatchEvent(new CustomEvent('file-node-removed', {
            detail: { fileId, fileName }
        }));
    };

    const handleClick = (e) => {
        e.preventDefault();
        if (fileUrl) {
            window.open(fileUrl, '_blank');
        }
    };

    return (
        <span className="editor-file-chip" onClick={handleClick} contentEditable={false}>
            <IconComponent className="file-icon" />
            <span className="file-name" title={fileName}>
                {fileName.length > 20 ? `${fileName.substring(0, 17)}...` : fileName}
            </span>
            <button
                className="remove-btn"
                onClick={handleRemove}
                title="Eliminar archivo"
            >
                ×
            </button>
        </span>
    );
}
