import { SettingsFormField } from '../SettingsFormField.jsx';

export default function GrinderStepSettings({
  steps,
  setSteps,
  calibrated,
  saveState,
  applyStepCount,
  minSteps,
  maxSteps,
}) {
  const validSteps =
    Number.isInteger(steps) &&
    steps >= minSteps &&
    steps <= maxSteps;

  return (
    <div className='space-y-3'>
      <SettingsFormField
        label='Number of Grind Steps'
        htmlFor='grinderSteps'
        helpText='Total displayed grind positions, including both endpoints. This can be changed without recalibrating.'
        noMargin
      >
        <div className='flex max-w-sm items-center gap-2'>
          <button
            type='button'
            className='btn btn-square btn-outline'
            onClick={() => setSteps(Math.max(minSteps, steps - 1))}
            disabled={!Number.isFinite(steps) || steps <= minSteps}
          >
            −
          </button>

          <input
            id='grinderSteps'
            type='number'
            min={minSteps}
            max={maxSteps}
            step='1'
            className={`input input-bordered w-full text-center ${
              validSteps ? '' : 'input-error'
            }`}
            value={steps}
            onChange={event => {
              const value = Number.parseInt(event.target.value, 10);
              setSteps(Number.isFinite(value) ? value : minSteps);
            }}
          />

          <button
            type='button'
            className='btn btn-square btn-outline'
            onClick={() => setSteps(Math.min(maxSteps, steps + 1))}
            disabled={!Number.isFinite(steps) || steps >= maxSteps}
          >
            +
          </button>
        </div>
      </SettingsFormField>

      {!validSteps && (
        <div className='text-error text-sm'>
          Step count must be a whole number from {minSteps} to {maxSteps}.
        </div>
      )}

      <button
        type='button'
        className='btn btn-secondary'
        onClick={applyStepCount}
        disabled={!calibrated || !validSteps || saveState === 'saving'}
      >
        {saveState === 'saving' ? 'Applying…' : 'Apply Step Count'}
      </button>
    </div>
  );
}
