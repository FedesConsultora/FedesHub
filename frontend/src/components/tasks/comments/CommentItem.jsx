import React from 'react'
import { FaReply } from 'react-icons/fa'
import ReplyPreview from './ReplyPreview'
import AttachList from './AttachList'

import CommentReactionBar from './CommentReactionBar'

export default function CommentItem({
  c, author, feders, isMine, timeAgo, fmtDateTime, onReply, onToggleReaction, renderContenido, renderReplyExcerpt, avatarNode
}) {
  // debug opcional
  // console.log({ isMine, serverFlag: c.is_mine, author, c })

  return (
    <div className={`bubble ${isMine ? 'mine' : ''}`}>
      {avatarNode}
      <button className="replyIco" aria-label="Responder" title="Responder" onClick={onReply}>
        <FaReply aria-hidden="true" />
      </button>

      <div className="author-row">
        <b className="author-name">{author}</b>
        <span className="time-ago">{timeAgo(c.created_at)}</span>
      </div>

      {c.reply_to && (
        <ReplyPreview
          autor={c.reply_to.autor}
          excerptHtml={renderReplyExcerpt(c.reply_to.excerpt || '')}
        />
      )}

      <div className="txt" dangerouslySetInnerHTML={renderContenido(c.contenido, c.menciones)} />

      {!!(c.adjuntos?.length) && <AttachList items={c.adjuntos} />}

      <CommentReactionBar
        c={c}
        feders={feders}
        onToggle={(emoji, on) => onToggleReaction(c.id, emoji, on)}
      />
    </div>
  )
}
