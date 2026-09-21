import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.includes('mediafire.com')) {
    return m.reply(`📥 *Como usar o downloader do MediaFire:*\n\n*${usedPrefix + command}* https://www.mediafire.com/file/...`)
  }

  await m.react('⏳')
  try {
    let page = await axios.get(text, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    let $ = cheerio.load(page.data)
    let downloadUrl = $('#downloadButton').attr('href')
    let fileName = $('.filename').text().trim() || 'arquivo'
    let fileSize = $('.file-size').text().trim() || ''

    if (!downloadUrl) throw new Error('Link de download não encontrado na página')

    let result = `📦 *MediaFire Download*\n\n` +
      `📄 *Arquivo:* ${fileName}\n` +
      `📊 *Tamanho:* ${fileSize}\n` +
      `🔗 *Link direto:*\n${downloadUrl}`

    await m.reply(result)
    await m.react('✅')
  } catch (err) {
    console.error('MediaFire erro:', err.message)
    m.reply('❌ Falha ao extrair o link do MediaFire. Verifique se o arquivo ainda está disponível.')
  }
}

handler.help = ['mediafire <link>']
handler.tags = ['downloader']
handler.command = ['mediafire', 'mf']

export default handler
