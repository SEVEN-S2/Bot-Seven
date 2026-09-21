import { exec } from 'child_process'
import util from 'util'
import chalk from 'chalk'

const execPromise = util.promisify(exec)

const CHECK_INTERVAL_MS = 15000 // Checa por novos commits a cada 15 segundos

console.log(chalk.bold.cyan('🚀 Auto-Updater ativado: Monitorando repositório Git a cada 15 segundos...'))

async function checkAndPull() {
  try {
    // 1. Busca alterações remotas sem aplicar imediatamente
    await execPromise('git fetch origin main')
    
    // 2. Compara commit local com remoto
    const { stdout: localHash } = await execPromise('git rev-parse HEAD')
    const { stdout: remoteHash } = await execPromise('git rev-parse origin/main')

    if (localHash.trim() !== remoteHash.trim()) {
      console.log(chalk.yellow('\n📦 Novo commit detectado no GitHub! Atualizando...'))
      const { stdout: pullOutput } = await execPromise('git pull origin main')
      console.log(chalk.green(`✔ ${pullOutput.trim()}`))
      console.log(chalk.blue('⚡ Hot-reload aplicado automaticamente nos plugins!\n'))
    }
  } catch (err) {
    // Silencia erros temporários de conexão
    if (!err.message.includes('Could not resolve host')) {
      console.error(chalk.red('[Auto-Updater Erro]:'), err.message)
    }
  }
}

// Execução periódica
setInterval(checkAndPull, CHECK_INTERVAL_MS)
checkAndPull()
