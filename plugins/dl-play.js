import axios from 'axios'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
}

// ─────────────────────────────────────────────────
// 1. Busca no YouTube via scraping (sem API Key)
// ─────────────────────────────────────────────────
async function ytSearch(query) {
  let res = await axios.get(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`,
    { headers: HEADERS, timeout: 15000 }
  )

  let match = res.data.match(/var ytInitialData = (.+?);<\/script>/)
  if (!match) throw new Error('ytInitialData não encontrado')
  let data = JSON.parse(match[1])

  let contents = data?.contents
    ?.twoColumnSearchResultsRenderer
    ?.primaryContents
    ?.sectionListRenderer
    ?.contents[0]
    ?.itemSectionRenderer
    ?.contents || []

  let video = contents
    .filter(v => v.videoRenderer)
    .map(v => v.videoRenderer)
    .find(v => v.videoId && v.lengthText) // garante que tem duração (não é live)

  if (!video) throw new Error('Nenhum vídeo encontrado')

  return {
    id: video.videoId,
    title: video.title?.runs?.[0]?.text || 'Sem título',
    duration: video.lengthText?.simpleText || '??:??',
    author: video.ownerText?.runs?.[0]?.text || 'Desconhecido',
    views: video.viewCountText?.simpleText || '',
    thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`
  }
}

// ─────────────────────────────────────────────────
// 2. Download via cobalt.tools (API open-source)
// ─────────────────────────────────────────────────
async function cobaltDownload(videoId, isVideo = false) {
  let res = await axios.post('https://api.cobalt.tools/', {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    downloadMode: isVideo ? 'auto' : 'audio',
    audioFormat: 'mp3',
    videoQuality: '720',
    filenameStyle: 'basic'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 25000
  })

  let status = res.data?.status
  let url = res.data?.url

  if ((status === 'stream' || status === 'tunnel' || status === 'redirect') && url) {
    return url
  }
  throw new Error(`cobalt retornou status: ${status}`)
}

// ─────────────────────────────────────────────────
// 3. Fallback: Download via y2mate scraping
// ─────────────────────────────────────────────────
async function y2mateDownload(videoId, isVideo = false) {
  let url = `https://www.youtube.com/watch?v=${videoId}`
  let format = isVideo ? 'mp4' : 'mp3'

  // Passo 1: analisar vídeo
  let analyzeRes = await axios.post(
    'https://www.y2mate.com/mates/analyzeV2/ajax',
    new URLSearchParams({ k_query: url, k_page: 'home', hl: 'en', q_auto: '0' }),
    { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  )

  let links = analyzeRes.data?.links
  if (!links) throw new Error('y2mate: sem links na resposta')

  let key
  if (!isVideo) {
    key = links?.mp3?.mp3128?.k || links?.mp3?.mp3256?.k
  } else {
    key = links?.mp4?.['720p']?.k || links?.mp4?.['480p']?.k || links?.mp4?.['360p']?.k
  }
  if (!key) throw new Error(`y2mate: chave ${format} não encontrada`)

  // Passo 2: converter e pegar link
  let convertRes = await axios.post(
    'https://www.y2mate.com/mates/convertV2/index',
    new URLSearchParams({ vid: videoId, k: key }),
    { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
  )

  let dlink = convertRes.data?.dlink
  if (!dlink) throw new Error('y2mate: dlink não encontrado')
  return dlink
}

// ─────────────────────────────────────────────────
// 4. Fallback 2: loader.to scraping (com polling)
// ─────────────────────────────────────────────────
async function loaderDownload(videoId, isVideo = false) {
  let format = isVideo ? 'mp4' : 'mp3'
  let url = `https://www.youtube.com/watch?v=${videoId}`

  let startRes = await axios.post(
    'https://loader.to/ajax/download.php',
    new URLSearchParams({ format, url }),
    { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  )

  let id = startRes.data?.id
  if (!id) throw new Error('loader.to: id não retornado')

  // Poll até terminar (máx 30 tentativas × 2s = 60s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000))
    let progress = await axios.get(`https://loader.to/ajax/progress.php?id=${id}`, { timeout: 10000 })
    let p = progress.data

    if (p?.success === 1 || p?.progress >= 100) {
      if (!p?.download_url) throw new Error('loader.to: sem download_url')
      return p.download_url
    }
  }
  throw new Error('loader.to: timeout na conversão')
}

// ─────────────────────────────────────────────────
// Orquestrador: tenta APIs em ordem
// ─────────────────────────────────────────────────
async function getDownloadUrl(videoId, isVideo) {
  let errors = []

  // API 1: cobalt.tools
  try {
    let url = await cobaltDownload(videoId, isVideo)
    console.log('[PLAY] cobalt.tools OK')
    return url
  } catch (e) { errors.push(`cobalt: ${e.message}`) }

  // API 2: y2mate
  try {
    let url = await y2mateDownload(videoId, isVideo)
    console.log('[PLAY] y2mate OK')
    return url
  } catch (e) { errors.push(`y2mate: ${e.message}`) }

  // API 3: loader.to
  try {
    let url = await loaderDownload(videoId, isVideo)
    console.log('[PLAY] loader.to OK')
    return url
  } catch (e) { errors.push(`loader: ${e.message}`) }

  throw new Error('Todas as APIs falharam:\n' + errors.join('\n'))
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────
let handler = async (m, { conn, text, usedPrefix, command }) => {
  let isVideo = ['mp4', 'playvideo', 'ytmp4', 'video'].includes(command)

  if (!text) {
    return m.reply(
      `🎵 *YouTube Downloader*\n\n` +
      `🎵 *MP3 (Áudio):*\n*${usedPrefix}play* Nome da música\n\n` +
      `🎬 *MP4 (Vídeo):*\n*${usedPrefix}mp4* Nome do vídeo\n\n` +
      `*Exemplos:*\n${usedPrefix}play Shape of You\n${usedPrefix}mp4 Funny cats`
    )
  }

  await m.react('🔍')

  let video
  try {
    video = await ytSearch(text)
  } catch (err) {
    return m.reply(`❌ Erro ao buscar no YouTube: ${err.message}`)
  }

  // Enviar thumbnail + info
  try {
    let thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 })
    await conn.sendMessage(m.chat, {
      image: Buffer.from(thumbRes.data),
      caption:
        `🎬 *${video.title}*\n\n` +
        `👤 *Canal:* ${video.author}\n` +
        `⏱️ *Duração:* ${video.duration}\n` +
        `👁️ *Views:* ${video.views}\n` +
        `🔗 https://youtu.be/${video.id}\n\n` +
        (isVideo ? `⬇️ Baixando *vídeo MP4*... aguarde` : `⬇️ Baixando *áudio MP3*... aguarde`)
    }, { quoted: m })
  } catch {
    await m.reply(`🎬 *${video.title}*\n⬇️ Baixando... aguarde`)
  }

  await m.react('⏳')

  try {
    let dlUrl = await getDownloadUrl(video.id, isVideo)
    let mediaRes = await axios.get(dlUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: HEADERS
    })

    let safeName = video.title.replace(/[^\w\s]/gi, '').trim()

    if (isVideo) {
      await conn.sendMessage(m.chat, {
        document: Buffer.from(mediaRes.data),
        mimetype: 'video/mp4',
        fileName: `${safeName}.mp4`,
        caption: `🎬 *${video.title}*`
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        audio: Buffer.from(mediaRes.data),
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m })
    }

    await m.react('✅')
  } catch (err) {
    console.error('[PLAY ERRO FINAL]:', err.message)
    await m.react('❌')
    await m.reply(
      `❌ *Falha no download.*\n\n` +
      `Possíveis causas:\n• Vídeo com restrição de região ou idade\n• Vídeo muito longo (acima de 15 min)\n• Servidores temporariamente sobrecarregados\n\n` +
      `Tente novamente! 🔄`
    )
  }
}

handler.help = ['play <música>', 'mp4 <vídeo>']
handler.tags = ['downloader']
handler.command = ['play', 'musica', 'ytmp3', 'mp3', 'mp4', 'playvideo', 'ytmp4', 'video']

export default handler
