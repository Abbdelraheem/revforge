import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const runtime = "edge";
export const alt = `${BRAND.name} — clean-room architecture reconstruction`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbf9f4",
          color: "#1c1917",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #d6cec2",
              borderRadius: 8,
              background: "#f4efe6",
              color: "#c2410c",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{BRAND.name}</div>
            <div style={{ fontSize: 18, color: "#5c534a" }}>Clean-room systems</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ width: 72, height: 5, background: "#c2410c" }} />
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, maxWidth: 900 }}>
            Architecture reconstruction with evidence you can inspect.
          </div>
          <div style={{ fontSize: 24, color: "#5c534a", maxWidth: 820, lineHeight: 1.35 }}>
            Observed contracts, measured parity, versioned delivery, and a deployable source archive.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #d6cec2",
            paddingTop: 22,
            fontSize: 20,
            color: "#5c534a",
            fontFamily: "monospace",
          }}
        >
          <span>{BRAND.domain}</span>
          <span>Technical editorial · warm paper</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
