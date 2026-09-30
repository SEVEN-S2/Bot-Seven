import './../config.js'
import axios from 'axios'
import { askAI } from './tools-ia.js'

// ============================================
// 🔴 MODO AUSENTE COMPLETO - BOT SEVEN
// ============================================
// Opção 10: Resposta em áudio (TTS)
// Opção 11: Resposta inteligente com IA (Gemini)
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
  let res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 })
  return Buffer.from(res.data)
}

/**
 * Gera uma resposta contextualizada usando IA se o dono estiver ausente
 */
async function getOfflineIAReply(chatId, userText) {
  let prompt = `[SISTEMA: O usuário que você representa (dono do bot) está AUSENTE/INDISPONÍVEL no momento. Responda à mensagem do cliente/contato a seguir tirando dúvidas se possível com educação e simpatia, mas SEMPRE deixando claro que o dono está ausente e visualizará a mensagem assim que retornar.]\n\nMensagem do contato: "${userText}"`
  try {
    let reply = await askAI(chatId, prompt)
    return reply
  } catch (err) {
    console.warn('[MODO AUSENTE IA FALHOU]:', err.message)
    return null
  }
}

let handler = async (m, { conn, args, isOwner, usedPrefix, command }) => {
  if (!isOwner) {
    return m.reply('⛔ Este comando é restrito apenas ao dono do Bot!')
  }

  let sub = (args[0] || '').toLowerCase()

  if (sub === 'voz' || sub === 'audio') {
    global.modoAusenteVoz = !global.modoAusenteVoz
    return m.reply(
      `🗣️ *RESPOSTA EM ÁUDIO (TTS)*: ${global.modoAusenteVoz ? '✅ *ATIVADA*' : '❌ *DESATIVADA*'}\n\n` +
      `${global.modoAusenteVoz ? '🎙️ As respostas ausentes serão enviadas em formato de ÁUDIO de voz.' : '💬 As respostas ausentes serão enviadas em formato de TEXTO.'}`
    )
  }

  if (sub === 'ia' || sub === 'gemini' || sub === 'ai') {
    global.modoAusenteIA = !global.modoAusenteIA
    return m.reply(
      `🧠 *RESPOSTA INTELIGENTE COM IA*: ${global.modoAusenteIA ? '✅ *ATIVADA*' : '❌ *DESATIVADA*'}\n\n` +
      `${global.modoAusenteIA ? '🤖 A IA (Gemini) responderá às dúvidas dos contatos avisando que você está ausente.' : '📜 Será enviada a mensagem padrão de ausente.'}`
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
      `• *${usedPrefix}${command}* → Liga/Desliga o modo ausente\n` +
      `• *${usedPrefix}${command} voz* → Liga/Desliga resposta por Áudio\n` +
      `• *${usedPrefix}${command} ia* → Liga/Desliga resposta por IA inteligente`
    )
  }

  // Alterna o estado mestre
  global.modoAusente = !global.modoAusente

  if (global.modoAusente) {
    await m.reply(
      `╭━━━〔 ✅ *MODO AUSENTE ATIVADO* 〕━━━⬣\n` +
      `┃\n` +
      `┃ 🔴 Responderei automaticamente a qualquer\n` +
      `┃ 🔴 mensagem privada (mesmo online/offline).\n` +
      `┃\n` +
      `┃ 🗣️ *Áudio (TTS):* ${global.modoAusenteVoz ? '✅ ON' : '❌ OFF'}\n` +
      `┃ 🧠 *IA (Gemini):* ${global.modoAusenteIA ? '✅ ON' : '❌ OFF'}\n` +
      `┃\n` +
      `┃ 📌 Para desativar: *${usedPrefix}${command}*\n` +
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

handler.help = ['ausente [voz/ia/status]']
handler.tags = ['tools']
handler.command = ['ausente', 'offline', 'away']
handler.owner = true

export default handler
export { MENSAGEM_AUSENTE, getTTSAudio, getOfflineIAReply }
