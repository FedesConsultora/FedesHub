import React from 'react'
import { FaReply } from 'react-icons/fa'

export default function ReplyPreview({ autor, excerptHtml }) {
  return (
    <div className="replyPreview">
      <FaReply className="ico" aria-hidden="true" />
      <span className="label">Responde a</span>
      <b className="replyAuthor">{autor}</b>
      <span className="replyExcerpt" dangerouslySetInnerHTML={excerptHtml} />
    </div>
  )
}
