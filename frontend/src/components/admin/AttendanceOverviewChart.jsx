const EVENT_STROKE = "var(--color-brand-green)";
const CLUB_STROKE = "#15803d";
const GRID = "rgba(17, 24, 39, 0.08)";
const AXIS = "rgba(17, 24, 39, 0.18)";

function shortDayLabel(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function truncateLegendLabel(text, maxLen = 22) {
  if (!text || text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

/** @typedef {'all' | 'event_only' | 'club_only'} OverviewViewMode */

export default function AttendanceOverviewChart({
  daily,
  mode,
  viewMode = "all",
  eventLegendLabel = "Events (all)",
  clubLegendLabel = "Clubs (all)",
}) {
  const pad = { l: 42, r: 14, t: 24, b: 40 };
  const vw = 720;
  const vh = 260;
  const pw = vw - pad.l - pad.r;
  const ph = vh - pad.t - pad.b;
  const n = daily.length;

  const showBoth = viewMode === "all";

  const maxLine = Math.max(
    1,
    ...daily.map((d) => {
      if (showBoth) return Math.max(d.event_check_ins, d.club_check_ins);
      if (viewMode === "event_only") return d.event_check_ins;
      return d.club_check_ins;
    }),
  );

  const maxStack = Math.max(
    1,
    ...daily.map((d) => {
      if (showBoth) return d.event_check_ins + d.club_check_ins;
      if (viewMode === "event_only") return d.event_check_ins;
      return d.club_check_ins;
    }),
  );

  const maxY = mode === "bars" ? maxStack : maxLine;

  function xCenter(i) {
    if (n <= 1) return pad.l + pw / 2;
    return pad.l + ((i + 0.5) / n) * pw;
  }

  function xLine(i) {
    if (n <= 1) return pad.l + pw / 2;
    return pad.l + (i / Math.max(n - 1, 1)) * pw;
  }

  function yAt(v) {
    return pad.t + ph - (v / maxY) * ph;
  }

  const tickValues = [0, Math.ceil(maxY / 2), maxY];
  const labelIndices =
    n <= 7
      ? daily.map((_, i) => i)
      : [0, Math.floor((n - 1) / 4), Math.floor((n - 1) / 2), Math.floor((3 * (n - 1)) / 4), n - 1].filter(
          (v, i, a) => a.indexOf(v) === i,
        );

  const eventLinePts = daily.map((d, i) => `${xLine(i)},${yAt(d.event_check_ins)}`).join(" ");
  const clubLinePts = daily.map((d, i) => `${xLine(i)},${yAt(d.club_check_ins)}`).join(" ");

  const barW = Math.min((pw / Math.max(n, 1)) * 0.62, 22);

  const legendEventText = truncateLegendLabel(eventLegendLabel);
  const legendClubText = truncateLegendLabel(clubLegendLabel);

  let ariaLabel = "Attendance check-ins over time";
  if (showBoth) ariaLabel += ": events and clubs";
  else if (viewMode === "event_only") ariaLabel += `: ${eventLegendLabel}`;
  else ariaLabel += `: ${clubLegendLabel}`;

  const legendHeight = showBoth ? 44 : 28;
  const longestLegend = Math.max(legendEventText.length, legendClubText.length);
  const legendWidth = showBoth ? Math.max(168, 52 + longestLegend * 6.2) : Math.min(240, 52 + longestLegend * 6.2);

  return (
    <svg
      width="100%"
      height={vh}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
      className="text-[length:var(--font-size-caption)]"
    >
      <title>Attendance statistics</title>

      {tickValues.map((tv) => {
        const y = yAt(tv);
        return (
          <g key={`g-${tv}`}>
            <line x1={pad.l} y1={y} x2={pad.l + pw} y2={y} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fill="var(--color-ink-subtle)" fontSize="11">
              {tv}
            </text>
          </g>
        );
      })}

      <line x1={pad.l} y1={pad.t + ph} x2={pad.l + pw} y2={pad.t + ph} stroke={AXIS} strokeWidth={1} />

      {mode === "bars"
        ? daily.map((d, i) => {
            const cx = xCenter(i);
            const x = cx - barW / 2;
            const total = showBoth
              ? d.event_check_ins + d.club_check_ins
              : viewMode === "event_only"
                ? d.event_check_ins
                : d.club_check_ins;
            const hTotal = total <= 0 ? 0 : (total / maxY) * ph;
            const yBase = pad.t + ph;

            if (viewMode === "event_only") {
              return (
                <g key={d.date}>
                  {total > 0 ? (
                    <rect x={x} y={yBase - hTotal} width={barW} height={hTotal} fill={EVENT_STROKE} rx={3} />
                  ) : (
                    <rect x={x} y={yBase - 1} width={barW} height={1} fill={GRID} rx={1} />
                  )}
                </g>
              );
            }

            if (viewMode === "club_only") {
              return (
                <g key={d.date}>
                  {total > 0 ? (
                    <rect x={x} y={yBase - hTotal} width={barW} height={hTotal} fill={CLUB_STROKE} rx={3} />
                  ) : (
                    <rect x={x} y={yBase - 1} width={barW} height={1} fill={GRID} rx={1} />
                  )}
                </g>
              );
            }

            const hEvent = total <= 0 ? 0 : (d.event_check_ins / total) * hTotal;
            const hClub = total <= 0 ? 0 : (d.club_check_ins / total) * hTotal;
            return (
              <g key={d.date}>
                {total > 0 ? (
                  <>
                    <rect x={x} y={yBase - hTotal} width={barW} height={hEvent} fill={EVENT_STROKE} rx={3} />
                    <rect x={x} y={yBase - hTotal + hEvent} width={barW} height={hClub} fill={CLUB_STROKE} rx={3} />
                  </>
                ) : (
                  <rect x={x} y={yBase - 1} width={barW} height={1} fill={GRID} rx={1} />
                )}
              </g>
            );
          })
        : null}

      {mode === "lines" && showBoth ? (
        <>
          <polyline fill="none" stroke={EVENT_STROKE} strokeWidth={2.25} strokeLinejoin="round" points={eventLinePts} />
          <polyline fill="none" stroke={CLUB_STROKE} strokeWidth={2.25} strokeLinejoin="round" points={clubLinePts} />
          {daily.map((d, i) => (
            <circle key={`e-${d.date}`} cx={xLine(i)} cy={yAt(d.event_check_ins)} r={3.5} fill={EVENT_STROKE} />
          ))}
          {daily.map((d, i) => (
            <circle key={`c-${d.date}`} cx={xLine(i)} cy={yAt(d.club_check_ins)} r={3.5} fill={CLUB_STROKE} />
          ))}
        </>
      ) : null}

      {mode === "lines" && viewMode === "event_only" ? (
        <>
          <polyline fill="none" stroke={EVENT_STROKE} strokeWidth={2.25} strokeLinejoin="round" points={eventLinePts} />
          {daily.map((d, i) => (
            <circle key={`e-${d.date}`} cx={xLine(i)} cy={yAt(d.event_check_ins)} r={3.5} fill={EVENT_STROKE} />
          ))}
        </>
      ) : null}

      {mode === "lines" && viewMode === "club_only" ? (
        <>
          <polyline fill="none" stroke={CLUB_STROKE} strokeWidth={2.25} strokeLinejoin="round" points={clubLinePts} />
          {daily.map((d, i) => (
            <circle key={`c-${d.date}`} cx={xLine(i)} cy={yAt(d.club_check_ins)} r={3.5} fill={CLUB_STROKE} />
          ))}
        </>
      ) : null}

      {labelIndices.map((i) => (
        <text
          key={`xl-${daily[i]?.date}-${i}`}
          x={mode === "bars" ? xCenter(i) : xLine(i)}
          y={vh - 12}
          textAnchor="middle"
          fill="var(--color-ink-muted)"
          fontSize="10"
        >
          {daily[i] ? shortDayLabel(daily[i].date) : ""}
        </text>
      ))}

      <g transform={`translate(${pad.l + pw - legendWidth}, ${pad.t})`}>
        <rect x={0} y={0} width={legendWidth} height={legendHeight} rx={8} fill="rgba(255,255,255,0.92)" stroke={GRID} />
        {showBoth ? (
          <>
            <line x1={12} y1={14} x2={28} y2={14} stroke={EVENT_STROKE} strokeWidth={3} />
            <text x={34} y={18} fill="var(--color-ink-muted)" fontSize="11">
              {legendEventText}
            </text>
            <line x1={12} y1={30} x2={28} y2={30} stroke={CLUB_STROKE} strokeWidth={3} />
            <text x={34} y={34} fill="var(--color-ink-muted)" fontSize="11">
              {legendClubText}
            </text>
          </>
        ) : viewMode === "event_only" ? (
          <>
            <line x1={12} y1={16} x2={28} y2={16} stroke={EVENT_STROKE} strokeWidth={3} />
            <text x={34} y={20} fill="var(--color-ink-muted)" fontSize="11">
              {legendEventText}
            </text>
          </>
        ) : (
          <>
            <line x1={12} y1={16} x2={28} y2={16} stroke={CLUB_STROKE} strokeWidth={3} />
            <text x={34} y={20} fill="var(--color-ink-muted)" fontSize="11">
              {legendClubText}
            </text>
          </>
        )}
      </g>
    </svg>
  );
}
