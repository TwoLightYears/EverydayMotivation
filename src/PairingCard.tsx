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

// Palette — taken from the concept's visual brief
const INK = "#05070E";
const NAVY = "#0F1F3A";
const BEAM = "#3D8BFD";
const BONE = "#E8F1FF";
const BRASS = "#D4A65A";
// Derived tints
const BRASS_DIM = "#8A6C3A";
const GRAY = "#5B6474"; // secondary type

// ── Layout ────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;
const CX = 540;
const CY = 470;
const R_OUTER = 300;    // outermost dial ring
const R_TICK_MAJOR = 292; // top of major tick
const R_TICK_MAJOR_INNER = 272;
const R_TICK_MINOR = 292;
const R_TICK_MINOR_INNER = 282;
const R_BEAM = 260;     // beam extent
const R_HALO = 52;      // star halo

// Two opposing beams; θ is the beam angle in degrees, measured clockwise from 12 o'clock.
// Locked target angle: 55° from 12 — a strong diagonal.
const TARGET_ANGLE = 55;

// Pulse-profile strip geometry
const STRIP = { x: 80, y: 820, w: 920, h: 62 };
const PULSE_COUNT = 12;
const PULSE_STEP = STRIP.w / PULSE_COUNT;

// Format the pulse profile as a smooth polyline: repeating gaussian.
const pulseStripPath = (offset: number): string => {
  const baseline = STRIP.y + STRIP.h - 8;
  const peak = STRIP.y + 10;
  const amp = baseline - peak;
  const sigma = 6;
  const points: string[] = [];
  const samples = 480;
  for (let i = 0; i <= samples; i++) {
    const x = STRIP.x + (i / samples) * STRIP.w;
    // distance to nearest pulse center
    const centered = ((x - STRIP.x + offset) % PULSE_STEP + PULSE_STEP) % PULSE_STEP;
    const d = Math.min(centered, PULSE_STEP - centered);
    const y = baseline - amp * Math.exp(-(d * d) / (2 * sigma * sigma));
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${points[0]} L ${points.slice(1).join(" ")}`;
};

// Rays for tick marks: major every 30°, minor every 6°.
const TICKS = (() => {
  const out: { deg: number; major: boolean; cardinal: boolean }[] = [];
  for (let deg = 0; deg < 360; deg += 6) {
    const major = deg % 30 === 0;
    const cardinal = deg % 90 === 0;
    out.push({ deg, major, cardinal });
  }
  return out;
})();

const deg2rad = (d: number) => (d * Math.PI) / 180;

// Convert dial angle (0° = 12 o'clock, clockwise) to standard math radians.
const dialToXY = (angleDeg: number, r: number): { x: number; y: number } => {
  const rad = deg2rad(angleDeg - 90);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Beam rotation: springs in from -60° to the locked target.
  const beamSpring = spring({
    frame,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 55 },
  });
  const beamAngle = interpolate(beamSpring, [0, 1], [TARGET_ANGLE - 90, TARGET_ANGLE]);

  // Dial reveal (radial wipe)
  const dialReveal = interpolate(frame, [8, 46], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Star flash pulses in sync with pulse train.
  const period = fps * 1.4; // one full pulse-train cycle
  const localPhase = (frame % period) / period;
  const starFlash = Math.exp(-Math.pow((localPhase - 0.02) * 12, 2));

  // Pulse-train scrolling offset
  const stripOffset = interpolate(frame, [0, period], [0, PULSE_STEP], {
    extrapolateRight: "extend",
  });

  // Text springs
  const roleTagSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 200, mass: 0.7 },
  });
  const titleSpring = spring({
    frame: frame - 36,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [54, 84], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const footerOpacity = interpolate(frame, [72, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const metaOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          {/* Deep vignette: subtle warm-cool wash centered on the star */}
          <radialGradient id="space-vignette" cx="50%" cy="41%" r="70%">
            <stop offset="0%" stopColor="#0B1424" stopOpacity={1} />
            <stop offset="55%" stopColor={INK} stopOpacity={1} />
            <stop offset="100%" stopColor="#020409" stopOpacity={1} />
          </radialGradient>

          {/* Well beneath the dial */}
          <radialGradient id="dial-well" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#132446" stopOpacity={0.85} />
            <stop offset="65%" stopColor={NAVY} stopOpacity={0.55} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </radialGradient>

          {/* Neutron-star halo */}
          <radialGradient id="star-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BONE} stopOpacity={0.95} />
            <stop offset="18%" stopColor={BEAM} stopOpacity={0.85} />
            <stop offset="55%" stopColor={BEAM} stopOpacity={0.25} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </radialGradient>

          {/* Beam fan: bright at pivot, transparent at tip. Drawn along +y in local coords. */}
          <linearGradient id="beam-fan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BONE} stopOpacity={0.95} />
            <stop offset="12%" stopColor={BEAM} stopOpacity={0.75} />
            <stop offset="60%" stopColor={BEAM} stopOpacity={0.18} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </linearGradient>

          {/* Sharp beam core */}
          <linearGradient id="beam-core" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BONE} stopOpacity={1} />
            <stop offset="70%" stopColor={BEAM} stopOpacity={0.7} />
            <stop offset="100%" stopColor={BEAM} stopOpacity={0} />
          </linearGradient>

          {/* Soft glow filter for beams and pulses */}
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="tight-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Mask that reveals the dial from centre outward */}
          <mask id="dial-reveal">
            <circle cx={CX} cy={CY} r={R_OUTER + 60} fill="black" />
            <circle
              cx={CX}
              cy={CY}
              r={R_OUTER * dialReveal + 20}
              fill="white"
            />
          </mask>
        </defs>

        {/* Space background */}
        <rect x={0} y={0} width={W} height={H} fill="url(#space-vignette)" />

        {/* Faint starfield — deterministic, low-density, kept off the type block */}
        <g fill={BONE}>
          {STAR_FIELD.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              opacity={s.o * metaOpacity}
            />
          ))}
        </g>

        {/* ── Top metadata band ─────────────────────────────────────────── */}
        <g
          opacity={metaOpacity}
          fontFamily={inter}
          fontSize={13}
          letterSpacing={4.5}
          fontWeight={500}
        >
          <text x={80} y={90} fill={GRAY}>
            EVERYDAY MOTIVATION · No. 003
          </text>
          <text x={W - 80} y={90} textAnchor="end" fill={BRASS}>
            2026 · 07 · 06
          </text>
          {/* Hairline under band */}
          <line
            x1={80}
            y1={110}
            x2={W - 80}
            y2={110}
            stroke={BRASS_DIM}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        </g>

        {/* ── Chronometer dial ──────────────────────────────────────────── */}
        <g mask="url(#dial-reveal)">
          {/* Dial well */}
          <circle cx={CX} cy={CY} r={R_OUTER - 10} fill="url(#dial-well)" />

          {/* Outer rings — double brass hairline */}
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER}
            fill="none"
            stroke={BRASS}
            strokeWidth={1.4}
            opacity={0.9}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_OUTER - 5}
            fill="none"
            stroke={BRASS_DIM}
            strokeWidth={0.8}
            opacity={0.55}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R_TICK_MAJOR_INNER - 4}
            fill="none"
            stroke={BRASS_DIM}
            strokeWidth={0.6}
            opacity={0.35}
          />

          {/* Tick marks */}
          {TICKS.map((t) => {
            const outer = dialToXY(t.deg, R_TICK_MAJOR);
            const inner = dialToXY(
              t.deg,
              t.major ? R_TICK_MAJOR_INNER : R_TICK_MINOR_INNER,
            );
            return (
              <line
                key={t.deg}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke={BRASS}
                strokeWidth={t.major ? 1.8 : 0.9}
                opacity={t.major ? 1 : 0.68}
              />
            );
          })}

          {/* Chronometer index marker at 0T (small brass wedge pointing inward) */}
          {(() => {
            const p = dialToXY(0, R_OUTER + 2);
            return (
              <polygon
                points={`${p.x - 7},${p.y - 14} ${p.x + 7},${p.y - 14} ${p.x},${p.y - 2}`}
                fill={BRASS}
              />
            );
          })()}

          {/* Cardinal triangles pointing inward */}
          {[0, 90, 180, 270].map((deg) => {
            const p = dialToXY(deg, R_OUTER + 8);
            return (
              <g key={deg} transform={`rotate(${deg} ${p.x} ${p.y})`}>
                <polygon
                  points={`${p.x - 5},${p.y} ${p.x + 5},${p.y} ${p.x},${p.y + 9}`}
                  fill={BRASS}
                />
              </g>
            );
          })}

          {/* Marker labels: "0 T" at top, "T/2" at bottom */}
          <text
            x={CX}
            y={CY - R_OUTER + 40}
            textAnchor="middle"
            fill={BRASS}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={600}
          >
            0 T
          </text>
          <text
            x={CX}
            y={CY + R_OUTER - 30}
            textAnchor="middle"
            fill={BRASS}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={4}
            fontWeight={600}
          >
            T / 2
          </text>

          {/* Two opposing lighthouse beams */}
          <g
            transform={`translate(${CX} ${CY}) rotate(${beamAngle})`}
            filter="url(#soft-glow)"
          >
            <Beam length={R_BEAM} />
            <g transform="rotate(180)">
              <Beam length={R_BEAM} />
            </g>
          </g>

          {/* Central pivot: brass bezel + neutron star */}
          <circle
            cx={CX}
            cy={CY}
            r={R_HALO}
            fill="url(#star-halo)"
            opacity={0.85 + 0.15 * starFlash}
          />
          <circle
            cx={CX}
            cy={CY}
            r={22}
            fill="none"
            stroke={BRASS}
            strokeWidth={1.2}
            opacity={0.9}
          />
          <circle
            cx={CX}
            cy={CY}
            r={13 + 3 * starFlash}
            fill={BONE}
            filter="url(#tight-glow)"
          />
          <circle cx={CX} cy={CY} r={6} fill="#FFFFFF" />
        </g>

        {/* Dial caption above dial */}
        <text
          x={80}
          y={158}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={500}
          opacity={metaOpacity}
        >
          FIG. 1 · MILLISECOND PULSAR · PSR B1937+21
        </text>
        <text
          x={W - 80}
          y={158}
          textAnchor="end"
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.5}
          fontWeight={500}
          opacity={metaOpacity}
        >
          P = 1.5578 MS  ·  Δt / t ≈ 10⁻¹⁵
        </text>

        {/* ── Pulse-profile strip ──────────────────────────────────────── */}
        <g opacity={interpolate(frame, [30, 60], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })}>
          {/* Baseline */}
          <line
            x1={STRIP.x}
            y1={STRIP.y + STRIP.h - 8}
            x2={STRIP.x + STRIP.w}
            y2={STRIP.y + STRIP.h - 8}
            stroke={BRASS_DIM}
            strokeWidth={0.8}
            opacity={0.7}
          />
          {/* Vertical tick markers evenly spaced under each pulse peak */}
          {Array.from({ length: PULSE_COUNT + 1 }, (_, i) => (
            <line
              key={i}
              x1={STRIP.x + i * PULSE_STEP}
              y1={STRIP.y + STRIP.h - 8}
              x2={STRIP.x + i * PULSE_STEP}
              y2={STRIP.y + STRIP.h - 2}
              stroke={BRASS_DIM}
              strokeWidth={0.8}
              opacity={0.85}
            />
          ))}
          {/* Period labels under the tick markers: 0, T, 2T, ..., 12T */}
          {Array.from({ length: PULSE_COUNT + 1 }, (_, i) => (
            <text
              key={`lbl-${i}`}
              x={STRIP.x + i * PULSE_STEP}
              y={STRIP.y + STRIP.h + 12}
              textAnchor="middle"
              fill={BRASS}
              fontFamily={inter}
              fontSize={9}
              letterSpacing={2}
              fontWeight={600}
              opacity={i % 2 === 0 ? 0.9 : 0.35}
            >
              {i === 0 ? "0" : i === 1 ? "T" : `${i}T`}
            </text>
          ))}
          {/* Pulse glow */}
          <path
            d={pulseStripPath(stripOffset)}
            fill="none"
            stroke={BEAM}
            strokeWidth={5}
            strokeOpacity={0.35}
            filter="url(#soft-glow)"
          />
          {/* Pulse crisp trace */}
          <path
            d={pulseStripPath(stripOffset)}
            fill="none"
            stroke={BONE}
            strokeWidth={1.6}
          />
          {/* Left caption */}
          <text
            x={STRIP.x}
            y={STRIP.y - 12}
            fill={GRAY}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.5}
            fontWeight={500}
          >
            PULSE ARRIVAL TIMES
          </text>
          {/* Right caption */}
          <text
            x={STRIP.x + STRIP.w}
            y={STRIP.y - 12}
            textAnchor="end"
            fill={BRASS}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={3.5}
            fontWeight={500}
            opacity={0.85}
          >
            Δt STABLE TO 1 : 10¹⁵
          </text>
        </g>
      </svg>

      {/* ── Type lockup ──────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 940,
        }}
      >
        {/* Role tag */}
        <div
          style={{
            opacity: roleTagSpring,
            transform: `translateY(${interpolate(
              roleTagSpring,
              [0, 1],
              [10, 0],
            )}px)`,
            color: BRASS,
            fontFamily: inter,
            fontSize: 12,
            letterSpacing: 5.5,
            textTransform: "uppercase",
            marginBottom: 14,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 6px" }}>/</span>
          <span style={{ color: "#F4F6FA", letterSpacing: 5 }}>
            Master Clockmaker
          </span>
        </div>

        {/* Display title */}
        <div
          style={{
            opacity: titleSpring,
            transform: `translateY(${interpolate(
              titleSpring,
              [0, 1],
              [14, 0],
            )}px)`,
            color: "#F4F6FA",
            fontFamily: playfair,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 66,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            maxWidth: 820,
          }}
        >
          The dead star
          <br />
          that keeps time.
        </div>

        {/* Hook */}
        <div
          style={{
            marginTop: 22,
            color: "#B9BFCC",
            fontFamily: inter,
            fontSize: 17,
            lineHeight: 1.44,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Spinning up to{" "}
          <span style={{ color: BONE, fontWeight: 600 }}>
            700 times per second
          </span>
          , a millisecond{" "}
          <span style={{ color: BEAM, fontWeight: 600 }}>pulsar</span> — the
          collapsed core of a dead star — emits a radio beam whose arrival
          time drifts by less than{" "}
          <span style={{ color: BRASS, fontWeight: 600 }}>
            one part in 10¹⁵
          </span>
          . Arrays of them (NANOGrav, EPTA) are now used as a galaxy-scale
          reference clock.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 44,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3.2,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: footerOpacity,
        }}
      >
        <span>NANOGrav 15-yr · Astrophys. J. Lett. 951 (2023) L8</span>
        <span>
          <span style={{ color: BEAM }}>●</span> Beam &nbsp;
          <span style={{ color: BRASS, marginLeft: 12 }}>●</span> Dial
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ── One lighthouse beam. Drawn along +y from the origin. ─────────────
const Beam: React.FC<{ length: number }> = ({ length }) => {
  const halfWide = 46;
  const halfNarrow = 4;
  // A truncated wedge: wide near tip, narrow at pivot.
  const fan = `M ${-halfNarrow} 0 L ${halfNarrow} 0 L ${halfWide} ${length} L ${-halfWide} ${length} Z`;
  const core = `M 0 0 L ${halfNarrow * 0.6} ${length} L ${-halfNarrow * 0.6} ${length} Z`;
  return (
    <g>
      <path d={fan} fill="url(#beam-fan)" />
      <path d={core} fill="url(#beam-core)" />
    </g>
  );
};

// ── Faint deterministic starfield above type block ────────────────────
const STAR_FIELD: { x: number; y: number; r: number; o: number }[] = (() => {
  // Simple LCG for reproducibility (no Math.random at module scope in Remotion — deterministic anyway).
  let seed = 0x9e3779b1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const arr: { x: number; y: number; r: number; o: number }[] = [];
  for (let i = 0; i < 130; i++) {
    const x = rnd() * 1080;
    const y = rnd() * 900; // keep off type block
    // Skip stars inside dial well radius
    const d = Math.hypot(x - CX, y - CY);
    if (d < R_OUTER + 12) continue;
    arr.push({
      x,
      y,
      r: rnd() < 0.15 ? 1.3 : 0.7,
      o: 0.15 + rnd() * 0.55,
    });
  }
  return arr;
})();
