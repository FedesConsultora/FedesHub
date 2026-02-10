// src/components/common/EmojiPicker.jsx
import { useEffect, useRef, memo } from 'react'
import EmojiPickerLib from 'emoji-picker-react'
import './EmojiPicker.scss'

const EmojiPicker = memo(function EmojiPicker({
  onSelect,
  theme = 'dark',
  onClickOutside,
  width = '350px',
  height = '450px'
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!onClickOutside) return
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClickOutside?.()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [onClickOutside])

  return (
    <div ref={ref} className="fh-emojiPicker-pop">
      <EmojiPickerLib
        theme={theme}
        width={width}
        height={height}
        emojiStyle='apple'
        lazyLoadEmojis
        previewConfig={{ showPreview: false }}
        searchDisabled={false}
        searchPlaceholder="    Buscar..."
        skinTonesDisabled={false}
        suggestedEmojisMode="recent"
        onEmojiClick={(e) => onSelect?.(e?.emoji)}
      />
    </div>
  )
})

export default EmojiPicker
