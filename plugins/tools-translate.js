import axios from 'axios'

let handler = async (m, { text, args, usedPrefix, command }) => {
  let lang = 'pt'
  let toTranslate = text

  if (args.length > 1 && args[0].length === 2) {
    lang = args[0].toLowerCase()
    toTranslate = args.slice(1).join(' ')
  }

  if (!toTranslate && m.quoted?.text) {
    toTranslate = m.quoted.text
  }

  if (!toTranslate) {
    return m.reply(`🌐 *Como usar o Tradutor:*\n\n*${usedPrefix + command}* Texto para traduzir para português\n*${usedPrefix + command} en* Texto para traduzir para inglês\n*${usedPrefix + command} es* Texto para traduzir para espanhol`)
  }

  try {
    let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(toTranslate)}`
    let res = await axios.get(url)
    
    let translation = res.data[0].map(item => item[0]).join('')
    let detectedLang = res.data[2] || 'auto'

    let result = `🌐 *TRADUÇÃO (${detectedLang.toUpperCase()} ➔ ${lang.toUpperCase()}):*\n\n${translation}`
    await m.reply(result)
  } catch (err) {
    console.error(err)
    m.reply('❌ Falha ao realizar a tradução. Verifique o idioma e tente novamente.')
  }
}

handler.help = ['traduzir <idioma> <texto>']
handler.tags = ['tools']
handler.command = ['traduzir', 'trad', 'translate']

export default handler
