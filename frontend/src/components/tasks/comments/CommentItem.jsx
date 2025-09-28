import React from 'react'
import { FaReply } from 'react-icons/fa'
import ReplyPreview from './ReplyPreview'
import AttachList from './AttachList'

export default function CommentItem({
  c, author, isMine, timeAgo, fmtDateTime, onReply, renderContenido, renderReplyExcerpt
}){
  // debug opcional
  // console.log({ isMine, serverFlag: c.is_mine, author, c })

  return (
    <div className={`bubble ${isMine ? 'mine' : ''}`}>
      <button className="replyIco" aria-label="Responder" title="Responder" onClick={onReply}>
        <FaReply aria-hidden="true" />
      </button>

      <div className="meta" title={fmtDateTime(c.created_at)}>
        <b className="author">{author}</b>
        <span className="dot">•</span>
        <span className="fecha">
          {fmtDateTime(c.created_at)} <span className="muted">({timeAgo(c.created_at)})</span>
        </span>
        {c.tipo_codigo && <><span className="dot">•</span><span className="tipo">{c.tipo_codigo}</span></>}
      </div>

      {c.reply_to && (
        <ReplyPreview
          autor={c.reply_to.autor}
          excerptHtml={renderReplyExcerpt(c.reply_to.excerpt || '')}
        />
      )}

      <div className="txt" dangerouslySetInnerHTML={renderContenido(c.contenido, c.menciones)} />

      {!!(c.adjuntos?.length) && <AttachList items={c.adjuntos} />}
    </div>
  )
}
