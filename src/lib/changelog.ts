import fs from "node:fs";
import path from "node:path";

export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export function getChangelogReleases(): ChangelogRelease[] {
  try {
    const changelogPath = path.join(process.cwd(), "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) {
      return [];
    }
    const content = fs.readFileSync(changelogPath, "utf-8");
    const releases: ChangelogRelease[] = [];

    const lines = content.split("\n");
    let currentRelease: ChangelogRelease | null = null;
    let currentSection: ChangelogSection | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Check version header: ## [1.0.0] - 2026-10-21 or ## 1.0.0 - 2026-10-21
      const versionMatch = line.match(/^##\s+\[?([0-9a-zA-Z.-]+)\]?\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (versionMatch) {
        const version = versionMatch[1];
        const date = versionMatch[2];
        if (version && date) {
          if (currentRelease) {
            if (currentSection) currentRelease.sections.push(currentSection);
            releases.push(currentRelease);
          }
          currentRelease = {
            version,
            date,
            sections: [],
          };
          currentSection = null;
        }
        continue;
      }

      // Check section header: ### Added, ### Changed, etc.
      const sectionMatch = line.match(/^###\s+(.+)$/);
      if (sectionMatch && currentRelease) {
        const sectionTitle = sectionMatch[1];
        if (sectionTitle) {
          if (currentSection) {
            currentRelease.sections.push(currentSection);
          }
          currentSection = {
            title: sectionTitle,
            items: [],
          };
        }
        continue;
      }

      // Check list items: - Item text
      if (line.startsWith("-") && currentSection) {
        const itemText = line.replace(/^-\s*/, "").trim();
        if (itemText) {
          currentSection.items.push(itemText);
        }
        continue;
      }

      // Sub-items or continuation
      if (line.startsWith("  -") && currentSection && currentSection.items.length > 0) {
        const subItem = line.replace(/^\s*-\s*/, "").trim();
        const lastIdx = currentSection.items.length - 1;
        if (currentSection.items[lastIdx]) {
          currentSection.items[lastIdx] += ` (${subItem})`;
        }
      }
    }

    if (currentRelease) {
      if (currentSection) currentRelease.sections.push(currentSection);
      releases.push(currentRelease);
    }

    return releases;
  } catch (err) {
    process.stderr.write(`Failed to parse CHANGELOG.md: ${err}\n`);
    return [];
  }
}
