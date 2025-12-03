import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState } from 'react';
import { $getRoot, $getSelection, $isRangeSelection, RootNode } from 'lexical';
import { $isTextNode } from 'lexical';

export default function CharacterLimitPlugin({ maxLength }) {
    const [editor] = useLexicalComposerContext();
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const root = $getRoot();
                const text = root.getTextContent();
                const length = text.trim().length;
                setCharCount(length);

                // Prevenir más caracteres si se alcanza el límite
                if (length > maxLength) {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const root = $getRoot();
                            const text = root.getTextContent();
                            if (text.trim().length > maxLength) {
                                // Truncar al límite
                                const truncated = text.substring(0, maxLength);
                                root.clear();
                                root.append($getRoot().getFirstChild());
                            }
                        }
                    });
                }
            });
        });
    }, [editor, maxLength]);

    const isNearLimit = charCount > maxLength * 0.9;
    const isAtLimit = charCount >= maxLength;

    return (
        <div className={`charCounter ${isNearLimit ? 'warning' : ''} ${isAtLimit ? 'limit' : ''}`}>
            {charCount}/{maxLength}
        </div>
    );
}
