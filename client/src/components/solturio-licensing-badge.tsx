import { Shield, CheckCircle, Award, FileCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useState, useEffect } from 'react';

interface SolturioLicensingBadgeProps {
  registrationId: string;
  artistName: string;
  artworkTitle?: string;
  licenseType?: 'personal' | 'commercial' | 'exclusive' | 'nft';
  timestamp?: Date;
  isVerified?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size?: 'sm' | 'md' | 'lg';
  opacity?: number;
  includeQR?: boolean;
}

export function SolturioLicensingBadge({ 
  registrationId,
  artistName,
  artworkTitle,
  licenseType = 'personal',
  timestamp,
  isVerified = false,
  position = 'bottom-right',
  size = 'md',
  opacity = 0.8,
  includeQR = false
}: SolturioLicensingBadgeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  const sizeClasses = {
    sm: 'w-48 min-h-[60px] text-xs',
    md: 'w-64 min-h-[80px] text-sm',
    lg: 'w-80 min-h-[100px] text-base'
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
  };

  const licenseLabels = {
    personal: 'Personal Use License',
    commercial: 'Commercial License',
    exclusive: 'Exclusive License',
    nft: 'NFT Ownership'
  };

  const licenseColors = {
    personal: 'text-blue-400',
    commercial: 'text-green-400',
    exclusive: 'text-purple-400',
    nft: 'text-yellow-400'
  };

  useEffect(() => {
    if (includeQR && registrationId) {
      const verifyUrl = `${window.location.origin}/verify/${registrationId}`;
      QRCode.toDataURL(verifyUrl, {
        width: 60,
        margin: 0,
        color: {
          dark: '#FFFFFF',
          light: '#00000000' // Transparent background
        }
      }).then(setQrCodeUrl);
    }
  }, [includeQR, registrationId]);

  return (
    <div 
      className={`absolute ${positionClasses[position]} ${sizeClasses[size]} p-3`}
      style={{ opacity }}
    >
      {/* Glass morphism background */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-md rounded-lg border border-white/20 shadow-2xl" />
      
      {/* Content */}
      <div className="relative flex items-start gap-3">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-white drop-shadow-lg" />
            <span className="font-bold text-white drop-shadow-lg">SOLTURIO</span>
            {isVerified && (
              <CheckCircle className="w-4 h-4 text-yellow-400 drop-shadow-lg" />
            )}
          </div>
          
          {/* Registration Info */}
          <div className="space-y-1">
            <div className="text-white/90 text-[0.9em] drop-shadow">
              <span className="font-semibold">Artist:</span> {artistName}
            </div>
            {artworkTitle && (
              <div className="text-white/80 text-[0.85em] drop-shadow truncate">
                "{artworkTitle}"
              </div>
            )}
            <div className={`text-[0.85em] font-medium drop-shadow ${licenseColors[licenseType]}`}>
              <Award className="w-3 h-3 inline mr-1" />
              {licenseLabels[licenseType]}
            </div>
            <div className="text-white/60 text-[0.75em] font-mono drop-shadow">
              #{registrationId.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
        
        {/* QR Code */}
        {includeQR && qrCodeUrl && (
          <div className="flex-shrink-0">
            <img 
              src={qrCodeUrl} 
              alt="Verify" 
              className="w-14 h-14 rounded"
              style={{ mixBlendMode: 'screen' }}
            />
            <div className="text-white/60 text-[0.6em] text-center mt-1">
              Scan to Verify
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// SVG version for server-side embedding
export function generateLicenseBadgeSVG({ 
  registrationId,
  artistName,
  artworkTitle,
  licenseType = 'personal',
  timestamp,
  width = 280,
  height = 100
}: SolturioLicensingBadgeProps & { width?: number; height?: number }) {
  const shortId = registrationId.slice(0, 8).toUpperCase();
  const date = timestamp ? new Date(timestamp).toISOString().split('T')[0] : '';
  
  const licenseLabels = {
    personal: 'Personal Use',
    commercial: 'Commercial',
    exclusive: 'Exclusive',
    nft: 'NFT'
  };
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Glass background -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" 
            fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" 
            stroke-width="1" filter="url(#blur)"/>
      
      <!-- Shield icon -->
      <g transform="translate(15, 20)">
        <path d="M12 2L2 7v5c0 5.5 3.9 10.7 9 12 1.1-.3 2.2-.8 3.2-1.5" 
              fill="white" opacity="0.9" filter="url(#shadow)"/>
      </g>
      
      <!-- SOLTURIO text -->
      <text x="40" y="30" fill="white" font-size="18" font-weight="bold" 
            font-family="Arial, sans-serif" filter="url(#shadow)">
        SOLTURIO
      </text>
      
      <!-- Gold verified checkmark -->
      <circle cx="${width - 30}" cy="25" r="8" fill="gold" opacity="0.9"/>
      <path d="M5 13l2 2 4-4" transform="translate(${width - 37}, 18)" 
            fill="white" stroke="white" stroke-width="2"/>
      
      <!-- Artist name -->
      <text x="15" y="50" fill="rgba(255,255,255,0.9)" font-size="12" 
            font-family="Arial, sans-serif">
        Artist: ${artistName}
      </text>
      
      <!-- License type -->
      <rect x="15" y="55" width="80" height="18" rx="9" 
            fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
      <text x="20" y="67" fill="rgba(255,255,255,0.8)" font-size="10" 
            font-family="Arial, sans-serif">
        ${licenseLabels[licenseType]}
      </text>
      
      <!-- Registration ID -->
      <text x="${width - 100}" y="${height - 10}" fill="rgba(255,255,255,0.6)" 
            font-size="10" font-family="monospace">
        #${shortId}
      </text>
      
      <!-- Date if provided -->
      ${date ? `<text x="15" y="${height - 10}" fill="rgba(255,255,255,0.5)" 
                     font-size="9" font-family="Arial, sans-serif">
                  ${date}
                </text>` : ''}
    </svg>
  `;
}

// Component for displaying licensing terms
export function LicensingTermsDisplay({ 
  licenseType 
}: { 
  licenseType: 'personal' | 'commercial' | 'exclusive' | 'nft' 
}) {
  const terms = {
    personal: {
      title: 'Personal Use License',
      icon: <FileCheck className="w-5 h-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      rights: [
        'Display in personal portfolio',
        'Use as personal wallpaper/avatar',
        'Share on personal social media',
        'Non-commercial personal projects'
      ],
      restrictions: [
        'No commercial use',
        'No resale or redistribution',
        'No merchandise creation',
        'No use in paid services'
      ]
    },
    commercial: {
      title: 'Commercial License',
      icon: <Award className="w-5 h-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      rights: [
        'Use in commercial projects',
        'Include in client work',
        'Use in marketing materials',
        'Create derivative works',
        'Use in products for sale'
      ],
      restrictions: [
        'No resale of original artwork',
        'No exclusive ownership claim',
        'Attribution required',
        'No trademark registration'
      ]
    },
    exclusive: {
      title: 'Exclusive License',
      icon: <Shield className="w-5 h-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      rights: [
        'Exclusive commercial use',
        'Full derivative rights',
        'Trademark registration allowed',
        'No attribution required',
        'Sublicensing permitted',
        'Territory-specific rights'
      ],
      restrictions: [
        'Artist retains copyright',
        'Cannot claim authorship',
        'Term limits may apply'
      ]
    },
    nft: {
      title: 'NFT Ownership',
      icon: <Award className="w-5 h-5" />,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      rights: [
        'Full ownership of NFT token',
        'Display in galleries/metaverse',
        'Resale on secondary markets',
        'Use as profile picture',
        'Lending/renting rights',
        'DAO voting rights (if applicable)'
      ],
      restrictions: [
        'Copyright remains with artist',
        'Commercial use requires additional license',
        'No unauthorized reproductions'
      ]
    }
  };

  const term = terms[licenseType];

  return (
    <div className={`rounded-lg border ${term.borderColor} ${term.bgColor} p-4`}>
      <div className={`flex items-center gap-2 mb-3 ${term.color}`}>
        {term.icon}
        <h3 className="font-semibold text-lg">{term.title}</h3>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Rights Granted</h4>
          <ul className="space-y-1">
            {term.rights.map((right, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{right}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Restrictions</h4>
          <ul className="space-y-1">
            {term.restrictions.map((restriction, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Shield className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{restriction}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}