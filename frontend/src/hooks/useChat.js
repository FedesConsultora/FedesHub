// /src/hooks/useChat.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi } from '../api/chat'
import { useEffect } from 'react'

// ---------- DMs (candidatos)
export function useDmCandidates() {
  return useQuery({
    queryKey: ['chat', 'dms'],
    queryFn: () => chatApi.dmsList(),
    staleTime: 60_000
  })
}

export function useChatCatalog() {
  return useQuery({ queryKey: ['chat', 'catalog'], queryFn: chatApi.catalog })
}

export function useChannels(params = {}) {
  return useQuery({
    queryKey: ['chat', 'channels', params],
    queryFn: () => chatApi.channels.list(params),
    staleTime: 15_000
  })
}

export function useChannelMembers(canal_id) {
  return useQuery({
    queryKey: ['chat', 'members', canal_id],
    queryFn: () => chatApi.channels.members.list(canal_id),
    enabled: !!canal_id
  })
}

export function useMessages(canal_id, params = {}) {
  return useQuery({
    queryKey: ['chat', 'msgs', canal_id, params],
    queryFn: () => chatApi.messages.list(canal_id, params),
    enabled: !!canal_id,
    keepPreviousData: true
  })
}

/* ---- Mutaciones mensajes */
export function useSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id, body, isMultipart }) =>
      isMultipart ? chatApi.messages.createMultipart(canal_id, body)
        : chatApi.messages.create(canal_id, body),
    onSuccess: (row, vars) => {
      qc.invalidateQueries({ queryKey: ['chat', 'msgs', vars.canal_id] })
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
    }
  })
}

export function useEditMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mensaje_id, body_text }) =>
      chatApi.messages.update(mensaje_id, { body_text }),
    onSuccess: (_r, { canal_id }) => {
      if (canal_id) {
        qc.invalidateQueries({ queryKey: ['chat', 'msgs', canal_id] })
        qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
        qc.invalidateQueries({ queryKey: ['chat', 'dms'] })
      }
    }
  })
}

export function useDeleteMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mensaje_id }) =>
      chatApi.messages.delete(mensaje_id),
    onSuccess: (_r, { canal_id }) => {
      if (canal_id) {
        qc.invalidateQueries({ queryKey: ['chat', 'msgs', canal_id] })
        qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
        qc.invalidateQueries({ queryKey: ['chat', 'dms'] })
      }
    }
  })
}

export function useTyping() {
  return useMutation({
    mutationFn: ({ canal_id, on, ttl_seconds = 5 }) => chatApi.presence.typing(canal_id, on, ttl_seconds)
  })
}

export function useSetRead() {
  return useMutation({
    mutationFn: ({ canal_id, last_read_msg_id }) => chatApi.read.set(canal_id, last_read_msg_id)
  })
}

export function useToggleReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mensaje_id, emoji, on = true }) =>
      chatApi.messages.react(mensaje_id, { emoji, on }),
    onSuccess: (_r, { canal_id }) => {
      if (canal_id) qc.invalidateQueries({ queryKey: ['chat', 'msgs', canal_id] })
    }
  })
}

/* ---- NUEVO: update de canal (PUT vs PATCH /settings) */
export function useUpdateChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ canal, patch }) => {
      const touchesNameOrSlug = Object.prototype.hasOwnProperty.call(patch, 'nombre') ||
        Object.prototype.hasOwnProperty.call(patch, 'slug')
      if (touchesNameOrSlug) {
        const body = {
          id: canal.id,
          tipo_codigo: canal?.tipo?.codigo || 'canal',
          nombre: patch.nombre ?? canal.nombre ?? null,
          slug: patch.slug ?? canal.slug ?? null,
          topic: (Object.prototype.hasOwnProperty.call(patch, 'topic') ? patch.topic : canal.topic) ?? null,
          is_privado: (Object.prototype.hasOwnProperty.call(patch, 'is_privado') ? !!patch.is_privado : !!canal.is_privado),
          only_mods_can_post: (Object.prototype.hasOwnProperty.call(patch, 'only_mods_can_post') ? !!patch.only_mods_can_post : !!canal.only_mods_can_post),
          slowmode_seconds: canal?.slowmode_seconds ?? 0
        }
        return chatApi.channels.update(canal.id, body)
      }
      // caso liviano -> settings
      return chatApi.channels.settings(canal.id, patch)
    },
    onSuccess: (_r, { canal }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
      qc.invalidateQueries({ queryKey: ['chat', 'members', canal.id] })
    }
  })
}

/* ---- NUEVO: subir avatar de canal */
export function useUploadChannelAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id, file }) => chatApi.channels.uploadAvatar(canal_id, file),
    onSuccess: (_r, { canal_id }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
    }
  })
}

/* ---- NUEVO: cambiar rol de un miembro */
export function usePatchMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id, user_id, rol_codigo }) =>
      chatApi.channels.members.patch(canal_id, user_id, { rol_codigo }),
    onSuccess: (_r, { canal_id }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'members', canal_id] })
    }
  })
}

/* ---- NUEVO: eliminar miembro de un canal */
export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id, user_id }) =>
      chatApi.channels.members.remove(canal_id, user_id),
    onSuccess: (_r, { canal_id }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'members', canal_id] })
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
    }
  })
}

/* ---- NUEVO: agregar miembro a un canal */
export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id, user_id, rol_codigo = 'member' }) =>
      chatApi.channels.members.upsert(canal_id, { user_id, rol_codigo }),
    onSuccess: (_r, { canal_id }) => {
      qc.invalidateQueries({ queryKey: ['chat', 'members', canal_id] })
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
    }
  })
}

export function useDeleteChannel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ canal_id }) =>
      chatApi.channels.delete(canal_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
      qc.invalidateQueries({ queryKey: ['chat', 'dms'] })
    }
  })
}

/* ---- Realtime (igual que tenías) */
export function useChatRealtime() {
  const qc = useQueryClient()
  useEffect(() => {
    const handler = (ev) => {
      const d = ev?.detail || {}
      const type = String(d?.type || '').toLowerCase()
      const cid = Number(d.canal_id || d?.canal?.id || 0) || null

      try {
        switch (type) {
          case 'chat.message.created':
          case 'chat.message.edited':
          case 'chat.message.deleted':
          case 'chat.message.reaction':
          case 'chat.channel.archived':
          case 'chat.channel.member': {
            if (cid) {
              qc.invalidateQueries({ queryKey: ['chat', 'msgs', cid] })
              qc.invalidateQueries({ queryKey: ['chat', 'members', cid] })
            }
            qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
            qc.invalidateQueries({ queryKey: ['chat', 'dms'] })
            break
          }
          case 'chat.channel.updated': {
            if (cid) {
              qc.invalidateQueries({ queryKey: ['chat', 'msgs', cid] })
              qc.invalidateQueries({ queryKey: ['chat', 'members', cid] })
            }
            qc.invalidateQueries({ queryKey: ['chat', 'channels'] })
            qc.invalidateQueries({ queryKey: ['chat', 'dms'] })
            break
          }
          case 'chat.channel.read': {
            if (cid) qc.invalidateQueries({ queryKey: ['chat', 'members', cid] })
            break
          }
          default: break
        }
      } catch { }
    }
    window.addEventListener('fh:push', handler)
    return () => window.removeEventListener('fh:push', handler)
  }, [qc])
}
