import { useState, useEffect, useRef, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $insertNodes } from 'lexical';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import CharacterLimitPlugin from './plugins/CharacterLimitPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import FilePlugin from './plugins/FilePlugin';
import { FileNode } from './nodes/FileNode';
import './RichTextEditor.scss';

// Configuración inicial del editor
const getEditorConfig = () => ({
    namespace: 'TaskDescriptionEditor',
    theme: {
        paragraph: 'editor-paragraph',
        text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            strikethrough: 'editor-text-strikethrough',
            underline: 'editor-text-underline',
            code: 'editor-text-code',
        },
        link: 'editor-link',
        list: {
            ul: 'editor-list-ul',
            ol: 'editor-list-ol',
            listitem: 'editor-listitem',
        },
        quote: 'editor-quote',
    },
    nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        LinkNode,
        AutoLinkNode,
        FileNode,
    ],
    onError(error) {
        console.error('Lexical Error:', error);
    },
});

// Plugin para inicializar el contenido HTML
function InitialValuePlugin({ initialValue }) {
    const [editor] = useLexicalComposerContext();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        if (!initialValue) return;

        editor.update(() => {
            const root = $getRoot();
            const parser = new DOMParser();
            const dom = parser.parseFromString(initialValue, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            root.clear();
            if (nodes.length > 0) {
                $insertNodes(nodes);
            }
        });
    }, [editor, initialValue]);

    return null;
}

// Plugin para capturar cambios y convertir a HTML
function OnChangeHTMLPlugin({ onChange }) {
    const [editor] = useLexicalComposerContext();

    const handleChange = (editorState) => {
        editorState.read(() => {
            const htmlString = $generateHtmlFromNodes(editor);
            onChange?.(htmlString);
        });
    };

    return <OnChangePlugin onChange={handleChange} />;
}

// Plugin para manejar blur
function OnBlurPlugin({ onBlur }) {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        return editor.registerRootListener((rootElement, prevRootElement) => {
            // Remove from previous root using stored handler
            if (prevRootElement && prevRootElement._focusOutHandler) {
                prevRootElement.removeEventListener('focusout', prevRootElement._focusOutHandler);
                delete prevRootElement._focusOutHandler;
            }

            // Add to new root
            if (rootElement) {
                const handleFocusOut = (e) => {
                    // Check if focus is leaving the editor entirely
                    const editorContainer = rootElement.closest('.editor-container');
                    if (!editorContainer?.contains(e.relatedTarget)) {
                        console.log('[OnBlurPlugin] Editor lost focus, triggering save');
                        onBlur?.();
                    }
                };

                rootElement.addEventListener('focusout', handleFocusOut);
                // Store handler for cleanup
                rootElement._focusOutHandler = handleFocusOut;
            }
        });
    }, [editor, onBlur]);

    return null;
}

export default function RichTextEditor({
    value = '',
    onChange,
    onBlur,
    taskId,
    placeholder = 'Escribí aquí...',
    maxLength = 600,
    minHeight = '190px'
}) {
    // Generate a stable key based on taskId - only remount when taskId changes
    const mountIdRef = useRef(Date.now());
    const editorKey = `editor-${taskId || 'new'}-${mountIdRef.current}`;

    // Memoize config to avoid unnecessary recreation
    const editorConfig = useMemo(() => getEditorConfig(), []);

    // Stop propagation to prevent parent modal from closing on text selection
    const handleMouseDown = (e) => {
        e.stopPropagation();
    };

    return (
        <div
            className="richTextEditor"
            style={{ minHeight }}
            onMouseDown={handleMouseDown}
        >
            <LexicalComposer key={editorKey} initialConfig={editorConfig}>
                <div className="editor-container">
                    <ToolbarPlugin />
                    <div className="editor-inner">
                        <RichTextPlugin
                            contentEditable={
                                <ContentEditable
                                    className="editor-input"
                                    style={{ minHeight }}
                                    aria-placeholder={placeholder}
                                    placeholder={
                                        <div className="editor-placeholder">{placeholder}</div>
                                    }
                                />
                            }
                            ErrorBoundary={LexicalErrorBoundary}
                        />
                        <InitialValuePlugin initialValue={value} />
                        <HistoryPlugin />
                        <LinkPlugin />
                        <ListPlugin />
                        <AutoLinkPlugin />
                        <CharacterLimitPlugin maxLength={maxLength} />
                        <OnChangeHTMLPlugin onChange={onChange} />
                        {onBlur && <OnBlurPlugin onBlur={onBlur} />}
                        {taskId && <FilePlugin taskId={taskId} />}
                    </div>
                </div>
            </LexicalComposer>
        </div>
    );
}
