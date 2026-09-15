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

// Palette — from the concept's visual brief
const MIDNIGHT = "#07091A";
const INDIGO = "#141A34";
const STAR = "#F0E5B8";
const HAZE = "#8FA3D6";
const BRONZE = "#C88A3E";
const GRAY = "#8A8F99";

// ─── Deterministic pseudo-random helpers ────────────────────────────────
const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ─── Milky Way band geometry ────────────────────────────────────────────
// The band runs from lower-left to upper-right across the celestial panel.
// Coordinates are in panel space (0..1 both axes) and mapped into the SVG.
type Band = {
  cx: number;      // path centre x at this arc parameter
  cy: number;      // path centre y
  nx: number;      // normal x
  ny: number;      // normal y
  s: number;       // arc param 0..1
};
const bandAt = (s: number): Band => {
  // Slight arc: parabolic sag, tilted ~28°.
  const t = s;
  const x = 0.05 + t * 0.95;
  const yLine = 0.86 - t * 0.62;
  const sag = -0.055 * Math.sin(Math.PI * t); // gentle bow upward
  const y = yLine + sag;
  // Tangent direction (finite diff).
  const eps = 0.001;
  const x2 = 0.05 + (t + eps) * 0.95;
  const y2 = (0.86 - (t + eps) * 0.62) - 0.055 * Math.sin(Math.PI * (t + eps));
  const dx = x2 - x;
  const dy = y2 - y;
  const len = Math.hypot(dx, dy) || 1;
  return { cx: x, cy: y, nx: -dy / len, ny: dx / len, s: t };
};

// Fix-point (the "star" the beetle sights). Placed at s = 0.62 along the band.
const FIX_S = 0.62;

type Star = {
  x: number;
  y: number;
  r: number;
  o: number;
  twinkle: number;
};

const buildStars = (): { field: Star[]; band: Star[] } => {
  const rand = mulberry32(20260915);
  const field: Star[] = [];
  // Background field
  for (let i = 0; i < 220; i++) {
    field.push({
      x: rand(),
      y: rand() * 0.82,
      r: 0.4 + rand() * rand() * 2.4,
      o: 0.15 + rand() * 0.55,
      twinkle: rand(),
    });
  }
  // Dense band stars
  const band: Star[] = [];
  const stripe = (count: number, halfWidth: number, minR: number, maxR: number, minO: number) => {
    for (let i = 0; i < count; i++) {
      const s = rand();
      const b = bandAt(s);
      const t = (rand() - 0.5) * 2 * halfWidth;
      const x = b.cx + b.nx * t;
      const y = b.cy + b.ny * t;
      band.push({
        x,
        y,
        r: minR + rand() * rand() * (maxR - minR),
        o: minO + rand() * (1 - minO),
        twinkle: rand(),
      });
    }
  };
  stripe(520, 0.11, 0.35, 1.6, 0.3);
  stripe(240, 0.055, 0.6, 2.4, 0.55);
  stripe(90, 0.024, 0.9, 3.6, 0.8);
  return { field, band };
};

const STARS = buildStars();

// ─── Panel geometry ─────────────────────────────────────────────────────
// The celestial panel is where the Milky Way and beetle live.
const PANEL = { x: 60, y: 130, w: 960, h: 711 };

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Star field fade-in
  const starsIn = interpolate(frame, [0, fps * 1.2], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beetle rise from below the horizon
  const beetleSpring = spring({
    frame: frame - fps * 0.4,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  // Bearing-line extension: single spring after the beetle has landed
  const bearingT = spring({
    frame: frame - fps * 1.4,
    fps,
    config: { damping: 180, mass: 0.7 },
  });

  // Title / hook fades
  const titleSpring = spring({
    frame: frame - fps * 0.9,
    fps,
    config: { damping: 200, mass: 0.8 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.6, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow band drift — represents the beetle's continuous celestial fix.
  const drift = Math.sin((frame / fps) * 0.35) * 3.2; // degrees

  // Panel → SVG helpers
  const px = (x: number) => PANEL.x + x * PANEL.w;
  const py = (y: number) => PANEL.y + y * PANEL.h;
  const scaleR = (r: number) => r; // stars are in px directly

  // Fix-point (position of the sighted "star" in panel coords)
  const fixBand = bandAt(FIX_S);
  const fixX = px(fixBand.cx);
  const fixY = py(fixBand.cy);

  // Beetle position — sits on the horizon roughly centred, a touch left
  const beetleAnchorX = px(0.44);
  const horizonY = py(0.905);
  const beetleY = horizonY - 4 + (1 - beetleSpring) * 26;

  // Bearing readout: interpolates while bearingT rises
  const targetBearing = 356; // deg — "true galactic sighting"
  const shownBearing = Math.round(
    interpolate(bearingT, [0, 1], [12, targetBearing]),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: MIDNIGHT, fontFamily: inter }}>
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
        <span style={{ color: STAR }}>2026 · 09 · 15</span>
      </div>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#040616" />
            <stop offset="55%" stopColor="#0A0F26" />
            <stop offset="100%" stopColor={INDIGO} />
          </linearGradient>

          {/* Faint blue polarization glow along the band. */}
          <radialGradient id="band-haze" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HAZE} stopOpacity={0.55} />
            <stop offset="60%" stopColor={HAZE} stopOpacity={0.14} />
            <stop offset="100%" stopColor={HAZE} stopOpacity={0} />
          </radialGradient>

          {/* Warm creamy core of the band. */}
          <radialGradient id="band-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={STAR} stopOpacity={0.85} />
            <stop offset="45%" stopColor={STAR} stopOpacity={0.28} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          {/* Dark rift down the Milky Way's spine. */}
          <radialGradient id="band-rift" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={MIDNIGHT} stopOpacity={0.9} />
            <stop offset="70%" stopColor={MIDNIGHT} stopOpacity={0.1} />
            <stop offset="100%" stopColor={MIDNIGHT} stopOpacity={0} />
          </radialGradient>

          {/* Fix-point star bloom */}
          <radialGradient id="fix-bloom" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.95} />
            <stop offset="30%" stopColor={STAR} stopOpacity={0.65} />
            <stop offset="100%" stopColor={STAR} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="panelClip">
            <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} />
          </clipPath>
        </defs>

        {/* Sky panel */}
        <rect
          x={PANEL.x}
          y={PANEL.y}
          width={PANEL.w}
          height={PANEL.h}
          fill="url(#sky)"
        />

        <g clipPath="url(#panelClip)">
          <g
            style={{
              transform: `rotate(${drift}deg)`,
              transformOrigin: `${PANEL.x + PANEL.w / 2}px ${PANEL.y + PANEL.h / 2}px`,
            }}
          >
            {/* Milky Way — sequence of overlapping ellipses along the band */}
            {(() => {
              const steps = 22;
              const els: React.ReactNode[] = [];
              for (let i = 0; i <= steps; i++) {
                const s = i / steps;
                const b = bandAt(s);
                const cx = px(b.cx);
                const cy = py(b.cy);
                // Band tapers slightly at the ends
                const taper = 0.55 + 0.45 * Math.sin(Math.PI * s);
                const angle =
                  (Math.atan2(b.ny, b.nx) * 180) / Math.PI - 90;
                els.push(
                  <g
                    key={`haze-${i}`}
                    transform={`translate(${cx}, ${cy}) rotate(${angle})`}
                  >
                    <ellipse
                      rx={260 * taper}
                      ry={78 * taper}
                      fill="url(#band-haze)"
                      opacity={0.85 * starsIn}
                    />
                    <ellipse
                      rx={210 * taper}
                      ry={44 * taper}
                      fill="url(#band-core)"
                      opacity={0.95 * starsIn}
                    />
                    <ellipse
                      rx={120 * taper}
                      ry={9 * taper}
                      fill="url(#band-rift)"
                      opacity={0.7 * starsIn}
                    />
                  </g>,
                );
              }
              return els;
            })()}

            {/* Background field stars */}
            {STARS.field.map((s, i) => {
              const tw =
                0.65 +
                0.35 *
                  Math.sin(
                    (frame / fps) * (0.7 + s.twinkle * 2.2) + s.twinkle * 6.28,
                  );
              return (
                <circle
                  key={`f-${i}`}
                  cx={px(s.x)}
                  cy={py(s.y)}
                  r={scaleR(s.r)}
                  fill={STAR}
                  opacity={s.o * tw * starsIn}
                />
              );
            })}
            {/* Band stars */}
            {STARS.band.map((s, i) => {
              const tw =
                0.7 +
                0.3 *
                  Math.sin(
                    (frame / fps) * (0.9 + s.twinkle * 2.4) + s.twinkle * 6.28,
                  );
              return (
                <circle
                  key={`b-${i}`}
                  cx={px(s.x)}
                  cy={py(s.y)}
                  r={scaleR(s.r)}
                  fill={STAR}
                  opacity={s.o * tw * starsIn}
                />
              );
            })}
          </g>

          {/* Fix-point (not rotated with drift so bearing stays coherent
              through the readout — this is a stylised sighting, not a
              scientific plot) */}
          <g opacity={interpolate(bearingT, [0, 0.15, 1], [0.35, 0.7, 1])}>
            <circle cx={fixX} cy={fixY} r={40} fill="url(#fix-bloom)" />
            <circle cx={fixX} cy={fixY} r={16} fill="url(#fix-bloom)" />
            <circle cx={fixX} cy={fixY} r={3.2} fill="#FFFFFF" />
            {/* Diffraction spikes */}
            <g stroke="#FFFFFF" strokeWidth={1} opacity={0.85}>
              <line x1={fixX - 22} y1={fixY} x2={fixX + 22} y2={fixY} />
              <line x1={fixX} y1={fixY - 22} x2={fixX} y2={fixY + 22} />
            </g>
          </g>

          {/* Veld silhouette — soft undulating horizon */}
          {(() => {
            const y0 = horizonY;
            const w = PANEL.w;
            const x0 = PANEL.x;
            const bottom = PANEL.y + PANEL.h;
            const pts: string[] = [];
            const steps = 60;
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const x = x0 + t * w;
              const y =
                y0 +
                Math.sin(t * 7.2) * 3 +
                Math.sin(t * 2.6 + 1.2) * 4 -
                Math.max(0, 1 - Math.abs(t - 0.44) * 8) * 2;
              pts.push(`${x} ${y}`);
            }
            pts.push(`${x0 + w} ${bottom}`);
            pts.push(`${x0} ${bottom}`);
            return (
              <>
                <polygon
                  points={pts.join(" ")}
                  fill="#03040D"
                  opacity={0.9 * starsIn}
                />
                <polyline
                  points={pts.slice(0, steps + 1).join(" ")}
                  fill="none"
                  stroke="#1E2545"
                  strokeWidth={0.9}
                  opacity={0.8 * starsIn}
                />
              </>
            );
          })()}

          {/* Bearing line: beetle head → fix-point */}
          {(() => {
            const bx = beetleAnchorX;
            const by = beetleY - 118; // head tip after 1.9× scale
            const eased = bearingT;
            const endX = bx + (fixX - bx) * eased;
            const endY = by + (fixY - by) * eased;
            return (
              <g opacity={eased}>
                {/* Subtle wide bronze glow behind the sighting line */}
                <line
                  x1={bx}
                  y1={by}
                  x2={endX}
                  y2={endY}
                  stroke={BRONZE}
                  strokeWidth={3.5}
                  opacity={0.18}
                />
                <line
                  x1={bx}
                  y1={by}
                  x2={endX}
                  y2={endY}
                  stroke={BRONZE}
                  strokeWidth={1.4}
                  strokeDasharray="4 6"
                />
                {/* Crosshair at the moving tip */}
                <g
                  transform={`translate(${endX}, ${endY})`}
                  opacity={interpolate(eased, [0.85, 1], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                >
                  <circle r={11} fill="none" stroke={BRONZE} strokeWidth={1.3} />
                  <circle r={22} fill="none" stroke={BRONZE} strokeWidth={0.6} opacity={0.5} />
                  <line x1={-16} y1={0} x2={-4} y2={0} stroke={BRONZE} strokeWidth={1.3} />
                  <line x1={4} y1={0} x2={16} y2={0} stroke={BRONZE} strokeWidth={1.3} />
                  <line x1={0} y1={-16} x2={0} y2={-4} stroke={BRONZE} strokeWidth={1.3} />
                  <line x1={0} y1={4} x2={0} y2={16} stroke={BRONZE} strokeWidth={1.3} />
                </g>
              </g>
            );
          })()}

          {/* Bearing gauge (top-right of panel) */}
          <g
            transform={`translate(${PANEL.x + PANEL.w - 156}, ${PANEL.y + 26})`}
            opacity={0.85 * starsIn}
          >
            <text
              fill={GRAY}
              fontFamily={inter}
              fontSize={10}
              fontWeight={600}
              letterSpacing={3}
            >
              BEARING
            </text>
            <g transform={`translate(0, 12)`}>
              <line x1={0} y1={0} x2={130} y2={0} stroke={GRAY} strokeWidth={0.8} />
              {Array.from({ length: 14 }, (_, i) => (
                <line
                  key={i}
                  x1={i * 10}
                  y1={0}
                  x2={i * 10}
                  y2={i % 5 === 0 ? 7 : 4}
                  stroke={GRAY}
                  strokeWidth={0.8}
                />
              ))}
              <line
                x1={interpolate(bearingT, [0, 1], [10, 118])}
                y1={-4}
                x2={interpolate(bearingT, [0, 1], [10, 118])}
                y2={12}
                stroke={BRONZE}
                strokeWidth={1.4}
              />
            </g>
            <text
              y={40}
              fill={BRONZE}
              fontFamily={inter}
              fontSize={13}
              fontWeight={600}
              letterSpacing={2.5}
            >
              {`AZ ${String(shownBearing).padStart(3, "0")}°`}
            </text>
          </g>

          {/* Beetle + dung ball silhouette (2× scale so hero reads at a glance) */}
          <g
            transform={`translate(${beetleAnchorX}, ${beetleY}) scale(1.9)`}
            opacity={beetleSpring}
          >
            {/* Soft ground shadow under the ball */}
            <ellipse
              cx={0}
              cy={2}
              rx={26}
              ry={3}
              fill="#000000"
              opacity={0.55}
            />
            {/* Dung ball */}
            <circle
              cx={0}
              cy={-18}
              r={20}
              fill="#171B2C"
              stroke="#2A3149"
              strokeWidth={1}
            />
            {/* Ball texture — irregular flecks */}
            <g fill="#232945">
              <circle cx={-7} cy={-25} r={2.4} />
              <circle cx={6} cy={-14} r={1.8} />
              <circle cx={2} cy={-28} r={1.2} />
              <circle cx={-3} cy={-11} r={1.4} />
              <circle cx={9} cy={-22} r={1.6} />
            </g>
            {/* Rim light on ball top-right */}
            <path
              d="M 4 -34 Q 16 -28 18 -18"
              stroke="#3B4676"
              strokeWidth={1.2}
              fill="none"
              opacity={0.8}
            />

            {/* Beetle body — sits atop the ball, oriented "up" */}
            <g transform={`translate(0, -44)`}>
              {/* Legs */}
              <g
                stroke="#0B0E1A"
                strokeWidth={1.6}
                strokeLinecap="round"
                fill="none"
              >
                <path d="M -6 3 L -13 9 L -18 6" />
                <path d="M 6 3 L 13 9 L 18 6" />
                <path d="M -6 -1 L -15 -3" />
                <path d="M 6 -1 L 15 -3" />
                <path d="M -6 -6 L -13 -11 L -17 -15" />
                <path d="M 6 -6 L 13 -11 L 17 -15" />
              </g>
              {/* Elytra body */}
              <ellipse cx={0} cy={0} rx={8.5} ry={11} fill="#0B0E1A" />
              {/* Elytral seam */}
              <line
                x1={0}
                y1={-9}
                x2={0}
                y2={10}
                stroke="#1A1E30"
                strokeWidth={0.6}
              />
              {/* Pronotum */}
              <ellipse cx={0} cy={-10} rx={6.2} ry={3.6} fill="#0B0E1A" />
              {/* Head — clypeus with the characteristic serrated notch */}
              <path
                d="M -5.5 -14 Q 0 -17.5 5.5 -14 L 5 -12.5 Q 3 -13.8 1.6 -12.6 Q 0 -13.6 -1.6 -12.6 Q -3 -13.8 -5 -12.5 Z"
                fill="#0B0E1A"
              />
              {/* Antennae — short, clubbed, angled up */}
              <g stroke="#0B0E1A" strokeWidth={0.9} fill="none" strokeLinecap="round">
                <path d="M -3.5 -15.5 L -5.5 -18" />
                <path d="M 3.5 -15.5 L 5.5 -18" />
              </g>
              <circle cx={-5.5} cy={-18} r={0.9} fill="#0B0E1A" />
              <circle cx={5.5} cy={-18} r={0.9} fill="#0B0E1A" />

              {/* Bronze rim-light on carapace edge */}
              <path
                d="M -8.5 -2 Q 0 -12.5 8.5 -2"
                fill="none"
                stroke={BRONZE}
                strokeWidth={0.75}
                opacity={0.95}
              />
              {/* Star glint reflected off the head */}
              <circle cx={0} cy={-15} r={1.1} fill={STAR} opacity={0.9} />
            </g>
          </g>
        </g>

        {/* Panel border + corner marks */}
        <rect
          x={PANEL.x + 0.5}
          y={PANEL.y + 0.5}
          width={PANEL.w - 1}
          height={PANEL.h - 1}
          fill="none"
          stroke="#20263B"
          strokeWidth={1}
        />
        {(
          [
            [PANEL.x, PANEL.y, 1, 1],
            [PANEL.x + PANEL.w, PANEL.y, -1, 1],
            [PANEL.x, PANEL.y + PANEL.h, 1, -1],
            [PANEL.x + PANEL.w, PANEL.y + PANEL.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={BRONZE} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Caption strip below the panel */}
        <g
          transform={`translate(${PANEL.x}, ${PANEL.y + PANEL.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · GALACTIC SIGHTING FROM THE SOUTH AFRICAN VELD</text>
          <text
            x={PANEL.w}
            textAnchor="end"
            fill={STAR}
            opacity={0.85}
          >
            SCARABAEUS SATYRUS · MILKY WAY COMPASS
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 905,
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
            color: STAR,
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
            Celestial Navigator
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The beetle that
          <br />
          steers by the galaxy.
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
          Under a planetarium sky stripped of every landmark,{" "}
          <span style={{ color: STAR, fontWeight: 600 }}>
            Scarabaeus satyrus
          </span>{" "}
          still rolled its dung ball in a perfectly straight line — orienting
          to the diffuse polarized band of the Milky Way. The first animal
          proven to use the galaxy itself as a compass.
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
        <span>Dacke et al. · Current Biology 23 (2013) 298–300</span>
        <span>
          <span style={{ color: BRONZE }}>●</span> Bearing = galactic fix
        </span>
      </div>
    </AbsoluteFill>
  );
};
