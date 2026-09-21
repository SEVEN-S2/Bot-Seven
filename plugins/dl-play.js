import axios from 'axios'

// ─────────────────────────────────────────────────
// Estado pendente: chave = "chatId|senderId"
// ─────────────────────────────────────────────────
const pending = new Map()
const TIMEOUT_MS = 60000 // 60 segundos para o usuário escolher

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9'
}

// ─────────────────────────────────────────────────
// Busca no YouTube via scraping
// ─────────────────────────────────────────────────
async function ytSearch(query) {
  let res = await axios.get(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%3D%3D`,
    { headers: HEADERS, timeout: 15000 }
  )
  let match = res.data.match(/var ytInitialData = (.+?);<\/script>/)
  if (!match) throw new Error('Resposta do YouTube inválida')
  let data = JSON.parse(match[1])
  let contents = data?.contents
    ?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents[0]
    ?.itemSectionRenderer?.contents || []

  let video = contents
    .filter(v => v.videoRenderer)
    .map(v => v.videoRenderer)
    .find(v => v.videoId && v.lengthText)

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
// Download via cobalt.tools
// ─────────────────────────────────────────────────
async function cobaltDownload(videoId, mode) {
  // mode: 'audio' | 'mute' | 'auto'
  let res = await axios.post('https://api.cobalt.tools/', {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    downloadMode: mode === 'video' ? 'auto' : 'audio',
    audioFormat: 'mp3',
    videoQuality: '720',
    filenameStyle: 'basic'
  }, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    timeout: 25000
  })
  let status = res.data?.status
  let url = res.data?.url
  if ((status === 'stream' || status === 'tunnel' || status === 'redirect') && url) return url
  throw new Error(`cobalt status: ${status}`)
}

// ─────────────────────────────────────────────────
// Fallback: y2mate scraping
// ─────────────────────────────────────────────────
async function y2mateDownload(videoId, mode) {
  let url = `https://www.youtube.com/watch?v=${videoId}`
  let analyzeRes = await axios.post(
    'https://www.y2mate.com/mates/analyzeV2/ajax',
    new URLSearchParams({ k_query: url, k_page: 'home', hl: 'en', q_auto: '0' }),
    { headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20000 }
  )
  let links = analyzeRes.data?.links
  if (!links) throw new Error('y2mate: sem links')
  let key = mode === 'video'
    ? (links?.mp4?.['720p']?.k || links?.mp4?.['480p']?.k || links?.mp4?.['360p']?.k)
    : (links?.mp3?.mp3128?.k || links?.mp3?.mp3256?.k)
  if (!key) throw new Error('y2mate: chave não encontrada')

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
// Orquestrador com fallbacks
// ─────────────────────────────────────────────────
async function getDownloadUrl(videoId, mode) {
  let errs = []
  for (let [name, fn] of [['cobalt', cobaltDownload], ['y2mate', y2mateDownload]]) {
    try {
      let url = await fn(videoId, mode)
      console.log(`[PLAY] ${name} OK`)
      return url
    } catch (e) { errs.push(`${name}: ${e.message}`) }
  }
  throw new Error(errs.join(' | '))
}

// ─────────────────────────────────────────────────
// Processamento do download após escolha
// ─────────────────────────────────────────────────
async function processDownload(conn, m, video, choice) {
  let mode, label
  if (choice === '1') { mode = 'video'; label = '🎬 Vídeo MP4' }
  else if (choice === '2') { mode = 'audio'; label = '🎵 Áudio MP3' }
  else { mode = 'audio'; label = '📄 Áudio (documento)' }

  await conn.sendMessage(m.chat, {
    text: `⏳ Baixando *${label}*...\n\n🎬 *${video.title}*`
  }, { quoted: m })

  try {
    let dlUrl = await getDownloadUrl(video.id, mode)
    let mediaRes = await axios.get(dlUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: HEADERS
    })
    let buf = Buffer.from(mediaRes.data)
    let safeName = video.title.replace(/[^\w\s]/gi, '').trim() || 'audio'

    if (choice === '1') {
      // Vídeo MP4 como documento
      await conn.sendMessage(m.chat, {
        document: buf,
        mimetype: 'video/mp4',
        fileName: `${safeName}.mp4`,
        caption: `🎬 *${video.title}*\n👤 ${video.author}`
      }, { quoted: m })
    } else if (choice === '2') {
      // Áudio MP3 nativo
      await conn.sendMessage(m.chat, {
        audio: buf,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m })
    } else {
      // Áudio como documento
      await conn.sendMessage(m.chat, {
        document: buf,
        mimetype: 'audio/mpeg',
        fileName: `${safeName}.mp3`,
        caption: `🎵 *${video.title}*\n👤 ${video.author}`
      }, { quoted: m })
    }

    await m.react('✅')
  } catch (err) {
    console.error('[PLAY DL ERRO]:', err.message)
    await m.react('❌')
    await m.reply(`❌ Falha no download: ${err.message.split('|')[0]}\n\nTente novamente! 🔄`)
  }
}

// ─────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────────
let handler = async (m, { conn, text, command }) => {
  let rawText = (m.text || '').trim()
  let key = `${m.chat}|${m.sender}`

  // ── Captura a resposta 1 / 2 / 3 do usuário ──
  if (['1', '2', '3'].includes(rawText) && pending.has(key)) {
    let { video, timer } = pending.get(key)
    clearTimeout(timer)
    pending.delete(key)
    await processDownload(conn, m, video, rawText)
    return
  }

  // ── Só continua se veio via comando com prefixo ──
  if (!handler.command.includes(command)) return

  if (!text) {
    return m.reply(
      `🎵 *YouTube Downloader*\n\n` +
      `Digite o nome da música ou vídeo:\n\n` +
      `*.play* Nome da música\n*.mp4* Nome do vídeo\n\n` +
      `*Exemplos:*\n.play Shape of You\n.mp4 Funny cats`
    )
  }

  await m.react('🔍')

  let video
  try {
    video = await ytSearch(text)
  } catch (err) {
    return m.reply(`❌ Erro ao buscar no YouTube: ${err.message}`)
  }

  // Enviar thumbnail + informações
  try {
    let thumbRes = await axios.get(video.thumbnail, { responseType: 'arraybuffer', timeout: 10000 })
    await conn.sendMessage(m.chat, {
      image: Buffer.from(thumbRes.data),
      caption:
        `🎬 *${video.title}*\n\n` +
        `👤 *Canal:* ${video.author}\n` +
        `⏱️ *Duração:* ${video.duration}\n` +
        `👁️ *Views:* ${video.views}\n` +
        `🔗 https://youtu.be/${video.id}`
    }, { quoted: m })
  } catch {
    await m.reply(`🎬 *${video.title}* (${video.duration})\n👤 ${video.author}`)
  }

  // Perguntar formato
  await conn.sendMessage(m.chat, {
    text:
      `📌 *Escolha o formato de download:*\n\n` +
      `1️⃣ Vídeo MP4\n` +
      `2️⃣ Áudio MP3\n` +
      `3️⃣ Áudio (documento)\n\n` +
      `_Responda com *1*, *2* ou *3*. Expira em 60 segundos._`
  }, { quoted: m })

  await m.react('⏳')

  // Salvar estado pendente com timeout de 60s
  let timer = setTimeout(() => {
    if (pending.has(key)) {
      pending.delete(key)
    }
  }, TIMEOUT_MS)

  pending.set(key, { video, timer })
}

handler.help = ['play <música>', 'mp4 <vídeo>']
handler.tags = ['downloader']
handler.command = ['play', 'musica', 'ytmp3', 'mp3', 'mp4', 'playvideo', 'ytmp4', 'video']
handler.all = true // necessário para capturar as respostas 1, 2, 3

export default handler
