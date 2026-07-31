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

// Palette — from the concept's visual brief (real lyrebird coloration)
const INK = "#0F0C09";
const UNDERTONE = "#2B2018";
const CINNAMON = "#7C4A2A";
const CINNAMON_HI = "#9E5F35";
const BRONZE = "#B8894B";
const BRONZE_HOT = "#E3B37A";
const IVORY = "#EFE4CE";
const WARM_GRAY = "#8B7458";

// ── Fan geometry ────────────────────────────────────────────────────────────
// Fan origin sits behind the bird's tail base, near lower-center of the hero.
const FAN_ORIGIN = { x: 540, y: 1010 };

type Sample = {
  label: string;
  kind: "bird" | "human" | "machine";
};

// 13 samples — an odd count reads best in a symmetric fan.
const SAMPLES: Sample[] = [
  { label: "ROSELLA", kind: "bird" },
  { label: "KINGFISHER", kind: "bird" },
  { label: "MAGPIE", kind: "bird" },
  { label: "COCKATOO", kind: "bird" },
  { label: "OTHER LYREBIRD", kind: "bird" },
  { label: "DINGO", kind: "bird" },
  { label: "KOOKABURRA", kind: "bird" },
  { label: "HUMAN VOICE", kind: "human" },
  { label: "FLUTE", kind: "human" },
  { label: "CAMERA SHUTTER", kind: "machine" },
  { label: "MOTOR DRIVE", kind: "machine" },
  { label: "CAR ALARM", kind: "machine" },
  { label: "CHAINSAW", kind: "machine" },
];

const N = SAMPLES.length; // 13
const HALF_ANGLE = 58; // degrees — narrower splay so labels sit inside the safe area
const angleForVisualIndex = (i: number) =>
  -HALF_ANGLE + (i * (2 * HALF_ANGLE)) / (N - 1);

// Reveal: center-out.
const REVEAL_ORDER: number[] = (() => {
  const order: number[] = [];
  const mid = Math.floor(N / 2);
  for (let d = 0; d <= mid; d++) {
    if (d === 0) order.push(mid);
    else {
      if (mid - d >= 0) order.push(mid - d);
      if (mid + d < N) order.push(mid + d);
    }
  }
  return order;
})();

// A feather's length is longest at the center and shortens toward the edges,
// keeping tips inside the safe area horizontally.
const feathLen = (i: number) => {
  const norm = Math.abs(angleForVisualIndex(i)) / HALF_ANGLE; // 0..1
  return 760 - norm * 280; // 760 at center, 480 at edges
};

// Filamentary-only fan (label-carrying). Lyrate feathers are drawn separately.
const isLyrate = (_i: number) => false;

// Point along a feather in feather-local coordinates (base 0,0, up = -y).
// Non-lyrate feathers use a gentle quadratic bow;
// lyrate feathers use a cubic S-curve that ends in a small outward hook.
type P = { x: number; y: number };
const feathLocalAt = (i: number, s: number): P => {
  const L = feathLen(i);
  const P0 = { x: 0, y: 0 };
  const P1 = { x: 0, y: -L * 0.55 };
  const P2 = { x: 0, y: -L };
  const u = 1 - s;
  return {
    x: u * u * P0.x + 2 * u * s * P1.x + s * s * P2.x,
    y: u * u * P0.y + 2 * u * s * P1.y + s * s * P2.y,
  };
};

const rot = (dx: number, dy: number, aDeg: number): P => {
  const r = (aDeg * Math.PI) / 180;
  return {
    x: dx * Math.cos(r) - dy * Math.sin(r),
    y: dx * Math.sin(r) + dy * Math.cos(r),
  };
};

const feathPointAt = (i: number, s: number): P => {
  const local = feathLocalAt(i, s);
  const r = rot(local.x, local.y, angleForVisualIndex(i));
  return { x: FAN_ORIGIN.x + r.x, y: FAN_ORIGIN.y + r.y };
};

const feathPathTo = (i: number, s: number) => {
  const steps = 40;
  let d = "";
  for (let k = 0; k <= steps; k++) {
    const sk = (k / steps) * s;
    const p = feathPointAt(i, sk);
    d += k === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d;
};

// ── Feather barbs (soft trailing wisps, not perpendicular ticks) ───────────
const FeatherBarbs: React.FC<{
  i: number;
  grow: number;
  opacity: number;
}> = ({ i, grow, opacity }) => {
  const barbCount = 22;
  const items = [];
  for (let k = 2; k <= barbCount; k++) {
    const sk = k / (barbCount + 1);
    if (sk > grow) break;
    const p = feathPointAt(i, sk);
    const q = feathPointAt(i, Math.min(1, sk + 0.01));
    const tx = q.x - p.x;
    const ty = q.y - p.y;
    const tlen = Math.hypot(tx, ty) || 1;
    // Perpendicular unit
    const nx = -ty / tlen;
    const ny = tx / tlen;
    // Tangent unit (feather-tipward)
    const ux = tx / tlen;
    const uy = ty / tlen;
    // Wisp length: shorter near base and tip, longest mid-feather.
    const bell = Math.sin(sk * Math.PI);
    const baseLen = 12 * (0.5 + bell * 0.9);
    const life = Math.min(1, (grow - sk) * 5);
    const l = baseLen * life;
    // Two wisps per node — one each side — that trail slightly toward the tip.
    for (const sign of [-1, 1]) {
      const midX = p.x + sign * nx * l * 0.6 + ux * l * 0.35;
      const midY = p.y + sign * ny * l * 0.6 + uy * l * 0.35;
      const endX = p.x + sign * nx * l + ux * l * 0.7;
      const endY = p.y + sign * ny * l + uy * l * 0.7;
      items.push(
        <path
          key={`${k}-${sign}`}
          d={`M ${p.x} ${p.y} Q ${midX} ${midY} ${endX} ${endY}`}
          stroke={IVORY}
          strokeOpacity={0.55 * opacity}
          strokeWidth={0.9}
          strokeLinecap="round"
          fill="none"
        />,
      );
    }
  }
  return <g>{items}</g>;
};

// ── Feather (filamentary only in the fan grid) ─────────────────────────────
const Feather: React.FC<{
  i: number;
  grow: number;
  playheadHit: number;
}> = ({ i, grow, playheadHit }) => {
  const path = feathPathTo(i, Math.max(0.001, grow));
  const heat = playheadHit;
  return (
    <g>
      <FeatherBarbs i={i} grow={grow} opacity={0.85 + heat * 0.15} />
      <path
        d={path}
        stroke={IVORY}
        strokeOpacity={0.9}
        strokeWidth={1.35}
        fill="none"
        strokeLinecap="round"
      />
      {heat > 0.02 && (
        <path
          d={path}
          stroke={BRONZE_HOT}
          strokeOpacity={heat * 0.7}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          style={{ filter: "url(#soft-glow)" }}
        />
      )}
    </g>
  );
};

// ── Lyrate feather (decorative, world-space cubic that rises then hooks) ───
// One per side, framing the fan. They do NOT hold labels.
const Lyrate: React.FC<{
  side: -1 | 1;
  grow: number; // 0..1
  playT: number;
}> = ({ side, grow, playT }) => {
  const g = Math.max(0.001, grow);
  // Cubic Bezier in world space
  const P0 = { x: FAN_ORIGIN.x + side * 8, y: FAN_ORIGIN.y - 6 };
  const P1 = { x: FAN_ORIGIN.x + side * 40, y: FAN_ORIGIN.y - 320 };
  const P2 = { x: FAN_ORIGIN.x + side * 340, y: FAN_ORIGIN.y - 680 };
  const P3 = { x: FAN_ORIGIN.x + side * 260, y: FAN_ORIGIN.y - 810 };
  // Sample points from P0 up to fraction g
  const steps = 40;
  let d = "";
  let last = P0;
  for (let k = 0; k <= steps; k++) {
    const s = (k / steps) * g;
    const u = 1 - s;
    const p = {
      x: u * u * u * P0.x + 3 * u * u * s * P1.x + 3 * u * s * s * P2.x + s * s * s * P3.x,
      y: u * u * u * P0.y + 3 * u * u * s * P1.y + 3 * u * s * s * P2.y + s * s * s * P3.y,
    };
    d += k === 0 ? `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    last = p;
  }
  const heat = playT > 0 && playT < 1 ? 0.35 : 0;
  return (
    <g>
      {/* Halo */}
      <path
        d={d}
        stroke={BRONZE_HOT}
        strokeOpacity={0.16 + heat * 0.2}
        strokeWidth={22}
        fill="none"
        strokeLinecap="round"
        style={{ filter: "url(#soft-glow)" }}
      />
      {/* Rachis */}
      <path
        d={d}
        stroke={BRONZE}
        strokeOpacity={0.98}
        strokeWidth={6.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Highlight */}
      <path
        d={d}
        stroke={BRONZE_HOT}
        strokeOpacity={0.55 + heat * 0.25}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
      />
      {/* Tip dot */}
      {grow > 0.9 && (
        <>
          <circle cx={last.x} cy={last.y} r={9} fill={BRONZE_HOT} opacity={0.35} style={{ filter: "url(#soft-glow)" }} />
          <circle cx={last.x} cy={last.y} r={4} fill={BRONZE_HOT} />
        </>
      )}
    </g>
  );
};

// ── Bird silhouette (facing left, head raised singing) ─────────────────────
const BirdSilhouette: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const breatheY = Math.sin((frame / fps) * 1.6) * 1.0;
  const beakOpen = Math.max(0, Math.sin((frame / fps) * 3.4) * 0.5 + 0.5);
  // Origin (0,0) at bird's tail base, at (540, 1015)
  return (
    <g transform={`translate(540, ${1015 + breatheY})`}>
      {/* Display mound */}
      <ellipse cx={0} cy={22} rx={230} ry={16} fill="#1B120A" />
      <ellipse cx={0} cy={22} rx={170} ry={9} fill="#241810" opacity={0.85} />
      {/* Legs (drawn first, behind body) */}
      <g stroke="#26170D" strokeWidth={2.8} strokeLinecap="round">
        <line x1={-52} y1={4} x2={-52} y2={22} />
        <line x1={-30} y1={4} x2={-30} y2={22} />
        <line x1={-52} y1={22} x2={-62} y2={23} />
        <line x1={-52} y1={22} x2={-46} y2={23} />
        <line x1={-30} y1={22} x2={-38} y2={23} />
        <line x1={-30} y1={22} x2={-22} y2={23} />
      </g>
      {/* Body (teardrop, tail-end at right/origin, head end at left) */}
      <path
        d="
          M 0 -8
          C -6 -30 -40 -46 -80 -42
          C -120 -38 -140 -20 -132 -2
          C -122 12 -70 18 -30 12
          C -8 8 2 2 0 -8 Z
        "
        fill={CINNAMON}
      />
      {/* Body highlight */}
      <path
        d="
          M -30 -6
          C -60 -12 -95 -22 -118 -14
          C -100 -30 -70 -36 -46 -30
          C -30 -22 -26 -14 -30 -6 Z
        "
        fill={CINNAMON_HI}
        opacity={0.9}
      />
      {/* Folded wing suggestion */}
      <path
        d="
          M -20 -6
          C -55 -18 -95 -12 -115 4
          C -85 8 -50 8 -25 4
          C -20 -1 -20 -4 -20 -6 Z
        "
        fill="#5B3520"
        opacity={0.9}
      />
      {/* Neck rising */}
      <path
        d="
          M -108 -34
          C -128 -60 -138 -84 -132 -100
          C -128 -110 -118 -110 -116 -100
          C -114 -84 -118 -66 -122 -50
          C -118 -44 -114 -40 -108 -34 Z
        "
        fill={CINNAMON}
      />
      {/* Head */}
      <circle cx={-124} cy={-104} r={11} fill={CINNAMON} />
      <path
        d="M -132 -110 C -134 -102 -128 -96 -122 -98 C -122 -104 -128 -110 -132 -110 Z"
        fill={CINNAMON_HI}
        opacity={0.9}
      />
      {/* Crown tuft */}
      <path
        d="M -128 -114 Q -122 -122 -118 -114"
        stroke={CINNAMON_HI}
        strokeWidth={1.2}
        fill="none"
      />
      {/* Eye */}
      <circle cx={-127} cy={-105} r={1.6} fill={INK} />
      {/* Beak — animates open */}
      <g>
        <path
          d={`M -134 -104 L -152 -${105 + beakOpen * 0.2} L -134 -102 Z`}
          fill="#2A180D"
        />
        <path
          d={`M -134 -102 L -152 -${100 - beakOpen * 2.2} L -134 -100 Z`}
          fill="#3B2515"
        />
      </g>
      {/* Sound puff */}
      <g
        transform="translate(-160, -102)"
        opacity={0.4 + beakOpen * 0.4}
        stroke={IVORY}
        strokeWidth={1.1}
        fill="none"
        strokeLinecap="round"
      >
        <path d="M 0 -6 Q -6 -10 -14 -8" />
        <path d="M 0 0 Q -8 0 -16 2" opacity={0.75} />
        <path d="M 0 6 Q -6 10 -14 8" opacity={0.55} />
      </g>
    </g>
  );
};

// ── Component ───────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const revealStart = fps * 0.15;
  const revealStagger = 3.4;

  const growForVisualIndex = (visIdx: number) => {
    const revealPos = REVEAL_ORDER.indexOf(visIdx);
    const start = revealStart + revealPos * revealStagger;
    const s = spring({
      frame: frame - start,
      fps,
      config: { damping: 22, mass: 0.9, stiffness: 90 },
    });
    return Math.max(0, Math.min(1, s));
  };

  const playStart = fps * 2.7;
  const playSpan = fps * 2.0;
  const playT = Math.max(0, Math.min(1, (frame - playStart) / playSpan));
  const playEased =
    playT < 0.5
      ? 16 * playT * playT * playT * playT * playT
      : 1 - Math.pow(-2 * playT + 2, 5) / 2;
  const playAngle = -HALF_ANGLE + playEased * (2 * HALF_ANGLE);

  const heatForVisualIndex = (i: number) => {
    if (playT <= 0 || playT >= 1) return 0;
    const a = angleForVisualIndex(i);
    const d = Math.abs(a - playAngle);
    const w = 10;
    return Math.max(0, 1 - d / w);
  };

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(
    frame,
    [fps * 0.9, fps * 1.8],
    [0, 1],
    {
      easing: Easing.out(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const metaOpacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateRight: "clamp",
  });

  const labelOpacityFor = (i: number) => {
    const g = growForVisualIndex(i);
    const base = interpolate(g, [0.55, 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return Math.min(1, base + heatForVisualIndex(i) * 0.5);
  };

  const PAGE_L = 80;
  const PAGE_R = 1000;

  return (
    <AbsoluteFill style={{ backgroundColor: INK, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="page-vignette" cx="50%" cy="80%" r="65%">
            <stop offset="0%" stopColor="#1B140D" />
            <stop offset="65%" stopColor={INK} />
            <stop offset="100%" stopColor="#070503" />
          </radialGradient>

          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* Background */}
        <rect x={0} y={0} width={1080} height={1350} fill="url(#page-vignette)" />

        {/* Horizon between hero and type */}
        <line
          x1={80}
          y1={1058}
          x2={1000}
          y2={1058}
          stroke={UNDERTONE}
          strokeWidth={1}
        />

        {/* Concentric guide arcs — thin, decorative */}
        {(() => {
          const arcs = [];
          const guideOpacity = interpolate(
            frame,
            [fps * 0.4, fps * 1.4],
            [0, 0.28],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          for (const R of [280, 480, 680]) {
            const s1 = ((-HALF_ANGLE - 3) * Math.PI) / 180;
            const s2 = ((HALF_ANGLE + 3) * Math.PI) / 180;
            const p1 = {
              x: FAN_ORIGIN.x + Math.sin(s1) * R,
              y: FAN_ORIGIN.y - Math.cos(s1) * R,
            };
            const p2 = {
              x: FAN_ORIGIN.x + Math.sin(s2) * R,
              y: FAN_ORIGIN.y - Math.cos(s2) * R,
            };
            arcs.push(
              <path
                key={R}
                d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                fill="none"
                stroke={WARM_GRAY}
                strokeOpacity={guideOpacity}
                strokeWidth={0.7}
                strokeDasharray="1 4"
              />,
            );
          }
          return <g>{arcs}</g>;
        })()}

        {/* Radial tick meter at fan base */}
        {(() => {
          const ticks = [];
          const R_IN = 200;
          const tickOpacity = interpolate(
            frame,
            [0, fps * 0.6],
            [0, 0.55],
            { extrapolateRight: "clamp" },
          );
          for (let k = -HALF_ANGLE; k <= HALF_ANGLE; k += 5) {
            const r = (k * Math.PI) / 180;
            const inner = R_IN;
            const outer = R_IN + (k % 15 === 0 ? 12 : 6);
            const x1 = FAN_ORIGIN.x + Math.sin(r) * inner;
            const y1 = FAN_ORIGIN.y - Math.cos(r) * inner;
            const x2 = FAN_ORIGIN.x + Math.sin(r) * outer;
            const y2 = FAN_ORIGIN.y - Math.cos(r) * outer;
            ticks.push(
              <line
                key={k}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={WARM_GRAY}
                strokeOpacity={tickOpacity}
                strokeWidth={k % 15 === 0 ? 1.2 : 0.7}
              />,
            );
          }
          return <g>{ticks}</g>;
        })()}

        {/* Decorative lyrate feathers (behind the filamentary fan) */}
        {(() => {
          const lyrateGrow = spring({
            frame: frame - fps * 0.05,
            fps,
            config: { damping: 24, mass: 1.1, stiffness: 55 },
          });
          const g = Math.max(0, Math.min(1, lyrateGrow));
          return (
            <>
              <Lyrate side={-1} grow={g} playT={playT} />
              <Lyrate side={1} grow={g} playT={playT} />
            </>
          );
        })()}

        {/* Filamentary feathers (label-carrying) */}
        {SAMPLES.map((_, i) => (
          <Feather
            key={i}
            i={i}
            grow={growForVisualIndex(i)}
            playheadHit={heatForVisualIndex(i)}
          />
        ))}

        {/* Playhead sweep */}
        {playT > 0 && playT < 1 && (
          <g>
            {(() => {
              const rInner = 190;
              const rOuter = 830;
              const r = (playAngle * Math.PI) / 180;
              const x1 = FAN_ORIGIN.x + Math.sin(r) * rInner;
              const y1 = FAN_ORIGIN.y - Math.cos(r) * rInner;
              const x2 = FAN_ORIGIN.x + Math.sin(r) * rOuter;
              const y2 = FAN_ORIGIN.y - Math.cos(r) * rOuter;
              return (
                <>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={BRONZE_HOT}
                    strokeOpacity={0.3}
                    strokeWidth={14}
                    style={{ filter: "url(#soft-glow)" }}
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={BRONZE_HOT}
                    strokeOpacity={0.9}
                    strokeWidth={1.2}
                  />
                </>
              );
            })()}
          </g>
        )}

        {/* Bird silhouette */}
        <BirdSilhouette frame={frame} fps={fps} />
      </svg>

      {/* ── Feather-tip labels — HTML overlay for perfect legibility ─────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {SAMPLES.map((s, i) => {
          const g = growForVisualIndex(i);
          if (g < 0.5) return null;
          const tip = feathPointAt(i, 0.995);
          const a = angleForVisualIndex(i);
          const side = a < 0 ? -1 : 1;
          const heat = heatForVisualIndex(i);
          const op = labelOpacityFor(i);
          // Push label along radial direction a little beyond the tip
          const r = (a * Math.PI) / 180;
          const pushR = 12;
          const px = tip.x + Math.sin(r) * pushR;
          const py = tip.y - Math.cos(r) * pushR;
          // Anchor on the appropriate side
          const anchorX = Math.max(PAGE_L, Math.min(PAGE_R, px + side * 6));
          const kindText =
            s.kind === "machine" ? "MACHINE" : s.kind === "human" ? "HUMAN" : "BIRD";
          const kindColor = s.kind === "machine" ? BRONZE : WARM_GRAY;
          // Use left / right / center anchoring based on side so text always
          // extends INWARD (never off the canvas).
          const isLeft = side < 0;
          const posStyle: React.CSSProperties = isLeft
            ? { right: 1080 - anchorX, textAlign: "right" }
            : { left: anchorX, textAlign: "left" };
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: py,
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: isLeft ? "flex-end" : "flex-start",
                opacity: op,
                maxWidth: 260,
                ...posStyle,
              }}
            >
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 9,
                  color: kindColor,
                  letterSpacing: 2.2,
                  fontWeight: 500,
                  marginBottom: 2,
                  opacity: 0.75 + heat * 0.25,
                }}
              >
                {kindText}
              </div>
              <div
                style={{
                  fontFamily: inter,
                  fontSize: 12.5,
                  color: s.kind === "machine" ? BRONZE_HOT : IVORY,
                  letterSpacing: 2.6,
                  fontWeight: s.kind === "machine" ? 600 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Radial ticks from feather tips (rendered above labels for connection) */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {SAMPLES.map((s, i) => {
          const g = growForVisualIndex(i);
          if (g < 0.5) return null;
          const tip = feathPointAt(i, 0.995);
          const a = angleForVisualIndex(i);
          const r = (a * Math.PI) / 180;
          const p2 = { x: tip.x + Math.sin(r) * 10, y: tip.y - Math.cos(r) * 10 };
          const op = labelOpacityFor(i) * 0.6;
          return (
            <g key={i} opacity={op}>
              <circle
                cx={tip.x}
                cy={tip.y}
                r={2.4}
                fill={s.kind === "machine" ? BRONZE_HOT : IVORY}
              />
              <line
                x1={tip.x}
                y1={tip.y}
                x2={p2.x}
                y2={p2.y}
                stroke={WARM_GRAY}
                strokeWidth={0.8}
              />
            </g>
          );
        })}
      </svg>

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
          color: WARM_GRAY,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: metaOpacity,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: BRONZE }}>2026 · 07 · 31</span>
      </div>

      {/* Diagram caption */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1070,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: WARM_GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
          opacity: interpolate(frame, [fps * 0.8, fps * 1.6], [0, 0.85], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span>Fig. 1 · Sample library, one male, one winter mound</span>
        <span style={{ color: BRONZE }}>Playhead sweep · 0:02.7</span>
      </div>

      {/* Type lockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1112,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [14, 0])}px)`,
        }}
      >
        <div
          style={{
            color: BRONZE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: WARM_GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: IVORY, letterSpacing: 5 }}>Foley Artist</span>
        </div>

        <div
          style={{
            color: IVORY,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 68,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The forest floor's mimic.
        </div>

        <div
          style={{
            marginTop: 18,
            color: "#D9CDB4",
            fontFamily: inter,
            fontSize: 16.5,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Up to 80% of a male superb lyrebird's territorial song is imitation.{" "}
          <span style={{ color: BRONZE, fontWeight: 600 }}>
            Menura novaehollandiae
          </span>{" "}
          can reproduce 20+ other birds' calls — and the machines around him:
          camera shutters, motor drives, car alarms, chainsaws.
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
          color: WARM_GRAY,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dalziell &amp; Magrath · Anim. Behav. 83 (2012)</span>
        <span>
          <span style={{ color: BRONZE }}>●</span> Sample = mimicked source
        </span>
      </div>
    </AbsoluteFill>
  );
};
