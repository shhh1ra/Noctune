export const themeIds = ["noctune", "liquid-glass"] as const;

export type ThemeId = (typeof themeIds)[number];

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  shellClass: string;
};

export const themes: ThemeDefinition[] = [
  {
    id: "noctune",
    name: "Noctune",
    description: "Dark dynamic album glow.",
    shellClass: "theme-noctune",
  },
  {
    id: "liquid-glass",
    name: "Liquid Glass",
    description: "Layered translucent panels tuned for Windows.",
    shellClass: "theme-liquid-glass",
  },
];

export function normalizeThemeId(value: unknown): ThemeId {
  return themeIds.includes(value as ThemeId) ? (value as ThemeId) : "noctune";
}

export function getThemeDefinition(themeId: ThemeId) {
  return themes.find((theme) => theme.id === themeId) ?? themes[0];
}
