import React from 'react'
import { FaReply } from 'react-icons/fa'

export default function ReplyPreview({ autor, excerptHtml }){
  return (
    <div className="replyPreview" title={typeof excerptHtml === 'string' ? excerptHtml : undefined}>
      <FaReply className="ico" aria-hidden="true" />
      <span className="label">Responde a</span>
      <b className="replyAuthor">{autor}</b>
      <span className="muted"> — </span>
      <span className="replyExcerpt" dangerouslySetInnerHTML={excerptHtml} />
    </div>
  )
}
