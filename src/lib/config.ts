export type ConfigColores = {
  primary: string;
  onPrimary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  destructive: string;
};

export const coloresDefault: ConfigColores = {
  primary: "234 88 12",
  onPrimary: "255 255 255",
  secondary: "249 115 22",
  accent: "37 99 235",
  background: "255 247 237",
  foreground: "15 23 42",
  muted: "253 244 240",
  border: "252 234 225",
  destructive: "220 38 38",
};

export function parseColores(json: string): ConfigColores {
  try {
    const parsed = JSON.parse(json);
    return { ...coloresDefault, ...parsed };
  } catch {
    return coloresDefault;
  }
}

export function coloresToCssVars(c: ConfigColores): Record<string, string> {
  return {
    "--color-primary": c.primary,
    "--color-on-primary": c.onPrimary,
    "--color-secondary": c.secondary,
    "--color-accent": c.accent,
    "--color-background": c.background,
    "--color-foreground": c.foreground,
    "--color-muted": c.muted,
    "--color-border": c.border,
    "--color-destructive": c.destructive,
  };
}

export type CamposCliente = Record<
  string,
  { label: string; requerido: boolean; placeholder?: string }
>;

export function parseCamposCliente(json: string): CamposCliente {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
