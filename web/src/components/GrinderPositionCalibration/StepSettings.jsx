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
    Number.isInteger(steps) && steps >= minSteps && steps <= maxSteps;

  return (
    <div className='space-y-3'>
      <SettingsFormField
        label='Number of Grind Steps'
        htmlFor='grinderSteps'
        helpText='Total displayed grind positions, including both endpoints. This can be changed without recalibrating the endpoints.'
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
            id='grinderSteps'
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