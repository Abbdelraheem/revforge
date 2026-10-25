/**
 * WCAG AA contrast gate for the text/surface token pairs used by the app.
 *
 * Normal text must be at least 4.5:1. The script exits non-zero when any
 * pair used by a normal-size label falls below that threshold.
 */

type Rgb = [number, number, number];

function hsl(h: number, s: number, l: number): Rgb {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return lightness - chroma * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [channel(0), channel(8), channel(4)].map((value) =>
    Math.round(255 * value)
  ) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: Rgb, background: Rgb): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const paper = hsl(40, 30, 97);
const card = hsl(0, 0, 100);
const ink = hsl(28, 14, 11);
const primary = hsl(16, 78, 42);
const primaryForeground = hsl(40, 30, 98);
const muted = hsl(38, 18, 94);
const mutedForeground = hsl(28, 8, 36);

const pairs: Array<{ name: string; foreground: Rgb; background: Rgb }> = [
  { name: "Ink on paper", foreground: ink, background: paper },
  { name: "Ink on card", foreground: ink, background: card },
  { name: "Primary on paper", foreground: primary, background: paper },
  { name: "Primary on card", foreground: primary, background: card },
  {
    name: "Primary-foreground on primary",
    foreground: primaryForeground,
    background: primary,
  },
  { name: "Muted foreground on paper", foreground: mutedForeground, background: paper },
  { name: "Muted foreground on card", foreground: mutedForeground, background: card },
  { name: "Muted foreground on muted", foreground: mutedForeground, background: muted },
  { name: "Success on card", foreground: hsl(150, 50, 28), background: card },
  { name: "Warning on card", foreground: hsl(36, 92, 34), background: card },
  { name: "Destructive on card", foreground: hsl(0, 66, 44), background: card },
  { name: "Info on card", foreground: hsl(208, 55, 38), background: card },
];

let failed = false;
for (const pair of pairs) {
  const ratio = contrast(pair.foreground, pair.background);
  const pass = ratio >= 4.5;
  if (!pass) failed = true;
  process.stdout.write(
    `${pass ? "PASS" : "FAIL"}  ${pair.name}: ${ratio.toFixed(2)}:1 (minimum 4.50:1)\n`
  );
}

process.exit(failed ? 1 : 0);
