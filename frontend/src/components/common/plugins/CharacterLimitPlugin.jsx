import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useRef } from 'react';
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical';
import { mergeRegister } from '@lexical/utils';

export default function CharacterLimitPlugin({ maxLength }) {
    const [editor] = useLexicalComposerContext();
    const [charCount, setCharCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const warningTimeoutRef = useRef(null);

    useEffect(() => {
        return mergeRegister(
            // Monitor character count
            editor.registerUpdateListener(({ editorState }) => {
                try {
                    editorState.read(() => {
                        const root = $getRoot();
                        const text = root.getTextContent();
                        const length = text.length;
                        setCharCount(length);
                    });
                } catch (error) {
                    console.error('[CharacterLimitPlugin] Error reading character count:', error);
                }
            }),

            // Prevent input when at limit
            editor.registerTextContentListener((textContent) => {
                try {
                    const length = textContent.length;

                    if (length > maxLength) {
                        // Show warning message
                        setShowWarning(true);
                        if (warningTimeoutRef.current) {
                            clearTimeout(warningTimeoutRef.current);
                        }
                        warningTimeoutRef.current = setTimeout(() => {
                            setShowWarning(false);
                        }, 3000);

                        // Truncate to max length safely
                        editor.update(() => {
                            try {
                                const root = $getRoot();
                                const currentText = root.getTextContent();

                                if (currentText.length > maxLength) {
                                    const selection = $getSelection();

                                    // Get the truncated text
                                    const truncatedText = currentText.substring(0, maxLength);

                                    // Clear and set new content
                                    root.clear();
                                    const paragraph = root.getFirstChild();
                                    if (paragraph) {
                                        paragraph.select();
                                    }

                                    // Insert truncated text
                                    if ($isRangeSelection(selection)) {
                                        selection.insertText(truncatedText);
                                    }
                                }
                            } catch (error) {
                                console.error('[CharacterLimitPlugin] Error truncating text:', error);
                            }
                        });
                    }
                } catch (error) {
                    console.error('[CharacterLimitPlugin] Error in text content listener:', error);
                }
            })
        );
    }, [editor, maxLength]);

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
