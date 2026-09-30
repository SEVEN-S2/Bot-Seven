import './../config.js'
import axios from 'axios'
import { askAI } from './tools-ia.js'

// ============================================
// 🔴 MODO AUSENTE COMPLETO - BOT SEVEN
// ============================================

global.modoAusente = global.modoAusente || false
global.modoAusenteVoz = global.modoAusenteVoz || false
global.modoAusenteIA = global.modoAusenteIA || false

// Mensagem de resposta automática padrão (Texto)
const MENSAGEM_AUSENTE = `╭━━━〔 🔴 *AVISO IMPORTANTE* 〕━━━⬣
┃
┃ ❌ *ESTE USUÁRIO ENCONTRA-SE*
┃ ❌ *INDISPONÍVEL NO MOMENTO.*
┃
┃ 🕐 *VOLTE MAIS TARDE!*
┃
┃ 🤖 Mensagem automática do BOT SEVEN
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`

/**
 * Converte texto em áudio MP3 utilizando Google Text-to-Speech (TTS)
 */
async function getTTSAudio(text, lang = 'pt') {
  let spokenText = text.replace(/[*_~`╭┃╰━〔〕⬣]/g, '').trim()
  if (spokenText.length > 200) {
    spokenText = spokenText.slice(0, 197) + '...'
  }
  let url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(spokenText)}&tl=${lang}&client=tw-ob`
  let res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    responseType: 'arraybuffer',
    timeout: 10000
  })
  return Buffer.from(res.data)
}

/**
 * Gera uma resposta contextualizada usando IA se o dono estiver ausente
 */
async function getOfflineIAReply(chatId, userText) {
  let prompt = `[SISTEMA: O usuário que você representa (dono do bot) está AUSENTE/INDISPONÍVEL no momento. Responda de forma muito curta (máximo 2 frases) com educação, avisando que o dono visualizará em breve.]\n\nMensagem do contato: "${userText}"`
  try {
    // Timeout ultra-rápido de 2.5 segundos para resposta instantânea
    let timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('IA Timeout')), 2500))
    let reply = await Promise.race([askAI(chatId, prompt), timeoutPromise])
    return reply
  } catch (err) {
    console.warn('[MODO AUSENTE IA FALLBACK INSTANTÂNEO]:', err.message)
    return null
  }
}

let handler = async (m, { conn, args, isOwner, usedPrefix, command }) => {
  if (!isOwner) {
    return m.reply('⛔ Este comando é restrito apenas ao dono do Bot!')
  }

  let sub = (args[0] || '').toLowerCase()

  if (sub === 'on' || sub === 'ativar') {
    global.modoAusente = true
    return m.reply(`✅ *MODO AUSENTE ATIVADO!*`)
  }

  if (sub === 'off' || sub === 'desativar') {
    global.modoAusente = false
    return m.reply(`🔴 *MODO AUSENTE DESATIVADO!*`)
  }

  if (sub === 'voz' || sub === 'audio') {
    global.modoAusenteVoz = !global.modoAusenteVoz
    if (global.modoAusenteVoz) global.modoAusente = true
    return m.reply(
      `🗣️ *RESPOSTA EM ÁUDIO (TTS)*: ${global.modoAusenteVoz ? '✅ *ATIVADA*' : '❌ *DESATIVADA*'}\n` +
      `📌 *Modo Ausente:* ${global.modoAusente ? '🟢 ATIVADO' : '🔴 DESATIVADO'}\n\n` +
      `${global.modoAusenteVoz ? '🎙️ Respostas serão enviadas em formato de ÁUDIO.' : '💬 Respostas serão enviadas em TEXTO.'}`
    )
  }

  if (sub === 'ia' || sub === 'gemini' || sub === 'ai') {
    global.modoAusenteIA = !global.modoAusenteIA
    if (global.modoAusenteIA) global.modoAusente = true
    return m.reply(
      `🧠 *RESPOSTA INTELIGENTE COM IA*: ${global.modoAusenteIA ? '✅ *ATIVADA*' : '❌ *DESATIVADA*'}\n` +
      `📌 *Modo Ausente:* ${global.modoAusente ? '🟢 ATIVADO' : '🔴 DESATIVADO'}\n\n` +
      `${global.modoAusenteIA ? '🤖 A IA responderá às dúvidas avisando que você está ausente.' : '📜 Será enviada a mensagem padrão.'}`
    )
  }

  if (sub === 'status' || sub === 'info') {
    return m.reply(
      `╭━━━〔 🔴 *PAINEL MODO AUSENTE* 〕━━━⬣\n` +
      `┃ 📌 *Estado Geral:* ${global.modoAusente ? '🟢 ATIVADO' : '🔴 DESATIVADO'}\n` +
      `┃ 🗣️ *Modo Voz (TTS):* ${global.modoAusenteVoz ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
      `┃ 🧠 *Modo IA (Gemini):* ${global.modoAusenteIA ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣\n\n` +
      `💡 *Comandos:* \n` +
      `• *${usedPrefix}${command} on / off* → Ativar ou Desativar\n` +
      `• *${usedPrefix}${command} voz* → Alternar modo Voz (Áudio)\n` +
      `• *${usedPrefix}${command} ia* → Alternar modo IA (Gemini)`
    )
  }

  // Alterna o estado mestre se não passou subcomando
  global.modoAusente = !global.modoAusente

  if (global.modoAusente) {
    await m.reply(
      `╭━━━〔 ✅ *MODO AUSENTE ATIVADO* 〕━━━⬣\n` +
      `┃\n` +
      `┃ 🔴 Responderei automaticamente a qualquer\n` +
      `┃ 🔴 mensagem privada recebida.\n` +
      `┃\n` +
      `┃ 🗣️ *Áudio (TTS):* ${global.modoAusenteVoz ? '✅ ON' : '❌ OFF'}\n` +
      `┃ 🧠 *IA (Gemini):* ${global.modoAusenteIA ? '✅ ON' : '❌ OFF'}\n` +
      `┃\n` +
      `┃ 📌 Desativar: *${usedPrefix}${command} off*\n` +
      `┃ 💡 Opções: *${usedPrefix}${command} voz* | *${usedPrefix}${command} ia*\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`
    )
  } else {
    await m.reply(
      `╭━━━〔 🟢 *MODO AUSENTE DESATIVADO* 〕━━━⬣\n` +
      `┃\n` +
      `┃ 🟢 Respostas automáticas desligadas.\n` +
      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`
    )
  }
}

handler.help = ['ausente [on/off/voz/ia/status]']
handler.tags = ['tools']
handler.command = ['ausente', 'offline', 'away']
handler.owner = true

export default handler
export { MENSAGEM_AUSENTE, getTTSAudio, getOfflineIAReply }
