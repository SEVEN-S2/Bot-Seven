import './config.js'
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import readline from 'readline'
import { promises as fs, readdirSync, watch } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import syntaxError from 'syntax-error'
import chalk from 'chalk'
import { extendSocket } from './lib/simple.js'
import { handler } from './handler.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pluginFolder = join(__dirname, 'plugins')
const authFolder = join(__dirname, 'auth_info_baileys')

global.plugins = {}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

/**
 * Carrega dinamicamente todos os plugins da pasta plugins/
 */
async function loadPlugins() {
  try {
    const files = readdirSync(pluginFolder).filter(file => file.endsWith('.js'))
    for (let file of files) {
      try {
        const filePath = join(pluginFolder, file)
        const fileUrl = pathToFileURL(filePath).href
        const module = await import(`${fileUrl}?update=${Date.now()}`)
        global.plugins[file] = module.default || module
        console.log(chalk.green(`✔ Plugin carregado: ${file}`))
      } catch (e) {
        console.error(chalk.red(`✖ Erro ao carregar plugin ${file}:`), e)
      }
    }
  } catch (err) {
    console.error(chalk.red('Erro ao listar pasta de plugins:'), err)
  }
}

/**
 * Monitora a pasta plugins/ para Hot-Reload em tempo real
 */
function watchPlugins() {
  try {
    watch(pluginFolder, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.js')) return
      const filePath = join(pluginFolder, filename)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const err = syntaxError(content, filename, { sourceType: 'module' })
        if (err) {
          console.error(chalk.red(`[ERRO DE SINTAXE EM ${filename}]:\n${err}`))
          return
        }
        const fileUrl = pathToFileURL(filePath).href
        const module = await import(`${fileUrl}?update=${Date.now()}`)
        global.plugins[filename] = module.default || module
        console.log(chalk.blueBright(`🔄 Plugin '${filename}' atualizado via Hot-Reload!`))
      } catch (e) {
        if (e.code === 'ENOENT') {
          delete global.plugins[filename]
          console.log(chalk.yellow(`🗑 Plugin '${filename}' removido.`))
        } else {
          console.error(chalk.red(`Erro ao recarregar plugin ${filename}:`), e)
        }
      }
    })
  } catch (err) {
    console.error(chalk.red('Erro ao iniciar monitoramento de plugins:'), err)
  }
}

/**
 * Inicia o cliente WhatsApp Baileys
 */
async function startBot() {
  console.log(chalk.bold.cyan(`\n⚡ Iniciando ${global.botname}...\n`))
  
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(chalk.gray(`Usando Baileys v${version.join('.')}, última versão: ${isLatest}`))

  const conn = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    generateHighQualityLinkPreview: true
  })

  // Estende funções auxiliares no socket
  extendSocket(conn)

  // Autenticação via Pairing Code (se ativado nas configs)
  if (global.usePairingCode && !conn.authState.creds.registered) {
    console.log(chalk.yellow('📱 Modo Pairing Code ativado.'))
    setTimeout(async () => {
      let phoneNumber = await question(chalk.cyanBright('👉 Digite o número do WhatsApp do Bot (com DDI, ex: 5511999999999): '))
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
      if (!phoneNumber) {
        console.log(chalk.red('Número inválido! Reinicie o bot.'))
        return
      }
      const code = await conn.requestPairingCode(phoneNumber)
      console.log(chalk.bold.greenBright(`\n🔑 CÓDIGO DE EMPARELHAMENTO: ${code}\n`))
      console.log(chalk.gray('Insira este código no seu WhatsApp: Aparelhos Conectados > Conectar com número de telefone.'))
    }, 3000)
  }

  // Atualizações de conexão
  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    
    // Exibição do QR Code no terminal
    if (qr && !global.usePairingCode) {
      console.log(chalk.yellow('\n📷 Escaneie o QR Code abaixo com o WhatsApp:\n'))
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      console.log(chalk.red(`❌ Conexão encerrada. Motivo: ${reason || 'Desconhecido'}`))
      
      if (reason !== DisconnectReason.loggedOut) {
        console.log(chalk.yellow('🔄 Reconectando em 5 segundos...'))
        setTimeout(startBot, 5000)
      } else {
        console.log(chalk.red('⚠️ Sessão finalizada. Exclua a pasta auth_info_baileys e escaneie novamente.'))
      }
    } else if (connection === 'open') {
      console.log(chalk.bold.green(`\n✅ ${global.botname} CONECTADO COM SUCESSO!\n`))
    }
  })

  // Salvar credenciais
  conn.ev.on('creds.update', saveCreds)

  // Escutar mensagens recebidas
  conn.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (let rawMsg of messages) {
      await handler(conn, rawMsg)
    }
  })
}

// Inicialização
await loadPlugins()
watchPlugins()
await startBot()
