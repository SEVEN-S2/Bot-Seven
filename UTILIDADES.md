# 📊 Análise Completa da Arquitetura do Bot (Senna-Bot / Dylux-Bot)

Este documento contém o mapeamento técnico completo do bot, detalhando:
1. **Todas as APIs externas e endpoints** identificados no código.
2. **Tecnologias, bibliotecas e infraestrutura** utilizadas.
3. **Módulos, funções e códigos altamente reutilizáveis** para o seu novo bot.
4. **Recomendações práticas de reaproveitamento e modernização**.

---

## 🚀 1. Tecnologias e Stack Utilizada

| Categoria | Tecnologia / Biblioteca | Versão / Tipo | Função no Projeto |
| :--- | :--- | :--- | :--- |
| **Runtime** | **Node.js** | `>= 20.0.0` (ES Modules `"type": "module"`) | Ambiente de execução |
| **WhatsApp Engine** | `@whiskeysockets/baileys` | `7.0.0-rc14` | Conexão Multi-Device com WhatsApp via WebSocket |
| **Web Server** | `express` | `^4.18.1` | Servidor HTTP leve para manter o bot ativo na porta 8080 (Cloud/VPS) |
| **Banco de Dados** | `lowdb` (JSON Local) e `mongoose` / `mongoDB` | `lowdb ^3.0.0`, `mongoose ^6.6.5` | Persistência de usuários, grupos, economia e configurações |
| **Cache em Memória** | `node-cache` | `^5.1.2` | Cache de chaves de sinal, retry de mensagens e sessões |
| **Processamento de Mídia** | `fluent-ffmpeg`, `ffmpeg`, `node-webpmux`, `wa-sticker-formatter` | Nativo + NPM | Criação e conversão de Stickers WebP, áudios PTT, corte e vídeo |
| **Detecção de Tipos** | `file-type` | `^18.0.0` | Identificação de MIME Type a partir de Buffers |
| **Requisições HTTP** | `axios`, `node-fetch`, `formdata-node` | `axios ^1.1.2`, `node-fetch ^3.2.10` | Consumo de APIs REST e envio de arquivos multipart/form-data |
| **Scraping / Parsing** | `cheerio`, `jsdom` | Cheerio `1.0.0-rc.12` | Web scraping e parsing de HTML |
| **Busca de Mídia** | `yt-search` | `^2.13.1` | Busca de vídeos e músicas no YouTube sem necessidade de API Key |
| **Tradução & TTS** | `@vitalets/google-translate-api`, `node-gtts` | Direct Libs | Tradução de textos e síntese de voz (Google TTS) |
| **Download Mega.nz** | `megajs` | `^1.1.3` | Download direto de links públicos do Mega.nz via buffer |
| **Hot Reload de Plugins** | `fs.watch`, `syntax-error` | Nativo / NPM | Recarregamento de comandos sem reiniciar o bot, com validação de sintaxe |
| **Gerenciador de Processos**| `cluster` / `fork` (em `index.js`) | Nativo Node.js | Auto-reinicialização se o bot cair e controle de processos filhos |

---

## 🌐 2. Mapeamento Completo de APIs e Endpoints

Aqui estão todas as APIs públicas, privadas e serviços externos encontrados no código que você pode utilizar no seu novo bot:

### 2.1. Inteligência Artificial (ChatGPT Gratuito)
* **Arquivo:** `plugins/tools-openAi.js`
* **Endpoint:** `POST https://aichat-api.vercel.app/chatgpt`
* **Payload JSON:**
  ```json
  {
    "messages": [
      { "role": "system", "content": "Prompt do sistema..." },
      { "role": "user", "content": "Texto do usuário" }
    ]
  }
  ```
* **Vantagem:** Não requer API Key do OpenAI; suporta histórico de mensagens no payload (mantém contexto da conversa).

---

### 2.2. API Multi-Ferramentas FG-SENNA / FGMODS
* **Arquivo de Configuração:** `config.js` (`global.APIs.fgmods`, `global.APIs.fg_ss`)
* **Biblioteca:** `fg-senna` (`^0.0.9`)
* **Base URLs:**
  * `https://api.fgmods.xyz` (Chave configurada em `config.js`: `'shen'`)
  * `https://fg-ss.ddns.net` (Usado para screenshots de sites)
* **Recursos disponíveis via `fg-senna` / API:**
  * `fg.yta(url)` e `fg.ytv(url, quality)`: Download de MP3/MP4 do YouTube.
  * `fg.tiktok(url)`: Download de vídeos e áudios do TikTok sem marca d'água.
  * `fg.facebook(url)`: Download de vídeos do Facebook (HD/SD).
  * `fg.instagram(url)` e `fg.igstalk(username)`: Download de Reels/Posts e informações de perfil do Instagram.
  * `fg.twitter(url)`: Download de vídeos do Twitter / X.
  * `fg.mediafire(url)`: Extração de link direto de arquivos do MediaFire.
  * `fg.gdrive(url)`: Download de arquivos do Google Drive.
  * `fg.apk(query)`: Busca e download de APKs do Android.
  * `fg.googleImage(text)` / `fg.wallpaper(text)`: Busca de imagens e papéis de parede no Google.
  * `fg.ttp(text)` / `fg.attp(text)`: Geração de texto em sticker (estático e animado).
  * `fg.lyrics(text)`: Letras de músicas.
  * `fg.npmSearch(query)`: Busca de pacotes no NPM.
  * `fg.xnxx(query)` / `fg.xvideos(query)`: Busca e download de vídeos adultos.
  * `GET https://fg-ss.ddns.net/api/ssweb?url={url}&delay=1000&full={bool}`: Captura de tela (screenshot) de páginas web.

---

### 2.3. Upload e Hospedagem Temporária de Mídia
Essenciais para enviar imagens para APIs de criação de stickers ou processamento:

1. **Catbox.moe** (`lib/uploadImage.js`):
   * **Endpoint:** `POST https://catbox.moe/user/api.php`
   * **Campos do Form:** `reqtype: 'fileupload'`, `fileToUpload: Buffer/Blob`
   * **Retorno:** URL direta permanente (`https://files.catbox.moe/xxxx.jpg`).
2. **File.io** (`lib/uploadFile.js`):
   * **Endpoint:** `POST https://file.io/?expires=1d`
   * **Retorno:** Link com expiração automática em 1 dia (até 100MB).
3. **Storage RESTful API** (`lib/uploadFile.js`):
   * **Endpoint:** `POST https://storage.restfulapi.my.id/upload`

---

### 2.4. APIs de Anime & NSFW (Waifu.pics)
* **Arquivo:** `plugins/anime-waifupics.js` e `plugins/nsfw-nime.js`
* **SFW (Livre):** `GET https://api.waifu.pics/sfw/{categoria}`
  * Categorias: `waifu`, `neko`, `shinobu`, `megumin`, `bully`, `cuddle`, `hug`, `kiss`, `lick`, `pat`, `smug`, `bonk`, `yeet`, `blush`, `smile`, `wave`, `highfive`, `handhold`, `nom`, `bite`, `glomp`, `slap`, `kill`, `kick`, `happy`, `wink`, `poke`, `dance`, `cringe`.
* **NSFW (+18):** `GET https://api.waifu.pics/nsfw/{categoria}`
  * Categorias: `waifu`, `neko`, `trap`, `blowjob`.
* **Retorno:** JSON `{ "url": "https://i.waifu.pics/..." }`.

---

### 2.5. Efeitos e Filtros de Imagem (Some Random API)
* **Arquivo:** `plugins/fun-gay.js`, `plugins/sticker-trigger.js`
* **Endpoints:**
  * `GET https://some-random-api.com/canvas/triggered?avatar={imageUrl}` (Gera GIF/Sticker de Triggered com tremor)
  * `GET https://some-random-api.com/canvas/gay?avatar={imageUrl}` (Aplica filtro arco-íris na foto de perfil)

---

### 2.6. Mega.nz (Download direto sem API comercial)
* **Arquivo:** `plugins/dl-mega.js`
* **Biblioteca:** `megajs`
* **Funcionamento:**
  ```javascript
  import { File } from 'megajs'
  let file = File.fromURL(megaUrl)
  await file.loadAttributes()
  let data = await file.downloadBuffer() // Retorna o buffer completo do arquivo
  ```

---

### 2.7. GitHub APIs (Diretas e Públicas)
* **Arquivo:** `plugins/dl-gitclone.js`, `plugins/_jsjs.js`, `plugins/econ-work.js`
* **Endpoints:**
  * `GET https://api.github.com/repos/{user}/{repo}`: Metadados do repositório.
  * `GET https://codeload.github.com/{user}/{repo}/zip/refs/heads/{default_branch}`: Baixa o repositório em arquivo ZIP.
  * Raw files para bases de dados dinâmicas: `https://raw.githubusercontent.com/fgmods/fg-team/main/games/work.json`.

---

### 2.8. NPM Registry API
* **Arquivo:** `plugins/tools-npm.js`
* **Endpoints:**
  * Detalhes: `GET https://registry.npmjs.org/{packageName}`
  * Download do pacote `.tgz`: `GET https://registry.npmjs.org/{name}/-/{packageName}-{version}.tgz`

---

### 2.9. Text-to-Speech & Tradução
* **Google Translate:** `@vitalets/google-translate-api` (Tradução multi-idioma automática)
* **Google TTS:** `node-gtts` (Gera arquivo de áudio WAV/MP3 a partir de texto com sotaque de qualquer país).

---

## 💎 3. O que você pode APROVEITAR no seu novo Bot

### 1. **A Camada de Abstração Baileys (`lib/simple.js`)**
* **Por que aproveitar:** O Baileys puro é bastante baixo nível. O `simple.js` deste projeto injeta dezenas de métodos úteis no socket (`conn`), tais como:
  * `conn.sendFile(jid, path/buffer/url, filename, caption, quoted, ptt, options)`: Envia qualquer tipo de mídia (imagem, vídeo, áudio, sticker, documento) de forma unificada aceitando Buffer, caminho local ou URL da web.
  * `conn.sendContact(...)`: Envia vCard formatado.
  * `conn.downloadMediaMessage(m)`: Baixa a mídia da mensagem citada ou atual diretamente para Buffer.
  * `smsg(conn, m)`: Serializa a mensagem do Baileys para uma estrutura limpa e acessível (`m.chat`, `m.sender`, `m.text`, `m.isGroup`, `m.quoted`, `m.reply()`, `m.react()`).

### 2. **Sistema de Gerenciador de Stickers com Metadados EXIF (`lib/sticker.js`)**
* Adiciona metadados de sticker no formato oficial do WhatsApp (Packname, Autor, Links da App Store) usando `node-webpmux` sem corromper o arquivo WebP.
* Suporta conversão via FFmpeg com fallback para múltiplos métodos.

### 3. **Sistema de Hot-Reload de Plugins com Verificação de Sintaxe (`main.js`)**
* Monitora a pasta `plugins/` em tempo real.
* Se você editar um arquivo e salvar, ele testa o código com `syntax-error`. Se tiver erro de digitação/sintaxe, **ele não quebra o bot** e apenas loga no terminal indicando a linha e coluna exata do erro.
* Permite criar comandos novos com o bot rodando em produção sem downtime.

### 4. **Conexão por Pairing Code (`main.js`)**
* Permite autenticar o bot no WhatsApp inserindo apenas o número de telefone no terminal e recebendo o código de 8 dígitos (sem precisar escanear QR Code em tela).

### 5. **Sistema de Sub-Bots / Clones (`plugins/bebot-bebot.js` e pasta `bebots/`)**
* Permite que outros usuários criem instâncias filhas do bot dentro do mesmo processo usando a pasta `./bebots/`.

### 6. **Sistema de Banco de Dados Flexível (`lib/database.js` e `main.js`)**
* Suporta `lowdb` (JSON local) por padrão para desenvolvimento rápido, mas já possui adaptadores prontos para trocar por MongoDB apenas mudando o parâmetro `--db` ou a variável de conexão.

### 7. **Estrutura de Plugins Padronizada**
* Formato simples, desacoplado e fácil de estender:
  ```javascript
  let handler = async (m, { conn, text, args, usedPrefix, command }) => {
      // lógica do comando
  }
  handler.help = ['comando <arg>']
  handler.tags = ['categoria']
  handler.command = ['cmd', 'alias1', 'alias2']
  handler.owner = false    // apenas dono?
  handler.group = false    // apenas grupo?
  handler.private = false  // apenas privado?
  handler.admin = false    // apenas admin do grupo?
  handler.botAdmin = false // bot precisa ser admin?

  export default handler
  ```

---

## 🛠️ 4. Estrutura Recomendada para o seu Novo Bot

Se você quiser criar um bot mais limpo e moderno, aproveitando o que há de melhor aqui:

1. **Mantenha os utilitários essenciais de `lib/`:**
   - `lib/simple.js` (com a serialização de mensagens e envio facilitado de arquivos).
   - `lib/sticker.js` e `lib/converter.js` (para toda a manipulação de figurinhas e áudio).
   - `lib/uploadImage.js` (Catbox uploader).
2. **Copie o sistema de carregamento dinâmico de `main.js` + `handler.js`:**
   - Hot-reload com `syntax-error`.
   - Pairing code de vinculação.
3. **Selecione apenas os plugins que realmente vai usar:**
   - **Downloaders:** Copie `dl-play.js`, `dl-tiktok.js`, `dl-mediafire.js`, `dl-mega.js`.
   - **IA:** Copie `tools-openAi.js` (ChatGPT sem API Key).
   - **Ferramentas:** `tools-translate.js`, `tools-tts.js`, `tools-ssweb.js`.
   - **Stickers:** `sticker-sticker.js`, `sticker-ttp.js`, `sticker-attp.js`, `sticker-trigger.js`.
   - **Grupos:** Antilink, Welcome, Hidetag/Totag, Kick.

---
*Relatório gerado automaticamente para suporte no desenvolvimento do novo bot.*
