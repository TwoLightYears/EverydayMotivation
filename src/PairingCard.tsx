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

// Palette — drawn from superb lyrebird plumage & forest-floor dusk
const DUSK = "#0E100F";
const PANEL = "#1A1E1C";
const SILVER = "#DDD4BC";
const RUFOUS = "#B8692E";
const MOSS = "#8B7F6A";
const PANEL_LINE = "#262A27";
const INK_HI = "#F1EADA";

// 16 channel levels (0..1), approximating a lyrebird mimicry spectrum —
// outer lyrate feathers tallest (the signature pair), filamentary inners
// of varied height from the mimicked signal.
const CHANNEL_LEVELS: ReadonlyArray<number> = [
  0.96, 0.58, 0.48, 0.74, 0.9, 0.62, 0.74, 0.54, 0.84, 0.46, 0.66, 0.84, 0.5,
  0.6, 0.52, 0.96,
];
const CHANNEL_LABELS: ReadonlyArray<string> = [
  "LYR·L",
  "80",
  "100",
  "125",
  "160",
  "200",
  "250",
  "315",
  "400",
  "500",
  "630",
  "800",
  "1K",
  "1.25K",
  "1.6K",
  "LYR·R",
];

// ── Lyrebird silhouette path (profile, facing right, tail folded back)
// Drawn in a 220 × 90 local coordinate box. A compact, signature shape:
// plump body, upright neck, narrow head, short beak, two legs.
const LYREBIRD_SILHOUETTE =
  "M 14 62 " + // tail-side rump
  "C 6 60, 2 56, 4 50 " + // small tail tuft
  "C 10 44, 18 42, 28 42 " + // back curve
  "C 42 40, 58 36, 74 30 " + // long back → shoulder
  "C 90 24, 104 18, 118 14 " + // neck rise
  "C 126 11, 134 9, 142 10 " + // head approach
  "C 146 7, 152 6, 156 9 " + // head top
  "C 160 12, 160 16, 158 19 " + // head back curve
  "C 164 20, 170 22, 173 25 " + // beak base
  "L 192 23 " + // beak upper
  "L 188 28 " + // beak middle
  "L 174 29 " + // beak lower
  "C 170 33, 162 36, 150 36 " + // throat
  "C 134 36, 118 40, 104 46 " + // breast
  "C 88 52, 72 58, 56 62 " + // underbelly
  "C 42 65, 26 66, 14 62 " + // back to tail
  "Z";

export const PairingCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Primary motion: fan unfurls, bars cascade up, playhead sweeps ──
  const fanSpring = spring({
    frame,
    fps,
    config: { damping: 180, mass: 0.9, stiffness: 90 },
  });

  const titleSpring = spring({
    frame: frame - fps * 0.35,
    fps,
    config: { damping: 200, mass: 0.9 },
  });

  const hookOpacity = interpolate(frame, [fps * 0.9, fps * 1.7], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sweepProgress = interpolate(
    frame,
    [fps * 1.4, fps * 4.6],
    [0, 1],
    {
      easing: Easing.inOut(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // ── Page layout (1080 × 1350 portrait) ────────────────────────────
  // Top metadata : 56
  // Console face : 140..880
  // Title lockup : 920..
  // Footer       : 1292..

  const FAN_CX = 540;
  const FAN_CY = 845;
  const FAN_R_INNER = 150;
  const FAN_R_OUTER = 505;
  const FAN_ARC = Math.PI * 0.82; // ≈ 148°
  const FAN_START = -Math.PI / 2 - FAN_ARC / 2;

  const N = CHANNEL_LEVELS.length;

  return (
    <AbsoluteFill style={{ backgroundColor: DUSK, fontFamily: inter }}>
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
          color: MOSS,
          fontFamily: inter,
          fontSize: 13,
          letterSpacing: 4.5,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Everyday Motivation · No. 003</span>
        <span style={{ color: RUFOUS }}>2026 · 11 · 10</span>
      </div>

      {/* ── Console / fan ──────────────────────────────────────── */}
      <svg
        width={1080}
        height={1350}
        viewBox="0 0 1080 1350"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="panel-vignette" cx="50%" cy="100%" r="90%">
            <stop offset="0%" stopColor="#20241F" stopOpacity={1} />
            <stop offset="100%" stopColor={PANEL} stopOpacity={1} />
          </radialGradient>
          <linearGradient id="bar-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={SILVER} stopOpacity={0.15} />
            <stop offset="55%" stopColor={SILVER} stopOpacity={0.85} />
            <stop offset="100%" stopColor={INK_HI} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="lyrate-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={RUFOUS} stopOpacity={0.3} />
            <stop offset="55%" stopColor={RUFOUS} stopOpacity={0.55} />
            <stop offset="100%" stopColor="#E59052" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="peak-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={RUFOUS} stopOpacity={0} />
            <stop offset="100%" stopColor={RUFOUS} stopOpacity={0.85} />
          </linearGradient>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Console face */}
        <rect
          x={60}
          y={140}
          width={960}
          height={740}
          fill="url(#panel-vignette)"
        />

        {/* Hairline frame */}
        <rect
          x={60.5}
          y={140.5}
          width={959}
          height={739}
          fill="none"
          stroke={PANEL_LINE}
          strokeWidth={1}
        />

        {/* Top-left console tag */}
        <g
          transform="translate(90, 180)"
          fill={MOSS}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={600}
        >
          <text>FIG. 01</text>
          <text y={22} fill={SILVER} opacity={0.8}>
            MIMICRY SPECTRUM
          </text>
          <text y={44} fill={MOSS}>
            1/3 OCTAVE · 16 BANDS
          </text>
        </g>

        {/* Top-right meter readout */}
        <g
          transform="translate(990, 180)"
          fill={MOSS}
          fontFamily={inter}
          fontSize={11}
          letterSpacing={3}
          fontWeight={500}
          textAnchor="end"
        >
          <text>CH 16 · 1/3 OCT</text>
          <text y={22} fill={SILVER} opacity={0.75}>
            PEAK {" "}
            <tspan fill={RUFOUS}>−3.0 dB</tspan>
          </text>
          <text y={44}>RMS −12.4 dB</text>
        </g>

        {/* dB rails — two subtle concentric arcs (0 dB + -12 dB reference) */}
        {[
          { frac: 0.5, label: "−12 dB" },
          { frac: 1.0, label: "0 dB" },
        ].map((rail, i) => {
          const r =
            FAN_R_INNER + (FAN_R_OUTER - FAN_R_INNER) * rail.frac;
          const a0 = FAN_START - 0.02;
          const a1 = FAN_START + FAN_ARC + 0.02;
          const x0 = FAN_CX + Math.cos(a0) * r;
          const y0 = FAN_CY + Math.sin(a0) * r;
          const x1 = FAN_CX + Math.cos(a1) * r;
          const y1 = FAN_CY + Math.sin(a1) * r;
          return (
            <g key={`rail-${i}`}>
              <path
                d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
                fill="none"
                stroke={PANEL_LINE}
                strokeWidth={1}
                strokeDasharray={rail.frac === 1.0 ? "none" : "3 4"}
              />
            </g>
          );
        })}

        {/* Signature waveform strip across the top of the console — a
            faint trace of the source signal, swept once by a playhead. */}
        {(() => {
          const WY = 230;
          const WAMP = 14;
          const pts = Array.from({ length: 180 }, (_, k) => {
            const u = k / 179;
            const y =
              WY +
              Math.sin(u * 22) * WAMP * 0.4 +
              Math.sin(u * 41 + 1.3) * WAMP * 0.35 +
              Math.sin(u * 7) * WAMP * 0.4;
            const x = 300 + u * (680 - 300);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
          const x = 300 + sweepProgress * (680 - 300);
          return (
            <g>
              <line
                x1={300}
                y1={WY}
                x2={680}
                y2={WY}
                stroke={PANEL_LINE}
                strokeWidth={1}
              />
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={SILVER}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <g
                opacity={sweepProgress > 0 && sweepProgress < 1 ? 1 : 0}
              >
                <line
                  x1={x}
                  y1={WY - 16}
                  x2={x}
                  y2={WY + 16}
                  stroke={RUFOUS}
                  strokeWidth={1.4}
                />
                <circle cx={x} cy={WY} r={3} fill={RUFOUS} />
              </g>
            </g>
          );
        })()}

        {/* ── The fan of bars ──────────────────────────────────────
             The 16 lyrate feathers become 16 vertical level bars arranged
             along an arc. Each bar's height encodes a frequency band and
             animates up via the fanSpring. The arc's inner edge is where
             each bar starts; the outer edge is max level.
        */}
        {CHANNEL_LEVELS.map((lvl, i) => {
          const t = (i + 0.5) / N; // 0..1 along the fan
          const angle = FAN_START + t * FAN_ARC;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          // Stagger each bar's unfurl slightly left→right.
          const localDelay = i * 0.03;
          const u = Math.max(0, fanSpring - localDelay);
          const uu = Math.min(1, u / (1 - localDelay + 0.001));
          const eased = 1 - Math.pow(1 - uu, 3);
          const effectiveLvl = lvl * eased;

          const r0 = FAN_R_INNER;
          const r1 =
            FAN_R_INNER + (FAN_R_OUTER - FAN_R_INNER) * effectiveLvl;
          const rPeak =
            FAN_R_INNER + (FAN_R_OUTER - FAN_R_INNER) * lvl;

          const x0 = FAN_CX + cos * r0;
          const y0 = FAN_CY + sin * r0;
          const x1 = FAN_CX + cos * r1;
          const y1 = FAN_CY + sin * r1;
          const xPeak = FAN_CX + cos * rPeak;
          const yPeak = FAN_CY + sin * rPeak;

          // Lyrate = the two outermost tail feathers. They're much thicker
          // and wear a rufous-edged knob at the tip.
          const isLyrate = i === 0 || i === N - 1;
          const isPeak = i === 4; // 160 Hz — chainsaw-ish fundamental

          const thickRoot = isLyrate ? 18 : 11;
          const thickTip = isLyrate ? 9 : 5;
          // Perpendicular unit vector for rectangle corners.
          const px = -sin;
          const py = cos;

          const rootA = [
            x0 + px * thickRoot * 0.5,
            y0 + py * thickRoot * 0.5,
          ];
          const rootB = [
            x0 - px * thickRoot * 0.5,
            y0 - py * thickRoot * 0.5,
          ];
          const tipA = [x1 + px * thickTip * 0.5, y1 + py * thickTip * 0.5];
          const tipB = [x1 - px * thickTip * 0.5, y1 - py * thickTip * 0.5];

          // Numeric readout position. Lyrates get an inward label (their
          // knob occupies the outward edge); others sit just beyond the arc.
          const rLabel = isLyrate ? FAN_R_OUTER - 56 : FAN_R_OUTER + 24;
          const xLabel = FAN_CX + cos * rLabel;
          const yLabel = FAN_CY + sin * rLabel;

          const barFill = isPeak
            ? RUFOUS
            : isLyrate
              ? "url(#lyrate-grad)"
              : "url(#bar-grad)";
          const barStroke = isPeak || isLyrate ? "#E59052" : SILVER;
          const barStrokeOp = isPeak ? 0.9 : isLyrate ? 0.7 : 0.35;

          return (
            <g key={`bar-${i}`}>
              {/* Shaft (bar) */}
              <polygon
                points={`${rootA[0]},${rootA[1]} ${tipA[0]},${tipA[1]} ${tipB[0]},${tipB[1]} ${rootB[0]},${rootB[1]}`}
                fill={barFill}
                stroke={barStroke}
                strokeOpacity={barStrokeOp}
                strokeWidth={0.8}
              />

              {/* Peak tick — target level before cascade */}
              <line
                x1={xPeak - px * (thickTip * 0.5 + 4)}
                y1={yPeak - py * (thickTip * 0.5 + 4)}
                x2={xPeak + px * (thickTip * 0.5 + 4)}
                y2={yPeak + py * (thickTip * 0.5 + 4)}
                stroke={RUFOUS}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.9}
              />

              {/* Rufous tip glow for the tallest bar */}
              {isPeak && (
                <circle
                  cx={xPeak}
                  cy={yPeak}
                  r={9}
                  fill={RUFOUS}
                  opacity={0.35}
                  filter="url(#soft-glow)"
                />
              )}

              {/* Lyrate knob — the signature flared tip of the outer feather */}
              {isLyrate && (
                <g>
                  <circle
                    cx={x1}
                    cy={y1}
                    r={14}
                    fill={RUFOUS}
                    opacity={0.22}
                    filter="url(#soft-glow)"
                  />
                  <circle
                    cx={x1}
                    cy={y1}
                    r={9}
                    fill="#E59052"
                    stroke={INK_HI}
                    strokeWidth={1}
                  />
                </g>
              )}

              {/* Frequency label — kept horizontal for legibility; lyrates get no label */}
              {!isLyrate && (
                <text
                  x={xLabel}
                  y={yLabel + 3}
                  textAnchor="middle"
                  fill={isPeak ? RUFOUS : MOSS}
                  fontFamily={inter}
                  fontSize={10}
                  letterSpacing={1.4}
                  fontWeight={isPeak ? 600 : 500}
                  opacity={0.8 + (isPeak ? 0.2 : 0)}
                >
                  {CHANNEL_LABELS[i]}
                </text>
              )}
            </g>
          );
        })}

        {/* Inner arc — thin "stage lip" at the fan's base */}
        {[FAN_R_INNER - 10, FAN_R_INNER - 4].map((r, k) => {
          const a0 = FAN_START - 0.04;
          const a1 = FAN_START + FAN_ARC + 0.04;
          const x0 = FAN_CX + Math.cos(a0) * r;
          const y0 = FAN_CY + Math.sin(a0) * r;
          const x1 = FAN_CX + Math.cos(a1) * r;
          const y1 = FAN_CY + Math.sin(a1) * r;
          return (
            <path
              key={`inner-arc-${k}`}
              d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
              fill="none"
              stroke={SILVER}
              strokeOpacity={k === 0 ? 0.18 : 0.35}
              strokeWidth={1}
            />
          );
        })}

        {/* Species pivot-tag — a stage-lip label at the base of the fan */}
        <g
          opacity={interpolate(frame, [fps * 0.2, fps * 0.9], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <rect
            x={FAN_CX - 134}
            y={FAN_CY + 4}
            width={268}
            height={30}
            fill={DUSK}
            stroke={SILVER}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <text
            x={FAN_CX}
            y={FAN_CY + 23}
            textAnchor="middle"
            fill={SILVER}
            fontFamily={inter}
            fontSize={11}
            letterSpacing={5}
            fontWeight={600}
          >
            MENURA NOVAEHOLLANDIAE
          </text>
          {/* Tie-line down from the pivot into the tag */}
          <line
            x1={FAN_CX}
            y1={FAN_CY - FAN_R_INNER + 4}
            x2={FAN_CX}
            y2={FAN_CY + 4}
            stroke={SILVER}
            strokeOpacity={0.35}
            strokeWidth={1}
          />
        </g>

        {/* Highlighted channel annotation — leader to the rufous bar */}
        {(() => {
          const i = 4;
          const t = (i + 0.5) / N;
          const angle = FAN_START + t * FAN_ARC;
          const r = FAN_R_INNER + (FAN_R_OUTER - FAN_R_INNER) * CHANNEL_LEVELS[i];
          const x = FAN_CX + Math.cos(angle) * r;
          const y = FAN_CY + Math.sin(angle) * r;
          const boxW = 148;
          const boxH = 26;
          const boxX = 110;
          const boxY = 300;
          const elbowX = x - 70;
          const elbowY = y - 30;
          const op = interpolate(frame, [fps * 0.9, fps * 1.5], [0, 1], {
            easing: Easing.out(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <g opacity={op}>
              <polyline
                points={`${x},${y} ${elbowX},${elbowY} ${
                  boxX + boxW
                },${boxY + boxH / 2}`}
                fill="none"
                stroke={RUFOUS}
                strokeWidth={1}
              />
              <circle cx={x} cy={y} r={2.2} fill={RUFOUS} />
              <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={boxH}
                fill={DUSK}
                stroke={RUFOUS}
                strokeWidth={1}
              />
              <text
                x={boxX + boxW / 2}
                y={boxY + 17}
                textAnchor="middle"
                fill={RUFOUS}
                fontFamily={inter}
                fontSize={10}
                letterSpacing={3}
                fontWeight={600}
              >
                SRC · CHAINSAW
              </text>
            </g>
          );
        })()}

        {/* Channel-count footer inside console */}
        <text
          x={90}
          y={867}
          fill={MOSS}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          3 SYRINGEAL MUSCLE PAIRS
        </text>
        <text
          x={990}
          y={867}
          textAnchor="end"
          fill={MOSS}
          fontFamily={inter}
          fontSize={10}
          letterSpacing={3}
          fontWeight={500}
        >
          16 BANDS RESOLVED
        </text>
      </svg>

      {/* ── Type lockup ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 920,
          opacity: titleSpring,
          transform: `translateY(${interpolate(
            titleSpring,
            [0, 1],
            [14, 0],
          )}px)`,
        }}
      >
        <div
          style={{
            color: RUFOUS,
            fontFamily: inter,
            fontSize: 13,
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          Role <span style={{ color: MOSS, margin: "0 4px" }}>/</span>
          <span style={{ color: INK_HI, letterSpacing: 5 }}>
            Audio Mimicry Engineer
          </span>
        </div>

        <div
          style={{
            color: INK_HI,
            fontFamily: playfair,
            fontWeight: 500,
            fontSize: 86,
            lineHeight: 0.94,
            letterSpacing: -1.6,
            fontStyle: "italic",
          }}
        >
          The bird that
          <br />
          rips sound apart.
        </div>

        <div
          style={{
            marginTop: 28,
            color: "#C8C3B2",
            fontFamily: inter,
            fontSize: 19,
            lineHeight: 1.42,
            fontWeight: 400,
            maxWidth: 900,
            opacity: hookOpacity,
          }}
        >
          The superb lyrebird imitates chainsaws, camera shutters, car alarms
          and <span style={{ color: SILVER, fontWeight: 600 }}>
            20+ other bird species
          </span>{" "}
          — through a syrinx with only{" "}
          <span style={{ color: RUFOUS, fontWeight: 600 }}>
            three pairs of intrinsic muscles
          </span>
          , fewer than a typical oscine songbird. Less hardware, more voices.
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
          color: MOSS,
          fontFamily: inter,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        <span>Ames 1971 · Zann &amp; Dunstan 2008 · J. Avian Biol.</span>
        <span>
          <span style={{ color: RUFOUS }}>●</span> Peak = 160 Hz band
        </span>
      </div>

      {/* Suppress unused warning from destructuring */}
      <span style={{ display: "none" }}>{durationInFrames}</span>
    </AbsoluteFill>
  );
};
