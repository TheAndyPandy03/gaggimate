import GrinderStatusPanel from './StatusPanel.jsx';

export default function GrinderTestPanel({
  fineReached,
  middleReached,
  coarseReached,
  ...statusProps
}) {
  const checklist = [
    ['Fine reached', fineReached],
    ['Middle reached', middleReached],
    ['Coarse reached', coarseReached],
  ];

  return (
    <div className='rounded-box border-primary bg-base-100 border p-4'>
      <div className='mb-3 text-lg font-semibold'>Test Calibration</div>

      <div className='alert alert-info mb-4'>
        <span>
          Rotate the grinder through its full range. Each checkpoint will be marked automatically.
        </span>
      </div>

      <GrinderStatusPanel {...statusProps} />

      <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {checklist.map(([label, reached]) => (
          <div
            key={label}
            className={`rounded-box border p-3 text-center ${
              reached ? 'border-success bg-success/10' : 'border-base-300 bg-base-100'
            }`}
          >
            <div className='text-xl'>{reached ? '✓' : '○'}</div>
            <div>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
