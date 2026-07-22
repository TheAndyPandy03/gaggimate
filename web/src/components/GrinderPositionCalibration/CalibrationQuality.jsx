export function getCalibrationQuality(calibrationSpan, sensorNoise) {
  if (!Number.isFinite(calibrationSpan) || calibrationSpan <= 0) {
    return {
      label: 'Not available',
      detail: 'Capture both endpoints to assess calibration quality.',
      className: 'alert-warning',
      stars: 0,
    };
  }

  const noise = Number.isFinite(sensorNoise) ? sensorNoise : 0;
  const signalToNoise = calibrationSpan / Math.max(1, noise);

  if (calibrationSpan >= 20000 && signalToNoise >= 1000) {
    return {
      label: 'Excellent',
      detail: 'Wide sensor range with very low noise.',
      className: 'alert-success',
      stars: 5,
    };
  }

  if (calibrationSpan >= 10000 && signalToNoise >= 400) {
    return {
      label: 'Good',
      detail: 'Strong sensor range and suitable stability.',
      className: 'alert-success',
      stars: 4,
    };
  }

  if (calibrationSpan >= 5000 && signalToNoise >= 150) {
    return {
      label: 'Fair',
      detail: 'Usable calibration, but check mounting and wiring if readings jump.',
      className: 'alert-warning',
      stars: 3,
    };
  }

  return {
    label: 'Poor',
    detail: 'The range is narrow or noisy. Check the potentiometer travel and wiring.',
    className: 'alert-error',
    stars: 1,
  };
}

export default function CalibrationQuality({ calibrationSpan, sensorNoise }) {
  const quality = getCalibrationQuality(calibrationSpan, sensorNoise);

  return (
    <div className={`alert ${quality.className}`}>
      <div>
        <div className='font-semibold'>
          Calibration quality: {quality.label}
        </div>
        <div aria-label={`${quality.stars} out of 5 stars`}>
          {'★'.repeat(quality.stars)}
          {'☆'.repeat(5 - quality.stars)}
        </div>
        <div className='text-sm'>{quality.detail}</div>
      </div>
    </div>
  );
}
