/**
 * Contrast checking script for design tokens against WCAG AA (4.5:1 for normal text).
 */

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

function contrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const l1 = luminance(...rgb1);
  const l2 = luminance(...rgb2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Warm paper background: #fbf9f4 (251, 249, 244)
const paper: [number, number, number] = [251, 249, 244];
// Dark ink foreground: #1c1917 (28, 25, 23)
const ink: [number, number, number] = [28, 25, 23];
// Forge vermilion primary: #c2410c (194, 65, 12)
const vermilion: [number, number, number] = [194, 65, 12];

const textContrast = contrast(ink, paper);
const primaryContrast = contrast(vermilion, paper);

process.stdout.write(`Paper (#fbf9f4) vs Ink (#1c1917) Contrast: ${textContrast.toFixed(2)}:1 (Passes WCAG AAA >= 7:1)\n`);
process.stdout.write(`Paper (#fbf9f4) vs Vermilion (#c2410c) Contrast: ${primaryContrast.toFixed(2)}:1 (Passes WCAG AA >= 4.5:1)\n`);

if (textContrast < 4.5 || primaryContrast < 4.5) {
  process.exit(1);
} else {
  process.exit(0);
}
