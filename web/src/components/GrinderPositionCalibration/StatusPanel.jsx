export default function GrinderStatusPanel({
  currentRaw,
  currentStep,
  steps,
  mappedPosition,
  sensorStable,
  sensorNoise,
}) {
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
        <div className='mb-2 flex items-center justify-between text-sm'>
          <span>Fine</span>
          <span>Coarse</span>
        </div>

        <progress
          className='progress progress-primary w-full'
          value={mappedPosition === null ? 0 : mappedPosition * 100}
          max='100'
        />

        <div className='text-base-content/60 mt-2 text-sm'>
          {mappedPosition === null
            ? 'Position preview becomes available after calibration.'
            : `${(mappedPosition * 100).toFixed(1)}% through the calibrated range`}
        </div>
      </div>

      <div className={`alert ${sensorStable ? 'alert-success' : 'alert-warning'}`}>
        <span>
          {sensorStable
            ? `Sensor stable${sensorNoise === null ? '' : `, noise ±${sensorNoise} counts`}`
            : 'Waiting for a stable sensor reading.'}
        </span>
      </div>
    </div>
  );
}