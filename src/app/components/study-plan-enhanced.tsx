import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  Clock,
  AlertCircle,
  Edit,
  Eye,
  List,
  Calendar as CalendarIcon,
  Printer,
  Zap,
} from 'lucide-react';

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

interface StudyBlock {
  id: string;
  subject: Subject;
  duration: number;
  type: 'study' | 'break';
  time: string;
  day: number;
  decomposed?: string[];
}

interface StudyPlanEnhancedProps {
  data: OnboardingData;
  onReset: () => void;
}

export function StudyPlanEnhanced({ data, onReset }: StudyPlanEnhancedProps) {
  const [todayDifficult, setTodayDifficult] = useState(false);
  const [currentDayEnergy, setCurrentDayEnergy] = useState(data.dailyEnergy);
  const [viewMode, setViewMode] = useState<'visual' | 'list' | 'calendar'>('visual');
  const [showDecomposition, setShowDecomposition] = useState<string | null>(null);

  // Generate study plan
  const generatePlan = (): StudyBlock[] => {
    const blocks: StudyBlock[] = [];
    const sessionDuration =
      data.sessionLength === 'short' ? 25 : data.sessionLength === 'medium' ? 45 : 90;
    const breakDuration =
      data.sessionLength === 'short' ? 5 : data.sessionLength === 'medium' ? 10 : 15;

    // Sort subjects by exam date and priority
    const sortedSubjects = [...data.subjects].sort((a, b) => {
      const dateA = new Date(a.examDate).getTime();
      const dateB = new Date(b.examDate).getTime();
      return dateA - dateB;
    });

    // Adjust plan based on current energy
    const energyFactor = currentDayEnergy / 100;
    const sessionsPerDay = Math.max(2, Math.floor(4 * energyFactor));

    let blockId = 0;
    let currentDay = 0;
    let sessionsToday = 0;

    sortedSubjects.forEach((subject) => {
      const daysUntilExam = Math.ceil(
        (new Date(subject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // More sessions for urgent exams
      const totalSessions =
        daysUntilExam <= 3 ? 4 : daysUntilExam <= 7 ? 3 : 2;

      for (let i = 0; i < totalSessions; i++) {
        if (sessionsToday >= sessionsPerDay) {
          currentDay++;
          sessionsToday = 0;
        }

        const baseTime =
          data.preferredTime === 'morning'
            ? 9
            : data.preferredTime === 'afternoon'
              ? 13
              : data.preferredTime === 'evening'
                ? 17
                : 10;

        const timeOffset = sessionsToday * ((sessionDuration + breakDuration) / 60);
        const currentTime = baseTime + timeOffset;
        const hours = Math.floor(currentTime);
        const minutes = Math.round((currentTime % 1) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // Task decomposition
        const decomposed = [
          `Read/review notes for ${subject.name}`,
          `Watch a short video or tutorial`,
          `Try 3-5 practice questions`,
          `Make a quick summary of key points`,
        ];

        blocks.push({
          id: `block-${blockId++}`,
          subject,
          duration: sessionDuration,
          type: 'study',
          time: timeStr,
          day: currentDay,
          decomposed,
        });

        sessionsToday++;

        // Add break
        if (i < totalSessions - 1) {
          const breakTime = currentTime + sessionDuration / 60;
          const breakHours = Math.floor(breakTime);
          const breakMinutes = Math.round((breakTime % 1) * 60);
          const breakTimeStr = `${breakHours.toString().padStart(2, '0')}:${breakMinutes.toString().padStart(2, '0')}`;

          blocks.push({
            id: `break-${blockId++}`,
            subject: { name: 'Break' } as Subject,
            duration: breakDuration,
            type: 'break',
            time: breakTimeStr,
            day: currentDay,
          });
        }
      }
    });

    return blocks;
  };

  const studyBlocks = generatePlan();

  const handleTodayDifficult = () => {
    setTodayDifficult(true);
    setCurrentDayEnergy(Math.max(20, currentDayEnergy - 30));
    setTimeout(() => setTodayDifficult(false), 3000);
  };

  const getPriorityColor = (subject: Subject) => {
    const daysUntilExam = Math.ceil(
      (new Date(subject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExam <= 3) return 'bg-red-100 border-red-300 text-red-900';
    if (daysUntilExam <= 7) return 'bg-yellow-100 border-yellow-300 text-yellow-900';
    return 'bg-blue-100 border-blue-300 text-blue-900';
  };

  const getDifficultyEmoji = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '😊';
      case 'moderate':
        return '🤔';
      case 'challenging':
        return '😰';
      default:
        return '📚';
    }
  };

  const todayBlocks = studyBlocks.filter(b => b.day === 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto p-8"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl mb-2">Your Flexible Revision Plan</h1>
              <p className="text-gray-600">
              This plan adapts to how your brain works. You can change it any time.
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 border-2 border-gray-200 rounded-lg hover:border-gray-300"
          >
            <Edit size={18} />
            Edit
          </button>
        </div>

        {/* Today's Energy Tracker */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-500" size={24} />
              <span className="font-medium text-lg">How are you feeling today?</span>
            </div>
            <span className="text-2xl">{currentDayEnergy}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentDayEnergy}
            onChange={(e) => setCurrentDayEnergy(Number(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg appearance-none cursor-pointer mb-4"
          />
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTodayDifficult}
              className="flex-1 py-3 bg-white border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2"
            >
              <AlertCircle size={18} />
              Today was hard
            </motion.button>
            <button
              onClick={() => window.print()}
              className="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
          {todayDifficult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-white rounded-lg border-2 border-green-200"
            >
              <p className="text-sm text-gray-700">
                Plan adjusted. Your upcoming tasks have been lightened. Remember: progress isn't linear, and taking care of yourself is part of the work.
              </p>
            </motion.div>
          )}
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'visual', label: 'Visual Blocks', icon: Eye },
            { value: 'list', label: 'Simple List', icon: List },
            { value: 'calendar', label: 'Calendar View', icon: CalendarIcon },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setViewMode(value as any)}
              className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                viewMode === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Blocks View */}
      {viewMode === 'visual' && (
        <div>
          <h2 className="text-xl mb-4">Today's Focus</h2>
          <div className="space-y-3 mb-8">
            <AnimatePresence>
              {todayBlocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-5 rounded-xl border-2 ${
                    block.type === 'break'
                      ? 'bg-green-50 border-green-200'
                      : getPriorityColor(block.subject)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {block.type === 'break' ? (
                          <Coffee size={20} className="text-green-600" />
                        ) : (
                          <Clock size={20} />
                        )}
                        <span className="font-medium">{block.time}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-medium">
                            {block.type === 'break' ? 'Break Time' : block.subject.name}
                          </span>
                          {block.type === 'study' && (
                            <span className="text-xl">
                              {getDifficultyEmoji(block.subject.difficulty)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {block.duration} minutes
                          {block.type === 'study' && block.subject.energyDrain === 'high' && (
                            <span className="ml-2 text-orange-600">⚡⚡⚡ Energy-intensive</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {block.type === 'study' && (
                      <button
                        onClick={() =>
                          setShowDecomposition(
                            showDecomposition === block.id ? null : block.id
                          )
                        }
                        className="px-3 py-1 text-sm bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400"
                      >
                        {showDecomposition === block.id ? 'Hide' : 'Break it down'}
                      </button>
                    )}
                  </div>

                  {showDecomposition === block.id && block.decomposed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t-2 border-gray-200"
                    >
                      <p className="text-sm mb-3 text-gray-600">Break this session into smaller steps:</p>
                      <ul className="space-y-2">
                        {block.decomposed.map((task, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-3">
                        You don't have to do all of these – pick what feels manageable.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white p-6 rounded-xl border-2 border-gray-200">
          <h2 className="text-xl mb-4">Simple Task List</h2>
          <ul className="space-y-2">
            {todayBlocks
              .filter(b => b.type === 'study')
              .map((block, i) => (
                <li key={block.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <input type="checkbox" className="w-5 h-5" />
                  <span>
                    {i + 1}. Study {block.subject.name} for {block.duration} minutes
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, day) => {
            const dayBlocks = studyBlocks.filter(b => b.day === day && b.type === 'study');
            return (
              <div key={day} className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <div className="font-medium mb-2">Day {day + 1}</div>
                <div className="space-y-1">
                  {dayBlocks.map(block => (
                    <div key={block.id} className="text-xs p-2 bg-blue-50 rounded">
                      {block.subject.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supportive Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-purple-50 border-2 border-purple-200 p-6 rounded-xl"
      >
        <h3 className="text-lg font-medium mb-3">Remember</h3>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>This is a guide, not a rulebook. Adapt it as you need.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>If you miss a session, that's okay. Just pick up where makes sense.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>Breaks are not optional – they're when your brain processes what you've learned.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-1">•</span>
            <span>You're doing better than you think you are.</span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}
