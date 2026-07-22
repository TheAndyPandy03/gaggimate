import GrinderStatusPanel from './StatusPanel.jsx';

export default function GrinderTestPanel(props) {
  return (
    <div className='rounded-box border-primary bg-base-100 border p-4'>
      <div className='mb-3 text-lg font-semibold'>Test Calibration</div>

      <div className='alert alert-info mb-4'>
        <span>
          Rotate the grinder through its full adjustment range and confirm that the displayed
          position moves smoothly from the fine endpoint to the coarse endpoint.
        </span>
      </div>

      <GrinderStatusPanel {...props} />
    </div>
  );
}