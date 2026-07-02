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

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function mixRgb(
  color: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  amount: number,
) {
  return {
    r: clampChannel(color.r + (target.r - color.r) * amount),
    g: clampChannel(color.g + (target.g - color.g) * amount),
    b: clampChannel(color.b + (target.b - color.b) * amount),
  };
}

function rgba(color: { r: number; g: number; b: number }, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function readableGlassRgb(color: { r: number; g: number; b: number }) {
  const average = (color.r + color.g + color.b) / 3;
  const maxChannel = Math.max(color.r, color.g, color.b);
  const minChannel = Math.min(color.r, color.g, color.b);
  const spread = maxChannel - minChannel;

  if (average < 42) return mixRgb(color, { r: 190, g: 210, b: 236 }, 0.42);
  if (average > 214 && spread < 34) return mixRgb(color, { r: 98, g: 118, b: 148 }, 0.54);
  if (spread < 20) return mixRgb(color, { r: 124, g: 154, b: 194 }, 0.34);

  return color;
}

export function getLiquidGlassPalette(primaryColor: string, mutedColor = primaryColor) {
  const primary = cssColorToRgb(primaryColor) ?? cssColorToRgb("#8aa8ff")!;
  const muted = cssColorToRgb(mutedColor) ?? primary;
  const glass = readableGlassRgb(primary);
  const glassMuted = readableGlassRgb(muted);
  const deep = mixRgb(glassMuted, { r: 7, g: 10, b: 18 }, 0.72);
  const cool = mixRgb(glass, { r: 172, g: 220, b: 255 }, 0.18);
  const warm = mixRgb(glass, { r: 255, g: 150, b: 218 }, 0.18);

  return {
    tint: rgba(glass, 0.24),
    tintSoft: rgba(glass, 0.12),
    tintFaint: rgba(glass, 0.07),
    deep: rgba(deep, 0.86),
    deepSoft: rgba(deep, 0.54),
    edge: rgba(mixRgb(glass, { r: 255, g: 255, b: 255 }, 0.42), 0.64),
    edgeSoft: rgba(mixRgb(glass, { r: 255, g: 255, b: 255 }, 0.28), 0.22),
    shadow: rgba(mixRgb(glassMuted, { r: 0, g: 0, b: 0 }, 0.82), 0.48),
    cool: rgba(cool, 0.26),
    warm: rgba(warm, 0.18),
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
