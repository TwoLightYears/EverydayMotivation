import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
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

// Palette — taken from the concept's visual brief
const NIGHT = "#070B18";
const PLATE = "#0D1226";
const CREAM = "#E8D4A2";
const WARM = "#C77A4E";
const EYE = "#4DB3F5";
const SLATE = "#8EB9D0";
const GRID = "#131A2E";
const GRID_MAJOR = "#1B2340";

// Deterministic PRNG so stars/eyes don't flicker between frames
const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Starfield ──────────────────────────────────────────────────────────
type Star = { x: number; y: number; r: number; o: number };
const makeStars = (count: number, seed: number): Star[] => {
  const rand = mulberry32(seed);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * 1080,
      y: rand() * 1350,
      r: 0.3 + rand() * 1.4,
      o: 0.18 + rand() * 0.55,
    });
  }
  return stars;
};
const STARS = makeStars(140, 20261112);

// ── Scallop shell ribs ────────────────────────────────────────────────
// Realistic Pecten maximus has ~15-17 radiating ribs on the flat valve.
const RIB_COUNT = 16;
const SHELL = {
  cx: 350,
  cy: 700,
  r: 275,
};

// ── Eye ring layout ───────────────────────────────────────────────────
// A top-down half-scallop shell plate. The eye ring runs along the mantle
// edge — here, along the upper arc. 200 eyes.
type Eye = { cx: number; cy: number; r: number; order: number };
const buildEyes = (): Eye[] => {
  const rand = mulberry32(42);
  const eyes: Eye[] = [];
  const COUNT = 200;
  const CX = SHELL.cx;
  const CY = SHELL.cy;
  const R = SHELL.r + 14; // just outside the shell outline
  for (let i = 0; i < COUNT; i++) {
    const a = Math.PI + (i / (COUNT - 1)) * Math.PI;
    const jitterR = R + (rand() - 0.5) * 8;
    const jitterA = a + (rand() - 0.5) * 0.004;
    const x = CX + Math.cos(jitterA) * jitterR;
    const y = CY + Math.sin(jitterA) * jitterR;
    eyes.push({
      cx: x,
      cy: y,
      r: 2.4 + rand() * 1.2,
      order: i,
    });
  }
  return eyes;
};
const EYES = buildEyes();

export const ScallopCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loopFrames = fps * 5;
  const loop = frame % loopFrames;
  const tLoop = loop / loopFrames;

  // Title + hook reveal (one-shot on first loop)
  const titleSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.1, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chromeOpacity = interpolate(frame, [0, fps * 0.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Eye sweep — eyes light on in sequence around the arc, then hold glow
  // Sweep spans ~2s inside a 5s loop.
  const sweepDuration = 0.5; // normalized, 50% of loop
  const perEye = sweepDuration / EYES.length;

  // Ray trace in optics diagram — 0..1 across the loop
  const rayProgress = (() => {
    const start = 0.25;
    const end = 0.95;
    const p = (tLoop - start) / (end - start);
    return Math.max(0, Math.min(1, p));
  })();

  // Slow star drift (parallax feel)
  const starDrift = (frame / fps) * 0.15;

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Grid: observatory chart feel */}
          <pattern
            id="grid"
            x={0}
            y={0}
            width={48}
            height={48}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 48 0 L 0 0 0 48`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>
          <pattern
            id="grid-major"
            x={0}
            y={0}
            width={192}
            height={192}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 192 0 L 0 0 0 192`}
              fill="none"
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          </pattern>

          <radialGradient id="plate-vignette" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#101738" stopOpacity={1} />
            <stop offset="100%" stopColor={PLATE} stopOpacity={1} />
          </radialGradient>

          {/* Shell cream-to-warm gradient, radiating from hinge */}
          <radialGradient
            id="shell-fill"
            cx={SHELL.cx}
            cy={SHELL.cy + SHELL.r * 0.1}
            r={SHELL.r * 1.1}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={CREAM} />
            <stop offset="55%" stopColor="#D9B077" />
            <stop offset="100%" stopColor={WARM} />
          </radialGradient>

          <linearGradient id="shell-shade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={NIGHT} stopOpacity={0} />
            <stop offset="100%" stopColor={NIGHT} stopOpacity={0.35} />
          </linearGradient>

          <radialGradient id="eye-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={EYE} stopOpacity={0.9} />
            <stop offset="100%" stopColor={EYE} stopOpacity={0} />
          </radialGradient>

          <filter id="eye-bloom" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Ray clipping — the panel interior. Labels sit outside this
              clip so they are never trimmed. */}
          <clipPath id="ray-clip">
            <rect x={688} y={200} width={304} height={660} />
          </clipPath>
        </defs>

        {/* Background plate + grid */}
        <rect width={1080} height={1350} fill="url(#plate-vignette)" />
        <rect
          width={1080}
          height={1350}
          fill="url(#grid)"
          opacity={0.85}
        />
        <rect
          width={1080}
          height={1350}
          fill="url(#grid-major)"
          opacity={0.75}
        />

        {/* Starfield */}
        <g opacity={chromeOpacity}>
          {STARS.map((s, i) => {
            const twinkle =
              0.55 +
              0.45 *
                Math.sin(
                  (frame / fps) * 1.2 + i * 1.237 + s.x * 0.013 + s.y * 0.007,
                );
            return (
              <circle
                key={i}
                cx={(s.x + starDrift * (s.r * 2 + 1)) % 1080}
                cy={s.y}
                r={s.r}
                fill="#D8E6F5"
                opacity={s.o * twinkle}
              />
            );
          })}
        </g>

        {/* ─── Top metadata band ──────────────────────────────────── */}
        <g opacity={chromeOpacity} fontFamily={inter}>
          <text
            x={80}
            y={76}
            fill={SLATE}
            fontSize={13}
            letterSpacing={4.5}
            fontWeight={500}
          >
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text
            x={1000}
            y={76}
            textAnchor="end"
            fill={EYE}
            fontSize={13}
            letterSpacing={4.5}
            fontWeight={500}
          >
            2026 · 11 · 12
          </text>

          {/* Horizontal rule */}
          <line
            x1={80}
            y1={100}
            x2={1000}
            y2={100}
            stroke={GRID_MAJOR}
            strokeWidth={1}
          />
        </g>

        {/* ─── Right-column optics diagram ─────────────────────────── */}
        <g opacity={chromeOpacity}>
          {/* Panel frame — right column, floor-to-ceiling for the mechanism */}
          <rect
            x={680}
            y={140}
            width={320}
            height={720}
            fill="none"
            stroke={GRID_MAJOR}
            strokeWidth={1}
          />
          {/* Corner marks */}
          {(
            [
              [680, 140, 1, 1],
              [1000, 140, -1, 1],
              [680, 860, 1, -1],
              [1000, 860, -1, -1],
            ] as const
          ).map(([cx, cy, sx, sy], i) => (
            <g key={i} stroke={EYE} strokeWidth={1.6} fill="none">
              <line x1={cx} y1={cy} x2={cx + sx * 14} y2={cy} />
              <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 14} />
            </g>
          ))}

          {/* Panel title */}
          <text
            x={694}
            y={168}
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
          >
            FIG. 2 · EYE IN SECTION
          </text>
          <text
            x={986}
            y={168}
            textAnchor="end"
            fill={WARM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            ×400
          </text>
          <line
            x1={694}
            y1={180}
            x2={986}
            y2={180}
            stroke={GRID_MAJOR}
            strokeWidth={1}
          />

          {/* Optics: incoming parallel starlight at top, concave guanine
              mirror at bottom (parabolic arc), double retina at focus. */}
          {(() => {
            const px = 840; // optical axis x (centered in panel)
            const topY = 230; // light enters from here
            const mirrorApexY = 760;
            const mirrorHalfWidth = 140;
            const cupDepth = 78; // px — how deep the parabola is

            // Parabolic mirror: y = a(x - px)^2 + mirrorApexY, opens down
            // (so the "cup" catches rising light). Focal length f = 1/(4|a|).
            const a = -cupDepth / (mirrorHalfWidth * mirrorHalfWidth);
            const mirrorY = (x: number) => a * (x - px) * (x - px) + mirrorApexY;

            // Focus sits above the apex by focalLen.
            const focalLen = 1 / (4 * Math.abs(a));
            const focusY = mirrorApexY - focalLen;
            // Place the double retina AT the focus plane so the rays
            // converge exactly on it.
            const retinaY = focusY + 8;

            // Build mirror path (used for drawing the curve)
            const mirrorPath = (() => {
              const steps = 48;
              const pts: string[] = [];
              for (let i = 0; i <= steps; i++) {
                const x = px - mirrorHalfWidth + (i / steps) * 2 * mirrorHalfWidth;
                const y = mirrorY(x);
                pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
              }
              return pts.join(" ");
            })();

            // Four incoming rays. Reflect at mirror and converge to focus.
            const rayXs = [px - 108, px - 44, px + 44, px + 108];

            // Progress: 0 → rays just entering, 0.5 → hitting mirror,
            // 1 → rays converged on focus (retina).
            const rp = rayProgress;

            return (
              <g>
                {/* Optical axis — outside clip, it's fine */}
                <line
                  x1={px}
                  y1={topY}
                  x2={px}
                  y2={mirrorApexY + 24}
                  stroke={GRID_MAJOR}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />

                {/* Mirror — thick stroke with inner highlight (static) */}
                <path
                  d={mirrorPath}
                  stroke={SLATE}
                  strokeWidth={3.2}
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={mirrorPath}
                  stroke={EYE}
                  strokeWidth={1}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.65}
                />

                {/* Tapetum tick marks — guanine crystal stack cue */}
                {Array.from({ length: 13 }).map((_, i) => {
                  const x = px - mirrorHalfWidth + (i / 12) * 2 * mirrorHalfWidth;
                  const y = mirrorY(x);
                  const slope = 2 * a * (x - px);
                  const ang = Math.atan(slope);
                  const nx = Math.sin(ang);
                  const ny = -Math.cos(ang);
                  return (
                    <line
                      key={`tt-${i}`}
                      x1={x - nx * 6}
                      y1={y - ny * 6}
                      x2={x + nx * 6}
                      y2={y + ny * 6}
                      stroke={CREAM}
                      strokeWidth={0.9}
                      opacity={0.75}
                    />
                  );
                })}

                {/* ANIMATED RAY TRACE (only this is clipped) */}
                <g clipPath="url(#ray-clip)">
                  {/* Incoming rays (top segment) with arrow tip */}
                  {rayXs.map((rx, i) => {
                    const mY = mirrorY(rx);
                    const incomingLen = mY - topY;
                    const seg1 = Math.min(1, rp * 2); // 0..0.5 fills top segment
                    const yEnd = topY + incomingLen * seg1;
                    const showArrow = seg1 > 0.1 && seg1 < 0.99;
                    return (
                      <g key={`in-${i}`}>
                        <line
                          x1={rx}
                          y1={topY}
                          x2={rx}
                          y2={yEnd}
                          stroke={EYE}
                          strokeWidth={1.7}
                          strokeOpacity={0.9}
                        />
                        {showArrow && (
                          <polygon
                            points={`${rx - 5},${yEnd - 8} ${rx},${yEnd} ${rx + 5},${yEnd - 8}`}
                            fill={EYE}
                            opacity={0.95}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Reflected rays (mirror → focus) */}
                  {rayXs.map((rx, i) => {
                    if (rp <= 0.5) return null;
                    const mY = mirrorY(rx);
                    const seg2 = Math.min(1, (rp - 0.5) * 2); // 0..1
                    const ex = rx + (px - rx) * seg2;
                    const ey = mY + (focusY - mY) * seg2;
                    return (
                      <line
                        key={`rf-${i}`}
                        x1={rx}
                        y1={mY}
                        x2={ex}
                        y2={ey}
                        stroke={EYE}
                        strokeWidth={1.6}
                        strokeOpacity={0.95}
                      />
                    );
                  })}

                  {/* Focus flash on retina */}
                  {rp > 0.9 && (
                    <g>
                      <circle
                        cx={px}
                        cy={focusY}
                        r={14}
                        fill={EYE}
                        opacity={0.22 * Math.min(1, (rp - 0.9) * 10)}
                      />
                      <circle
                        cx={px}
                        cy={focusY}
                        r={5}
                        fill="#FFFFFF"
                        filter="url(#eye-bloom)"
                        opacity={Math.min(1, (rp - 0.9) * 10)}
                      />
                    </g>
                  )}
                </g>

                {/* Double retina — two parallel arcs AT the focal plane.
                    Drawn on top of (and after) the ray trace. */}
                <path
                  d={`M ${px - 62} ${retinaY} Q ${px} ${retinaY - 12} ${px + 62} ${retinaY}`}
                  stroke={CREAM}
                  strokeWidth={2.2}
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${px - 58} ${retinaY + 10} Q ${px} ${retinaY + 2} ${px + 58} ${retinaY + 10}`}
                  stroke={WARM}
                  strokeWidth={1.6}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.95}
                />

                {/* Labels — fully outside any clip */}
                <g
                  fontFamily={inter}
                  fontSize={10}
                  fill={SLATE}
                  letterSpacing={2.6}
                  fontWeight={500}
                >
                  {/* Retina leader */}
                  <line
                    x1={px + 74}
                    y1={retinaY + 3}
                    x2={px + 116}
                    y2={retinaY + 44}
                    stroke={SLATE}
                    strokeWidth={0.9}
                  />
                  <text x={px + 118} y={retinaY + 48}>
                    DOUBLE RETINA
                  </text>
                  <text
                    x={px + 118}
                    y={retinaY + 64}
                    fill={SLATE}
                    opacity={0.7}
                    fontSize={9}
                  >
                    AT FOCAL PLANE
                  </text>

                  {/* Mirror leader */}
                  <line
                    x1={px - 118}
                    y1={mirrorApexY - 18}
                    x2={px - 150}
                    y2={mirrorApexY - 44}
                    stroke={SLATE}
                    strokeWidth={0.9}
                  />
                  <text x={px - 152} y={mirrorApexY - 48} textAnchor="end">
                    GUANINE MIRROR
                  </text>
                  <text
                    x={px - 152}
                    y={mirrorApexY - 32}
                    textAnchor="end"
                    fill={SLATE}
                    opacity={0.7}
                    fontSize={9}
                  >
                    CRYSTAL MOSAIC
                  </text>

                  {/* Starlight marker at top */}
                  <text
                    x={px}
                    y={topY - 12}
                    textAnchor="middle"
                    fill={EYE}
                    opacity={0.95}
                    fontSize={10}
                    letterSpacing={3.2}
                    fontWeight={600}
                  >
                    STARLIGHT
                  </text>
                  <text
                    x={px}
                    y={topY + 2}
                    textAnchor="middle"
                    fill={EYE}
                    opacity={0.7}
                    fontSize={9}
                    letterSpacing={2}
                  >
                    ↓ ↓ ↓ ↓
                  </text>

                  {/* Focal-length annotation — small bracket right of axis */}
                  <line
                    x1={px + 30}
                    y1={focusY}
                    x2={px + 30}
                    y2={mirrorApexY}
                    stroke={SLATE}
                    strokeWidth={0.8}
                    opacity={0.75}
                  />
                  <line
                    x1={px + 26}
                    y1={focusY}
                    x2={px + 34}
                    y2={focusY}
                    stroke={SLATE}
                    strokeWidth={0.8}
                    opacity={0.75}
                  />
                  <line
                    x1={px + 26}
                    y1={mirrorApexY}
                    x2={px + 34}
                    y2={mirrorApexY}
                    stroke={SLATE}
                    strokeWidth={0.8}
                    opacity={0.75}
                  />
                  <text
                    x={px + 38}
                    y={(focusY + mirrorApexY) / 2 + 4}
                    fill={SLATE}
                    fontSize={10}
                    letterSpacing={2.2}
                    opacity={0.85}
                    fontStyle="italic"
                    fontFamily={playfair}
                  >
                    ƒ
                  </text>
                </g>
              </g>
            );
          })()}
        </g>

        {/* ─── Scallop shell plate (left column) ──────────────────── */}
        <g opacity={chromeOpacity}>
          {/* Faint celestial coordinate arcs, upper-half only, so they
              don't collide with the optics panel on the right */}
          {[40, 80].map((pad, i) => {
            const rr = SHELL.r + pad;
            return (
              <path
                key={`ring-${i}`}
                d={`M ${SHELL.cx - rr} ${SHELL.cy} A ${rr} ${rr} 0 0 1 ${SHELL.cx + rr} ${SHELL.cy}`}
                fill="none"
                stroke={GRID_MAJOR}
                strokeWidth={1}
                strokeDasharray={i === 0 ? "2 6" : "2 10"}
                opacity={i === 0 ? 1 : 0.55}
              />
            );
          })}

          {/* Shell body — upper half, clipped circle */}
          <defs>
            <clipPath id="shell-clip">
              <path
                d={`M ${SHELL.cx - SHELL.r} ${SHELL.cy} A ${SHELL.r} ${SHELL.r} 0 0 1 ${SHELL.cx + SHELL.r} ${SHELL.cy} Z`}
              />
            </clipPath>
          </defs>

          {/* Shell fill */}
          <path
            d={`M ${SHELL.cx - SHELL.r} ${SHELL.cy} A ${SHELL.r} ${SHELL.r} 0 0 1 ${SHELL.cx + SHELL.r} ${SHELL.cy} Z`}
            fill="url(#shell-fill)"
          />

          {/* Ribs */}
          <g clipPath="url(#shell-clip)">
            {Array.from({ length: RIB_COUNT }).map((_, i) => {
              const a = Math.PI + ((i + 0.5) / RIB_COUNT) * Math.PI;
              const x2 = SHELL.cx + Math.cos(a) * (SHELL.r + 8);
              const y2 = SHELL.cy + Math.sin(a) * (SHELL.r + 8);
              return (
                <line
                  key={`rib-${i}`}
                  x1={SHELL.cx}
                  y1={SHELL.cy}
                  x2={x2}
                  y2={y2}
                  stroke={WARM}
                  strokeOpacity={0.55}
                  strokeWidth={2.2}
                />
              );
            })}
            {/* Subtle secondary ribs */}
            {Array.from({ length: RIB_COUNT * 2 }).map((_, i) => {
              const a = Math.PI + ((i + 0.25) / (RIB_COUNT * 2)) * Math.PI;
              const x2 = SHELL.cx + Math.cos(a) * (SHELL.r + 8);
              const y2 = SHELL.cy + Math.sin(a) * (SHELL.r + 8);
              return (
                <line
                  key={`rib2-${i}`}
                  x1={SHELL.cx}
                  y1={SHELL.cy}
                  x2={x2}
                  y2={y2}
                  stroke={"#AE6236"}
                  strokeOpacity={0.3}
                  strokeWidth={0.8}
                />
              );
            })}
            {/* Concentric growth lines */}
            {Array.from({ length: 10 }).map((_, i) => {
              const r = ((i + 1) / 11) * SHELL.r;
              return (
                <path
                  key={`gl-${i}`}
                  d={`M ${SHELL.cx - r} ${SHELL.cy} A ${r} ${r} 0 0 1 ${SHELL.cx + r} ${SHELL.cy}`}
                  fill="none"
                  stroke={"#8B4F2D"}
                  strokeOpacity={0.15}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>

          {/* Shell outline */}
          <path
            d={`M ${SHELL.cx - SHELL.r} ${SHELL.cy} A ${SHELL.r} ${SHELL.r} 0 0 1 ${SHELL.cx + SHELL.r} ${SHELL.cy}`}
            fill="none"
            stroke={WARM}
            strokeWidth={2.2}
          />
          {/* Hinge marker */}
          <line
            x1={SHELL.cx - SHELL.r}
            y1={SHELL.cy}
            x2={SHELL.cx + SHELL.r}
            y2={SHELL.cy}
            stroke={WARM}
            strokeWidth={2.4}
          />
          {/* Tick marks on the hinge chord — doubles as a measured scale */}
          {Array.from({ length: 11 }).map((_, i) => {
            const x =
              SHELL.cx - SHELL.r + (i / 10) * (SHELL.r * 2);
            const big = i === 0 || i === 5 || i === 10;
            return (
              <line
                key={`tk-${i}`}
                x1={x}
                y1={SHELL.cy}
                x2={x}
                y2={SHELL.cy + (big ? 10 : 6)}
                stroke={WARM}
                strokeWidth={1.2}
                opacity={0.75}
              />
            );
          })}
          <text
            x={SHELL.cx}
            y={SHELL.cy + 32}
            textAnchor="middle"
            fill={SLATE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.2}
            fontWeight={500}
            opacity={0.85}
          >
            HINGE · 10 CM
          </text>

          {/* Shell shade overlay (gives it 3D feel) */}
          <path
            d={`M ${SHELL.cx - SHELL.r} ${SHELL.cy} A ${SHELL.r} ${SHELL.r} 0 0 1 ${SHELL.cx + SHELL.r} ${SHELL.cy} Z`}
            fill="url(#shell-shade)"
          />
        </g>

        {/* ─── Eyes along mantle edge ────────────────────────────── */}
        <g>
          {EYES.map((e, i) => {
            // Normalized order position in sweep
            const orderT = i / EYES.length;
            // Per-eye reveal window inside the loop
            const startT = orderT * sweepDuration;
            const endT = startT + perEye * 4; // soft tail
            const lit = (tLoop - startT) / (endT - startT);
            const s = Math.max(0, Math.min(1, lit));
            // Once lit, hold until loop end
            const hold = tLoop > endT ? 1 : s;
            // Twinkle after lit
            const twinkle =
              hold *
              (0.75 +
                0.25 *
                  Math.sin((frame / fps) * 3.3 + i * 0.73));
            const glowR = e.r * 4 * hold;
            return (
              <g key={`eye-${i}`}>
                <circle
                  cx={e.cx}
                  cy={e.cy}
                  r={glowR}
                  fill="url(#eye-glow)"
                  opacity={0.9 * hold}
                />
                <circle
                  cx={e.cx}
                  cy={e.cy}
                  r={e.r}
                  fill={EYE}
                  opacity={twinkle}
                  filter="url(#eye-bloom)"
                />
                <circle
                  cx={e.cx}
                  cy={e.cy}
                  r={Math.max(0.6, e.r - 1.8)}
                  fill="#FFFFFF"
                  opacity={0.9 * twinkle}
                />
              </g>
            );
          })}
        </g>

        {/* Lead line from one eye on the shell to the optics panel */}
        <g opacity={chromeOpacity}>
          {(() => {
            // Eye near 2 o'clock on the shell arc.
            const pickIdx = 178;
            const e = EYES[pickIdx];
            const panelX = 680;
            // Land the leader at the panel edge just below the
            // "FIG. 2" rule, where the schematic lives.
            const landY = 220;
            return (
              <g>
                {/* Ring around the selected eye */}
                <circle
                  cx={e.cx}
                  cy={e.cy}
                  r={16}
                  fill="none"
                  stroke={EYE}
                  strokeOpacity={0.8}
                  strokeWidth={1.2}
                  strokeDasharray="2 3"
                />
                {/* Leader: out from eye → corner → into panel at landY */}
                <line
                  x1={e.cx + 12}
                  y1={e.cy - 12}
                  x2={e.cx + 60}
                  y2={landY}
                  stroke={EYE}
                  strokeOpacity={0.9}
                  strokeWidth={1.2}
                />
                <line
                  x1={e.cx + 60}
                  y1={landY}
                  x2={panelX - 6}
                  y2={landY}
                  stroke={EYE}
                  strokeOpacity={0.6}
                  strokeWidth={1.2}
                  strokeDasharray="3 5"
                />
                {/* Arrowhead tip at panel edge */}
                <polygon
                  points={`${panelX - 10},${landY - 5} ${panelX - 2},${landY} ${panelX - 10},${landY + 5}`}
                  fill={EYE}
                  opacity={0.9}
                />
                <text
                  x={e.cx + 72}
                  y={landY - 8}
                  fill={EYE}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={2.6}
                  fontWeight={600}
                  opacity={0.9}
                >
                  ONE EYE
                </text>
              </g>
            );
          })()}
        </g>

        {/* ─── Fig.1 header + 200-eye counter (left column) ────────── */}
        <g opacity={chromeOpacity}>
          <text
            x={80}
            y={168}
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={600}
          >
            FIG. 1 · MANTLE RIM
          </text>
          <text
            x={626}
            y={168}
            textAnchor="end"
            fill={WARM}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
          >
            PECTEN MAXIMUS · TOP VALVE
          </text>
          <line
            x1={80}
            y1={180}
            x2={626}
            y2={180}
            stroke={GRID_MAJOR}
            strokeWidth={1}
          />

          {/* 200-eye counter block, sits in the empty negative space
              above the shell */}
          <text
            x={80}
            y={300}
            fill={EYE}
            fontFamily={playfair}
            fontStyle="italic"
            fontSize={120}
            fontWeight={500}
          >
            200
          </text>
          <text
            x={80}
            y={336}
            fill={CREAM}
            fontFamily={inter}
            fontSize={13}
            letterSpacing={4.5}
            fontWeight={600}
          >
            MIRROR EYES
          </text>
          <text
            x={80}
            y={360}
            fill={SLATE}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3}
            fontWeight={500}
            opacity={0.85}
          >
            ONE SCALLOP · ONE RIM
          </text>
        </g>
      </svg>

      {/* ── Type lockup (foreground HTML) ─────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 975,
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
            color: EYE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: SLATE, margin: "0 4px" }}>/</span>
          <span style={{ color: "#F2EEE4", letterSpacing: 5 }}>
            Observatory Astronomer
          </span>
        </div>

        <div
          style={{
            color: "#F4EEDD",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 78,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The mirror-eyed
          <br />
          astronomer.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#D7D1BF",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A single scallop watches the sea through up to{" "}
          <span style={{ color: EYE, fontWeight: 600 }}>200 bright-blue eyes</span>
          , and each one forms its image not with a lens but with a concave{" "}
          <span style={{ color: CREAM, fontWeight: 600 }}>
            mirror of guanine crystals
          </span>{" "}
          — the same optical trick as a reflecting telescope.
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
          color: SLATE,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: chromeOpacity,
        }}
      >
        <span>Palmer et al. · Science 358 (2017) 1172–1175</span>
        <span>
          <span style={{ color: EYE }}>●</span> Eye = Reflecting Telescope
        </span>
      </div>

      {/* Mark loop duration for durationInFrames use */}
      {/* Component consumes durationInFrames from useVideoConfig */}
      {/* Keep this marker so TS keeps the import */}
      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
