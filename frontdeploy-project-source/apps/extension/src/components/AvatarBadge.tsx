import React from "react";

interface AvatarBadgeProps {
  url?: string;
  name?: string;
  size?: number;
  isVerified?: boolean;
}

export function AvatarBadge({ url, name, size = 32, isVerified = false }: AvatarBadgeProps) {
  // Use a generic placeholder if no URL is provided
  const avatarSrc = url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;

  return (
    <div style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <img
        src={avatarSrc}
        alt={name || "Avatar"}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid #e1e1e1",
          backgroundColor: "#fff"
        }}
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`;
        }}
      />
      {isVerified && (
        <div
          style={{
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            backgroundColor: "#fff",
            borderRadius: "50%",
            width: size * 0.4,
            height: size * 0.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            aria-label="Verified account"
            role="img"
            style={{ width: "100%", height: "100%", fill: "#1D9BF0" }}
          >
            <g>
              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.867 3.45-.032.18-.052.364-.052.55 0 2.21 1.71 3.998 3.918 3.998.47 0 .92-.084 1.336-.25C9.182 21.585 10.49 22.5 12 22.5s2.816-.917 3.337-2.25c.416.165.866.25 1.336.25 2.21 0 3.918-1.792 3.918-4 0-.186-.02-.37-.052-.55 1.128-.704 1.867-1.99 1.867-3.45zm-11.4 4l-4.2-4.2 1.4-1.4 2.8 2.8 6.4-6.4 1.4 1.4-7.8 7.8z"></path>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
