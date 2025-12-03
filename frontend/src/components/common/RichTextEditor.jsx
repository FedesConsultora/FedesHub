import { useState, useEffect } from 'react';
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
import { $generateHtmlFromNodes } from '@lexical/html';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import ToolbarPlugin from './plugins/ToolbarPlugin';
import CharacterLimitPlugin from './plugins/CharacterLimitPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import FilePlugin from './plugins/FilePlugin';
import { FileNode } from './nodes/FileNode';
import './RichTextEditor.scss';

// Configuración inicial del editor
const editorConfig = {
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
};

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
        return editor.registerRootListener((rootElement) => {
            if (rootElement) {
                const handleBlur = () => {
                    onBlur?.();
                };
                rootElement.addEventListener('blur', handleBlur, true);
                return () => {
                    rootElement.removeEventListener('blur', handleBlur, true);
                };
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
    return (
        <div className="richTextEditor" style={{ minHeight }}>
            <LexicalComposer initialConfig={editorConfig}>
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
