import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Calendar, Battery, Clock, AlertCircle } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  examDate: string;
  difficulty: 'easy' | 'moderate' | 'challenging';
  energyDrain: 'low' | 'medium' | 'high';
}

interface OnboardingData {
  subjects: Subject[];
  dailyEnergy: number;
  sessionLength: 'short' | 'medium' | 'long';
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
}

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  // Load saved progress from localStorage
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('neuronav_onboarding_step');
    return saved ? parseInt(saved) : 0;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem('neuronav_onboarding_subjects');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentSubject, setCurrentSubject] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy' | 'moderate' | 'challenging'>('moderate');
  const [currentEnergyDrain, setCurrentEnergyDrain] = useState<'low' | 'medium' | 'high'>('medium');

  const [dailyEnergy, setDailyEnergy] = useState(() => {
    const saved = localStorage.getItem('neuronav_onboarding_energy');
    return saved ? parseInt(saved) : 50;
  });

  const [sessionLength, setSessionLength] = useState<'short' | 'medium' | 'long'>(() => {
    const saved = localStorage.getItem('neuronav_onboarding_session');
    return (saved as 'short' | 'medium' | 'long') || 'medium';
  });

  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible'>(() => {
    const saved = localStorage.getItem('neuronav_onboarding_time');
    return (saved as 'morning' | 'afternoon' | 'evening' | 'flexible') || 'flexible';
  });

  // Auto-save progress to localStorage
  useEffect(() => {
    localStorage.setItem('neuronav_onboarding_step', step.toString());
  }, [step]);

  useEffect(() => {
    if (subjects.length > 0) {
      localStorage.setItem('neuronav_onboarding_subjects', JSON.stringify(subjects));
    }
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('neuronav_onboarding_energy', dailyEnergy.toString());
  }, [dailyEnergy]);

  useEffect(() => {
    localStorage.setItem('neuronav_onboarding_session', sessionLength);
  }, [sessionLength]);

  useEffect(() => {
    localStorage.setItem('neuronav_onboarding_time', preferredTime);
  }, [preferredTime]);

  const totalSteps = 5;

  const addSubject = () => {
    if (currentSubject && currentDate) {
      setSubjects([
        ...subjects,
        {
          id: crypto.randomUUID(),
          name: currentSubject,
          examDate: currentDate,
          difficulty: currentDifficulty,
          energyDrain: currentEnergyDrain,
        },
      ]);
      setCurrentSubject('');
      setCurrentDate('');
      setCurrentDifficulty('moderate');
      setCurrentEnergyDrain('medium');
    }
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const nextStep = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      onComplete({
        subjects,
        dailyEnergy,
        sessionLength,
        preferredTime,
      });
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return subjects.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        {/* Auto-save indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Auto-saving your progress
          </p>
        </motion.div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step
                    ? 'w-12 bg-blue-500'
                    : i < step
                      ? 'w-8 bg-blue-300'
                      : 'w-8 bg-gray-200'
                }`}
                initial={false}
                animate={{
                  width: i === step ? 48 : 32,
                }}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-600">
            Step {step + 1} of {totalSteps}
          </p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            {step === 0 && (
              <div>
                <h2 className="text-2xl mb-4">Welcome 👋</h2>
                <p className="text-lg text-gray-700 mb-6">
                  This tool helps you plan your revision in a way that works with your brain, not against it.
                </p>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Important:</strong> This tool does not diagnose conditions or replace professional support. It's designed to help you organise your study time in a flexible, low-pressure way.
                  </p>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>You can change your plan any time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>There are no "right" or "wrong" answers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>Your information stays on your device only</span>
                  </li>
                </ul>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-2xl mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-500" size={28} />
                  Your Subjects
                </h2>
                <p className="text-gray-600 mb-6">
                  Add the subjects you need to revise. You can always come back and edit these.
                </p>

                <div className="space-y-4 mb-6">
                  <input
                    type="text"
                    placeholder="Subject name"
                    value={currentSubject}
                    onChange={(e) => setCurrentSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                    aria-label="Subject name"
                  />

                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
                    aria-label="Exam date"
                  />

                  <div>
                    <label className="block text-sm mb-2">How challenging is this subject for you?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'easy', label: 'Easier', emoji: '😊' },
                        { value: 'moderate', label: 'Medium', emoji: '🤔' },
                        { value: 'challenging', label: 'Harder', emoji: '😰' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCurrentDifficulty(option.value as any)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            currentDifficulty === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-2xl mb-1">{option.emoji}</div>
                          <div className="text-sm">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">How much energy does this subject take?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'low', label: 'Light', emoji: '⚡' },
                        { value: 'medium', label: 'Medium', emoji: '⚡⚡' },
                        { value: 'high', label: 'Draining', emoji: '⚡⚡⚡' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setCurrentEnergyDrain(option.value as any)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            currentEnergyDrain === option.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xl mb-1">{option.emoji}</div>
                          <div className="text-sm">{option.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={addSubject}
                    disabled={!currentSubject || !currentDate}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    Add Subject
                  </button>
                </div>

                {subjects.length > 0 && (
                  <div className="space-y-2">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{subject.name}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(subject.examDate).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => removeSubject(subject.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {subjects.length > 5 && (
                  <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                    <p className="text-sm text-gray-700">
                      You've added quite a few subjects. That's okay, but remember: it's better to focus deeply on a few things than rush through everything.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl mb-4 flex items-center gap-2">
                  <Battery className="text-green-500" size={28} />
                  Your Daily Energy
                </h2>
                <p className="text-gray-600 mb-6">
                  How much energy do you typically have for focused work each day? This can change day-to-day, and that's completely normal.
                </p>

                <div className="mb-6">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-gray-600">Lower energy</span>
                    <span className="text-gray-600">Higher energy</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dailyEnergy}
                    onChange={(e) => setDailyEnergy(Number(e.target.value))}
                    className="w-full h-3 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer"
                    aria-label="Daily energy level"
                  />
                  <div className="text-center mt-4">
                    <span className="text-2xl font-medium">{dailyEnergy}%</span>
                  </div>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-gray-700">
                    {dailyEnergy < 30 && "Low energy days are valid. We'll keep your plan gentle."}
                    {dailyEnergy >= 30 && dailyEnergy < 70 && "Moderate energy is perfect for steady, sustainable work."}
                    {dailyEnergy >= 70 && "High energy is great, but remember to build in rest breaks."}
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl mb-4 flex items-center gap-2">
                  <Clock className="text-purple-500" size={28} />
                  Study Session Length
                </h2>
                <p className="text-gray-600 mb-6">
                  How long can you typically focus before needing a break? There's no "best" length – it's what works for you.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      value: 'short',
                      label: '25 minutes',
                      desc: 'Quick focus bursts',
                      break: '5 min breaks',
                    },
                    {
                      value: 'medium',
                      label: '45 minutes',
                      desc: 'Balanced sessions',
                      break: '10 min breaks',
                    },
                    {
                      value: 'long',
                      label: '90 minutes',
                      desc: 'Deep work blocks',
                      break: '15 min breaks',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSessionLength(option.value as any)}
                      className={`p-6 rounded-xl border-2 transition-all text-left ${
                        sessionLength === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xl font-medium mb-2">{option.label}</div>
                      <div className="text-sm text-gray-600 mb-1">{option.desc}</div>
                      <div className="text-xs text-gray-500">{option.break}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl mb-4">When do you work best?</h2>
                <p className="text-gray-600 mb-6">
                  Some people are morning people, others aren't. When do you feel most able to focus?
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'morning', label: 'Morning', emoji: '🌅' },
                    { value: 'afternoon', label: 'Afternoon', emoji: '☀️' },
                    { value: 'evening', label: 'Evening', emoji: '🌙' },
                    { value: 'flexible', label: 'It varies', emoji: '🔄' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPreferredTime(option.value as any)}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        preferredTime === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{option.emoji}</div>
                      <div className="font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={step === 0}
            className="px-6 py-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-2"
          >
            {step === totalSteps - 1 ? 'Create My Plan' : 'Continue'}
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Skip this step
          </button>
        </div>
      </motion.div>
    </div>
  );
}