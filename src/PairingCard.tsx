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

// ── Palette (from concept brief) ─────────────────────────────────────────
const INK = "#06213B";      // deep marine substrate
const CYAN = "#1CB4D9";     // kingfisher electric back
const TEAL = "#0F6E92";     // shadow / crown
const CHESTNUT = "#E86A2F"; // breast, rivet accent
const IVORY = "#F0E6D2";    // ivory throat / Shinkansen body / paper

const INK_2 = "#0A2C4B";
const GRID_LINE = "#0F3557";
const RULE = "#204B70";
const GHOST = "#8AA5BC";
const DEEP = "#031628";

// ── Layout ──────────────────────────────────────────────────────────────
const W = 1080;
const H = 1350;
const MARGIN = 80;
const DIAGRAM_TOP = 190;
const DIAGRAM_BOTTOM = 880;
const SHARED_AXIS_Y = 620;
const TIP_X = 880;
const TIP_Y = SHARED_AXIS_Y;

// ── Kingfisher (compact head, upper-left; long beak diagonal to tip) ─────
// Bird head geometry
const KF_HEAD_CX = 320;
const KF_HEAD_CY = 355;
const KF_HEAD_RX = 96;
const KF_HEAD_RY = 82;

// Beak base — where it emerges from the head (right side of head, angled down)
// The beak is a wedge with two edges meeting at TIP.
const KF_BEAK_UPPER = { x: 388, y: 345 };
const KF_BEAK_LOWER = { x: 380, y: 400 };

// Eye
const KF_EYE_CX = 288;
const KF_EYE_CY = 335;

// ── Shinkansen (compact body, lower-left; long nose diagonal to tip) ─────
// The cabin body sits from x ≈ 100 to x ≈ 500, at y ≈ 700..830.
// The nose then tapers from the cabin's right edge UP to TIP.
const SHINK_BODY_LEFT = 100;
const SHINK_BODY_TOP = 715;
const SHINK_BODY_BOT = 830;
const SHINK_CABIN_RIGHT = 500;

// ── Isobars fanning from shared tip ─────────────────────────────────────
const ISOBARS = [
  { rx: 55, ry: 30, op: 0.85, delay: 0.55 },
  { rx: 110, ry: 60, op: 0.55, delay: 0.62 },
  { rx: 175, ry: 96, op: 0.38, delay: 0.7 },
  { rx: 250, ry: 140, op: 0.24, delay: 0.78 },
  { rx: 340, ry: 195, op: 0.14, delay: 0.86 },
];

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bird plunges in from upper-left along a spring
  const birdSpring = spring({
    frame: frame - fps * 0.1,
    fps,
    config: { damping: 22, mass: 1.1, stiffness: 90 },
  });
  const birdTx = interpolate(birdSpring, [0, 1], [-160, 0]);
  const birdTy = interpolate(birdSpring, [0, 1], [-140, 0]);
  const birdOpacity = interpolate(frame, [fps * 0.05, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Train slides in from left
  const trainSpring = spring({
    frame: frame - fps * 0.7,
    fps,
    config: { damping: 30, mass: 1.4, stiffness: 70 },
  });
  const trainTx = interpolate(trainSpring, [0, 1], [-360, 0]);
  const trainOpacity = interpolate(frame, [fps * 0.7, fps * 1.1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Isobars fan
  const isobarProgress = interpolate(
    frame,
    [fps * 1.3, fps * 2.2],
    [0, 1],
    { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Text
  const titleSpring = spring({
    frame: frame - fps * 1.2,
    fps,
    config: { damping: 200, mass: 0.9 },
  });
  const hookOpacity = interpolate(frame, [fps * 1.8, fps * 2.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelOpacity = interpolate(frame, [fps * 2.0, fps * 2.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Bird body/wing (compact shape trailing behind head) ────────────────
  // A rounded lozenge body sitting behind the head; wing patch on top.
  const bodyPath =
    `M ${KF_HEAD_CX - 20} ${KF_HEAD_CY + 40} ` +
    `C ${KF_HEAD_CX - 190} ${KF_HEAD_CY + 30}, ` +
    `${KF_HEAD_CX - 220} ${KF_HEAD_CY + 155}, ` +
    `${KF_HEAD_CX - 60} ${KF_HEAD_CY + 165} ` +
    `Q ${KF_HEAD_CX + 30} ${KF_HEAD_CY + 155} ` +
    `${KF_HEAD_CX + 55} ${KF_HEAD_CY + 90} Z`;

  const wingPath =
    `M ${KF_HEAD_CX - 150} ${KF_HEAD_CY + 55} ` +
    `Q ${KF_HEAD_CX - 205} ${KF_HEAD_CY + 105}, ` +
    `${KF_HEAD_CX - 105} ${KF_HEAD_CY + 155} ` +
    `Q ${KF_HEAD_CX - 30} ${KF_HEAD_CY + 145}, ` +
    `${KF_HEAD_CX + 15} ${KF_HEAD_CY + 90} ` +
    `Q ${KF_HEAD_CX - 55} ${KF_HEAD_CY + 45}, ${KF_HEAD_CX - 150} ${KF_HEAD_CY + 55} Z`;

  // Breast: a narrow chestnut wedge tucked below the throat — kept small so it never
  // spills past the wing outline.
  const breastPath =
    `M ${KF_HEAD_CX + 20} ${KF_HEAD_CY + 60} ` +
    `Q ${KF_HEAD_CX + 6} ${KF_HEAD_CY + 88}, ` +
    `${KF_HEAD_CX + 20} ${KF_HEAD_CY + 108} ` +
    `Q ${KF_HEAD_CX + 40} ${KF_HEAD_CY + 104}, ` +
    `${KF_HEAD_CX + 52} ${KF_HEAD_CY + 78} Z`;

  const throatPath =
    `M ${KF_HEAD_CX + 55} ${KF_HEAD_CY + 6} ` +
    `Q ${KF_HEAD_CX + 80} ${KF_HEAD_CY + 55}, ${KF_HEAD_CX + 55} ${KF_HEAD_CY + 90} ` +
    `Q ${KF_HEAD_CX + 10} ${KF_HEAD_CY + 75}, ${KF_HEAD_CX - 4} ${KF_HEAD_CY + 30} ` +
    `Q ${KF_HEAD_CX + 22} ${KF_HEAD_CY + 8}, ${KF_HEAD_CX + 55} ${KF_HEAD_CY + 6} Z`;

  // Beak — straight tapered dagger from base wedge (upper/lower) to tip
  const beakFill =
    `M ${KF_BEAK_UPPER.x} ${KF_BEAK_UPPER.y} ` +
    `L ${TIP_X} ${TIP_Y} ` +
    `L ${KF_BEAK_LOWER.x} ${KF_BEAK_LOWER.y} Z`;

  // Small subtle arc for upper-mandible cusp (kingfisher upper beak is nearly straight)
  const beakUpperEdge =
    `M ${KF_BEAK_UPPER.x} ${KF_BEAK_UPPER.y} ` +
    `Q ${(KF_BEAK_UPPER.x + TIP_X) / 2} ${(KF_BEAK_UPPER.y + TIP_Y) / 2 - 6} ` +
    `${TIP_X} ${TIP_Y}`;

  const beakLowerEdge =
    `M ${KF_BEAK_LOWER.x} ${KF_BEAK_LOWER.y} ` +
    `L ${TIP_X} ${TIP_Y}`;

  // Beak seam (mandible divide) — a line running mid-beak
  const beakSeam =
    `M ${(KF_BEAK_UPPER.x + KF_BEAK_LOWER.x) / 2 + 4} ${(KF_BEAK_UPPER.y + KF_BEAK_LOWER.y) / 2} ` +
    `L ${TIP_X - 2} ${TIP_Y}`;

  // ── Shinkansen 500 nose (side view; long taper up to TIP) ──────────────
  // Top edge of body sweeps up from cabin top to tip.
  // Bottom edge of body sweeps up from cabin bottom to tip.
  // Undercarriage rectangle below.
  const trainTop = SHINK_BODY_TOP;
  const trainBot = SHINK_BODY_BOT;

  // Nose curves converge sharply at the tip so the point reads clean.
  const trainFill =
    `M ${SHINK_BODY_LEFT} ${trainTop} ` +
    `L ${SHINK_CABIN_RIGHT} ${trainTop} ` +
    // Top edge — cubic curve sweeping up-right to tip
    `C ${SHINK_CABIN_RIGHT + 150} ${trainTop + 4}, ` +
    `${TIP_X - 40} ${TIP_Y - 2}, ` +
    `${TIP_X} ${TIP_Y} ` +
    // Bottom edge — cubic curve sweeping down-back to cabin bottom
    `C ${TIP_X - 40} ${TIP_Y + 8}, ` +
    `${SHINK_CABIN_RIGHT + 150} ${trainBot - 4}, ` +
    `${SHINK_CABIN_RIGHT} ${trainBot} ` +
    `L ${SHINK_BODY_LEFT} ${trainBot} Z`;

  // Under-skirt
  const trainSkirt =
    `M ${SHINK_BODY_LEFT} ${trainBot} ` +
    `L ${SHINK_CABIN_RIGHT + 60} ${trainBot} ` +
    `L ${SHINK_CABIN_RIGHT + 40} ${trainBot + 22} ` +
    `L ${SHINK_BODY_LEFT} ${trainBot + 22} Z`;

  // Cyan livery stripe — follows a mid-belt down the body & nose
  const trainStripe =
    `M ${SHINK_BODY_LEFT} ${trainTop + 62} ` +
    `L ${SHINK_CABIN_RIGHT} ${trainTop + 62} ` +
    `C ${SHINK_CABIN_RIGHT + 150} ${trainTop + 62}, ` +
    `${TIP_X - 60} ${TIP_Y + 8}, ` +
    `${TIP_X - 14} ${TIP_Y + 4} ` +
    `L ${TIP_X - 14} ${TIP_Y + 12} ` +
    `C ${TIP_X - 60} ${TIP_Y + 16}, ` +
    `${SHINK_CABIN_RIGHT + 150} ${trainTop + 80}, ` +
    `${SHINK_CABIN_RIGHT} ${trainTop + 80} ` +
    `L ${SHINK_BODY_LEFT} ${trainTop + 80} Z`;

  // Cabin windows (only on the flat cabin section)
  const windows = [];
  const winCount = 3;
  const winW = 46;
  const winH = 20;
  const winY = trainTop + 30;
  for (let i = 0; i < winCount; i++) {
    const x = SHINK_BODY_LEFT + 44 + i * (winW + 40);
    windows.push({ x, y: winY, w: winW, h: winH });
  }

  // Cockpit window — a small ellipse near the front of the cabin
  const cockpit = { cx: SHINK_CABIN_RIGHT - 20, cy: trainTop + 40, rx: 40, ry: 18 };

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
          <radialGradient id="bg-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor={INK_2} stopOpacity={1} />
            <stop offset="100%" stopColor={INK} stopOpacity={1} />
          </radialGradient>

          <linearGradient id="beak-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2A1210" />
            <stop offset="0.55" stopColor="#150708" />
            <stop offset="1" stopColor="#050203" />
          </linearGradient>

          <linearGradient id="crown-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={CYAN} />
            <stop offset="1" stopColor={TEAL} />
          </linearGradient>

          <linearGradient id="body-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TEAL} />
            <stop offset="1" stopColor="#083250" />
          </linearGradient>

          <linearGradient id="rail-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F7EFDF" />
            <stop offset="1" stopColor="#D9CFB7" />
          </linearGradient>
        </defs>

        {/* full-page vignette */}
        <rect x={0} y={0} width={W} height={H} fill="url(#bg-vignette)" />

        {/* Diagram-band grid */}
        <g opacity={0.5}>
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={`gv-${i}`}
              x1={MARGIN + i * 40}
              y1={DIAGRAM_TOP}
              x2={MARGIN + i * 40}
              y2={DIAGRAM_BOTTOM}
              stroke={GRID_LINE}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 18 }).map((_, i) => (
            <line
              key={`gh-${i}`}
              x1={MARGIN}
              y1={DIAGRAM_TOP + i * 40}
              x2={W - MARGIN}
              y2={DIAGRAM_TOP + i * 40}
              stroke={GRID_LINE}
              strokeWidth={1}
            />
          ))}
        </g>

        {/* Shared centerline axis — the "argument" */}
        <g opacity={0.65}>
          <line
            x1={MARGIN}
            y1={SHARED_AXIS_Y}
            x2={W - MARGIN - 20}
            y2={SHARED_AXIS_Y}
            stroke={RULE}
            strokeWidth={1}
            strokeDasharray="6 6"
          />
          {/* left-edge tick */}
          <line
            x1={MARGIN}
            y1={SHARED_AXIS_Y - 8}
            x2={MARGIN}
            y2={SHARED_AXIS_Y + 8}
            stroke={RULE}
            strokeWidth={1.4}
          />
          <text
            x={MARGIN}
            y={SHARED_AXIS_Y - 14}
            fill={GHOST}
            fontFamily={inter}
            fontSize={10}
            fontWeight={500}
            letterSpacing={2.6}
          >
            SHARED AXIS
          </text>
        </g>

        {/* ── SHINKANSEN (lower-left, slides in) ────────────────────── */}
        <g transform={`translate(${trainTx}, 0)`} opacity={trainOpacity}>
          {/* undercarriage */}
          <path d={trainSkirt} fill={DEEP} />
          {/* main body */}
          <path d={trainFill} fill="url(#rail-grad)" />
          {/* outline */}
          <path
            d={trainFill}
            fill="none"
            stroke="#B7AC93"
            strokeWidth={1.2}
            opacity={0.7}
          />
          {/* stripe */}
          <path d={trainStripe} fill={CYAN} opacity={0.95} />
          {/* windows */}
          {windows.map((w, i) => (
            <rect
              key={`win-${i}`}
              x={w.x}
              y={w.y}
              width={w.w}
              height={w.h}
              rx={3}
              fill={INK}
              opacity={0.9}
            />
          ))}
          {/* cockpit window */}
          <ellipse
            cx={cockpit.cx}
            cy={cockpit.cy}
            rx={cockpit.rx}
            ry={cockpit.ry}
            fill={INK}
            opacity={0.85}
          />
          {/* nose seam (top) — thin teal accent to echo bird crown */}
          <path
            d={`M ${SHINK_CABIN_RIGHT} ${trainTop} C ${SHINK_CABIN_RIGHT + 150} ${trainTop + 4}, ${TIP_X - 40} ${TIP_Y - 2}, ${TIP_X} ${TIP_Y}`}
            fill="none"
            stroke={TEAL}
            strokeWidth={1.6}
            opacity={0.75}
          />
          {/* headlamp near tip */}
          <circle cx={TIP_X - 105} cy={TIP_Y + 22} r={5} fill={CHESTNUT} />
        </g>

        {/* ── KINGFISHER (upper-left, plunges in) ───────────────────── */}
        <g
          transform={`translate(${birdTx}, ${birdTy})`}
          opacity={birdOpacity}
        >
          {/* body base — teal underparts */}
          <path d={bodyPath} fill="url(#body-grad)" />
          {/* chestnut breast */}
          <path d={breastPath} fill={CHESTNUT} opacity={0.95} />
          {/* ivory throat/collar */}
          <path d={throatPath} fill={IVORY} opacity={0.95} />
          {/* wing — bright cyan */}
          <path d={wingPath} fill={CYAN} opacity={0.92} />
          {/* wing highlight — a subtle scalloped line */}
          <path
            d={`M ${KF_HEAD_CX - 130} ${KF_HEAD_CY + 78} Q ${KF_HEAD_CX - 165} ${KF_HEAD_CY + 115}, ${KF_HEAD_CX - 90} ${KF_HEAD_CY + 138}`}
            stroke="#7CDCF2"
            strokeWidth={2}
            fill="none"
            opacity={0.75}
          />

          {/* head */}
          <ellipse
            cx={KF_HEAD_CX}
            cy={KF_HEAD_CY}
            rx={KF_HEAD_RX}
            ry={KF_HEAD_RY}
            fill="url(#crown-grad)"
          />
          {/* crown speckle */}
          {Array.from({ length: 20 }).map((_, i) => {
            const a = (i * 137.508) % 360;
            const rr = 18 + ((i * 13) % 50);
            const x = KF_HEAD_CX + Math.cos((a * Math.PI) / 180) * rr;
            const y = KF_HEAD_CY - 22 + Math.sin((a * Math.PI) / 180) * (rr * 0.5);
            return <circle key={`spk-${i}`} cx={x} cy={y} r={1.5} fill={INK} opacity={0.35} />;
          })}

          {/* ivory cheek behind eye */}
          <ellipse
            cx={KF_HEAD_CX + 42}
            cy={KF_HEAD_CY - 6}
            rx={26}
            ry={18}
            fill={IVORY}
            opacity={0.9}
          />

          {/* eye */}
          <circle cx={KF_EYE_CX} cy={KF_EYE_CY} r={9} fill={INK} />
          <circle cx={KF_EYE_CX - 2} cy={KF_EYE_CY - 3} r={2.6} fill={IVORY} />

          {/* BEAK — straight tapered dagger from head down-right to tip */}
          <path d={beakFill} fill="url(#beak-grad)" />
          {/* upper edge subtle curve */}
          <path
            d={beakUpperEdge}
            fill="none"
            stroke="#050203"
            strokeWidth={1.2}
            opacity={0.9}
          />
          {/* lower edge */}
          <path
            d={beakLowerEdge}
            fill="none"
            stroke="#050203"
            strokeWidth={1.2}
            opacity={0.9}
          />
          {/* seam */}
          <path
            d={beakSeam}
            fill="none"
            stroke={CHESTNUT}
            strokeWidth={1}
            opacity={0.4}
          />
        </g>

        {/* Isobars (pressure gradient) fanning from tip — front layer */}
        <g>
          {ISOBARS.map((iso, i) => {
            const local = (isobarProgress - iso.delay) / 0.4;
            const t = Math.max(0, Math.min(1, local));
            const drawOp = iso.op * t;
            const rx = iso.rx * (0.6 + 0.4 * t);
            const ry = iso.ry * (0.6 + 0.4 * t);
            return (
              <ellipse
                key={`iso-${i}`}
                cx={TIP_X}
                cy={TIP_Y}
                rx={rx}
                ry={ry}
                fill="none"
                stroke={CHESTNUT}
                strokeWidth={1.2}
                opacity={drawOp}
              />
            );
          })}
          <circle cx={TIP_X} cy={TIP_Y} r={4} fill={CHESTNUT} />
          <circle cx={TIP_X} cy={TIP_Y} r={9} fill="none" stroke={CHESTNUT} strokeWidth={1} opacity={0.85} />
        </g>

        {/* ── Metadata band (top) ───────────────────────────────── */}
        <g>
          <text
            x={MARGIN}
            y={100}
            fill={GHOST}
            fontFamily={inter}
            fontSize={13}
            fontWeight={500}
            letterSpacing={5}
          >
            EVERYDAY MOTIVATION · NO. 003
          </text>
          <text
            x={W - MARGIN}
            y={100}
            textAnchor="end"
            fill={CYAN}
            fontFamily={inter}
            fontSize={13}
            fontWeight={600}
            letterSpacing={5}
          >
            2026 · 09 · 16
          </text>
          <line
            x1={MARGIN}
            y1={120}
            x2={W - MARGIN}
            y2={120}
            stroke={RULE}
            strokeWidth={1}
          />
        </g>

        {/* ── Callouts ──────────────────────────────────────────── */}
        <g opacity={labelOpacity}>
          {/* Bird callout — placed in empty top-right, leader into crown */}
          <line
            x1={KF_HEAD_CX + 60}
            y1={KF_HEAD_CY - 60}
            x2={630}
            y2={230}
            stroke={CYAN}
            strokeWidth={1}
            opacity={0.7}
          />
          <line
            x1={630}
            y1={230}
            x2={W - MARGIN - 40}
            y2={230}
            stroke={CYAN}
            strokeWidth={1}
            opacity={0.7}
          />
          <text
            x={W - MARGIN}
            y={224}
            textAnchor="end"
            fill={CYAN}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3.6}
          >
            FIG. A · ALCEDO ATTHIS
          </text>
          <text
            x={W - MARGIN}
            y={244}
            textAnchor="end"
            fill={GHOST}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            COMMON KINGFISHER · BEAK PROFILE
          </text>

          {/* Train callout — anchored above the flat cabin roof (well clear of nose curve) */}
          <line
            x1={SHINK_BODY_LEFT + 100}
            y1={trainTop - 6}
            x2={SHINK_BODY_LEFT + 100}
            y2={676}
            stroke={CHESTNUT}
            strokeWidth={1}
            opacity={0.75}
          />
          <text
            x={SHINK_BODY_LEFT + 110}
            y={672}
            fill={CHESTNUT}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3.6}
          >
            FIG. B · SHINKANSEN 500
          </text>
          <text
            x={SHINK_BODY_LEFT + 110}
            y={690}
            fill={GHOST}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            JR WEST · 1997 · 15 M NOSE
          </text>

          {/* Tip annotation — in the right column above the tip, aligned to the bird row */}
          <line
            x1={TIP_X + 6}
            y1={TIP_Y - 6}
            x2={TIP_X + 60}
            y2={TIP_Y - 130}
            stroke={CHESTNUT}
            strokeWidth={1}
            opacity={0.85}
          />
          <line
            x1={TIP_X + 60}
            y1={TIP_Y - 130}
            x2={W - MARGIN - 40}
            y2={TIP_Y - 130}
            stroke={CHESTNUT}
            strokeWidth={1}
            opacity={0.85}
          />
          <text
            x={W - MARGIN}
            y={TIP_Y - 134}
            textAnchor="end"
            fill={CHESTNUT}
            fontFamily={inter}
            fontSize={12}
            fontWeight={600}
            letterSpacing={3.6}
          >
            SHARED PROFILE TIP
          </text>
          <text
            x={W - MARGIN}
            y={TIP_Y - 116}
            textAnchor="end"
            fill={GHOST}
            fontFamily={inter}
            fontSize={11}
            fontWeight={500}
            letterSpacing={3}
          >
            Δp ≈ 0 · NO SPLASH · NO BOOM
          </text>
        </g>

        {/* Divider between diagram and type */}
        <line
          x1={MARGIN}
          y1={905}
          x2={W - MARGIN}
          y2={905}
          stroke={RULE}
          strokeWidth={1}
        />
      </svg>

      {/* ── Type lockup ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          top: 930,
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            color: CYAN,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 18,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: GHOST, margin: "0 6px" }}>/</span>
          <span style={{ color: "#EDEDEF", letterSpacing: 5 }}>
            Aerospace Engineer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 80,
            lineHeight: 0.96,
            letterSpacing: -1.2,
            fontStyle: "italic",
          }}
        >
          The bird who solved
          <br />
          the bullet train.
        </div>

        <div
          style={{
            marginTop: 26,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 18,
            lineHeight: 1.44,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          When JR West's 500-series Shinkansen kept punching tunnel-boom shockwaves through
          Japan's noise limits, engineer{" "}
          <span style={{ color: CYAN, fontWeight: 600 }}>Eiji Nakatsu</span> rebuilt the
          15-metre nose in the exact tapered profile of a{" "}
          <span style={{ color: CHESTNUT, fontWeight: 600 }}>
            common kingfisher's beak
          </span>{" "}
          — the geometry that lets the bird enter water without a splash. The boom
          vanished, electricity draw fell 15 %, and top speed rose 10 %.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          right: MARGIN,
          bottom: 46,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          color: GHOST,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Nakatsu · JR West · Shinkansen 500 · 1997</span>
        <span>
          <span style={{ color: CHESTNUT }}>●</span> Kingfisher × Bullet train
        </span>
      </div>
    </AbsoluteFill>
  );
};
