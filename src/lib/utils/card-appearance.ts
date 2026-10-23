/** Resolve cores antigas em HSL e novas cores hex sem depender do DOM. */
export function cardAppearance(color: string) {
  let hex = color.trim().toLowerCase()
  if (/^#[\da-f]{3}$/.test(hex)) {
    hex = '#' + [...hex.slice(1)].map((digit) => digit.repeat(2)).join('')
  }
  const hsl = hex.match(/^hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%\s*\)$/)
  if (hsl) {
    const hue = Number(hsl[1]) % 360
    const saturation = Math.min(100, Number(hsl[2])) / 100
    const lightness = Math.min(100, Number(hsl[3])) / 100
    const a = saturation * Math.min(lightness, 1 - lightness)
    hex =
      '#' +
      [0, 8, 4]
        .map((offset) => {
          const k = (offset + hue / 30) % 12
          const channel =
            lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
          return Math.round(255 * channel)
            .toString(16)
            .padStart(2, '0')
        })
        .join('')
  }
  if (!/^#[\da-f]{6}$/.test(hex)) hex = '#18181b'
  const channels = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  const luminance =
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  const light = luminance > 0.179
  return {
    color: hex,
    foreground: light ? '#000000' : '#ffffff',
    // O acabamento aumenta o contraste em vez de clarear o texto branco.
    backgroundImage: light
      ? 'linear-gradient(120deg, #ffffff20, transparent 55%, #ffffff10)'
      : 'linear-gradient(120deg, #00000008, transparent 55%, #00000040)',
  }
}
