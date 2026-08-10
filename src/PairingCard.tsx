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
const OCEAN = "#0B131C";
const SKY_MID = "#1F2E3E";
const HORIZON = "#3B5773";
const WING_WHITE = "#EDE5D2";
const WING_DARK = "#2A2E36";
const GOLD = "#D9A24E";
const GRAY = "#7C8894";
const RULE = "#243244";
const RULE_STRONG = "#31465D";

// ── Bird geometry ──────────────────────────────────────────────────────
// Dorsal (top-down) view of a wandering albatross, drawn in a 2000×860 box.
// Body axis vertical (head at top, tail at bottom). Wings span x=0..2000.
// Designed to read as a long, thin, high-aspect-ratio wing profile.

// Dorsal (top-down) view of a wandering albatross.
// Wingspan spans x = 10..1990 (nearly full 2000 box).
// Body axis vertical; head at top, tail at bottom.
// The wing merges into the body at roughly the mid-body level so the
// silhouette reads as a smooth cruciform, not a hunched V.
const HALF_WING_LE: Array<[number, number]> = [
  // Leading edge from shoulder outward to wingtip
  [1090, 400], // shoulder LE (merges into body)
  [1250, 396],
  [1450, 396],
  [1650, 400],
  [1820, 408],
  [1930, 418],
  [1985, 428],
  [1992, 436], // wingtip
];
const HALF_WING_TE: Array<[number, number]> = [
  // Trailing edge from wingtip back to shoulder (duplicate wingtip
  // point dropped when concatenating with LE)
  [1992, 436],
  [1980, 444],
  [1920, 452],
  [1800, 462],
  [1620, 470],
  [1420, 478],
  [1220, 485],
  [1090, 490], // shoulder TE (merges into body)
];

// Body outline (right half). From head-tip clockwise down to tail-tip.
// The shoulder connects smoothly to the wing at (1090, 400) and (1090, 490).
// The tail is a short blunt wedge — an albatross tail is small
// relative to the wings, not a spike.
const BODY_RIGHT: Array<[number, number]> = [
  [1000, 200], // crown
  [1018, 210], // head top-right
  [1030, 236], // head widest
  [1028, 270], // head bottom
  [1024, 300], // neck
  [1030, 340], // upper torso (slim)
  [1060, 388], // shoulder blend (smooth into wing)
  [1090, 400], // wing LE start (== HALF_WING_LE[0])
  [1090, 490], // wing TE end (== HALF_WING_TE end)
  [1060, 500], // post-shoulder (smooth off wing)
  [1030, 540], // rump
  [1024, 580], // upper tail
  [1016, 610], // mid tail
  [1008, 634], // tail edge
  [1000, 650], // tail tip (blunt)
];

// Wingtip dark panel (right side) — outer ~22% of the wing, a slender
// lens matching the wing taper.
const WINGTIP_R: Array<[number, number]> = [
  [1620, 400],
  [1720, 406],
  [1820, 412],
  [1920, 421],
  [1985, 430],
  [1992, 436],
  [1980, 444],
  [1920, 452],
  [1820, 456],
  [1720, 456],
  [1620, 454],
];

const mirrorX = (pts: Array<[number, number]>, cx = 1000): Array<[number, number]> =>
  pts.map(([x, y]) => [cx - (x - cx), y]);

const pathFromPolyline = (pts: Array<[number, number]>): string => {
  if (pts.length === 0) return "";
  const [x0, y0] = pts[0];
  return (
    `M ${x0.toFixed(2)},${y0.toFixed(2)} ` +
    pts
      .slice(1)
      .map(([x, y]) => `L ${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ")
  );
};

const smoothPathFromPolyline = (pts: Array<[number, number]>): string => {
  if (pts.length === 0) return "";
  // Catmull-Rom to cubic bezier for smooth curves
  const p = pts;
  const n = p.length;
  const seg: string[] = [`M ${p[0][0].toFixed(2)},${p[0][1].toFixed(2)}`];
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[Math.min(n - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    seg.push(
      `C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(
        2
      )} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
    );
  }
  return seg.join(" ");
};

// Full bird silhouette — one closed path.
const buildBirdPath = (): string => {
  // Right half sequence (clockwise from head): head → shoulder →
  // right wing LE → right wingtip → right wing TE → right body → tail.
  // Then mirror across x=1000 for the left half.
  const right: Array<[number, number]> = [
    ...BODY_RIGHT.slice(0, 7), // head → shoulder point (index 6 = 1075,360)
    ...HALF_WING_LE, // shoulder LE (1100,380) out to wingtip
    ...HALF_WING_TE.slice(1), // wingtip back to shoulder TE (skip duplicate)
    ...BODY_RIGHT.slice(8), // wing base back → tail
  ];
  const left = mirrorX(right.slice(0, -1).reverse()).slice(1);
  const outline = [...right, ...left];
  return smoothPathFromPolyline(outline) + " Z";
};

const buildWingtipPath = (): string => {
  const right = WINGTIP_R;
  return smoothPathFromPolyline(right) + " Z";
};

const BIRD_PATH = buildBirdPath();
const WINGTIP_R_PATH = buildWingtipPath();
const WINGTIP_L_PATH = smoothPathFromPolyline(mirrorX(WINGTIP_R)) + " Z";

// ── Circumnavigation track (polar inset) ───────────────────────────────
// Points along the bird's ~46-day loop around Antarctica in a polar
// projection. r,θ pairs interpreted in the inset's local coords.
const TRACK_STEPS = 96;
const trackPoint = (i: number): [number, number] => {
  const t = i / TRACK_STEPS;
  const theta = t * Math.PI * 2 - Math.PI / 2;
  // Slight radial wobble so it feels like a real GPS track, not a circle
  const wobble = 0.05 * Math.sin(t * Math.PI * 8);
  const r = 1 + wobble;
  return [Math.cos(theta) * r, Math.sin(theta) * r];
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Page layout (1080 × 1350 portrait) ─────────────────────────────
  // Top metadata band : 0..110
  // Sky panel         : 130..910 (h 780)
  // Type lockup       : 920..1250
  // Footer            : 1280..
  const FRAME = { x: 60, y: 130, w: 960, h: 780 };

  // Bird transforms — one primary motion: settles from a slight upward
  // arc, then dynamic-soaring oscillation.
  const birdEntry = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 200, mass: 1.2, stiffness: 90 },
  });
  const bobPhase = (frame / (fps * 4.2)) * Math.PI * 2;
  const bobY = Math.sin(bobPhase) * 6;
  const bankDeg = Math.sin(bobPhase - Math.PI / 3) * 3.2 - 8; // slight persistent bank left
  const birdOpacity = interpolate(birdEntry, [0, 1], [0, 1]);
  const birdSlideY = interpolate(birdEntry, [0, 1], [-40, 0]);

  // Type entries
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.1], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Wind-shear labels animation
  const bandsOpacity = interpolate(frame, [fps * 0.2, fps * 1.3], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Polar track progressive draw
  const trackT = interpolate(frame, [fps * 0.8, fps * 4.2], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bird bounding box in the composition:
  // wings span 0..2000 (2000 wide) in source; body 200..700 (500 tall)
  // We fit wings to ~880 px wide, centered horizontally within FRAME.
  const BIRD_WIDTH_PX = 880;
  const birdScale = BIRD_WIDTH_PX / 2000;
  const birdCX = FRAME.x + FRAME.w / 2;
  const birdCY = FRAME.y + 360 + birdSlideY + bobY;

  return (
    <AbsoluteFill style={{ backgroundColor: OCEAN, fontFamily: inter }}>
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
        <span style={{ color: GOLD }}>2026 · 08 · 10</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={OCEAN} />
            <stop offset="55%" stopColor={SKY_MID} />
            <stop offset="100%" stopColor={HORIZON} stopOpacity={0.9} />
          </linearGradient>
          <radialGradient id="sunGlow" cx="82%" cy="82%" r="55%">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.22} />
            <stop offset="60%" stopColor={GOLD} stopOpacity={0.03} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>
          <filter id="birdShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Sky panel background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sky)"
        />
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#sunGlow)"
        />
        {/* Sky panel border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke={RULE}
          strokeWidth={1}
        />

        {/* Corner crop marks */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={GOLD} strokeWidth={1.4} fill="none" opacity={0.9}>
            <line x1={cx} y1={cy} x2={cx + sx * 24} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 24} />
          </g>
        ))}

        {/* Wind-shear guideline bands (behind the bird) */}
        <g opacity={bandsOpacity}>
          {[
            { y: 260, wind: "36 KT" },
            { y: 340, wind: "28 KT" },
            { y: 430, wind: "20 KT" },
            { y: 530, wind: "12 KT" },
            { y: 630, wind: "6 KT" },
            { y: 740, wind: "1 KT · SEA" },
          ].map((b, i) => (
            <g key={i}>
              <line
                x1={FRAME.x + 12}
                y1={b.y}
                x2={FRAME.x + FRAME.w - 12}
                y2={b.y}
                stroke={RULE}
                strokeWidth={1}
                strokeDasharray="2 6"
                opacity={0.7}
              />
              <text
                x={FRAME.x + 18}
                y={b.y - 6}
                fill={GRAY}
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={3}
              >
                {b.wind}
              </text>
            </g>
          ))}
          {/* WIND GRADIENT vertical label */}
          <g transform={`translate(${FRAME.x + FRAME.w - 30}, ${FRAME.y + 300})`}>
            <text
              transform="rotate(90)"
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={4}
            >
              WIND GRADIENT · SOUTHERN OCEAN
            </text>
          </g>
        </g>

        {/* Horizon line */}
        <line
          x1={FRAME.x + 12}
          y1={FRAME.y + FRAME.h - 78}
          x2={FRAME.x + FRAME.w - 12}
          y2={FRAME.y + FRAME.h - 78}
          stroke={RULE_STRONG}
          strokeWidth={1.4}
          opacity={bandsOpacity}
        />
        <text
          x={FRAME.x + FRAME.w - 20}
          y={FRAME.y + FRAME.h - 84}
          textAnchor="end"
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          fontWeight={600}
          letterSpacing={4}
          opacity={bandsOpacity}
        >
          HORIZON · 0 M
        </text>

        {/* Bird — big dorsal-view silhouette, banked slightly */}
        <g
          opacity={birdOpacity}
          transform={`translate(${birdCX}, ${birdCY}) rotate(${bankDeg}) scale(${birdScale}) translate(${-1000}, ${-440})`}
        >
          {/* Soft ground shadow / glow underneath */}
          <path
            d={BIRD_PATH}
            fill={OCEAN}
            opacity={0.55}
            transform="translate(0, 22)"
            filter="url(#birdShadow)"
          />
          {/* Body/wing (white) */}
          <path d={BIRD_PATH} fill={WING_WHITE} />
          {/* Wingtips (dark) */}
          <path d={WINGTIP_R_PATH} fill={WING_DARK} />
          <path d={WINGTIP_L_PATH} fill={WING_DARK} />
          {/* Subtle top-shading — thin darker line along trailing edges */}
          <path
            d={BIRD_PATH}
            fill="none"
            stroke={WING_DARK}
            strokeWidth={2}
            strokeOpacity={0.15}
          />
          {/* Bill — subtle golden hint centered at head tip */}
          <ellipse cx={1000} cy={208} rx={5} ry={9} fill={GOLD} opacity={0.55} />
          {/* Golden nape hint */}
          <ellipse cx={1000} cy={270} rx={16} ry={6} fill={GOLD} opacity={0.20} />
        </g>

        {/* Anatomical leader-line callout — shoulder-lock tendon */}
        {(() => {
          // Anchor at right shoulder in bird coords ~(1080, 360)
          // Convert to composition coords accounting for bird transform.
          const dx = (1080 - 1000) * birdScale;
          const dy = (360 - 440) * birdScale;
          const rad = (bankDeg * Math.PI) / 180;
          const anchorX = birdCX + dx * Math.cos(rad) - dy * Math.sin(rad);
          const anchorY = birdCY + dx * Math.sin(rad) + dy * Math.cos(rad);
          const labelX = FRAME.x + FRAME.w - 40;
          const labelY = anchorY - 100;
          const opacity = interpolate(
            frame,
            [fps * 1.4, fps * 2.2],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );
          return (
            <g opacity={opacity} fill={GOLD} stroke={GOLD}>
              <circle cx={anchorX} cy={anchorY} r={3} strokeWidth={0} />
              <line
                x1={anchorX}
                y1={anchorY}
                x2={anchorX + 80}
                y2={labelY + 6}
                strokeWidth={1}
                fill="none"
              />
              <line
                x1={anchorX + 80}
                y1={labelY + 6}
                x2={labelX}
                y2={labelY + 6}
                strokeWidth={1}
                fill="none"
              />
              <text
                x={labelX}
                y={labelY - 4}
                textAnchor="end"
                fontFamily={inter}
                fontSize={11}
                fontWeight={700}
                letterSpacing={3.2}
                stroke="none"
              >
                SHOULDER-LOCK TENDON
              </text>
              <text
                x={labelX}
                y={labelY + 18}
                textAnchor="end"
                fontFamily={inter}
                fontSize={10}
                fontWeight={500}
                letterSpacing={2.6}
                fill={GRAY}
                stroke="none"
              >
                MECHANICAL · NO MUSCLE
              </text>
            </g>
          );
        })()}

        {/* Wingspan callout — small tick + label spanning wingtip to wingtip */}
        {(() => {
          const opacity = interpolate(
            frame,
            [fps * 1.6, fps * 2.4],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );
          const spanY = FRAME.y + 60;
          const leftX = birdCX - (BIRD_WIDTH_PX / 2) - 6;
          const rightX = birdCX + (BIRD_WIDTH_PX / 2) + 6;
          return (
            <g opacity={opacity}>
              <line x1={leftX} y1={spanY} x2={rightX} y2={spanY} stroke={GRAY} strokeWidth={1} />
              <line x1={leftX} y1={spanY - 6} x2={leftX} y2={spanY + 6} stroke={GRAY} strokeWidth={1} />
              <line x1={rightX} y1={spanY - 6} x2={rightX} y2={spanY + 6} stroke={GRAY} strokeWidth={1} />
              <rect x={birdCX - 34} y={spanY - 11} width={68} height={22} fill={OCEAN} />
              <text
                x={birdCX}
                y={spanY + 4}
                textAnchor="middle"
                fill={WING_WHITE}
                fontFamily={inter}
                fontSize={11}
                fontWeight={700}
                letterSpacing={3.2}
              >
                3.5 M
              </text>
            </g>
          );
        })()}

        {/* Polar inset — circumnavigation track */}
        {(() => {
          const cx = FRAME.x + 110;
          const cy = FRAME.y + FRAME.h - 150;
          const R = 62;
          const opacity = interpolate(
            frame,
            [fps * 0.9, fps * 1.8],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );
          const totalPoints = Math.max(2, Math.floor(TRACK_STEPS * trackT));
          const pts: Array<[number, number]> = [];
          for (let i = 0; i <= totalPoints; i++) {
            const [ux, uy] = trackPoint(i);
            pts.push([cx + ux * R, cy + uy * R]);
          }
          const [hx, hy] = pts[pts.length - 1];
          return (
            <g opacity={opacity}>
              {/* Solid backing plate so the inset reads as a separate panel */}
              <rect
                x={cx - R - 26}
                y={cy - R - 26}
                width={(R + 26) * 2}
                height={(R + 26) * 2 + 60}
                fill={OCEAN}
              />
              <rect
                x={cx - R - 26}
                y={cy - R - 26}
                width={(R + 26) * 2}
                height={(R + 26) * 2 + 60}
                fill="none"
                stroke={RULE}
                strokeWidth={1}
              />
              {/* Frame ring */}
              <circle cx={cx} cy={cy} r={R + 18} fill={OCEAN} />
              <circle
                cx={cx}
                cy={cy}
                r={R + 8}
                fill="none"
                stroke={RULE_STRONG}
                strokeWidth={1}
              />
              <circle
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={RULE}
                strokeWidth={1}
                strokeDasharray="1 4"
              />
              {/* Antarctica dot */}
              <circle cx={cx} cy={cy} r={9} fill={HORIZON} />
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontFamily={inter}
                fontSize={7}
                fontWeight={700}
                letterSpacing={1.5}
                fill={WING_WHITE}
              >
                ANT
              </text>
              {/* GPS track */}
              <path
                d={pathFromPolyline(pts)}
                fill="none"
                stroke={GOLD}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeDasharray="4 3"
              />
              {/* Head marker */}
              <circle cx={hx} cy={hy} r={3.5} fill={GOLD} />
              {/* Cardinal ticks */}
              {[0, 90, 180, 270].map((deg) => {
                const rad = ((deg - 90) * Math.PI) / 180;
                const x1 = cx + Math.cos(rad) * (R + 8);
                const y1 = cy + Math.sin(rad) * (R + 8);
                const x2 = cx + Math.cos(rad) * (R + 14);
                const y2 = cy + Math.sin(rad) * (R + 14);
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={GRAY}
                    strokeWidth={1}
                  />
                );
              })}
              {/* Labels */}
              <text
                x={cx}
                y={cy + R + 40}
                textAnchor="middle"
                fill={GOLD}
                fontFamily={inter}
                fontSize={10}
                fontWeight={700}
                letterSpacing={3}
              >
                46 D · ~10,000 KM
              </text>
              <text
                x={cx}
                y={cy + R + 56}
                textAnchor="middle"
                fill={GRAY}
                fontFamily={inter}
                fontSize={9}
                fontWeight={500}
                letterSpacing={3}
              >
                0 STOPS
              </text>
            </g>
          );
        })()}

        {/* Small heart-rate strip in lower right of sky panel */}
        {(() => {
          const opacity = interpolate(
            frame,
            [fps * 1.5, fps * 2.3],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );
          const boxX = FRAME.x + FRAME.w - 240;
          const boxY = FRAME.y + FRAME.h - 210;
          const w = 200;
          const h = 68;
          // Small ECG-like line
          const segments = 24;
          const pts: string[] = [];
          for (let i = 0; i < segments; i++) {
            const x = boxX + (i / (segments - 1)) * w;
            const baseline = boxY + h / 2 + 8;
            // Occasional small blip — near-resting rhythm
            const isBlip = i % 8 === 3;
            const y = isBlip ? baseline - 16 : baseline + Math.sin(i * 1.3) * 0.6;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          return (
            <g opacity={opacity}>
              <rect x={boxX} y={boxY} width={w} height={h} fill={OCEAN} opacity={0.7} />
              <rect
                x={boxX}
                y={boxY}
                width={w}
                height={h}
                fill="none"
                stroke={RULE_STRONG}
                strokeWidth={1}
              />
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={GOLD}
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x={boxX + 10}
                y={boxY + 16}
                fill={GRAY}
                fontFamily={inter}
                fontSize={9}
                fontWeight={600}
                letterSpacing={3}
              >
                HEART RATE · IN FLIGHT
              </text>
              <text
                x={boxX + w - 10}
                y={boxY + h - 6}
                textAnchor="end"
                fill={WING_WHITE}
                fontFamily={inter}
                fontSize={10}
                fontWeight={700}
                letterSpacing={2.6}
              >
                ≈ RESTING
              </text>
            </g>
          );
        })()}

        {/* Caption strip below the sky panel */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          opacity={bandsOpacity}
        >
          <text>FIG. 1 · DORSAL VIEW · DYNAMIC SOARING</text>
          <text x={FRAME.w} textAnchor="end" fill={GOLD} opacity={0.85}>
            DIOMEDEA EXULANS · 3.5 M SPAN
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 968,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [16, 0]
          )}px)`,
        }}
      >
        <div
          style={{
            color: GOLD,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>Zen Monk</span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The zen monk.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A sheet of tendon in its shoulder mechanically locks the wandering
          albatross's{" "}
          <span style={{ color: GOLD, fontWeight: 600 }}>3.5 m wings</span>{" "}
          in the extended position — letting it glide ~1,000 km a day and
          circle the Southern Ocean in 46 days with a heart rate scarcely
          above resting.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 42,
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
        <span>Weimerskirch et al. · Nature 405 (2000) · Croxall · Science 307 (2005)</span>
        <span>
          <span style={{ color: GOLD }}>●</span> Wingtip = dark primaries
        </span>
      </div>

      {/* keep durationInFrames referenced so linter is happy */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
