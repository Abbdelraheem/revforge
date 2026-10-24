import "dotenv/config";
import { runAutoCalibration } from "../src/lib/billing/auto-calibrate";

async function main() {
  const forceApply = process.argv.includes("--apply");
  process.stdout.write(`[Auto-Calibrate] Running tier calibration pass (apply: ${forceApply})...\n`);

  try {
    const report = await runAutoCalibration({ forceApply });
    process.stdout.write(`\nCalibration completed at ${report.timestamp} (applied: ${report.applied})\n`);
    process.stdout.write("----------------------------------------------------------------------\n");

    for (const [tier, metrics] of Object.entries(report.tiers)) {
      const deltaStr = metrics.rateDeltaPct >= 0 ? `+${metrics.rateDeltaPct}%` : `${metrics.rateDeltaPct}%`;
      process.stdout.write(
        `Tier: ${tier.padEnd(16)} | Margin: ${(metrics.measuredMarginPct ?? 0).toFixed(1)}% | Rate: $${(
          metrics.currentHourlyRateCents / 100
        ).toFixed(0)} -> $${(metrics.recommendedHourlyRateCents / 100).toFixed(0)} (${deltaStr}) | Min: $${(
          metrics.recommendedMinOrderCents / 100
        ).toFixed(0)}\n`
      );
      process.stdout.write(`  Rationale: ${metrics.rationale}\n`);
    }

    if (report.auditLogId) {
      process.stdout.write(`\nAudit log recorded: ${report.auditLogId}\n`);
    }

    process.exit(0);
  } catch (err) {
    process.stderr.write(`[Auto-Calibrate] Failed: ${err}\n`);
    process.exit(1);
  }
}

main();
