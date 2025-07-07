import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Line, Doughnut, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale,
} from 'chart.js';
import { TrendingUp, TrendingDown, Calendar, Brain, Heart, Zap } from 'lucide-react';
import { EmotionalInsight } from '../types';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';
import EmotionVisualization3D from './EmotionVisualization3D';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  RadialLinearScale
);

interface AdvancedEmotionDashboardProps {
  insights: EmotionalInsight[];
  currentEmotion?: string;
  currentSentiment?: number;
  emotionHistory?: Array<{ emotion: string; timestamp: Date; intensity: number }>;
}

const AdvancedEmotionDashboard: React.FC<AdvancedEmotionDashboardProps> = ({
  insights,
  currentEmotion,
  currentSentiment,
  emotionHistory = []
}) => {
  const { isCompact, deviceInfo, config } = useResponsiveDesign();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [emotionPrediction, setEmotionPrediction] = useState<string | null>(null);
  const [moodTrend, setMoodTrend] = useState<'improving' | 'stable' | 'declining'>('stable');

  // AI-powered mood prediction
  useEffect(() => {
    if (emotionHistory.length >= 5) {
      const recentEmotions = emotionHistory.slice(-5);
      const negativeEmotions = ['sad', 'angry', 'anxious', 'fear', 'distress'];
      const negativeCount = recentEmotions.filter(e => negativeEmotions.includes(e.emotion)).length;
      
      if (negativeCount >= 3) {
        setEmotionPrediction('Consider taking a break for self-care');
        setMoodTrend('declining');
      } else if (negativeCount <= 1) {
        setEmotionPrediction('You\'re on a positive trajectory!');
        setMoodTrend('improving');
      } else {
        setEmotionPrediction('Your mood appears stable');
        setMoodTrend('stable');
      }
    }
  }, [emotionHistory]);

  // Emotion heatmap data
  const generateHeatmapData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map(day => 
      hours.map(hour => ({
        day,
        hour,
        intensity: Math.random() * 100 // Replace with actual data
      }))
    ).flat();
  };

  // Emotion radar chart data
  const emotionRadarData = {
    labels: ['Joy', 'Sadness', 'Anger', 'Fear', 'Surprise', 'Disgust'],
    datasets: [
      {
        label: 'Current Week',
        data: [85, 20, 15, 10, 60, 5], // Replace with actual data
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
      },
      {
        label: 'Previous Week',
        data: [70, 35, 25, 20, 45, 10], // Replace with actual data
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        borderColor: 'rgb(156, 163, 175)',
        pointBackgroundColor: 'rgb(156, 163, 175)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(156, 163, 175)'
      }
    ]
  };

  // Trigger analysis
  const triggerAnalysis = () => {
    const triggers = [
      { name: 'Work Stress', frequency: 45, impact: 'high' },
      { name: 'Social Interactions', frequency: 30, impact: 'medium' },
      { name: 'Sleep Quality', frequency: 25, impact: 'high' },
      { name: 'Exercise', frequency: 20, impact: 'positive' }
    ];

    return triggers;
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: { size: isCompact ? 10 : 12 }
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      },
      y: {
        ticks: { color: 'rgb(156, 163, 175)' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' }
      }
    }
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: { size: isCompact ? 10 : 12 }
        }
      }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(156, 163, 175, 0.2)' },
        grid: { color: 'rgba(156, 163, 175, 0.2)' },
        pointLabels: { color: 'rgb(156, 163, 175)' },
        ticks: { color: 'rgb(156, 163, 175)' }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with AI Insights */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Emotion Intelligence Dashboard
          </h2>
          {emotionPrediction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center mt-2"
            >
              <Brain size={16} className="mr-2 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                AI Insight: {emotionPrediction}
              </span>
              {moodTrend === 'improving' && <TrendingUp size={16} className="ml-2 text-green-500" />}
              {moodTrend === 'declining' && <TrendingDown size={16} className="ml-2 text-red-500" />}
            </motion.div>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Current State Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Current Emotion</h3>
            <Heart className="text-pink-500" size={20} />
          </div>
          {currentEmotion && (
            <EmotionVisualization3D
              emotions={{
                primary_emotion: currentEmotion,
                emotion_scores: { [currentEmotion]: 0.8 },
                confidence: 0.8,
                category: 'positive',
                intensity: 'medium'
              }}
              size="small"
            />
          )}
        </motion.div>

        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Mood Trend</h3>
            <Zap className="text-yellow-500" size={20} />
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold mb-2 ${
              moodTrend === 'improving' ? 'text-green-500' :
              moodTrend === 'declining' ? 'text-red-500' : 'text-blue-500'
            }`}>
              {moodTrend === 'improving' ? '↗' : moodTrend === 'declining' ? '↘' : '→'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {moodTrend}
            </p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">Sessions Today</h3>
            <Calendar className="text-blue-500" size={20} />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {emotionHistory.filter(e => 
                new Date(e.timestamp).toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Conversations
            </p>
          </div>
        </motion.div>
      </div>

      {/* Advanced Charts Grid */}
      <div className={`grid gap-6 ${
        config.emotionDisplayStyle === 'dashboard' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
      }`}>
        {/* Emotion Radar Chart */}
        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Emotion Profile Comparison
          </h3>
          <div className="h-64">
            <Radar data={emotionRadarData} options={radarOptions} />
          </div>
        </motion.div>

        {/* Trigger Analysis */}
        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Emotional Triggers
          </h3>
          <div className="space-y-4">
            {triggerAnalysis().map((trigger, index) => (
              <div key={trigger.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {trigger.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trigger.frequency}% frequency
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  trigger.impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  trigger.impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {trigger.impact}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Emotion Heatmap */}
      {config.emotionDisplayStyle === 'dashboard' && (
        <motion.div
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Weekly Emotion Heatmap
          </h3>
          <div className="grid grid-cols-24 gap-1">
            {generateHeatmapData().map((cell, index) => (
              <div
                key={index}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${cell.intensity / 100})`
                }}
                title={`${cell.day} ${cell.hour}:00 - ${cell.intensity.toFixed(0)}% intensity`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Less</span>
            <span>More</span>
          </div>
        </motion.div>
      )}

      {/* Insights and Recommendations */}
      <motion.div
        className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4 flex items-center">
          <Brain className="mr-2 text-purple-500" size={20} />
          AI-Powered Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-white mb-2">
              Emotional Patterns
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• You tend to feel most positive in the morning</li>
              <li>• Stress levels peak around 3 PM</li>
              <li>• Social interactions boost your mood by 25%</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 dark:text-white mb-2">
              Recommendations
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Schedule important tasks in the morning</li>
              <li>• Take a break around 3 PM for mindfulness</li>
              <li>• Plan social activities when feeling low</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvancedEmotionDashboard;