import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const IndiaPopulationLogo: React.FC<LogoProps> = ({ size = 36, className = "" }) => {
  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title="India Population Demographic Intelligence"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm transition-transform duration-300 hover:scale-105"
      >
        <defs>
          {/* Background Radial Gradient */}
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="85%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>

          {/* Saffron Gradient */}
          <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff9933" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          {/* Emerald Gradient */}
          <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Royal Blue Glow Gradient */}
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Outer Squircle Container */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="22"
          fill="url(#bgGrad)"
          stroke="#334155"
          strokeWidth="2.5"
        />

        {/* Top Saffron Arc Accent */}
        <path
          d="M 22 14 Q 50 10 78 14"
          stroke="url(#saffronGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Bottom Emerald Arc Accent */}
        <path
          d="M 22 86 Q 50 90 78 86"
          stroke="url(#emeraldGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Central Data Orbit Ring */}
        <circle
          cx="50"
          cy="50"
          r="26"
          stroke="#38bdf8"
          strokeWidth="1.8"
          strokeDasharray="3 3"
          opacity="0.8"
        />

        {/* Inner Solid Hub */}
        <circle cx="50" cy="50" r="14" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />

        {/* 12 Radiant Data Chakra Spokes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 50 + 14 * Math.cos(rad);
          const y1 = 50 + 14 * Math.sin(rad);
          const x2 = 50 + 26 * Math.cos(rad);
          const y2 = 50 + 26 * Math.sin(rad);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#93c5fd"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.85"
            />
          );
        })}

        {/* Demographic Data Nodes (representing distributed population clusters) */}
        {[0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const cx = 50 + 26 * Math.cos(rad);
          const cy = 50 + 26 * Math.sin(rad);
          return (
            <circle
              key={deg}
              cx={cx}
              cy={cy}
              r="2.8"
              fill={deg % 120 === 0 ? "#ff9933" : "#10b981"}
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Center Golden Core Beacon */}
        <circle cx="50" cy="50" r="5" fill="#f8fafc" />
        <circle cx="50" cy="50" r="2.5" fill="#2563eb" />
      </svg>
    </div>
  );
};
