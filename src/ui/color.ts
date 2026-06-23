export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed}`;
  return null;
}

function cssColorToRgb(color: string) {
  const normalized = normalizeHexColor(color);
  if (!normalized) {
    const rgbMatch = color
      .trim()
      .match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);

    if (!rgbMatch) return null;

    const [, red, green, blue] = rgbMatch;
    return {
      r: Math.min(255, Number.parseInt(red, 10)),
      g: Math.min(255, Number.parseInt(green, 10)),
      b: Math.min(255, Number.parseInt(blue, 10)),
    };
  }

  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function getReadableControlAccent(accent: string, fallback = "#1ed760") {
  const rgb = cssColorToRgb(accent);
  if (!rgb) return fallback;

  const maxChannel = Math.max(rgb.r, rgb.g, rgb.b);
  const minChannel = Math.min(rgb.r, rgb.g, rgb.b);
  const channelSpread = maxChannel - minChannel;
  const averageChannel = (rgb.r + rgb.g + rgb.b) / 3;
  const tooDarkForControls = maxChannel < 84 && averageChannel < 58;
  const almostWhite = minChannel > 232;
  const mutedGrayEdge =
    channelSpread < 22 && (averageChannel < 64 || averageChannel > 196);

  if (tooDarkForControls || almostWhite || mutedGrayEdge) return fallback;
  return accent;
}
