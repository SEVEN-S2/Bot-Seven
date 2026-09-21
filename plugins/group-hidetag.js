let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('👥 Este comando só funciona em grupos!')

  await m.react('⏳')
  try {
    let groupMeta = await conn.groupMetadata(m.chat)
    let members = groupMeta.participants.map(p => p.id)
    let mentionText = text ? `📢 ${text}` : '📢 *Mensagem para todos do grupo!*'

    await conn.sendMessage(m.chat, {
      text: mentionText + members.map(() => '').join(''),
      mentions: members
    }, { quoted: m })

    await m.react('✅')
  } catch (err) {
    console.error(err)
    m.reply('❌ Falha ao mencionar os membros. O bot precisa ser administrador do grupo.')
  }
}

handler.help = ['hidetag <mensagem>']
handler.tags = ['group']
handler.command = ['hidetag', 'htag', 'everyone', 'todos']
handler.group = true
handler.admin = false

export default handler
