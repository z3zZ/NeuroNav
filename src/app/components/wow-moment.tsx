import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface WowMomentProps {
  onComplete: () => void;
}

export function WowMoment({ onComplete }: WowMomentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
        className="text-center max-w-2xl"
      >
        {/* Sparkle Animation */}
        <motion.div
          initial={{ rotate: 0, scale: 0 }}
          animate={{ rotate: 360, scale: 1 }}
          transition={{ delay: 0.5, duration: 1, type: 'spring' }}
          className="w-24 h-24 mx-auto mb-8"
        >
          <Sparkles className="w-full h-full text-white" />
        </motion.div>

        {/* Main Message */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-4xl md:text-5xl font-bold text-white mb-6"
        >
          Your plan is ready
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed"
        >
          This plan adapts to how your brain works.
          <br />
          You can change it any time.
        </motion.p>

        {/* Key Points */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8"
        >
          <div className="space-y-4 text-white/90 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>No rigid schedules – just flexible guidance</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>Built-in breaks that actually help you learn</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">✓</span>
              <span>Adjusts to your energy and needs each day</span>
            </div>
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
          className="px-8 py-4 bg-white text-purple-600 rounded-xl text-lg font-medium shadow-2xl hover:shadow-3xl transition-all"
        >
          Let's see my plan
        </motion.button>

        {/* Subtle hint about accessibility */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.6 }}
          className="mt-6 text-white/60 text-sm"
        >
          Look for the settings button in the bottom right to customise how this looks →
        </motion.p>
      </motion.div>

      {/* Animated Background Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: 0,
          }}
          animate={{
            y: [null, Math.random() * window.innerHeight],
            scale: [0, 1, 0],
          }}
          transition={{
            delay: Math.random() * 2,
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            repeatDelay: Math.random() * 5,
          }}
          className="absolute w-2 h-2 bg-white rounded-full opacity-60"
        />
      ))}
    </motion.div>
  );
}
