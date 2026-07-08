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
const UMBER = "#0F0A08";
const BARK = "#3A2418";
const CHESTNUT = "#8A4C24";
const OCHRE = "#D9A66A";
const CREAM = "#EBDDBE";
const GRID = "#1B1310";
const GRID_MAJOR = "#241914";
const DIM = "#7A6553";
const REC = "#E85C3A";

// ───────────────────────────────────────────────────────────────────────────
// Deterministic pseudo-random (Remotion needs reproducibility)
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
};

// ───────────────────────────────────────────────────────────────────────────
// Waveform generation
type TrackKind = "call" | "burst" | "mechanical" | "shutter";
type Track = {
  key: string;
  label: string;
  kind: TrackKind;
  live: boolean;
};

const TRACKS: Track[] = [
  { key: "kookaburra", label: "KOOKABURRA", kind: "call", live: false },
  { key: "whipbird", label: "EASTERN WHIPBIRD", kind: "burst", live: false },
  { key: "rosella", label: "CRIMSON ROSELLA", kind: "call", live: true },
  { key: "shutter", label: "CAMERA SHUTTER", kind: "shutter", live: false },
  { key: "chainsaw", label: "CHAINSAW", kind: "mechanical", live: false },
];

const sample = (kind: TrackKind, key: string, u: number): number => {
  const seed = hash(key);
  const pos = u * 12;
  const cellIdx = Math.floor(pos);
  const cellU = pos - cellIdx;
  const cellSeed = hash(key + ":" + cellIdx);
  if (cellSeed < 0.18) return 0;

  let env = 0;
  if (kind === "burst" || kind === "shutter") {
    const width = 0.08 + cellSeed * 0.06;
    if (cellU < width) {
      const x = cellU / width;
      env = Math.pow(1 - x, 2.2);
    }
  } else if (kind === "mechanical") {
    env = 0.55 + 0.3 * Math.sin(cellU * Math.PI);
  } else {
    const width = 0.55 + cellSeed * 0.3;
    if (cellU < width) {
      const x = cellU / width;
      env = Math.sin(Math.pow(x, 0.7) * Math.PI);
    }
  }

  if (env <= 0) return 0;

  const t = u * 1000;
  let carrier = 0;
  if (kind === "call") {
    carrier =
      Math.sin(t * (0.11 + seed * 0.04)) * 0.6 +
      Math.sin(t * (0.24 + seed * 0.06)) * 0.35 +
      Math.sin(t * 0.05) * 0.15;
  } else if (kind === "burst") {
    carrier =
      Math.sin(t * 0.8) * 0.5 +
      Math.sin(t * 1.3 + seed) * 0.4 +
      (hash(key + ":n:" + Math.floor(t * 3)) - 0.5) * 0.8;
  } else if (kind === "mechanical") {
    carrier =
      Math.sin(t * 0.18) * 0.55 +
      Math.sin(t * 0.42) * 0.25 +
      (hash(key + ":m:" + Math.floor(t * 6)) - 0.5) * 1.1;
  } else {
    carrier =
      Math.sin(t * 1.6) * 0.4 +
      (hash(key + ":s:" + Math.floor(t * 8)) - 0.5) * 1.5;
  }

  return Math.max(-1, Math.min(1, env * carrier));
};

const buildWavePath = (
  track: Track,
  x0: number,
  y0: number,
  width: number,
  height: number,
  scroll: number,
  samples: number,
): string => {
  const half = height / 2;
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const px = x0 + (i / samples) * width;
    const u = ((i / samples) * 0.5 + scroll) % 1;
    const a = sample(track.kind, track.key, u);
    const py = y0 + half - a * half * 0.92;
    parts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`);
  }
  return parts.join(" ");
};

// ───────────────────────────────────────────────────────────────────────────
// Lyrebird — bold silhouette in side profile, facing LEFT.
// Rendered as a single dark chestnut fill (body + neck + head + tail base)
// plus the diagnostic lyre-tail as separate cream plumes rising up and back.
// Local origin sits at the bird's feet, on ground line y=0.
// Beak tip is approximately (-98, -78 - singGain*2).
const LyreBird: React.FC<{ singGain: number }> = ({ singGain }) => {
  const beakLift = singGain * 2;
  return (
    <g>
      {/* ─── LYRE TAIL — the diagnostic hero detail ─── */}
      {/* Two cream lyre-plume "harp arms" — thick strokes that curl
          outward and back, framing the fan of filoplumes between them. */}
      <g fill="none" strokeLinecap="round">
        {/* LEFT harp arm — arcs up-and-back, terminating in a subtle inward curl */}
        <path
          d="M 46 -40 C 62 -110, 92 -170, 130 -206 C 144 -218, 154 -216, 150 -200"
          stroke={CREAM}
          strokeWidth={11}
          opacity={0.95}
        />
        {/* soft ochre inner-shadow on left arm */}
        <path
          d="M 46 -40 C 62 -110, 92 -170, 130 -206"
          stroke={OCHRE}
          strokeWidth={3}
          opacity={0.5}
        />

        {/* RIGHT harp arm — arcs further out and higher */}
        <path
          d="M 68 -40 C 108 -110, 174 -158, 234 -178 C 250 -184, 254 -176, 246 -160"
          stroke={CREAM}
          strokeWidth={11}
          opacity={0.95}
        />
        <path
          d="M 68 -40 C 108 -110, 174 -158, 234 -178"
          stroke={OCHRE}
          strokeWidth={3}
          opacity={0.5}
        />
      </g>

      {/* Silvery filoplume filaments between the two arms */}
      <g>
        {Array.from({ length: 28 }).map((_, i) => {
          const t = i / 27;
          const x1 = 48 + t * 20;
          const y1 = -40;
          // Terminate along a smooth arc mid-way between the two harp arms
          const angle = Math.PI * (0.55 - t * 1.05);
          const R = 145 + (hash("r" + i) - 0.5) * 26;
          const x2 = 90 + Math.cos(angle) * R * 0.95;
          const y2 = -50 + Math.sin(angle) * R * 0.95;
          const cx = (x1 + x2) / 2 + (hash("cx" + i) - 0.5) * 20;
          const cy = -110 + (hash("cy" + i) - 0.5) * 25;
          return (
            <path
              key={`fil-${i}`}
              d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
              stroke={CREAM}
              strokeOpacity={0.28 + hash("o" + i) * 0.3}
              strokeWidth={0.9 + hash("w" + i) * 0.7}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </g>

      {/* Two central dark bark-shaft feathers arching up between filaments */}
      <g fill="none" strokeLinecap="round" opacity={0.7}>
        <path
          d="M 52 -40 Q 90 -140 118 -170"
          stroke={BARK}
          strokeWidth={2.4}
        />
        <path
          d="M 62 -40 Q 110 -140 150 -160"
          stroke={BARK}
          strokeWidth={2.4}
        />
      </g>

      {/* ─── BODY SILHOUETTE — single-fill chestnut ─── */}
      {/* Clean continuous outline: top of back → around back → up neck →
          around head → down front of neck → breast → belly → back to tail.
          Facing LEFT. All coordinates in local space (feet on ground y=0). */}
      <g transform={`translate(0 ${-beakLift})`}>
        <path
          d="
            M 82 -22
            C 82 -54, 56 -68, 20 -68
            C -6 -68, -22 -60, -34 -50
            C -46 -56, -60 -58, -70 -58
            C -80 -58, -86 -54, -84 -46
            C -80 -38, -68 -34, -58 -30
            C -46 -22, -32 -10, -14 -6
            C 12 0, 40 2, 60 -2
            C 78 -6, 84 -14, 82 -22 Z
          "
          fill={CHESTNUT}
        />
        {/* Back darker overlay for depth */}
        <path
          d="
            M 76 -28
            C 76 -54, 52 -64, 20 -64
            C 4 -64, -10 -58, -20 -50
            C 4 -46, 30 -42, 52 -38
            C 66 -34, 76 -30, 76 -28 Z
          "
          fill={BARK}
          opacity={0.65}
        />
        {/* Small feather ticks along wing edge */}
        <g stroke={UMBER} strokeWidth={0.9} strokeLinecap="round" opacity={0.6}>
          <path d="M 20 -8 L 14 4" />
          <path d="M 38 -8 L 32 4" />
          <path d="M 54 -10 L 48 2" />
          <path d="M 68 -18 L 62 -6" />
        </g>

        {/* ─── NECK — separate rounded stroke from body up to head ─── */}
        <path
          d="M -46 -46 C -66 -60, -80 -70, -90 -74"
          stroke={CHESTNUT}
          strokeWidth={18}
          strokeLinecap="round"
          fill="none"
        />

        {/* ─── HEAD — small ellipse, positioned at end of neck ─── */}
        <ellipse cx={-100} cy={-76} rx={16} ry={12} fill={CHESTNUT} />
        {/* Head shading */}
        <path
          d="M -110 -84 C -102 -88, -94 -86, -90 -80 C -98 -76, -108 -78, -110 -84 Z"
          fill={BARK}
          opacity={0.85}
        />

        {/* Head crest — small tuft above the eye */}
        <path
          d="M -100 -88 C -96 -100, -88 -100, -86 -88 C -88 -86, -96 -86, -100 -88 Z"
          fill={BARK}
        />

        {/* Eye */}
        <circle cx={-98} cy={-76} r={2.4} fill={CREAM} />
        <circle cx={-99} cy={-76} r={1.3} fill={UMBER} />

        {/* Beak — sharp, distinct triangle, slightly parted */}
        <path
          d="M -114 -76 L -142 -78 L -114 -72 Z"
          fill={UMBER}
        />
        {/* Beak parted-line highlight */}
        <line
          x1={-114}
          y1={-75}
          x2={-140}
          y2={-77}
          stroke={OCHRE}
          strokeWidth={0.5}
          opacity={0.5}
        />
      </g>

      {/* ─── LEGS ─── */}
      <g stroke={UMBER} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d="M -10 -2 L -14 40 L -26 52" />
        <path d="M -10 -2 L -14 40 L -2 52" />
        <path d="M 42 -2 L 46 40 L 58 52" />
        <path d="M 42 -2 L 46 40 L 34 52" />
      </g>

      {/* Ground shadow */}
      <ellipse cx={16} cy={56} rx={90} ry={4.5} fill={UMBER} opacity={0.8} />
    </g>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// Studio condenser mic. Capsule faces RIGHT toward the bird's beak.
// Local origin sits at the base of the capsule.
const Microphone: React.FC<{ pulse: number }> = ({ pulse }) => {
  return (
    <g>
      {/* Shock mount ring (outer) */}
      <circle
        cx={0}
        cy={0}
        r={54}
        fill="none"
        stroke={OCHRE}
        strokeWidth={1.5}
        opacity={0.9}
      />
      {/* Shock mount elastics */}
      {[30, 90, 150, 210, 270, 330].map((a) => {
        const rad = (a * Math.PI) / 180;
        const x1 = Math.cos(rad) * 54;
        const y1 = Math.sin(rad) * 54;
        const x2 = Math.cos(rad) * 26;
        const y2 = Math.sin(rad) * 26;
        return (
          <line
            key={`el-${a}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={OCHRE}
            strokeWidth={1.1}
            opacity={0.55}
          />
        );
      })}

      {/* Capsule housing */}
      <rect
        x={-22}
        y={-30}
        width={44}
        height={60}
        rx={5}
        fill={BARK}
        stroke={OCHRE}
        strokeWidth={1.4}
      />
      {/* Mesh grille horizontal lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <line
          key={`grill-${i}`}
          x1={-18}
          x2={18}
          y1={-26 + i * 5.6}
          y2={-26 + i * 5.6}
          stroke={OCHRE}
          strokeOpacity={0.35}
          strokeWidth={1}
        />
      ))}
      {/* Mesh grille vertical stripe */}
      <line
        x1={0}
        y1={-28}
        x2={0}
        y2={28}
        stroke={OCHRE}
        strokeOpacity={0.55}
        strokeWidth={1.1}
      />
      {/* Label plate */}
      <rect
        x={-11}
        y={34}
        width={22}
        height={7}
        rx={1}
        fill={UMBER}
        stroke={OCHRE}
        strokeWidth={0.8}
      />

      {/* Boom arm going up-and-out toward the ceiling */}
      <line
        x1={0}
        y1={-54}
        x2={-58}
        y2={-120}
        stroke={OCHRE}
        strokeWidth={2}
      />
      <circle cx={-58} cy={-120} r={3.5} fill={OCHRE} />

      {/* REC pill on the capsule */}
      <g transform="translate(-20, -40)">
        <rect
          x={0}
          y={0}
          width={40}
          height={14}
          rx={7}
          fill={UMBER}
          stroke={REC}
          strokeWidth={1.1}
          opacity={0.95}
        />
        <circle
          cx={8}
          cy={7}
          r={3}
          fill={REC}
          opacity={0.5 + pulse * 0.5}
        />
        <text
          x={15}
          y={10}
          fill={REC}
          fontFamily={inter}
          fontSize={8}
          fontWeight={600}
          letterSpacing={2.2}
        >
          REC
        </text>
      </g>
    </g>
  );
};

// ───────────────────────────────────────────────────────────────────────────
export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const scroll = ((frame / (fps * 5)) % 1 + 1) % 1;
  const singGain = Math.max(
    0,
    Math.sin((frame / fps) * 2.4) * 0.6 + 0.4,
  );
  const recPulse = (Math.sin((frame / fps) * 4.4) + 1) / 2;

  const titleSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Layout (1080 × 1350) ──────────────────────────────────────────
  // Top metadata: 56 → 78
  // Panel:        140 → 830
  //   Header:      140 → 184
  //   Session:     184 → 544  (5 tracks × 72)
  //   Stage:       544 → 830
  // Type lockup:  878 → ...
  // Footer:       ~1290
  const PANEL = { x: 60, y: 140, w: 960, h: 690 };
  const HEADER_H = 44;
  const SESSION_H = 360;
  const SESSION = {
    x: PANEL.x,
    y: PANEL.y + HEADER_H,
    w: PANEL.w,
    h: SESSION_H,
  };
  const STAGE = {
    x: PANEL.x,
    y: SESSION.y + SESSION.h,
    w: PANEL.w,
    h: PANEL.h - HEADER_H - SESSION_H,
  };

  // Track region within the session
  const TRACK = {
    x: SESSION.x + 24,
    y: SESSION.y + 30,
    w: SESSION.w - 48,
    h: SESSION.h - 46,
  };

  const N_TRACKS = TRACKS.length;
  const bandH = TRACK.h / N_TRACKS;
  const waveH = bandH * 0.62;

  const PLAY_X = TRACK.x + TRACK.w * 0.62;

  // Stage geometry — bird sits on ground line, mic to its left
  const groundY = STAGE.y + STAGE.h - 40;
  const birdX = STAGE.x + STAGE.w * 0.58;
  const micX = STAGE.x + STAGE.w * 0.22;
  const micCapsuleY = groundY - 175; // capsule height above the ground

  return (
    <AbsoluteFill style={{ backgroundColor: UMBER, fontFamily: inter }}>
      <style>{fontCss}</style>

      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="panel-vignette" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#150E0B" stopOpacity={1} />
            <stop offset="100%" stopColor={UMBER} stopOpacity={1} />
          </radialGradient>

          <pattern
            id="track-grid"
            x={TRACK.x}
            y={TRACK.y}
            width={40}
            height={bandH}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M 40 0 L 0 0 0 ${bandH}`}
              fill="none"
              stroke={GRID}
              strokeWidth={1}
            />
          </pattern>

          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              stitchTiles="stitch"
            />
            <feColorMatrix
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0.07 0"
            />
          </filter>

          <radialGradient id="stage-glow" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor={OCHRE} stopOpacity={0.16} />
            <stop offset="100%" stopColor={OCHRE} stopOpacity={0} />
          </radialGradient>

          <linearGradient id="ground-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#180F0B" stopOpacity={1} />
            <stop offset="100%" stopColor={UMBER} stopOpacity={1} />
          </linearGradient>

          <clipPath id="session-clip">
            <rect
              x={SESSION.x}
              y={SESSION.y}
              width={SESSION.w}
              height={SESSION.h}
            />
          </clipPath>
          <clipPath id="stage-clip">
            <rect
              x={STAGE.x}
              y={STAGE.y}
              width={STAGE.w}
              height={STAGE.h}
            />
          </clipPath>
          <clipPath id="track-clip">
            <rect
              x={TRACK.x}
              y={TRACK.y}
              width={TRACK.w}
              height={TRACK.h}
            />
          </clipPath>
        </defs>

        {/* ── Top metadata band ─────────────────────────────────── */}
        <text
          x={80}
          y={76}
          fill={DIM}
          fontFamily={inter}
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
          fill={OCHRE}
          fontFamily={inter}
          fontSize={13}
          letterSpacing={4.5}
          fontWeight={500}
        >
          2026 · 07 · 08
        </text>

        {/* Panel background */}
        <rect
          x={PANEL.x}
          y={PANEL.y}
          width={PANEL.w}
          height={PANEL.h}
          rx={4}
          fill="url(#panel-vignette)"
        />
        <rect
          x={PANEL.x + 0.5}
          y={PANEL.y + 0.5}
          width={PANEL.w - 1}
          height={PANEL.h - 1}
          rx={4}
          fill="none"
          stroke="#2A1D16"
          strokeWidth={1}
        />

        {/* Corner marks */}
        {(
          [
            [PANEL.x, PANEL.y, 1, 1],
            [PANEL.x + PANEL.w, PANEL.y, -1, 1],
            [PANEL.x, PANEL.y + PANEL.h, 1, -1],
            [PANEL.x + PANEL.w, PANEL.y + PANEL.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={i} stroke={OCHRE} strokeWidth={1.4} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 22} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 22} />
          </g>
        ))}

        {/* Panel header */}
        <rect
          x={PANEL.x}
          y={PANEL.y}
          width={PANEL.w}
          height={HEADER_H}
          fill={BARK}
          opacity={0.55}
        />
        <line
          x1={PANEL.x}
          y1={PANEL.y + HEADER_H}
          x2={PANEL.x + PANEL.w}
          y2={PANEL.y + HEADER_H}
          stroke={GRID_MAJOR}
          strokeWidth={1}
        />
        <text
          x={PANEL.x + 24}
          y={PANEL.y + 28}
          fill={CREAM}
          fontFamily={inter}
          fontWeight={600}
          fontSize={12}
          letterSpacing={4}
        >
          SESSION 003 · MIMICRY MEDLEY
        </text>
        <text
          x={PANEL.x + PANEL.w - 24}
          y={PANEL.y + 28}
          textAnchor="end"
          fill={DIM}
          fontFamily={inter}
          fontWeight={500}
          fontSize={11}
          letterSpacing={3.4}
        >
          48 kHz · TAKE 01 · MENURA NOVAEHOLLANDIAE
        </text>

        {/* ── SESSION region ─────────────────────────────────── */}
        <g clipPath="url(#session-clip)">
          {/* Track grid */}
          <rect
            x={TRACK.x}
            y={TRACK.y}
            width={TRACK.w}
            height={TRACK.h}
            fill="url(#track-grid)"
          />

          {/* Track bands */}
          {TRACKS.map((tr, idx) => {
            const y = TRACK.y + idx * bandH;
            return (
              <g key={`band-${tr.key}`}>
                <rect
                  x={TRACK.x}
                  y={y}
                  width={TRACK.w}
                  height={bandH}
                  fill={idx % 2 === 0 ? "#120C09" : "#0E0806"}
                  opacity={0.6}
                />
                <line
                  x1={TRACK.x}
                  y1={y + bandH}
                  x2={TRACK.x + TRACK.w}
                  y2={y + bandH}
                  stroke={GRID_MAJOR}
                  strokeWidth={1}
                />

                <text
                  x={TRACK.x + 14}
                  y={y + 22}
                  fill={DIM}
                  fontFamily={inter}
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing={3}
                >
                  {String(idx + 1).padStart(2, "0")}
                </text>
                <text
                  x={TRACK.x + 44}
                  y={y + 22}
                  fill={tr.live ? OCHRE : CREAM}
                  fontFamily={inter}
                  fontSize={11}
                  fontWeight={600}
                  letterSpacing={3.4}
                >
                  {tr.label}
                </text>

                {tr.live && (
                  <circle
                    cx={TRACK.x + 6}
                    cy={y + 18}
                    r={3}
                    fill={REC}
                    opacity={0.6 + recPulse * 0.4}
                  />
                )}

                {/* Level meter */}
                <g transform={`translate(${TRACK.x + TRACK.w - 92} ${y + 14})`}>
                  {Array.from({ length: 16 }).map((_, i) => {
                    const level =
                      Math.abs(
                        sample(tr.kind, tr.key, (scroll + i * 0.01) % 1),
                      ) *
                        1.2 -
                      (16 - i) * 0.02;
                    const on = level > 0.08 - i * 0.005;
                    const color =
                      i < 10 ? OCHRE : i < 13 ? "#E8A65C" : REC;
                    return (
                      <rect
                        key={`m-${i}`}
                        x={i * 5}
                        y={0}
                        width={3.4}
                        height={8}
                        fill={on ? color : "#22160F"}
                        opacity={on ? 0.9 : 1}
                      />
                    );
                  })}
                </g>
              </g>
            );
          })}

          {/* Waveforms — clipped to track region so nothing bleeds */}
          <g clipPath="url(#track-clip)">
            {TRACKS.map((tr, idx) => {
              const y = TRACK.y + idx * bandH;
              const yCenter = y + bandH / 2 + 6;
              const wY = yCenter - waveH / 2;
              const path = buildWavePath(
                tr,
                TRACK.x,
                wY,
                TRACK.w,
                waveH,
                scroll,
                240,
              );
              return (
                <g key={`w-${tr.key}`}>
                  <line
                    x1={TRACK.x}
                    y1={yCenter}
                    x2={TRACK.x + TRACK.w}
                    y2={yCenter}
                    stroke={GRID_MAJOR}
                    strokeWidth={1}
                    opacity={0.6}
                  />
                  <path
                    d={path}
                    stroke={tr.live ? CREAM : OCHRE}
                    strokeOpacity={tr.live ? 0.95 : 0.75}
                    strokeWidth={tr.live ? 1.8 : 1.3}
                    fill="none"
                    strokeLinecap="round"
                    filter={tr.live ? "url(#soft-glow)" : undefined}
                  />
                </g>
              );
            })}
          </g>

          {/* Time ruler ticks */}
          {Array.from({ length: 13 }).map((_, i) => {
            const x = TRACK.x + (i / 12) * TRACK.w;
            const isMajor = i % 3 === 0;
            return (
              <g key={`tick-${i}`}>
                <line
                  x1={x}
                  y1={TRACK.y - 4}
                  x2={x}
                  y2={TRACK.y + (isMajor ? -14 : -8)}
                  stroke={DIM}
                  strokeWidth={1}
                />
                {isMajor && (
                  <text
                    x={x}
                    y={TRACK.y - 20}
                    textAnchor="middle"
                    fill={DIM}
                    fontFamily={inter}
                    fontSize={9}
                    letterSpacing={2}
                  >
                    {`00:${String(i * 5).padStart(2, "0")}`}
                  </text>
                )}
              </g>
            );
          })}

          {/* Playhead */}
          <g>
            <line
              x1={PLAY_X}
              y1={TRACK.y - 10}
              x2={PLAY_X}
              y2={TRACK.y + TRACK.h + 4}
              stroke={REC}
              strokeWidth={1.4}
              strokeDasharray="2 4"
              opacity={0.9}
            />
            <polygon
              points={`${PLAY_X - 6},${TRACK.y - 12} ${PLAY_X + 6},${TRACK.y - 12} ${PLAY_X},${TRACK.y - 4}`}
              fill={REC}
            />
          </g>
        </g>

        {/* Session/Stage divider */}
        <line
          x1={PANEL.x}
          y1={STAGE.y}
          x2={PANEL.x + PANEL.w}
          y2={STAGE.y}
          stroke={GRID_MAJOR}
          strokeWidth={1}
        />

        {/* ── STAGE region ───────────────────────────────────── */}
        <g clipPath="url(#stage-clip)">
          {/* Ground fade */}
          <rect
            x={STAGE.x}
            y={STAGE.y}
            width={STAGE.w}
            height={STAGE.h}
            fill="url(#ground-fade)"
          />
          {/* Warm stage glow behind the singer */}
          <ellipse
            cx={birdX}
            cy={groundY - 60}
            rx={220}
            ry={130}
            fill="url(#stage-glow)"
          />

          {/* Ground line */}
          <line
            x1={STAGE.x + 20}
            y1={groundY}
            x2={STAGE.x + STAGE.w - 20}
            y2={groundY}
            stroke={GRID_MAJOR}
            strokeWidth={1}
            strokeDasharray="1 3"
          />


          {/* Sound waves travelling from beak toward the mic capsule.
              Rendered as concentric expanding arcs pinned at the beak tip
              and sweeping outward toward the mic — a visible signal chain. */}
          {(() => {
            // Beak tip in world coords, matching the 1.18× bird scale.
            const scale = 1.18;
            const beakX = birdX + -142 * scale;
            const beakY = groundY + (-78 - singGain * 2) * scale;
            const targetX = micX + 22;
            const targetY = micCapsuleY;
            const midX = (beakX + targetX) / 2;
            const midY = (beakY + targetY) / 2 - 26;
            const arcs: React.ReactNode[] = [];
            const N = 6;
            for (let i = 0; i < N; i++) {
              const t = (scroll * 3 + i / N) % 1;
              const cx = midX;
              const cy = midY - i * 5;
              const d = `M ${beakX} ${beakY} Q ${cx} ${cy} ${targetX} ${targetY}`;
              const op = Math.sin(t * Math.PI) * 0.4;
              arcs.push(
                <path
                  key={`arc-${i}`}
                  d={d}
                  stroke={CREAM}
                  strokeOpacity={op}
                  strokeWidth={0.8 + (1 - i / N) * 1.4}
                  fill="none"
                  strokeLinecap="round"
                />,
              );
            }
            // Speaker "puff" at beak tip
            arcs.push(
              <g key="beak-puff" opacity={0.5 + singGain * 0.4}>
                <circle cx={beakX} cy={beakY} r={4} fill={CREAM} opacity={0.2} />
                <circle cx={beakX - 8} cy={beakY - 2} r={2.5} fill={CREAM} opacity={0.4} />
                <circle cx={beakX - 16} cy={beakY - 5} r={1.6} fill={CREAM} opacity={0.55} />
              </g>,
            );
            return <g>{arcs}</g>;
          })()}

          {/* Bird — anchored so local y=52 (feet) sits on the ground line.
              Scaled up slightly to fill the stage more assertively. */}
          <g
            transform={`translate(${birdX} ${groundY}) scale(1.18) translate(0 -52)`}
          >
            <g transform={`translate(0 ${-singGain * 2})`}>
              <LyreBird singGain={singGain} />
            </g>
          </g>

          {/* Mic */}
          <g transform={`translate(${micX} ${micCapsuleY})`}>
            <Microphone pulse={recPulse} />
          </g>
          {/* Mic stand pole down to a boom base */}
          <line
            x1={micX - 58}
            y1={micCapsuleY - 120}
            x2={micX - 58}
            y2={groundY}
            stroke={OCHRE}
            strokeWidth={2}
            opacity={0.85}
          />
          <line
            x1={micX - 90}
            y1={groundY}
            x2={micX - 26}
            y2={groundY}
            stroke={OCHRE}
            strokeWidth={2.4}
            opacity={0.85}
          />

          {/* Signal cable — mic capsule up over the divider into Track 03 */}
          {(() => {
            const cableStartX = micX;
            const cableStartY = micCapsuleY + 30; // bottom-right of the capsule area
            const trk03Y = TRACK.y + 2 * bandH + bandH / 2 + 6; // Track 03 centre line
            const trk03X = TRACK.x + 6;
            const midX = STAGE.x + 60;
            return (
              <g>
                <path
                  d={`M ${cableStartX} ${cableStartY}
                      C ${cableStartX - 40} ${cableStartY + 40},
                        ${midX} ${STAGE.y + 40},
                        ${midX} ${STAGE.y - 20}
                      L ${midX} ${trk03Y - 40}
                      Q ${midX} ${trk03Y}, ${midX + 20} ${trk03Y}
                      L ${trk03X} ${trk03Y}`}
                  stroke={OCHRE}
                  strokeWidth={1.6}
                  opacity={0.55}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* small connector plug at track edge */}
                <circle cx={trk03X - 4} cy={trk03Y} r={3.2} fill={OCHRE} opacity={0.8} />
              </g>
            );
          })()}

          {/* Bottom captions — anchored in the safe corners under the ground line */}
          <text
            x={STAGE.x + 24}
            y={STAGE.y + STAGE.h - 16}
            fill={DIM}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.4}
            fontWeight={500}
          >
            FIG. 1 · LIVE MIMICRY SESSION
          </text>
          <text
            x={STAGE.x + STAGE.w - 24}
            y={STAGE.y + STAGE.h - 16}
            textAnchor="end"
            fill={OCHRE}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3.4}
            fontWeight={500}
            opacity={0.9}
          >
            ONE SINGER · &gt; 12 SPECIES COPIED
          </text>
        </g>

        {/* Grain overlay */}
        <rect
          x={0}
          y={0}
          width={1080}
          height={1350}
          filter="url(#grain)"
          opacity={0.85}
        />
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 878,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [18, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: OCHRE,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: DIM, margin: "0 6px" }}>/</span>
          <span style={{ color: CREAM, letterSpacing: 5 }}>Foley Artist</span>
        </div>

        <div
          style={{
            color: CREAM,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 82,
            lineHeight: 0.98,
            letterSpacing: -1.4,
            fontStyle: "italic",
          }}
        >
          The forest&rsquo;s
          <br />
          foley artist.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#D9CFC1",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 880,
            opacity: hookOpacity,
          }}
        >
          A male{" "}
          <span style={{ color: OCHRE, fontWeight: 600 }}>
            superb lyrebird
          </span>{" "}
          weaves a dozen other species&rsquo; songs — plus, in some
          populations, camera shutters and chainsaws — into one continuous
          medley. The copies are so accurate that in playback trials the
          mimicked birds respond as if to their own kind.
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
          color: DIM,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Dalziell &amp; Magrath · Animal Behaviour 83 (2012) 1401–1410</span>
        <span>
          <span style={{ color: REC }}>●</span> Track armed &middot; Live
        </span>
      </div>

      <div style={{ display: "none" }}>{durationInFrames}</div>
    </AbsoluteFill>
  );
};
