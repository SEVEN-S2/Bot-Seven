import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`📥 *Como usar o downloader de Instagram:*\n\n*${usedPrefix + command}* https://www.instagram.com/p/...`)

  await m.react('⏳')
  try {
    let res = await axios.post('https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index', 
      { url: text },
      {
        headers: {
          'content-type': 'application/json',
          'X-RapidAPI-Key': 'no-key', // API pública sem key
          'X-RapidAPI-Host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com'
        }
      }
    )

    // Fallback API pública sem necessidade de key
    throw new Error('use fallback')
  } catch {
    try {
      let apiUrl = `https://api.tikmate.app/api/instagram?url=${encodeURIComponent(text)}`
      // Usando API alternativa pública para Instagram
      let snapRes = await axios.get(`https://sdapi.satyago.me/api/instagram?url=${encodeURIComponent(text)}`)
      let data = snapRes.data

      if (!data || (!data.video && !data.image)) throw new Error('Sem mídia encontrada')

      if (data.video) {
        let videoRes = await axios.get(data.video, { responseType: 'arraybuffer' })
        await conn.sendMessage(m.chat, {
          video: videoRes.data,
          caption: `📸 *Instagram*\n${(data.caption || '').substring(0, 200)}`,
          mimetype: 'video/mp4'
        }, { quoted: m })
      } else {
        let imgRes = await axios.get(data.image, { responseType: 'arraybuffer' })
        await conn.sendMessage(m.chat, {
          image: imgRes.data,
          caption: `📸 *Instagram*\n${(data.caption || '').substring(0, 200)}`
        }, { quoted: m })
      }

      await m.react('✅')
    } catch (e) {
      console.error('Instagram erro:', e.message)
      m.reply('❌ Falha ao baixar o conteúdo do Instagram.\n\nCertifique-se que:\n• A URL está correta\n• O perfil é público\n• Cole o link completo do post/reel')
    }
  }
}

handler.help = ['ig <link>', 'instagram <link>']
handler.tags = ['downloader']
handler.command = ['ig', 'instagram', 'reels', 'igdown']

export default handler
