import { toImageWebp, toVideoWebp } from './converter.js'
import webp from 'node-webpmux'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

/**
 * Adiciona metadados EXIF ao buffer WebP (Packname e Autor)
 * @param {Buffer} wMedia - Buffer WebP
 * @param {string} packname - Nome do pacote
 * @param {string} author - Autor da figurinha
 * @param {Array<string>} categories - Emojis relacionados
 * @returns {Promise<Buffer>}
 */
export async function addExif(wMedia, packname = global.packname || 'BOT SEVEN', author = global.author || 'Seven', categories = ['🤖']) {
  try {
    const img = new webp.Image()
    const json = {
      'sticker-pack-id': 'https://github.com',
      'sticker-pack-name': packname,
      'sticker-pack-publisher': author,
      'emojis': categories
    }
    
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
    let exif = Buffer.concat([exifAttr, jsonBuff])
    exif.writeUIntLE(jsonBuff.length, 14, 4)

    await img.load(wMedia)
    img.exif = exif
    return await img.save(null)
  } catch (e) {
    console.error('Erro ao adicionar EXIF:', e)
    return wMedia
  }
}

/**
 * Cria sticker a partir de um buffer (Imagem ou Vídeo) com metadados
 * @param {Buffer} imgBuffer - Buffer do arquivo
 * @param {boolean} isVideo - Flag indicando se é vídeo/gif
 * @param {string} packname - Nome do pacote
 * @param {string} author - Autor
 * @returns {Promise<Buffer>}
 */
export async function createSticker(imgBuffer, isVideo = false, packname = global.packname || 'BOT SEVEN', author = global.author || 'Seven') {
  try {
    if (!isVideo) {
      // Criação rápida usando wa-sticker-formatter
      const sticker = new Sticker(imgBuffer, {
        pack: packname,
        author: author,
        type: StickerTypes.FULL,
        categories: ['🤖'],
        quality: 70
      })
      return await sticker.toBuffer()
    } else {
      // Para vídeos/gifs animados usamos conversão ffmpeg + EXIF
      const webpBuffer = await toVideoWebp(imgBuffer)
      return await addExif(webpBuffer, packname, author)
    }
  } catch (err) {
    console.warn('Fallback para conversor FFmpeg alternativo:', err.message)
    let webpBuffer = isVideo ? await toVideoWebp(imgBuffer) : await toImageWebp(imgBuffer)
    return await addExif(webpBuffer, packname, author)
  }
}
