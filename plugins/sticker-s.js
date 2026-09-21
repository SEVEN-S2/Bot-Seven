import { createSticker, addExif } from '../lib/sticker.js'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || q.mediaType || ''
  
  // Customização de packname e author via argumento (.s Pack | Autor)
  let customPack = global.packname
  let customAuthor = global.author
  
  if (args.length > 0) {
    let fullText = args.join(' ')
    if (fullText.includes('|')) {
      let [p, a] = fullText.split('|').map(v => v.trim())
      if (p) customPack = p
      if (a) customAuthor = a
    } else {
      customPack = fullText
    }
  }

  // 1. Tratamento para Imagens
  if (/image/.test(mime)) {
    await m.react('⏳')
    let img = await q.download()
    if (!img) return m.reply('❌ Falha ao baixar a imagem. Tente novamente.')
    
    let stiker = await createSticker(img, false, customPack, customAuthor)
    await conn.sendSticker(m.chat, stiker, m)
    await m.react('✅')
  } 
  // 2. Tratamento para Vídeos / GIFs
  else if (/video/.test(mime)) {
    if ((q.msg || q).seconds > 10) return m.reply('❌ O vídeo deve ter no máximo 10 segundos para virar figurinha!')
    
    await m.react('⏳')
    let media = await q.download()
    if (!media) return m.reply('❌ Falha ao baixar o vídeo. Tente novamente.')
    
    let stiker = await createSticker(media, true, customPack, customAuthor)
    await conn.sendSticker(m.chat, stiker, m)
    await m.react('✅')
  } 
  // 3. Re-etiquetar Figurinha existente (Roubar / Alterar créditos)
  else if (/webp/.test(mime) || q.mtype === 'stickerMessage') {
    await m.react('⏳')
    let media = await q.download()
    if (!media) return m.reply('❌ Falha ao baixar a figurinha. Tente novamente.')
    
    let stiker = await addExif(media, customPack, customAuthor)
    await conn.sendSticker(m.chat, stiker, m)
    await m.react('✅')
  } 
  // 4. Ajuda caso não tenha mídia
  else {
    return m.reply(`📸 *Como criar figurinhas:*\n\n1. Envie uma imagem ou vídeo curto (< 10s) com a legenda *${usedPrefix + command}*\n2. Ou responda a uma foto, vídeo ou figurinha existente com *${usedPrefix + command}*\n\n💡 *Dica:* Defina o pacote e o autor com:\n*${usedPrefix + command} NomeDoPacote | NomeDoAutor*`)
  }
}

handler.help = ['s', 'sticker', 'fig', 'figurinha']
handler.tags = ['sticker']
handler.command = ['s', 'sticker', 'fig', 'figurinha']

export default handler
