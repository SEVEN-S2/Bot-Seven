import './../config.js'

let handler = async (m, { conn, usedPrefix, command }) => {
  let uptime = process.uptime()
  let hours = Math.floor(uptime / 3600)
  let minutes = Math.floor((uptime % 3600) / 60)
  let seconds = Math.floor(uptime % 60)
  let uptimeStr = `${hours}h ${minutes}m ${seconds}s`

  let tagCategories = {
    'sticker': '🎨 FIGURINHAS & MÍDIA',
    'downloader': '📥 DOWNLOADS & REDES SOCIAIS',
    'group': '👥 ADMINISTRAÇÃO DE GRUPO',
    'tools': '🛠️ UTILIDADES & FERRAMENTAS',
    'info': 'ℹ️ INFORMAÇÕES'
  }

  let menuText = `╭━━━〔 *${global.botname}* 〕━━━⬣
┃ 👤 *Usuário:* ${m.pushName || 'Amigo(a)'}
┃ ⏱️ *Ativo:* ${uptimeStr}
┃ ⚡ *Prefixo:* [ ${usedPrefix} ]
╰━━━━━━━━━━━━━━━━━━⬣\n\n`

  for (let [tag, title] of Object.entries(tagCategories)) {
    let commands = []
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (plugin && plugin.tags && plugin.tags.includes(tag) && plugin.help) {
        commands.push(...plugin.help.map(cmd => `┃ ⌲ *${usedPrefix}${cmd}*`))
      }
    }
    if (commands.length > 0) {
      menuText += `╭━━〔 *${title}* 〕━━⬣\n`
      menuText += commands.join('\n') + '\n'
      menuText += `╰━━━━━━━━━━━━━━━━━━⬣\n\n`
    }
  }

  menuText += `💡 *Dica:* Digite o comando desejado para obter instruções de uso.`

  await m.reply(menuText)
}

handler.help = ['menu', 'help', 'comandos']
handler.tags = ['info']
handler.command = ['menu', 'help', 'comandos', 'ajuda']

export default handler
