import { useCallback, useMemo, useState } from 'preact/hooks';
import GrinderCalibrationWizard from './Wizard.jsx';
import GrinderStatusPanel from './StatusPanel.jsx';
import GrinderTestPanel from './TestPanel.jsx';
import GrinderStepSettings from './StepSettings.jsx';

const DEFAULT_STEPS = 30;
const MIN_STEPS = 2;
const MAX_STEPS = 200;
const MIN_CALIBRATION_SPAN = 500;

export default function GrinderPositionCalibration({ formData, onChange }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState('intro');

  const [fineRaw, setFineRaw] = useState(formData?.grinderRawFine ?? null);
  const [coarseRaw, setCoarseRaw] = useState(formData?.grinderRawCoarse ?? null);
  const [steps, setSteps] = useState(formData?.grinderSteps ?? DEFAULT_STEPS);

  const [testMode, setTestMode] = useState(false);
  const [saveState, setSaveState] = useState('idle');

  // These will be connected to live WebSocket telemetry later.
  const currentRaw = null;
  const sensorStable = false;
  const sensorNoise = null;

  const calibrationSpan = useMemo(() => {
    if (fineRaw === null || coarseRaw === null) {
      return 0;
    }

    return Math.abs(coarseRaw - fineRaw);
  }, [fineRaw, coarseRaw]);

  const calibrated =
    fineRaw !== null &&
    coarseRaw !== null &&
    calibrationSpan >= MIN_CALIBRATION_SPAN &&
    Number.isInteger(steps) &&
    steps >= MIN_STEPS &&
    steps <= MAX_STEPS;

  const mappedPosition = useMemo(() => {
    if (!calibrated || currentRaw === null) {
      return null;
    }

    const range = coarseRaw - fineRaw;

    if (range === 0) {
      return null;
    }

    const ratio = (currentRaw - fineRaw) / range;
    return Math.max(0, Math.min(1, ratio));
  }, [calibrated, currentRaw, fineRaw, coarseRaw]);

  const currentStep =
    mappedPosition === null ? null : 1 + Math.round(mappedPosition * (steps - 1));

  const direction =
    fineRaw === null || coarseRaw === null
      ? 'Unknown'
      : coarseRaw > fineRaw
        ? 'ADC increases toward coarse'
        : 'ADC decreases toward coarse';

  const updateFormField = useCallback(
    (name, value) => {
      onChange?.({
        target: {
          name,
          value,
        },
      });
    },
    [onChange],
  );

  const startWizard = useCallback(() => {
    setWizardStep('intro');
    setWizardOpen(true);
    setTestMode(false);
    setSaveState('idle');
  }, []);

  const captureFine = useCallback(() => {
    if (!sensorStable || currentRaw === null) {
      return;
    }

    setFineRaw(currentRaw);
    setWizardStep('coarse');
  }, [sensorStable, currentRaw]);

  const captureCoarse = useCallback(() => {
    if (!sensorStable || currentRaw === null || fineRaw === null) {
      return;
    }

    if (Math.abs(currentRaw - fineRaw) < MIN_CALIBRATION_SPAN) {
      return;
    }

    setCoarseRaw(currentRaw);
    setWizardStep('steps');
  }, [sensorStable, currentRaw, fineRaw]);

  const applyCalibration = useCallback(() => {
    if (!calibrated) {
      return;
    }

    setSaveState('saving');

    updateFormField('grinderRawFine', fineRaw);
    updateFormField('grinderRawCoarse', coarseRaw);
    updateFormField('grinderSteps', steps);

    setSaveState('saved');
    setWizardStep('verify');
  }, [calibrated, fineRaw, coarseRaw, steps, updateFormField]);

  const applyStepCount = useCallback(() => {
    if (!Number.isInteger(steps) || steps < MIN_STEPS || steps > MAX_STEPS) {
      return;
    }

    setSaveState('saving');
    updateFormField('grinderSteps', steps);
    setSaveState('saved');
  }, [steps, updateFormField]);

  const restoreDefaults = useCallback(() => {
    setFineRaw(null);
    setCoarseRaw(null);
    setSteps(DEFAULT_STEPS);
    setWizardOpen(false);
    setWizardStep('intro');
    setTestMode(false);
    setSaveState('idle');

    updateFormField('grinderRawFine', null);
    updateFormField('grinderRawCoarse', null);
    updateFormField('grinderSteps', DEFAULT_STEPS);
  }, [updateFormField]);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardStep('intro');
    setSaveState('idle');
  }, []);

  const liveStatusProps = {
    currentRaw,
    currentStep,
    steps,
    mappedPosition,
    sensorStable,
    sensorNoise,
  };

  if (wizardOpen) {
    return (
      <GrinderCalibrationWizard
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        closeWizard={closeWizard}
        fineRaw={fineRaw}
        coarseRaw={coarseRaw}
        steps={steps}
        setSteps={setSteps}
        calibrationSpan={calibrationSpan}
        calibrated={calibrated}
        saveState={saveState}
        captureFine={captureFine}
        captureCoarse={captureCoarse}
        applyCalibration={applyCalibration}
        minSteps={MIN_STEPS}
        maxSteps={MAX_STEPS}
        minCalibrationSpan={MIN_CALIBRATION_SPAN}
        sensorStable={sensorStable}
        currentRaw={currentRaw}
        liveStatusProps={liveStatusProps}
      />
    );
  }

  return (
    <div className='space-y-5'>
      <GrinderStatusPanel {...liveStatusProps} />

      <div className='divider my-1'>Calibration</div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div className='rounded-box border-base-300 bg-base-100 border p-4'>
          <div className='text-base-content/70 text-sm'>Fine endpoint</div>
          <div className='mt-1 text-3xl font-semibold'>{fineRaw ?? '—'}</div>
          <div className='text-base-content/60 mt-1 text-sm'>Raw ADC reading</div>
        </div>

        <div className='rounded-box border-base-300 bg-base-100 border p-4'>
          <div className='text-base-content/70 text-sm'>Coarse endpoint</div>
          <div className='mt-1 text-3xl font-semibold'>{coarseRaw ?? '—'}</div>
          <div className='text-base-content/60 mt-1 text-sm'>Raw ADC reading</div>
        </div>
      </div>

      <div className='rounded-box border-base-300 bg-base-100 border p-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div>
            <div className='text-base-content/70 text-sm'>Calibration span</div>
            <div className='mt-1 text-2xl font-semibold'>{calibrationSpan || '—'}</div>
            <div className='text-base-content/60 text-sm'>ADC counts</div>
          </div>

          <div>
            <div className='text-base-content/70 text-sm'>Direction</div>
            <div className='mt-1 font-semibold'>{direction}</div>
          </div>

          <div>
            <div className='text-base-content/70 text-sm'>Calibration status</div>
            <div className='mt-1 font-semibold'>
              {calibrated ? 'Calibration complete' : 'Not calibrated'}
            </div>
          </div>
        </div>
      </div>

      <GrinderStepSettings
        steps={steps}
        setSteps={setSteps}
        calibrated={calibrated}
        saveState={saveState}
        applyStepCount={applyStepCount}
        minSteps={MIN_STEPS}
        maxSteps={MAX_STEPS}
      />

      <div className='flex flex-wrap gap-3'>
        <button type='button' className='btn btn-primary' onClick={startWizard}>
          {calibrated ? 'Recalibrate Endpoints' : 'Start Calibration'}
        </button>

        <button
          type='button'
          className='btn btn-outline'
          onClick={() => setTestMode(value => !value)}
          disabled={!calibrated}
        >
          {testMode ? 'Close Test Mode' : 'Test Calibration'}
        </button>

        <button type='button' className='btn btn-ghost' onClick={restoreDefaults}>
          Restore Defaults
        </button>
      </div>

      {saveState === 'saved' && (
        <div className='alert alert-success'>
          <span>Grinder calibration settings updated.</span>
        </div>
      )}

      {testMode && calibrated && <GrinderTestPanel {...liveStatusProps} />}

      <details className='collapse-arrow bg-base-200 collapse'>
        <summary className='collapse-title font-medium'>Advanced diagnostics</summary>

        <div className='collapse-content'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div>Raw ADC: {currentRaw ?? '—'}</div>
            <div>Calibration span: {calibrationSpan || '—'}</div>
            <div>Direction: {direction}</div>
            <div>Sensor noise: {sensorNoise === null ? '—' : `±${sensorNoise}`}</div>
          </div>
        </div>
      </details>
    </div>
  );
}