@tailwind base;
@tailwind components;
@tailwind utilities;

/* ===== REVOLUTIONARY CSS VARIABLES ===== */
:root {
  /* Dynamic Color System */
  --primary-hue: 260;
  --secondary-hue: 320;
  --accent-hue: 180;
  
  /* Neon Palette */
  --neon-blue: #00d4ff;
  --neon-purple: #8b5cf6;
  --neon-pink: #f472b6;
  --neon-green: #10b981;
  --neon-orange: #fb923c;
  
  /* Glassmorphism */
  --glass-bg: rgba(255, 255, 255, 0.1);
  --glass-border: rgba(255, 255, 255, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  
  /* Dynamic Gradients */
  --gradient-cosmic: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-sunset: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  --gradient-ocean: linear-gradient(135deg, #667db6 0%, #0082c8 35%, #0082c8 100%);
  --gradient-aurora: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%);
  --gradient-cyberpunk: linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ffff00 100%);
  
  /* Advanced Shadows */
  --shadow-brutal: 8px 8px 0px #000;
  --shadow-neon: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor;
  --shadow-floating: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --shadow-inner-glow: inset 0 0 20px rgba(255, 255, 255, 0.2);
  
  /* Typography Scale */
  --font-display: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Animation Curves */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-elastic: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-back: cubic-bezier(0.68, -0.6, 0.32, 1.6);
  
  /* Responsive Breakpoints */
  --mobile: 768px;
  --tablet: 1024px;
  --desktop: 1280px;
}

/* ===== DARK MODE SYSTEM ===== */
@media (prefers-color-scheme: dark) {
  :root {
    --glass-bg: rgba(0, 0, 0, 0.2);
    --glass-border: rgba(255, 255, 255, 0.1);
    --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }
}

/* ===== BASE STYLES ===== */
* {
  box-sizing: border-box;
}

*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}

body {
  font-family: var(--font-display);
  line-height: 1.6;
  color: rgb(15, 23, 42);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow-x: hidden;
  transition: all 0.3s ease;
}

@media (prefers-color-scheme: dark) {
  body {
    color: rgb(248, 250, 252);
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
}

/* ===== REVOLUTIONARY BUTTON SYSTEM ===== */
@layer components {
  .btn {
    @apply relative inline-flex items-center justify-center px-6 py-3 font-semibold text-sm transition-all duration-300 ease-out;
    border-radius: 12px;
    cursor: pointer;
    user-select: none;
    transform-style: preserve-3d;
    perspective: 1000px;
    overflow: hidden;
    
    /* Base state */
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    
    /* Hover effects */
    &:hover {
      transform: translateY(-2px) scale(1.02);
    }
    
    &:active {
      transform: translateY(0) scale(0.98);
    }
    
    /* Ripple effect */
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: all 0.6s ease;
      z-index: 0;
    }
    
    &:active::before {
      width: 300px;
      height: 300px;
    }
    
    /* Content positioning */
    & > * {
      position: relative;
      z-index: 1;
    }
  }
  
  /* PRIMARY BUTTON - Cosmic Energy */
  .btn-primary {
    background: var(--gradient-cosmic);
    color: white;
    border: none;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--gradient-aurora);
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: inherit;
    }
    
    &:hover::after {
      opacity: 1;
    }
    
    &:hover {
      box-shadow: var(--shadow-neon), var(--shadow-floating);
      transform: translateY(-4px) scale(1.05);
    }
  }
  
  /* SECONDARY BUTTON - Glassmorphism Pro */
  .btn-secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 2px solid var(--glass-border);
    color: rgb(51, 65, 85);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: var(--neon-blue);
      box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
      color: var(--neon-blue);
    }
  }
  
  /* NEON BUTTON - Cyberpunk Vibes */
  .btn-neon {
    background: transparent;
    border: 2px solid var(--neon-purple);
    color: var(--neon-purple);
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--neon-purple);
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: inherit;
    }
    
    &:hover {
      color: white;
      text-shadow: 0 0 10px white;
      box-shadow: 
        0 0 20px var(--neon-purple),
        0 0 40px var(--neon-purple),
        0 0 80px var(--neon-purple);
    }
    
    &:hover::before {
      opacity: 1;
    }
  }
  
  /* FLOATING BUTTON - Anti-gravity */
  .btn-floating {
    background: var(--gradient-sunset);
    border: none;
    color: white;
    border-radius: 50px;
    animation: float 3s ease-in-out infinite;
    
    &:hover {
      animation-play-state: paused;
      transform: translateY(-8px) scale(1.1);
      box-shadow: var(--shadow-floating);
    }
  }
  
  /* BRUTAL BUTTON - Bold Statement */
  .btn-brutal {
    background: var(--neon-orange);
    border: 3px solid #000;
    color: #000;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    box-shadow: var(--shadow-brutal);
    
    &:hover {
      transform: translate(-4px, -4px);
      box-shadow: 12px 12px 0px #000;
    }
    
    &:active {
      transform: translate(0, 0);
      box-shadow: 4px 4px 0px #000;
    }
  }
  
  /* ===== NEXT-LEVEL INPUT SYSTEM ===== */
  .input {
    @apply relative w-full px-4 py-3 text-sm transition-all duration-300;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 2px solid transparent;
    border-radius: 12px;
    outline: none;
    
    /* Gradient border effect */
    background-clip: padding-box;
    
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      padding: 2px;
      background: var(--gradient-cosmic);
      border-radius: inherit;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: xor;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    
    &:focus {
      border-color: var(--neon-blue);
      box-shadow: 
        0 0 0 3px rgba(0, 212, 255, 0.1),
        0 0 20px rgba(0, 212, 255, 0.2);
      transform: scale(1.02);
    }
    
    &:focus::before {
      opacity: 1;
    }
    
    /* Floating label effect */
    &:not(:placeholder-shown) + .input-label,
    &:focus + .input-label {
      transform: translateY(-25px) scale(0.8);
      color: var(--neon-blue);
    }
  }
  
  .input-label {
    position: absolute;
    left: 16px;
    top: 12px;
    color: rgb(107, 114, 128);
    pointer-events: none;
    transition: all 0.3s var(--ease-bounce);
    transform-origin: left top;
  }
  
  .input-container {
    position: relative;
    margin-bottom: 24px;
  }
  
  /* ===== REVOLUTIONARY CARD SYSTEM ===== */
  .card {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 32px;
    position: relative;
    overflow: hidden;
    transition: all 0.4s var(--ease-elastic);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s ease;
    }
    
    &:hover {
      transform: translateY(-8px) rotateX(5deg);
      box-shadow: var(--shadow-floating);
    }
    
    &:hover::before {
      left: 100%;
    }
  }
  
  /* NEON CARD - Glowing Edges */
  .card-neon {
    @apply card;
    border: 2px solid var(--neon-purple);
    
    &:hover {
      box-shadow: 
        0 0 30px rgba(139, 92, 246, 0.3),
        var(--shadow-floating);
    }
  }
  
  /* FLOATING CARD - Levitation Effect */
  .card-floating {
    @apply card;
    animation: float 4s ease-in-out infinite;
    
    &:hover {
      animation-play-state: paused;
    }
  }
  
  /* HOLOGRAPHIC CARD - Future Tech */
  .card-holographic {
    @apply card;
    background: linear-gradient(45deg, 
      rgba(255, 0, 255, 0.1) 0%,
      rgba(0, 255, 255, 0.1) 25%,
      rgba(255, 255, 0, 0.1) 50%,
      rgba(255, 0, 255, 0.1) 75%,
      rgba(0, 255, 255, 0.1) 100%);
    background-size: 200% 200%;
    animation: holographic 3s ease-in-out infinite;
    
    &:hover {
      animation-duration: 1s;
    }
  }
  
  /* ===== ADVANCED UTILITY CLASSES ===== */
  
  /* Text Effects */
  .text-glow {
    text-shadow: 0 0 10px currentColor;
  }
  
  .text-neon {
    color: var(--neon-blue);
    text-shadow: 
      0 0 5px var(--neon-blue),
      0 0 10px var(--neon-blue),
      0 0 20px var(--neon-blue);
  }
  
  .text-gradient {
    background: var(--gradient-cosmic);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  /* Morphism Effects */
  .glass {
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }
  
  .neumorphism {
    background: #e0e5ec;
    box-shadow: 
      20px 20px 60px #bebebe,
      -20px -20px 60px #ffffff;
  }
  
  /* Interactive Effects */
  .hover-tilt {
    transition: transform 0.3s ease;
  }
  
  .hover-tilt:hover {
    transform: perspective(1000px) rotateX(10deg) rotateY(10deg);
  }
  
  .magnetic {
    transition: transform 0.1s ease;
  }
  
  /* Scroll Reveal Effects */
  .reveal {
    opacity: 0;
    transform: translateY(50px);
    transition: all 0.6s var(--ease-bounce);
  }
  
  .reveal.active {
    opacity: 1;
    transform: translateY(0);
  }
  
  /* Loading Effects */
  .loading {
    position: relative;
    color: transparent;
  }
  
  .loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--gradient-cosmic);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: inherit;
  }
}

/* ===== ADVANCED ANIMATIONS ===== */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

@keyframes holographic {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulse-neon {
  0%, 100% {
    text-shadow: 
      0 0 5px currentColor,
      0 0 10px currentColor,
      0 0 20px currentColor;
  }
  50% {
    text-shadow: 
      0 0 2px currentColor,
      0 0 5px currentColor,
      0 0 10px currentColor;
  }
}

@keyframes rotate-gradient {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 768px) {
  .btn {
    @apply px-4 py-2 text-xs;
  }
  
  .card {
    padding: 20px;
    border-radius: 16px;
  }
  
  .input {
    @apply px-3 py-2 text-sm;
  }
}

/* ===== ACCESSIBILITY ENHANCEMENTS ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .btn {
    border-width: 2px;
  }
  
  .card {
    border-width: 2px;
  }
}

/* ===== UTILITY ANIMATIONS ===== */
.animate-bounce-subtle {
  animation: bounce-subtle 2s infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 3s infinite;
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}

@keyframes bounce-subtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ===== PRINT STYLES ===== */
@media print {
  .btn,
  .card {
    box-shadow: none !important;
    background: white !important;
    border: 1px solid #000 !important;
  }
  
  .text-neon,
  .text-gradient {
    color: #000 !important;
    text-shadow: none !important;
    -webkit-text-fill-color: #000 !important;
  }
}