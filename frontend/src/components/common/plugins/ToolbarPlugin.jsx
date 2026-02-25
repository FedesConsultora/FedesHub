import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useCallback, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChromePicker } from 'react-color';
import {
    $getSelection,
    $isRangeSelection,
    $isTextNode,
    $createTextNode,
    FORMAT_TEXT_COMMAND,
    FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $patchStyleText, $setBlocksType } from '@lexical/selection';
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $getNearestNodeOfType } from '@lexical/utils';
import {
    MdFormatBold,
    MdFormatItalic,
    MdFormatUnderlined,
    MdFormatStrikethrough,
    MdFormatListBulleted,
    MdFormatListNumbered,
    MdLink,
    MdCode,
    MdFormatAlignLeft,
    MdFormatAlignCenter,
    MdFormatAlignRight,
    MdFormatAlignJustify,
    MdFormatColorText,
    MdFormatSize,
    MdFormatQuote,
    MdTextFields,
    MdAttachFile
} from 'react-icons/md';
import { INSERT_FILE_COMMAND } from './FilePlugin';

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px', '48px'];

export default function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    // ... rest of state ...
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [isLink, setIsLink] = useState(false);
    const [isBulletList, setIsBulletList] = useState(false);
    const [isNumberList, setIsNumberList] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showFontSizePicker, setShowFontSizePicker] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [currentColor, setCurrentColor] = useState('#000000');
    const [currentFontSize, setCurrentFontSize] = useState('16px');
    const colorBtnRef = useRef(null);
    const fontSizeBtnRef = useRef(null);
    const fileInputRef = useRef(null);

    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat('bold'));
            setIsItalic(selection.hasFormat('italic'));
            setIsUnderline(selection.hasFormat('underline'));
            setIsStrikethrough(selection.hasFormat('strikethrough'));
            setIsCode(selection.hasFormat('code'));

            const node = selection.anchor.getNode();
            const parent = node.getParent();
            setIsLink($isLinkNode(parent) || $isLinkNode(node));

            // Extract style (color, font-size)
            if ($isTextNode(node)) {
                const style = node.getStyle() || '';
                const colorMatch = style.match(/color:\s*([^;]+)/i);
                if (colorMatch) setCurrentColor(colorMatch[1].trim());
                else setCurrentColor('#ffffff');

                const sizeMatch = style.match(/font-size:\s*([^;]+)/i);
                if (sizeMatch) setCurrentFontSize(sizeMatch[1].trim());
                else setCurrentFontSize('16px');
            }

            // Check if in list
            let element = node;
            let foundList = false;
            let listType = null;
            while (element) {
                if (element.__type === 'list') {
                    foundList = true;
                    listType = element.__listType;
                    break;
                }
                element = element.getParent();
            }
            setIsBulletList(foundList && listType === 'bullet');
            setIsNumberList(foundList && listType === 'number');
        }
    }, []);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => updateToolbar());
        });
    }, [editor, updateToolbar]);

    const toggleList = (type) => {
        const command = type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND;
        const isActive = type === 'bullet' ? isBulletList : isNumberList;
        if (isActive) {
            editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
            editor.dispatchCommand(command, undefined);
        }
    };

    const formatHeading = (headingSize) => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createHeadingNode(headingSize));
            }
        });
    };

    const formatQuote = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createQuoteNode());
            }
        });
    };

    const formatParagraph = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                $setBlocksType(selection, () => $createParagraphNode());
            }
        });
    };

    const handleInsertLink = () => {
        if (isLink) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
            setShowLinkModal(false);
        } else if (linkUrl.trim()) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
            setShowLinkModal(false);
            setLinkUrl('');
        }
    };

    const applyColor = (color) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
            const nodes = selection.getNodes();
            const anchorOffset = selection.anchor.offset;
            const focusOffset = selection.focus.offset;
            const isBackward = selection.isBackward();
            const startOffset = isBackward ? focusOffset : anchorOffset;
            const endOffset = isBackward ? anchorOffset : focusOffset;

            nodes.forEach((node, index) => {
                if (!$isTextNode(node)) return;
                const isFirst = index === 0;
                const isLast = index === nodes.length - 1;
                const nodeLength = node.getTextContentSize();
                let targetNode = node;
                let sliceStart = 0;
                let sliceEnd = nodeLength;

                if (isFirst && isLast) {
                    sliceStart = Math.min(startOffset, endOffset);
                    sliceEnd = Math.max(startOffset, endOffset);
                } else if (isFirst) {
                    sliceStart = startOffset; sliceEnd = nodeLength;
                } else if (isLast) {
                    sliceStart = 0; sliceEnd = endOffset;
                }

                if (sliceStart > 0) {
                    const [, rightNode] = node.splitText(sliceStart);
                    if (rightNode) { targetNode = rightNode; sliceEnd -= sliceStart; }
                }
                if (sliceEnd < targetNode.getTextContentSize()) {
                    const [leftNode] = targetNode.splitText(sliceEnd);
                    if (leftNode) targetNode = leftNode;
                }

                const existingStyle = targetNode.getStyle() || '';
                const styleWithoutColor = existingStyle.replace(/color:\s*[^;]+;?/gi, '').trim();
                targetNode.setStyle(styleWithoutColor ? `${styleWithoutColor}; color: ${color}` : `color: ${color}`);
            });
        });
        setCurrentColor(color);
    };

    const applyFontSize = (size) => {
        console.log('[ToolbarPlugin] Applying font size:', size);
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                console.warn('[ToolbarPlugin] No range selection found');
                return;
            }

            const nodes = selection.getNodes();
            const anchorOffset = selection.anchor.offset;
            const focusOffset = selection.focus.offset;
            const isBackward = selection.isBackward();
            const startOffset = isBackward ? focusOffset : anchorOffset;
            const endOffset = isBackward ? anchorOffset : focusOffset;

            nodes.forEach((node, index) => {
                if (!$isTextNode(node)) return;

                const isFirst = index === 0;
                const isLast = index === nodes.length - 1;
                const nodeLength = node.getTextContentSize();

                let targetNode = node;
                let sliceStart = 0;
                let sliceEnd = nodeLength;

                if (isFirst && isLast) {
                    sliceStart = Math.min(startOffset, endOffset);
                    sliceEnd = Math.max(startOffset, endOffset);
                } else if (isFirst) {
                    sliceStart = startOffset;
                    sliceEnd = nodeLength;
                } else if (isLast) {
                    sliceStart = 0;
                    sliceEnd = endOffset;
                }

                if (sliceStart > 0) {
                    const [, rightNode] = node.splitText(sliceStart);
                    if (rightNode) {
                        targetNode = rightNode;
                        sliceEnd -= sliceStart;
                    }
                }

                if (sliceEnd < targetNode.getTextContentSize()) {
                    const [leftNode] = targetNode.splitText(sliceEnd);
                    if (leftNode) {
                        targetNode = leftNode;
                    }
                }

                const existingStyle = targetNode.getStyle() || '';
                const styleWithoutSize = existingStyle.replace(/font-size:\s*[^;]+;?/gi, '').trim();
                const newStyle = styleWithoutSize
                    ? `${styleWithoutSize}; font-size: ${size}`
                    : `font-size: ${size}`;

                targetNode.setStyle(newStyle);
            });
        });
        setCurrentFontSize(size);
        setShowFontSizePicker(false);
    };

    return (
        <>
            <div className="toolbar">
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} className={`tb ${isBold ? 'active' : ''}`} title="Negrita"><MdFormatBold /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} className={`tb ${isItalic ? 'active' : ''}`} title="Cursiva"><MdFormatItalic /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} className={`tb ${isUnderline ? 'active' : ''}`} title="Subrayado"><MdFormatUnderlined /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} className={`tb ${isStrikethrough ? 'active' : ''}`} title="Tachado"><MdFormatStrikethrough /></button>

                <div className="divider" />

                <button
                    type="button"
                    ref={colorBtnRef}
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="tb"
                    title="Color"
                    style={{ borderBottom: `3px solid ${currentColor}` }}
                >
                    <MdFormatColorText />
                </button>

                <button
                    type="button"
                    ref={fontSizeBtnRef}
                    onClick={() => setShowFontSizePicker(!showFontSizePicker)}
                    className="tb font-size-btn"
                    title="Tamaño de fuente"
                >
                    <MdTextFields />
                    <span>{currentFontSize}</span>
                </button>

                <div className="divider" />

                <button type="button" onClick={() => formatHeading('h1')} className="tb" title="Título 1" style={{ fontWeight: '900' }}>H1</button>
                <button type="button" onClick={() => formatHeading('h2')} className="tb" title="Título 2" style={{ fontWeight: '700' }}>H2</button>
                <button type="button" onClick={() => formatHeading('h3')} className="tb" title="Título 3" style={{ fontWeight: '500' }}>H3</button>
                <button type="button" onClick={formatParagraph} className="tb" title="Texto normal"><MdFormatSize /></button>
                <button type="button" onClick={formatQuote} className="tb" title="Cita"><MdFormatQuote /></button>

                <div className="divider" />

                <button type="button" onClick={() => toggleList('bullet')} className={`tb ${isBulletList ? 'active' : ''}`} title="Lista"><MdFormatListBulleted /></button>
                <button type="button" onClick={() => toggleList('number')} className={`tb ${isNumberList ? 'active' : ''}`} title="Numerada"><MdFormatListNumbered /></button>

                <div className="divider" />

                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} className="tb" title="Izquierda"><MdFormatAlignLeft /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} className="tb" title="Centro"><MdFormatAlignCenter /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} className="tb" title="Derecha"><MdFormatAlignRight /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')} className="tb" title="Justificado"><MdFormatAlignJustify /></button>

                <div className="divider" />

                <button type="button" onClick={() => isLink ? editor.dispatchCommand(TOGGLE_LINK_COMMAND, null) : setShowLinkModal(true)} className={`tb ${isLink ? 'active' : ''}`} title={isLink ? 'Quitar link' : 'Insertar link'}><MdLink /></button>
                <button type="button" onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')} className={`tb ${isCode ? 'active' : ''}`} title="Código"><MdCode /></button>

                <div className="divider" />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="tb"
                    title="Adjuntar archivo"
                >
                    <MdAttachFile />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                            editor.dispatchCommand(INSERT_FILE_COMMAND, { file });
                        });
                        e.target.value = ''; // Reset input
                    }}
                />
            </div>

            {/* Color Picker Portal */}
            {showColorPicker && colorBtnRef.current && createPortal(
                <>
                    <div
                        className="editor-modal-overlay"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowColorPicker(false);
                        }}
                    />
                    <div
                        className="color-picker-simple"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            top: colorBtnRef.current.getBoundingClientRect().bottom + 4,
                            left: colorBtnRef.current.getBoundingClientRect().left,
                            zIndex: 10000
                        }}
                    >
                        <ChromePicker
                            color={currentColor}
                            onChange={(color) => setCurrentColor(color.hex)}
                            onChangeComplete={(color) => applyColor(color.hex)}
                            disableAlpha
                        />
                    </div>
                </>,
                document.body
            )}

            {/* Font Size Picker Portal */}
            {showFontSizePicker && fontSizeBtnRef.current && createPortal(
                <>
                    <div
                        className="editor-modal-overlay"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowFontSizePicker(false);
                        }}
                    />
                    <div
                        className="editor-font-size-picker"
                        onMouseDown={(e) => e.preventDefault()}
                        style={{
                            position: 'fixed',
                            top: fontSizeBtnRef.current.getBoundingClientRect().bottom + 4,
                            left: fontSizeBtnRef.current.getBoundingClientRect().left,
                            zIndex: 10000
                        }}
                    >
                        {FONT_SIZES.map(size => (
                            <button
                                type="button"
                                key={size}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => applyFontSize(size)}
                                className={`size-option ${currentFontSize === size ? 'active' : ''}`}
                                style={{ fontSize: size }}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}

            {/* Link Modal Portal */}
            {showLinkModal && createPortal(
                <>
                    <div
                        className="editor-modal-overlay"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowLinkModal(false);
                        }}
                    />
                    <div className="editor-link-modal">
                        <h3>Insertar Link</h3>
                        <input
                            type="url"
                            placeholder="https://ejemplo.com"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button type="button" onClick={() => setShowLinkModal(false)} className="btn-cancel">Cancelar</button>
                            <button type="button" onClick={handleInsertLink} className="btn-insert">Insertar</button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
