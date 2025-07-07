import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cloud, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { env, debugMode } from '../config/environment';

const DeploymentStatus: React.FC = () => {
  const [deploymentInfo, setDeploymentInfo] = useState({
    environment: env.environment,
    apiUrl: env.apiUrl,
    buildTime: new Date().toISOString(),
    vercelUrl: window.location.origin,
    isVercel: window.location.hostname.includes('vercel.app'),
    isLocalhost: window.location.hostname === 'localhost'
  });

  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if we're on Vercel
    const isVercel = window.location.hostname.includes('vercel.app') || 
                    window.location.hostname.includes('vercel.com');
    
    setDeploymentInfo(prev => ({
      ...prev,
      isVercel,
      vercelUrl: window.location.origin
    }));
  }, []);

  if (!debugMode && env.environment === 'production') {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1 }}
    >
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Cloud size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-800 dark:text-white">
              Deployment Status
            </span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {showDetails ? '−' : '+'}
          </button>
        </div>

        <div className="flex items-center space-x-2 mb-2">
          {deploymentInfo.isVercel ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : deploymentInfo.isLocalhost ? (
            <AlertCircle size={14} className="text-yellow-500" />
          ) : (
            <AlertCircle size={14} className="text-red-500" />
          )}
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {deploymentInfo.isVercel ? 'Vercel' : 
             deploymentInfo.isLocalhost ? 'Localhost' : 'Unknown'}
          </span>
        </div>

        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 text-xs text-gray-600 dark:text-gray-400"
          >
            <div>
              <strong>Environment:</strong> {deploymentInfo.environment}
            </div>
            <div>
              <strong>API URL:</strong> 
              <a 
                href={deploymentInfo.apiUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 ml-1"
              >
                {deploymentInfo.apiUrl.replace('https://', '')}
                <ExternalLink size={10} className="inline ml-1" />
              </a>
            </div>
            <div>
              <strong>Build Time:</strong> {new Date(deploymentInfo.buildTime).toLocaleString()}
            </div>
            <div>
              <strong>URL:</strong> {deploymentInfo.vercelUrl}
            </div>
            {deploymentInfo.isVercel && (
              <div className="text-green-600 dark:text-green-400">
                ✅ Successfully deployed on Vercel
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default DeploymentStatus;