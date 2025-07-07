import React from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
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
} from 'chart.js';
import { EmotionalInsight } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface EmotionDashboardProps {
  insights: EmotionalInsight[];
  currentEmotion?: string;
  currentSentiment?: number;
}

const EmotionDashboard: React.FC<EmotionDashboardProps> = ({
  insights,
  currentEmotion,
  currentSentiment
}) => {
  // Prepare data for mood timeline
  const timelineData = {
    labels: insights.map(insight => new Date(insight.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Sentiment Score',
        data: insights.map(insight => insight.sentimentScore),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Prepare data for emotion distribution
  const emotionCounts: { [key: string]: number } = {};
  insights.forEach(insight => {
    Object.entries(insight.emotionBreakdown).forEach(([emotion, count]) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + count;
    });
  });

  const emotionDistributionData = {
    labels: Object.keys(emotionCounts),
    datasets: [
      {
        data: Object.values(emotionCounts),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  // Prepare data for daily emotion intensity
  const dailyIntensityData = {
    labels: insights.map(insight => new Date(insight.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Conversation Count',
        data: insights.map(insight => insight.conversationCount),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'rgb(156, 163, 175)',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Emotion Dashboard</h2>
        {currentEmotion && (
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Emotion</p>
              <p className="font-medium text-gray-800 dark:text-white capitalize">{currentEmotion}</p>
            </div>
            {currentSentiment !== undefined && (
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Sentiment</p>
                <p className={`font-medium ${
                  currentSentiment > 0.1 ? 'text-green-600' :
                  currentSentiment < -0.1 ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {currentSentiment > 0.1 ? 'Positive' :
                   currentSentiment < -0.1 ? 'Negative' : 'Neutral'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Mood Timeline</h3>
          <div className="h-64">
            {insights.length > 0 ? (
              <Line data={timelineData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No data available yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Emotion Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Emotion Distribution</h3>
          <div className="h-64">
            {Object.keys(emotionCounts).length > 0 ? (
              <Doughnut data={emotionDistributionData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No emotions detected yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Daily Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Daily Activity</h3>
          <div className="h-64">
            {insights.length > 0 ? (
              <Bar data={dailyIntensityData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No activity data yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Emotional Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 dark:border-gray-800/50"
        >
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Recent Insights</h3>
          <div className="space-y-3">
            {insights.slice(-5).reverse().map((insight, index) => (
              <div key={insight.date} className="flex items-center justify-between p-3 bg-white/5 dark:bg-black/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {new Date(insight.date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {insight.dominantEmotion || 'No dominant emotion'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {insight.conversationCount} conversations
                  </p>
                  <p className={`text-xs ${
                    insight.sentimentScore > 0.1 ? 'text-green-500' :
                    insight.sentimentScore < -0.1 ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    {insight.sentimentScore > 0.1 ? 'Positive' :
                     insight.sentimentScore < -0.1 ? 'Negative' : 'Neutral'}
                  </p>
                </div>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Start a conversation to see insights
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmotionDashboard;