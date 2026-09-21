import { ffmpeg } from '../lib/converter.js'

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || ''

  if (!/webp/.test(mime) && q.mtype !== 'stickerMessage') {
    return m.reply(`⚠️ Responda a uma figurinha com *${usedPrefix + command}* para converter em imagem.`)
  }

  await m.react('⏳')
  let buffer = await q.download()
  if (!buffer) return m.reply('❌ Falha ao baixar a figurinha.')

  try {
    let imgBuffer = await ffmpeg(buffer, [], 'webp', 'png')
    await conn.sendMessage(m.chat, { image: imgBuffer, caption: '✅ Aqui está sua imagem convertida!' }, { quoted: m })
    await m.react('✅')
  } catch (err) {
    console.error(err)
    m.reply('❌ Erro ao converter a figurinha para imagem.')
  }
}

handler.help = ['toimg']
handler.tags = ['sticker']
handler.command = ['toimg', 'tofoto', 'imagem']

export default handler
