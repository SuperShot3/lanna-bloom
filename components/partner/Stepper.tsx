'use client';

type StepperProps = {
  steps: string[];
  current: number;
};

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="partner-stepper">
      {steps.map((label, i) => (
        <div key={i} className="partner-stepper-item">
          <div className="partner-stepper-col">
            <div
              className={`partner-stepper-dot ${
                i < current ? 'done' : i === current ? 'active' : ''
              }`}
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`partner-stepper-label ${i === current ? 'active' : ''}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`partner-stepper-line ${i < current ? 'done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}
