import { useState } from 'react';
import { motion } from 'motion/react';
import { Coffee, Moon, Sun, Clock, AlertCircle, Edit } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  examDate: string;
}

interface FormData {
  subjects: Subject[];
  studyLength: string;
  energyLevel: string;
}

interface StudyBlock {
  id: string;
  subject: string;
  duration: number;
  type: 'study' | 'break';
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface StudyPlanProps {
  data: FormData;
  onReset: () => void;
}

export function StudyPlan({ data, onReset }: StudyPlanProps) {
  const [flexibility, setFlexibility] = useState(50);

  // Generate study plan based on inputs
  const generatePlan = (): StudyBlock[] => {
    const blocks: StudyBlock[] = [];
    const sessionDuration =
      data.studyLength === 'short' ? 25 : data.studyLength === 'medium' ? 45 : 90;
    const breakDuration =
      data.studyLength === 'short' ? 5 : data.studyLength === 'medium' ? 10 : 15;

    // Sort subjects by exam date
    const sortedSubjects = [...data.subjects].sort(
      (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
    );

    let currentTime = 9; // Start at 9 AM
    let blockId = 0;

    sortedSubjects.forEach((subject, index) => {
      const daysUntilExam = Math.ceil(
        (new Date(subject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const priority =
        daysUntilExam <= 3 ? 'high' : daysUntilExam <= 7 ? 'medium' : 'low';

      // Add 2-3 sessions per subject based on energy level
      const sessions =
        data.energyLevel === 'high' ? 3 : data.energyLevel === 'moderate' ? 2 : 2;

      for (let i = 0; i < sessions; i++) {
        const hours = Math.floor(currentTime);
        const minutes = Math.round((currentTime % 1) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        blocks.push({
          id: `block-${blockId++}`,
          subject: subject.name,
          duration: sessionDuration,
          type: 'study',
          time: timeStr,
          priority,
        });

        currentTime += sessionDuration / 60;

        // Add break after study session (except last one of the day)
        if (i < sessions - 1 || index < sortedSubjects.length - 1) {
          const breakHours = Math.floor(currentTime);
          const breakMinutes = Math.round((currentTime % 1) * 60);
          const breakTimeStr = `${breakHours.toString().padStart(2, '0')}:${breakMinutes.toString().padStart(2, '0')}`;

          blocks.push({
            id: `block-${blockId++}`,
            subject: 'Break',
            duration: breakDuration,
            type: 'break',
            time: breakTimeStr,
            priority: 'low',
          });

          currentTime += breakDuration / 60;
        }

        // Reset to next morning if time goes past 5 PM
        if (currentTime >= 17) {
          currentTime = 9;
        }
      }
    });

    return blocks;
  };

  const studyBlocks = generatePlan();

  const totalStudyTime = studyBlocks
    .filter((b) => b.type === 'study')
    .reduce((sum, b) => sum + b.duration, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-300 text-red-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-900';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Urgent';
      case 'medium':
        return 'Soon';
      default:
        return 'Later';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto p-8"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl mb-2">Your Revision Plan</h1>
            <p className="text-gray-600">
              Total study time: {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
            </p>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <Edit size={18} />
            Edit Plan
          </button>
        </div>

        {/* Flexibility Slider */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="flexibility" className="text-lg font-medium">
              Plan Flexibility
            </label>
            <span className="text-gray-600">{flexibility}%</span>
          </div>
          <input
            id="flexibility"
            type="range"
            min="0"
            max="100"
            value={flexibility}
            onChange={(e) => setFlexibility(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Adjust plan flexibility"
          />
          <p className="text-sm text-gray-600 mt-2">
            {flexibility < 30
              ? 'Strict schedule - stick to the times'
              : flexibility < 70
                ? 'Moderate - some wiggle room'
                : 'Very flexible - rough guide only'}
          </p>
        </div>
      </div>

      {/* Study Blocks */}
      <div className="space-y-3 mb-8">
        {studyBlocks.map((block, index) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`p-5 rounded-xl border-2 transition-all ${
              block.type === 'break'
                ? 'bg-green-50 border-green-200'
                : getPriorityColor(block.priority)
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {block.type === 'break' ? (
                    <Coffee size={20} className="text-green-600" />
                  ) : (
                    <Clock size={20} />
                  )}
                  <span className="font-medium text-lg">{block.time}</span>
                </div>
                <div>
                  <div className="font-medium text-lg">{block.subject}</div>
                  <div className="text-sm text-gray-600">
                    {block.duration} minutes
                  </div>
                </div>
              </div>
              {block.type === 'study' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-medium">
                  <AlertCircle size={14} />
                  {getPriorityLabel(block.priority)}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-blue-50 border-2 border-blue-200 p-6 rounded-xl"
      >
        <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
          <Sun size={20} className="text-blue-600" />
          Helpful Tips
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>Take your breaks seriously - they help you retain information</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              If you're feeling overwhelmed, it's okay to adjust your plan
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              Focus on one subject at a time - multitasking reduces effectiveness
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1">•</span>
            <span>
              End your day at a reasonable time{' '}
              <Moon size={16} className="inline text-purple-600" /> - rest is
              crucial
            </span>
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
}
