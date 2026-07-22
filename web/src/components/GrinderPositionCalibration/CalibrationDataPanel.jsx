export default function CalibrationDataPanel({
  fineRaw,
  coarseRaw,
  steps,
  reverseDirection,
  calibrated,
  importState,
  exportState,
  onCopy,
  onDownload,
  onImportFile,
}) {
  return (
    <details className='collapse-arrow bg-base-200 collapse'>
      <summary className='collapse-title font-medium'>Import / export calibration</summary>

      <div className='collapse-content space-y-4'>
        <div className='text-base-content/70 text-sm'>
          Save a backup of this grinder calibration or import one from another installation.
        </div>

        <div className='mockup-code bg-base-300 text-xs'>
          <pre>
            <code>
              {JSON.stringify(
                {
                  version: 1,
                  grinderRawFine: fineRaw,
                  grinderRawCoarse: coarseRaw,
                  grinderSteps: steps,
                  grinderReverseDirection: reverseDirection,
                },
                null,
                2,
              )}
            </code>
          </pre>
        </div>

        <div className='flex flex-wrap gap-3'>
          <button
            type='button'
            className='btn btn-outline'
            onClick={onCopy}
            disabled={!calibrated}
          >
            {exportState === 'copied' ? 'Copied' : 'Copy JSON'}
          </button>

          <button
            type='button'
            className='btn btn-outline'
            onClick={onDownload}
            disabled={!calibrated}
          >
            Download JSON
          </button>

          <label className='btn btn-outline'>
            Import JSON
            <input
              type='file'
              accept='application/json,.json'
              className='hidden'
              onChange={onImportFile}
            />
          </label>
        </div>

        {exportState === 'failed' && (
          <div className='alert alert-error'>
            <span>Could not copy the calibration JSON.</span>
          </div>
        )}

        {importState === 'imported' && (
          <div className='alert alert-success'>
            <span>Calibration imported. Review it, then apply the edited calibration.</span>
          </div>
        )}

        {importState === 'failed' && (
          <div className='alert alert-error'>
            <span>
              The selected file is not a valid grinder calibration export.
            </span>
          </div>
        )}
      </div>
    </details>
  );
}
