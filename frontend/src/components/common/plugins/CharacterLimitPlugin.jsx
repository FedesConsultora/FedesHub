import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState } from 'react';
import { $getRoot } from 'lexical';

/**
 * Plugin para mostrar el conteo de caracteres.
 * NO trunca el contenido para evitar errores con nodos inválidos.
 * Solo muestra advertencias visuales cuando se acerca o supera el límite.
 */
export default function CharacterLimitPlugin({ maxLength }) {
    const [editor] = useLexicalComposerContext();
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                try {
                    const root = $getRoot();
                    const text = root.getTextContent();
                    const length = text.trim().length;
                    setCharCount(length);
                } catch (error) {
                    console.warn('CharacterLimitPlugin: Error reading content', error);
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
