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
    <div
      className="relative flex flex-col gap-4"
      style={{ width: '20px', marginLeft: '8px', marginRight: '-4px' }}
    >
      {/* Grey background line — from first dot center to last dot center */}
      <div
        className="absolute left-1/2 w-0.5 -translate-x-1/2 bg-gray-200"
        style={{
          top: `calc(${(0.5 / fieldCount) * 100}%)`,
          bottom: `calc(${(0.5 / fieldCount) * 100}%)`,
        }}
      />

      {/* Animated blue fill line — same bounds as grey track, height as fraction of track */}
      <motion.div
        className="absolute left-1/2 w-0.5 -translate-x-1/2"
        animate={{
          height:
            activeIndex >= 0 && fieldCount > 1
              ? `calc((100% - ${(1 / fieldCount) * 90}%) * ${activeIndex / (fieldCount - 1)} - 10px)`
              : '0%',
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{
          top: `calc(${(0.5 / fieldCount) * 105}% - 2px)`,
          backgroundColor: '#3b82f6',
        }}
      />

      {/* Dots */}
      {Array.from({ length: fieldCount }).map((_, index) => {
        const isActive = index <= activeIndex;
        const isCurrent = index === activeIndex;

        return (
          <div
            key={index}
            className="relative flex items-center justify-center"
            style={{ flex: '1 1 0px', minHeight: '40px' }}
          >
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
