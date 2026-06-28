import React from "react";

interface AvatarWithFrameProps {
  displayName: string;
  avatarUrl?: string | null;
  badgeImageUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: {
    container: "h-6 w-6",
    inner: "w-[72%] h-[72%]",
    roundedBorder: "rounded-[4px]",
    text: "text-[8px]",
  },
  sm: {
    container: "h-8 w-8",
    inner: "w-[72%] h-[72%]",
    roundedBorder: "rounded-md",
    text: "text-[10px]",
  },
  md: {
    container: "h-10 w-10",
    inner: "w-[72%] h-[72%]",
    roundedBorder: "rounded-lg",
    text: "text-xs",
  },
  lg: {
    container: "h-14 w-14",
    inner: "w-[72%] h-[72%]",
    roundedBorder: "rounded-xl",
    text: "text-sm",
  },
  xl: {
    container: "h-24 w-24",
    inner: "w-[72%] h-[72%]",
    roundedBorder: "rounded-2xl",
    text: "text-xl",
  },
};

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  displayName,
  avatarUrl,
  badgeImageUrl,
  size = "md",
  className = "",
}) => {
  const currentSize = sizeClasses[size];
  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : "?";

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${currentSize.container} ${className}`}>
      {/* Avatar Image / Fallback Container */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden z-0 bg-muted dark:bg-white/5 border border-border/20 ${
          badgeImageUrl
            ? `${currentSize.inner} ${currentSize.roundedBorder}`
            : "w-full h-full rounded-full"
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className={`font-bold select-none text-muted-foreground dark:text-gray-400 ${currentSize.text}`}>
            {initials}
          </span>
        )}
      </div>

      {/* Frame Overlay */}
      {badgeImageUrl && (
        <img
          src={badgeImageUrl}
          alt="Frame"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
        />
      )}
    </div>
  );
};
