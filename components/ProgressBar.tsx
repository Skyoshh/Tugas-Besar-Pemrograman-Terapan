
import React from 'react';

interface ProgressBarProps {
  percentage: number;
  color?: string;
  trackColor?: string;
  height?: string;
  className?: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  percentage, 
  color = 'bg-green-500', 
  trackColor = 'bg-gray-200',
  height = 'h-4',
  className = '',
  showLabel = false
}) => {

  const validPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className={`w-full ${className}`}>
        {showLabel && (
            <div className="flex justify-between mb-2 px-1">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Kemajuan Kursus</span>
                <span className="text-sm font-bold text-green-600">{Math.round(validPercentage)}%</span>
            </div>
        )}
      <div className={`w-full ${trackColor} rounded-full ${height} overflow-hidden shadow-inner`}>
        <div 
          className={`${color} ${height} rounded-full transition-all duration-700 ease-out relative`} 
          style={{ width: `${validPercentage}%` }}
        >

            <div className="absolute top-1 left-1 right-1 h-[35%] bg-white/30 rounded-full"></div>
            

            {validPercentage < 100 && (
                <div className="absolute inset-0 bg-white/10 w-full h-full animate-pulse"></div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
