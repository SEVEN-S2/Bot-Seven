import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`🌐 Digite ou cole a URL do site para tirar screenshot!\n*Exemplo:* ${usedPrefix + command} https://google.com`)

  let url = text.startsWith('http') ? text : `https://${text}`

  await m.react('⏳')
  try {
    let ssUrl = `https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(url)}`
    let res = await axios.get(ssUrl, { responseType: 'arraybuffer' })

    await conn.sendMessage(m.chat, {
      image: res.data,
      caption: `📸 *Screenshot de:* ${url}`
    }, { quoted: m })

    await m.react('✅')
  } catch (err) {
    // Fallback secundário
    try {
      let fallbackUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`
      let res = await axios.get(fallbackUrl, { responseType: 'arraybuffer' })

      await conn.sendMessage(m.chat, {
        image: res.data,
        caption: `📸 *Screenshot de:* ${url}`
      }, { quoted: m })

      await m.react('✅')
    } catch (e) {
      console.error(e)
      m.reply('❌ Falha ao capturar a tela do site. Certifique-se de que a URL é válida.')
    }
  }
}

handler.help = ['ssweb <url>']
handler.tags = ['tools']
handler.command = ['ssweb', 'ss', 'screenshot']

export default handler
