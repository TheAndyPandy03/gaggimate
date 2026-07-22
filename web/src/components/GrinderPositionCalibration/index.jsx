import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { machine } from '../../services/ApiService.js';
import GrinderCalibrationWizard from './Wizard.jsx';
import GrinderStatusPanel from './StatusPanel.jsx';
import GrinderTestPanel from './TestPanel.jsx';
import GrinderStepSettings from './StepSettings.jsx';
import CalibrationGraph from './CalibrationGraph.jsx';
import CalibrationQuality from './CalibrationQuality.jsx';
import CalibrationDataPanel from './CalibrationDataPanel.jsx';
import ResetConfirmation from './ResetConfirmation.jsx';
import GrinderCalibrationValidation from './Validation.jsx';

const DEFAULT_STEPS = 30;
const MIN_STEPS = 2;
const MAX_STEPS = 200;
const MIN_CALIBRATION_SPAN = 500;
const SAMPLE_WINDOW = 10;
const GRAPH_SAMPLE_LIMIT = 100;
const STABLE_SPREAD_COUNTS = 10;
const OUTSIDE_RANGE_TOLERANCE = 0.03;

function parseNullableInteger(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function makeExportPayload(fineRaw, coarseRaw, steps, reverseDirection) {
  return {
    version: 1,
    grinderRawFine: fineRaw,
    grinderRawCoarse: coarseRaw,
    grinderSteps: steps,
    grinderReverseDirection: reverseDirection,
  };
}

function parseImportPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.version !== 1) {
    return null;
  }

  const fineRaw = Number(payload.grinderRawFine);
  const coarseRaw = Number(payload.grinderRawCoarse);
  const steps = Number(payload.grinderSteps);
  const reverseDirection = payload.grinderReverseDirection;

  if (
    !Number.isInteger(fineRaw) ||
    !Number.isInteger(coarseRaw) ||
    !Number.isInteger(steps) ||
    steps < MIN_STEPS ||
    steps > MAX_STEPS ||
    typeof reverseDirection !== 'boolean'
  ) {
    return null;
  }

  return {
    fineRaw,
    coarseRaw,
    steps,
    reverseDirection,
  };
}

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
  const [exportState, setExportState] = useState('idle');
  const [importState, setImportState] = useState('idle');
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

  const stepsValid =
    Number.isInteger(steps) &&
    steps >= MIN_STEPS &&
    steps <= MAX_STEPS;

  const endpointsValid =
    Number.isFinite(fineRaw) &&
    Number.isFinite(coarseRaw) &&
    fineRaw !== coarseRaw &&
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

  const unboundedPosition = useMemo(() => {
    if (!calibrated || currentRaw === null) {
      return null;
    }

    const range = coarseRaw - fineRaw;
    const ratio = (currentRaw - fineRaw) / range;
    return reverseDirection ? 1 - ratio : ratio;
  }, [calibrated, currentRaw, fineRaw, coarseRaw, reverseDirection]);

  const currentStep =
    mappedPosition === null
      ? null
      : 1 + Math.round(mappedPosition * (steps - 1));

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
    Number.isFinite(fineRaw) &&
    Number.isFinite(coarseRaw) &&
    coarseRaw < fineRaw;

  const validation = useMemo(() => {
    const errors = [];
    const warnings = [];

    if (!Number.isFinite(fineRaw) || !Number.isFinite(coarseRaw)) {
      errors.push('Capture or manually enter both endpoints.');
    } else {
      if (fineRaw === coarseRaw) {
        errors.push('Fine and coarse endpoints must be different.');
      } else if (calibrationSpan < MIN_CALIBRATION_SPAN) {
        errors.push(
          `Calibration span must be at least ${MIN_CALIBRATION_SPAN} ADC counts.`,
        );
      }
    }

    if (!stepsValid) {
      errors.push(
        `Step count must be a whole number between ${MIN_STEPS} and ${MAX_STEPS}.`,
      );
    }

    if (currentRaw === null) {
      warnings.push('No live grinder sensor reading is currently available.');
    }

    if (
      sensorNoise !== null &&
      rawSamples.length >= SAMPLE_WINDOW &&
      sensorNoise > STABLE_SPREAD_COUNTS
    ) {
      warnings.push(
        `Sensor spread is ${sensorNoise} counts. Check wiring or wait for the reading to settle.`,
      );
    }

    if (
      unboundedPosition !== null &&
      (unboundedPosition < -OUTSIDE_RANGE_TOLERANCE ||
        unboundedPosition > 1 + OUTSIDE_RANGE_TOLERANCE)
    ) {
      warnings.push(
        'The live reading is outside the calibrated endpoint range. Recheck the endpoints or mechanical travel.',
      );
    }

    return { errors, warnings };
  }, [
    fineRaw,
    coarseRaw,
    calibrationSpan,
    stepsValid,
    currentRaw,
    sensorNoise,
    rawSamples.length,
    unboundedPosition,
  ]);

  const updateFormField = useCallback(
    (name, value) => {
      onChange?.({ target: { name, value } });
    },
    [onChange],
  );

  const markEdited = useCallback(() => {
    setSaveState('idle');
    setExportState('idle');
    setImportState('idle');
  }, []);

  const updateFineRaw = useCallback(
    value => {
      setFineRaw(value);
      markEdited();
    },
    [markEdited],
  );

  const updateCoarseRaw = useCallback(
    value => {
      setCoarseRaw(value);
      markEdited();
    },
    [markEdited],
  );

  const updateSteps = useCallback(
    value => {
      setSteps(value);
      markEdited();
    },
    [markEdited],
  );

  const updateReverseDirection = useCallback(
    value => {
      setReverseDirection(value);
      markEdited();
    },
    [markEdited],
  );

  const startWizard = useCallback(() => {
    setWizardStep('intro');
    setWizardOpen(true);
    setTestMode(false);
    setSaveState('idle');
  }, []);

  const captureFine = useCallback(() => {
    if (!sensorStable || averagedRaw === null) {
      return;
    }

    updateFineRaw(averagedRaw);
    setRawSamples([]);
    setWizardStep('coarse');
  }, [sensorStable, averagedRaw, updateFineRaw]);

  const captureCoarse = useCallback(() => {
    if (!sensorStable || averagedRaw === null || fineRaw === null) {
      return;
    }

    if (Math.abs(averagedRaw - fineRaw) < MIN_CALIBRATION_SPAN) {
      return;
    }

    updateCoarseRaw(averagedRaw);
    setRawSamples([]);
    setWizardStep('steps');
  }, [sensorStable, averagedRaw, fineRaw, updateCoarseRaw]);

  const persistCalibration = useCallback(() => {
    updateFormField('grinderRawFine', fineRaw);
    updateFormField('grinderRawCoarse', coarseRaw);
    updateFormField('grinderSteps', steps);
    updateFormField('grinderReverseDirection', reverseDirection);
  }, [fineRaw, coarseRaw, steps, reverseDirection, updateFormField]);

  const applyCalibration = useCallback(() => {
    if (!calibrated) {
      return;
    }

    setSaveState('saving');
    persistCalibration();
    setSaveState('saved');
    setWizardStep('verify');
  }, [calibrated, persistCalibration]);

  const applyManualCalibration = useCallback(() => {
    if (!calibrated) {
      return;
    }

    setSaveState('saving');
    persistCalibration();
    setSaveState('saved');
  }, [calibrated, persistCalibration]);

  const applyStepCount = useCallback(() => {
    if (!stepsValid || !endpointsValid) {
      return;
    }

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
    setExportState('idle');
    setImportState('idle');
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

  const exportPayload = useMemo(
    () => makeExportPayload(fineRaw, coarseRaw, steps, reverseDirection),
    [fineRaw, coarseRaw, steps, reverseDirection],
  );

  const copyCalibration = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
      setExportState('copied');
    } catch {
      setExportState('failed');
    }
  }, [exportPayload]);

  const downloadCalibration = useCallback(() => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'grinder-calibration.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [exportPayload]);

  const importCalibration = useCallback(
    async event => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      try {
        const payload = JSON.parse(await file.text());
        const imported = parseImportPayload(payload);

        if (!imported) {
          setImportState('failed');
          return;
        }

        setFineRaw(imported.fineRaw);
        setCoarseRaw(imported.coarseRaw);
        setSteps(imported.steps);
        setReverseDirection(imported.reverseDirection);
        setSaveState('idle');
        setImportState('imported');
        setExportState('idle');
      } catch {
        setImportState('failed');
      }
    },
    [],
  );

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
        setSteps={updateSteps}
        reverseDirection={reverseDirection}
        setReverseDirection={updateReverseDirection}
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
            onChange={event => updateFineRaw(parseNullableInteger(event.target.value))}
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
            onChange={event => updateCoarseRaw(parseNullableInteger(event.target.value))}
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
            onChange={event => updateReverseDirection(event.target.checked)}
          />
        </label>
      </div>

      {reverseSuggested && !reverseDirection && (
        <div className='alert alert-info'>
          <span>
            The ADC count decreases toward coarse. Endpoint mapping already supports this;
            use Reverse only when you prefer the displayed numbers to run the other way.
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

      <CalibrationQuality
        calibrationSpan={calibrationSpan}
        sensorNoise={sensorNoise}
      />

      <GrinderCalibrationValidation
        errors={validation.errors}
        warnings={validation.warnings}
      />

      <GrinderStepSettings
        steps={steps}
        setSteps={updateSteps}
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
          className='btn btn-ghost'
          onClick={() => setShowRestoreConfirm(true)}
        >
          Restore Defaults
        </button>
      </div>

      {saveState === 'saved' && (
        <div className='alert alert-success'>
          <span>Grinder calibration settings updated.</span>
        </div>
      )}

      {testMode && calibrated && (
        <GrinderTestPanel {...liveStatusProps} {...verificationProps} />
      )}

      <CalibrationDataPanel
        fineRaw={fineRaw}
        coarseRaw={coarseRaw}
        steps={steps}
        reverseDirection={reverseDirection}
        calibrated={calibrated}
        importState={importState}
        exportState={exportState}
        onCopy={copyCalibration}
        onDownload={downloadCalibration}
        onImportFile={importCalibration}
      />

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

      <ResetConfirmation
        open={showRestoreConfirm}
        defaultSteps={DEFAULT_STEPS}
        onCancel={() => setShowRestoreConfirm(false)}
        onConfirm={restoreDefaults}
      />
    </div>
  );
}
