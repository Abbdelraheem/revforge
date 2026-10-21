/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";

export function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original Target",
  afterLabel = "Reconstructed",
}: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
}) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-md border border-border select-none">
      {/* Background Image (After) */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute top-2 right-2 rounded bg-background/90 px-2 py-0.5 text-sm font-semibold border border-border">
        {afterLabel}
      </div>

      {/* Foreground Image (Before, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute top-2 left-2 rounded bg-background/90 px-2 py-0.5 text-sm font-semibold border border-border">
          {beforeLabel}
        </div>
      </div>

      {/* Slider divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full border border-border bg-background shadow flex items-center justify-center text-sm">
          ↔
        </div>
      </div>

      {/* Interactive Range Input */}
      <input
        type="range"
        min={0}
        max={100}
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-10"
      />
    </div>
  );
}
