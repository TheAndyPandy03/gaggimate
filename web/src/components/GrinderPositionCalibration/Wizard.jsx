import { SettingsFormField } from '../SettingsFormField.jsx';
import GrinderStatusPanel from './StatusPanel.jsx';
import CalibrationQuality from './CalibrationQuality.jsx';

export default function GrinderCalibrationWizard({
  wizardStep,
  setWizardStep,
  closeWizard,
  fineRaw,
  coarseRaw,
  steps,
  setSteps,
  reverseDirection,
  setReverseDirection,
  reverseSuggested,
  calibrationSpan,
  calibrated,
  saveState,
  captureFine,
  captureCoarse,
  applyCalibration,
  minSteps,
  maxSteps,
  minCalibrationSpan,
  sensorStable,
  currentRaw,
  sensorNoise,
  liveStatusProps,
  fineReached,
  middleReached,
  coarseReached,
}) {
  return (
    <div className='space-y-5'>
      {wizardStep === 'intro' && (
        <>
          <div className='alert alert-info'>
            <span>
              This wizard captures the fine and coarse endpoints, validates the sensor range, and
              verifies the resulting grinder steps. Do not use burr contact as the fine endpoint.
            </span>
          </div>

          <div className='flex flex-wrap gap-3'>
            <button type='button' className='btn btn-primary' onClick={() => setWizardStep('fine')}>
              Start Calibration
            </button>
            <button type='button' className='btn btn-ghost' onClick={closeWizard}>
              Cancel
            </button>
          </div>
        </>
      )}

      {wizardStep === 'fine' && (
        <>
          <div className='alert alert-info'>
            <span>Step 1 of 3: Move the grinder to its finest normal position and wait for stability.</span>
          </div>
          <GrinderStatusPanel {...liveStatusProps} />
          <button
            type='button'
            className='btn btn-primary'
            onClick={captureFine}
            disabled={!sensorStable || currentRaw === null}
          >
            Set Fine Position
          </button>
        </>
      )}

      {wizardStep === 'coarse' && (
        <>
          <div className='alert alert-info'>
            <span>Step 2 of 3: Move the grinder to its coarsest position and wait for stability.</span>
          </div>
          <GrinderStatusPanel {...liveStatusProps} />
          <div className='rounded-box border-base-300 bg-base-100 border p-4'>
            <div className='text-base-content/70 text-sm'>Captured fine endpoint</div>
            <div className='mt-1 text-2xl font-semibold'>{fineRaw ?? '—'}</div>
          </div>
          <button
            type='button'
            className='btn btn-primary'
            onClick={captureCoarse}
            disabled={!sensorStable || currentRaw === null || fineRaw === null}
          >
            Set Coarse Position
          </button>
        </>
      )}

      {wizardStep === 'steps' && (
        <>
          <div className='alert alert-info'>
            <span>Step 3 of 3: Review the range and choose the displayed number of grind positions.</span>
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <div className='rounded-box border-base-300 bg-base-100 border p-4'>
              <div className='text-base-content/70 text-sm'>Fine ADC</div>
              <div className='mt-1 text-2xl font-semibold'>{fineRaw ?? '—'}</div>
            </div>
            <div className='rounded-box border-base-300 bg-base-100 border p-4'>
              <div className='text-base-content/70 text-sm'>Coarse ADC</div>
              <div className='mt-1 text-2xl font-semibold'>{coarseRaw ?? '—'}</div>
            </div>
            <div className='rounded-box border-base-300 bg-base-100 border p-4'>
              <div className='text-base-content/70 text-sm'>Calibration span</div>
              <div className='mt-1 text-2xl font-semibold'>{calibrationSpan}</div>
              <div className='text-base-content/60 text-sm'>ADC counts</div>
            </div>
          </div>

          <CalibrationQuality calibrationSpan={calibrationSpan} sensorNoise={sensorNoise} />

          <SettingsFormField
            label='Number of Grind Steps'
            htmlFor='grinderStepsWizard'
            helpText='Total displayed grind positions, including both endpoints.'
            noMargin
          >
            <div className='flex max-w-sm items-center gap-2'>
              <button
                type='button'
                className='btn btn-square btn-outline'
                onClick={() => setSteps(value => Math.max(minSteps, value - 1))}
              >
                −
              </button>
              <input
                id='grinderStepsWizard'
                type='number'
                min={minSteps}
                max={maxSteps}
                step='1'
                className='input input-bordered w-full text-center'
                value={steps}
                onChange={event => {
                  const value = Number.parseInt(event.target.value, 10);
                  setSteps(Number.isFinite(value) ? value : minSteps);
                }}
              />
              <button
                type='button'
                className='btn btn-square btn-outline'
                onClick={() => setSteps(value => Math.min(maxSteps, value + 1))}
              >
                +
              </button>
            </div>
          </SettingsFormField>

          {reverseSuggested && !reverseDirection && (
            <div className='alert alert-warning'>
              <div>
                <div className='font-semibold'>Reverse direction suggested</div>
                <div className='text-sm'>
                  The captured raw values run in the opposite numerical direction. Enable reversal
                  only when the displayed grinder number moves opposite to your preferred scale.
                </div>
              </div>
            </div>
          )}

          <div className='rounded-box border-base-300 bg-base-100 border p-4'>
            <label className='flex cursor-pointer items-center justify-between gap-4'>
              <div>
                <div className='font-medium'>Reverse displayed direction</div>
                <div className='text-base-content/60 mt-1 text-sm'>
                  Flip the displayed grinder numbering without changing the captured endpoints.
                </div>
              </div>
              <input
                type='checkbox'
                className='toggle toggle-primary'
                checked={reverseDirection}
                onChange={event => setReverseDirection(event.target.checked)}
              />
            </label>
          </div>

          {calibrationSpan < minCalibrationSpan && (
            <div className='alert alert-error'>
              <span>The fine and coarse readings are too close together. Recapture both endpoints.</span>
            </div>
          )}

          <div className='flex flex-wrap gap-3'>
            <button
              type='button'
              className='btn btn-success'
              onClick={applyCalibration}
              disabled={!calibrated || saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Applying…' : 'Apply Calibration'}
            </button>
            <button type='button' className='btn btn-outline' onClick={() => setWizardStep('fine')}>
              Recapture Endpoints
            </button>
          </div>
        </>
      )}

      {wizardStep === 'verify' && (
        <>
          <div className='alert alert-success'>
            <span>Calibration applied. Rotate through the full range to complete verification.</span>
          </div>
          <GrinderStatusPanel {...liveStatusProps} />

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            {[
              ['Fine reached', fineReached],
              ['Middle reached', middleReached],
              ['Coarse reached', coarseReached],
            ].map(([label, reached]) => (
              <div
                key={label}
                className={`rounded-box border p-3 text-center ${
                  reached ? 'border-success bg-success/10' : 'border-base-300 bg-base-100'
                }`}
              >
                <div className='text-xl'>{reached ? '✓' : '○'}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>

          <button
            type='button'
            className='btn btn-primary'
            onClick={closeWizard}
            disabled={!fineReached || !middleReached || !coarseReached}
          >
            Finish
          </button>
        </>
      )}
    </div>
  );
}
