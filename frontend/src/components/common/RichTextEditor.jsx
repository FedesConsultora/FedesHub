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
import { $getRoot, $insertNodes, $createParagraphNode, TextNode, ParagraphNode, $isTextNode } from 'lexical';

class ExtendedTextNode extends TextNode {
    static getType() {
        return 'extended-text';
    }

    static clone(node) {
        const clone = new ExtendedTextNode(node.__text, node.__key);
        // Copiar todas las propiedades internas para que Lexical no se pierda
        clone.__format = node.__format;
        clone.__style = node.__style;
        clone.__detail = node.__detail;
        clone.__mode = node.__mode;
        clone.__parent = node.__parent;
        return clone;
    }

    static importDOM() {
        const importers = TextNode.importDOM();
        return {
            ...importers,
            span: () => ({
                conversion: (domNode) => {
                    const style = domNode.getAttribute('style');
                    if (style) {
                        return {
                            forChild: (lexicalNode) => {
                                if ($isTextNode(lexicalNode)) {
                                    lexicalNode.setStyle(style);
                                }
                                return lexicalNode;
                            },
                        };
                    }
                    return null;
                },
                priority: 1,
            }),
        };
    }

    static importJSON(serializedNode) {
        return TextNode.importJSON(serializedNode);
    }

    exportJSON() {
        return super.exportJSON();
    }
}

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
        ParagraphNode,
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

console.log('[RichTextEditor] Config loaded with nodes:', [ParagraphNode, HeadingNode, ListNode, ListItemNode, QuoteNode, LinkNode, AutoLinkNode, FileNode]);

// Plugin para inicializar el contenido HTML
function InitialValuePlugin({ initialValue }) {
    const [editor] = useLexicalComposerContext();
    const hasInitialized = useRef(false);

    // Si el usuario empieza a escribir, ya no queremos sobreescribir con el valor inicial tardío
    useEffect(() => {
        return editor.registerUpdateListener((params) => {
            const { dirtyElements, dirtyNodes } = params;
            if ((dirtyElements && dirtyElements.size > 0) || (dirtyNodes && dirtyNodes.size > 0)) {
                hasInitialized.current = true;
            }
        });
    }, [editor]);

    useEffect(() => {
        if (hasInitialized.current) return;

        // Si no hay valor inicial real, igual aseguramos un párrafo para que el editor no esté roto
        if (!initialValue) {
            editor.update(() => {
                const root = $getRoot();
                if (root.getChildrenSize() === 0) {
                    root.append($createParagraphNode());
                }
            });
            // NO marcamos hasInitialized como true aún, por si llega la data del server después
            return;
        }

        hasInitialized.current = true;

        let processedValue = initialValue || '';
        // Si no tiene <a> tags pero parece tener URLs, intentamos linkificar antes de parsear
        const hasLinks = processedValue.includes('<a');
        const hasUrlSchema = processedValue.includes('http');
        const hasWww = processedValue.includes('www.');

        if (!hasLinks && (hasUrlSchema || hasWww || processedValue.includes('.'))) {
            const pattern = /((https?:\/\/[^\s<>"']+)|(www\.[^\s<>"']+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,6}[^\s<>"']*))/g;
            processedValue = processedValue.replace(pattern, (match) => {
                if (match === '...' || match.length < 4) return match;
                const url = (match.startsWith('http') || match.startsWith('www.'))
                    ? (match.startsWith('www.') ? `https://${match}` : match)
                    : `https://${match}`;
                return `<a href="${url}" target="_blank" rel="noreferrer">${match}</a>`;
            });
        }

        editor.update(() => {
            try {
                const root = $getRoot();
                const parser = new DOMParser();
                const dom = parser.parseFromString(processedValue, 'text/html');
                const nodes = $generateNodesFromDOM(editor, dom);

                if (nodes.length > 0) {
                    root.clear();
                    nodes.forEach(node => {
                        if (node.isInline?.()) {
                            let last = root.getLastChild();
                            if (last === null || last.isInline?.() === false) {
                                last = $createParagraphNode();
                                root.append(last);
                            }
                            last.append(node);
                        } else {
                            try {
                                root.append(node);
                            } catch (e) {
                                const p = $createParagraphNode();
                                p.append(node);
                                root.append(p);
                            }
                        }
                    });
                }

                if (root.getChildrenSize() === 0) {
                    root.append($createParagraphNode());
                }
            } catch (error) {
                console.error('InitialValuePlugin Error:', error);
            }
        });
    }, [editor, initialValue]);

    return null;
}

// Plugin para capturar cambios y convertir a HTML
function OnChangeHTMLPlugin({ onChange }) {
    const [editor] = useLexicalComposerContext();

    return (
        <OnChangePlugin
            onChange={(editorState) => {
                editorState.read(() => {
                    const htmlString = $generateHtmlFromNodes(editor);
                    onChange?.(htmlString);
                });
            }}
        />
    );
}

// Plugin para manejar blur
function OnBlurPlugin({ onBlur }) {
    const [editor] = useLexicalComposerContext()
    const timeoutRef = useRef(null)

    useEffect(() => {
        return editor.registerRootListener((rootElement, prevRootElement) => {
            if (prevRootElement && prevRootElement._focusOutHandler) {
                prevRootElement.removeEventListener('focusout', prevRootElement._focusOutHandler)
                delete prevRootElement._focusOutHandler
            }

            if (rootElement) {
                const handleFocusOut = (e) => {
                    const editorContainer = rootElement.closest('.editor-container')
                    if (!editorContainer?.contains(e.relatedTarget)) {
                        clearTimeout(timeoutRef.current)

                        // ⬅️ DIFERIR guardado
                        timeoutRef.current = setTimeout(() => {
                            editor.getEditorState().read(() => {
                                onBlur?.()
                            })
                        }, 0)
                    }
                }

                rootElement.addEventListener('focusout', handleFocusOut)
                rootElement._focusOutHandler = handleFocusOut
            }
        })
    }, [editor, onBlur])

    return null
}


// Plugin para hacer los links clickeables (Lexical por defecto los bloquea en editable)
function ClickableLinkPlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        const onClick = (event) => {
            const target = event.target;
            const anchor = target instanceof HTMLAnchorElement ? target : target.closest('a');

            if (anchor) {
                const href = anchor.getAttribute('href') || anchor.href;
                if (!href || href.startsWith('javascript:') || event.metaKey || event.ctrlKey) {
                    return;
                }

                window.open(href, '_blank', 'noopener,noreferrer');
                event.preventDefault();
                event.stopPropagation();
            }
        };

        return editor.registerRootListener((rootElement, prevRootElement) => {
            if (prevRootElement) {
                prevRootElement.removeEventListener('click', onClick);
            }
            if (rootElement) {
                rootElement.addEventListener('click', onClick, true); // Use capture to intercept Lexical's own handlers
            }
        });
    }, [editor]);

    return null;
}


export default function RichTextEditor({
    value = '',
    onChange,
    onBlur,
    taskId,
    placeholder = 'Escribe aquí...',
    maxLength = 600,
    minHeight = '190px',
    readOnly = false
}) {
    // Generate a stable key based on taskId - only remount when taskId changes
    const mountIdRef = useRef(Date.now());
    const editorKey = `editor-${taskId || 'new'}-${mountIdRef.current}`;

    // Memoize config to avoid unnecessary recreation
    const editorConfig = useMemo(() => ({
        ...getEditorConfig(),
        editable: !readOnly
    }), [readOnly]);

    return (
        <div
            className="richTextEditor"
            style={{ minHeight }}
        >
            <LexicalComposer key={editorKey} initialConfig={editorConfig}>
                <div className={`editor-container ${readOnly ? 'read-only' : ''}`}>
                    {!readOnly && <ToolbarPlugin />}
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
                        <ClickableLinkPlugin />
                        {onBlur && <OnBlurPlugin onBlur={onBlur} />}
                        {taskId && <FilePlugin taskId={taskId} />}
                    </div>
                </div>
            </LexicalComposer>
        </div>
    );
}
