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
} from 'lexical';
import {
    INSERT_TABLE_COMMAND,
} from '@lexical/table';
import {
    INSERT_CHECK_LIST_COMMAND,
} from '@lexical/list';
import {
    MdTitle,
    MdFormatListBulleted,
    MdGridOn,
    MdFormatQuote,
    MdCheckBox
} from 'react-icons/md';

class SlashMenuItem extends TypeaheadOption {
    constructor(title, { icon, onSelect }) {
        super(title);
        this.title = title;
        this.icon = icon;
        this.onSelect = onSelect;
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
    if (isSelected) {
        className += ' selected';
    }
    return (
        <li
            key={option.key}
            tabIndex={-1}
            className={className}
            ref={option.setRefElement}
            onMouseEnter={onMouseEnter}
            onClick={onClick}>
            <span className="icon">{option.icon}</span>
            <span className="text">{option.title}</span>
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
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createHeadingNode('h3'));
                        }
                    });
                },
            }),
            /* new SlashMenuItem('Tabla', {
                icon: <MdGridOn />,
                onSelect: () => {
                    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
                        columns: '3',
                        rows: '3',
                        includeHeader: true,
                    });
                },
            }), */
            new SlashMenuItem('Checklist', {
                icon: <MdCheckBox />,
                onSelect: () => {
                    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
                },
            }),
            new SlashMenuItem('Cita', {
                icon: <MdFormatQuote />,
                onSelect: () => {
                    editor.update(() => {
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            $setBlocksType(selection, () => $createQuoteNode());
                        }
                    });
                },
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
            triggerMatch={checkTriggerMatch}
            options={options}
            menuRenderFn={(
                anchorElementRef,
                { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
                anchorElementRef.current && options.length
                    ? ReactDOM.createPortal(
                        <div className="typeahead-menu slash-menu">
                            <ul>
                                {options.map((option, i) => (
                                    <SlashMenuItemElement
                                        key={option.key}
                                        index={i}
                                        isSelected={selectedIndex === i}
                                        onClick={() => {
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
                    : null
            }
        />
    );
}
