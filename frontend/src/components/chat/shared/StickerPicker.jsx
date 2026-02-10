import React, { useState } from 'react';
import './StickerPicker.scss';

const STICKER_SETS = [
    {
        id: 'fedes-classic',
        name: 'Fedes Classic',
        stickers: [
            { id: 's1', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584606.png', name: 'Thumbs Up' },
            { id: 's2', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584612.png', name: 'Rocket' },
            { id: 's3', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584616.png', name: 'Target' },
            { id: 's4', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584644.png', name: 'Success' },
            { id: 's5', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584652.png', name: 'Idea' },
            { id: 's6', url: 'https://cdn-icons-png.flaticon.com/512/2584/2584660.png', name: 'Excellent' },
        ]
    },
    {
        id: 'fedes-fun',
        name: 'Fedes Fun',
        stickers: [
            { id: 'f1', url: 'https://cdn-icons-png.flaticon.com/512/1791/1791330.png', name: 'Biking' },
            { id: 'f2', url: 'https://cdn-icons-png.flaticon.com/512/1791/1791307.png', name: 'Winner' },
            { id: 'f3', url: 'https://cdn-icons-png.flaticon.com/512/1791/1791341.png', name: 'Coffee' },
        ]
    }
];

export default function StickerPicker({ onSelect }) {
    const [activeSet, setActiveSet] = useState(STICKER_SETS[0].id);

    const currentSet = STICKER_SETS.find(s => s.id === activeSet);

    return (
        <div className="fh-stickerPicker">
            <div className="sticker-categories">
                {STICKER_SETS.map(set => (
                    <button
                        key={set.id}
                        className={`category-btn ${activeSet === set.id ? 'active' : ''}`}
                        onClick={() => setActiveSet(set.id)}
                    >
                        {set.name}
                    </button>
                ))}
            </div>
            <div className="sticker-grid">
                {currentSet.stickers.map(sticker => (
                    <div
                        key={sticker.id}
                        className="sticker-item"
                        onClick={() => onSelect(sticker)}
                        title={sticker.name}
                    >
                        <img src={sticker.url} alt={sticker.name} loading="lazy" />
                    </div>
                ))}
            </div>
        </div>
    );
}
