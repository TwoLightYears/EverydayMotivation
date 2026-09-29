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
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: block;
  src: url(${staticFile("fonts/inter-latin-400-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/inter-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: block;
  src: url(${staticFile("fonts/inter-latin-600-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: normal; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-normal.woff2")}) format('woff2'); }
@font-face { font-family: 'Playfair Display'; font-style: italic; font-weight: 500; font-display: block;
  src: url(${staticFile("fonts/playfair-display-latin-500-italic.woff2")}) format('woff2'); }
`;

const INK = "#0A1420";
const COBALT = "#1E4C9A";
const COBALT_HI = "#2E63B8";
const COBALT_LO = "#123063";
const TURQUOISE = "#3FB0C4";
const TURQUOISE_HI = "#5FCADD";
const CINNAMON = "#D8712A";
const CINNAMON_HI = "#EE8B44";
const CREAM = "#F5F1E6";
const GRID = "#152034";
const GRID_MAJOR = "#213048";
const GRAY = "#6A7A94";

// ── Layout ─────────────────────────────────────────────────────────────
const CANVAS_W = 1080;
const CANVAS_H = 1350;
const FRAME = { x: 60, y: 130, w: 960, h: 811 };
const DIVIDER_Y = 500;

// ── SHARED TAPER CURVE ────────────────────────────────────────────────
// Both the kingfisher's beak and the Shinkansen 500's nose are drawn from
// this exact same normalized curve.  s=0 is the tip; s=1 is the base
// where the taper meets the body/car.
//
// A smooth cubic Bezier–style profile with an inflection near the base
// (matching the actual 500-series long-nose profile).
function taperHalfW(s: number): number {
  const c = Math.max(0, Math.min(1, s));
  // Smooth power taper with a subtle bell at the very base
  const base = Math.pow(c, 1.5);
  const flare = 0.06 * Math.sin(Math.PI * c) * c;
  return base + flare;
}

// Trace the upper half of a taper from tipX (right) to baseX (left) at cy.
// Returns [samples] of [x,y] points.
function taperUpper(
  tipX: number,
  baseX: number,
  cy: number,
  maxHalfH: number,
  N = 60,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = tipX - s * (tipX - baseX);
    const h = maxHalfH * taperHalfW(s);
    pts.push([x, cy - h]);
  }
  return pts;
}

function taperFilledPath(
  tipX: number,
  baseX: number,
  cy: number,
  maxHalfH: number,
  N = 60,
): string {
  const upper = taperUpper(tipX, baseX, cy, maxHalfH, N);
  const parts: string[] = [];
  parts.push(`M ${upper[0][0]} ${upper[0][1]}`);
  for (let i = 1; i < upper.length; i++) parts.push(`L ${upper[i][0]} ${upper[i][1]}`);
  for (let i = upper.length - 1; i >= 0; i--) {
    const [x, y] = upper[i];
    parts.push(`L ${x} ${2 * cy - y}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

function polyToPath(pts: [number, number][]): string {
  return "M " + pts.map(([x, y]) => `${x} ${y}`).join(" L ");
}

// ── Streamlines around a body — clean smooth curves that fade at the edges ─
function drawStream(
  cxL: number,   // upstream x (line enters from here)
  cxR: number,   // downstream x (line exits here)
  cy: number,    // body axis
  bodyMinX: number,
  bodyMaxX: number,
  bodyHalfHAt: (x: number) => number,
  offset: number,
  clearance: number,
  N = 100,
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // upstream = right, downstream = left  (matches diagram convention)
    const x = cxR - t * (cxR - cxL);
    let bodyH = 0;
    if (x >= bodyMinX && x <= bodyMaxX) bodyH = bodyHalfHAt(x);
    // soft-max between rest offset and body-hugging clearance
    const rest = offset;
    const target = bodyH + clearance;
    const k = 12;
    const soft = 0.5 * (rest + target + Math.sqrt((rest - target) * (rest - target) + k * k));
    pts.push([x, cy - soft]);
  }
  const parts: string[] = [];
  parts.push(`M ${pts[0][0]} ${pts[0][1]}`);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [xn, yn] = pts[i + 1];
    parts.push(`Q ${x} ${y} ${(x + xn) / 2} ${(y + yn) / 2}`);
  }
  parts.push(`L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`);
  return parts.join(" ");
}

function mirrorAcrossY(pathD: string, cy: number): string {
  return pathD.replace(
    /([MLQC])\s*(-?[\d.]+)\s+(-?[\d.]+)(?:\s+(-?[\d.]+)\s+(-?[\d.]+))?(?:\s+(-?[\d.]+)\s+(-?[\d.]+))?/g,
    (_m, cmd, x1, y1, x2, y2, x3, y3) => {
      const flip = (v: string): string => (2 * cy - parseFloat(v)).toString();
      let out = `${cmd} ${x1} ${flip(y1)}`;
      if (x2 !== undefined) out += ` ${x2} ${flip(y2)}`;
      if (x3 !== undefined) out += ` ${x3} ${flip(y3)}`;
      return out;
    },
  );
}

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Timing ────────────────────────────────────────────────────────
  const streamGrow = interpolate(frame, [0, fps * 1.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kfSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 24, mass: 0.9, stiffness: 90 },
  });
  const trainSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 22, mass: 0.9, stiffness: 80 },
  });
  const overlayFade = interpolate(frame, [fps * 1.5, fps * 2.4], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSpring = spring({
    frame: frame - fps * 0.55,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.2, fps * 2.0], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── KINGFISHER geometry (Panel A) ────────────────────────────────
  // Bird faces RIGHT.  Beak points right.
  const kfCy = 340 + interpolate(kfSpring, [0, 1], [-20, 0]);
  const kfBeakTipX = 760;
  const kfBeakBaseX = kfBeakTipX - 130;  // beak length 130
  const kfHeadCx = kfBeakBaseX - 30;
  const kfHeadR = 46;
  const kfBodyRightX = kfHeadCx - 20;    // body starts just behind head
  const kfBodyLeftX = kfBodyRightX - 190; // body length 190
  const kfBodyH = 44;   // half-height at thickest
  const kfBeakMaxH = 8; // half-height at beak base
  const kfTailTipX = kfBodyLeftX - 44;

  // Half-height at any x along the kingfisher silhouette (top)
  const kfHalfHAt = (x: number): number => {
    // Beak
    if (x >= kfBeakBaseX && x <= kfBeakTipX) {
      const s = (kfBeakTipX - x) / (kfBeakTipX - kfBeakBaseX);
      return kfBeakMaxH * taperHalfW(s);
    }
    // Head (circle)
    if (x >= kfHeadCx - kfHeadR && x <= kfHeadCx + kfHeadR) {
      const dx = x - kfHeadCx;
      return Math.sqrt(kfHeadR * kfHeadR - dx * dx);
    }
    // Body (ellipse)
    if (x >= kfBodyLeftX && x <= kfBodyRightX) {
      const cx = (kfBodyLeftX + kfBodyRightX) / 2;
      const rx = (kfBodyRightX - kfBodyLeftX) / 2;
      const dx = x - cx;
      const norm = 1 - (dx * dx) / (rx * rx);
      return kfBodyH * Math.sqrt(Math.max(0, norm));
    }
    return 0;
  };

  // ── SHINKANSEN 500 geometry (Panel B) ────────────────────────────
  // Faces RIGHT.  Nose tip on the right.
  const trCy = 720;
  const trNoseTipX = 830 + interpolate(trainSpring, [0, 1], [30, 0]);
  const trNoseBaseX = trNoseTipX - 320;  // long nose: 320
  const trCarLeftX = trNoseBaseX - 220;  // continuation into first passenger car
  const trBodyH = 96;    // half-height of passenger car
  const trNoseMaxH = 96; // shared with car
  const trRoofSlope = 8; // very slight roof arc

  const trHalfHAt = (x: number): number => {
    // Nose taper
    if (x >= trNoseBaseX && x <= trNoseTipX) {
      const s = (trNoseTipX - x) / (trNoseTipX - trNoseBaseX);
      return trNoseMaxH * taperHalfW(s);
    }
    // Passenger car — near-rectangle with subtle roof arc
    if (x >= trCarLeftX && x <= trNoseBaseX) {
      // gentle bump toward the roof at center
      const mid = (trCarLeftX + trNoseBaseX) / 2;
      const half = (trNoseBaseX - trCarLeftX) / 2;
      const t = 1 - Math.abs(x - mid) / half;
      return trBodyH - trRoofSlope * (1 - t);
    }
    return 0;
  };

  // ── Panel A streamline set (constrained to panel A) ──
  const kfStreamOffsets = [42, 78, 118, 158];
  const kfStreamLeft = Math.max(FRAME.x + 20, kfTailTipX - 60);
  const kfStreamRight = Math.min(FRAME.x + FRAME.w - 20, kfBeakTipX + 70);

  // ── Panel B streamline set (constrained to panel B) ──
  const trStreamOffsets = [60, 108, 162, 216];
  const trStreamLeft = Math.max(FRAME.x + 20, trCarLeftX - 24);
  const trStreamRight = Math.min(FRAME.x + FRAME.w - 20, trNoseTipX + 60);

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
        <span style={{ color: TURQUOISE }}>2026 · 09 · 29</span>
      </div>

      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern id="grid" x={FRAME.x} y={FRAME.y} width={48} height={48} patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={GRID} strokeWidth={1} />
          </pattern>
          <pattern id="grid-major" x={FRAME.x} y={FRAME.y} width={192} height={192} patternUnits="userSpaceOnUse">
            <path d="M 192 0 L 0 0 0 192" fill="none" stroke={GRID_MAJOR} strokeWidth={1} />
          </pattern>

          <radialGradient id="board-vignette" cx="50%" cy="42%" r="72%">
            <stop offset="0%" stopColor="#101B2C" />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>

          <linearGradient id="kf-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={TURQUOISE_HI} />
            <stop offset="35%" stopColor={COBALT_HI} />
            <stop offset="100%" stopColor={COBALT_LO} />
          </linearGradient>
          <linearGradient id="kf-belly" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={CINNAMON_HI} />
            <stop offset="100%" stopColor={CINNAMON} />
          </linearGradient>

          <linearGradient id="tr-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F1F3F7" />
            <stop offset="55%" stopColor="#C6CBD5" />
            <stop offset="100%" stopColor="#8894A8" />
          </linearGradient>
        </defs>

        {/* Board */}
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#board-vignette)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid)" />
        <rect x={FRAME.x} y={FRAME.y} width={FRAME.w} height={FRAME.h} fill="url(#grid-major)" />
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#233149"
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
          <g key={i} stroke={CINNAMON} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Panel labels */}
        <g
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3.4}
          fontWeight={600}
        >
          <text x={FRAME.x + 20} y={FRAME.y + 32} fill={CREAM} opacity={0.9}>
            A · ALCEDO ATTHIS
          </text>
          <text x={FRAME.x + FRAME.w - 20} y={FRAME.y + 32} textAnchor="end" fill={GRAY}>
            SCALE 1 : 4
          </text>
          <text x={FRAME.x + 20} y={DIVIDER_Y + 32} fill={CREAM} opacity={0.9}>
            B · SHINKANSEN 500
          </text>
          <text x={FRAME.x + FRAME.w - 20} y={DIVIDER_Y + 32} textAnchor="end" fill={GRAY}>
            SCALE 1 : 90
          </text>
        </g>

        {/* Panel divider */}
        <line
          x1={FRAME.x + 20}
          y1={DIVIDER_Y}
          x2={FRAME.x + FRAME.w - 20}
          y2={DIVIDER_Y}
          stroke="#243149"
          strokeWidth={1}
        />

        {/* ── PANEL A · KINGFISHER ────────────────────────────────── */}

        {/* Streamlines */}
        <g opacity={streamGrow}>
          {kfStreamOffsets.map((off, i) => {
            const top = drawStream(
              kfStreamLeft,
              kfStreamRight,
              kfCy,
              kfTailTipX,
              kfBeakTipX,
              kfHalfHAt,
              off,
              14,
            );
            const bot = mirrorAcrossY(top, kfCy);
            const op = 0.55 - i * 0.08;
            return (
              <g key={`kfs-${i}`}>
                <path d={top} fill="none" stroke={CINNAMON} strokeOpacity={op} strokeWidth={1.3} strokeLinecap="round" />
                <path d={bot} fill="none" stroke={CINNAMON} strokeOpacity={op} strokeWidth={1.3} strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Bird body (ellipse, cobalt back) */}
        <g>
          {/* Body */}
          <ellipse
            cx={(kfBodyLeftX + kfBodyRightX) / 2}
            cy={kfCy}
            rx={(kfBodyRightX - kfBodyLeftX) / 2}
            ry={kfBodyH}
            fill="url(#kf-back)"
          />
          {/* Belly (cinnamon) — lower half */}
          <path
            d={`
              M ${kfBodyLeftX} ${kfCy}
              A ${(kfBodyRightX - kfBodyLeftX) / 2} ${kfBodyH} 0 0 0 ${kfBodyRightX} ${kfCy}
              L ${kfBodyLeftX} ${kfCy}
              Z
            `}
            fill="url(#kf-belly)"
          />
          {/* Turquoise back stripe */}
          <path
            d={`
              M ${kfBodyLeftX + 10} ${kfCy - kfBodyH + 6}
              Q ${(kfBodyLeftX + kfBodyRightX) / 2} ${kfCy - kfBodyH - 2}
                ${kfBodyRightX - 10} ${kfCy - kfBodyH + 8}
            `}
            fill="none"
            stroke={TURQUOISE}
            strokeWidth={5}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />

          {/* Wing (tucked, a sleeker feathered shape) */}
          <g transform={`translate(${(kfBodyLeftX + kfBodyRightX) / 2 - 4}, ${kfCy - 2})`}>
            <path
              d="
                M -78 2
                C -60 -18, -18 -22, 34 -8
                C 46 -2, 24 10, -4 12
                C -34 12, -62 10, -78 2 Z
              "
              fill={COBALT_LO}
              opacity={0.95}
            />
            {/* Feather rachis lines */}
            <path
              d="M -66 -2 C -34 -16, 6 -18, 30 -6"
              fill="none"
              stroke={INK}
              strokeOpacity={0.4}
              strokeWidth={1}
            />
            <path
              d="M -54 4 C -24 -8, 8 -10, 24 -2"
              fill="none"
              stroke={INK}
              strokeOpacity={0.32}
              strokeWidth={0.9}
            />
            <path
              d="M -42 8 C -14 0, 12 -2, 20 4"
              fill="none"
              stroke={INK}
              strokeOpacity={0.25}
              strokeWidth={0.8}
            />
          </g>

          {/* Head (circle) */}
          <circle cx={kfHeadCx} cy={kfCy} r={kfHeadR} fill="url(#kf-back)" />
          {/* Crown highlight — a curved band along the top of the head */}
          <path
            d={`
              M ${kfHeadCx - kfHeadR + 8} ${kfCy - kfHeadR * 0.55}
              A ${kfHeadR - 6} ${kfHeadR * 0.55} 0 0 1 ${kfHeadCx + kfHeadR - 4} ${kfCy - kfHeadR * 0.35}
            `}
            fill="none"
            stroke={TURQUOISE_HI}
            strokeWidth={4}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
          {/* Dark eye stripe (a defining kingfisher feature) */}
          <path
            d={`
              M ${kfHeadCx - kfHeadR * 0.5} ${kfCy - 4}
              Q ${kfHeadCx + 4} ${kfCy - 2}
                ${kfHeadCx + kfHeadR - 4} ${kfCy - 8}
            `}
            fill="none"
            stroke="#0A1220"
            strokeWidth={9}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />
          {/* White cheek patch — below the eye, along the jawline */}
          <path
            d={`
              M ${kfHeadCx - 4} ${kfCy + 4}
              Q ${kfHeadCx + 10} ${kfCy + 6}
                ${kfHeadCx + kfHeadR - 6} ${kfCy + 2}
              L ${kfHeadCx + kfHeadR - 4} ${kfCy + 14}
              Q ${kfHeadCx + 8} ${kfCy + 20}
                ${kfHeadCx - 8} ${kfCy + 14}
              Z
            `}
            fill={CREAM}
            opacity={0.95}
          />

          {/* Eye — set inside the dark stripe */}
          <circle cx={kfHeadCx + 8} cy={kfCy - 4} r={4.2} fill="#050912" />
          <circle cx={kfHeadCx + 9.2} cy={kfCy - 5.2} r={1.4} fill={CREAM} opacity={0.9} />

          {/* Beak — dagger, straight */}
          <path
            d={taperFilledPath(kfBeakTipX, kfBeakBaseX, kfCy, kfBeakMaxH)}
            fill="#0C1524"
          />
          {/* Beak seam line */}
          <line
            x1={kfBeakBaseX}
            y1={kfCy}
            x2={kfBeakTipX}
            y2={kfCy}
            stroke={CREAM}
            strokeOpacity={0.35}
            strokeWidth={0.8}
          />

          {/* Tail (split) */}
          <g>
            <path
              d={`
                M ${kfBodyLeftX + 4} ${kfCy - 8}
                L ${kfTailTipX - 4} ${kfCy - 18}
                L ${kfBodyLeftX + 6} ${kfCy - 2} Z
              `}
              fill={COBALT_LO}
            />
            <path
              d={`
                M ${kfBodyLeftX + 4} ${kfCy + 4}
                L ${kfTailTipX - 4} ${kfCy + 22}
                L ${kfBodyLeftX + 6} ${kfCy + 12} Z
              `}
              fill={COBALT_LO}
              opacity={0.9}
            />
          </g>

          {/* Feet tucked under */}
          <g fill={CINNAMON}>
            <path d={`M ${kfHeadCx - 40} ${kfCy + kfBodyH * 0.72} l 3 12 l 6 -2 l -2 -12 z`} />
            <path d={`M ${kfHeadCx - 22} ${kfCy + kfBodyH * 0.85} l 2 10 l 6 -2 l -2 -10 z`} opacity={0.9} />
          </g>
        </g>

        {/* ── PANEL B · SHINKANSEN 500 ─────────────────────────────── */}

        {/* Streamlines */}
        <g opacity={streamGrow}>
          {trStreamOffsets.map((off, i) => {
            const top = drawStream(
              trStreamLeft,
              trStreamRight,
              trCy,
              trCarLeftX,
              trNoseTipX,
              trHalfHAt,
              off,
              14,
            );
            const bot = mirrorAcrossY(top, trCy);
            const op = 0.55 - i * 0.08;
            return (
              <g key={`trs-${i}`}>
                <path d={top} fill="none" stroke={CINNAMON} strokeOpacity={op} strokeWidth={1.3} strokeLinecap="round" />
                <path d={bot} fill="none" stroke={CINNAMON} strokeOpacity={op} strokeWidth={1.3} strokeLinecap="round" />
              </g>
            );
          })}
        </g>

        {/* Shadow */}
        <ellipse
          cx={(trNoseTipX + trCarLeftX) / 2}
          cy={trCy + trBodyH + 24}
          rx={(trNoseTipX - trCarLeftX) / 2 - 20}
          ry={9}
          fill="#000"
          opacity={0.4}
        />

        {/* Passenger car body (rounded rectangle) */}
        <g>
          <path
            d={`
              M ${trCarLeftX} ${trCy - trBodyH + trRoofSlope}
              Q ${(trCarLeftX + trNoseBaseX) / 2} ${trCy - trBodyH - trRoofSlope * 0.5}
                ${trNoseBaseX} ${trCy - trBodyH + trRoofSlope}
              L ${trNoseBaseX} ${trCy + trBodyH}
              L ${trCarLeftX} ${trCy + trBodyH}
              Z
            `}
            fill="url(#tr-body)"
          />

          {/* Nose taper */}
          <path
            d={taperFilledPath(trNoseTipX, trNoseBaseX, trCy, trNoseMaxH)}
            fill="url(#tr-body)"
          />

          {/* Cobalt lower livery band along car + nose */}
          {(() => {
            const N = 42;
            const upper: [number, number][] = [];
            const lower: [number, number][] = [];
            // Car section
            for (let i = 0; i <= 6; i++) {
              const x = trCarLeftX + (i / 6) * (trNoseBaseX - trCarLeftX);
              upper.push([x, trCy + trBodyH * 0.02]);
              lower.push([x, trCy + trBodyH - 4]);
            }
            // Nose section
            for (let i = 0; i <= N; i++) {
              const s = i / N;
              const x = trNoseBaseX + s * (trNoseTipX - trNoseBaseX);
              const sFromTip = 1 - s;
              const h = trNoseMaxH * taperHalfW(sFromTip);
              upper.push([x, trCy + h * 0.03]);
              lower.push([x, trCy + h]);
            }
            const d =
              "M " +
              upper.map(([x, y]) => `${x} ${y}`).join(" L ") +
              " L " +
              lower.slice().reverse().map(([x, y]) => `${x} ${y}`).join(" L ") +
              " Z";
            return <path d={d} fill={COBALT} />;
          })()}

          {/* Turquoise pinstripe */}
          {(() => {
            const pts: [number, number][] = [];
            const N = 6;
            for (let i = 0; i <= N; i++) {
              const x = trCarLeftX + (i / N) * (trNoseBaseX - trCarLeftX);
              pts.push([x, trCy + trBodyH * 0.02]);
            }
            const N2 = 30;
            for (let i = 0; i <= N2; i++) {
              const s = i / N2;
              const x = trNoseBaseX + s * (trNoseTipX - trNoseBaseX);
              const sFromTip = 1 - s;
              const h = trNoseMaxH * taperHalfW(sFromTip);
              pts.push([x, trCy + h * 0.03]);
            }
            return (
              <path
                d={polyToPath(pts)}
                fill="none"
                stroke={TURQUOISE}
                strokeWidth={3}
                strokeOpacity={0.95}
              />
            );
          })()}

          {/* Cockpit — long dark canopy along the upper nose */}
          {(() => {
            const N = 30;
            const upper: [number, number][] = [];
            const lower: [number, number][] = [];
            const sStart = 0.35;
            const sEnd = 0.98;
            for (let i = 0; i <= N; i++) {
              const s = sStart + (sEnd - sStart) * (i / N);
              const sFromTip = s;
              const x = trNoseTipX - sFromTip * (trNoseTipX - trNoseBaseX);
              const h = trNoseMaxH * taperHalfW(sFromTip);
              upper.push([x, trCy - h + 8]);
              lower.push([x, trCy - h * 0.45]);
            }
            const d =
              "M " +
              upper.map(([x, y]) => `${x} ${y}`).join(" L ") +
              " L " +
              lower.slice().reverse().map(([x, y]) => `${x} ${y}`).join(" L ") +
              " Z";
            return <path d={d} fill="#091528" opacity={0.94} />;
          })()}

          {/* Cockpit inner sheen */}
          {(() => {
            const N = 20;
            const pts: [number, number][] = [];
            const sStart = 0.4;
            const sEnd = 0.85;
            for (let i = 0; i <= N; i++) {
              const s = sStart + (sEnd - sStart) * (i / N);
              const x = trNoseTipX - s * (trNoseTipX - trNoseBaseX);
              const h = trNoseMaxH * taperHalfW(s);
              pts.push([x, trCy - h + 18]);
            }
            return (
              <path
                d={polyToPath(pts)}
                fill="none"
                stroke={TURQUOISE_HI}
                strokeWidth={1.2}
                strokeOpacity={0.5}
              />
            );
          })()}

          {/* Passenger windows along the car */}
          {(() => {
            const wins: React.ReactNode[] = [];
            const winY = trCy - trBodyH * 0.35;
            const winH = 22;
            const startX = trCarLeftX + 22;
            const endX = trNoseBaseX - 18;
            const count = 6;
            const gap = (endX - startX) / count;
            for (let k = 0; k < count; k++) {
              const x = startX + k * gap;
              wins.push(
                <rect
                  key={`w-${k}`}
                  x={x}
                  y={winY}
                  width={gap - 10}
                  height={winH}
                  fill="#091528"
                  opacity={0.9}
                  rx={3}
                />,
              );
            }
            return <g>{wins}</g>;
          })()}

          {/* Doorway line between cars */}
          <line
            x1={trCarLeftX + 4}
            y1={trCy - trBodyH + trRoofSlope}
            x2={trCarLeftX + 4}
            y2={trCy + trBodyH}
            stroke="#0A1626"
            strokeOpacity={0.4}
            strokeWidth={1}
          />

          {/* Body outline */}
          <path
            d={`
              M ${trCarLeftX} ${trCy - trBodyH + trRoofSlope}
              Q ${(trCarLeftX + trNoseBaseX) / 2} ${trCy - trBodyH - trRoofSlope * 0.5}
                ${trNoseBaseX} ${trCy - trBodyH + trRoofSlope}
              L ${trNoseBaseX} ${trCy + trBodyH}
              L ${trCarLeftX} ${trCy + trBodyH}
              Z
            `}
            fill="none"
            stroke={CREAM}
            strokeOpacity={0.28}
            strokeWidth={1}
          />
          <path
            d={taperFilledPath(trNoseTipX, trNoseBaseX, trCy, trNoseMaxH)}
            fill="none"
            stroke={CREAM}
            strokeOpacity={0.28}
            strokeWidth={1}
          />

          {/* Wheels */}
          {(() => {
            const wY = trCy + trBodyH + 8;
            return (
              <g fill="#050B14">
                <ellipse cx={trCarLeftX + 32} cy={wY} rx={16} ry={5} />
                <ellipse cx={trCarLeftX + 66} cy={wY} rx={16} ry={5} />
                <ellipse cx={trNoseBaseX - 60} cy={wY} rx={16} ry={5} />
                <ellipse cx={trNoseBaseX - 26} cy={wY} rx={16} ry={5} />
              </g>
            );
          })()}
        </g>

        {/* ── SHARED PROFILE OVERLAY ─────────────────────────────── */}
        <g opacity={overlayFade}>
          {/* Trace kingfisher beak taper (upper) */}
          <path
            d={polyToPath(taperUpper(kfBeakTipX, kfBeakBaseX, kfCy, kfBeakMaxH))}
            fill="none"
            stroke={CINNAMON}
            strokeWidth={1.8}
            strokeDasharray="6 5"
            strokeOpacity={0.95}
          />
          <path
            d={polyToPath(taperUpper(kfBeakTipX, kfBeakBaseX, kfCy, kfBeakMaxH)).replace(
              /L/g,
              (_m) => "L",
            )}
            fill="none"
            stroke={CINNAMON}
            strokeWidth={1.8}
            strokeDasharray="6 5"
            strokeOpacity={0}
          />

          {/* Trace train nose taper (upper) */}
          <path
            d={polyToPath(taperUpper(trNoseTipX, trNoseBaseX, trCy, trNoseMaxH))}
            fill="none"
            stroke={CINNAMON}
            strokeWidth={1.8}
            strokeDasharray="6 5"
            strokeOpacity={0.95}
          />

          {/* Connectors between corresponding s-values on both tapers */}
          {[0.2, 0.45, 0.7, 0.92].map((s) => {
            const kx = kfBeakTipX - s * (kfBeakTipX - kfBeakBaseX);
            const ky = kfCy - kfBeakMaxH * taperHalfW(s);
            const tx = trNoseTipX - s * (trNoseTipX - trNoseBaseX);
            const ty = trCy - trNoseMaxH * taperHalfW(s);
            return (
              <g key={`link-${s}`}>
                <circle cx={kx} cy={ky} r={2.6} fill={CINNAMON} />
                <circle cx={tx} cy={ty} r={2.6} fill={CINNAMON} />
                <line
                  x1={kx}
                  y1={ky}
                  x2={tx}
                  y2={ty}
                  stroke={CINNAMON}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
              </g>
            );
          })}

          {/* SHARED PROFILE label plate — between the panels */}
          <g transform={`translate(${FRAME.x + FRAME.w - 336}, ${DIVIDER_Y - 16})`}>
            <rect
              width={306}
              height={30}
              x={0}
              y={-20}
              rx={2}
              fill={INK}
              stroke={CINNAMON}
              strokeWidth={1}
            />
            <text
              x={12}
              y={1}
              fill={CINNAMON}
              fontFamily={inter}
              fontSize={12}
              fontWeight={600}
              letterSpacing={3.6}
            >
              SHARED AERODYNAMIC PROFILE
            </text>
          </g>
        </g>

        {/* Caption strip below the frame */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · BEAK ↔ NOSE · SAME TAPER · Δρ SPREAD OVER LENGTH</text>
          <text x={FRAME.w} textAnchor="end" fill={TURQUOISE} opacity={0.9}>
            TUNNEL BOOM · ELIMINATED
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1000,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: TURQUOISE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 16,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GRAY, margin: "0 4px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>Aerospace Engineer</span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 74,
            lineHeight: 0.98,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The bird that rewrote
          <br />
          the bullet train.
        </div>

        <div
          style={{
            marginTop: 24,
            color: "#C5CDDA",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A common kingfisher enters water without a splash because its dagger
          beak{" "}
          <em
            style={{
              color: TURQUOISE,
              fontStyle: "normal",
              fontWeight: 600,
            }}
          >
            spreads the density jump
          </em>{" "}
          along its length. In 1997, JR-West engineer Eiji Nakatsu copied that
          geometry into the Shinkansen 500 nose — killing the tunnel-boom
          shockwave, cutting electricity draw by 15%, and lifting top speed 10%.
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
        <span>Nakatsu · JR-West · Shinkansen 500 · 1997</span>
        <span>
          <span style={{ color: CINNAMON }}>◆</span> Same nose, two species
        </span>
      </div>
    </AbsoluteFill>
  );
};
