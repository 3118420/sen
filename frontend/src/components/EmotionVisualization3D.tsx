import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EmotionAnalysis } from '../types';

interface EmotionVisualization3DProps {
  emotions: EmotionAnalysis;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
}

const EmotionVisualization3D: React.FC<EmotionVisualization3DProps> = ({
  emotions,
  size = 'medium',
  interactive = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const sizeMap = {
    small: 120,
    medium: 200,
    large: 300
  };

  const canvasSize = sizeMap[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const radius = canvasSize * 0.35;

    const animate = () => {
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // Create gradient based on primary emotion
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      
      const emotionColors: { [key: string]: [string, string] } = {
        happy: ['#fbbf24', '#f59e0b'],
        sad: ['#3b82f6', '#1d4ed8'],
        angry: ['#ef4444', '#dc2626'],
        anxious: ['#f97316', '#ea580c'],
        fear: ['#8b5cf6', '#7c3aed'],
        love: ['#ec4899', '#db2777'],
        pride: ['#10b981', '#059669'],
        relief: ['#06b6d4', '#0891b2'],
        default: ['#6b7280', '#4b5563']
      };

      const [color1, color2] = emotionColors[emotions.primary_emotion] || emotionColors.default;
      
      gradient.addColorStop(0, color1 + '80');
      gradient.addColorStop(0.7, color2 + '40');
      gradient.addColorStop(1, color2 + '10');

      // Draw main sphere
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation.y * 0.01);
      
      // Create 3D effect with multiple circles
      for (let i = 0; i < 8; i++) {
        const layerRadius = radius * (0.3 + (i * 0.1));
        const opacity = 1 - (i * 0.1);
        const offsetY = Math.sin(rotation.x * 0.01 + i * 0.5) * 10;
        
        ctx.globalAlpha = opacity * emotions.confidence;
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.ellipse(0, offsetY, layerRadius, layerRadius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw emotion particles
      if (emotions.top_emotions) {
        emotions.top_emotions.slice(0, 5).forEach((emotion, index) => {
          const angle = (index / 5) * Math.PI * 2 + rotation.y * 0.02;
          const distance = radius * 1.2;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance * 0.6;
          
          ctx.globalAlpha = emotion.score;
          ctx.fillStyle = emotionColors[emotion.emotion]?.[0] || '#6b7280';
          
          ctx.beginPath();
          ctx.arc(x, y, 8 * emotion.score, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();

      // Update rotation
      if (interactive && isHovered) {
        setRotation(prev => ({
          x: prev.x + 1,
          y: prev.y + 0.5
        }));
      } else {
        setRotation(prev => ({
          x: prev.x + 0.2,
          y: prev.y + 0.1
        }));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [emotions, canvasSize, rotation, isHovered, interactive]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 100;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 100;
    
    setRotation({ x: y, y: x });
  };

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className={`${interactive ? 'cursor-pointer' : ''} transition-transform duration-300 ${
          isHovered ? 'scale-105' : ''
        }`}
        onMouseMove={handleMouseMove}
        style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
      />
      
      {/* Emotion label */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2">
        <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium">
          {emotions.primary_emotion}
        </div>
      </div>
      
      {/* Confidence indicator */}
      <div className="absolute top-0 right-0 bg-white/90 dark:bg-black/90 rounded-full px-2 py-1 text-xs font-medium">
        {Math.round(emotions.confidence * 100)}%
      </div>
    </motion.div>
  );
};

export default EmotionVisualization3D;