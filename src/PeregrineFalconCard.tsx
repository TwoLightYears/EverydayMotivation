import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  spring,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion";

const inter = "Inter, system-ui, sans-serif";
const playfair = "'Playfair Display', Georgia, serif";

const fontCss = `
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: italic;
  font-weight: 500;
  font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2');
}
`;

// Palette — drawn from live peregrine falcon coloration.
const NAVY = "#0B1420";
const NAVY_DEEP = "#070C15";
const SLATE_MID = "#3E4A5A";
const SLATE_PALE = "#8E9AA8";
const CREAM = "#EDE0C6";
const CREAM_DIM = "#C7BC9E";
const CERE = "#F0B420";
const GRID = "#182233";
const GRID_MAJOR = "#22304A";

// ── Card geometry ────────────────────────────────────────────────────
// Canvas: 1080 × 1350 portrait.
const FRAME = { x: 80, y: 140, w: 920, h: 780 };

// Peregrine silhouette — iconic diving falcon, head-DOWN.
// Local space: 220 wide × 340 tall, origin top-left.
// Composition: narrow spindle body, two swept-back wings extending outward
// from the shoulders, splayed closed-tail feathers at the top, and a small
// distinct head with hooked beak, cere accent, moustache stripe, and eye.
const FALCON_BODY_D = `
  M 110 34
  C 96 44, 92 60, 92 90
  L 90 220
  C 90 250, 96 274, 110 288
  C 124 274, 130 250, 130 220
  L 128 90
  C 128 60, 124 44, 110 34
  Z
`;
const FALCON_TAIL_D = `
  M 96 40
  L 110 4
  L 124 40
  L 120 66
  L 100 66
  Z
`;
const FALCON_WING_L_D = `
  M 92 130
  L 10 30
  L 44 108
  L 92 186
  Z
`;
const FALCON_WING_R_D = `
  M 128 130
  L 210 30
  L 176 108
  L 128 186
  Z
`;
const FALCON_HEAD_D = `
  M 110 268
  C 96 268, 88 278, 88 290
  C 88 302, 96 310, 110 310
  C 124 310, 132 302, 132 290
  C 132 278, 124 268, 110 268
  Z
`;
const FALCON_BEAK_D = `
  M 110 308
  L 104 314
  L 108 328
  L 116 318
  L 112 314
  Z
`;
const FALCON_MOUSTACHE_D = `
  M 100 296
  L 98 306
  L 104 302
  Z
`;

// ── Helpers ──────────────────────────────────────────────────────────
const tickRange = (
  min: number,
  max: number,
  major: number,
): { i: number; isMajor: boolean }[] => {
  const out: { i: number; isMajor: boolean }[] = [];
  for (let i = min; i <= max; i++) {
    out.push({ i, isMajor: ((i % major) + major) % major === 0 });
  }
  return out;
};

export const PeregrineFalconCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing (frames).
  const T_INTRO = fps * 0.5; // frame reveal
  const T_DIVE_START = fps * 0.9;
  const T_DIVE_END = fps * 4.1;
  const T_TITLE = fps * 1.4;
  const T_HOOK = fps * 2.4;

  // Dive progress (0 → 1) with ease-in cubic — dramatises acceleration.
  const diveRaw = interpolate(
    frame,
    [T_DIVE_START, T_DIVE_END],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const dive = Math.pow(diveRaw, 2.4);

  // Frame reveal spring — the HUD window snaps in.
  const frameReveal = spring({
    frame: frame - T_INTRO,
    fps,
    config: { damping: 200, mass: 0.7 },
  });

  const titleSpring = spring({
    frame: frame - T_TITLE,
    fps,
    config: { damping: 200, mass: 0.8 },
  });

  const hookOpacity = interpolate(
    frame,
    [T_HOOK, T_HOOK + fps * 0.9],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Airspeed climbs 0 → 389 km/h across the dive.
  const airspeed = Math.round(interpolate(dive, [0, 1], [0, 389]));
  // Altitude descends 1200 m → 40 m across the dive (matches tape range).
  const altitude = Math.round(interpolate(dive, [0, 1], [1200, 40]));

  // Falcon silhouette position inside FRAME (in FRAME-local px).
  // Local box is 220 wide × 340 tall; scaled ~0.75 for hero size.
  const falconScale = interpolate(dive, [0, 1], [0.72, 0.92]);
  const silhouetteW = 220 * falconScale;
  const silhouetteH = 340 * falconScale;
  const fx = FRAME.w / 2 - silhouetteW / 2;
  const fyStart = 20;
  const fyEnd = FRAME.h - silhouetteH - 90;
  const fy = interpolate(dive, [0, 1], [fyStart, fyEnd]);

  // Motion streaks trailing the falcon as speed climbs.
  const streakOpacity = interpolate(dive, [0.05, 0.55], [0, 0.55], {
    extrapolateRight: "clamp",
  });

  // Tape scroll: align the current-value bug (at y=220 in tape-local space)
  // to the current numeric tick.
  //   Airspeed ticks: value = i*20  →  local y = 220 - i*22
  //     scroll = (airspeed/20)*22
  //   Altitude ticks: value = 1200 - i*40  →  local y = i*22
  //     scroll such that (i*22 - scroll) = 220  →  scroll = ((1200-alt)/40)*22 - 220
  const speedScroll = (airspeed / 20) * 22;
  const altScroll = ((1200 - altitude) / 40) * 22 - 220;

  // Nictitating membrane sweep — cycles laterally in the eye inset.
  const wipeCycle = ((frame % (fps * 1.6)) / (fps * 1.6));
  const wipeX = interpolate(wipeCycle, [0, 0.5, 1], [-52, 52, -52], {
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, fontFamily: inter }}>
      <style>{fontCss}</style>

      {/* Top metadata band */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 80,
          right: 80,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SLATE_PALE,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: CERE }}>2026 · 08 · 25</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="hud-grid"
            x={FRAME.x}
            y={FRAME.y}
            width={40}
            height={40}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="hud-grid-major"
            x={FRAME.x}
            y={FRAME.y}
            width={160}
            height={160}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 160 0 L 0 0 0 160"
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="hud-vignette" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#111C2E" stopOpacity={1} />
            <stop offset="100%" stopColor={NAVY_DEEP} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="atmos" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0F1A2B" />
            <stop offset="60%" stopColor="#0B1420" />
            <stop offset="100%" stopColor="#050912" />
          </linearGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          <clipPath id="hud-clip">
            <rect
              x={FRAME.x}
              y={FRAME.y}
              width={FRAME.w}
              height={FRAME.h}
            />
          </clipPath>

          <clipPath id="eye-clip">
            <ellipse cx="0" cy="0" rx="56" ry="34" />
          </clipPath>

          <clipPath id="speed-tape-clip">
            <rect x="0" y="0" width="72" height="440" />
          </clipPath>
          <clipPath id="alt-tape-clip">
            <rect x="0" y="0" width="72" height="440" />
          </clipPath>
        </defs>

        {/* HUD board */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#hud-vignette)"
        />
        {/* Atmospheric wash inside frame — deepens toward the bottom */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#atmos)"
          opacity={0.55}
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#hud-grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#hud-grid-major)"
        />

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={SLATE_MID}
          strokeWidth={1}
          opacity={0.9 * frameReveal}
        />

        {/* Corner brackets (crop marks) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g
            key={i}
            stroke={CERE}
            strokeWidth={1.5}
            fill="none"
            opacity={frameReveal}
          >
            <line x1={cx} y1={cy} x2={cx + sx * 34} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 34} />
          </g>
        ))}

        {/* HUD content (clipped to frame) */}
        <g clipPath="url(#hud-clip)">
          {/* Reticle cross-hairs (subtle) at frame centre */}
          <g
            stroke={SLATE_MID}
            strokeWidth={1}
            opacity={0.35 * frameReveal}
          >
            <line
              x1={FRAME.x + FRAME.w / 2}
              y1={FRAME.y + 30}
              x2={FRAME.x + FRAME.w / 2}
              y2={FRAME.y + FRAME.h - 30}
              strokeDasharray="2 8"
            />
            <line
              x1={FRAME.x + 30}
              y1={FRAME.y + FRAME.h / 2}
              x2={FRAME.x + FRAME.w - 30}
              y2={FRAME.y + FRAME.h / 2}
              strokeDasharray="2 8"
            />
          </g>

          {/* Motion streaks — trailing the falcon at speed */}
          <g opacity={streakOpacity}>
            {Array.from({ length: 11 }).map((_, i) => {
              const cx = FRAME.x + fx + silhouetteW / 2 + (i - 5) * 22;
              const yBottom = FRAME.y + fy + silhouetteH * 0.15;
              const yTop = Math.max(FRAME.y + 40, FRAME.y + fy - 260);
              const mag = Math.abs(i - 5);
              return (
                <line
                  key={i}
                  x1={cx}
                  y1={yTop}
                  x2={cx}
                  y2={yBottom}
                  stroke={CREAM}
                  strokeOpacity={0.28 - mag * 0.045}
                  strokeWidth={mag < 2 ? 1.6 : 1}
                />
              );
            })}
          </g>

          {/* Dive-path guide — a bright dashed line from top of frame to falcon head */}
          <line
            x1={FRAME.x + FRAME.w / 2}
            y1={FRAME.y + 40}
            x2={FRAME.x + FRAME.w / 2}
            y2={FRAME.y + fy + silhouetteH * 0.15}
            stroke={CERE}
            strokeWidth={1.2}
            strokeDasharray="2 8"
            opacity={0.55 * frameReveal}
          />

          {/* The falcon silhouette in full stoop */}
          <g
            transform={`translate(${FRAME.x + fx}, ${FRAME.y + fy}) scale(${falconScale})`}
            opacity={frameReveal}
          >
            {/* Swept-back wing tucks first (behind the body) */}
            <path d={FALCON_WING_L_D} fill={CREAM_DIM} />
            <path d={FALCON_WING_R_D} fill={CREAM_DIM} />
            {/* Splayed closed-tail feathers at top */}
            <path d={FALCON_TAIL_D} fill={CREAM_DIM} />
            {/* Body */}
            <path d={FALCON_BODY_D} fill={CREAM} />
            {/* Head */}
            <path d={FALCON_HEAD_D} fill={CREAM} />
            {/* Hooked beak — cere-yellow tip */}
            <path d={FALCON_BEAK_D} fill={CERE} />
            {/* Moustache stripe (peregrine diagnostic) */}
            <path d={FALCON_MOUSTACHE_D} fill={NAVY} opacity={0.95} />
            {/* Eye with yellow ring */}
            <circle cx={120} cy={286} r={4.2} fill={CERE} />
            <circle cx={120} cy={286} r={2.5} fill={NAVY} />
            {/* Underside shadow to add subtle depth */}
            <path
              d={FALCON_BODY_D}
              fill="url(#atmos)"
              opacity={0.14}
            />
          </g>

          {/* Callout leader → labels the moustache mark, routed to the RIGHT
              side so it doesn't collide with the altitude tape */}
          <g
            opacity={interpolate(dive, [0.15, 0.5], [0, 0.9], {
              extrapolateRight: "clamp",
            })}
            stroke={CERE}
            fill={CERE}
            fontFamily={inter}
            fontWeight={600}
            fontSize={11}
            letterSpacing={2.5}
          >
            {(() => {
              const anchorX = FRAME.x + fx + silhouetteW * 0.55;
              const anchorY = FRAME.y + fy + silhouetteH * 0.94;
              const kneeX = anchorX + 90;
              const kneeY = anchorY - 30;
              const endX = kneeX + 70;
              return (
                <>
                  <line
                    x1={anchorX}
                    y1={anchorY}
                    x2={kneeX}
                    y2={kneeY}
                    strokeWidth={1}
                  />
                  <line
                    x1={kneeX}
                    y1={kneeY}
                    x2={endX}
                    y2={kneeY}
                    strokeWidth={1}
                  />
                  <text
                    x={endX + 6}
                    y={kneeY + 4}
                    textAnchor="start"
                    stroke="none"
                  >
                    MOUSTACHE MARK
                  </text>
                </>
              );
            })()}
          </g>
        </g>

        {/* ── Airspeed tape (right column) ─────────────────────────── */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 118}, ${FRAME.y + 40})`}
          opacity={frameReveal}
        >
          <text
            x={0}
            y={-14}
            fill={SLATE_PALE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
          >
            KM / H
          </text>
          <rect
            x={0}
            y={0}
            width={102}
            height={440}
            fill={NAVY_DEEP}
            stroke={SLATE_MID}
            strokeWidth={1}
            opacity={0.85}
          />
          <g clipPath="url(#speed-tape-clip)">
            <g transform={`translate(0, ${speedScroll})`}>
              {tickRange(-2, 30, 4).map(({ i, isMajor }) => {
                const value = i * 20;
                if (value < 0) return null;
                return (
                  <g key={i}>
                    <line
                      x1={0}
                      y1={220 - i * 22}
                      x2={isMajor ? 20 : 10}
                      y2={220 - i * 22}
                      stroke={isMajor ? CREAM : SLATE_PALE}
                      strokeWidth={isMajor ? 1.5 : 1}
                    />
                    {isMajor && (
                      <text
                        x={28}
                        y={220 - i * 22 + 4}
                        fill={CREAM_DIM}
                        fontFamily={inter}
                        fontSize={11}
                        letterSpacing={2}
                      >
                        {value.toString().padStart(3, "0")}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
          {/* Current-value bug */}
          <g transform={`translate(0, 220)`}>
            <polygon
              points="0,-12 12,0 0,12"
              fill={CERE}
            />
            <rect
              x={0}
              y={-14}
              width={96}
              height={28}
              fill={NAVY}
              stroke={CERE}
              strokeWidth={1.4}
            />
            <text
              x={90}
              y={5}
              textAnchor="end"
              fill={CERE}
              fontFamily={inter}
              fontWeight={600}
              fontSize={17}
              letterSpacing={2}
            >
              {airspeed.toString().padStart(3, "0")}
            </text>
          </g>
        </g>

        {/* ── Altitude tape (left column) ──────────────────────────── */}
        <g
          transform={`translate(${FRAME.x + 16}, ${FRAME.y + 40})`}
          opacity={frameReveal}
        >
          <text
            x={0}
            y={-14}
            fill={SLATE_PALE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={500}
          >
            ALT / M
          </text>
          <rect
            x={0}
            y={0}
            width={102}
            height={440}
            fill={NAVY_DEEP}
            stroke={SLATE_MID}
            strokeWidth={1}
            opacity={0.85}
          />
          <g clipPath="url(#alt-tape-clip)">
            <g transform={`translate(0, ${-altScroll})`}>
              {tickRange(-12, 40, 4).map(({ i, isMajor }) => {
                const value = 1200 - i * 40;
                if (value < 0 || value > 1600) return null;
                return (
                  <g key={i}>
                    <line
                      x1={102 - (isMajor ? 20 : 10)}
                      y1={i * 22}
                      x2={102}
                      y2={i * 22}
                      stroke={isMajor ? CREAM : SLATE_PALE}
                      strokeWidth={isMajor ? 1.5 : 1}
                    />
                    {isMajor && (
                      <text
                        x={102 - 28}
                        y={i * 22 + 4}
                        textAnchor="end"
                        fill={CREAM_DIM}
                        fontFamily={inter}
                        fontSize={11}
                        letterSpacing={2}
                      >
                        {value.toString()}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
          {/* Current-value bug */}
          <g transform={`translate(0, 220)`}>
            <polygon
              points="102,-12 90,0 102,12"
              fill={CERE}
            />
            <rect
              x={6}
              y={-14}
              width={96}
              height={28}
              fill={NAVY}
              stroke={CERE}
              strokeWidth={1.4}
            />
            <text
              x={14}
              y={5}
              fill={CERE}
              fontFamily={inter}
              fontWeight={600}
              fontSize={17}
              letterSpacing={2}
            >
              {altitude.toString()}
            </text>
          </g>
        </g>

        {/* ── Nictitating-membrane inset (bottom LEFT of HUD, below alt tape) ── */}
        <g
          transform={`translate(${FRAME.x + 208}, ${FRAME.y + FRAME.h - 130})`}
          opacity={frameReveal}
        >
          {/* Aviator gauge ring */}
          <circle
            r={78}
            fill={NAVY_DEEP}
            stroke={SLATE_MID}
            strokeWidth={1.2}
          />
          <circle
            r={70}
            fill="none"
            stroke={SLATE_MID}
            strokeWidth={1}
            strokeDasharray="2 6"
          />
          {/* Eye */}
          <g>
            <ellipse
              cx={0}
              cy={0}
              rx={56}
              ry={34}
              fill={CREAM}
            />
            {/* Iris */}
            <circle cx={0} cy={0} r={22} fill="#1E1610" />
            <circle cx={0} cy={0} r={14} fill="#000000" />
            {/* Yellow eye-ring — peregrine's cere-adjacent orbital skin */}
            <ellipse
              cx={0}
              cy={0}
              rx={56}
              ry={34}
              fill="none"
              stroke={CERE}
              strokeWidth={2.5}
            />
            {/* Nictitating membrane sweep (clipped to eye) */}
            <g clipPath="url(#eye-clip)">
              <rect
                x={wipeX - 60}
                y={-40}
                width={70}
                height={80}
                fill={CERE}
                opacity={0.55}
              />
              <line
                x1={wipeX}
                y1={-36}
                x2={wipeX}
                y2={36}
                stroke={CREAM}
                strokeWidth={1.4}
                opacity={0.9}
              />
            </g>
          </g>
          {/* Callout ring label */}
          <text
            y={-92}
            textAnchor="middle"
            fill={SLATE_PALE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={500}
          >
            NICTITATING MEMBRANE
          </text>
          <text
            y={102}
            textAnchor="middle"
            fill={CERE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.5}
            fontWeight={600}
          >
            SWEEP · 1.6 s CYCLE
          </text>
        </g>

        {/* Caption strip just below the HUD frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={SLATE_PALE}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · TERMINAL STOOP · TELEMETRY DROP, 21 OCT 1999</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={CERE}
            opacity={0.85}
          >
            389 KM / H · FASTEST MEASURED
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 970,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: CERE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SLATE_PALE, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>
            Fighter Pilot
          </span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          Cleared for stoop.
        </div>

        <div
          style={{
            marginTop: 22,
            color: "#C7C2B4",
            fontFamily: inter,
            fontSize: 17.5,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The peregrine "Frightful" was clocked at{" "}
          <span style={{ color: CERE, fontWeight: 600 }}>389 km/h</span> in a
          1999 telemetry drop — the fastest measured dive on any animal. A
          translucent third eyelid — the{" "}
          <em style={{ color: CREAM }}>nictitating membrane</em> — sweeps
          sideways across her eye through the plunge, wiping airborne debris
          while she still holds visual lock on the target.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: SLATE_PALE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Franklin · Skydiver Telemetry, 21 Oct 1999</span>
        <span>
          <span style={{ color: CERE }}>●</span> Cere yellow = HUD accent
        </span>
      </div>
    </AbsoluteFill>
  );
};
