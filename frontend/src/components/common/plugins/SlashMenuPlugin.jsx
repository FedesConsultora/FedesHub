import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
    LexicalTypeaheadMenuPlugin,
    useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';

class TypeaheadOption {
    constructor(key) {
        this.key = key;
        this.refElement = null;
        this.setRefElement = (element) => {
            this.refElement = element;
        };
    }
}
import { useCallback, useMemo, useState } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
    $createHeadingNode,
    $createQuoteNode,
} from '@lexical/rich-text';
import {
    $setBlocksType,
} from '@lexical/selection';
import {
    $getSelection,
    $isRangeSelection,
    $createParagraphNode,
    $createTextNode,
} from 'lexical';
import {
    INSERT_CHECK_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import {
    MdTitle,
    MdFormatListBulleted,
    MdFormatListNumbered,
    MdFormatQuote,
    MdCheckBox,
    MdTextFields,
    MdHorizontalRule,
    MdAutoAwesome,
} from 'react-icons/md';

class SlashMenuItem extends TypeaheadOption {
    constructor(title, { icon, description, onSelect, disabled = false }) {
        super(title);
        this.title = title;
        this.icon = icon;
        this.description = description || '';
        this.onSelect = onSelect;
        this.disabled = disabled;
    }
}

function SlashMenuItemElement({
    index,
    isSelected,
    onClick,
    onMouseEnter,
    option,
}) {
    let className = 'item';
    if (isSelected) className += ' selected';
    if (option.disabled) className += ' disabled';

    return (
        <li
            key={option.key}
            tabIndex={-1}
            className={className}
            ref={option.setRefElement}
            onMouseEnter={onMouseEnter}
            onClick={option.disabled ? undefined : onClick}
        >
            <span className="icon">{option.icon}</span>
            <div className="text-wrap">
                <span className="text">{option.title}</span>
                {option.description && (
                    <span className="description">{option.description}</span>
                )}
            </div>
            {option.disabled && (
                <span className="badge-soon">Próximamente</span>
            )}
        </li>
    );
}

export default function SlashMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = useState(null);

    const checkTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
        minLength: 0,
    });

    const options = useMemo(() => {
        const baseOptions = [
            new SlashMenuItem('Título 1', {
                icon: <MdTitle />,
                description: 'Encabezado grande',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h1'));
                        }
                    });
                },
            }),
            new SlashMenuItem('Título 2', {
                icon: <MdTitle style={{ fontSize: '0.8em' }} />,
                description: 'Encabezado mediano',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h2'));
                        }
                    });
                },
            }),
            new SlashMenuItem('Título 3', {
                icon: <MdTitle style={{ fontSize: '0.6em' }} />,
                description: 'Encabezado pequeño',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h3'));
                        }
                    });
                },
            }),
            new SlashMenuItem('Texto normal', {
                icon: <MdTextFields />,
                description: 'Párrafo de texto',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createParagraphNode());
                        }
                    });
                },
            }),
            new SlashMenuItem('Lista con viñetas', {
                icon: <MdFormatListBulleted />,
                description: 'Lista desordenada',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
                },
            }),
            new SlashMenuItem('Lista numerada', {
                icon: <MdFormatListNumbered />,
                description: 'Lista ordenada',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
                },
            }),
            new SlashMenuItem('Checklist', {
                icon: <MdCheckBox />,
                description: 'Lista de verificación',
                onSelect: () => {
                    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
                },
            }),
            new SlashMenuItem('Cita', {
                icon: <MdFormatQuote />,
                description: 'Bloque de cita',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createQuoteNode());
                        }
                    });
                },
            }),
            new SlashMenuItem('Separador', {
                icon: <MdHorizontalRule />,
                description: 'Línea horizontal',
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            const anchor = selection.anchor.getNode();
                            const topLevel = anchor.getTopLevelElement();
                            if (topLevel) {
                                const hr = $createParagraphNode();
                                const hrText = $createTextNode('───────────────────');
                                hrText.setStyle('color: rgba(255,255,255,0.15); font-size: 10px; letter-spacing: 2px');
                                hr.append(hrText);
                                topLevel.insertAfter(hr);
                                // Add a new paragraph after the separator for continued editing
                                const newPara = $createParagraphNode();
                                hr.insertAfter(newPara);
                                newPara.selectStart();
                            }
                        }
                    });
                },
            }),
            new SlashMenuItem('Consultar a Gemini', {
                icon: <MdAutoAwesome />,
                description: 'Asistente IA para tareas',
                disabled: true,
                onSelect: () => { },
            }),
        ];

        if (queryString) {
            const regex = new RegExp(queryString, 'i');
            return baseOptions.filter((option) => regex.test(option.title));
        }

        return baseOptions;
    }, [editor, queryString]);

    const onSelectOption = useCallback(
        (selectedOption, nodeToRemove, closeMenu, matchingString) => {
            if (selectedOption.disabled) return;
            editor.update(() => {
                if (nodeToRemove) {
                    nodeToRemove.remove();
                }
                selectedOption.onSelect(matchingString);
                closeMenu();
            });
        },
        [editor],
    );

    return (
        <LexicalTypeaheadMenuPlugin
            onQueryChange={setQueryString}
            onSelectOption={onSelectOption}
            triggerFn={checkTriggerMatch}
            options={options}
            menuRenderFn={(
                anchorElementRef,
                { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) => {
                return anchorElementRef.current && options.length
                    ? ReactDOM.createPortal(
                        <div className="typeahead-menu slash-menu">
                            <ul>
                                {options.map((option, i) => (
                                    <SlashMenuItemElement
                                        key={option.key}
                                        index={i}
                                        isSelected={selectedIndex === i}
                                        onClick={() => {
                                            if (option.disabled) return;
                                            setHighlightedIndex(i);
                                            selectOptionAndCleanUp(option);
                                        }}
                                        onMouseEnter={() => {
                                            setHighlightedIndex(i);
                                        }}
                                        option={option}
                                    />
                                ))}
                            </ul>
                        </div>,
                        anchorElementRef.current,
                    )
                    : null;
            }}
        />
    );
}
