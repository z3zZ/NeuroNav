import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Battery, TrendingUp } from 'lucide-react';

interface ReflectionProps {
  onComplete: (feedback: ReflectionData) => void;
  onSkip: () => void;
}

export interface ReflectionData {
  workload: 'too-little' | 'just-right' | 'too-much';
  energyAfter: number;
  wouldContinue: boolean;
}

export function Reflection({ onComplete, onSkip }: ReflectionProps) {
  const [workload, setWorkload] = useState<'too-little' | 'just-right' | 'too-much' | null>(null);
  const [energyAfter, setEnergyAfter] = useState(50);
  const [wouldContinue, setWouldContinue] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (workload && wouldContinue !== null) {
      onComplete({
        workload,
        energyAfter,
        wouldContinue,
      });
    }
  };

  const canSubmit = workload !== null && wouldContinue !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-8"
    >
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Heart className="text-purple-600" size={32} />
          </motion.div>
          <h2 className="text-2xl mb-2">How did that go?</h2>
          <p className="text-gray-600">
            Your feedback helps us adjust the plan. There are no wrong answers.
          </p>
        </div>

        {/* Workload Question */}
        <div className="mb-8">
          <label className="block text-lg font-medium mb-4">
            Was that...
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'too-little', label: 'Too little', emoji: '😌' },
              { value: 'just-right', label: 'Just right', emoji: '😊' },
              { value: 'too-much', label: 'Too much', emoji: '😰' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setWorkload(option.value as any)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  workload === option.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-4xl mb-2">{option.emoji}</div>
                <div className="font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Energy Level After */}
        <div className="mb-8">
          <label className="block text-lg font-medium mb-4 flex items-center gap-2">
            <Battery className="text-green-500" size={20} />
            Energy level now
          </label>
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max="100"
              value={energyAfter}
              onChange={(e) => setEnergyAfter(Number(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>Drained</span>
              <span className="font-medium text-gray-700">{energyAfter}%</span>
              <span>Energized</span>
            </div>
          </div>
        </div>

        {/* Would Continue Question */}
        <div className="mb-8">
          <label className="block text-lg font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-500" size={20} />
            Could you keep going?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setWouldContinue(true)}
              className={`p-6 rounded-xl border-2 transition-all ${
                wouldContinue === true
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">✓</div>
              <div className="font-medium">Yes, I could</div>
            </button>
            <button
              onClick={() => setWouldContinue(false)}
              className={`p-6 rounded-xl border-2 transition-all ${
                wouldContinue === false
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">✕</div>
              <div className="font-medium">No, I need a break</div>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-3 rounded-lg transition-colors ${
              canSubmit
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-center text-gray-500 mt-4">
          This information stays on your device and helps adjust your plan
        </p>
      </div>
    </motion.div>
  );
}
