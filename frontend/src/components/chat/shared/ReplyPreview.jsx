import React from 'react'
import { FaReply } from 'react-icons/fa'
import { displayName } from '../../../utils/people'

export default function ReplyPreview({ autor, excerptHtml }){
  const name = typeof autor === 'string' ? autor : (displayName(autor) || 'alguien')
  return (
    <div className="replyPreview" title={typeof excerptHtml === 'string' ? excerptHtml : undefined}>
      <FaReply className="ico" aria-hidden="true" />
      <span className="label">Responde a</span>
      <b className="replyAuthor">{name}</b>
      <span className="muted"> — </span>
      <span className="replyExcerpt" dangerouslySetInnerHTML={excerptHtml} />
    </div>
  )
}
