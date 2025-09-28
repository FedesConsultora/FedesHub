// /frontend/src/pages/Chat/ChatPage.jsx
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import ChatBoard from '../../components/chat/ChatBoard'

export default function ChatPage() {
  return (
    <Routes>
      <Route index element={<ChatBoard />} />
      <Route path="c/:id" element={<ChatBoardWrap />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}

function ChatBoardWrap(){
  const { id } = useParams()
  return <ChatBoard selectedId={Number(id)} />
}