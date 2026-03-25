interface TimelineStep {
  label: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
}

interface ProvenanceTimelineProps {
  steps: TimelineStep[];
}

const statusStyles = {
  completed: {
    dot: 'bg-green-500',
    line: 'bg-green-300',
    label: 'text-gray-900',
    desc: 'text-gray-600',
  },
  current: {
    dot: 'bg-blue-500 ring-4 ring-blue-100',
    line: 'bg-gray-200',
    label: 'text-blue-700 font-semibold',
    desc: 'text-gray-600',
  },
  pending: {
    dot: 'bg-gray-300',
    line: 'bg-gray-200',
    label: 'text-gray-400',
    desc: 'text-gray-400',
  },
};

export default function ProvenanceTimeline({ steps }: ProvenanceTimelineProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
        Provenance Timeline
      </h3>
      <div className="relative">
        {steps.map((step, index) => {
          const styles = statusStyles[step.status];
          const isLast = index === steps.length - 1;

          return (
            <div key={`${step.label}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[9px] top-5 w-0.5 h-full ${styles.line}`}
                />
              )}
              {/* Dot */}
              <div className="relative z-10 flex-shrink-0 mt-1">
                <div className={`w-[18px] h-[18px] rounded-full ${styles.dot}`} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm ${styles.label}`}>{step.label}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{step.timestamp}</span>
                </div>
                <p className={`text-sm mt-0.5 ${styles.desc}`}>{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
