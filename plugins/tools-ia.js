import axios from 'axios'

// ─────────────────────────────────────────────────────
// Estado por chat
// ─────────────────────────────────────────────────────
const aiChats = new Map()
const chatHistory = new Map()
const MAX_HISTORY = 8

const SYSTEM_PROMPT = `Você é ${global.botname || 'BOT SEVEN'}, um assistente de WhatsApp inteligente e amigável. Responda sempre em português brasileiro de forma natural e direta. Seja conciso. Use emojis moderadamente.`

// ─────────────────────────────────────────────────────
// API 1: Pollinations.ai GET — mais simples e rápida
// ─────────────────────────────────────────────────────
async function pollinationsAI(userMessage) {
  let prompt = `[Sistema: Você é ${global.botname || 'BOT SEVEN'}, assistente de WhatsApp. Responda em português, de forma curta e direta.]\nUsuário: ${userMessage}\nAssistente:`
  let res = await axios.get(
    `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&seed=${Date.now() % 9999}`,
    { timeout: 12000, responseType: 'text' }
  )
  let text = (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)).trim()
  if (!text || text.length < 2) throw new Error('Resposta vazia')
  return text
}

// ─────────────────────────────────────────────────────
// API 2: DuckDuckGo AI com buffer robusto
// ─────────────────────────────────────────────────────
async function duckAI(userMessage, history) {
  let statusRes = await axios.get('https://duckduckgo.com/duckchat/v1/status', {
    headers: { 'x-vqd-accept': '1', 'User-Agent': 'Mozilla/5.0' },
    timeout: 8000
  })
  let vqd = statusRes.headers['x-vqd-4']
  if (!vqd) throw new Error('VQD não obtido')

  let messages = [...history.slice(-6), { role: 'user', content: userMessage }]

  let chatRes = await axios.post('https://duckduckgo.com/duckchat/v1/chat',
    { model: 'gpt-4o-mini', messages },
    {
      headers: {
        'x-vqd-4': vqd,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/event-stream'
      },
      responseType: 'arraybuffer',
      timeout: 20000
    }
  )

  let raw = Buffer.from(chatRes.data).toString('utf-8')
  let reply = ''
  for (let line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue
    let json = line.slice(6).trim()
    if (json === '[DONE]') break
    try {
      let obj = JSON.parse(json)
      if (obj.message) reply += obj.message
    } catch {}
  }
  if (!reply.trim()) throw new Error('DuckDuckGo: resposta vazia')
  return reply.trim()
}

// ─────────────────────────────────────────────────────
// API 3: Popcat — fallback final simples
// ─────────────────────────────────────────────────────
async function popcatAI(userMessage) {
  let res = await axios.get(
    `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(userMessage)}&owner=Seven&botname=${encodeURIComponent(global.botname || 'BOT')}`,
    { timeout: 10000 }
  )
  let reply = res.data?.response
  if (!reply?.trim()) throw new Error('Popcat: sem resposta')
  return reply.trim()
}

// ─────────────────────────────────────────────────────
// Orquestrador com fallbacks
// ─────────────────────────────────────────────────────
async function askAI(chatId, userMessage) {
  if (!chatHistory.has(chatId)) chatHistory.set(chatId, [])
  let history = chatHistory.get(chatId)

  let reply = null
  let errs = []

  for (let [name, fn] of [
    ['Pollinations', () => pollinationsAI(userMessage)],
    ['DuckDuckGo', () => duckAI(userMessage, history)],
    ['Popcat', () => popcatAI(userMessage)]
  ]) {
    try {
      reply = await fn()
      if (reply) { console.log(`[IA] ${name} OK`); break }
    } catch (e) {
      errs.push(`${name}: ${e.message}`)
      console.warn(`[IA] ${name} falhou: ${e.message}`)
    }
  }

  if (!reply) throw new Error(errs.join(' | '))

  history.push({ role: 'user', content: userMessage })
  history.push({ role: 'assistant', content: reply })
  if (history.length > MAX_HISTORY * 2) history.splice(0, 2)
  chatHistory.set(chatId, history)

  return reply
}

// ─────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────
let handler = async (m, { conn, text, command }) => {
  let rawText = (m.text || '').trim()
  let prefix = global.prefix || /^[./!#]/

  // ── Comandos de controle ──
  if (['ia', 'gpt', 'chatgpt', 'aion', 'aioff'].includes(command)) {
    let action = (text || command).toLowerCase()

    if (action === 'off' || command === 'aioff') {
      aiChats.delete(m.chat)
      chatHistory.delete(m.chat)
      return m.reply(`🔴 *IA desativada!*\nPara reativar: *.ia on*`)
    }
    if (action === 'on' || command === 'aion') {
      aiChats.set(m.chat, true)
      chatHistory.delete(m.chat)
      return m.reply(
        `🟢 *IA ativada neste chat!*\n\n` +
        `🤖 Responderei *todas as mensagens* automaticamente.\n\n` +
        `*.ia off* → Desativar\n*.ia reset* → Limpar histórico`
      )
    }
    if (action === 'reset' || action === 'limpar') {
      chatHistory.delete(m.chat)
      return m.reply(`♻️ *Histórico limpo!* Nova conversa iniciada.`)
    }

    let status = aiChats.has(m.chat) ? '🟢 Ativa' : '🔴 Inativa'
    return m.reply(
      `🤖 *IA neste chat: ${status}*\n\n` +
      `*.ia on* → Ativar\n*.ia off* → Desativar\n*.ia reset* → Limpar histórico`
    )
  }

  // ── Resposta automática (handler.all) ──
  if (!aiChats.has(m.chat)) return
  if (!rawText || rawText.length < 2) return
  if (prefix.test(rawText)) return
  if (m.isBaileys) return

  await m.react('🤔')
  try {
    let reply = await askAI(m.chat, rawText)
    await conn.sendMessage(m.chat, { text: reply }, { quoted: m })
    await m.react('✅')
  } catch (err) {
    console.error('[IA ERRO]:', err.message)
    await m.react('❌')
    await m.reply('❌ Todas as IAs falharam. Tente novamente em instantes.')
  }
}

handler.help = ['ia on/off', 'ia reset']
handler.tags = ['tools']
handler.command = ['ia', 'gpt', 'chatgpt', 'aion', 'aioff']
handler.all = true

export default handler
