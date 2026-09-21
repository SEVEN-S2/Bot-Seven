import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`📥 *Como usar o downloader de TikTok:*\n\n*${usedPrefix + command}* https://vm.tiktok.com/...`)

  await m.react('⏳')
  try {
    // API pública de download TikTok sem marca d'água
    let res = await axios.get(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(text)}`)
    let data = res.data

    if (!data || !data.token) throw new Error('Token não encontrado')

    let videoUrl = `https://tikmate.app/download/${data.token}/${data.id}.mp4`
    let videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' })

    await conn.sendMessage(m.chat, {
      video: videoRes.data,
      caption: `🎵 *${data.author_name || 'TikTok'}*\n📝 ${(data.title || '').substring(0, 200)}`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    await m.react('✅')
  } catch (err) {
    // Fallback: API alternativa
    try {
      let fallback = await axios.get(`https://api.douyin.wtf/api?url=${encodeURIComponent(text)}`)
      let d = fallback.data

      if (!d.video_data?.nwm_video_url) throw new Error('Sem URL de vídeo')
      
      let videoRes = await axios.get(d.video_data.nwm_video_url, { responseType: 'arraybuffer' })

      await conn.sendMessage(m.chat, {
        video: videoRes.data,
        caption: `🎵 *${d.author?.nickname || 'TikTok'}*\n📝 ${(d.desc || '').substring(0, 200)}`,
        mimetype: 'video/mp4'
      }, { quoted: m })

      await m.react('✅')
    } catch (e) {
      console.error('TikTok erro:', e.message)
      m.reply('❌ Falha ao baixar o vídeo. Verifique se o link é válido e se o perfil é público.')
    }
  }
}

handler.help = ['tiktok <link>']
handler.tags = ['downloader']
handler.command = ['tiktok', 'tt', 'tikdown']

export default handler
