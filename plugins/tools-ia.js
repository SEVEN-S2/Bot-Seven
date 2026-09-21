import axios from 'axios'

// ─────────────────────────────────────────────────────
// Estado: chats com IA ativa e histórico de conversa
// ─────────────────────────────────────────────────────
const aiChats = new Map()    // chatId -> true/false
const chatHistory = new Map() // chatId -> Array<{ role, content }>
const MAX_HISTORY = 10       // máximo de mensagens no histórico de contexto

const SYSTEM_PROMPT = `Você é ${global.botname || 'BOT SEVEN'}, um assistente de WhatsApp inteligente, amigável e direto. 
Responda sempre em português brasileiro, de forma natural e conversacional.
Seja conciso mas completo. Use emojis moderadamente para deixar as respostas mais expressivas.
Não use markdown excessivo pois a resposta será lida em WhatsApp.`

// ─────────────────────────────────────────────────────
// Chamada à API de IA (sem API Key)
// ─────────────────────────────────────────────────────
async function askAI(chatId, userMessage) {
  // Recupera ou inicia histórico do chat
  if (!chatHistory.has(chatId)) {
    chatHistory.set(chatId, [])
  }
  let history = chatHistory.get(chatId)

  // Adiciona mensagem do usuário ao histórico
  history.push({ role: 'user', content: userMessage })

  // Limita o histórico para não ultrapassar o contexto
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2)
  }

  let messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
  ]

  // Tenta APIs em ordem
  let apis = [
    async () => {
      let res = await axios.post('https://aichat-api.vercel.app/chatgpt',
        { messages },
        { timeout: 20000 }
      )
      return res.data?.result || res.data?.message || res.data?.content
    },
    async () => {
      let res = await axios.post('https://api.openai-proxy.me/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500
      }, {
        headers: { 'Authorization': 'Bearer free', 'Content-Type': 'application/json' },
        timeout: 20000
      })
      return res.data?.choices?.[0]?.message?.content
    },
    async () => {
      let last = history.slice(-3).map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`).join('\n')
      let res = await axios.get(
        `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(userMessage)}&owner=${encodeURIComponent('BOT SEVEN')}&botname=${encodeURIComponent(global.botname || 'SEVEN')}`,
        { timeout: 15000 }
      )
      return res.data?.response
    }
  ]

  let reply = null
  for (let apiFn of apis) {
    try {
      reply = await apiFn()
      if (reply && reply.trim()) break
    } catch {}
  }

  if (!reply || !reply.trim()) throw new Error('Nenhuma API respondeu')

  // Adiciona resposta da IA ao histórico
  history.push({ role: 'assistant', content: reply })
  chatHistory.set(chatId, history)

  return reply.trim()
}

// ─────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────────
let handler = async (m, { conn, text, command }) => {
  let rawText = (m.text || '').trim()
  let prefix = global.prefix || /^[./!#]/

  // ── Comando de toggle: .ia on/off ──
  if (['ia', 'gpt', 'chatgpt', 'aion', 'aioff'].includes(command)) {
    let action = (text || command).toLowerCase()

    if (action === 'off' || command === 'aioff') {
      if (aiChats.has(m.chat)) {
        aiChats.delete(m.chat)
        chatHistory.delete(m.chat)
        return m.reply(`🔴 *IA desativada neste chat!*\n\nPara ativar novamente, use *.ia on*`)
      }
      return m.reply(`ℹ️ A IA já estava desativada neste chat.`)
    }

    if (action === 'on' || command === 'aion') {
      aiChats.set(m.chat, true)
      chatHistory.delete(m.chat) // limpa histórico anterior
      return m.reply(
        `🟢 *IA ativada neste chat!*\n\n` +
        `🤖 Agora responderei *todas as mensagens* automaticamente!\n\n` +
        `📌 Para desativar: *.ia off*\n` +
        `🗑️ Para limpar o histórico: *.ia reset*`
      )
    }

    if (action === 'reset' || action === 'limpar') {
      chatHistory.delete(m.chat)
      return m.reply(`♻️ *Histórico de conversa limpo!*\nA IA começa uma nova conversa agora.`)
    }

    // Status atual
    let status = aiChats.has(m.chat) ? '🟢 Ativada' : '🔴 Desativada'
    return m.reply(
      `🤖 *Status da IA neste chat:* ${status}\n\n` +
      `*.ia on* - Ativar IA automática\n` +
      `*.ia off* - Desativar IA\n` +
      `*.ia reset* - Limpar histórico`
    )
  }

  // ── Bloco all: responde mensagens quando IA está ativa ──
  if (!aiChats.has(m.chat)) return             // IA não está ativa neste chat
  if (!rawText) return                          // sem texto
  if (rawText.length < 2) return               // ignora mensagens muito curtas (stickers, etc)
  if (prefix.test(rawText)) return             // ignora comandos com prefixo
  if (m.isBaileys) return                      // ignora mensagens do próprio bot

  // Indicador de digitando (reação)
  await m.react('🤔')

  try {
    let reply = await askAI(m.chat, rawText)
    await conn.sendMessage(m.chat, { text: reply }, { quoted: m })
    await m.react('✅')
  } catch (err) {
    console.error('[IA ERRO]:', err.message)
    await m.react('❌')
    await m.reply('❌ A IA não conseguiu responder agora. Tente novamente em instantes.')
  }
}

handler.help = ['ia on/off', 'ia reset']
handler.tags = ['tools']
handler.command = ['ia', 'gpt', 'chatgpt', 'aion', 'aioff']
handler.all = true // necessário para capturar mensagens sem prefixo quando ativado

export default handler
