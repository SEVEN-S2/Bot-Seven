import axios from 'axios'

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
    let res = await axios.get(url, { responseType: 'arraybuffer' })

    await conn.sendMessage(m.chat, {
      audio: res.data,
      mimetype: 'audio/mp4',
      ptt: true
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
