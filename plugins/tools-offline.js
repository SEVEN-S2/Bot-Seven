import './../config.js'
import axios from 'axios'
import { askAI } from './tools-ia.js'
import { toPTT } from '../lib/converter.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ============================================
// 🔴 MODO AUSENTE PERSISTENTE - BOT SEVEN
// ============================================

const __dirname = dirname(fileURLToPath(import.meta.url))
const stateFile = join(__dirname, '../tmp/modo_ausente.json')

function loadState() {
  try {
    if (existsSync(stateFile)) {
      const data = JSON.parse(readFileSync(stateFile, 'utf-8'))
      global.modoAusente = !!data.modoAusente
      global.modoAusenteVoz = !!data.modoAusenteVoz
      global.modoAusenteIA = !!data.modoAusenteIA
    }
  } catch (_) {}
}

function saveState() {
  try {
    writeFileSync(stateFile, JSON.stringify({
      modoAusente: !!global.modoAusente,
      modoAusenteVoz: !!global.modoAusenteVoz,
      modoAusenteIA: !!global.modoAusenteIA
    }, null, 2))
  } catch (_) {}
}

// Inicializa variáveis do estado salvo em disco
global.modoAusente = global.modoAusente || false
global.modoAusenteVoz = global.modoAusenteVoz || false
global.modoAusenteIA = global.modoAusenteIA || false
loadState()

// Mensagem de resposta automática padrão por texto (sem emojis)
const MENSAGEM_AUSENTE = `*AVISO DE AUSÊNCIA*

O usuário encontra-se indisponível no momento.
Por favor, deixe sua mensagem que ela será visualizada assim que possível.`

// Mensagem em fala natural para sintetizador de voz (sem emojis ou caracteres especiais)
const MENSAGEM_VOZ_AUSENTE = "Ei! Meu dono encontra-se indisponível, volte mais tarde ou deixe um recado e irei enviar ao meu dono se for uma emergência. Obrigado!"

/**
 * Limpa texto para leitura natural pelo sintetizador de voz (remove emojis e simbolos)
 */
function cleanTextForSpeech(text) {
  if (!text || text.trim() === MENSAGEM_AUSENTE.trim()) {
    return MENSAGEM_VOZ_AUSENTE
  }
  return text
    // Remove emojis e caracteres unicode gráficos
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
    // Remove marcações de texto e bordas decorativas
    .replace(/[*_~`╭┃╰━〔〕⬣•│─┌┐└┘├┤┼┴┬]/g, ' ')
    // Normaliza múltiplos espaços
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Converte texto em áudio formatado para WhatsApp (Opus OGG para PTT)
 */
async function getTTSAudio(text, lang = 'pt') {
  let spokenText = cleanTextForSpeech(text) || MENSAGEM_VOZ_AUSENTE
  if (spokenText.length > 250) {
    spokenText = spokenText.slice(0, 247) + '...'
  }
  let url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(spokenText)}&tl=${lang}&client=tw-ob`
  let res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    responseType: 'arraybuffer',
    timeout: 10000
  })

  let mp3Buf = Buffer.from(res.data)
  try {
    let opusBuf = await toPTT(mp3Buf, 'mp3')
    return { audio: opusBuf, mimetype: 'audio/ogg; codecs=opus', ptt: true }
  } catch (err) {
    console.warn('[MODO AUSENTE] FFMpeg Opus falhou, fallback para mp3:', err.message)
    return { audio: mp3Buf, mimetype: 'audio/mpeg', ptt: false }
  }
}

/**
 * Gera uma resposta contextualizada usando IA se o dono estiver ausente
 */
async function getOfflineIAReply(chatId, userText) {
  let apiKey = global.geminiKey || process.env.GEMINI_KEY
  if (!apiKey) {
    // Sem chave Gemini: retorna null instantaneamente (0ms) para não atrasar a resposta
    return null
  }
  let prompt = `[SISTEMA: O usuário que você representa (dono do bot) está AUSENTE/INDISPONÍVEL no momento. Responda de forma muito curta (máximo 2 frases), educada e profissional SEM utilizar emojis, avisando que o dono visualizará em breve.]\n\nMensagem do contato: "${userText}"`
  try {
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
    return m.reply('Este comando é restrito apenas ao dono do Bot.')
  }

  let sub = (args[0] || '').toLowerCase()

  if (sub === 'on' || sub === 'ativar') {
    global.modoAusente = true
    saveState()
    return m.reply(`*MODO AUSENTE ATIVADO*`)
  }

  if (sub === 'off' || sub === 'desativar') {
    global.modoAusente = false
    saveState()
    return m.reply(`*MODO AUSENTE DESATIVADO*`)
  }

  if (sub === 'voz' || sub === 'audio') {
    global.modoAusenteVoz = !global.modoAusenteVoz
    if (global.modoAusenteVoz) global.modoAusente = true
    saveState()
    return m.reply(
      `*RESPOSTA EM ÁUDIO (TTS)*: ${global.modoAusenteVoz ? 'ATIVADA' : 'DESATIVADA'}\n` +
      `*Modo Ausente:* ${global.modoAusente ? 'ATIVADO' : 'DESATIVADO'}\n\n` +
      `${global.modoAusenteVoz ? 'As respostas serão enviadas em formato de áudio de voz.' : 'As respostas serão enviadas em formato de texto.'}`
    )
  }

  if (sub === 'ia' || sub === 'gemini' || sub === 'ai') {
    global.modoAusenteIA = !global.modoAusenteIA
    if (global.modoAusenteIA) global.modoAusente = true
    saveState()
    return m.reply(
      `*RESPOSTA INTELIGENTE COM IA*: ${global.modoAusenteIA ? 'ATIVADA' : 'DESATIVADA'}\n` +
      `*Modo Ausente:* ${global.modoAusente ? 'ATIVADO' : 'DESATIVADO'}\n\n` +
      `${global.modoAusenteIA ? 'A IA responderá às dúvidas avisando que você está ausente.' : 'Será enviada a mensagem padrão.'}`
    )
  }

  if (sub === 'status' || sub === 'info') {
    return m.reply(
      `*PAINEL MODO AUSENTE*\n` +
      `• Estado Geral: ${global.modoAusente ? 'ATIVADO' : 'DESATIVADO'}\n` +
      `• Modo Voz (TTS): ${global.modoAusenteVoz ? 'ATIVADO' : 'DESATIVADO'}\n` +
      `• Modo IA (Gemini): ${global.modoAusenteIA ? 'ATIVADO' : 'DESATIVADO'}\n\n` +
      `Comandos:\n` +
      `• *${usedPrefix}${command} on / off* -> Ativar ou Desativar\n` +
      `• *${usedPrefix}${command} voz* -> Alternar modo Voz (Áudio)\n` +
      `• *${usedPrefix}${command} ia* -> Alternar modo IA (Gemini)`
    )
  }

  // Alterna o estado mestre se chamado sem argumentos
  global.modoAusente = !global.modoAusente
  saveState()

  if (global.modoAusente) {
    await m.reply(
      `*MODO AUSENTE ATIVADO*\n\n` +
      `Responderei automaticamente a qualquer mensagem privada recebida.\n\n` +
      `• Áudio (TTS): ${global.modoAusenteVoz ? 'ON' : 'OFF'}\n` +
      `• IA (Gemini): ${global.modoAusenteIA ? 'ON' : 'OFF'}\n\n` +
      `Para desativar: *${usedPrefix}${command} off*`
    )
  } else {
    await m.reply(
      `*MODO AUSENTE DESATIVADO*\n\n` +
      `Respostas automáticas desligadas.`
    )
  }
}

handler.help = ['ausente [on/off/voz/ia/status]']
handler.tags = ['tools']
handler.command = ['ausente', 'offline', 'away']
handler.owner = true

export default handler
export { MENSAGEM_AUSENTE, getTTSAudio, getOfflineIAReply }
