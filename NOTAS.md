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

## ⚙️ 3. Convenções de Desenvolvimento de Plugins

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

### ⚡ Hot-Reload Ativo:
- Não é necessário reiniciar o bot após criar ou editar arquivos em `plugins/`. O `main.js` monitora e recarrega os plugins instantaneamente usando validação de sintaxe (`syntax-error`).

---

## 🛠️ 4. Recursos Disponíveis nos Módulos

### `m` (Mensagem Serializada via `lib/simple.js`):
- `m.text`: Texto da mensagem ou legenda.
- `m.chat`: JID do chat atual (privado ou grupo).
- `m.sender`: JID de quem enviou.
- `m.isGroup`: Boolean indicando se a mensagem veio de um grupo.
- `m.quoted`: Objeto da mensagem citada/respondida (se houver).
- `m.quoted.download()`: Baixa a mídia citada diretamente para um `Buffer`.
- `m.download()`: Baixa a mídia da mensagem atual diretamente para um `Buffer`.
- `m.reply(texto)`: Envia resposta citando a mensagem original.
- `m.react(emoji)`: Reage à mensagem com um emoji.

### `conn` (Socket do Baileys):
- `conn.sendSticker(jid, stickerBuffer, quoted)`: Envia figurinha WebP.
- `conn.sendImageAsSticker(jid, mediaBuffer, isVideo, quoted, packname, author)`: Converte mídia e envia como figurinha.
- `conn.decodeJid(jid)`: Decodifica JID com formato limpo.

---

## ☁️ 5. Como Vincular e Rodar na VPS (Linux / Ubuntu)

Para clonar e manter o bot rodando na sua VPS:

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/SEVEN-S2/Bot-Seven.git
   cd Bot-Seven
   ```
2. **Instalar Dependências:**
   ```bash
   npm install
   ```
3. **Executar via PM2 (Process Manager para manter ativo 24/7):**
   ```bash
   npm install -g pm2
   pm2 start main.js --name "bot-seven"
   pm2 logs "bot-seven" # Para visualizar o QR Code e escanear
   ```
4. **Atualizar alterações futuras da VPS:**
   ```bash
   git pull origin main
   ```

---

## 📜 6. Histórico de Alterações

- **2026-09-21:**
  - Inicialização do projeto base com Baileys e suporte a ES Modules.
  - Implementação de `lib/converter.js` integrado com `ffmpeg-static` (não requer instalação manual de FFmpeg no sistema operacional).
  - Implementação de `lib/sticker.js` com `wa-sticker-formatter` e metadados EXIF (`node-webpmux`).
  - Criação do plugin `plugins/sticker-s.js` para fotos, vídeos (< 10s) e re-etiquetagem de figurinhas existentes.
  - Configuração do modo de conexão via **QR Code** no terminal (`qrcode-terminal`).
  - Atualização do `handler.js` para que todos os usuários e o próprio número do bot (`fromMe`) possam disparar comandos.
  - Criação e atualização contínua do `NOTAS.md`.
  - Publicação e sincronização inicial com o repositório remoto GitHub (`https://github.com/SEVEN-S2/Bot-Seven.git`).
