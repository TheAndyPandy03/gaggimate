export default function CalibrationGraph({ samples = [], fineRaw, coarseRaw, currentRaw }) {
  const values = samples.filter(Number.isFinite);

  if (values.length < 2) {
    return (
      <div className='rounded-box border-base-300 bg-base-100 border p-4'>
        <div className='font-medium'>Raw ADC history</div>
        <div className='text-base-content/60 mt-2 text-sm'>
          Waiting for enough live samples to draw the graph.
        </div>
      </div>
    );
  }

  const referenceValues = [
    ...values,
    ...(Number.isFinite(fineRaw) ? [fineRaw] : []),
    ...(Number.isFinite(coarseRaw) ? [coarseRaw] : []),
  ];
  const minValue = Math.min(...referenceValues);
  const maxValue = Math.max(...referenceValues);
  const range = Math.max(1, maxValue - minValue);

  const width = 600;
  const height = 160;
  const padding = 12;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const xFor = index =>
    padding + (index / Math.max(1, values.length - 1)) * plotWidth;
  const yFor = value =>
    padding + (1 - (value - minValue) / range) * plotHeight;

  const points = values
    .map((value, index) => `${xFor(index)},${yFor(value)}`)
    .join(' ');

  const markerY = value => `${yFor(value)}`;

  return (
    <div className='rounded-box border-base-300 bg-base-100 border p-4'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <div className='font-medium'>Raw ADC history</div>
          <div className='text-base-content/60 text-sm'>
            Use this to identify jitter, dead spots, or abrupt sensor jumps.
          </div>
        </div>
        <div className='text-sm font-medium'>
          {minValue}–{maxValue}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className='bg-base-200 h-40 w-full rounded'
        role='img'
        aria-label='Recent raw grinder position readings'
      >
        {Number.isFinite(fineRaw) && (
          <>
            <line
              x1={padding}
              x2={width - padding}
              y1={markerY(fineRaw)}
              y2={markerY(fineRaw)}
              stroke='currentColor'
              strokeDasharray='5 5'
              opacity='0.4'
            />
            <text x={padding + 4} y={Number(markerY(fineRaw)) - 4} fontSize='11'>
              Fine
            </text>
          </>
        )}

        {Number.isFinite(coarseRaw) && (
          <>
            <line
              x1={padding}
              x2={width - padding}
              y1={markerY(coarseRaw)}
              y2={markerY(coarseRaw)}
              stroke='currentColor'
              strokeDasharray='5 5'
              opacity='0.4'
            />
            <text x={padding + 4} y={Number(markerY(coarseRaw)) - 4} fontSize='11'>
              Coarse
            </text>
          </>
        )}

        <polyline
          points={points}
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          vectorEffect='non-scaling-stroke'
        />

        {Number.isFinite(currentRaw) && (
          <circle
            cx={xFor(values.length - 1)}
            cy={yFor(currentRaw)}
            r='5'
            fill='currentColor'
          />
        )}
      </svg>
    </div>
  );
}
