/**
 * WCAG AA Contrast Checker for design tokens.
 * Exits non-zero if any required text-on-background pair fails WCAG AA standards:
 * - Normal text: >= 4.5:1
 * - Large/UI components: >= 3.0:1
 */

interface HSL {
  h: number;
  s: number;
  l: number;
}

function parseHsl(str: string): HSL {
  // Parses "40 30% 97%" or "16 78% 42%"
  const parts = str.trim().split(/\s+/);
  const h = parseFloat(parts[0] || "0");
  const s = parseFloat((parts[1] || "0").replace("%", "")) / 100;
  const l = parseFloat((parts[2] || "0").replace("%", "")) / 100;
  return { h, s, l };
}

function hslToRgb(hsl: HSL): [number, number, number] {
  const { h, s, l } = hsl;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function getLuminance(rgb: [number, number, number]): number {
  const a = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0]! + 0.7152 * a[1]! + 0.0722 * a[2]!;
}

function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Token pairs to verify
const tokens: Record<string, string> = {
  background: "40 30% 97%",
  foreground: "28 14% 11%",
  card: "0 0% 100%",
  cardForeground: "28 14% 11%",
  primary: "16 78% 42%",
  primaryForeground: "40 30% 98%",
  muted: "38 18% 94%",
  mutedForeground: "28 8% 36%",
  secondary: "38 20% 93%",
  secondaryForeground: "28 14% 15%",
  destructive: "0 66% 44%",
  destructiveForeground: "40 30% 98%",
  success: "150 50% 28%",
  successForeground: "40 30% 98%",
};

const checks = [
  { name: "Body text on page background", fg: tokens.foreground!, bg: tokens.background!, min: 4.5 },
  { name: "Body text on card background", fg: tokens.cardForeground!, bg: tokens.card!, min: 4.5 },
  { name: "Primary button text on primary bg", fg: tokens.primaryForeground!, bg: tokens.primary!, min: 4.5 },
  { name: "Muted text on page background", fg: tokens.mutedForeground!, bg: tokens.background!, min: 4.5 },
  { name: "Secondary text on secondary bg", fg: tokens.secondaryForeground!, bg: tokens.secondary!, min: 4.5 },
  { name: "Destructive text on destructive bg", fg: tokens.destructiveForeground!, bg: tokens.destructive!, min: 4.5 },
  { name: "Success text on success bg", fg: tokens.successForeground!, bg: tokens.success!, min: 4.5 },
];

let allPassed = true;
console.log("=== WCAG Contrast Verification ===");

for (const check of checks) {
  const rgbFg = hslToRgb(parseHsl(check.fg));
  const rgbBg = hslToRgb(parseHsl(check.bg));
  const ratio = getContrastRatio(rgbFg, rgbBg);
  const passed = ratio >= check.min;

  console.log(
    `${passed ? "✓ PASS" : "✗ FAIL"} | ${check.name.padEnd(38)} | Ratio: ${ratio.toFixed(2)}:1 (Min: ${check.min}:1)`
  );

  if (!passed) {
    allPassed = false;
  }
}

if (!allPassed) {
  console.error("❌ Contrast check failed: Some token pairs do not meet WCAG AA standards.");
  process.exit(1);
} else {
  console.log("🎉 All design tokens pass WCAG AA contrast requirements!");
  process.exit(0);
}
