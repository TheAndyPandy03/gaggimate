export default function ResetConfirmation({
  open,
  defaultSteps,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className='modal modal-open'>
      <div className='modal-box'>
        <h3 className='text-lg font-bold'>Restore grinder calibration defaults?</h3>
        <p className='py-4'>
          This clears both captured endpoints, resets the step count to {defaultSteps},
          and turns off reverse direction.
        </p>

        <div className='modal-action'>
          <button type='button' className='btn btn-ghost' onClick={onCancel}>
            Cancel
          </button>
          <button type='button' className='btn btn-error' onClick={onConfirm}>
            Restore Defaults
          </button>
        </div>
      </div>

      <button
        type='button'
        className='modal-backdrop'
        aria-label='Close reset confirmation'
        onClick={onCancel}
      />
    </div>
  );
}
