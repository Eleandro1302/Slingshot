/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Point, Bubble, Particle, BubbleColor, PowerUpType } from '../types';
import { Loader2, Trophy, Play, MousePointerClick, Monitor, Zap, Shield, Skull, RotateCcw, Target, Menu as MenuIcon, Crosshair, Snowflake, Flame, Rainbow, Linkedin, HelpCircle, Hand, ArrowRight, X, Sparkles, Pause, Palette, Anchor } from 'lucide-react';

const PINCH_THRESHOLD = 0.05;
const GRAVITY = 0.0; 
const FRICTION = 0.998; 
const PARTICLE_GRAVITY = 0.15; // Gravity for particles (fireworks)

const BUBBLE_RADIUS = 22;
const ROW_HEIGHT = BUBBLE_RADIUS * Math.sqrt(3);
const GRID_COLS = 12;
const GRID_ROWS = 8;
const SLINGSHOT_BOTTOM_OFFSET = 220;

const MAX_DRAG_DIST = 180;
const MIN_FORCE_MULT = 0.15;
const MAX_FORCE_MULT = 0.45;

const POWERUP_CHANCE = 0.15; // Increased to 15% chance to spawn a powerup

type Difficulty = 'easy' | 'medium' | 'hard';
type HandleDesign = 'classic' | 'wood' | 'neon' | 'gold' | 'cyber' | 'hook';

const DIFFICULTY_SETTINGS = {
  easy: { 
    label: 'Easy', 
    rows: 3, 
    descentInterval: 30000, // 30 seconds (Ignored in logic due to change)
    color: '#66bb6a',
    icon: Shield
  },
  medium: { 
    label: 'Medium', 
    rows: 5, 
    descentInterval: 20000, // 20 seconds
    color: '#42a5f5',
    icon: Zap
  },
  hard: { 
    label: 'Hard', 
    rows: 7, 
    descentInterval: 12000, // 12 seconds
    color: '#ef5350',
    icon: Skull
  }
};

const HANDLE_THEMES: Record<HandleDesign, {
    id: HandleDesign;
    label: string;
    handleColor: string;
    bandColorActive: string;
    bandColorIdle: string;
    glowColor: string;
    shadowBlur: number;
    icon?: React.ElementType;
}> = {
    hook: {
        id: 'hook',
        label: 'Hook',
        handleColor: '#b0bec5',
        bandColorActive: '#546e7a',
        bandColorIdle: 'rgba(176,190,197,0.3)',
        glowColor: '#cfd8dc',
        shadowBlur: 15,
        icon: Anchor
    },
    classic: {
        id: 'classic',
        label: 'Classic',
        handleColor: '#eceff1',
        bandColorActive: '#81d4fa',
        bandColorIdle: 'rgba(255,255,255,0.3)',
        glowColor: '#42a5f5',
        shadowBlur: 15
    },
    wood: {
        id: 'wood',
        label: 'Wood',
        handleColor: '#8d6e63',
        bandColorActive: '#ffcc80',
        bandColorIdle: 'rgba(255,224,178,0.3)',
        glowColor: '#ffb74d',
        shadowBlur: 10
    },
    neon: {
        id: 'neon',
        label: 'Neon',
        handleColor: '#212121',
        bandColorActive: '#ff4081',
        bandColorIdle: 'rgba(255,64,129,0.3)',
        glowColor: '#f50057',
        shadowBlur: 20
    },
    gold: {
        id: 'gold',
        label: 'Midas',
        handleColor: '#ffd700',
        bandColorActive: '#ffff00',
        bandColorIdle: 'rgba(255,255,0,0.3)',
        glowColor: '#ffea00',
        shadowBlur: 25
    },
    cyber: {
        id: 'cyber',
        label: 'Cyber',
        handleColor: '#000000',
        bandColorActive: '#00e676',
        bandColorIdle: 'rgba(0,230,118,0.3)',
        glowColor: '#00c853',
        shadowBlur: 20
    }
};

// Material Design Colors & Scoring Strategy
const COLOR_CONFIG: Record<BubbleColor, { hex: string, points: number, label: string }> = {
  red:    { hex: '#ef5350', points: 100, label: 'Red' },     // Material Red 400
  blue:   { hex: '#42a5f5', points: 150, label: 'Blue' },    // Material Blue 400
  green:  { hex: '#66bb6a', points: 200, label: 'Green' },   // Material Green 400
  yellow: { hex: '#ffee58', points: 250, label: 'Yellow' },  // Material Yellow 400
  purple: { hex: '#ab47bc', points: 300, label: 'Purple' },  // Material Purple 400
  orange: { hex: '#ffa726', points: 500, label: 'Orange' },   // Material Orange 400
  rainbow:{ hex: '#ffffff', points: 500, label: 'Wildcard' }   // Wildcard
};

const COLOR_KEYS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

// Color Helper for Gradients
const adjustColor = (color: string, amount: number) => {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    
    const componentToHex = (c: number) => {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const TUTORIAL_STEPS = [
    {
        title: "How to Aim & Shoot",
        content: "Use your webcam! Pinch your thumb and index finger together to grab the ball. Move your hand to aim, and release the pinch (open your fingers) to shoot.",
        icon: Hand
    },
    {
        title: "Match Colors",
        content: "Shoot bubbles to create groups of 3 or more of the same color. Matching bubbles will pop and give you points.",
        icon: Target
    },
    {
        title: "Special Power-ups",
        content: "Look for special icons! 💣 Bombs explode nearby bubbles, ❄️ Snowflakes freeze time, and 🌈 Rainbows match with any color.",
        icon: Zap
    },
    {
        title: "Winning & Losing",
        content: "Clear the bubbles to score high! If the bubbles reach the bottom line, the game is over. In Easy mode, bubbles won't move down automatically.",
        icon: Trophy
    }
];

const GeminiSlingshot: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  // Game State Refs
  const ballPos = useRef<Point>({ x: 0, y: 0 });
  const ballVel = useRef<Point>({ x: 0, y: 0 });
  const anchorPos = useRef<Point>({ x: 0, y: 0 });
  const isPinching = useRef<boolean>(false);
  const isFlying = useRef<boolean>(false);
  const flightStartTime = useRef<number>(0);
  const bubbles = useRef<Bubble[]>([]);
  const particles = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  const lastDescentTimeRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);
  const pauseStartTimeRef = useRef<number>(0);
  
  // Powerup Refs
  const freezeUntilRef = useRef<number>(0);

  // Current active color (Ref for loop, State for UI)
  const selectedColorRef = useRef<BubbleColor>('red');
  const gameStateRef = useRef<'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN' | 'PAUSED'>('MENU');
  const difficultyRef = useRef<Difficulty>('medium');
  const handleDesignRef = useRef<HandleDesign>('hook'); // Default to hook
  
  // React State
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [selectedColor, setSelectedColor] = useState<BubbleColor>('red');
  const [availableColors, setAvailableColors] = useState<BubbleColor[]>([]);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN' | 'PAUSED'>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [handleDesign, setHandleDesign] = useState<HandleDesign>('hook'); // Default to hook
  
  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Sync state to ref
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    handleDesignRef.current = handleDesign;
  }, [handleDesign]);

  // --- AUDIO SYSTEM ---
  const initAudio = useCallback(() => {
      if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  }, []);

  const playSound = useCallback((type: 'shoot' | 'pop' | 'click' | 'gameover' | 'bomb' | 'freeze' | 'win') => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'shoot') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } else if (type === 'pop') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'click') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
      } else if (type === 'bomb') {
          // Explosion noise
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
      } else if (type === 'freeze') {
          // Icy chime
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.linearRampToValueAtTime(2000, now + 0.5);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
      } else if (type === 'gameover') {
          const playTone = (freq: number, start: number, duration: number) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.type = 'sawtooth';
              o.frequency.setValueAtTime(freq, start);
              g.gain.setValueAtTime(0.2, start);
              g.gain.linearRampToValueAtTime(0, start + duration);
              o.start(start);
              o.stop(start + duration);
          };
          playTone(400, now, 0.4);
          playTone(300, now + 0.4, 0.4);
          playTone(200, now + 0.8, 0.8);
          return;
      } else if (type === 'win') {
          // Victory Fanfare
          const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.connect(g);
              g.connect(ctx.destination);
              o.type = type;
              o.frequency.setValueAtTime(freq, start);
              g.gain.setValueAtTime(0.2, start);
              g.gain.exponentialRampToValueAtTime(0.01, start + duration);
              o.start(start);
              o.stop(start + duration);
          };
          playTone(523.25, now, 0.2); // C5
          playTone(659.25, now + 0.2, 0.2); // E5
          playTone(783.99, now + 0.4, 0.2); // G5
          playTone(1046.50, now + 0.6, 0.8, 'triangle'); // C6
      }
  }, []);

  // --- GAME LOGIC ---
  
  const getBubblePos = (row: number, col: number, width: number) => {
    const xOffset = (width - (GRID_COLS * BUBBLE_RADIUS * 2)) / 2 + BUBBLE_RADIUS;
    const isOdd = row % 2 !== 0;
    const x = xOffset + col * (BUBBLE_RADIUS * 2) + (isOdd ? BUBBLE_RADIUS : 0);
    const y = BUBBLE_RADIUS + row * ROW_HEIGHT;
    return { x, y };
  };

  const updateAvailableColors = () => {
    const activeColors = new Set<BubbleColor>();
    bubbles.current.forEach(b => {
        if (b.active && b.color !== 'rainbow') activeColors.add(b.color);
    });
    setAvailableColors(Array.from(activeColors));
    
    // If current selected color is gone, switch to first available
    if (!activeColors.has(selectedColorRef.current) && activeColors.size > 0) {
        const next = Array.from(activeColors)[0];
        setSelectedColor(next);
        selectedColorRef.current = next; 
    }
  };

  const isNeighbor = (a: Bubble, b: Bubble) => {
    const dr = b.row - a.row;
    const dc = b.col - a.col;
    if (Math.abs(dr) > 1) return false;
    if (dr === 0) return Math.abs(dc) === 1;
    if (a.row % 2 !== 0) {
        return dc === 0 || dc === 1;
    } else {
        return dc === -1 || dc === 0;
    }
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color
      });
    }
  };

  const createFirework = (x: number, y: number) => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      // INCREASED: More particles for more intense effect
      for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 3; // Slightly faster
          particles.current.push({
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1.5 + Math.random(), // Longer life for fireworks
              color
          });
      }
  };

  const checkWinCondition = () => {
      // Check if there are any active bubbles left
      const activeCount = bubbles.current.filter(b => b.active).length;
      if (activeCount === 0 && gameStateRef.current === 'PLAYING') {
          setGameState('WIN');
          gameStateRef.current = 'WIN';
          playSound('win');
      }
  };

  // Helper to spawn a single bubble with potential powerups
  const spawnBubble = (row: number, col: number, width: number): Bubble => {
      const { x, y } = getBubblePos(row, col, width);
      let color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
      let powerUp: PowerUpType | undefined = undefined;

      // Power-up RNG
      if (Math.random() < POWERUP_CHANCE) {
          const r = Math.random();
          if (r < 0.33) {
              powerUp = 'bomb';
          } else if (r < 0.66) {
              powerUp = 'freeze';
          } else {
              powerUp = 'wildcard';
              color = 'rainbow';
          }
      }

      return {
          id: `${row}-${col}-${Date.now()}-${Math.random()}`,
          row,
          col,
          x,
          y,
          color,
          active: true,
          powerUp
      };
  };

  const dropFloatingBubbles = () => {
    const activeBubbles = bubbles.current.filter(b => b.active);
    if (activeBubbles.length === 0) return;

    // 1. Identify anchored bubbles (BFS starting from row 0)
    const visited = new Set<string>();
    const queue: Bubble[] = [];

    // All bubbles in row 0 are anchors
    activeBubbles.forEach(b => {
        if (b.row === 0) {
            queue.push(b);
            visited.add(b.id);
        }
    });

    let head = 0;
    while(head < queue.length){
        const current = queue[head++];
        activeBubbles.forEach(b => {
            if (!visited.has(b.id) && isNeighbor(current, b)) {
                visited.add(b.id);
                queue.push(b);
            }
        });
    }

    // 2. Identify and drop floating bubbles
    const floatingBubbles = activeBubbles.filter(b => !visited.has(b.id));

    if (floatingBubbles.length > 0) {
        let points = 0;
        floatingBubbles.forEach(b => {
            b.active = false;
            createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex); 
            points += 50; 
        });
        
        playSound('pop'); 
        scoreRef.current += points;
        setScore(scoreRef.current);
        updateAvailableColors();
    }
  };

  const triggerBomb = (centerBubble: Bubble) => {
      playSound('bomb');
      const radius = BUBBLE_RADIUS * 2.5;
      let points = 0;
      bubbles.current.forEach(b => {
          if (!b.active) return;
          const dist = Math.sqrt(Math.pow(b.x - centerBubble.x, 2) + Math.pow(b.y - centerBubble.y, 2));
          if (dist < radius) {
              b.active = false;
              createExplosion(b.x, b.y, '#ffffff');
              points += 50;
          }
      });
      scoreRef.current += points;
      setScore(scoreRef.current);
  };

  const triggerFreeze = () => {
      playSound('freeze');
      freezeUntilRef.current = performance.now() + 10000; // 10 seconds
  };

  const checkMatches = (startBubble: Bubble) => {
    const toCheck = [startBubble];
    const visited = new Set<string>();
    const matches: Bubble[] = [];
    
    // If we hit a rainbow bubble, it adopts our color for matching purposes
    // Or if we are a rainbow bubble, we match everything.
    // Simplifying: Rainbow matches everything.
    const targetColor = startBubble.color; 

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Match condition: Same color OR either is Rainbow
      const isMatch = current.color === targetColor || current.color === 'rainbow' || targetColor === 'rainbow';

      if (isMatch) {
        matches.push(current);
        const neighbors = bubbles.current.filter(b => b.active && !visited.has(b.id) && isNeighbor(current, b));
        toCheck.push(...neighbors);
      }
    }

    if (matches.length >= 3) {
      let points = 0;
      let powerUpsTriggered: Bubble[] = [];

      matches.forEach(b => {
        b.active = false;
        createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex);
        points += COLOR_CONFIG[b.color].points;
        if (b.powerUp) powerUpsTriggered.push(b);
      });

      playSound('pop');
      const multiplier = matches.length > 3 ? 1.5 : 1.0;
      scoreRef.current += Math.floor(points * multiplier);
      setScore(scoreRef.current);

      // Handle Powerups
      powerUpsTriggered.forEach(b => {
          if (b.powerUp === 'bomb') triggerBomb(b);
          if (b.powerUp === 'freeze') triggerFreeze();
      });

      dropFloatingBubbles();
      checkWinCondition(); // Check win after matches and potential drops
      return true;
    }
    return false;
  };

  const startGame = (level: Difficulty) => {
    initAudio();
    playSound('click');
    if (!gameContainerRef.current) return;
    setDifficulty(level);
    difficultyRef.current = level; 
    setGameState('PLAYING');
    gameStateRef.current = 'PLAYING'; 
    
    setScore(0);
    scoreRef.current = 0;
    isGameOverRef.current = false;
    lastDescentTimeRef.current = performance.now();
    freezeUntilRef.current = 0;
    particles.current = [];
    
    if (canvasRef.current) {
        const anchor = { x: canvasRef.current.width / 2, y: canvasRef.current.height - SLINGSHOT_BOTTOM_OFFSET };
        anchorPos.current = anchor;
        ballPos.current = { ...anchor };
    }
    ballVel.current = { x: 0, y: 0 };
    isFlying.current = false;
    isPinching.current = false;
    
    const width = gameContainerRef.current.clientWidth;
    const settings = DIFFICULTY_SETTINGS[level];
    const newBubbles: Bubble[] = [];
    
    for (let r = 0; r < settings.rows; r++) { 
      for (let c = 0; c < (r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS); c++) {
        if (Math.random() > 0.1) {
            newBubbles.push(spawnBubble(r, c, width));
        }
      }
    }
    bubbles.current = newBubbles;
    updateAvailableColors();
  };

  const addNewRow = (canvasWidth: number) => {
      let gameOver = false;
      const thresholdY = canvasRef.current ? canvasRef.current.height - SLINGSHOT_BOTTOM_OFFSET - BUBBLE_RADIUS * 2 : 1000;

      bubbles.current.forEach(b => {
          if (!b.active) return;
          b.row++;
          const { x, y } = getBubblePos(b.row, b.col, canvasWidth);
          b.x = x;
          b.y = y;
          if (b.y > thresholdY) gameOver = true;
      });

      if (gameOver) {
          isGameOverRef.current = true;
          setGameState('GAMEOVER');
          gameStateRef.current = 'GAMEOVER';
          playSound('gameover');
          return;
      }

      const colsInRow = GRID_COLS; 
      for (let c = 0; c < colsInRow; c++) {
          if (Math.random() > 0.1) {
              bubbles.current.push(spawnBubble(0, c, canvasWidth));
          }
      }
      updateAvailableColors();
  };

  const nextTutorialStep = () => {
      playSound('click');
      if (tutorialStep < TUTORIAL_STEPS.length - 1) {
          setTutorialStep(prev => prev + 1);
      } else {
          setShowTutorial(false);
          setTutorialStep(0);
      }
  };

  const prevTutorialStep = () => {
      playSound('click');
      if (tutorialStep > 0) {
          setTutorialStep(prev => prev - 1);
      }
  };

  const skipTutorial = () => {
      playSound('click');
      setShowTutorial(false);
      setTutorialStep(0);
  };

  const togglePause = () => {
      playSound('click');
      if (gameState === 'PLAYING') {
          setGameState('PAUSED');
          gameStateRef.current = 'PAUSED';
          pauseStartTimeRef.current = performance.now();
      } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
          gameStateRef.current = 'PLAYING';
          const now = performance.now();
          const pausedDuration = now - pauseStartTimeRef.current;
          
          // Compensate timers so player isn't penalized for pausing
          lastDescentTimeRef.current += pausedDuration;
          if (freezeUntilRef.current > now) {
             freezeUntilRef.current += pausedDuration;
          }
      }
  };

  // --- Rendering Helper ---
  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colorKey: BubbleColor, powerUp?: PowerUpType) => {
    const config = COLOR_CONFIG[colorKey];
    
    // Gradient Logic
    let grad;
    if (colorKey === 'rainbow') {
        grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, '#ff9999');
        grad.addColorStop(0.2, '#ffff99');
        grad.addColorStop(0.4, '#99ff99');
        grad.addColorStop(0.6, '#99ffff');
        grad.addColorStop(0.8, '#9999ff');
        grad.addColorStop(1, '#ff99ff');
    } else {
        const baseColor = config.hex;
        grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        grad.addColorStop(0, '#ffffff');             
        grad.addColorStop(0.2, baseColor);           
        grad.addColorStop(1, adjustColor(baseColor, -60)); 
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = colorKey === 'rainbow' ? 'white' : adjustColor(config.hex, -80);
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Shine
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y - radius * 0.35, radius * 0.25, radius * 0.15, Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Draw PowerUp Icon
    if (powerUp) {
        ctx.font = `${radius}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let icon = '';
        if (powerUp === 'bomb') icon = '💣';
        if (powerUp === 'freeze') icon = '❄️';
        if (powerUp === 'wildcard') icon = '🌈';
        ctx.fillText(icon, x, y + 2);
    }
  };

  // --- Main Game Loop ---

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || !gameContainerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = gameContainerRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    anchorPos.current = { x: canvas.width / 2, y: canvas.height - SLINGSHOT_BOTTOM_OFFSET };
    ballPos.current = { ...anchorPos.current };
    
    let camera: any = null;
    let hands: any = null;

    const onResults = (results: any) => {
      setLoading(false);
      
      if (canvas.width !== container.clientWidth || canvas.height !== container.clientHeight) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        anchorPos.current = { x: canvas.width / 2, y: canvas.height - SLINGSHOT_BOTTOM_OFFSET };
        if (!isFlying.current && !isPinching.current) {
          ballPos.current = { ...anchorPos.current };
        }
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(18, 18, 18, 0.85)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      const isFrozen = now < freezeUntilRef.current;

      // --- GAME LOGIC UPDATES ---
      if (gameStateRef.current === 'PLAYING' && !isGameOverRef.current) {
          const settings = DIFFICULTY_SETTINGS[difficultyRef.current];
          
          // MODIFIED: Only add new rows if NOT in easy mode
          if (difficultyRef.current !== 'easy' && !isFrozen && now - lastDescentTimeRef.current > settings.descentInterval) {
              addNewRow(canvas.width);
              lastDescentTimeRef.current = now;
          }
      }

      // --- WINNING EFFECTS ---
      if (gameStateRef.current === 'WIN') {
          // INCREASED: More frequent fireworks
          if (Math.random() < 0.15) { // 15% chance per frame (up from 5%)
              createFirework(
                  Math.random() * canvas.width, 
                  Math.random() * (canvas.height * 0.6) // Keep fireworks in upper 60%
              );
              // Occasional explosion sound
              if (Math.random() < 0.3) playSound('pop');
          }
      }

      // --- Hand Tracking ---
      let handPos: Point | null = null;
      let pinchDist = 1.0;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const idxTip = landmarks[8];
        const thumbTip = landmarks[4];

        handPos = {
          x: (idxTip.x * canvas.width + thumbTip.x * canvas.width) / 2,
          y: (idxTip.y * canvas.height + thumbTip.y * canvas.height) / 2
        };

        const dx = idxTip.x - thumbTip.x;
        const dy = idxTip.y - thumbTip.y;
        pinchDist = Math.sqrt(dx * dx + dy * dy);

        if (window.drawConnectors && window.drawLandmarks) {
           window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {color: '#669df6', lineWidth: 1});
           window.drawLandmarks(ctx, landmarks, {color: '#aecbfa', lineWidth: 1, radius: 2});
        }
        
        ctx.beginPath();
        ctx.arc(handPos.x, handPos.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = pinchDist < PINCH_THRESHOLD ? '#66bb6a' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // --- SLINGSHOT LOGIC ---
      // Pause inputs during tutorial OR when paused
      if (gameStateRef.current === 'PLAYING' && !showTutorial) {
          if (handPos && pinchDist < PINCH_THRESHOLD && !isFlying.current) {
            const distToBall = Math.sqrt(Math.pow(handPos.x - ballPos.current.x, 2) + Math.pow(handPos.y - ballPos.current.y, 2));
            if (!isPinching.current && distToBall < 100) {
              isPinching.current = true;
            }
            
            if (isPinching.current) {
                ballPos.current = { x: handPos.x, y: handPos.y };
                const dragDx = ballPos.current.x - anchorPos.current.x;
                const dragDy = ballPos.current.y - anchorPos.current.y;
                const dragDist = Math.sqrt(dragDx*dragDx + dragDy*dragDy);
                
                if (dragDist > MAX_DRAG_DIST) {
                    const angle = Math.atan2(dragDy, dragDx);
                    ballPos.current.x = anchorPos.current.x + Math.cos(angle) * MAX_DRAG_DIST;
                    ballPos.current.y = anchorPos.current.y + Math.sin(angle) * MAX_DRAG_DIST;
                }
            }
          } 
          else if (isPinching.current && (!handPos || pinchDist >= PINCH_THRESHOLD)) {
            isPinching.current = false;
            
            const dx = anchorPos.current.x - ballPos.current.x;
            const dy = anchorPos.current.y - ballPos.current.y;
            const stretchDist = Math.sqrt(dx*dx + dy*dy);
            
            if (stretchDist > 30) {
                isFlying.current = true;
                playSound('shoot'); 
                flightStartTime.current = performance.now();
                const powerRatio = Math.min(stretchDist / MAX_DRAG_DIST, 1.0);
                const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);

                ballVel.current = {
                    x: dx * velocityMultiplier,
                    y: dy * velocityMultiplier
                };
            } else {
                ballPos.current = { ...anchorPos.current };
            }
          }
          else if (!isFlying.current && !isPinching.current) {
              const dx = anchorPos.current.x - ballPos.current.x;
              const dy = anchorPos.current.y - ballPos.current.y;
              ballPos.current.x += dx * 0.15;
              ballPos.current.y += dy * 0.15;
          }
      } else if (gameStateRef.current === 'PAUSED') {
          // If paused, maintain static position if not flying, or freeze if flying
          if (!isFlying.current) {
              ballPos.current = { ...anchorPos.current };
          }
      } else {
          ballPos.current = { ...anchorPos.current };
      }

      // --- Physics ---
      // Wrap physics in Playing check to freeze when paused
      if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'WIN') {
        if (isFlying.current) {
            if (performance.now() - flightStartTime.current > 5000) {
                isFlying.current = false;
                ballPos.current = { ...anchorPos.current };
                ballVel.current = { x: 0, y: 0 };
            } else {
                const currentSpeed = Math.sqrt(ballVel.current.x ** 2 + ballVel.current.y ** 2);
                const steps = Math.ceil(currentSpeed / (BUBBLE_RADIUS * 0.8)); 
                let collisionOccurred = false;

                for (let i = 0; i < steps; i++) {
                    ballPos.current.x += ballVel.current.x / steps;
                    ballPos.current.y += ballVel.current.y / steps;
                    
                    if (ballPos.current.x < BUBBLE_RADIUS || ballPos.current.x > canvas.width - BUBBLE_RADIUS) {
                        ballVel.current.x *= -1;
                        ballPos.current.x = Math.max(BUBBLE_RADIUS, Math.min(canvas.width - BUBBLE_RADIUS, ballPos.current.x));
                    }

                    if (ballPos.current.y < BUBBLE_RADIUS) {
                        collisionOccurred = true;
                        break;
                    }

                    for (const b of bubbles.current) {
                        if (!b.active) continue;
                        const dist = Math.sqrt(
                            Math.pow(ballPos.current.x - b.x, 2) + 
                            Math.pow(ballPos.current.y - b.y, 2)
                        );
                        if (dist < BUBBLE_RADIUS * 1.8) { 
                            collisionOccurred = true;
                            break;
                        }
                    }
                    if (collisionOccurred) break;
                }

                ballVel.current.y += GRAVITY; 
                ballVel.current.x *= FRICTION;
                ballVel.current.y *= FRICTION;

                if (collisionOccurred) {
                    isFlying.current = false;
                    
                    let bestDist = Infinity;
                    let bestRow = 0;
                    let bestCol = 0;
                    let bestX = 0;
                    let bestY = 0;

                    for (let r = 0; r < GRID_ROWS + 10; r++) { 
                        const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
                        for (let c = 0; c < colsInRow; c++) {
                            const { x, y } = getBubblePos(r, c, canvas.width);
                            const occupied = bubbles.current.some(b => b.active && b.row === r && b.col === c);
                            if (occupied) continue;

                            const dist = Math.sqrt(
                                Math.pow(ballPos.current.x - x, 2) + 
                                Math.pow(ballPos.current.y - y, 2)
                            );
                            
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestRow = r;
                                bestCol = c;
                                bestX = x;
                                bestY = y;
                            }
                        }
                    }

                    const newBubble: Bubble = {
                        id: `${bestRow}-${bestCol}-${Date.now()}`,
                        row: bestRow,
                        col: bestCol,
                        x: bestX,
                        y: bestY,
                        color: selectedColorRef.current,
                        active: true
                    };
                    bubbles.current.push(newBubble);
                    checkMatches(newBubble);
                    updateAvailableColors();
                    
                    ballPos.current = { ...anchorPos.current };
                    ballVel.current = { x: 0, y: 0 };
                }
                
                if (ballPos.current.y > canvas.height) {
                    isFlying.current = false;
                    ballPos.current = { ...anchorPos.current };
                    ballVel.current = { x: 0, y: 0 };
                }
            }
        }
      }

      // --- Drawing ---
      
      // Draw Grid Bubbles
      bubbles.current.forEach(b => {
          if (!b.active) return;
          drawBubble(ctx, b.x, b.y, BUBBLE_RADIUS - 1, b.color, b.powerUp);
      });

      // Frozen Effect Overlay
      if (isFrozen) {
          ctx.save();
          ctx.strokeStyle = '#29b6f6';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]);
          ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
          
          ctx.fillStyle = '#29b6f6';
          ctx.font = 'bold 20px Roboto';
          ctx.fillText("❄️ TIME FROZEN", canvas.width / 2 - 80, 40);
          ctx.restore();
      }

      // Trajectory Line
      if (gameStateRef.current === 'PLAYING' && isPinching.current && !isFlying.current && !showTutorial) {
         const dx = anchorPos.current.x - ballPos.current.x;
         const dy = anchorPos.current.y - ballPos.current.y;
         const stretchDist = Math.sqrt(dx*dx + dy*dy);
         
         if (stretchDist > 30) {
            const powerRatio = Math.min(stretchDist / MAX_DRAG_DIST, 1.0);
            const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);
            
            let simX = ballPos.current.x;
            let simY = ballPos.current.y;
            let simVx = dx * velocityMultiplier;
            let simVy = dy * velocityMultiplier;
            
            ctx.beginPath();
            ctx.moveTo(simX, simY);
            
            for(let i=0; i<40; i++) {
               simX += simVx;
               simY += simVy;
               simVx *= FRICTION;
               simVy *= FRICTION;
               
               if (simX < BUBBLE_RADIUS || simX > canvas.width - BUBBLE_RADIUS) {
                   simVx *= -1;
                   simX = Math.max(BUBBLE_RADIUS, Math.min(canvas.width - BUBBLE_RADIUS, simX));
               }
               
               ctx.lineTo(simX, simY);
               if (simY < BUBBLE_RADIUS) break;
            }
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
         }
      }
      
      // Modern Slingshot Rendering
      const currentTheme = HANDLE_THEMES[handleDesignRef.current];
      const bandColor = isPinching.current ? currentTheme.bandColorActive : currentTheme.bandColorIdle;
      const handleColor = currentTheme.handleColor;
      
      // Slingshot Back Band
      if (!isFlying.current && gameStateRef.current !== 'MENU' && gameStateRef.current !== 'GAMEOVER') {
        ctx.beginPath();
        ctx.moveTo(anchorPos.current.x - 35, anchorPos.current.y);
        ctx.lineTo(ballPos.current.x, ballPos.current.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = bandColor;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Projectile
      if (gameStateRef.current !== 'MENU' && gameStateRef.current !== 'GAMEOVER') {
        ctx.save();
        drawBubble(ctx, ballPos.current.x, ballPos.current.y, BUBBLE_RADIUS, selectedColorRef.current);
        ctx.restore();
      }

      // Slingshot Front Band
      if (!isFlying.current && gameStateRef.current !== 'MENU' && gameStateRef.current !== 'GAMEOVER') {
        ctx.beginPath();
        ctx.moveTo(ballPos.current.x, ballPos.current.y);
        ctx.lineTo(anchorPos.current.x + 35, anchorPos.current.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = bandColor;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Slingshot Handle (Modern U-Shape with Glow)
      ctx.save();
      ctx.shadowBlur = currentTheme.shadowBlur;
      ctx.shadowColor = currentTheme.glowColor;
      ctx.strokeStyle = handleColor;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      // Base curve
      const ay = anchorPos.current.y;
      const ax = anchorPos.current.x;
      const hHeight = 50;
      const hWidth = 35;
      
      if (handleDesignRef.current === 'hook') {
         // Stick
        ctx.moveTo(ax, ay + hHeight);
        ctx.lineTo(ax, canvas.height);
        
        // Left Arm (Curved outward aggressively)
        ctx.moveTo(ax, ay + hHeight);
        ctx.bezierCurveTo(ax - 20, ay + hHeight + 10, ax - 60, ay + 40, ax - hWidth, ay);
        
        // Right Arm
        ctx.moveTo(ax, ay + hHeight);
        ctx.bezierCurveTo(ax + 20, ay + hHeight + 10, ax + 60, ay + 40, ax + hWidth, ay);
      } else {
         // Left arm to Right arm curve (Standard)
        ctx.moveTo(ax - hWidth, ay);
        ctx.quadraticCurveTo(ax - hWidth, ay + hHeight, ax, ay + hHeight);
        ctx.quadraticCurveTo(ax + hWidth, ay + hHeight, ax + hWidth, ay);
        
        // Handle stick
        ctx.moveTo(ax, ay + hHeight);
        ctx.lineTo(ax, canvas.height);
      }

      ctx.stroke();
      ctx.restore();

      // Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
          const p = particles.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += PARTICLE_GRAVITY; // Apply gravity
          p.life -= 0.05;
          if (p.life <= 0) particles.current.splice(i, 1);
          else {
              ctx.globalAlpha = p.life;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.fill();
              ctx.globalAlpha = 1.0;
          }
      }
      
      ctx.restore();
    };

    if (window.Hands) {
      hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResults);
      if (window.Camera) {
        camera = new window.Camera(video, {
          onFrame: async () => {
            if (videoRef.current && hands) await hands.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      }
    }

    return () => {
        if (camera) camera.stop();
        if (hands) hands.close();
    };
  }, [showTutorial]); // Updated dependency to pause loop effects if tutorial logic changes

  return (
    <div className="flex flex-col md:flex-row w-full h-screen bg-[#121212] overflow-hidden font-roboto text-[#e3e3e3]">
      
      {/* LEFT: GAME AREA (Responsive Order) */}
      <div ref={gameContainerRef} className="flex-1 relative overflow-hidden bg-black/40 order-1 md:order-1 h-full">
        <video ref={videoRef} className="absolute hidden" playsInline />
        <canvas ref={canvasRef} className="absolute inset-0" />

        {/* Loading Overlay */}
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212] z-50">
            <div className="flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-[#42a5f5] animate-spin mb-4" />
                <p className="text-[#e3e3e3] text-lg font-medium">Initializing Camera...</p>
            </div>
            </div>
        )}

        {/* --- PAUSE BUTTON (In-Game) --- */}
        {!loading && (gameState === 'PLAYING' || gameState === 'PAUSED') && !showTutorial && (
            <button
                onClick={togglePause}
                className="absolute top-4 right-4 z-40 p-3 rounded-full bg-[#1e1e1e]/80 border border-[#444746] hover:bg-[#2d2d2d] transition-all duration-200"
                title={gameState === 'PAUSED' ? "Resume" : "Pause"}
            >
                {gameState === 'PAUSED' ? (
                    <Play className="w-6 h-6 text-[#66bb6a] fill-current" />
                ) : (
                    <Pause className="w-6 h-6 text-[#c4c7c5] fill-current" />
                )}
            </button>
        )}

        {/* --- PAUSED OVERLAY --- */}
        {gameState === 'PAUSED' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
                 <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-[#444746] shadow-2xl text-center">
                     <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Paused</h2>
                     <button
                        onClick={togglePause}
                        className="w-full py-3 px-8 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                     >
                         <Play className="w-5 h-5 fill-current" />
                         Resume
                     </button>
                     <p className="mt-4 text-sm text-[#c4c7c5]">
                        Game loop frozen. Take a breath!
                     </p>
                 </div>
             </div>
        )}

        {/* --- TUTORIAL OVERLAY --- */}
        {!loading && showTutorial && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-300">
                <div className="bg-[#1e1e1e] p-6 md:p-8 rounded-[32px] border border-[#444746] shadow-2xl max-w-md w-full mx-4 relative">
                    <button 
                        onClick={skipTutorial}
                        className="absolute top-4 right-4 p-2 text-[#c4c7c5] hover:text-white hover:bg-[#2d2d2d] rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[#42a5f5]/20 rounded-full flex items-center justify-center mb-6">
                             {React.createElement(TUTORIAL_STEPS[tutorialStep].icon, { className: "w-8 h-8 text-[#42a5f5]" })}
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-3">
                            {TUTORIAL_STEPS[tutorialStep].title}
                        </h2>
                        <p className="text-[#c4c7c5] mb-8 leading-relaxed">
                            {TUTORIAL_STEPS[tutorialStep].content}
                        </p>

                        <div className="flex gap-2 mb-6">
                            {TUTORIAL_STEPS.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === tutorialStep ? 'w-6 bg-[#42a5f5]' : 'bg-[#444746]'}`}
                                />
                            ))}
                        </div>

                        <div className="flex w-full gap-3">
                            {tutorialStep > 0 && (
                                <button
                                    onClick={prevTutorialStep}
                                    className="flex-1 py-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-xl font-bold transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={nextTutorialStep}
                                className="flex-1 py-3 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                            >
                                {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let's Play!" : "Next"}
                                {tutorialStep < TUTORIAL_STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- MAIN MENU (Centered in Game Area) --- */}
        {!loading && gameState === 'MENU' && !showTutorial && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm z-50 animate-in fade-in duration-500">
                <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-[#444746] shadow-2xl max-w-md w-full text-center m-4">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Slingshot</h1>
                    <p className="text-[#c4c7c5] mb-8 text-sm">Developed by Eleandro</p>
                    
                    <div className="space-y-4">
                        {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((key) => {
                            const setting = DIFFICULTY_SETTINGS[key];
                            const Icon = setting.icon;
                            return (
                                <button
                                    key={key}
                                    onClick={() => startGame(key)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#444746] hover:bg-[#2d2d2d] hover:border-[#a8c7fa] transition-all duration-200 group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full bg-[${setting.color}]/20`} style={{ backgroundColor: `${setting.color}33` }}>
                                            <Icon className="w-6 h-6" style={{ color: setting.color }} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white font-bold text-lg">{setting.label}</p>
                                            <p className="text-[#c4c7c5] text-xs">
                                                {setting.rows} starting rows • {key === 'easy' ? 'No auto drop' : `${setting.descentInterval / 1000}s drop`}
                                            </p>
                                        </div>
                                    </div>
                                    <Play className="w-5 h-5 text-[#444746] group-hover:text-[#a8c7fa]" />
                                </button>
                            );
                        })}
                        
                        <button
                            onClick={() => {
                                playSound('click');
                                setShowTutorial(true);
                                setTutorialStep(0);
                            }}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-[#444746] hover:bg-[#2d2d2d] text-[#c4c7c5] hover:text-white transition-all duration-200 mt-2"
                        >
                            <HelpCircle className="w-5 h-5" />
                            <span className="font-medium">How to Play</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- GAME OVER SCREEN (Centered in Game Area) --- */}
        {gameState === 'GAMEOVER' && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/90 backdrop-blur-md z-50 animate-in zoom-in duration-300">
                <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-[#ef5350] shadow-2xl max-w-sm w-full text-center m-4">
                    <div className="w-20 h-20 bg-[#ef5350]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-[#ef5350]" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
                    <p className="text-[#c4c7c5] mb-6">The bubbles reached the line!</p>
                    
                    <div className="bg-[#2d2d2d] rounded-xl p-4 mb-8">
                        <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-bold mb-1">Final Score</p>
                        <p className="text-4xl font-black text-white">{score.toLocaleString()}</p>
                    </div>
                    
                    <button
                        onClick={() => {
                            initAudio();
                            playSound('click');
                            setGameState('MENU');
                            gameStateRef.current = 'MENU';
                        }}
                        className="w-full py-4 bg-[#ef5350] hover:bg-[#e53935] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Try Again
                    </button>
                </div>
             </div>
        )}

        {/* --- WIN SCREEN (Centered in Game Area) --- */}
        {gameState === 'WIN' && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/80 backdrop-blur-md z-50 animate-in zoom-in duration-500">
                {/* Made background semi-transparent so fireworks are visible behind */}
                <div className="bg-[#1e1e1e]/90 p-8 rounded-[32px] border border-[#66bb6a] shadow-[0_0_50px_rgba(102,187,106,0.3)] max-w-sm w-full text-center m-4 relative overflow-hidden backdrop-blur-sm">
                    {/* Decorative shine */}
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/5 to-transparent rotate-45 pointer-events-none animate-pulse" />
                    
                    <div className="w-24 h-24 bg-[#66bb6a]/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <Sparkles className="w-12 h-12 text-[#66bb6a]" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Congratulations!</h2>
                    <p className="text-xl font-bold text-[#42a5f5] mb-2">You are the best!</p>
                    <p className="text-[#c4c7c5] mb-8">You cleared the board!</p>
                    
                    <div className="bg-[#2d2d2d] rounded-xl p-4 mb-8 border border-[#66bb6a]/30">
                        <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-bold mb-1">Victory Score</p>
                        <p className="text-5xl font-black text-[#66bb6a]">{score.toLocaleString()}</p>
                    </div>
                    
                    <button
                        onClick={() => {
                            initAudio();
                            playSound('click');
                            setGameState('MENU');
                            gameStateRef.current = 'MENU';
                        }}
                        className="w-full py-4 bg-[#66bb6a] hover:bg-[#57a05b] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-[#66bb6a]/30"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Play Again
                    </button>
                </div>
             </div>
        )}

        {/* Bottom Tip (Centered relative to Game Area) */}
        {gameState === 'PLAYING' && !isPinching.current && !isFlying.current && !showTutorial && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-50">
                <div className="flex items-center gap-2 bg-[#1e1e1e]/90 px-4 py-2 rounded-full border border-[#444746] backdrop-blur-sm">
                    <Play className="w-3 h-3 text-[#42a5f5] fill-current" />
                    <p className="text-[#e3e3e3] text-xs font-medium">Pinch & Pull to Shoot</p>
                </div>
            </div>
        )}
      </div>

      {/* RIGHT: SIDEBAR HUD (Desktop) / BOTTOM BAR (Mobile) */}
      <div className="md:w-72 md:h-full md:border-l w-full h-auto border-t bg-[#1e1e1e] border-[#444746] flex flex-row md:flex-col z-20 shadow-2xl relative shrink-0 order-2 md:order-2">
          
          {/* Header (Desktop Only) */}
          <div className="hidden md:block p-6 border-b border-[#444746]">
              <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#42a5f5]/20 rounded-lg">
                      <Target className="w-5 h-5 text-[#42a5f5]" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight leading-tight">Slingshot</h2>
              </div>
              
              <a 
                href="https://www.linkedin.com/in/eleandro-mangrich" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity mt-2"
              >
                  <Linkedin className="w-4 h-4 text-[#0077b5]" />
                  <p className="text-[10px] text-[#c4c7c5] font-bold tracking-wider">DEVELOPED BY ELEANDRO</p>
              </a>

              <div className="flex items-center justify-end mt-4">
                <button 
                    onClick={() => {
                        playSound('click');
                        setShowTutorial(true);
                        setTutorialStep(0);
                    }}
                    className="p-2 bg-[#2d2d2d] rounded-lg text-[#c4c7c5] hover:text-[#42a5f5] hover:bg-[#3d3d3d] transition-all flex items-center gap-2 text-xs font-bold" 
                    title="Tutorial"
                >
                    <HelpCircle className="w-4 h-4" />
                    Help
                </button>
              </div>
          </div>

          <div className="flex-1 p-3 md:p-6 flex flex-row md:flex-col gap-4 md:gap-8 overflow-x-auto md:overflow-y-auto items-center md:items-stretch no-scrollbar">
              
              {/* Score Panel */}
              <div className="flex flex-col md:space-y-2 min-w-[80px]">
                   <div className="hidden md:flex items-center justify-between">
                       <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Score</span>
                       <Trophy className="w-4 h-4 text-[#ffd700]" />
                   </div>
                   <div className="bg-transparent md:bg-[#2d2d2d] md:rounded-2xl md:p-4 md:border md:border-[#444746]">
                       <span className="text-xl md:text-3xl font-black text-white block">
                            <span className="md:hidden text-xs text-[#c4c7c5] mr-2">PTS</span>
                            {score.toLocaleString()}
                       </span>
                   </div>
              </div>

              {/* Difficulty Panel (Desktop Only) */}
              <div className="hidden md:block space-y-2">
                  <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Difficulty</span>
                  <div className="flex items-center gap-3 bg-[#2d2d2d] p-3 rounded-xl border border-[#444746]">
                      {(() => {
                           const s = DIFFICULTY_SETTINGS[difficulty];
                           const Icon = s.icon;
                           return <Icon className="w-5 h-5" style={{ color: s.color }} />;
                      })()}
                      <span className="font-bold text-[#e3e3e3] capitalize">{difficulty}</span>
                  </div>
              </div>

              {/* Active Ammo (Desktop Only - Mobile relies on Arsenal highlight) */}
              <div className="hidden md:block space-y-2">
                  <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Loaded Ammo</span>
                  <div className="flex justify-center py-6 bg-[#2d2d2d] rounded-2xl border border-[#444746] relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10" 
                           style={{ background: `radial-gradient(circle at center, ${COLOR_CONFIG[selectedColor].hex}, transparent)` }} 
                      />
                      <div className="w-16 h-16 rounded-full shadow-lg relative z-10"
                           style={{ 
                                background: `radial-gradient(circle at 35% 35%, ${COLOR_CONFIG[selectedColor].hex}, ${adjustColor(COLOR_CONFIG[selectedColor].hex, -60)})`,
                                boxShadow: `0 0 20px ${COLOR_CONFIG[selectedColor].hex}66`
                           }}
                      >
                         <div className="absolute top-2 left-3 w-5 h-3 bg-white/40 rounded-full transform -rotate-45 filter blur-[1px]" />
                      </div>
                  </div>
              </div>

              {/* Arsenal Grid (Adaptive) */}
              <div className="flex-1 md:flex-none space-y-0 md:space-y-2 flex flex-col justify-center">
                  <div className="hidden md:flex items-center justify-between">
                     <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Arsenal</span>
                     <Crosshair className="w-3 h-3 text-[#c4c7c5]" />
                  </div>
                  <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto pb-1 md:pb-0 px-1 items-center">
                      {availableColors.length === 0 ? (
                          <p className="col-span-3 text-center text-xs text-gray-500 py-4 italic whitespace-nowrap">No ammo</p>
                      ) : (
                          COLOR_KEYS.map(color => {
                              const isAvailable = availableColors.includes(color);
                              const isSelected = selectedColor === color;
                              const config = COLOR_CONFIG[color];
                              
                              return (
                                  <button
                                      key={color}
                                      disabled={!isAvailable}
                                      onClick={() => {
                                          if(isAvailable) {
                                              playSound('click');
                                              setSelectedColor(color);
                                          }
                                      }}
                                      className={`
                                          aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative shrink-0
                                          ${!isAvailable ? 'opacity-20 cursor-not-allowed bg-[#2d2d2d]' : 'hover:scale-105'}
                                          ${isSelected ? 'ring-2 ring-white z-10 scale-105 w-10 h-10 md:w-auto md:h-auto' : 'border border-transparent w-8 h-8 md:w-auto md:h-auto'}
                                      `}
                                      style={{
                                          backgroundColor: isAvailable ? '#2d2d2d' : undefined,
                                          borderColor: isSelected ? 'white' : '#444746'
                                      }}
                                  >
                                      {isAvailable && (
                                          <div className="w-full h-full rounded-full transform scale-75"
                                              style={{ background: config.hex }}
                                          />
                                      )}
                                      {!isAvailable && <div className="w-2 h-2 rounded-full bg-[#444746]" />}
                                  </button>
                              )
                          })
                      )}
                  </div>
              </div>
              
              {/* Style Selector */}
              <div className="flex-1 md:flex-none space-y-0 md:space-y-2 flex flex-col justify-center">
                  <div className="hidden md:flex items-center justify-between">
                     <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Style</span>
                     <Palette className="w-3 h-3 text-[#c4c7c5]" />
                  </div>
                  <div className="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto pb-1 md:pb-0 px-1 items-center">
                      {(Object.values(HANDLE_THEMES)).map((theme) => (
                          <button
                              key={theme.id}
                              onClick={() => { playSound('click'); setHandleDesign(theme.id); }}
                              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 relative shrink-0 hover:scale-110`}
                              style={{ 
                                  backgroundColor: theme.handleColor, 
                                  borderColor: handleDesign === theme.id ? theme.glowColor : '#444746',
                                  boxShadow: handleDesign === theme.id ? `0 0 10px ${theme.glowColor}` : 'none'
                              }}
                              title={theme.label}
                          >
                               {handleDesign === theme.id && <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white animate-pulse" />}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Mobile Menu Trigger */}
               <button 
                onClick={() => {
                    playSound('click');
                    setGameState('MENU');
                    gameStateRef.current = 'MENU';
                }}
                className="md:hidden p-3 rounded-xl bg-[#2d2d2d] border border-[#444746] text-[#e3e3e3] shrink-0"
              >
                  <MenuIcon className="w-5 h-5" />
              </button>
          </div>
          
          {/* Footer Controls (Desktop Only) */}
          <div className="hidden md:block p-6 border-t border-[#444746] bg-[#1a1a1a]">
              <button 
                onClick={() => {
                    playSound('click');
                    setGameState('MENU');
                    gameStateRef.current = 'MENU';
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#e3e3e3] text-sm font-bold transition-colors border border-[#444746]"
              >
                  <MenuIcon className="w-4 h-4" />
                  Main Menu
              </button>
          </div>
      </div>
    </div>
  );
};

export default GeminiSlingshot;
