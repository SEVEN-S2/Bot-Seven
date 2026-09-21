import {
  proto,
  downloadContentFromMessage,
  getContentType,
  jidDecode
} from '@whiskeysockets/baileys'
import { createSticker } from './sticker.js'

/**
 * Decodifica JID do WhatsApp
 */
export const decodeJid = (jid) => {
  if (!jid) return jid
  if (/:\d+@/gi.test(jid)) {
    const decode = jidDecode(jid) || {}
    return (decode.user && decode.server && `${decode.user}@${decode.server}`) || jid
  }
  return jid
}

/**
 * Faz o download do conteúdo de uma mensagem de mídia (Imagem, Vídeo, Áudio, Sticker, Documento)
 * @param {object} message 
 * @returns {Promise<Buffer>}
 */
export async function downloadMedia(message) {
  if (!message) return null
  let quoted = message.msg ? message.msg : message

  if (quoted.message) quoted = quoted.message
  if (quoted.ephemeralMessage) quoted = quoted.ephemeralMessage.message
  if (quoted.viewOnceMessage) quoted = quoted.viewOnceMessage.message
  if (quoted.viewOnceMessageV2) quoted = quoted.viewOnceMessageV2.message
  if (quoted.documentWithCaptionMessage) quoted = quoted.documentWithCaptionMessage.message

  let keys = Object.keys(quoted)
  let msgType = keys.find(k => k.endsWith('Message') && k !== 'extendedTextMessage') || keys[0]
  let mediaObj = quoted[msgType] || quoted

  let streamType = (msgType || '').replace('Message', '').toLowerCase()
  if (streamType === 'sticker') streamType = 'sticker'
  else if (streamType === 'image') streamType = 'image'
  else if (streamType === 'video') streamType = 'video'
  else if (streamType === 'audio') streamType = 'audio'
  else if (streamType === 'document') streamType = 'document'
  else if (/image/i.test(mediaObj.mimetype)) streamType = 'image'
  else if (/video/i.test(mediaObj.mimetype)) streamType = 'video'
  else if (/audio/i.test(mediaObj.mimetype)) streamType = 'audio'
  else streamType = 'image'

  try {
    const stream = await downloadContentFromMessage(mediaObj, streamType)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
  } catch (err) {
    console.error('Erro ao baixar mídia:', err)
    return null
  }
}

/**
 * Serializa a mensagem do Baileys para facilitar o manuseio nos plugins
 * @param {object} conn - Instância do Baileys Socket
 * @param {object} m - Mensagem bruta do Baileys
 */
export function smsg(conn, m) {
  if (!m) return m
  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat.endsWith('@g.us')
    m.sender = decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
    if (m.isGroup) m.participant = decodeJid(m.key.participant) || ''
  }

  if (m.message) {
    m.mtype = getContentType(m.message)
    m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
    
    // Extração do texto
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''

    // Resposta citada (Quoted)
    const quoted = m.msg?.contextInfo ? m.msg.contextInfo.quotedMessage : null
    m.mentionedJid = m.msg?.contextInfo ? m.msg.contextInfo.mentionedJid : []

    if (quoted) {
      const type = getContentType(quoted)
      m.quoted = quoted[type]
      if (['productMessage'].includes(type)) {
        m.quoted = quoted[type]?.product
      }
      if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
      if (m.quoted) {
        m.quoted.mtype = type
        m.quoted.id = m.msg.contextInfo.stanzaId
        m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
        m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
        m.quoted.sender = decodeJid(m.msg.contextInfo.participant)
        m.quoted.fromMe = m.quoted.sender === (conn.user && conn.user.id)
        m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || ''
        m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        m.quoted.download = () => downloadMedia(quoted)
      }
    }
  }

  // Método auxiliar para download da mídia da mensagem atual
  m.download = () => downloadMedia(m.message)

  // Método de resposta simplificada
  m.reply = (text, chatId = m.chat, options = {}) => {
    return conn.sendMessage(chatId, { text, ...options }, { quoted: m })
  }

  // Método para reagir à mensagem
  m.react = (emoji) => {
    return conn.sendMessage(m.chat, {
      react: {
        text: emoji,
        key: m.key
      }
    })
  }

  return m
}

/**
 * Estende o socket do Baileys com helpers
 * @param {object} conn 
 */
export function extendSocket(conn) {
  conn.decodeJid = decodeJid

  /**
   * Envia figurinha a partir de buffer
   */
  conn.sendSticker = async (jid, stickerBuffer, quoted, options = {}) => {
    return conn.sendMessage(jid, {
      sticker: stickerBuffer,
      ...options
    }, { quoted })
  }

  /**
   * Converte e envia como figurinha
   */
  conn.sendImageAsSticker = async (jid, mediaBuffer, isVideo = false, quoted, packname, author) => {
    const stickerBuff = await createSticker(mediaBuffer, isVideo, packname, author)
    return conn.sendSticker(jid, stickerBuff, quoted)
  }

  return conn
}
