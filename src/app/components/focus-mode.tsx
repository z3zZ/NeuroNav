import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, SkipForward, CheckCircle } from 'lucide-react';

interface FocusModeProps {
  task: {
    subject: string;
    duration: number;
    decomposed?: string[];
  };
  onComplete: () => void;
  onExit: () => void;
}

export function FocusMode({ task, onComplete, onExit }: FocusModeProps) {
  const [timeLeft, setTimeLeft] = useState(task.duration * 60); // Convert to seconds
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((task.duration * 60 - timeLeft) / (task.duration * 60)) * 100;

  const handleComplete = () => {
    setIsRunning(false);
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 z-50 flex items-center justify-center p-4"
    >
      <div className="max-w-2xl w-full">
        {/* Exit Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onExit}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            aria-label="Exit focus mode"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
        >
          {/* Subject Title */}
          <h1 className="text-3xl md:text-4xl text-center mb-8">
            {task.subject}
          </h1>

          {/* Timer Display */}
          <div className="mb-8">
            <div className="relative w-64 h-64 mx-auto mb-6">
              {/* Progress Ring */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 120}`}
                  strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progress / 100) }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl md:text-6xl font-mono">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {isRunning ? 'In progress' : 'Paused'}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsRunning(!isRunning)}
                className="w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 shadow-lg"
                aria-label={isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleComplete}
                className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 shadow-lg"
                aria-label="Mark as complete"
              >
                <CheckCircle size={28} />
              </motion.button>
            </div>
          </div>

          {/* Task Breakdown */}
          {task.decomposed && task.decomposed.length > 0 && (
            <div className="border-t-2 border-gray-100 pt-6">
              <h3 className="text-lg font-medium mb-4 text-center">Break it down</h3>
              <div className="space-y-3">
                {task.decomposed.map((step, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      currentStep === index
                        ? 'border-blue-500 bg-blue-50'
                        : index < currentStep
                          ? 'border-green-200 bg-green-50 opacity-60'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          index < currentStep
                            ? 'bg-green-500 border-green-500'
                            : currentStep === index
                              ? 'border-blue-500'
                              : 'border-gray-300'
                        }`}
                      >
                        {index < currentStep && (
                          <CheckCircle size={16} className="text-white" />
                        )}
                      </div>
                      <span className={index < currentStep ? 'line-through text-gray-500' : ''}>
                        {step}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => setCurrentStep(Math.min(currentStep + 1, task.decomposed!.length))}
                className="mt-4 w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <SkipForward size={18} />
                Next Step
              </button>
            </div>
          )}

          {/* Encouraging Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 text-center"
          >
            <p className="text-sm text-gray-500">
              You can stop any time. There's no pressure.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
