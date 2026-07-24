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

// Palette — drawn from Photinus pyralis coloration and night-meadow substrate
const NIGHT = "#080B12";
const NIGHT_MID = "#10151E";
const FLASH = "#C6E24A";
const FLASH_GLOW = "#F0F6B4";
const EMBER = "#E48A2E";
const CREAM = "#EDE7D2";
const GRAY = "#7C818C";
const GRID = "#141A26";
const GRID_MAJOR = "#1B2130";

// Frame (drafting-panel) rect
const FRAME = { x: 60, y: 130, w: 960, h: 740 };

// Deterministic pseudo-random from string seed — used for placing background stars
const hashSeed = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619;
  }
  return ((h >>> 0) % 10000) / 10000;
};

// Scattered pinpoint stars, gently varied opacities — additive dust in the field
const STARS = Array.from({ length: 60 }).map((_, i) => {
  const rx = hashSeed(`x${i}`);
  const ry = hashSeed(`y${i}`);
  const rop = hashSeed(`o${i}`);
  return {
    x: FRAME.x + 30 + rx * (FRAME.w - 60),
    y: FRAME.y + 30 + ry * (FRAME.h - 60),
    r: 0.5 + rop * 0.9,
    op: 0.06 + rop * 0.16,
  };
});

// J-arc geometry (panel-local, expressed inside the SVG viewBox 0..1080).
// This is the male Photinus pyralis flash trace: a low horizontal hook that
// curls upward into an ascending vertical stroke. Curve is one single
// smooth cubic bezier so we can stroke-dash it with a stable length.
const J_START = { x: 388, y: 720 };
const J_C1 = { x: 470, y: 780 };
const J_C2 = { x: 610, y: 780 };
const J_MID = { x: 610, y: 620 };
const J_TOP = { x: 540, y: 260 };
const J_PATH =
  `M ${J_START.x} ${J_START.y}` +
  ` C ${J_C1.x} ${J_C1.y}, ${J_C2.x} ${J_C2.y}, ${J_MID.x} ${J_MID.y}` +
  ` L ${J_TOP.x} ${J_TOP.y}`;
// Approx path length (used for stroke-dash animation). Slightly overshoot
// to guarantee the dash fully clears.
const J_LEN = 700;

// Cipher annotations placed to the right of the arc.
// Each has an anchor point ON the arc — the leader-line origin — so the
// callouts read like proper observation notes rather than floating tick marks.
const ANNOTATIONS = [
  { anchorX: 540, anchorY: 260, x: 720, y: 268, text: "0.5  S    PULSE" },
  { anchorX: 573, anchorY: 500, x: 720, y: 500, text: "λ  ≈  560  NM" },
  { anchorX: 605, anchorY: 720, x: 720, y: 720, text: "5.5  S    INTERVAL" },
];

// Left-side "prior cycle" echo — a dimmer J traced ~5.5 s earlier.
// Positioned to the left; scaled down slightly to feel like an afterimage.
const ECHO_PATH =
  `M 168 720` +
  ` C 232 770, 340 770, 340 620` +
  ` L 290 300`;
const ECHO_LEN = 620;

// Female-answer bloom position (down-right, on the "ground" line)
const ANSWER = { x: 830, y: 810 };

export const FireflyCryptographer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline (30 fps, 165 frames total = 5.5 s — matches the real flash interval)
  // f = frames
  //  0..12  : field/notebook forms in
  //  12..75 : J-arc traces upward, glow grows along it
  //  75..90 : peak flash bloom at the top of the arc (~0.5 s pulse)
  //  90..120: arc holds, glow eases slightly
  //  120..150: female "answer" bloom below-right (~2 s after male peak)
  //  150..165: rest before loop
  const arcT = interpolate(frame, [12, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const peakBloom = interpolate(
    frame,
    [65, 82, 105, 135],
    [0, 1, 0.55, 0.35],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );

  const answerBloom = interpolate(
    frame,
    [118, 132, 148, 162],
    [0, 1, 0.7, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  const annotOpacity = interpolate(frame, [55, 95], [0, 0.75], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.85 },
  });

  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.8], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dashOffset = J_LEN * (1 - arcT);

  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT, fontFamily: inter }}>
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
        <span style={{ color: FLASH }}>2026 · 07 · 24</span>
      </div>

      {/* Main observation panel */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <pattern
            id="grid"
            x={FRAME.x}
            y={FRAME.y}
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
            x={FRAME.x}
            y={FRAME.y}
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

          <radialGradient id="panel-vignette" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor={NIGHT_MID} stopOpacity={1} />
            <stop offset="100%" stopColor={NIGHT} stopOpacity={1} />
          </radialGradient>

          <radialGradient id="firefly-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH_GLOW} stopOpacity={0.95} />
            <stop offset="40%" stopColor={FLASH} stopOpacity={0.55} />
            <stop offset="100%" stopColor={FLASH} stopOpacity={0} />
          </radialGradient>

          <radialGradient id="answer-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={FLASH_GLOW} stopOpacity={0.85} />
            <stop offset="100%" stopColor={FLASH} stopOpacity={0} />
          </radialGradient>

          <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="wide-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {/* Panel background */}
        <rect
          x={FRAME.x}
          y={FRAME.y}
          width={FRAME.w}
          height={FRAME.h}
          fill="url(#panel-vignette)"
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

        {/* Inner thin border */}
        <rect
          x={FRAME.x + 0.5}
          y={FRAME.y + 0.5}
          width={FRAME.w - 1}
          height={FRAME.h - 1}
          fill="none"
          stroke="#1E2432"
          strokeWidth={1}
        />

        {/* Scattered field stars */}
        {STARS.map((s, i) => (
          <circle
            key={`star-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={CREAM}
            opacity={s.op}
          />
        ))}

        {/* Horizon line — thin ruled baseline at y=820 across the panel.
            Doubles as anchor for the female-answer bloom leader. */}
        <line
          x1={FRAME.x + 40}
          y1={820}
          x2={FRAME.x + FRAME.w - 40}
          y2={820}
          stroke={GRID_MAJOR}
          strokeWidth={1}
        />
        {/* horizon micro-ticks — every 120 px, plus a longer center tick */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = FRAME.x + 60 + i * ((FRAME.w - 120) / 8);
          const isMajor = i === 4;
          return (
            <line
              key={`tick-${i}`}
              x1={x}
              y1={820}
              x2={x}
              y2={isMajor ? 828 : 824}
              stroke={GRID_MAJOR}
              strokeWidth={1}
            />
          );
        })}
        {/* horizon label — anchors the ground line as "0" reference */}
        <text
          x={FRAME.x + 44}
          y={815}
          fill={GRAY}
          fontFamily={inter}
          fontSize={10}
          fontWeight={500}
          letterSpacing={2.6}
          opacity={0.55}
        >
          H₀
        </text>

        {/* Corner crop marks (ember) */}
        {(
          [
            [FRAME.x, FRAME.y, 1, 1],
            [FRAME.x + FRAME.w, FRAME.y, -1, 1],
            [FRAME.x, FRAME.y + FRAME.h, 1, -1],
            [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1],
          ] as const
        ).map(([cx, cy, sx, sy], i) => (
          <g key={`crop-${i}`} stroke={EMBER} strokeWidth={1.5} fill="none">
            <line x1={cx} y1={cy} x2={cx + sx * 26} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + sy * 26} />
          </g>
        ))}

        {/* Panel label — top-left */}
        <g
          transform={`translate(${FRAME.x + 26}, ${FRAME.y + 34})`}
          fill={GRAY}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text>FIELD  ·  22:41 EDT  ·  JULY</text>
        </g>

        {/* Panel spec — top-right */}
        <g
          transform={`translate(${FRAME.x + FRAME.w - 26}, ${FRAME.y + 34})`}
          fill={EMBER}
          fontFamily={inter}
          fontWeight={600}
          fontSize={11}
          letterSpacing={3.5}
        >
          <text textAnchor="end">SP.  PHOTINUS PYRALIS</text>
        </g>

        {/* Prior-cycle echo — the previous J-arc, faded, drawn to the left.
            Visually argues "this is repeated at 5.5-s intervals" and breaks
            the composition's symmetry so the main J becomes the focal beat.
            Dimmed further so it clearly sits behind the current pulse. */}
        <g opacity={0.30 * arcT}>
          <path
            d={ECHO_PATH}
            stroke={FLASH}
            strokeWidth={5}
            strokeOpacity={0.18}
            fill="none"
            strokeLinecap="round"
            filter="url(#wide-glow)"
          />
          <path
            d={ECHO_PATH}
            stroke={FLASH}
            strokeWidth={1.6}
            strokeOpacity={0.55}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={ECHO_PATH}
            stroke={GRAY}
            strokeWidth={1}
            fill="none"
            strokeDasharray="2 6"
            strokeOpacity={0.32}
          />
          {/* echo interval marker */}
          <text
            x={254}
            y={790}
            textAnchor="middle"
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            fontWeight={600}
            letterSpacing={3.5}
            opacity={0.9}
          >
            t  −  5.5 s
          </text>
        </g>

        {/* ── J-arc: layered glow, then core, then hot core ────────────── */}
        {/* Outer wide diffuse glow */}
        <path
          d={J_PATH}
          stroke={FLASH}
          strokeWidth={30}
          strokeOpacity={0.12 * arcT}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={J_LEN}
          strokeDashoffset={dashOffset}
          filter="url(#wide-glow)"
        />
        {/* Mid glow */}
        <path
          d={J_PATH}
          stroke={FLASH}
          strokeWidth={14}
          strokeOpacity={0.35 * arcT}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={J_LEN}
          strokeDashoffset={dashOffset}
          filter="url(#soft-glow)"
        />
        {/* Core */}
        <path
          d={J_PATH}
          stroke={FLASH}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={J_LEN}
          strokeDashoffset={dashOffset}
        />
        {/* Hot inner */}
        <path
          d={J_PATH}
          stroke={FLASH_GLOW}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeOpacity={0.9}
          strokeDasharray={J_LEN}
          strokeDashoffset={dashOffset}
        />

        {/* Faint dotted "invisible" flight path — shows where the firefly
            is between flashes (echoes the cryptographer/blueprint feel) */}
        <path
          d={J_PATH}
          stroke={GRAY}
          strokeWidth={1}
          fill="none"
          strokeDasharray="2 6"
          strokeOpacity={0.22 * (arcT > 0.4 ? 1 : arcT / 0.4)}
        />

        {/* Firefly at peak (J_TOP), lantern lit */}
        {arcT > 0.85 && (
          <g>
            {/* wide bloom */}
            <circle
              cx={J_TOP.x}
              cy={J_TOP.y}
              r={80}
              fill="url(#firefly-glow)"
              opacity={peakBloom}
            />
            {/* medium bloom */}
            <circle
              cx={J_TOP.x}
              cy={J_TOP.y}
              r={26}
              fill={FLASH_GLOW}
              opacity={0.75 * peakBloom}
              filter="url(#soft-glow)"
            />
            {/* firefly body silhouette (Photinus pyralis, plan view):
                slightly enlarged so it still reads against the bloom.
                Layered NIGHT halo pushes the bloom back a touch so the
                insect stays legible. */}
            <g transform={`translate(${J_TOP.x}, ${J_TOP.y})`}>
              {/* subtle darkening halo behind the body */}
              <circle cx={0} cy={0} r={24} fill={NIGHT} opacity={0.42} />
              {/* elytra — the wing covers */}
              <ellipse
                cx={0}
                cy={2}
                rx={14}
                ry={22}
                fill={NIGHT}
                stroke={EMBER}
                strokeWidth={1.6}
                opacity={1}
              />
              {/* elytral midline seam */}
              <line
                x1={0}
                y1={-14}
                x2={0}
                y2={20}
                stroke={EMBER}
                strokeWidth={0.9}
                opacity={0.7}
              />
              {/* pronotum (orange head-shield) */}
              <ellipse
                cx={0}
                cy={-17}
                rx={9}
                ry={6}
                fill={EMBER}
                opacity={0.98}
              />
              {/* central pronotum dot — the species mark */}
              <circle cx={0} cy={-17} r={2.2} fill={NIGHT} opacity={0.95} />
              {/* legs — three per side, faint */}
              {[-8, -2, 4].map((dy, i) => (
                <g key={`leg-${i}`}>
                  <line
                    x1={-11}
                    y1={dy}
                    x2={-19 - i * 1.5}
                    y2={dy + 7 + i * 2}
                    stroke={EMBER}
                    strokeWidth={0.9}
                    opacity={0.75}
                  />
                  <line
                    x1={11}
                    y1={dy}
                    x2={19 + i * 1.5}
                    y2={dy + 7 + i * 2}
                    stroke={EMBER}
                    strokeWidth={0.9}
                    opacity={0.75}
                  />
                </g>
              ))}
              {/* antennae */}
              <line
                x1={-3}
                y1={-22}
                x2={-9}
                y2={-32}
                stroke={EMBER}
                strokeWidth={0.9}
                opacity={0.8}
              />
              <line
                x1={3}
                y1={-22}
                x2={9}
                y2={-32}
                stroke={EMBER}
                strokeWidth={0.9}
                opacity={0.8}
              />
              {/* lantern segment — the bright emitter, at abdomen tip */}
              <ellipse
                cx={0}
                cy={17}
                rx={9}
                ry={5}
                fill={FLASH_GLOW}
                opacity={peakBloom}
              />
              <ellipse
                cx={0}
                cy={17}
                rx={5.5}
                ry={3}
                fill={"#FFFFFF"}
                opacity={0.75 * peakBloom}
              />
            </g>
          </g>
        )}

        {/* Female answer bloom — small, low, on the ground line.
            A subtle vertical leader ties it to the horizon so the answer
            reads as an event on the timeline rather than a floating dot. */}
        <g opacity={answerBloom}>
          <line
            x1={ANSWER.x}
            y1={820}
            x2={ANSWER.x}
            y2={ANSWER.y}
            stroke={GRAY}
            strokeWidth={0.9}
            opacity={0.6}
            strokeDasharray="2 4"
          />
          <circle
            cx={ANSWER.x}
            cy={ANSWER.y}
            r={40}
            fill="url(#answer-glow)"
          />
          <circle
            cx={ANSWER.x}
            cy={ANSWER.y}
            r={5}
            fill={FLASH_GLOW}
            filter="url(#soft-glow)"
          />
          <text
            x={ANSWER.x + 22}
            y={ANSWER.y + 4}
            fill={GRAY}
            fontFamily={inter}
            fontSize={10}
            letterSpacing={3}
            fontWeight={600}
            opacity={0.9}
          >
            ♀  ANSWER  ·  + 2 s
          </text>
        </g>

        {/* Cipher-notation annotations on the right — each with a proper
            leader line from an anchor point on the J-arc to the label. */}
        <g opacity={annotOpacity}>
          {ANNOTATIONS.map((a, i) => (
            <g key={`annot-${i}`}>
              {/* small anchor tick on the arc */}
              <circle
                cx={a.anchorX}
                cy={a.anchorY}
                r={2}
                fill={GRAY}
                opacity={0.9}
              />
              {/* leader: two-segment (out, then horizontal to text) */}
              <line
                x1={a.anchorX}
                y1={a.anchorY}
                x2={a.x - 14}
                y2={a.y - 4}
                stroke={GRAY}
                strokeWidth={1}
              />
              <text
                x={a.x}
                y={a.y}
                fill={GRAY}
                fontFamily={inter}
                fontSize={11}
                letterSpacing={3.5}
                fontWeight={500}
              >
                {a.text}
              </text>
            </g>
          ))}
        </g>

        {/* Caption strip below the panel */}
        <g
          transform={`translate(${FRAME.x}, ${FRAME.y + FRAME.h + 22})`}
          fill={GRAY}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
        >
          <text>FIG. 1 · MALE PHOTINUS PYRALIS FLASH SIGNATURE</text>
          <text
            x={FRAME.w}
            textAnchor="end"
            fill={FLASH}
            opacity={0.85}
          >
            SIGNATURE  ·  CYCLE = 5.5 S
          </text>
        </g>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 935,
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
            color: FLASH,
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
            Cryptographer
          </span>
        </div>

        <div
          style={{
            color: "#F4F4F6",
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 92,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The pulse is
          <br />
          the password.
        </div>

        <div
          style={{
            marginTop: 30,
            color: "#C8CAD0",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          Each{" "}
          <span style={{ color: FLASH, fontWeight: 600 }}>
            Photinus pyralis
          </span>{" "}
          male broadcasts a species-specific code — a half-second
          yellow-green pulse along a "J"-shaped ascent, repeated every 5.5
          seconds — and predatory{" "}
          <span style={{ color: EMBER, fontWeight: 600 }}>Photuris</span>{" "}
          females decode it, mimic the reply, and eat the answerers.
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
        <span>Lloyd · Science 149 (1965) 653 · 187 (1975) 452</span>
        <span>
          <span style={{ color: FLASH }}>●</span> λ ≈ 560 nm
        </span>
      </div>
    </AbsoluteFill>
  );
};
