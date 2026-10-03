import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Supabase Emerald Spark / Bolt Vector Logo
 */
export const SupabaseLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 109 113"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Supabase"
  >
    <path
      d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0632L99.1934 40.0632C106.034 40.0632 109.914 47.8552 105.792 53.3004L63.7076 110.284Z"
      fill="url(#supabase_gradient_a)"
    />
    <path
      d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0632L99.1934 40.0632C106.034 40.0632 109.914 47.8552 105.792 53.3004L63.7076 110.284Z"
      fill="black"
      fillOpacity="0.2"
    />
    <path
      d="M45.317 2.71605C48.1765 -0.885278 53.9744 1.08779 54.0433 5.68593L54.3473 72.9368H9.83109C2.98982 72.9368 -0.889704 65.1448 3.23238 59.6996L45.317 2.71605Z"
      fill="#3ECF8E"
    />
    <defs>
      <linearGradient
        id="supabase_gradient_a"
        x1="53.9738"
        y1="54.9679"
        x2="94.1624"
        y2="88.4682"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#249361" />
        <stop offset="1" stopColor="#3ECF8E" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Official GitHub Mark Vector Logo
 */
export const GitHubLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="GitHub"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

/**
 * Official Vercel Triangle Vector Logo
 */
export const VercelLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Vercel"
  >
    <path fillRule="evenodd" clipRule="evenodd" d="M12 1L24 22H0L12 1Z" />
  </svg>
);

/**
 * Official Google Gemini Multimodal AI Sparkle Vector Logo
 */
export const GeminiLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Google Gemini"
  >
    <path
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      fill="url(#gemini_gradient)"
    />
    <defs>
      <linearGradient
        id="gemini_gradient"
        x1="0"
        y1="0"
        x2="24"
        y2="24"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#1BA1E3" />
        <stop offset="0.5" stopColor="#9C6CFE" />
        <stop offset="1" stopColor="#E668B3" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Official DeepSeek Oceanic Crest / Whale Vector Logo
 */
export const DeepSeekLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="DeepSeek"
  >
    <circle cx="12" cy="12" r="11" fill="#0D2137" stroke="#1D72B8" strokeWidth="1.5" />
    <path
      d="M6 13C6.5 10 9 7.5 12 7.5C15 7.5 17.5 10 18 13C17 15.5 14.5 17 12 17C9.5 17 7 15.5 6 13Z"
      fill="url(#deepseek_grad)"
    />
    <path
      d="M12 9C10.5 9 8.5 10.5 8 13C9 14.5 10.5 15.5 12 15.5C13.5 15.5 15 14.5 16 13C15.5 10.5 13.5 9 12 9Z"
      fill="#4DA8DA"
    />
    <circle cx="12" cy="12" r="1.5" fill="#E0F2FE" />
    <defs>
      <linearGradient id="deepseek_grad" x1="6" y1="7.5" x2="18" y2="17" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0284C7" />
        <stop offset="1" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Official Moonshot Kimi AI Radiant Star Logo
 */
export const KimiLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Moonshot Kimi"
  >
    <rect width="24" height="24" rx="6" fill="#0F172A" />
    <path
      d="M12 3L14.2 9.8L21 12L14.2 14.2L12 21L9.8 14.2L3 12L9.8 9.8L12 3Z"
      fill="url(#kimi_grad)"
    />
    <circle cx="12" cy="12" r="2.5" fill="#FFFFFF" />
    <defs>
      <linearGradient id="kimi_grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="0.5" stopColor="#EC4899" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Official xAI Grok Slash-X Vector Mark
 */
export const GrokLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="xAI Grok"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * Anthropic Claude Sunburst Vector Logo
 */
export const ClaudeLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Anthropic Claude"
  >
    <rect width="24" height="24" rx="6" fill="#D97757" fillOpacity="0.15" />
    <path
      d="M12 4V20M4 12H20M6.34 6.34L17.66 17.66M6.34 17.66L17.66 6.34"
      stroke="#D97757"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * OpenAI Rosette Vector Logo
 */
export const OpenAILogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="OpenAI"
  >
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.493zm-9.66-4.223a4.466 4.466 0 0 1-.535-3.014l.142.085 4.783 2.759a.774.774 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.743zm-1.33-9.52a4.485 4.485 0 0 1 2.37-1.996V12.2a.76.76 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786a4.504 4.504 0 0 1-1.652-6.133zm16.574 3.738-5.83-3.364 2.019-1.166a.076.076 0 0 1 .072 0l4.83 2.787a4.504 4.504 0 0 1-.69 8.113v-5.694a.796.796 0 0 0-.401-.676zm2.01-5.184l-.142-.085-4.773-2.782a.774.774 0 0 0-.785 0L9.34 7.647V5.315a.08.08 0 0 1 .033-.062L14.218 2.36a4.5 4.5 0 0 1 6.632 4.887zM10.74 1.57a4.476 4.476 0 0 1 2.876 1.04l-.141.08-4.779 2.758a.795.795 0 0 0-.392.681v6.737L6.284 11.7a.071.071 0 0 1-.038-.052V6.064a4.504 4.504 0 0 1 4.494-4.493zm-2.029 8.26 3.29-1.898 3.29 1.898v3.796l-3.29 1.898-3.29-1.898z" />
  </svg>
);

/**
 * Official PostgreSQL Database Elephant Silhouette Logo
 */
export const PostgresLogo: React.FC<LogoProps> = ({ className = 'w-4 h-4', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="PostgreSQL"
  >
    <path d="M12.002 0C5.373 0 0 5.373 0 12.002c0 5.302 3.438 9.8 8.207 11.387.6.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12.002 24 5.373 18.627 0 12.002 0z" />
  </svg>
);

/**
 * AetherOrch Geometric Diamond / Shield Orchestration Emblem
 */
export const AetherOrchLogo: React.FC<LogoProps> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="AetherOrch"
  >
    <rect width="32" height="32" rx="8" fill="#161b22" />
    <path
      d="M16 4L27 10.5V21.5L16 28L5 21.5V10.5L16 4Z"
      stroke="url(#aether_grad)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M16 9L23 13.5V18.5L16 23L9 18.5V13.5L16 9Z"
      fill="url(#aether_grad_fill)"
      fillOpacity="0.3"
      stroke="#FFBD59"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="16" r="2.5" fill="#3ECF8E" />
    <defs>
      <linearGradient id="aether_grad" x1="5" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F0B230" />
        <stop offset="0.5" stopColor="#FFBD59" />
        <stop offset="1" stopColor="#3ECF8E" />
      </linearGradient>
      <linearGradient id="aether_grad_fill" x1="9" y1="9" x2="23" y2="23" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F0B230" />
        <stop offset="1" stopColor="#0873B7" />
      </linearGradient>
    </defs>
  </svg>
);
