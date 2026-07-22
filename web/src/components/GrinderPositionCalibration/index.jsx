import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { machine } from '../../services/ApiService.js';
import GrinderCalibrationWizard from './Wizard.jsx';
import GrinderStatusPanel from './StatusPanel.jsx';
import GrinderTestPanel from './TestPanel.jsx';
import GrinderStepSettings from './StepSettings.jsx';
import CalibrationGraph from './CalibrationGraph.jsx';
import CalibrationQuality from './CalibrationQuality.jsx';

const DEFAULT_STEPS = 30;
const MIN_STEPS = 2;
const MAX_STEPS = 200;
const MIN_CALIBRATION_SPAN = 500;
const SAMPLE_WINDOW = 10;
const GRAPH_SAMPLE_LIMIT = 100;
const STABLE_SPREAD_COUNTS = 10;

export default function GrinderPositionCalibration({ formData, onChange }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState('intro');
  const [fineRaw, setFineRaw] = useState(formData?.grinderRawFine ?? null);
  const [coarseRaw, setCoarseRaw] = useState(formData?.grinderRawCoarse ?? null);
  const [steps, setSteps] = useState(formData?.grinderSteps ?? DEFAULT_STEPS);
  const [reverseDirection, setReverseDirection] = useState(
    formData?.grinderReverseDirection ?? false,
  );
  const [testMode, setTestMode] = useState(false);
  const [saveState, setSaveState] = useState('idle');
  const [rawSamples, setRawSamples] = useState([]);
  const [graphSamples, setGraphSamples] = useState([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [fineReached, setFineReached] = useState(false);
  const [middleReached, setMiddleReached] = useState(false);
  const [coarseReached, setCoarseReached] = useState(false);

  const currentRaw = machine.value.status.currentGrinderPositionRaw ?? null;
  const statusTimestamp = machine.value.status.timestamp;

  useEffect(() => {
    if (currentRaw === null) {
      setRawSamples([]);
      return;
    }

    setRawSamples(previous => [...previous, currentRaw].slice(-SAMPLE_WINDOW));
    setGraphSamples(previous => [...previous, currentRaw].slice(-GRAPH_SAMPLE_LIMIT));
  }, [currentRaw, statusTimestamp]);

  useEffect(() => {
    if (!Number.isFinite(fineRaw) || !Number.isFinite(coarseRaw)) {
      return;
    }

    setFineReached(false);
    setMiddleReached(false);
    setCoarseReached(false);
  }, [fineRaw, coarseRaw, steps, reverseDirection]);

  const sensorNoise =
    rawSamples.length > 0 ? Math.max(...rawSamples) - Math.min(...rawSamples) : null;

  const sensorStable =
    rawSamples.length >= SAMPLE_WINDOW &&
    sensorNoise !== null &&
    sensorNoise <= STABLE_SPREAD_COUNTS;

  const averagedRaw =
    rawSamples.length === 0
      ? null
      : Math.round(
          rawSamples.reduce((total, sample) => total + sample, 0) / rawSamples.length,
        );

  const calibrationSpan = useMemo(() => {
    if (!Number.isFinite(fineRaw) || !Number.isFinite(coarseRaw)) {
      return 0;
    }
    return Math.abs(coarseRaw - fineRaw);
  }, [fineRaw, coarseRaw]);

  const stepsValid = Number.isInteger(steps) && steps >= MIN_STEPS && steps <= MAX_STEPS;
  const endpointsValid =
    Number.isFinite(fineRaw) &&
    Number.isFinite(coarseRaw) &&
    calibrationSpan >= MIN_CALIBRATION_SPAN;
  const calibrated = endpointsValid && stepsValid;

  const mappedPosition = useMemo(() => {
    if (!calibrated || currentRaw === null) {
      return null;
    }

    const range = coarseRaw - fineRaw;
    if (range === 0) {
      return null;
    }

    const ratio = Math.max(0, Math.min(1, (currentRaw - fineRaw) / range));
    return reverseDirection ? 1 - ratio : ratio;
  }, [calibrated, currentRaw, fineRaw, coarseRaw, reverseDirection]);

  const currentStep =
    mappedPosition === null ? null : 1 + Math.round(mappedPosition * (steps - 1));

  useEffect(() => {
    if (mappedPosition === null) {
      return;
    }

    if (mappedPosition <= 0.05) {
      setFineReached(true);
    }
    if (mappedPosition >= 0.45 && mappedPosition <= 0.55) {
      setMiddleReached(true);
    }
    if (mappedPosition >= 0.95) {
      setCoarseReached(true);
    }
  }, [mappedPosition]);

  const direction =
    !Number.isFinite(fineRaw) || !Number.isFinite(coarseRaw)
      ? 'Unknown'
      : reverseDirection
        ? 'Displayed direction reversed'
        : coarseRaw > fineRaw
          ? 'ADC increases toward coarse'
          : 'ADC decreases toward coarse';

  const reverseSuggested =
    Number.isFinite(fineRaw) && Number.isFinite(coarseRaw) && coarseRaw < fineRaw;

  const validationMessage = useMemo(() => {
    if (!Number.isFinite(fineRaw) || !Number.isFinite(coarseRaw)) {
      return 'Capture or manually enter both endpoints.';
    }
    if (fineRaw === coarseRaw) {
      return 'Fine and coarse endpoints must be different.';
    }
    if (calibrationSpan < MIN_CALIBRATION_SPAN) {
      return `Calibration span must be at least ${MIN_CALIBRATION_SPAN} ADC counts.`;
    }
    if (!stepsValid) {
      return `Step count must be a whole number between ${MIN_STEPS} and ${MAX_STEPS}.`;
    }
    return null;
  }, [fineRaw, coarseRaw, calibrationSpan, stepsValid]);

  const updateFormField = useCallback(
    (name, value) => {
      onChange?.({ target: { name, value } });
    },
    [onChange],
  );

  const markEdited = useCallback(() => setSaveState('idle'), []);

  const startWizard = useCallback(() => {
    setWizardStep('intro');
    setWizardOpen(true);
    setTestMode(false);
    setSaveState('idle');
  }, []);

  const captureFine = useCallback(() => {
    if (!sensorStable || averagedRaw === null) return;
    setFineRaw(averagedRaw);
    setRawSamples([]);
    setWizardStep('coarse');
    markEdited();
  }, [sensorStable, averagedRaw, markEdited]);

  const captureCoarse = useCallback(() => {
    if (!sensorStable || averagedRaw === null || fineRaw === null) return;
    if (Math.abs(averagedRaw - fineRaw) < MIN_CALIBRATION_SPAN) return;

    setCoarseRaw(averagedRaw);
    setRawSamples([]);
    setWizardStep('steps');
    markEdited();
  }, [sensorStable, averagedRaw, fineRaw, markEdited]);

  const persistCalibration = useCallback(() => {
    updateFormField('grinderRawFine', fineRaw);
    updateFormField('grinderRawCoarse', coarseRaw);
    updateFormField('grinderSteps', steps);
    updateFormField('grinderReverseDirection', reverseDirection);
  }, [fineRaw, coarseRaw, steps, reverseDirection, updateFormField]);

  const applyCalibration = useCallback(() => {
    if (!calibrated) return;
    setSaveState('saving');
    persistCalibration();
    setSaveState('saved');
    setWizardStep('verify');
  }, [calibrated, persistCalibration]);

  const applyManualCalibration = useCallback(() => {
    if (!calibrated) return;
    setSaveState('saving');
    persistCalibration();
    setSaveState('saved');
  }, [calibrated, persistCalibration]);

  const applyStepCount = useCallback(() => {
    if (!stepsValid || !endpointsValid) return;
    setSaveState('saving');
    updateFormField('grinderSteps', steps);
    setSaveState('saved');
  }, [stepsValid, endpointsValid, steps, updateFormField]);

  const restoreDefaults = useCallback(() => {
    setFineRaw(null);
    setCoarseRaw(null);
    setSteps(DEFAULT_STEPS);
    setReverseDirection(false);
    setWizardOpen(false);
    setWizardStep('intro');
    setTestMode(false);
    setSaveState('idle');
    setShowRestoreConfirm(false);
    setFineReached(false);
    setMiddleReached(false);
    setCoarseReached(false);

    updateFormField('grinderRawFine', null);
    updateFormField('grinderRawCoarse', null);
    updateFormField('grinderSteps', DEFAULT_STEPS);
    updateFormField('grinderReverseDirection', false);
  }, [updateFormField]);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardStep('intro');
    setSaveState('idle');
  }, []);

  const copyCalibration = useCallback(async () => {
    const payload = {
      fine: fineRaw,
      coarse: coarseRaw,
      steps,
      reverse: reverseDirection,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [fineRaw, coarseRaw, steps, reverseDirection]);

  const liveStatusProps = {
    currentRaw,
    currentStep,
    steps,
    mappedPosition,
    sensorStable,
    sensorNoise,
    fineRaw,
    coarseRaw,
  };

  const verificationProps = {
    fineReached,
    middleReached,
    coarseReached,
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
        reverseDirection={reverseDirection}
        setReverseDirection={setReverseDirection}
        reverseSuggested={reverseSuggested}
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
        sensorNoise={sensorNoise}
        currentRaw={currentRaw}
        liveStatusProps={liveStatusProps}
        {...verificationProps}
      />
    );
  }

  return (
    <div className='space-y-5'>
      <GrinderStatusPanel {...liveStatusProps} />

      <CalibrationGraph
        samples={graphSamples}
        fineRaw={fineRaw}
        coarseRaw={coarseRaw}
        currentRaw={currentRaw}
      />

      <div className='divider my-1'>Calibration</div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        <div className='rounded-box border-base-300 bg-base-100 border p-4'>
          <label className='text-base-content/70 text-sm' htmlFor='grinderFineEndpoint'>
            Fine endpoint
          </label>
          <input
            id='grinderFineEndpoint'
            type='number'
            className='input input-bordered mt-2 w-full text-lg font-semibold'
            value={fineRaw ?? ''}
            placeholder='Not calibrated'
            onChange={event => {
              const value = Number.parseInt(event.target.value, 10);
              setFineRaw(Number.isFinite(value) ? value : null);
              markEdited();
            }}
          />
          <div className='text-base-content/60 mt-2 text-sm'>Raw ADC reading</div>
        </div>

        <div className='rounded-box border-base-300 bg-base-100 border p-4'>
          <label className='text-base-content/70 text-sm' htmlFor='grinderCoarseEndpoint'>
            Coarse endpoint
          </label>
          <input
            id='grinderCoarseEndpoint'
            type='number'
            className='input input-bordered mt-2 w-full text-lg font-semibold'
            value={coarseRaw ?? ''}
            placeholder='Not calibrated'
            onChange={event => {
              const value = Number.parseInt(event.target.value, 10);
              setCoarseRaw(Number.isFinite(value) ? value : null);
              markEdited();
            }}
          />
          <div className='text-base-content/60 mt-2 text-sm'>Raw ADC reading</div>
        </div>
      </div>

      <div className='rounded-box border-base-300 bg-base-100 border p-4'>
        <label className='flex cursor-pointer items-center justify-between gap-4'>
          <div>
            <div className='font-medium'>Reverse displayed direction</div>
            <div className='text-base-content/60 mt-1 text-sm'>
              Flip the displayed step numbering without changing the captured endpoints.
            </div>
          </div>
          <input
            type='checkbox'
            className='toggle toggle-primary'
            checked={reverseDirection}
            onChange={event => {
              setReverseDirection(event.target.checked);
              markEdited();
            }}
          />
        </label>
      </div>

      {reverseSuggested && !reverseDirection && (
        <div className='alert alert-info'>
          <span>
            The ADC count decreases toward coarse. Endpoint mapping already supports this; use
            Reverse only when you prefer the displayed numbers to run the other way.
          </span>
        </div>
      )}

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

      <CalibrationQuality calibrationSpan={calibrationSpan} sensorNoise={sensorNoise} />

      {validationMessage && (
        <div className='alert alert-error'>
          <span>{validationMessage}</span>
        </div>
      )}

      <GrinderStepSettings
        steps={steps}
        setSteps={value => {
          setSteps(value);
          markEdited();
        }}
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
          className='btn btn-success'
          onClick={applyManualCalibration}
          disabled={!calibrated || saveState === 'saving'}
        >
          {saveState === 'saving' ? 'Applying…' : 'Apply Edited Calibration'}
        </button>

        <button
          type='button'
          className='btn btn-outline'
          onClick={() => setTestMode(value => !value)}
          disabled={!calibrated}
        >
          {testMode ? 'Close Test Mode' : 'Test Calibration'}
        </button>

        <button
          type='button'
          className='btn btn-outline'
          onClick={copyCalibration}
          disabled={!calibrated}
        >
          {copyState === 'copied' ? 'Copied' : 'Copy Calibration'}
        </button>

        <button
          type='button'
          className='btn btn-ghost'
          onClick={() => setShowRestoreConfirm(true)}
        >
          Restore Defaults
        </button>
      </div>

      {copyState === 'failed' && (
        <div className='alert alert-error'>
          <span>Could not copy calibration to the clipboard.</span>
        </div>
      )}

      {saveState === 'saved' && (
        <div className='alert alert-success'>
          <span>Grinder calibration settings updated.</span>
        </div>
      )}

      {testMode && calibrated && (
        <GrinderTestPanel {...liveStatusProps} {...verificationProps} />
      )}

      <details className='collapse-arrow bg-base-200 collapse'>
        <summary className='collapse-title font-medium'>Advanced diagnostics</summary>
        <div className='collapse-content'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            <div>Raw ADC: {currentRaw ?? '—'}</div>
            <div>Averaged ADC: {averagedRaw ?? '—'}</div>
            <div>Calibration span: {calibrationSpan || '—'}</div>
            <div>Direction: {direction}</div>
            <div>Sensor spread: {sensorNoise === null ? '—' : sensorNoise}</div>
            <div>Sample count: {rawSamples.length}</div>
          </div>
        </div>
      </details>

      {showRestoreConfirm && (
        <div className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='text-lg font-bold'>Restore grinder calibration defaults?</h3>
            <p className='py-4'>
              This clears both captured endpoints, resets the step count to {DEFAULT_STEPS}, and
              turns off reverse direction.
            </p>
            <div className='modal-action'>
              <button
                type='button'
                className='btn btn-ghost'
                onClick={() => setShowRestoreConfirm(false)}
              >
                Cancel
              </button>
              <button type='button' className='btn btn-error' onClick={restoreDefaults}>
                Restore Defaults
              </button>
            </div>
          </div>
          <button
            type='button'
            className='modal-backdrop'
            aria-label='Close'
            onClick={() => setShowRestoreConfirm(false)}
          />
        </div>
      )}
    </div>
  );
}
