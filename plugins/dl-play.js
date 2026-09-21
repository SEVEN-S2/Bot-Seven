import axios from 'axios'

// Busca vídeos do YouTube por título sem precisar de API Key
async function ytSearch(query) {
  let res = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  })
  let match = res.data.match(/var ytInitialData = (.+?);<\/script>/)
  if (!match) return null
  let data = JSON.parse(match[1])
  let videos = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents
    ?.filter(v => v.videoRenderer)
    ?.map(v => ({
      id: v.videoRenderer.videoId,
      title: v.videoRenderer.title?.runs[0]?.text,
      duration: v.videoRenderer.lengthText?.simpleText,
      author: v.videoRenderer.ownerText?.runs[0]?.text,
      views: v.videoRenderer.viewCountText?.simpleText
    }))
  return videos?.[0]
}

// Download via API pública sem key
async function getYtMp3(videoId) {
  let res = await axios.get(`https://youtube-mp3-download1.p.rapidapi.com/dl?id=${videoId}`, {
    headers: { 'X-RapidAPI-Host': 'youtube-mp3-download1.p.rapidapi.com', 'X-RapidAPI-Key': 'no-key' }
  })
  return res.data
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`🎵 *Como usar o Play de Música:*\n\n*${usedPrefix + command}* Nome da música ou artista\n\n*Exemplo:*\n${usedPrefix + command} Shape of You Ed Sheeran`)

  await m.react('⏳')
  try {
    // 1. Buscar vídeo no YouTube
    let video = await ytSearch(text)
    if (!video) throw new Error('Nenhum vídeo encontrado')

    await m.reply(`🔍 *Encontrado:*\n\n🎵 *${video.title}*\n👤 *${video.author}*\n⏱️ *${video.duration}*\n\n⬇️ Baixando...`)

    // 2. Download via API pública
    let apiUrl = `https://api.vevioz.com/api/button/mp3/${video.id}`
    let apiRes = await axios.get(apiUrl)
    
    // Extrai URL de download
    let match = apiRes.data.match(/href="(https:\/\/[^"]+\.mp3[^"]*)"/)
    if (!match) throw new Error('URL de áudio não encontrada')

    let audioRes = await axios.get(match[1], { responseType: 'arraybuffer' })

    await conn.sendMessage(m.chat, {
      audio: audioRes.data,
      mimetype: 'audio/mpeg',
      ptt: false
    }, { quoted: m })

    await m.react('✅')
  } catch (err) {
    console.error('YT Play erro:', err.message)
    m.reply(`❌ Falha ao baixar a música.\n\nTente com o nome completo da música, por exemplo:\n*${usedPrefix + command} Bohemian Rhapsody Queen*`)
  }
}

handler.help = ['play <nome da música>']
handler.tags = ['downloader']
handler.command = ['play', 'musica', 'ytmp3', 'mp3']

export default handler
