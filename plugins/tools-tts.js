import axios from 'axios'
import { toPTT } from '../lib/converter.js'

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
  let lang = 'pt'
  let spokenText = text

  if (args.length > 1 && args[0].length === 2) {
    lang = args[0].toLowerCase()
    spokenText = args.slice(1).join(' ')
  }

  if (!spokenText && m.quoted?.text) {
    spokenText = m.quoted.text
  }

  if (!spokenText) {
    return m.reply(`🗣️ *Como usar o Text-to-Speech (Voz):*\n\n*${usedPrefix + command}* Olá, seja bem-vindo ao Bot!\n*${usedPrefix + command} en* Hello, welcome to the bot!`)
  }

  await m.react('⏳')
  try {
    let url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(spokenText)}&tl=${lang}&client=tw-ob`
    let res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      responseType: 'arraybuffer'
    })

    let rawBuffer = Buffer.from(res.data)
    let pttBuffer = rawBuffer
    let mimetype = 'audio/mpeg'
    let ptt = false

    try {
      pttBuffer = await toPTT(rawBuffer, 'mp3')
      mimetype = 'audio/ogg; codecs=opus'
      ptt = true
    } catch (e) {
      console.warn('[TTS] Conversão Opus falhou, enviando mp3 padrão:', e.message)
    }

    await conn.sendMessage(m.chat, {
      audio: pttBuffer,
      mimetype,
      ptt
    }, { quoted: m })

    await m.react('✅')
  } catch (err) {
    console.error(err)
    m.reply('❌ Falha ao sintetizar a voz do texto.')
  }
}

handler.help = ['tts <idioma> <texto>']
handler.tags = ['tools']
handler.command = ['tts', 'falar', 'voz']

export default handler
