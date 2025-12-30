import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useRef } from 'react';
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';

/**
 * Plugin para mostrar el conteo de caracteres.
 * NO trunca el contenido para evitar errores con nodos inválidos.
 * Solo muestra advertencias visuales cuando se acerca o supera el límite.
 */
export default function CharacterLimitPlugin({ maxLength }) {
    const [editor] = useLexicalComposerContext();
    const [charCount, setCharCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const warningTimeoutRef = useRef(null);
    const lastCountRef = useRef(0);

    useEffect(() => {
        return mergeRegister(
            // Monitor character count and show warning
            editor.registerUpdateListener(({ editorState }) => {
                try {
                    editorState.read(() => {
                        const root = $getRoot();
                        const text = root.getTextContent();
                        const length = text.length;

                        if (length !== lastCountRef.current) {
                            lastCountRef.current = length;
                            setCharCount(length);
                        }

                        if (length > maxLength) {
                            setShowWarning(true);
                            if (warningTimeoutRef.current) {
                                clearTimeout(warningTimeoutRef.current);
                            }
                            warningTimeoutRef.current = setTimeout(() => {
                                setShowWarning(false);
                            }, 5000);
                        } else if (showWarning) {
                            setShowWarning(false);
                        }
                    });
                } catch (error) {
                    console.error('[CharacterLimitPlugin] Error reading character count:', error);
                }
            })
        );
    }, [editor, maxLength, showWarning]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
        };
    }, []);

    const isNearLimit = charCount > maxLength * 0.9;
    const isAtLimit = charCount >= maxLength;

    return (
        <>
            <div className={`charCounter ${isNearLimit ? 'warning' : ''} ${isAtLimit ? 'limit' : ''}`}>
                {charCount}/{maxLength}
            </div>
            {showWarning && (
                <div className="charLimitWarning">
                    Se alcanzó el límite de {maxLength} caracteres. El texto fue cortado.
                </div>
            )}
        </>
    );
}
