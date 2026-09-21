// Sistema de Welcome e Antilink - Plugin de eventos de grupo
// Monitora entrada de novos membros e links de outros grupos

let welcomeGroups = new Map() // Guarda os grupos com welcome ativado
let antilinkGroups = new Map() // Guarda os grupos com antilink ativado

// ─────────────────────────────────────────
// Comando de controle: .welcome / .antilink
// ─────────────────────────────────────────
let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('👥 Este comando só funciona em grupos!')

  let groupMeta = await conn.groupMetadata(m.chat)
  let isAdmin = groupMeta.participants.find(p => p.id === m.sender)?.admin

  if (!isAdmin) return m.reply('❌ Apenas *administradores* podem usar este comando!')

  let action = (args[0] || '').toLowerCase()

  if (command === 'welcome' || command === 'boasvindas') {
    if (action === 'on' || action === 'ativar') {
      welcomeGroups.set(m.chat, true)
      return m.reply('✅ *Boas-vindas ativadas!* Novos membros serão recebidos automaticamente.')
    } else if (action === 'off' || action === 'desativar') {
      welcomeGroups.delete(m.chat)
      return m.reply('⛔ *Boas-vindas desativadas!*')
    }
    let status = welcomeGroups.has(m.chat) ? '✅ Ativado' : '⛔ Desativado'
    return m.reply(`📢 *Status Welcome:* ${status}\n\nUse:\n*${usedPrefix + command} on* - Ativar\n*${usedPrefix + command} off* - Desativar`)
  }

  if (command === 'antilink') {
    if (action === 'on' || action === 'ativar') {
      antilinkGroups.set(m.chat, true)
      return m.reply('✅ *Antilink ativado!* Links de grupos serão apagados automaticamente.')
    } else if (action === 'off' || action === 'desativar') {
      antilinkGroups.delete(m.chat)
      return m.reply('⛔ *Antilink desativado!*')
    }
    let status = antilinkGroups.has(m.chat) ? '✅ Ativado' : '⛔ Desativado'
    return m.reply(`🔗 *Status Antilink:* ${status}\n\nUse:\n*${usedPrefix + command} on* - Ativar\n*${usedPrefix + command} off* - Desativar`)
  }
}

handler.help = ['welcome on/off', 'antilink on/off']
handler.tags = ['group']
handler.command = ['welcome', 'boasvindas', 'antilink']
handler.group = true

export default handler

// ─────────────────────────────────────────────────────────
// Handler de eventos de grupo (injetar no conn em main.js)
// ─────────────────────────────────────────────────────────
export async function groupEvents(conn, update) {
  // Boas-vindas
  if (update.action === 'add' && welcomeGroups.has(update.id)) {
    for (let participant of update.participants) {
      let groupMeta = await conn.groupMetadata(update.id)
      let welcomeMsg = `👋 Seja bem-vindo(a) ao *${groupMeta.subject}*, @${participant.split('@')[0]}!\n\nEsperamos que você aproveite o grupo. Para ver os comandos do bot, envie *!menu* 🤖`
      
      await conn.sendMessage(update.id, {
        text: welcomeMsg,
        mentions: [participant]
      })
    }
  }

  // Antilink: detectar links de grupos de WhatsApp em mensagens (processado no handler.js)
}

// Função exportada para checar antilink nas mensagens
export function isAntilinkActive(chatId) {
  return antilinkGroups.has(chatId)
}
