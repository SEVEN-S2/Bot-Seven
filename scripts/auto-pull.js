import { exec } from 'child_process'
import util from 'util'
import chalk from 'chalk'

const execPromise = util.promisify(exec)
const CHECK_INTERVAL_MS = 15000 // Checa a cada 15 segundos

console.log(chalk.bold.cyan('🚀 Auto-Updater iniciado: Monitorando GitHub a cada 15 segundos...'))

async function run(cmd) {
  try {
    const { stdout, stderr } = await execPromise(cmd)
    return (stdout + stderr).trim()
  } catch (e) {
    return e.message
  }
}

async function checkAndUpdate() {
  try {
    // 1. Baixar info do remoto sem aplicar ainda
    await run('git fetch origin main')

    const localHash = (await run('git rev-parse HEAD')).trim()
    const remoteHash = (await run('git rev-parse origin/main')).trim()

    if (localHash === remoteHash) return // Sem novidades

    console.log(chalk.yellow('\n📦 Novo commit detectado! Baixando atualização...'))

    // 2. Verificar quais arquivos vão mudar
    const changedFiles = await run(`git diff --name-only HEAD origin/main`)
    console.log(chalk.gray(`📄 Arquivos alterados:\n${changedFiles}`))

    // 3. Aplicar o pull
    await run('git pull origin main')
    console.log(chalk.green('✔ git pull aplicado com sucesso!'))

    // 4. Se package.json mudou, rodar npm install
    if (changedFiles.includes('package.json')) {
      console.log(chalk.blue('📦 package.json alterado. Rodando npm install...'))
      const installOutput = await run('npm install')
      console.log(chalk.gray(installOutput))
    }

    // 5. Verificar se só mudaram plugins (hot-reload suficiente) ou arquivos core
    const coreFiles = ['main.js', 'handler.js', 'config.js', 'lib/', 'package.json', 'scripts/']
    const coreChanged = coreFiles.some(f => changedFiles.includes(f))

    if (coreChanged) {
      // Arquivos core mudaram: precisa reiniciar o bot
      console.log(chalk.magenta('♻️ Arquivos principais alterados. Reiniciando bot-seven via PM2...'))
      const restartOut = await run('pm2 restart bot-seven')
      console.log(chalk.gray(restartOut))
    } else {
      // Apenas plugins: o hot-reload já cuida de tudo
      console.log(chalk.greenBright('⚡ Apenas plugins alterados. Hot-reload automático ativado! Bot não foi reiniciado.'))
    }

    console.log(chalk.bold.green(`✅ Atualização concluída!\n`))
  } catch (err) {
    if (!err.message?.includes('Could not resolve host')) {
      console.error(chalk.red('[Auto-Updater Erro]:'), err.message)
    }
  }
}

// Execução imediata + periódica
checkAndUpdate()
setInterval(checkAndUpdate, CHECK_INTERVAL_MS)
