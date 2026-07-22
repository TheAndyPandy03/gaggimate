export default function GrinderCalibrationValidation({
  errors = [],
  warnings = [],
}) {
  return (
    <div className='space-y-3'>
      {errors.map(error => (
        <div key={error} className='alert alert-error'>
          <span>{error}</span>
        </div>
      ))}

      {warnings.map(warning => (
        <div key={warning} className='alert alert-warning'>
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
