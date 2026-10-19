export interface ClassBand {
  minHours: number;
  maxHours: number;
}

export const FEATURE_CLASS_BANDS: Record<string, ClassBand> = {
  auth: { minHours: 6, maxHours: 24 },
  payments: { minHours: 12, maxHours: 60 },
  dashboard: { minHours: 8, maxHours: 40 },
  static_page: { minHours: 1, maxHours: 6 },
  admin_console: { minHours: 20, maxHours: 80 },
  realtime: { minHours: 8, maxHours: 30 },
  database_modeling: { minHours: 4, maxHours: 20 },
  api_integration: { minHours: 6, maxHours: 32 },
  file_storage: { minHours: 4, maxHours: 16 },
  notifications: { minHours: 4, maxHours: 18 },
  reporting: { minHours: 8, maxHours: 36 },
};

/**
 * Clamps proposed hours to class band and flags if clamped by > 50%
 */
export function clampFeatureHours(
  featureClass: string,
  proposedHours: number
): { clampedHours: number; needsReview: boolean } {
  const band = FEATURE_CLASS_BANDS[featureClass];
  if (!band) {
    const fallback = Math.max(0.25, Math.min(200, proposedHours));
    return { clampedHours: fallback, needsReview: false };
  }

  const clamped = Math.max(band.minHours, Math.min(band.maxHours, proposedHours));
  const diffRatio = Math.abs(clamped - proposedHours) / Math.max(0.25, proposedHours);
  const needsReview = diffRatio > 0.50;

  return { clampedHours: clamped, needsReview };
}
