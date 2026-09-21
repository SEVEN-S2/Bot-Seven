import { promises as fs } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import ffmpegPath from 'ffmpeg-static'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tmpDir = join(__dirname, '../tmp')

async function ensureTmpDir() {
  try {
    await fs.mkdir(tmpDir, { recursive: true })
  } catch (e) {}
}

/**
 * Converte buffer usando ffmpeg com argumentos personalizados
 * @param {Buffer} buffer 
 * @param {Array<string>} args 
 * @param {string} ext 
 * @param {string} extOutput 
 * @returns {Promise<Buffer>}
 */
export function ffmpeg(buffer, args = [], ext = '', extOutput = '') {
  return new Promise(async (resolve, reject) => {
    try {
      await ensureTmpDir()
      const tmp = join(tmpDir, `${Date.now()}_in.${ext}`)
      const out = join(tmpDir, `${Date.now()}_out.${extOutput}`)
      await fs.writeFile(tmp, buffer)

      const bin = ffmpegPath || 'ffmpeg'
      const process = spawn(bin, [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])

      process.on('error', async (err) => {
        try { await fs.unlink(tmp) } catch (e) {}
        try { await fs.unlink(out) } catch (e) {}
        reject(err)
      })

      process.on('close', async (code) => {
        try { await fs.unlink(tmp) } catch (e) {}
        if (code !== 0) {
          try { await fs.unlink(out) } catch (e) {}
          return reject(new Error(`FFmpeg falhou com o código de saída ${code}`))
        }
        try {
          const result = await fs.readFile(out)
          await fs.unlink(out)
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Converte imagem para WebP
 * @param {Buffer} buffer 
 * @returns {Promise<Buffer>}
 */
export function toImageWebp(buffer) {
  return ffmpeg(buffer, [
    '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
  ], 'jpeg', 'webp')
}

/**
 * Converte vídeo/gif curto para WebP animado
 * @param {Buffer} buffer 
 * @returns {Promise<Buffer>}
 */
export function toVideoWebp(buffer) {
  return ffmpeg(buffer, [
    '-vcodec', 'libwebp',
    '-filter:v', 'scale=\'min(320,iw)\':min\'(320,ih)\':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse',
    '-loop', '0',
    '-ss', '00:00:00',
    '-t', '00:00:07',
    '-preset', 'default',
    '-an',
    '-vsync', '0',
    '-s', '512:512'
  ], 'mp4', 'webp')
}
