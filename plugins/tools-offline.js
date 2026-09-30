import './../config.js'

// ============================================
// 🔴 MODO AUSENTE - BOT SEVEN
// ============================================
// Quando ativado, responde automaticamente a
// qualquer mensagem privada recebida enquanto
// o dono estiver offline.
// ============================================

// Estado global do modo ausente
global.modoAusente = global.modoAusente || false

// Mensagem de resposta automática
const MENSAGEM_AUSENTE = `╭━━━〔 🔴 *AVISO IMPORTANTE* 〕━━━⬣
┃
┃ ❌ *ESTE USUÁRIO ENCONTRA-SE*
┃ ❌ *INDISPONÍVEL NO MOMENTO.*
┃
┃ 🕐 *VOLTE MAIS TARDE!*
┃
┃ 🤖 Mensagem automática do BOT SEVEN
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`

let handler = async (m, { conn, isOwner }) => {
  // Apenas o dono pode ativar/desativar
  if (!isOwner) {
    return m.reply('⛔ Este comando é restrito apenas ao dono do Bot!')
  }

  // Alterna o estado
  global.modoAusente = !global.modoAusente

  if (global.modoAusente) {
    await m.reply(`╭━━━〔 ✅ *MODO AUSENTE ATIVADO* 〕━━━⬣
┃
┃ 🔴 Responderei automaticamente
┃ 🔴 a qualquer mensagem privada
┃ 🔴 enquanto você estiver offline.
┃
┃ 📌 Para desativar: *.ausente*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`)
  } else {
    await m.reply(`╭━━━〔 ✅ *MODO AUSENTE DESATIVADO* 〕━━━⬣
┃
┃ 🟢 Modo ausente desligado.
┃ 🟢 Não responderei mais
┃ 🟢 automaticamente ao privado.
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⬣`)
  }
}

handler.help = ['ausente']
handler.tags = ['tools']
handler.command = ['ausente', 'offline', 'away']
handler.owner = true

export default handler
export { MENSAGEM_AUSENTE }
