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

// ── Palette (from concept brief) ────────────────────────────────────────
const INK = "#070A10";
const TEAL = "#123140";
const SHELL = "#E8A86B";
const FLASH = "#FFE3A3";
const ARC = "#FF5A2C";
// Derived tones (tints/shades only — no new hues)
const GRID = "#0F2534";
const GRID_MAJOR = "#163D4F";
const GRAY = "#7E8894";
const SHELL_DARK = "#8C603A";
const WHITE = "#F4F4F6";

// ── Layout ──────────────────────────────────────────────────────────────
const FRAME = { x: 60, y: 130, w: 960, h: 650 };

// Snap pivot — where the dactyl hinges
const PIVOT = { x: 310, y: 450 };
// Plasma centre — where cavitation collapses
const PLASMA = { x: 720, y: 450 };

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Timeline (in seconds) ─────────────────────────────────────────────
  //   0.0 - 0.4   cocked, charging
  //   0.4 - 1.2   snap (spring)
  //   1.2 - 2.2   plasma flash + shockwaves
  //   2.2 - 6.0   settle & loop breathe
  const snapStart = fps * 0.4;
  const snap = spring({
    frame: frame - snapStart,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 180 },
  });

  // Claw dactyl rotation: 24° open → 0° closed
  const openAngle = interpolate(snap, [0, 1], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Flash intensity rises just after snap completes
  const flashStart = fps * 1.05;
  const flashRise = interpolate(
    frame,
    [flashStart, flashStart + fps * 0.35],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const flashDecay = interpolate(
    frame,
    [flashStart + fps * 0.8, flashStart + fps * 2.8],
    [1, 0.55],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const flash = Math.min(flashRise, flashDecay);

  // Temperature sweep (300 K → 4700 K)
  const tempT = interpolate(
    frame,
    [flashStart - fps * 0.1, flashStart + fps * 0.6],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const tempK = Math.round(300 + (4700 - 300) * tempT);

  // Type reveal
  const titleSpring = spring({
    frame: frame - fps * 1.1,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 1.6, fps * 2.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Looping hold — flash breathes very subtly after the hit
  const breathePhase = (frame % durationInFrames) / durationInFrames;
  const breathe = 0.92 + 0.08 * Math.sin(breathePhase * Math.PI * 2);

  // ── SHOCKWAVE RINGS ──────────────────────────────────────────────────
  const RINGS = [0, 0.06, 0.12, 0.18, 0.24];
  const RING_LIFE = fps * 0.95; // frames
  const RING_MAX_R = 135; // px — kept well inside the plasma region

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: ARC }}>2026 · 11 · 19</span>
      </div>

      {/* Main schematic SVG */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Fine engineering grid inside the frame */}
          <pattern
            id="grid"
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
            id="grid-major"
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

          <radialGradient id="chamber-vignette" cx="60%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#0C1A24" stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          {/* Plasma gradients */}
          <radialGradient id="plasma-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={WHITE} stopOpacity={1} />
            <stop offset="20%" stopColor={FLASH} stopOpacity={0.95} />
            <stop offset="55%" stopColor={ARC} stopOpacity={0.7} />
            <stop offset="100%" stopColor={ARC} stopOpacity={0} />
          </radialGradient>
          <radialGradient id="plasma-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH} stopOpacity={0.5} />
            <stop offset="60%" stopColor={ARC} stopOpacity={0.15} />
            <stop offset="100%" stopColor={ARC} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="shell-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SHELL} stopOpacity={0.9} />
            <stop offset="100%" stopColor={SHELL_DARK} stopOpacity={0.9} />
          </linearGradient>

          <filter id="softglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="hotglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Chamber */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#chamber-vignette)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#grid-major)"
        />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1F4A60"
          strokeWidth={1}
        />

        {/* Corner tick marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={ARC} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Plate heading at top of chamber */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 36})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
        >
          <text>PLATE III · CAVITATION WELDING EVENT</text>
        </g>
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 36})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.2}
          fontWeight={600}
          textAnchor="end"
        >
          <text>t = 0 — 300 µs</text>
        </g>

        {/* ── CLAW SCHEMATIC ─────────────────────────────────────── */}
        <g>
          {/* Carpus/arm stub trailing off to the left */}
          <g fill="url(#shell-fill)" stroke={SHELL} strokeWidth={1.5}>
            <path
              d={`
                M 110 420
                L 230 405
                L 265 418
                L 290 432
                L 290 476
                L 265 490
                L 230 500
                L 110 488
                Z
              `}
            />
          </g>
          {/* Arm segment join line */}
          <line
            x1={230}
            y1={405}
            x2={230}
            y2={500}
            stroke={SHELL_DARK}
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
          />

          {/* Propodus body — "chassis" that holds the plunger-socket */}
          <path
            d={`
              M 268 428
              L 430 420
              L 470 432
              L 470 472
              L 430 484
              L 268 476
              Z
            `}
            fill="url(#shell-fill)"
            stroke={SHELL}
            strokeWidth={1.5}
          />

          {/* Fixed finger (lower) with the socket cavity */}
          <path
            d={`
              M 430 468
              L 560 476
              L 580 486
              L 585 500
              L 560 510
              L 440 506
              Z
            `}
            fill="url(#shell-fill)"
            stroke={SHELL}
            strokeWidth={1.5}
          />
          {/* Socket cavity — where water jets out toward plasma */}
          <path
            d={`
              M 500 484
              L 548 486
              L 575 492
              L 555 500
              L 510 500
              Z
            `}
            fill={INK}
            stroke={SHELL_DARK}
            strokeWidth={1}
          />

          {/* Pivot hinge */}
          <circle
            cx={PIVOT.x}
            cy={PIVOT.y}
            r={9}
            fill={INK}
            stroke={SHELL}
            strokeWidth={2}
          />
          <circle cx={PIVOT.x} cy={PIVOT.y} r={2.5} fill={SHELL} />

          {/* Moving dactyl (upper) — rotates about PIVOT */}
          <g transform={`rotate(${-openAngle} ${PIVOT.x} ${PIVOT.y})`}>
            {/* Dactyl shell */}
            <path
              d={`
                M 300 438
                L 430 418
                L 560 420
                L 580 428
                L 560 440
                L 430 448
                L 320 456
                Z
              `}
              fill="url(#shell-fill)"
              stroke={SHELL}
              strokeWidth={1.5}
            />
            {/* Plunger tooth — the distinctive "pistol" protrusion */}
            <path
              d={`
                M 510 440
                L 548 442
                L 540 472
                L 520 474
                Z
              `}
              fill={SHELL_DARK}
              stroke={SHELL}
              strokeWidth={1.3}
            />
            {/* Dactyl tip dot */}
            <circle cx={578} cy={430} r={2.5} fill={SHELL_DARK} />
          </g>

          {/* Motion arc: bold curved arrow about the PIVOT to show closure */}
          <g stroke={ARC} strokeWidth={2} fill="none">
            <path
              d={`M ${PIVOT.x - 10} ${PIVOT.y - 100} A 110 110 0 0 1 ${
                PIVOT.x + 108
              } ${PIVOT.y - 30}`}
              strokeDasharray="5 5"
              opacity={0.95}
            />
            <polygon
              points={`${PIVOT.x + 95},${PIVOT.y - 42} ${PIVOT.x + 114},${
                PIVOT.y - 22
              } ${PIVOT.x + 112},${PIVOT.y - 48}`}
              fill={ARC}
              stroke="none"
            />
          </g>
          <g
            fontFamily={inter}
            fontWeight={600}
            fontSize={12}
            letterSpacing={2.4}
            fill={ARC}
          >
            <text x={PIVOT.x - 6} y={PIVOT.y - 115}>v = 25 M·S⁻¹</text>
            <text
              x={PIVOT.x - 6}
              y={PIVOT.y - 99}
              fontSize={9}
              letterSpacing={2}
              fill={GRAY}
              fontWeight={500}
            >
              DACTYL TIP VELOCITY
            </text>
          </g>

          {/* Part labels */}
          <g
            fontFamily={inter}
            fontSize={9}
            letterSpacing={2.2}
            fontWeight={500}
            fill={GRAY}
          >
            <line
              x1={PIVOT.x + 220}
              y1={PIVOT.y - 10}
              x2={PIVOT.x + 220}
              y2={PIVOT.y - 42}
              stroke={GRAY}
              strokeWidth={0.8}
            />
            <text x={PIVOT.x + 226} y={PIVOT.y - 44}>
              DACTYL · PLUNGER
            </text>
            <line
              x1={PIVOT.x + 240}
              y1={PIVOT.y + 44}
              x2={PIVOT.x + 240}
              y2={PIVOT.y + 72}
              stroke={GRAY}
              strokeWidth={0.8}
            />
            <text x={PIVOT.x + 246} y={PIVOT.y + 78}>
              FIXED FINGER · SOCKET
            </text>
          </g>

          {/* Jet line: dashed streak from socket to plasma */}
          <line
            x1={582}
            y1={496}
            x2={PLASMA.x - 60}
            y2={PLASMA.y + 2}
            stroke={FLASH}
            strokeWidth={1.4}
            strokeDasharray="2 5"
            opacity={0.55 + 0.25 * flash}
          />
        </g>

        {/* ── SHOCKWAVE RINGS ─────────────────────────────────────── */}
        {RINGS.map((delay, i) => {
          const localT = Math.max(
            0,
            (frame - (flashStart + delay * fps)) / RING_LIFE,
          );
          if (localT <= 0 || localT > 1) return null;
          const r = 22 + RING_MAX_R * localT;
          const op = (1 - localT) * 0.65;
          return (
            <circle
              key={`ring-${i}`}
              cx={PLASMA.x}
              cy={PLASMA.y}
              r={r}
              fill="none"
              stroke={FLASH}
              strokeWidth={1 + (1 - localT) * 1.4}
              opacity={op}
            />
          );
        })}

        {/* ── PLASMA CORE ─────────────────────────────────────────── */}
        {flash > 0 && (
          <g style={{ transformOrigin: `${PLASMA.x}px ${PLASMA.y}px` }}>
            {/* Outer soft halo */}
            <circle
              cx={PLASMA.x}
              cy={PLASMA.y}
              r={190 * flash * breathe}
              fill="url(#plasma-halo)"
              opacity={0.78 * flash}
              filter="url(#hotglow)"
            />
            {/* Core */}
            <circle
              cx={PLASMA.x}
              cy={PLASMA.y}
              r={92 * flash * breathe}
              fill="url(#plasma-core)"
              filter="url(#softglow)"
            />
            {/* Bright pinpoint */}
            <circle
              cx={PLASMA.x}
              cy={PLASMA.y}
              r={20 * flash * breathe}
              fill={WHITE}
              opacity={0.95 * flash}
            />
            {/* Rays — 8 streaks */}
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (Math.PI * 2 * i) / 8 + Math.PI / 8;
              const r1 = 60 * flash;
              const r2 = (108 + 20 * Math.sin(i * 1.7)) * flash * breathe;
              return (
                <line
                  key={`ray-${i}`}
                  x1={PLASMA.x + Math.cos(a) * r1}
                  y1={PLASMA.y + Math.sin(a) * r1}
                  x2={PLASMA.x + Math.cos(a) * r2}
                  y2={PLASMA.y + Math.sin(a) * r2}
                  stroke={FLASH}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  opacity={0.65 * flash}
                />
              );
            })}
          </g>
        )}

        {/* ── CALLOUT: plasma spec label — ABOVE plasma, clear of halo ─── */}
        <g
          opacity={Math.min(1, flash * 1.3)}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={2.6}
        >
          <line
            x1={PLASMA.x}
            y1={PLASMA.y - 180}
            x2={PLASMA.x}
            y2={PLASMA.y - 220}
            stroke={ARC}
            strokeWidth={1.2}
          />
          <line
            x1={PLASMA.x}
            y1={PLASMA.y - 220}
            x2={PLASMA.x - 120}
            y2={PLASMA.y - 220}
            stroke={ARC}
            strokeWidth={1.2}
          />
          <text
            x={PLASMA.x - 128}
            y={PLASMA.y - 224}
            fill={ARC}
            textAnchor="end"
          >
            CAVITATION FLASH
          </text>
          <text
            x={PLASMA.x - 128}
            y={PLASMA.y - 208}
            fill={GRAY}
            fontSize={9}
            letterSpacing={2.2}
            fontWeight={500}
            textAnchor="end"
          >
            SONOLUMINESCENCE · &lt; 1 µs
          </text>
        </g>

        {/* ── TEMPERATURE SCALE (right edge of chamber) ───────────── */}
        <g transform={`translate(912, 220)`}>
          {/* axis line */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={420}
            stroke={GRAY}
            strokeWidth={1.2}
          />
          {/* ticks */}
          {[
            { k: 300, label: "300 K" },
            { k: 1000, label: "1,000 K" },
            { k: 2000, label: "2,000 K" },
            { k: 3000, label: "3,000 K" },
            { k: 4000, label: "4,000 K" },
            { k: 5778, label: "5,778 K", marker: "sun" },
          ].map((t) => {
            const y = interpolate(t.k, [300, 6000], [420, 0]);
            const isSun = t.marker === "sun";
            const isPistol = t.marker === "pistol";
            return (
              <g key={t.k} transform={`translate(0, ${y})`}>
                <line
                  x1={-10}
                  y1={0}
                  x2={isSun || isPistol ? -22 : -6}
                  y2={0}
                  stroke={isSun ? FLASH : isPistol ? ARC : GRAY}
                  strokeWidth={isSun || isPistol ? 1.8 : 1}
                />
                <text
                  x={-28}
                  y={4}
                  fill={isSun ? FLASH : isPistol ? ARC : GRAY}
                  fontFamily={inter}
                  fontSize={isSun || isPistol ? 11 : 10}
                  letterSpacing={2.4}
                  fontWeight={isSun || isPistol ? 600 : 500}
                  textAnchor="end"
                >
                  {t.label}
                </text>
                {isSun && (
                  <text
                    x={-28}
                    y={18}
                    fill={GRAY}
                    fontFamily={inter}
                    fontSize={9}
                    letterSpacing={2.2}
                    fontWeight={500}
                    textAnchor="end"
                  >
                    SUN SURFACE
                  </text>
                )}
                {isPistol && (
                  <text
                    x={-28}
                    y={18}
                    fill={GRAY}
                    fontFamily={inter}
                    fontSize={9}
                    letterSpacing={2.2}
                    fontWeight={500}
                    textAnchor="end"
                  >
                    SNAP-CLAW PEAK
                  </text>
                )}
              </g>
            );
          })}

          {/* animated indicator bead (rises during flashRise) */}
          {(() => {
            const y = interpolate(tempK, [300, 6000], [420, 0]);
            const atPeak = tempK >= 4600;
            return (
              <g transform={`translate(0, ${y})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={10}
                  y2={0}
                  stroke={ARC}
                  strokeWidth={2}
                />
                <circle
                  cx={14}
                  cy={0}
                  r={4.5}
                  fill={ARC}
                  stroke={INK}
                  strokeWidth={1.5}
                />
                <text
                  x={24}
                  y={4}
                  fill={FLASH}
                  fontFamily={inter}
                  fontSize={12}
                  fontWeight={600}
                  letterSpacing={2}
                >
                  {tempK.toLocaleString()} K
                </text>
                {atPeak && (
                  <text
                    x={24}
                    y={18}
                    fill={ARC}
                    fontFamily={inter}
                    fontSize={9}
                    fontWeight={600}
                    letterSpacing={2.4}
                  >
                    SNAP-CLAW PEAK
                  </text>
                )}
              </g>
            );
          })()}
        </g>

        {/* Species label under claw */}
        <g
          transform={`translate(110, 572)`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>
            SPEC —{" "}
            <tspan fill={SHELL} fontStyle="italic">
              ALPHEUS HETEROCHAELIS
            </tspan>
          </text>
          <text y={18} fontSize={10} letterSpacing={2.4} fill={GRAY}>
            SNAPPING CLAW · 210 dB SHOCKWAVE · ≤ 4 cm BODY
          </text>
        </g>

        {/* Caption strip below chamber */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 3 · COLLAPSING BUBBLE RADIATES AT ≈ 4,700 K</text>
          <text x={FRAME.w} textAnchor="end" fill={FLASH} opacity={0.9}>
            SUN-SURFACE TEMPERATURE: 5,778 K
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 870,
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
            color: ARC,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Plasma Welder
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The shrimp that
          <br />
          welds with sunlight.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.4,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          When{" "}
          <span style={{ color: SHELL, fontWeight: 600, fontStyle: "italic" }}>
            Alpheus heterochaelis
          </span>{" "}
          snaps its oversized claw shut at 25 m·s⁻¹, the jet forms a cavitation
          bubble whose collapse emits a flash of{" "}
          <span style={{ color: FLASH, fontWeight: 600 }}>
            sonoluminescence at ≈ 4,700 K
          </span>
          — momentarily within reach of the sun's 5,778 K surface — while
          delivering a 210-decibel shock that stuns prey.
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
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Lohse, Schmitz &amp; Versluis · Nature 413 (2001) 477–478</span>
        <span>
          <span style={{ color: ARC }}>●</span> Cavitation flash = Plasma arc
        </span>
      </div>
    </AbsoluteFill>
  );
};
