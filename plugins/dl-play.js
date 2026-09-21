import axios from 'axios'

// ─────────────────────────────────────────
// Busca vídeo no YouTube via scraping
// ─────────────────────────────────────────
async function ytSearch(query) {
  try {
    let res = await axios.get(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    )
    let match = res.data.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match) return null
    let data = JSON.parse(match[1])
    let videos = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents
      ?.filter(v => v.videoRenderer)
      ?.map(v => ({
        id: v.videoRenderer.videoId,
        title: v.videoRenderer.title?.runs?.[0]?.text || 'Sem título',
        duration: v.videoRenderer.lengthText?.simpleText || 'Desconhecido',
        author: v.videoRenderer.ownerText?.runs?.[0]?.text || 'Desconhecido',
        views: v.videoRenderer.viewCountText?.simpleText || '',
        thumbnail: `https://img.youtube.com/vi/${v.videoRenderer.videoId}/hqdefault.jpg`
      }))
    return videos?.[0] || null
  } catch (e) {
    return null
  }
}

// ─────────────────────────────────────────
// Download de MP3 via API fabdl
// ─────────────────────────────────────────
async function downloadMp3(videoId) {
  let url = `https://www.youtube.com/watch?v=${videoId}`

  // Tenta API fabdl
  try {
    let infoRes = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(url)}&format=mp3`, { timeout: 20000 })
    let info = infoRes.data
    if (!info?.mp3_dl_id) throw new Error('sem mp3_dl_id')

    // Aguarda conversão
    await new Promise(r => setTimeout(r, 5000))

    let convertRes = await axios.get(`https://api.fabdl.com/youtube/mp3convert?id=${info.mp3_dl_id}`, { timeout: 20000 })
    if (!convertRes.data?.download_url) throw new Error('sem download_url')

    let audioRes = await axios.get(convertRes.data.download_url, { responseType: 'arraybuffer', timeout: 60000 })
    return { buffer: audioRes.data, title: info.title }
  } catch {}

  // Fallback: API ytdl alternativa
  let fallbackRes = await axios.get(`https://api.downloadr.cc/api/youtube?url=${encodeURIComponent(url)}&type=audio`, { timeout: 30000 })
  if (!fallbackRes.data?.url) throw new Error('Nenhuma API de MP3 funcionou')
  let audioRes = await axios.get(fallbackRes.data.url, { responseType: 'arraybuffer', timeout: 60000 })
  return { buffer: audioRes.data, title: fallbackRes.data.title }
}

// ─────────────────────────────────────────
// Download de MP4 via API
// ─────────────────────────────────────────
async function downloadMp4(videoId) {
  let url = `https://www.youtube.com/watch?v=${videoId}`

  try {
    let infoRes = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(url)}&format=mp4`, { timeout: 20000 })
    let info = infoRes.data
    if (!info?.download_url) throw new Error('sem download_url direto')

    let videoRes = await axios.get(info.download_url, { responseType: 'arraybuffer', timeout: 120000 })
    return { buffer: videoRes.data, title: info.title }
  } catch {}

  // Fallback
  let fallbackRes = await axios.get(`https://api.downloadr.cc/api/youtube?url=${encodeURIComponent(url)}&type=video`, { timeout: 30000 })
  if (!fallbackRes.data?.url) throw new Error('Nenhuma API de MP4 funcionou')
  let videoRes = await axios.get(fallbackRes.data.url, { responseType: 'arraybuffer', timeout: 120000 })
  return { buffer: videoRes.data, title: fallbackRes.data.title }
}

// ─────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────
let handler = async (m, { conn, text, usedPrefix, command }) => {
  let isVideo = ['mp4', 'playvideo', 'ytmp4', 'video'].includes(command)

  if (!text) {
    return m.reply(
      `🎵 *Como usar o YouTube Downloader:*\n\n` +
      `▶️ *Baixar MP3 (Áudio):*\n*${usedPrefix}play* Nome da música\n\n` +
      `🎬 *Baixar MP4 (Vídeo):*\n*${usedPrefix}mp4* Nome do vídeo\n\n` +
      `*Exemplos:*\n${usedPrefix}play Shape of You\n${usedPrefix}mp4 Funny cats compilation`
    )
  }

  await m.react('🔍')

  // 1. Buscar o vídeo
  let video = await ytSearch(text)
  if (!video) return m.reply('❌ Nenhum vídeo encontrado. Tente com outro nome.')

  // 2. Enviar capa + informações
  try {
    let thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer' })
    let infoCaption =
      `🎬 *${video.title}*\n\n` +
      `👤 *Canal:* ${video.author}\n` +
      `⏱️ *Duração:* ${video.duration}\n` +
      `👁️ *Views:* ${video.views}\n` +
      `🔗 https://youtu.be/${video.id}\n\n` +
      (isVideo ? `⬇️ Baixando *vídeo MP4*... aguarde` : `⬇️ Baixando *áudio MP3*... aguarde`)

    await conn.sendMessage(m.chat, {
      image: Buffer.from(thumbRes.data),
      caption: infoCaption
    }, { quoted: m })
  } catch {
    await m.reply(`🎬 *${video.title}*\n⬇️ Baixando... aguarde`)
  }

  await m.react('⏳')

  // 3. Baixar e enviar
  try {
    if (isVideo) {
      let { buffer, title } = await downloadMp4(video.id)
      await conn.sendMessage(m.chat, {
        document: buffer,
        mimetype: 'video/mp4',
        fileName: `${(title || video.title).replace(/[^\w\s]/gi, '')}.mp4`,
        caption: `🎬 *${title || video.title}*\n\n📥 Enviado por ${global.botname}`
      }, { quoted: m })
    } else {
      let { buffer, title } = await downloadMp3(video.id)
      // Envia como áudio PTT-compatível
      await conn.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${(title || video.title).replace(/[^\w\s]/gi, '')}.mp3`
      }, { quoted: m })
    }

    await m.react('✅')
  } catch (err) {
    console.error('[PLAY ERRO]:', err.message)
    await m.react('❌')
    m.reply(
      `❌ *Falha ao baixar.*\n\nPossíveis causas:\n` +
      `• Vídeo muito longo ou protegido\n` +
      `• API temporariamente indisponível\n\n` +
      `Tente novamente em alguns instantes. 🔄`
    )
  }
}

handler.help = ['play <música>', 'mp4 <vídeo>']
handler.tags = ['downloader']
handler.command = ['play', 'musica', 'ytmp3', 'mp3', 'mp4', 'playvideo', 'ytmp4', 'video']

export default handler
