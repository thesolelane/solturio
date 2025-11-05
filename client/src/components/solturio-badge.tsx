import { Shield, CheckCircle } from 'lucide-react';

interface SolturioBadgeProps {
  registrationId?: string;
  timestamp?: Date;
  isVerified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
}

export function SolturioBadge({ 
  registrationId, 
  timestamp, 
  isVerified = false,
  size = 'md',
  opacity = 0.7
}: SolturioBadgeProps) {
  const sizeClasses = {
    sm: 'w-32 h-10 text-xs',
    md: 'w-48 h-14 text-sm',
    lg: 'w-64 h-20 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div 
      className={`${sizeClasses[size]} relative inline-flex items-center justify-center`}
      style={{ opacity }}
    >
      {/* Transparent background with border */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-md border border-white/30" />
      
      {/* Content */}
      <div className="relative flex items-center gap-2 px-3 py-1">
        <Shield className={`${iconSizes[size]} text-white drop-shadow-lg`} />
        <div className="flex flex-col">
          <div className="font-bold text-white drop-shadow-lg flex items-center gap-1">
            SOLTURIO
            {isVerified && (
              <CheckCircle className={`${iconSizes[size]} text-yellow-400 drop-shadow-lg`} />
            )}
          </div>
          {registrationId && (
            <div className="text-white/90 text-[0.7em] drop-shadow">
              #{registrationId.slice(0, 8)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// SVG version for embedding
export function SolturioBadgeSVG({ 
  registrationId, 
  timestamp, 
  isVerified = false,
  width = 200,
  height = 60
}: SolturioBadgeProps & { width?: number; height?: number }) {
  const shortId = registrationId?.slice(0, 8);
  const formattedDate = timestamp ? new Date(timestamp).toISOString().split('T')[0] : '';
  
  return (
    <svg 
      width={width} 
      height={height} 
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Semi-transparent background */}
      <rect 
        x="0" 
        y="0" 
        width={width} 
        height={height} 
        rx="6" 
        fill="rgba(255, 255, 255, 0.1)" 
        stroke="rgba(255, 255, 255, 0.3)" 
        strokeWidth="1"
      />
      
      {/* Shield icon */}
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        transform={`translate(10, ${height/2 - 12})`}
        fill="white"
        opacity="0.9"
      />
      
      {/* Text */}
      <text 
        x="40" 
        y={height/2 - 5} 
        fill="white" 
        fontSize="16" 
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        SOLTURIO
      </text>
      
      {isVerified && (
        <>
          <circle 
            cx={width - 25} 
            cy={height/2} 
            r="8" 
            fill="gold" 
            opacity="0.9"
          />
          <path
            d="M5 13l2 2 4-4"
            transform={`translate(${width - 32}, ${height/2 - 7})`}
            fill="white"
            stroke="white"
            strokeWidth="2"
          />
        </>
      )}
      
      {shortId && (
        <text 
          x="40" 
          y={height/2 + 10} 
          fill="white" 
          fontSize="11" 
          opacity="0.8"
          fontFamily="monospace"
        >
          #{shortId}
        </text>
      )}
      
      {formattedDate && (
        <text 
          x="40" 
          y={height - 8} 
          fill="white" 
          fontSize="9" 
          opacity="0.7"
          fontFamily="Arial, sans-serif"
        >
          {formattedDate}
        </text>
      )}
    </svg>
  );
}