// ============================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS DO BOT SEVEN
// ============================================

global.botname = 'BOT SEVEN'
global.packname = 'BOT SEVEN'
global.author = 'Created by Seven'
global.prefix = /^[./!#]/ // Prefixo dos comandos (., /, !, #)

// Lista de donos do bot [número, nome, isCreator]
global.owner = [
  ['5511999999999', 'Owner', true]
]

// Chave da API Gemini (Google AI Studio - 100% Grátis)
global.geminiKey = process.env.GEMINI_KEY || ''
