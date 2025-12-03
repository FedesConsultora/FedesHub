import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodes, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { $createFileNode } from '../nodes/FileNode';
import { tareasApi } from '../../../api/tareas';

export const INSERT_FILE_COMMAND = createCommand('INSERT_FILE_COMMAND');
export const REMOVE_FILE_COMMAND = createCommand('REMOVE_FILE_COMMAND');

export default function FilePlugin({ taskId, onFileUploaded, onFileRemoved }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        // Register INSERT_FILE_COMMAND
        return editor.registerCommand(
            INSERT_FILE_COMMAND,
            async (payload) => {
                const { file } = payload;

                try {
                    // Upload file to server using uploadAdjuntos with es_embebido flag
                    const response = await tareasApi.uploadAdjuntos(taskId, [file], true);
                    const uploadedFiles = response.created || (Array.isArray(response) ? response : [response]);
                    const uploadedFile = uploadedFiles[0];

                    if (!uploadedFile) {
                        throw new Error('No se recibió respuesta del servidor');
                    }

                    // Insert file node into editor
                    editor.update(() => {
                        const fileNode = $createFileNode(
                            uploadedFile.id,
                            uploadedFile.nombre || file.name,
                            uploadedFile.url || uploadedFile.drive_url
                        );
                        $insertNodes([fileNode]);
                    });

                    onFileUploaded?.(uploadedFile);
                } catch (error) {
                    console.error('Error uploading file:', error);
                    alert('Error al subir el archivo: ' + (error.message || 'Error desconocido'));
                }

                return true;
            },
            COMMAND_PRIORITY_EDITOR
        );
    }, [editor, taskId, onFileUploaded]);

    useEffect(() => {
        // Listen for file removal events from FileNode
        const handleFileRemoved = async (event) => {
            const { fileId, fileName } = event.detail;

            try {
                // Delete file from server
                await tareasApi.deleteAdjunto(taskId, fileId);
                onFileRemoved?.(fileId, fileName);
            } catch (error) {
                console.error('Error deleting file:', error);
                // File already removed from editor, just log the error
            }
        };

        window.addEventListener('file-node-removed', handleFileRemoved);
        return () => window.removeEventListener('file-node-removed', handleFileRemoved);
    }, [taskId, onFileRemoved]);

    useEffect(() => {
        // Register drag and drop handlers
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            rootElement.classList.add('dragging-file');
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!rootElement.contains(e.relatedTarget)) {
                rootElement.classList.remove('dragging-file');
            }
        };

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            rootElement.classList.remove('dragging-file');

            const files = Array.from(e.dataTransfer?.files || []);

            for (const file of files) {
                editor.dispatchCommand(INSERT_FILE_COMMAND, { file });
            }
        };

        rootElement.addEventListener('dragover', handleDragOver);
        rootElement.addEventListener('dragleave', handleDragLeave);
        rootElement.addEventListener('drop', handleDrop);

        return () => {
            rootElement.removeEventListener('dragover', handleDragOver);
            rootElement.removeEventListener('dragleave', handleDragLeave);
            rootElement.removeEventListener('drop', handleDrop);
        };
    }, [editor]);

    return null;
}
