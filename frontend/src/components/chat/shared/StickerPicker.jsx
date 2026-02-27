import React, { useState } from 'react';
import './StickerPicker.scss';

const STICKER_SETS = [
    {
        id: 'caras',
        name: 'Caras',
        stickers: [
            { id: 'c1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp', name: 'Grinning' },
            { id: 'c2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp', name: 'Joy' },
            { id: 'c3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp', name: 'Heart Eyes' },
            { id: 'c4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp', name: 'Cool' },
            { id: 'c5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.webp', name: 'Party' },
            { id: 'c6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp', name: 'Kiss' },
            { id: 'c7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f607/512.webp', name: 'Angel' },
            { id: 'c8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.webp', name: 'Exploding Head' },
            { id: 'c9', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.webp', name: 'Scream' },
            { id: 'c10', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.webp', name: 'Sob' },
            { id: 'c11', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f621/512.webp', name: 'Rage' },
            { id: 'c12', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp', name: 'Star Struck' },
            { id: 'c13', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f644/512.webp', name: 'Eyes Roll' },
            { id: 'c14', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp', name: 'ROFL' },
            { id: 'c15', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f970/512.webp', name: 'Smiling with Hearts' },
            { id: 'c16', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae1/512.webp', name: 'Salute' },
            { id: 'c17', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1fae3/512.webp', name: 'Peeking' },
            { id: 'c18', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92d/512.webp', name: 'Hand over mouth' },
            { id: 'c19', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9d0/512.webp', name: 'Monocle' },
            { id: 'c20', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f634/512.webp', name: 'Sleeping' },
        ]
    },
    {
        id: 'gestos',
        name: 'Gestos',
        stickers: [
            { id: 'g1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.webp', name: 'Thumbs Up' },
            { id: 'g2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44e/512.webp', name: 'Thumbs Down' },
            { id: 'g3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44b/512.webp', name: 'Wave' },
            { id: 'g4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.webp', name: 'Clap' },
            { id: 'g5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4aa/512.webp', name: 'Flex' },
            { id: 'g6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44c/512.webp', name: 'OK' },
            { id: 'g7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.webp', name: 'Thanks' },
            { id: 'g8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64c/512.webp', name: 'Hands Up' },
            { id: 'g9', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f91d/512.webp', name: 'Handshake' },
            { id: 'g10', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f440/512.webp', name: 'Eyes' },
            { id: 'g11', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2705/512.webp', name: 'Check' },
            { id: 'g12', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/274c/512.webp', name: 'Cross' },
            { id: 'g13', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/270b/512.webp', name: 'Raised Hand' },
            { id: 'g14', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/270c/512.webp', name: 'Victory' },
            { id: 'g15', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp', name: 'Thinking' },
            { id: 'g16', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f911/512.webp', name: 'Money Mouth' },
        ]
    },
    {
        id: 'office',
        name: 'Oficina',
        stickers: [
            { id: 'o1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp', name: 'Rocket' },
            { id: 'o2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a1/512.webp', name: 'Idea' },
            { id: 'o3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3af/512.webp', name: 'Target' },
            { id: 'o4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.webp', name: 'Trophy' },
            { id: 'o5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2615/512.webp', name: 'Coffee' },
            { id: 'o6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2699/512.webp', name: 'Gear' },
            { id: 'o7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f512/512.webp', name: 'Lock' },
            { id: 'o8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4a3/512.webp', name: 'Bomb' },
            { id: 'o9', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.webp', name: '100' },
            { id: 'o10', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/512.webp', name: 'Money Wings' },
            { id: 'o11', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f514/512.webp', name: 'Bell' },
            { id: 'o12', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b2/512.webp', name: 'Dice' },
            { id: 'o13', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f590/512.webp', name: 'Hand Splayed' },
            { id: 'o14', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/23f0/512.webp', name: 'Alarm' },
            { id: 'o15', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4e2/512.webp', name: 'Loudspeaker' },
            { id: 'o16', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4c8/512.webp', name: 'Chart' },
        ]
    },
    {
        id: 'vida',
        name: 'Vida',
        stickers: [
            { id: 'v1', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.webp', name: 'Fire' },
            { id: 'v2', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.webp', name: 'Tada' },
            { id: 'v3', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f382/512.webp', name: 'Cake' },
            { id: 'v4', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f31f/512.webp', name: 'Star' },
            { id: 'v5', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.webp', name: 'Sparkles' },
            { id: 'v6', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f388/512.webp', name: 'Balloon' },
            { id: 'v7', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp', name: 'Heart' },
            { id: 'v8', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f494/512.webp', name: 'Broken Heart' },
            { id: 'v9', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f422/512.webp', name: 'Turtle' },
            { id: 'v10', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.webp', name: 'Unicorn' },
            { id: 'v11', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f415/512.webp', name: 'Dog' },
            { id: 'v12', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.webp', name: 'Cat' },
            { id: 'v13', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47b/512.webp', name: 'Ghost' },
            { id: 'v14', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.webp', name: 'Robot' },
            { id: 'v15', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f47d/512.webp', name: 'Alien' },
            { id: 'v16', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f308/512.webp', name: 'Rainbow' },
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
                        type="button"
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
