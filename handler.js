import './config.js'
import { smsg } from './lib/simple.js'
import chalk from 'chalk'

/**
 * Roteia e executa os comandos dos plugins
 * @param {object} conn 
 * @param {object} rawMsg 
 */
export async function handler(conn, rawMsg) {
  try {
    const m = smsg(conn, rawMsg)
    if (!m) return
    // Ignora apenas mensagens automáticas geradas pela própria biblioteca Baileys para evitar loops
    if (m.isBaileys) return

    const prefix = global.prefix || /^[./!#]/
    const isPrefix = prefix.test(m.text)
    
    let usedPrefix = ''
    let noPrefixText = m.text || ''

    if (isPrefix) {
      const match = m.text.match(prefix)
      if (match) {
        usedPrefix = match[0]
        noPrefixText = m.text.slice(usedPrefix.length).trim()
      }
    }

    const [command, ...args] = noPrefixText.split(/\s+/)
    const text = args.join(' ')
    const cmd = (command || '').toLowerCase()

    // O próprio número do bot (fromMe) e os números configurados são considerados Dono
    const senderNumber = (m.sender || '').replace(/[^0-9]/g, '')
    const isOwner = m.fromMe || (global.owner || []).some(([number]) => number === senderNumber)

    // Log formatado no terminal
    if (m.text && isPrefix) {
      const chatType = m.isGroup ? 'GRUPO' : 'PRIVADO'
      console.log(
        chalk.green(`[COMANDO - ${chatType}]`),
        chalk.yellow(`De: ${m.pushName || m.sender}`),
        chalk.cyan(`-> ${m.text}`)
      )
    }

    // Busca e execução do plugin correspondente
    for (let name in global.plugins) {
      let plugin = global.plugins[name]
      if (!plugin) continue
      if (plugin.disabled) continue

      let isAccept = false

      // Verifica se o comando é aceito pelo plugin
      if (plugin.command) {
        if (Array.isArray(plugin.command)) {
          isAccept = plugin.command.includes(cmd)
        } else if (plugin.command instanceof RegExp) {
          isAccept = plugin.command.test(cmd)
        } else if (typeof plugin.command === 'string') {
          isAccept = plugin.command === cmd
        }
      }

      if (isAccept && isPrefix) {
        // Validação de Dono (se habilitado no plugin)
        if (plugin.owner && !isOwner) {
          m.reply('⛔ Este comando é restrito apenas ao dono do Bot!')
          continue
        }

        // Validação de Grupo
        if (plugin.group && !m.isGroup) {
          m.reply('👥 Este comando só pode ser utilizado em grupos!')
          continue
        }

        // Validação de Privado
        if (plugin.private && m.isGroup) {
          m.reply('🔒 Este comando só pode ser utilizado no privado!')
          continue
        }

        try {
          await (plugin.default || plugin)(m, {
            conn,
            args,
            text,
            usedPrefix,
            command: cmd,
            isOwner
          })
        } catch (err) {
          console.error(chalk.red(`[ERRO NO PLUGIN ${name}]:`), err)
          m.reply(`❌ Ocorreu um erro ao executar o comando:\n\`\`\`${err.message || err}\`\`\``)
        }
        break
      }
    }
  } catch (e) {
    console.error(chalk.red('[ERRO NO HANDLER]:'), e)
  }
}
