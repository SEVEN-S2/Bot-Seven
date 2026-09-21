let handler = async (m, { conn, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('👥 Este comando só funciona em grupos!')

  let target = m.quoted?.sender || m.mentionedJid?.[0]
  if (!target) return m.reply(`⚠️ *Como usar:*\n*${usedPrefix + command}* @membro\nOu responda a uma mensagem do membro com *${usedPrefix + command}*`)

  let botId = conn.user.id
  let groupMeta = await conn.groupMetadata(m.chat)
  let botAdmin = groupMeta.participants.find(p => p.id === botId)?.admin

  if (!botAdmin) return m.reply('❌ O bot precisa ser *administrador* do grupo para expulsar membros!')

  let senderAdmin = groupMeta.participants.find(p => p.id === m.sender)?.admin
  if (!senderAdmin) return m.reply('❌ Apenas *administradores* podem expulsar membros!')

  try {
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
    await m.reply(`✅ @${target.split('@')[0]} foi *expulso do grupo*!`, m.chat, { mentions: [target] })
    await m.react('✅')
  } catch (err) {
    console.error(err)
    m.reply('❌ Falha ao expulsar o membro.')
  }
}

handler.help = ['kick @membro']
handler.tags = ['group']
handler.command = ['kick', 'expulsar', 'remover']
handler.group = true

export default handler
