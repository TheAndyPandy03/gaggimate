export default function GrinderStatusPanel({
  currentRaw,
  currentStep,
  steps,
  mappedPosition,
  sensorStable,
  sensorNoise,
  fineRaw,
  coarseRaw,
}) {
  const markerPosition = mappedPosition === null ? null : mappedPosition * 100;

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div className='rounded-box border-base-300 bg-base-200 border p-4'>
          <div className='text-base-content/70 text-sm'>Current raw ADC reading</div>
          <div className='mt-1 text-3xl font-semibold'>{currentRaw ?? '—'}</div>
        </div>

        <div className='rounded-box border-base-300 bg-base-200 border p-4'>
          <div className='text-base-content/70 text-sm'>Current grinder position</div>
          <div className='mt-1 text-3xl font-semibold'>
            {currentStep === null ? '—' : `${currentStep} / ${steps}`}
          </div>
        </div>
      </div>

      <div className='rounded-box border-base-300 bg-base-100 border p-4'>
        <div className='mb-3 flex items-center justify-between text-sm'>
          <span>Fine</span>
          <span className='font-semibold'>
            {currentStep === null ? 'Not calibrated' : `Step ${currentStep} of ${steps}`}
          </span>
          <span>Coarse</span>
        </div>

        <div className='relative py-5'>
          <div className='bg-base-300 h-3 w-full overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full transition-all duration-150'
              style={{ width: `${markerPosition ?? 0}%` }}
            />
          </div>

          <div className='absolute top-0 left-0 flex -translate-x-1/2 flex-col items-center'>
            <span className='text-xs'>Fine</span>
            <span className='bg-base-content h-3 w-px' />
          </div>

          <div className='absolute top-0 left-1/2 flex -translate-x-1/2 flex-col items-center'>
            <span className='text-xs'>Middle</span>
            <span className='bg-base-content h-3 w-px' />
          </div>

          <div className='absolute top-0 right-0 flex translate-x-1/2 flex-col items-center'>
            <span className='text-xs'>Coarse</span>
            <span className='bg-base-content h-3 w-px' />
          </div>

          {markerPosition !== null && (
            <div
              className='border-primary bg-base-100 absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 shadow transition-all duration-150'
              style={{ left: `${markerPosition}%` }}
              title={`Current raw reading: ${currentRaw}`}
            />
          )}
        </div>

        <div className='text-base-content/60 mt-2 grid grid-cols-2 gap-2 text-xs'>
          <span>Fine ADC: {fineRaw ?? '—'}</span>
          <span className='text-right'>Coarse ADC: {coarseRaw ?? '—'}</span>
        </div>

        <div className='text-base-content/60 mt-2 text-center text-sm'>
          {mappedPosition === null
            ? 'Position preview becomes available after calibration.'
            : `${(mappedPosition * 100).toFixed(1)}% through the calibrated range`}
        </div>
      </div>

      <div className={`alert ${sensorStable ? 'alert-success' : 'alert-warning'}`}>
        <span>
          {sensorStable
            ? `Sensor stable${sensorNoise === null ? '' : `, spread ${sensorNoise} counts`}`
            : 'Waiting for a stable sensor reading.'}
        </span>
      </div>
    </div>
  );
}
