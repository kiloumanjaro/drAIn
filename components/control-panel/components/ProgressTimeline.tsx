import { motion } from 'framer-motion';

interface ProgressTimelineProps {
  fieldCount: number;
  activeIndex: number;
}

export function ProgressTimeline({
  fieldCount,
  activeIndex,
}: ProgressTimelineProps) {
  return (
    <div className="relative flex flex-col gap-4" style={{ minWidth: '20px' }}>
      {/* Background vertical line */}
      <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-gray-200" />

      {/* Animated progress line */}
      <motion.div
        className="absolute top-0 left-1/2 w-[2px] origin-top -translate-x-1/2"
        initial={{ height: '0%' }}
        animate={{
          height:
            activeIndex >= 0
              ? `calc(${((activeIndex + 0.5) / fieldCount) * 100}%)`
              : '0%',
        }}
        transition={{
          type: 'spring',
          stiffness: 100,
          damping: 20,
        }}
        style={{
          backgroundColor: '#3b82f6',
        }}
      />

      {Array.from({ length: fieldCount }).map((_, index) => {
        const isActive = index <= activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <div
            key={index}
            className="relative flex flex-shrink-0 items-center justify-center"
            style={{
              minHeight: '64px', // Approximate card height
              flex: '1 1 auto',
            }}
          >
            {/* Dot */}
            <motion.div
              className={`relative z-10 h-3 w-3 rounded-full border-2 ${
                isActive
                  ? 'border-[#3b82f6] bg-[#3b82f6]'
                  : 'border-gray-300 bg-white'
              }`}
              animate={{
                scale: isCurrent ? [1, 1.3, 1] : 1,
                boxShadow: isCurrent
                  ? [
                      '0 0 0 0 rgba(59, 130, 246, 0)',
                      '0 0 0 8px rgba(59, 130, 246, 0.2)',
                      '0 0 0 0 rgba(59, 130, 246, 0)',
                    ]
                  : '0 0 0 0 rgba(59, 130, 246, 0)',
              }}
              transition={{
                scale: {
                  duration: 0.6,
                  repeat: isCurrent ? Infinity : 0,
                  repeatType: 'loop',
                },
                boxShadow: {
                  duration: 1.5,
                  repeat: isCurrent ? Infinity : 0,
                  repeatType: 'loop',
                },
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
