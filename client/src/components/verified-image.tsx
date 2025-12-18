import { useState } from "react";
import { VERIFICATION_ASSETS, getAssetUrl } from "@shared/verification-assets";

interface VerifiedImageProps {
  src: string;
  alt: string;
  className?: string;
  showBadge?: boolean;
  badgeSize?: "sm" | "md" | "lg";
}

const BADGE_SIZES = {
  sm: "w-6 h-6",
  md: "w-8 h-8", 
  lg: "w-12 h-12",
};

export function VerifiedImage({
  src,
  alt,
  className = "",
  showBadge = true,
  badgeSize = "md",
}: VerifiedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [badgeError, setBadgeError] = useState(false);

  const badgeUrl = getAssetUrl(VERIFICATION_ASSETS.badge.cid, "pinata");

  return (
    <div className={`relative inline-block ${className}`}>
      {imageError ? (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
          Image unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
      
      {showBadge && !badgeError && (
        <img
          src={badgeUrl}
          alt="Verified"
          className={`absolute bottom-2 left-2 ${BADGE_SIZES[badgeSize]} drop-shadow-lg`}
          onError={() => setBadgeError(true)}
          title="Solturio Verified - Authentic IP Protected Asset"
          data-testid="badge-verified"
        />
      )}
    </div>
  );
}

// Badge-only component for use in other contexts
export function VerificationBadge({ 
  size = "md",
  className = "",
}: { 
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const badgeUrl = getAssetUrl(VERIFICATION_ASSETS.badge.cid, "pinata");
  
  return (
    <img
      src={badgeUrl}
      alt="Solturio Verified"
      className={`${BADGE_SIZES[size]} ${className}`}
      title="Solturio Verified - Authentic IP Protected Asset"
      data-testid="badge-solturio-verified"
    />
  );
}
