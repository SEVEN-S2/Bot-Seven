# 📝 NOTAS DE DESENVOLVIMENTO & ARQUITETURA - BOT SEVEN

> **Aviso para Desenvolvedores e IAs Futuras:**  
> Este arquivo contém a documentação viva e o histórico de decisões do projeto **BOT SEVEN**. Sempre que implementar novas funcionalidades, criar novos plugins ou alterar a arquitetura, **mantenha este arquivo atualizado**.

---

## 📌 1. Visão Geral do Projeto
* **Nome:** BOT SEVEN
* **Repositório GitHub:** `https://github.com/SEVEN-S2/Bot-Seven.git`
* **Ambiente:** Node.js (ES Modules - `"type": "module"`)
* **Biblioteca Principal do WhatsApp:** `@whiskeysockets/baileys` (versão 6.x)
* **Método de Autenticação:** **QR Code** no terminal (pasta de sessão: `auth_info_baileys/`).
* **Regra de Permissões:** O bot está configurado para que **todos os usuários**, incluindo o **próprio número do bot (`fromMe`)**, possam executar os comandos normalmente.

---

## 📁 2. Estrutura de Diretórios e Arquivos

```
BOT SEVEN/
├── auth_info_baileys/       # Credenciais Multi-Device do Baileys (IGNORADO NO GIT)
├── tmp/                     # Arquivos temporários de conversão multimídia (FFmpeg)
├── scripts/
│   └── auto-pull.js         # Daemon de Auto-Update contínuo (monitora git a cada 15s)
├── lib/
│   ├── simple.js            # Extensões do Socket Baileys e serialização de mensagens (smsg e downloadMedia)
│   ├── sticker.js           # Criação de WebP com wa-sticker-formatter + metadados EXIF (node-webpmux)
│   └── converter.js         # Wrapper para comandos FFmpeg usando ffmpeg-static automático
├── plugins/
│   └── sticker-s.js         # Plugin do comando .s / .sticker / .fig / .figurinha
├── config.js                # Variáveis globais (prefixo, dono, packname, author, modo de conexão)
├── handler.js               # Roteador de mensagens e execução de plugins com validações
├── main.js                  # Ponto de entrada: Conexão Baileys, QR Code e Hot-Reload de plugins
├── package.json             # Dependências e scripts do projeto
├── NOTAS.md                 # Documentação contínua do projeto (ESTE ARQUIVO)
└── UTILIDADES.md            # Mapeamento de referência com APIs e recursos para expansão futura
```

---

## 🔄 3. Sistema de Auto-Update Instantâneo na VPS

O projeto possui um **Auto-Updater** (`scripts/auto-pull.js`) que monitora o repositório GitHub em segundo plano a cada 15 segundos.

### Como funciona:
1. Quando você faz um `git push` no seu computador, o daemon detecta o novo commit automaticamente na VPS.
2. Ele executa `git pull origin main` sem derrubar o bot.
3. Como o `main.js` possui **Hot-Reload**, qualquer plugin novo ou alterado em `plugins/` é recarregado **instantaneamente** em memória sem desconectar a sessão do WhatsApp!

### Como ativar na VPS com PM2:
```bash
pm2 start scripts/auto-pull.js --name "bot-updater"
pm2 save
```

---

## ⚙️ 4. Convenções de Desenvolvimento de Plugins

Todos os novos comandos devem ser criados dentro da pasta `plugins/` seguindo a estrutura padrão:

```javascript
let handler = async (m, { conn, args, text, usedPrefix, command, isOwner }) => {
  // Lógica do comando
  await m.reply('Exemplo de resposta!')
}

// Definições de comando e ajuda
handler.help = ['nomecomando <parametro>']
handler.tags = ['categoria'] // ex: 'sticker', 'download', 'ia', 'grupo'
handler.command = ['cmd', 'alias1', 'alias2']

// Permissões opcionais
handler.owner = false    // Exige que o usuário seja o Dono?
handler.group = false    // Exige ser executado apenas em grupos?
handler.private = false  // Exige ser executado apenas no privado?

export default handler
```

---

## 📁 5. Lista Completa de Plugins

| Arquivo | Comandos | Categoria | Descrição |
|:---|:---|:---|:---|
| `sticker-s.js` | `.s`, `.sticker`, `.fig` | sticker | Foto/vídeo para figurinha + re-etiquetar |
| `sticker-toimg.js` | `.toimg`, `.tofoto` | sticker | Figurinha de volta para imagem/foto |
| `sticker-attp.js` | `.ttp`, `.attp` | sticker | Texto em figurinha estática/animada |
| `dl-play.js` | `.play`, `.mp3` | downloader | Busca e baixa músicas do YouTube |
| `dl-tiktok.js` | `.tiktok`, `.tt` | downloader | Download de vídeos TikTok sem marca d'água |
| `dl-instagram.js` | `.ig`, `.reels` | downloader | Download de posts/reels do Instagram |
| `dl-mediafire.js` | `.mediafire`, `.mf` | downloader | Extrai link direto de arquivos MediaFire |
| `group-hidetag.js` | `.hidetag`, `.todos` | group | Marca todos os membros invisivelmente |
| `group-kick.js` | `.kick`, `.expulsar` | group | Expulsa membros do grupo (requer admin) |
| `group-welcome.js` | `.welcome`, `.antilink` | group | Boas-vindas e bloqueio de links de grupo |
| `tools-tts.js` | `.tts`, `.falar` | tools | Texto para áudio narrado (Google TTS) |
| `tools-translate.js` | `.traduzir`, `.trad` | tools | Tradução automática multi-idioma |
| `tools-ssweb.js` | `.ssweb`, `.screenshot` | tools | Captura de tela de sites |
| `main-menu.js` | `.menu`, `.help` | info | Menu dinâmico de todos os comandos |

---

## 📜 6. Histórico de Alterações

- **2026-09-21:**
  - Criação da arquitetura base em Node.js ESM e Baileys v6.
  - Conversão de Stickers com suporte EXIF e `ffmpeg-static`.
  - Comando `.s` com suporte a fotos, vídeos curtos e re-etiquetagem de stickers.
  - Conexão configurada por QR Code no terminal.
  - Permissão universal liberada para todos os usuários e número próprio (`fromMe`).
  - Criação do sistema de **Auto-Update contínuo** (`scripts/auto-pull.js`).
  - Adição de 13 novos plugins: figurinhas avançadas, downloaders, admin de grupos e ferramentas.
  - Repositório sincronizado em `https://github.com/SEVEN-S2/Bot-Seven.git`.
