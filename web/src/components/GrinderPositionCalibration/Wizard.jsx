import { SettingsFormField } from '../SettingsFormField.jsx';
import GrinderStatusPanel from './StatusPanel.jsx';

export default function GrinderCalibrationWizard({
  wizardStep,
  setWizardStep,
  closeWizard,
  fineRaw,
  coarseRaw,
  steps,
  setSteps,
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
  liveStatusProps,
}) {
  return (
    <div className='space-y-5'>
      {wizardStep === 'intro' && (
        <>
          <div className='alert alert-info'>
            <span>
              This wizard will capture the fine and coarse endpoints of the grinder position
              sensor. Do not use burr contact as the fine endpoint.
            </span>
          </div>

          <div className='flex flex-wrap gap-3'>
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => setWizardStep('fine')}
            >
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
            <span>Step 1 of 3: Move the grinder to its finest normal position.</span>
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
            <span>Step 2 of 3: Move the grinder to its coarsest position.</span>
          </div>

          <GrinderStatusPanel {...liveStatusProps} />

          {fineRaw !== null && (
            <div className='rounded-box border-base-300 bg-base-100 border p-4'>
              <div className='text-base-content/70 text-sm'>Captured fine endpoint</div>
              <div className='mt-1 text-2xl font-semibold'>{fineRaw}</div>
            </div>
          )}

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
            <span>Step 3 of 3: Confirm the number of displayed grinder positions.</span>
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

          {calibrationSpan < minCalibrationSpan && (
            <div className='alert alert-error'>
              <span>
                The fine and coarse readings are too close together. Repeat the endpoint capture.
              </span>
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

            <button
              type='button'
              className='btn btn-outline'
              onClick={() => setWizardStep('fine')}
            >
              Recapture Endpoints
            </button>
          </div>
        </>
      )}

      {wizardStep === 'verify' && (
        <>
          <div className='alert alert-success'>
            <span>Calibration applied. Rotate the grinder through its full range to verify it.</span>
          </div>

          <GrinderStatusPanel {...liveStatusProps} />

          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='rounded-box border-base-300 bg-base-100 border p-3 text-center'>
              Fine reached
            </div>

            <div className='rounded-box border-base-300 bg-base-100 border p-3 text-center'>
              Middle reached
            </div>

            <div className='rounded-box border-base-300 bg-base-100 border p-3 text-center'>
              Coarse reached
            </div>
          </div>

          <button type='button' className='btn btn-primary' onClick={closeWizard}>
            Finish
          </button>
        </>
      )}
    </div>
  );
}