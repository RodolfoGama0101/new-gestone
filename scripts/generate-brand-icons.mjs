import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Rasterize the existing interface mark; do not maintain a second brand drawing.
const root = new URL('../', import.meta.url)
const logo = await readFile(new URL('src/components/shared/logo.tsx', root), 'utf8')
const paths = [...logo.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1])
const strokeWidth = logo.match(/strokeWidth="([^"]+)"/)?.[1]
if (paths.length !== 2 || !strokeWidth) {
  throw new Error('Confira o SVG de Logo antes de gerar os ícones.')
}

// The mark fits within the central safe area of maskable icons.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="512" height="512"><rect width="40" height="40" fill="#171717"/><g transform="translate(8 8)" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths.map((d) => `<path d="${d}"/>`).join('')}</g></svg>\n`
await writeFile(new URL('public/logo.svg', root), svg)
await writeFile(new URL('public/logo.png', root), await sharp(Buffer.from(svg)).png().toBuffer())
await writeFile(
  new URL('plugins/gestone-private/assets/icon.jpg', root),
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer(),
)
for (const size of [192, 512]) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  for (const suffix of ['', '-maskable']) {
    await writeFile(new URL(`public/icons/icon-${size}${suffix}.png`, root), png)
  }
}

for (const [file, size] of [['icon.png', 32], ['apple-icon.png', 180]]) {
  await writeFile(
    new URL(`src/app/${file}`, root),
    await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer(),
  )
}

// ICO directory with PNG frames for legacy /favicon.ico requests.
const sizes = [16, 32, 48]
const frames = await Promise.all(sizes.map((size) => sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()))
const directory = Buffer.alloc(6 + sizes.length * 16)
directory.writeUInt16LE(1, 2)
directory.writeUInt16LE(sizes.length, 4)
let offset = directory.length
for (const [index, frame] of frames.entries()) {
  const entry = 6 + index * 16
  directory[entry] = sizes[index]
  directory[entry + 1] = sizes[index]
  directory.writeUInt16LE(1, entry + 4)
  directory.writeUInt16LE(32, entry + 6)
  directory.writeUInt32LE(frame.length, entry + 8)
  directory.writeUInt32LE(offset, entry + 12)
  offset += frame.length
}
await writeFile(new URL('src/app/favicon.ico', root), Buffer.concat([directory, ...frames]))
