import axios from 'axios'
import { createSticker } from '../lib/sticker.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`📝 Digite o texto desejado para criar a figurinha!\n*Exemplo:* ${usedPrefix + command} Seven Bot`)

  await m.react('⏳')
  try {
    let url = ''
    if (command === 'attp') {
      url = `https://api.erdwpe.com/api/maker/attp?text=${encodeURIComponent(text)}`
    } else {
      url = `https://api.erdwpe.com/api/maker/ttp?text=${encodeURIComponent(text)}`
    }

    let res = await axios.get(url, { responseType: 'arraybuffer' })
    let stickerBuff = await createSticker(res.data, command === 'attp')
    await conn.sendSticker(m.chat, stickerBuff, m)
    await m.react('✅')
  } catch (err) {
    // Fallback secundário de API
    try {
      let fallbackUrl = `https://api.fgmods.xyz/api/maker/${command}?text=${encodeURIComponent(text)}&apikey=shen`
      let res = await axios.get(fallbackUrl, { responseType: 'arraybuffer' })
      let stickerBuff = await createSticker(res.data, command === 'attp')
      await conn.sendSticker(m.chat, stickerBuff, m)
      await m.react('✅')
    } catch (e) {
      console.error(e)
      m.reply('❌ Ocorreu um erro ao gerar a figurinha de texto.')
    }
  }
}

handler.help = ['ttp <texto>', 'attp <texto>']
handler.tags = ['sticker']
handler.command = ['ttp', 'attp']

export default handler
