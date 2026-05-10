/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Point, Bubble, Particle, BubbleColor, PowerUpType, StrategicHint, AiResponse } from '../types';
import { Loader2, Trophy, Play, MousePointerClick, Monitor, Zap, Shield, Skull, RotateCcw, Target, Menu as MenuIcon, Crosshair, Snowflake, Flame, Rainbow, Linkedin, HelpCircle, Hand, ArrowRight, X, Sparkles, Pause, Palette, Anchor, AlertCircle, Camera as CameraIcon, BrainCircuit, Info } from 'lucide-react';
import { getStrategicHint, TargetCandidate } from '../services/geminiService';

const PINCH_GRAB_THRESHOLD = 0.06; 
const PINCH_RELEASE_THRESHOLD = 0.1; 
const GRAVITY = 0.0; 
const FRICTION = 0.998; 
const PARTICLE_GRAVITY = 0.15; // Gravity for particles (fireworks)

// Grid Constants (Layout is now dynamic)
const GRID_COLS = 12;
const GRID_ROWS = 8;

// Force Multipliers
const MIN_FORCE_MULT = 0.15;
const MAX_FORCE_MULT = 0.45;

const POWERUP_CHANCE = 0.20; // Slightly increased for visibility

type Difficulty = 'easy' | 'medium' | 'hard';
type HandleDesign = 'classic' | 'wood' | 'neon' | 'gold' | 'cyber' | 'cannon';

const DIFFICULTY_SETTINGS = {
  easy: { 
    label: 'Easy', 
    rows: 3, 
    descentInterval: 30000, 
    color: '#66bb6a',
    icon: Shield,
    maxColors: 5
  },
  medium: { 
    label: 'Medium', 
    rows: 5, 
    descentInterval: 20000, 
    color: '#42a5f5',
    icon: Zap,
    maxColors: 6
  },
  hard: { 
    label: 'Hard', 
    rows: 7, 
    descentInterval: 12000, 
    color: '#ef5350',
    icon: Skull,
    maxColors: 6
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
    cannon: {
        id: 'cannon',
        label: 'Cannon',
        handleColor: '#455a64',
        bandColorActive: '#00e5ff',
        bandColorIdle: 'rgba(0,229,255,0.2)',
        glowColor: '#00b8d4',
        shadowBlur: 20,
        icon: Crosshair
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

const COLOR_CONFIG: Record<BubbleColor, { hex: string, points: number, label: string }> = {
  red:    { hex: '#ef5350', points: 100, label: 'Red' },
  blue:   { hex: '#42a5f5', points: 150, label: 'Blue' },
  green:  { hex: '#66bb6a', points: 200, label: 'Green' },
  yellow: { hex: '#ffee58', points: 250, label: 'Yellow' },
  purple: { hex: '#ab47bc', points: 300, label: 'Purple' },
  orange: { hex: '#ffa726', points: 500, label: 'Orange' },
  rainbow:{ hex: '#ffffff', points: 500, label: 'Wildcard' }
};

const COLOR_KEYS: BubbleColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

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
        content: "Use your webcam! Pinch your thumb and index finger together to charge the cannon. Move your hand to aim, and release the pinch (open your fingers) to fire.",
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

const PrismShot: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const layoutRef = useRef({
    bubbleRadius: 22,
    rowHeight: 38,
    cannonOffset: 220,
    maxDragDist: 180
  });

  const ballPos = useRef<Point>({ x: 0, y: 0 });
  const ballVel = useRef<Point>({ x: 0, y: 0 });
  const anchorPos = useRef<Point>({ x: 0, y: 0 });
  const isPinching = useRef<boolean>(false);
  const isFlying = useRef<boolean>(false);
  const flightStartTime = useRef<number>(0);
  const smoothedHandPosRef = useRef<Point | null>(null);
  const smoothedPinchDistRef = useRef<number>(1.0);
  const handLostFramesRef = useRef<number>(0); // Buffer for missing hand tracking
  const MAX_LOST_FRAMES = 5; // Allow 5 frames of lost tracking before releasing
  const recoilRef = useRef<number>(0); // Added for cannon recoil animation
  const bubbles = useRef<Bubble[]>([]);
  const particles = useRef<Particle[]>([]);
  const scoreRef = useRef<number>(0);
  const lastDescentTimeRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);
  const pauseStartTimeRef = useRef<number>(0);
  
  const freezeUntilRef = useRef<number>(0);
  const selectedColorRef = useRef<BubbleColor>('red');
  const nextColorRef = useRef<BubbleColor>('blue');
  const gameStateRef = useRef<'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN' | 'PAUSED'>('MENU');
  const difficultyRef = useRef<Difficulty>('medium');
  const handleDesignRef = useRef<HandleDesign>('cannon'); 
  
  const [playMode, setPlayMode] = useState<'IA' | 'MANUAL' | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const onResultsCalledRef = useRef(false);
  const [score, setScore] = useState(0);
  const [selectedColor, setSelectedColor] = useState<BubbleColor>('red');
  const [nextColor, setNextColor] = useState<BubbleColor>('blue');
  const [availableColors, setAvailableColors] = useState<BubbleColor[]>([]);
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'WIN' | 'PAUSED'>('MENU');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [handleDesign, setHandleDesign] = useState<HandleDesign>('cannon'); 
  
  const [showTutorial, setShowTutorial] = useState(false);
  const showTutorialRef = useRef(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => { showTutorialRef.current = showTutorial; }, [showTutorial]);
  
  const [aiHint, setAiHint] = useState<StrategicHint | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiDebug, setShowAiDebug] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState<AiResponse | null>(null);

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // AdSense might fail to load or be blocked, which is fine
    }
  }, []);

  useEffect(() => { selectedColorRef.current = selectedColor; }, [selectedColor]);
  useEffect(() => { nextColorRef.current = nextColor; }, [nextColor]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { handleDesignRef.current = handleDesign; }, [handleDesign]);

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
          osc.start(now); osc.stop(now + 0.15);
      } else if (type === 'pop') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'click') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now); osc.stop(now + 0.05);
      } else if (type === 'bomb') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.start(now); osc.stop(now + 0.5);
      } else if (type === 'freeze') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.linearRampToValueAtTime(2000, now + 0.5);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
          osc.start(now); osc.stop(now + 0.5);
      } else if (type === 'gameover') {
          const playTone = (freq: number, start: number, duration: number) => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination); o.type = 'sawtooth';
              o.frequency.setValueAtTime(freq, start);
              g.gain.setValueAtTime(0.2, start); g.gain.linearRampToValueAtTime(0, start + duration);
              o.start(start); o.stop(start + duration);
          };
          playTone(400, now, 0.4); playTone(300, now + 0.4, 0.4); playTone(200, now + 0.8, 0.8);
          return;
      } else if (type === 'win') {
          const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination); o.type = type;
              o.frequency.setValueAtTime(freq, start);
              g.gain.setValueAtTime(0.2, start); g.gain.exponentialRampToValueAtTime(0.01, start + duration);
              o.start(start); o.stop(start + duration);
          };
          playTone(523.25, now, 0.2); playTone(659.25, now + 0.2, 0.2); playTone(783.99, now + 0.4, 0.2); playTone(1046.50, now + 0.6, 0.8, 'triangle');
      }
  }, []);

  const getBubblePos = (row: number, col: number, width: number) => {
    const { bubbleRadius, rowHeight } = layoutRef.current;
    const gridWidth = GRID_COLS * bubbleRadius * 2;
    const xOffset = (width - gridWidth) / 2 + bubbleRadius;
    const isOdd = row % 2 !== 0;
    const x = xOffset + col * (bubbleRadius * 2) + (isOdd ? bubbleRadius : 0);
    const y = bubbleRadius + row * rowHeight;
    return { x, y };
  };

  const updateAvailableColors = () => {
    const activeColors = new Set<BubbleColor>();
    bubbles.current.forEach(b => { if (b.active && b.color !== 'rainbow') activeColors.add(b.color); });
    const colorsArray = Array.from(activeColors);
    setAvailableColors(colorsArray);
    
    // Auto-correct if current or next color are no longer on the board
    if (colorsArray.length > 0) {
        if (!activeColors.has(selectedColorRef.current)) {
            const next = colorsArray[Math.floor(Math.random() * colorsArray.length)];
            setSelectedColor(next); selectedColorRef.current = next; 
        }
        if (!activeColors.has(nextColorRef.current)) {
            const next = colorsArray[Math.floor(Math.random() * colorsArray.length)];
            setNextColor(next); nextColorRef.current = next;
        }
    }
  };

  const getNextRandomColor = () => {
    const activeColors = new Set<BubbleColor>();
    bubbles.current.forEach(b => { if (b.active && b.color !== 'rainbow') activeColors.add(b.color); });
    const colorsArray = Array.from(activeColors);
    if (colorsArray.length === 0) return 'red';
    return colorsArray[Math.floor(Math.random() * colorsArray.length)];
  };

  const isNeighbor = (a: Bubble, b: Bubble) => {
    const dr = b.row - a.row; const dc = b.col - a.col;
    if (Math.abs(dr) > 1) return false;
    if (dr === 0) return Math.abs(dc) === 1;
    if (a.row % 2 !== 0) return dc === 0 || dc === 1;
    else return dc === -1 || dc === 0;
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
        life: 1.0, color
      });
    }
  };

  const createFirework = (x: number, y: number) => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 8 + 3;
          particles.current.push({
              x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
              life: 1.5 + Math.random(), color
          });
      }
  };

  const checkWinCondition = () => {
      const activeCount = bubbles.current.filter(b => b.active).length;
      if (activeCount === 0 && gameStateRef.current === 'PLAYING') {
          setGameState('WIN'); gameStateRef.current = 'WIN';
          playSound('win');
      }
  };

  const spawnBubble = (row: number, col: number, width: number): Bubble => {
      const { x, y } = getBubblePos(row, col, width);
      const settings = DIFFICULTY_SETTINGS[difficultyRef.current];
      const availableKeys = COLOR_KEYS.slice(0, settings.maxColors);
      let color = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      let powerUp: PowerUpType | undefined = undefined;
      if (Math.random() < POWERUP_CHANCE) {
          const r = Math.random();
          if (r < 0.33) powerUp = 'bomb';
          else if (r < 0.66) powerUp = 'freeze';
          else { powerUp = 'wildcard'; color = 'rainbow'; }
      }
      return { id: `${row}-${col}-${Date.now()}-${Math.random()}`, row, col, x, y, color, active: true, powerUp };
  };

  const dropFloatingBubbles = () => {
    const activeBubbles = bubbles.current.filter(b => b.active);
    if (activeBubbles.length === 0) return;
    const visited = new Set<string>(); const queue: Bubble[] = [];
    activeBubbles.forEach(b => { if (b.row === 0) { queue.push(b); visited.add(b.id); } });
    let head = 0;
    while(head < queue.length){
        const current = queue[head++];
        activeBubbles.forEach(b => {
            if (!visited.has(b.id) && isNeighbor(current, b)) { visited.add(b.id); queue.push(b); }
        });
    }
    const floatingBubbles = activeBubbles.filter(b => !visited.has(b.id));
    if (floatingBubbles.length > 0) {
        let points = 0;
        floatingBubbles.forEach(b => { b.active = false; createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex); points += 50; });
        playSound('pop'); scoreRef.current += points; setScore(scoreRef.current); updateAvailableColors();
    }
  };

  const triggerBomb = (centerBubble: Bubble) => {
      playSound('bomb');
      const radius = layoutRef.current.bubbleRadius * 2.5;
      let points = 0;
      bubbles.current.forEach(b => {
          if (!b.active) return;
          const dist = Math.sqrt(Math.pow(b.x - centerBubble.x, 2) + Math.pow(b.y - centerBubble.y, 2));
          if (dist < radius) { b.active = false; createExplosion(b.x, b.y, '#ffffff'); points += 50; }
      });
      scoreRef.current += points; setScore(scoreRef.current);
  };

  const triggerFreeze = () => { playSound('freeze'); freezeUntilRef.current = performance.now() + 10000; };

  const checkMatches = (startBubble: Bubble) => {
    const toCheck = [startBubble]; const visited = new Set<string>(); const matches: Bubble[] = [];
    const targetColor = startBubble.color; 
    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      const isMatch = current.color === targetColor || current.color === 'rainbow' || targetColor === 'rainbow';
      if (isMatch) {
        matches.push(current);
        const neighbors = bubbles.current.filter(b => b.active && !visited.has(b.id) && isNeighbor(current, b));
        toCheck.push(...neighbors);
      }
    }
    if (matches.length >= 3) {
      let points = 0; let powerUpsTriggered: Bubble[] = [];
      matches.forEach(b => { b.active = false; createExplosion(b.x, b.y, COLOR_CONFIG[b.color].hex); points += COLOR_CONFIG[b.color].points; if (b.powerUp) powerUpsTriggered.push(b); });
      playSound('pop'); const multiplier = matches.length > 3 ? 1.5 : 1.0;
      scoreRef.current += Math.floor(points * multiplier); setScore(scoreRef.current);
      powerUpsTriggered.forEach(b => { if (b.powerUp === 'bomb') triggerBomb(b); if (b.powerUp === 'freeze') triggerFreeze(); });
      dropFloatingBubbles(); checkWinCondition(); return true;
    }
    return false;
  };

  const startGame = (level: Difficulty) => {
    initAudio(); playSound('click');
    if (!gameContainerRef.current || !canvasRef.current) return;
    setDifficulty(level); difficultyRef.current = level; 
    setGameState('PLAYING'); gameStateRef.current = 'PLAYING'; 
    setScore(0); scoreRef.current = 0; isGameOverRef.current = false;
    lastDescentTimeRef.current = performance.now(); freezeUntilRef.current = 0;
    particles.current = [];
    const width = gameContainerRef.current.clientWidth; const height = gameContainerRef.current.clientHeight;
    const maxRadius = 25; const radiusFromWidth = Math.floor((width - 20) / (GRID_COLS * 2)); 
    const radius = Math.min(maxRadius, Math.max(12, radiusFromWidth));
    layoutRef.current.bubbleRadius = radius; layoutRef.current.rowHeight = radius * Math.sqrt(3);
    layoutRef.current.cannonOffset = Math.max(160, height * 0.25); layoutRef.current.maxDragDist = Math.min(180, width * 0.35);
    const anchor = { x: width / 2, y: height - layoutRef.current.cannonOffset };
    anchorPos.current = anchor; ballPos.current = { ...anchor };
    ballVel.current = { x: 0, y: 0 }; isFlying.current = false; isPinching.current = false;
    const settings = DIFFICULTY_SETTINGS[level]; const newBubbles: Bubble[] = [];
    for (let r = 0; r < settings.rows; r++) { 
      for (let c = 0; c < (r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS); c++) {
        if (Math.random() > 0.1) newBubbles.push(spawnBubble(r, c, width));
      }
    }
    bubbles.current = newBubbles; 
    updateAvailableColors();
    
    // Initialize ammo
    const activeC = Array.from(new Set(newBubbles.map(b => b.color).filter(c => c !== 'rainbow')));
    const c1 = activeC[Math.floor(Math.random() * activeC.length)] || 'red';
    const c2 = activeC[Math.floor(Math.random() * activeC.length)] || 'blue';
    setSelectedColor(c1); selectedColorRef.current = c1;
    setNextColor(c2); nextColorRef.current = c2;
  };

  const addNewRow = (canvasWidth: number) => {
      let gameOver = false;
      const thresholdY = canvasRef.current ? canvasRef.current.height - layoutRef.current.cannonOffset - layoutRef.current.bubbleRadius * 2 : 1000;
      bubbles.current.forEach(b => {
          if (!b.active) return;
          b.row++; const { x, y } = getBubblePos(b.row, b.col, canvasWidth);
          b.x = x; b.y = y; if (b.y > thresholdY) gameOver = true;
      });
      if (gameOver) {
          isGameOverRef.current = true; setGameState('GAMEOVER'); gameStateRef.current = 'GAMEOVER';
          playSound('gameover'); return;
      }
      for (let c = 0; c < GRID_COLS; c++) { if (Math.random() > 0.1) bubbles.current.push(spawnBubble(0, c, canvasWidth)); }
      updateAvailableColors();
  };

  const togglePause = () => {
      playSound('click');
      if (gameState === 'PLAYING') {
          setGameState('PAUSED'); gameStateRef.current = 'PAUSED'; pauseStartTimeRef.current = performance.now();
      } else if (gameState === 'PAUSED') {
          setGameState('PLAYING'); gameStateRef.current = 'PLAYING';
          const now = performance.now(); const pausedDuration = now - pauseStartTimeRef.current;
          lastDescentTimeRef.current += pausedDuration; if (freezeUntilRef.current > now) freezeUntilRef.current += pausedDuration;
      }
  };

  const skipTutorial = () => {
    playSound('click');
    setShowTutorial(false);
  };

  const nextTutorialStep = () => {
    playSound('click');
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const prevTutorialStep = () => {
    playSound('click');
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  const requestAiHint = async () => {
    if (isAiLoading || gameStateRef.current !== 'PLAYING' || !canvasRef.current) return;
    
    playSound('click');
    setIsAiLoading(true);
    setAiHint(null);

    try {
        // 1. Capture current board state
        const canvas = canvasRef.current;
        const imageBase64 = canvas.toDataURL('image/png');

        // 2. Prepare target candidates for AI
        // We group bubbles by color and find potential clusters
        const candidates: TargetCandidate[] = [];
        const processed = new Set<string>();

        bubbles.current.forEach(b => {
            if (!b.active || processed.has(b.id)) return;
            
            // Simple flood fill to find cluster size
            const cluster: Bubble[] = [];
            const queue = [b];
            const visited = new Set([b.id]);
            
            while(queue.length > 0) {
                const curr = queue.pop()!;
                cluster.push(curr);
                processed.add(curr.id);
                
                bubbles.current.forEach(neighbor => {
                    if (neighbor.active && !visited.has(neighbor.id) && neighbor.color === b.color && isNeighbor(curr, neighbor)) {
                        visited.add(neighbor.id);
                        queue.push(neighbor);
                    }
                });
            }

            if (cluster.length >= 1) {
                // Find the lowest bubble in cluster as target point
                const lowest = cluster.sort((a,b) => b.row - a.row)[0];
                candidates.push({
                    id: b.id,
                    color: b.color,
                    size: cluster.length,
                    row: lowest.row,
                    col: lowest.col,
                    pointsPerBubble: COLOR_CONFIG[b.color].points,
                    description: `${cluster.length} ${b.color} bubbles`
                });
            }
        });

        const maxRow = bubbles.current.reduce((max, b) => b.active ? Math.max(max, b.row) : max, 0);

        // 3. Call Gemini
        const response = await getStrategicHint(imageBase64, candidates, maxRow);
        setLastAiResponse(response);
        setAiHint(response.hint);
        
        // Auto-hide hint after 8 seconds
        setTimeout(() => setAiHint(null), 8000);

    } catch (error) {
        console.error("AI Hint Error:", error);
    } finally {
        setIsAiLoading(false);
    }
  };

  const drawMirroredText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string) => {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(x, y);
    ctx.scale(-1, 1); // Flip because the global canvas is mirrored by CSS
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const drawBubble = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colorKey: BubbleColor, powerUp?: PowerUpType) => {
    const config = COLOR_CONFIG[colorKey];
    let grad;
    if (colorKey === 'rainbow') {
        grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, '#ff9999'); grad.addColorStop(0.2, '#ffff99'); grad.addColorStop(0.4, '#99ff99'); grad.addColorStop(0.6, '#99ffff'); grad.addColorStop(0.8, '#9999ff'); grad.addColorStop(1, '#ff99ff');
    } else {
        const baseColor = config.hex; grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.05, x, y, radius);
        grad.addColorStop(0, '#ffffff'); 
        grad.addColorStop(0.1, '#ffffff');
        grad.addColorStop(0.4, baseColor); 
        grad.addColorStop(1, adjustColor(baseColor, -80)); 
    }
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = colorKey === 'rainbow' ? 'white' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    
    // Gloss highlight
    ctx.beginPath(); 
    ctx.ellipse(x - radius * 0.35, y - radius * 0.4, radius * 0.3, radius * 0.15, Math.PI / 4, 0, Math.PI * 2); 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; 
    ctx.fill();
    
    // Inner shadow for depth
    ctx.beginPath();
    ctx.arc(x + radius * 0.2, y + radius * 0.2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (powerUp) {
        ctx.save();
        ctx.font = `${radius}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(x, y + 2);
        ctx.scale(-1, 1); // Flip icon because canvas is flipped
        let icon = ''; if (powerUp === 'bomb') icon = '💣'; if (powerUp === 'freeze') icon = '❄️'; if (powerUp === 'wildcard') icon = '🌈';
        ctx.fillText(icon, 0, 0);
        ctx.restore();
    }
  };

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    if (!videoRef.current || !canvasRef.current || !fxCanvasRef.current || !gameContainerRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current; const fxCanvas = fxCanvasRef.current; const container = gameContainerRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const fxCtx = fxCanvas.getContext('2d');
    if (!ctx || !fxCtx) return;
    
    const updateSize = () => {
        if (!container || !canvas || !fxCanvas) return;
        
        // Use offsetWidth/Height for more reliable measurements
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        
        if (width === 0 || height === 0) return;

        canvas.width = width;
        canvas.height = height;
        fxCanvas.width = width;
        fxCanvas.height = height;
        
        const maxRadius = 25;
        const radiusFromWidth = Math.floor((width - 20) / (GRID_COLS * 2)); 
        const radius = Math.min(maxRadius, Math.max(12, radiusFromWidth));
        
        layoutRef.current.bubbleRadius = radius;
        layoutRef.current.rowHeight = radius * Math.sqrt(3);
        
        // Adaptive layout for mobile
        const isMobile = width < 768;
        layoutRef.current.cannonOffset = isMobile ? Math.min(height * 0.2, 160) : Math.min(height * 0.3, 220);
        layoutRef.current.maxDragDist = Math.min(180, width * 0.35);
        
        anchorPos.current = { x: width / 2, y: height - layoutRef.current.cannonOffset };
        if (!isFlying.current && !isPinching.current) ballPos.current = { ...anchorPos.current };
        bubbles.current.forEach(b => { const { x, y } = getBubblePos(b.row, b.col, width); b.x = x; b.y = y; });
    };

    resizeObserver = new ResizeObserver(() => {
        updateSize();
    });
    resizeObserver.observe(container);
    updateSize();

    let camera: any = null; let hands: any = null;

    const onResults = (results: any) => {
      onResultsCalledRef.current = true;
      if (isUnmounted || !canvas || !ctx || !fxCtx) return;
      setLoading(false);

      // Simple FPS counter
      frameCountRef.current++;
      const nowTime = performance.now();
      if (nowTime - lastFpsUpdateRef.current > 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (nowTime - lastFpsUpdateRef.current)));
          frameCountRef.current = 0;
          lastFpsUpdateRef.current = nowTime;
      }

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (results.image && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
      }
      ctx.fillStyle = 'rgba(18, 18, 18, 0.85)'; ctx.fillRect(0, 0, canvas.width, canvas.height);

      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      const now = performance.now(); const isFrozen = now < freezeUntilRef.current;
      const { bubbleRadius, maxDragDist } = layoutRef.current;

      if (gameStateRef.current === 'PLAYING' && !isGameOverRef.current) {
          const settings = DIFFICULTY_SETTINGS[difficultyRef.current];
          if (difficultyRef.current !== 'easy' && !isFrozen && now - lastDescentTimeRef.current > settings.descentInterval) {
              addNewRow(canvas.width); lastDescentTimeRef.current = now;
          }
      }

      if (gameStateRef.current === 'WIN') {
          if (Math.random() < 0.15) {
              createFirework(Math.random() * canvas.width, Math.random() * (canvas.height * 0.6));
              if (Math.random() < 0.3) playSound('pop');
          }
      }

      let handPos: Point | null = null; let pinchDist = 1.0;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]; const idxTip = landmarks[8]; const thumbTip = landmarks[4];
        const rawHandPos = { x: (idxTip.x * canvas.width + thumbTip.x * canvas.width) / 2, y: (idxTip.y * canvas.height + thumbTip.y * canvas.height) / 2 };
        const dx = idxTip.x - thumbTip.x; const dy = idxTip.y - thumbTip.y; const rawPinchDist = Math.sqrt(dx * dx + dy * dy);
        
        // Increased smoothing for hand movement (0.2 is more stable than 0.25)
        const SMOOTHING = 0.22; 
        if (!smoothedHandPosRef.current) {
            smoothedHandPosRef.current = rawHandPos;
            smoothedPinchDistRef.current = rawPinchDist;
        } else {
            // Adaptive smoothing: if movement is very small (tremor), smooth MORE
            const distChanged = Math.sqrt(Math.pow(rawHandPos.x - smoothedHandPosRef.current.x, 2) + Math.pow(rawHandPos.y - smoothedHandPosRef.current.y, 2));
            
            let smoothingFactor = SMOOTHING;
            // If movement is tiny, increase smoothing
            if (distChanged < 15) {
                smoothingFactor = 0.1; 
            }
            // Deadzone: if movement is practically non-existent, don't update
            if (distChanged < 1.5 && isPinching.current) {
                // Keep old position
            } else {
                smoothedHandPosRef.current = {
                    x: smoothedHandPosRef.current.x + (rawHandPos.x - smoothedHandPosRef.current.x) * smoothingFactor,
                    y: smoothedHandPosRef.current.y + (rawHandPos.y - smoothedHandPosRef.current.y) * smoothingFactor
                };
            }
            smoothedPinchDistRef.current = smoothedPinchDistRef.current + (rawPinchDist - smoothedPinchDistRef.current) * 0.2;
        }
        
        handPos = smoothedHandPosRef.current;
        pinchDist = smoothedPinchDistRef.current;
        handLostFramesRef.current = 0; // Reset lost counter

        if (landmarks) {
           ctx.save();
           
           // Correct for mirrored canvas in calculations if we were doing screen-space
           // But landmarks are already relative 0-1 of the frame drawn to canvas.
           
           // Neon glow effect for the hand skeleton
           ctx.shadowBlur = 15;
           ctx.shadowColor = '#00e5ff';
           ctx.lineWidth = 4;
           ctx.lineCap = 'round';
           ctx.lineJoin = 'round';

           const connections = [
             // Thumb
             [0, 1], [1, 2], [2, 3], [3, 4],
             // Index
             [0, 5], [5, 6], [6, 7], [7, 8],
             // Middle
             [9, 10], [10, 11], [11, 12],
             // Ring
             [13, 14], [14, 15], [15, 16],
             // Pinky
             [0, 17], [17, 18], [18, 19], [19, 20],
             // Palm
             [5, 9], [9, 13], [13, 17]
           ];

           // Draw connectors manually for maximum control and reliability
           connections.forEach(([i, j]) => {
             const p1 = landmarks[i];
             const p2 = landmarks[j];
             ctx.beginPath();
             ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
             ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
             
             const grad = ctx.createLinearGradient(
                p1.x * canvas.width, p1.y * canvas.height,
                p2.x * canvas.width, p2.y * canvas.height
             );
             grad.addColorStop(0, '#00e5ff');
             grad.addColorStop(1, '#7000ff');
             ctx.strokeStyle = grad;
             ctx.stroke();
           });

           // Draw landmarks (joints)
           landmarks.forEach((lm, i) => {
             const x = lm.x * canvas.width;
             const y = lm.y * canvas.height;
             
             ctx.beginPath();
             ctx.arc(x, y, i % 4 === 0 ? 5 : 3, 0, Math.PI * 2);
             ctx.fillStyle = i % 4 === 0 ? '#fff' : '#00e5ff';
             ctx.fill();
             
             // Extra outer ring for fingertips
             if (i === 4 || i === 8 || i === 12 || i === 16 || i === 20) {
                ctx.beginPath();
                ctx.arc(x, y, 8 + Math.sin(Date.now() / 200) * 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
             }
           });
           
           // Highlight the "pinch" fingers (Thumb and Index) with a high-energy line
           const thumb = landmarks[4];
           const index = landmarks[8];
           const tx = thumb.x * canvas.width;
           const ty = thumb.y * canvas.height;
           const ix = index.x * canvas.width;
           const iy = index.y * canvas.height;
           
           ctx.beginPath();
           ctx.moveTo(tx, ty);
           ctx.lineTo(ix, iy);
           
           const pinchGrad = ctx.createLinearGradient(tx, ty, ix, iy);
           pinchGrad.addColorStop(0, '#00e5ff');
           pinchGrad.addColorStop(0.5, '#ff00ff');
           pinchGrad.addColorStop(1, '#00e5ff');
           
           ctx.strokeStyle = pinchGrad;
           ctx.lineWidth = 3;
           ctx.setLineDash([5, 5]);
           ctx.stroke();
           ctx.setLineDash([]);
           
           // Particle effect between pinch fingers
           if (pinchDist < (isPinching.current ? PINCH_RELEASE_THRESHOLD : PINCH_GRAB_THRESHOLD)) {
              for(let i=0; i<3; i++) {
                const r = Math.random();
                ctx.beginPath();
                ctx.arc(tx + (ix-tx)*r + (Math.random()-0.5)*10, ty + (iy-ty)*r + (Math.random()-0.5)*10, Math.random()*3, 0, Math.PI*2);
                ctx.fillStyle = '#ff00ff';
                ctx.fill();
              }
           }
           
           ctx.restore();
        }
        const activeThreshold = isPinching.current ? PINCH_RELEASE_THRESHOLD : PINCH_GRAB_THRESHOLD;
        if (handPos) {
          ctx.beginPath(); 
          ctx.arc(handPos.x, handPos.y, 20, 0, Math.PI * 2); 
          ctx.strokeStyle = pinchDist < activeThreshold ? '#66bb6a' : '#ffffff'; 
          ctx.lineWidth = 2; 
          ctx.stroke();
        }
      } else {
        // Hand lost - use buffer
        if (handLostFramesRef.current < MAX_LOST_FRAMES && smoothedHandPosRef.current) {
            handLostFramesRef.current++;
            handPos = smoothedHandPosRef.current;
            pinchDist = smoothedPinchDistRef.current;
        } else {
            smoothedHandPosRef.current = null;
        }
      }
      
      if (gameStateRef.current === 'PLAYING' && !showTutorialRef.current) {
          const activeThreshold = isPinching.current ? PINCH_RELEASE_THRESHOLD : PINCH_GRAB_THRESHOLD;
          if (playMode === 'IA' && handPos && pinchDist < activeThreshold && !isFlying.current) {
            const distToBall = Math.sqrt(Math.pow(handPos.x - ballPos.current.x, 2) + Math.pow(handPos.y - ballPos.current.y, 2));
            if (!isPinching.current && distToBall < 100) isPinching.current = true;
            if (isPinching.current) {
                ballPos.current = { x: handPos.x, y: handPos.y }; const dragDx = ballPos.current.x - anchorPos.current.x; const dragDy = ballPos.current.y - anchorPos.current.y;
                const dragDist = Math.sqrt(dragDx*dragDx + dragDy*dragDy);
                if (dragDist > maxDragDist) { const angle = Math.atan2(dragDy, dragDx); ballPos.current.x = anchorPos.current.x + Math.cos(angle) * maxDragDist; ballPos.current.y = anchorPos.current.y + Math.sin(angle) * maxDragDist; }
            }
          } 
          else if (playMode === 'IA' && isPinching.current && (!handPos || pinchDist >= PINCH_RELEASE_THRESHOLD)) {
            isPinching.current = false; const dx = anchorPos.current.x - ballPos.current.x; const dy = anchorPos.current.y - ballPos.current.y; const stretchDist = Math.sqrt(dx*dx + dy*dy);
            if (stretchDist > 30) {
                isFlying.current = true; playSound('shoot'); flightStartTime.current = performance.now();
                recoilRef.current = 25; // Trigger recoil
                const powerRatio = Math.min(stretchDist / maxDragDist, 1.0); const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);
                ballVel.current = { x: dx * velocityMultiplier, y: dy * velocityMultiplier };
            } else { ballPos.current = { ...anchorPos.current }; }
          }
          else if (!isFlying.current && !isPinching.current) {
              const dx = anchorPos.current.x - ballPos.current.x; const dy = anchorPos.current.y - ballPos.current.y;
              ballPos.current.x += dx * 0.15; ballPos.current.y += dy * 0.15;
          }
      } else if (gameStateRef.current === 'PAUSED') { if (!isFlying.current) ballPos.current = { ...anchorPos.current }; }
      else ballPos.current = { ...anchorPos.current };

      if (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'WIN') {
        if (isFlying.current) {
            if (performance.now() - flightStartTime.current > 5000) { isFlying.current = false; ballPos.current = { ...anchorPos.current }; ballVel.current = { x: 0, y: 0 }; }
            else {
                const currentSpeed = Math.sqrt(ballVel.current.x ** 2 + ballVel.current.y ** 2);
                const steps = Math.ceil(currentSpeed / (bubbleRadius * 0.8)); let collisionOccurred = false;
                for (let i = 0; i < steps; i++) {
                    ballPos.current.x += ballVel.current.x / steps; ballPos.current.y += ballVel.current.y / steps;
                    if (ballPos.current.x < bubbleRadius || ballPos.current.x > canvas.width - bubbleRadius) { ballVel.current.x *= -1; ballPos.current.x = Math.max(bubbleRadius, Math.min(canvas.width - bubbleRadius, ballPos.current.x)); }
                    if (ballPos.current.y < bubbleRadius) { collisionOccurred = true; break; }
                    for (const b of bubbles.current) {
                        if (!b.active) continue;
                        const dist = Math.sqrt(Math.pow(ballPos.current.x - b.x, 2) + Math.pow(ballPos.current.y - b.y, 2));
                        if (dist < bubbleRadius * 1.8) { collisionOccurred = true; break; }
                    }
                    if (collisionOccurred) break;
                }
                ballVel.current.y += GRAVITY; ballVel.current.x *= FRICTION; ballVel.current.y *= FRICTION;
                if (collisionOccurred) {
                    isFlying.current = false; let bestDist = Infinity; let bestRow = 0; let bestCol = 0; let bestX = 0; let bestY = 0;
                    for (let r = 0; r < GRID_ROWS + 10; r++) { 
                        const colsInRow = r % 2 !== 0 ? GRID_COLS - 1 : GRID_COLS;
                        for (let c = 0; c < colsInRow; c++) {
                            const { x, y } = getBubblePos(r, c, canvas.width);
                            const occupied = bubbles.current.some(b => b.active && b.row === r && b.col === c);
                            if (occupied) continue;
                            const dist = Math.sqrt(Math.pow(ballPos.current.x - x, 2) + Math.pow(ballPos.current.y - y, 2));
                            if (dist < bestDist) { bestDist = dist; bestRow = r; bestCol = c; bestX = x; bestY = y; }
                        }
                    }
                    const newBubble: Bubble = { id: `${bestRow}-${bestCol}-${Date.now()}`, row: bestRow, col: bestCol, x: bestX, y: bestY, color: selectedColorRef.current, active: true };
                    bubbles.current.push(newBubble); checkMatches(newBubble); 
                    
                    // Rotate Ammo
                    const newCurrent = nextColorRef.current;
                    const newNext = getNextRandomColor();
                    setSelectedColor(newCurrent); selectedColorRef.current = newCurrent;
                    setNextColor(newNext); nextColorRef.current = newNext;

                    updateAvailableColors();
                    ballPos.current = { ...anchorPos.current }; ballVel.current = { x: 0, y: 0 };
                }
                if (ballPos.current.y > canvas.height) { isFlying.current = false; ballPos.current = { ...anchorPos.current }; ballVel.current = { x: 0, y: 0 }; }
            }
        }
      }

      bubbles.current.forEach(b => { if (b.active) drawBubble(ctx, b.x, b.y, bubbleRadius - 1, b.color, b.powerUp); });

      if (isFrozen) {
          ctx.save(); ctx.strokeStyle = '#29b6f6'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
          drawMirroredText(ctx, "❄️ TIME FROZEN", canvas.width / 2, 40, 'bold 20px Roboto', '#29b6f6');
          ctx.restore();
      }

      if (gameStateRef.current === 'PLAYING' && isPinching.current && !isFlying.current && !showTutorialRef.current) {
         const dx = anchorPos.current.x - ballPos.current.x; const dy = anchorPos.current.y - ballPos.current.y; const stretchDist = Math.sqrt(dx*dx + dy*dy);
         if (stretchDist > 30) {
            const powerRatio = Math.min(stretchDist / maxDragDist, 1.0); const velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);
            let simX = ballPos.current.x; let simY = ballPos.current.y; let simVx = dx * velocityMultiplier; let simVy = dy * velocityMultiplier;
            ctx.beginPath(); ctx.moveTo(simX, simY);
            for(let i=0; i<40; i++) {
               simX += simVx; simY += simVy; simVx *= FRICTION; simVy *= FRICTION;
               if (simX < bubbleRadius || simX > canvas.width - bubbleRadius) { simVx *= -1; simX = Math.max(bubbleRadius, Math.min(canvas.width - bubbleRadius, simX)); }
               ctx.lineTo(simX, simY); if (simY < bubbleRadius) break;
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
         }
      }
      
      const currentTheme = HANDLE_THEMES[handleDesignRef.current];
      const handleColor = currentTheme.handleColor;
      
      // DRAW CANNON
      if (gameStateRef.current !== 'MENU' && gameStateRef.current !== 'GAMEOVER') {
          const dx = anchorPos.current.x - ballPos.current.x;
          const dy = anchorPos.current.y - ballPos.current.y;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx*dx + dy*dy);
          const isPinchingNow = isPinching.current;

          // Smoothly decay recoil
          recoilRef.current *= 0.85;
          if (recoilRef.current < 0.1) recoilRef.current = 0;

          ctx.save();
          ctx.translate(anchorPos.current.x, anchorPos.current.y);
          ctx.rotate(angle);

          // Cannon Base/Mount (Modern U-shape with wheels)
          ctx.beginPath();
          ctx.strokeStyle = '#263238';
          ctx.lineWidth = 12;
          ctx.lineCap = 'round';
          ctx.arc(0, 0, 45, Math.PI * 0.7, Math.PI * 2.3);
          ctx.stroke();

          // Wheels/Gears on the base
          ctx.fillStyle = '#1a1a1a';
          ctx.beginPath();
          ctx.arc(-40, 20, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(40, 20, 15, 0, Math.PI * 2);
          ctx.fill();
          
          // Wheel centers
          ctx.fillStyle = '#455a64';
          ctx.beginPath();
          ctx.arc(-40, 20, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(40, 20, 5, 0, Math.PI * 2);
          ctx.fill();

          // Barrel
          const barrelLen = 80 + (isPinchingNow ? dist * 0.15 : 0) - recoilRef.current;
          const barrelWidth = 55;

          ctx.save();
          ctx.shadowBlur = currentTheme.shadowBlur;
          ctx.shadowColor = currentTheme.glowColor;

          // Barrel Gradient
          const barrelGrad = ctx.createLinearGradient(0, -barrelWidth/2, 0, barrelWidth/2);
          barrelGrad.addColorStop(0, handleColor);
          barrelGrad.addColorStop(0.5, adjustColor(handleColor, 40));
          barrelGrad.addColorStop(1, adjustColor(handleColor, -40));

          ctx.fillStyle = barrelGrad;
          ctx.beginPath();
          // Tapered barrel with a slight curve
          ctx.moveTo(0, -barrelWidth/2 + 5);
          ctx.bezierCurveTo(barrelLen * 0.5, -barrelWidth/2, barrelLen * 0.5, -barrelWidth/2 - 10, barrelLen, -barrelWidth/2 - 5);
          ctx.lineTo(barrelLen, barrelWidth/2 + 5);
          ctx.bezierCurveTo(barrelLen * 0.5, barrelWidth/2 + 10, barrelLen * 0.5, barrelWidth/2, 0, barrelWidth/2 - 5);
          ctx.closePath();
          ctx.fill();
          
          ctx.strokeStyle = currentTheme.glowColor;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Rivets on the barrel
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          for (let i = 1; i < 4; i++) {
              const x = (barrelLen / 4) * i;
              ctx.beginPath(); ctx.arc(x, -barrelWidth/2 + 5, 3, 0, Math.PI * 2); ctx.fill();
              ctx.beginPath(); ctx.arc(x, barrelWidth/2 - 5, 3, 0, Math.PI * 2); ctx.fill();
          }

          // Muzzle Detail
          ctx.fillStyle = '#111';
          ctx.beginPath();
          ctx.roundRect(barrelLen - 12, -barrelWidth/2 - 8, 20, barrelWidth + 16, 8);
          ctx.fill();
          
          // Muzzle Glow
          if (isPinchingNow) {
              const muzzleGlow = ctx.createRadialGradient(barrelLen, 0, 0, barrelLen, 0, 30);
              muzzleGlow.addColorStop(0, currentTheme.bandColorActive);
              muzzleGlow.addColorStop(0.6, currentTheme.bandColorActive + '44');
              muzzleGlow.addColorStop(1, 'transparent');
              ctx.fillStyle = muzzleGlow;
              ctx.beginPath();
              ctx.arc(barrelLen, 0, 30, 0, Math.PI * 2);
              ctx.fill();
          }

          // Energy charging arcs
          if (isPinchingNow && dist > 30) {
              const pulse = Math.sin(Date.now() / 100) * 0.5 + 0.5;
              ctx.beginPath();
              ctx.strokeStyle = currentTheme.bandColorActive;
              ctx.lineWidth = 2 + pulse * 2;
              const arcCount = 4;
              for (let i = 0; i < arcCount; i++) {
                  const xPos = 20 + (i * (barrelLen - 40) / (arcCount - 1));
                  const h = (barrelWidth / 2 - 10) * (1 - (i / arcCount) * 0.2);
                  ctx.moveTo(xPos, -h);
                  ctx.lineTo(xPos, h);
              }
              ctx.stroke();
          }
          ctx.restore();
          ctx.restore();
      }

      // Draw the ball (bubble)
      if (gameStateRef.current !== 'MENU' && gameStateRef.current !== 'GAMEOVER') {
        ctx.save(); 
        let drawPos = { ...ballPos.current };
        if (!isFlying.current && !isPinching.current) {
            // Position at the muzzle when not aiming
            const dx = anchorPos.current.x - ballPos.current.x;
            const dy = anchorPos.current.y - ballPos.current.y;
            const angle = Math.atan2(dy, dx);
            const barrelLen = 80 - recoilRef.current;
            drawPos = {
                x: anchorPos.current.x + Math.cos(angle) * barrelLen,
                y: anchorPos.current.y + Math.sin(angle) * barrelLen
            };
        } else if (isPinching.current) {
            // Position at the muzzle when aiming
            const dx = ballPos.current.x - anchorPos.current.x;
            const dy = ballPos.current.y - anchorPos.current.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.sqrt(dx*dx + dy*dy);
            const barrelLen = 80 + dist * 0.15;
            drawPos = {
                x: anchorPos.current.x + Math.cos(angle) * barrelLen,
                y: anchorPos.current.y + Math.sin(angle) * barrelLen
            };
        }
        drawBubble(ctx, drawPos.x, drawPos.y, bubbleRadius, selectedColorRef.current); 
        
        // Draw "Next" bubble preview on board
        if (!isFlying.current && !isPinching.current) {
            const nextX = anchorPos.current.x + 60;
            const nextY = anchorPos.current.y + 40;
             ctx.save();
             ctx.globalAlpha = 0.6;
             drawBubble(ctx, nextX, nextY, bubbleRadius * 0.7, nextColorRef.current);
             drawMirroredText(ctx, "NEXT", nextX, nextY + 30, 'bold 10px Roboto', '#c4c7c5');
             ctx.restore();
        }
        ctx.restore();
      }

      // DRAW AI HINT OVERLAY
      if (aiHint && gameStateRef.current === 'PLAYING') {
          ctx.save();
          // Highlight target area
          if (aiHint.targetRow !== undefined && aiHint.targetCol !== undefined) {
              const { x, y } = getBubblePos(aiHint.targetRow, aiHint.targetCol, canvas.width);
              
              // Pulsing circle
              const pulse = Math.sin(Date.now() / 200) * 5 + 5;
              ctx.beginPath();
              ctx.arc(x, y, bubbleRadius * 2 + pulse, 0, Math.PI * 2);
              ctx.strokeStyle = '#42a5f5';
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              
              // Arrow pointing to target
              ctx.beginPath();
              ctx.moveTo(x, y - bubbleRadius * 4 - pulse);
              ctx.lineTo(x, y - bubbleRadius * 2 - pulse);
              ctx.strokeStyle = '#42a5f5';
              ctx.lineWidth = 4;
              ctx.setLineDash([]);
              ctx.stroke();
              
              // Arrow head
              ctx.beginPath();
              ctx.moveTo(x - 10, y - bubbleRadius * 2.5 - pulse);
              ctx.lineTo(x, y - bubbleRadius * 2 - pulse);
              ctx.lineTo(x + 10, y - bubbleRadius * 2.5 - pulse);
              ctx.stroke();
          }

          // Hint box
          const boxW = 300;
          const boxH = 80;
          const boxX = (canvas.width - boxW) / 2;
          const boxY = 100;

          ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
          ctx.strokeStyle = '#42a5f5';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxW, boxH, 16);
          ctx.fill();
          ctx.stroke();

          drawMirroredText(ctx, "GEMINI STRATEGY", canvas.width / 2, boxY + 20, 'bold 12px Roboto', '#42a5f5');
          drawMirroredText(ctx, aiHint.message, canvas.width / 2, boxY + 45, 'bold 16px Roboto', '#ffffff');
          if (aiHint.rationale) {
              drawMirroredText(ctx, aiHint.rationale, canvas.width / 2, boxY + 65, '10px Roboto', '#c4c7c5');
          }
          ctx.restore();
      }

      // PARTICLE RENDERING ON FX CANVAS
      for (let i = particles.current.length - 1; i >= 0; i--) {
          const p = particles.current[i];
          p.x += p.vx; p.y += p.vy; p.vy += PARTICLE_GRAVITY; p.life -= 0.05;
          if (p.life <= 0) particles.current.splice(i, 1);
          else {
              fxCtx.globalAlpha = p.life; fxCtx.beginPath(); fxCtx.arc(p.x, p.y, 4, 0, Math.PI * 2); fxCtx.fillStyle = p.color; fxCtx.fill(); fxCtx.globalAlpha = 1.0;
          }
      }
      ctx.restore();
    };

    let isProcessing = false;
    let isUnmounted = false;

    if (!window.navigator.mediaDevices) {
      setCameraError("Your browser doesn't support camera access or you are in a non-secure (HTTP) context.");
      setLoading(false);
      return;
    }

    // Safety timeout: if loading takes too long
    const safetyTimeout = setTimeout(() => {
        if (loading && !cameraError && !isUnmounted) {
            console.warn("Camera initialization is taking longer than expected...");
            setCameraError("A inicialização está demorando mais que o esperado. Isso geralmente acontece quando o navegador bloqueia a câmera ou quando os modelos de IA são pesados.");
            setLoading(false);
        }
    }, 12000); // Increased to 12s for slower connections

    const initAll = async () => {
        setLoading(true);
        if (!window.Hands) {
            // Wait a bit and retry if scripts haven't loaded
            setTimeout(initAll, 500);
            return;
        }

        try {
            hands = new window.Hands({ 
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}` 
            });
            hands.setOptions({ 
                maxNumHands: 1, 
                modelComplexity: 0, // Lite model for faster web performance
                minDetectionConfidence: 0.45, 
                minTrackingConfidence: 0.45 
            });
            hands.onResults((results: any) => {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    // Quick check to see if we get ANY results
                    if (handLostFramesRef.current > 0) {
                        console.log("Hand detected!");
                    }
                }
                onResults(results);
            });

            const video = videoRef.current;
            if (!video) return;

            let stream: MediaStream;
            try {
                // First attempt with preferred constraints
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } 
                });
            } catch (e) {
                console.warn("Standard constraints failed, trying fallback", e);
                // Fallback to any video
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            if (isUnmounted) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            video.srcObject = stream;
            // Safari/iOS requires play() to be called
            try {
                await video.play();
            } catch (playErr) {
                console.error("Video play failed:", playErr);
            }

            // Successfully started video
            setLoading(false);
            setCameraError(null);

            const loop = async () => {
                if (isUnmounted || !hands || !video) return;
                
                // Process frame if video is ready
                if (video.videoWidth > 0 && video.readyState >= 2 && !isProcessing) {
                    try {
                        isProcessing = true;
                        await hands.send({ image: video });
                    } catch (err) {
                        console.error("Hands send error:", err);
                    } finally {
                        isProcessing = false;
                    }
                }
                
                if (!isUnmounted) {
                    // Use requestVideoFrameCallback if available for smoother tracking
                    if ('requestVideoFrameCallback' in video) {
                        (video as any).requestVideoFrameCallback(loop);
                    } else {
                        requestAnimationFrame(loop);
                    }
                }
            };
            loop();

        } catch (err: any) {
            console.error("Critical camera setup error:", err);
            let msg = err.message || "Erro desconhecido";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = "Permissão de câmera negada pelo usuário ou pelo navegador.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg = "Nenhuma câmera encontrada no seu dispositivo.";
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                msg = "A câmera já está sendo usada por outro aplicativo.";
            }
            
            if (window.self !== window.top) {
                msg = "Acesso à câmera bloqueado por estar dentro de um iframe. Por favor, use o botão 'Abrir em Nova Aba' abaixo.";
            }
            
            setCameraError(msg);
            setLoading(false);
        }
    };

    if (hasStarted) {
        if (playMode === 'IA') {
            initAll();
        } else {
            // Manual loop for non-AI mode
            const manualLoop = () => {
                if (isUnmounted || playMode !== 'MANUAL') return;
                onResults({});
                requestAnimationFrame(manualLoop);
            };
            manualLoop();
        }
    }

    return () => { 
      clearTimeout(safetyTimeout);
      isUnmounted = true;
      if (hands) (hands as any).close(); 
      if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
      }
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [cameraRetryCount, hasStarted, playMode]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameStateRef.current !== 'PLAYING' || isFlying.current) return;
    initAudio();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Correct for mirrored canvas (CSS scaleX(-1))
    if (canvasRef.current) {
        x = canvasRef.current.width - x;
    }
    
    if (playMode === 'MANUAL') {
      isPinching.current = true;
      // Mirror the drag for manual mode so pointing at target pulls slingshot back
      const dx = x - anchorPos.current.x;
      const dy = y - anchorPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const pullDist = Math.min(dist, layoutRef.current.maxDragDist);
      
      ballPos.current.x = anchorPos.current.x - Math.cos(angle) * pullDist;
      ballPos.current.y = anchorPos.current.y - Math.sin(angle) * pullDist;
      return;
    }

    const distToBall = Math.sqrt(Math.pow(x - ballPos.current.x, 2) + Math.pow(y - ballPos.current.y, 2));
    if (distToBall < 100) {
      isPinching.current = true;
      ballPos.current = { x, y };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPinching.current || isFlying.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    let x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Correct for mirrored canvas (CSS scaleX(-1))
    if (canvasRef.current) {
        x = canvasRef.current.width - x;
    }
    
    if (playMode === 'MANUAL') {
      const dx = x - anchorPos.current.x;
      const dy = y - anchorPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const pullDist = Math.min(dist, layoutRef.current.maxDragDist);
      
      ballPos.current.x = anchorPos.current.x - Math.cos(angle) * pullDist;
      ballPos.current.y = anchorPos.current.y - Math.sin(angle) * pullDist;
      return;
    }

    const dragDx = x - anchorPos.current.x;
    const dragDy = y - anchorPos.current.y;
    const dragDist = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
    
    if (dragDist > layoutRef.current.maxDragDist) {
      const angle = Math.atan2(dragDy, dragDx);
      ballPos.current.x = anchorPos.current.x + Math.cos(angle) * layoutRef.current.maxDragDist;
      ballPos.current.y = anchorPos.current.y + Math.sin(angle) * layoutRef.current.maxDragDist;
    } else {
      ballPos.current = { x, y };
    }
  };

  const handlePointerUp = () => {
    if (!isPinching.current || isFlying.current) return;
    isPinching.current = false;
    const dx = anchorPos.current.x - ballPos.current.x;
    const dy = anchorPos.current.y - ballPos.current.y;
    const stretchDist = Math.sqrt(dx * dx + dy * dy);
    
    if (stretchDist > 30) {
      isFlying.current = true;
      playSound('shoot');
      flightStartTime.current = performance.now();
      recoilRef.current = 25;
      const powerRatio = Math.min(stretchDist / layoutRef.current.maxDragDist, 1.0);
      let velocityMultiplier = MIN_FORCE_MULT + (MAX_FORCE_MULT - MIN_FORCE_MULT) * (powerRatio * powerRatio);
      
      // Reduce speed for manual mode as requested by user
      if (playMode === 'MANUAL') {
        velocityMultiplier *= 0.4; // 60% reduction for even smoother touch control
      }
      
      ballVel.current = { x: dx * velocityMultiplier, y: dy * velocityMultiplier };
    } else {
      ballPos.current = { ...anchorPos.current };
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row w-full h-[100dvh] bg-[#121212] overflow-hidden font-roboto text-[#e3e3e3] select-none">
      
      {/* LEFT: GAME AREA */}
      <div ref={gameContainerRef} className="flex-1 relative overflow-hidden bg-black/40 order-1 md:order-1">
        <video ref={videoRef} className="absolute opacity-0 pointer-events-none" playsInline muted />
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 z-10 touch-none cursor-crosshair" 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        />
        <canvas ref={fxCanvasRef} className="absolute inset-0 z-[100] pointer-events-none touch-none" />

        {!hasStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212] z-[100] animate-in fade-in duration-500">
                <div className="bg-[#1e1e1e] p-8 md:p-10 rounded-[40px] border border-[#444746] shadow-2xl max-w-md w-full text-center m-4 overflow-hidden relative group">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#42a5f5]/10 rounded-full blur-3xl group-hover:bg-[#42a5f5]/20 transition-all duration-700" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700" />
                    
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-[#42a5f5] to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#42a5f5]/20 rotate-3 group-hover:rotate-6 transition-transform">
                            <CameraIcon className="w-10 h-10 text-white" />
                        </div>
                        
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Prism Shot</h1>
                        <p className="text-[#c4c7c5] text-sm mb-10 leading-relaxed max-w-[280px] mx-auto">
                            Experimente o controle por gestos com IA ou jogue da forma clássica.
                        </p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => {
                                    setPlayMode('IA');
                                    setHasStarted(true);
                                }}
                                className="w-full py-5 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#42a5f5]/20"
                            >
                                <Hand className="w-6 h-6 animate-pulse" />
                                JOGAR COM IA
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setPlayMode('MANUAL'); // Renamed from MOUSE for clarity
                                    setHasStarted(true);
                                }}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border border-white/10 hover:border-white/20"
                            >
                                <MousePointerClick className="w-5 h-5 opacity-60" />
                                JOGAR COM TOQUE / MOUSE
                            </button>
                        </div>
                        
                        <div className="mt-10 flex items-center justify-center gap-4 text-[10px] text-[#c4c7c5]/40 font-bold uppercase tracking-widest">
                            <div className="h-px w-8 bg-current" />
                            REQUER CÂMERA PARA IA
                            <div className="h-px w-8 bg-current" />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212] z-50">
                <div className="flex flex-col items-center max-w-xs text-center px-6">
                    <Loader2 className="w-12 h-12 text-[#42a5f5] animate-spin mb-4" />
                    <p className="text-[#e3e3e3] text-lg font-medium mb-2">Iniciando IA de Reconhecimento...</p>
                    <p className="text-[#c4c7c5] text-xs mb-4">Isso pode levar alguns segundos enquanto carregamos os modelos de visão.</p>
                    
                    {window.self !== window.top && (
                        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <p className="text-[10px] text-blue-400 leading-tight">
                                <b>Nota:</b> Você está jogando dentro de uma janela. Se a câmera não abrir, use o botão "Abrir em Nova Aba" no menu ou abaixo.
                            </p>
                        </div>
                    )}
                    
                    <button 
                        onClick={() => {
                            setPlayMode('MANUAL');
                            setLoading(false);
                        }}
                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full text-xs font-medium transition-all border border-white/10"
                    >
                        Pular e Jogar com Mouse
                    </button>
                    
                    <p className="mt-4 text-[10px] text-[#c4c7c5]/50 italic text-center">
                        Dica: Se a câmera não iniciar, tente abrir em uma nova aba.
                    </p>
                </div>
            </div>
        )}

        {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212] z-[70] p-6 text-center">
                <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-red-500/30 shadow-2xl max-w-md w-full">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Problema na Câmera</h2>
                    <p className="text-[#c4c7c5] mb-6 text-sm leading-relaxed">
                        O Prism Shot usa gesto para mirar. O acesso à câmera pode estar bloqueado pelo navegador dentro desta janela.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={async () => {
                                try {
                                    setCameraError(null);
                                    setLoading(true);
                                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                    stream.getTracks().forEach(track => track.stop());
                                    setCameraRetryCount(prev => prev + 1);
                                } catch (err: any) {
                                    console.error("Manual permission check failed:", err);
                                    setCameraError(err.message || "Permissão negada");
                                    setLoading(false);
                                }
                            }}
                            className="w-full py-4 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-[#42a5f5]/20"
                        >
                            <CameraIcon className="w-5 h-5" /> 1. Solicitar Permissão
                        </button>

                        <button 
                            onClick={() => {
                                window.open(window.location.href, '_blank');
                            }}
                            className="w-full py-3 bg-[#c4c7c5] hover:bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        >
                            <Monitor className="w-5 h-5" /> 2. Abrir em Nova Aba (Recomendado)
                        </button>

                        <button 
                            onClick={() => {
                                setPlayMode('MANUAL');
                                setCameraError(null);
                                setLoading(false);
                            }}
                            className="w-full py-2 text-[#c4c7c5] hover:text-white text-xs font-medium transition-colors"
                        >
                            Continuar apenas com Mouse/Toque
                        </button>
                        
                        <div className="mt-4 p-3 bg-black/40 rounded-xl text-left border border-white/5">
                            <p className="text-[10px] text-red-400 font-mono font-bold uppercase mb-1">Diagnóstico:</p>
                            <p className="text-[10px] text-[#c4c7c5] font-mono break-all">{cameraError}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="absolute bottom-6 left-6 z-40 flex flex-col gap-2 pointer-events-none">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all duration-500 ${smoothedHandPosRef.current ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                <div className={`w-2 h-2 rounded-full ${smoothedHandPosRef.current ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[8px] font-bold uppercase tracking-wider opacity-80">
                    {smoothedHandPosRef.current ? 'IA Ativa' : 'IA Off'}
                </span>
            </div>
            {isPinching.current && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#42a5f5]/20 border border-[#42a5f5]/50 text-[#42a5f5] backdrop-blur-md animate-in zoom-in duration-200">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[8px] font-bold uppercase tracking-wider">Agarrado</span>
                </div>
            )}
        </div>

        {!loading && (gameState === 'PLAYING' || gameState === 'PAUSED') && !showTutorial && (
            <button
                onClick={togglePause}
                className="absolute top-4 right-4 z-40 p-3 rounded-full bg-[#1e1e1e]/80 border border-[#444746] hover:bg-[#2d2d2d] transition-all duration-200"
            >
                {gameState === 'PAUSED' ? <Play className="w-6 h-6 text-[#66bb6a] fill-current" /> : <Pause className="w-6 h-6 text-[#c4c7c5] fill-current" />}
            </button>
        )}

        {gameState === 'PAUSED' && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
                 <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-[#444746] shadow-2xl text-center">
                     <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Paused</h2>
                     <button onClick={togglePause} className="w-full py-3 px-8 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                         <Play className="w-5 h-5 fill-current" /> Resume
                     </button>
                 </div>
             </div>
        )}

        {!loading && showTutorial && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[60] animate-in fade-in duration-300">
                <div className="bg-[#1e1e1e] p-6 md:p-8 rounded-[32px] border border-[#444746] shadow-2xl max-w-md w-full mx-4 relative">
                    <button onClick={skipTutorial} className="absolute top-4 right-4 p-2 text-[#c4c7c5] hover:text-white hover:bg-[#2d2d2d] rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-[#42a5f5]/20 rounded-full flex items-center justify-center mb-6"> {React.createElement(TUTORIAL_STEPS[tutorialStep].icon, { className: "w-8 h-8 text-[#42a5f5]" })} </div>
                        <h2 className="text-2xl font-bold text-white mb-3">{TUTORIAL_STEPS[tutorialStep].title}</h2>
                        <p className="text-[#c4c7c5] mb-8 leading-relaxed">{TUTORIAL_STEPS[tutorialStep].content}</p>
                        <div className="flex gap-2 mb-6"> {TUTORIAL_STEPS.map((_, idx) => ( <div key={idx} className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === tutorialStep ? 'w-6 bg-[#42a5f5]' : 'bg-[#444746]'}`} /> ))} </div>
                        <div className="flex w-full gap-3">
                            {tutorialStep > 0 && <button onClick={prevTutorialStep} className="flex-1 py-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-xl font-bold transition-colors">Back</button>}
                            <button onClick={nextTutorialStep} className="flex-1 py-3 bg-[#42a5f5] hover:bg-[#29b6f6] text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"> {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Let's Play!" : "Next"} {tutorialStep < TUTORIAL_STEPS.length - 1 && <ArrowRight className="w-4 h-4" />} </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {!loading && gameState === 'MENU' && !showTutorial && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/80 backdrop-blur-sm z-50 animate-in fade-in duration-500">
                <div className="bg-[#1e1e1e] p-6 md:p-8 rounded-[32px] border border-[#444746] shadow-2xl max-w-md w-full text-center m-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PrismShot</h1>
                    <a 
                      href="https://www.linkedin.com/in/eleandro-mangrich" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#42a5f5] hover:underline mb-8 text-sm block flex items-center justify-center gap-2"
                    >
                      <Linkedin className="w-4 h-4" /> Developed by Eleandro
                    </a>
                    <div className="space-y-4">
                        {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((key) => {
                            const setting = DIFFICULTY_SETTINGS[key]; const Icon = setting.icon;
                            return (
                                <button key={key} onClick={() => startGame(key)} className="w-full flex items-center justify-between p-4 rounded-2xl border border-[#444746] hover:bg-[#2d2d2d] hover:border-[#a8c7fa] transition-all duration-200 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full bg-[${setting.color}]/20`} style={{ backgroundColor: `${setting.color}33` }}> <Icon className="w-6 h-6" style={{ color: setting.color }} /> </div>
                                        <div className="text-left"> <p className="text-white font-bold text-lg">{setting.label}</p> <p className="text-[#c4c7c5] text-xs"> {setting.rows} starting rows • {key === 'easy' ? 'No auto drop' : `${setting.descentInterval / 1000}s drop`} </p> </div>
                                    </div>
                                    <Play className="w-5 h-5 text-[#444746] group-hover:text-[#a8c7fa]" />
                                </button>
                            );
                        })}
                        <button onClick={() => { playSound('click'); setShowTutorial(true); setTutorialStep(0); }} className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-[#444746] hover:bg-[#2d2d2d] text-[#c4c7c5] hover:text-white transition-all duration-200 mt-2"> <HelpCircle className="w-5 h-5" /> <span className="font-medium">How to Play</span> </button>
                    </div>
                </div>
            </div>
        )}

        {gameState === 'GAMEOVER' && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/90 backdrop-blur-md z-50 animate-in zoom-in duration-300">
                <div className="bg-[#1e1e1e] p-8 rounded-[32px] border border-[#ef5350] shadow-2xl max-w-sm w-full text-center m-4 max-h-[90dvh] overflow-y-auto no-scrollbar">
                    <div className="w-20 h-20 bg-[#ef5350]/20 rounded-full flex items-center justify-center mx-auto mb-6"> <Trophy className="w-10 h-10 text-[#ef5350]" /> </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Game Over</h2>
                    <div className="bg-[#2d2d2d] rounded-xl p-4 mb-8"> <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-bold mb-1">Final Score</p> <p className="text-4xl font-black text-white">{score.toLocaleString()}</p> </div>
                    <button onClick={() => { initAudio(); playSound('click'); setGameState('MENU'); gameStateRef.current = 'MENU'; }} className="w-full py-4 bg-[#ef5350] hover:bg-[#e53935] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-colors"> <RotateCcw className="w-5 h-5" /> Try Again </button>
                    <a href="https://www.linkedin.com/in/eleandro-mangrich" target="_blank" rel="noopener noreferrer" className="mt-4 text-xs text-[#c4c7c5] hover:text-[#42a5f5] transition-colors flex items-center justify-center gap-1"> <Linkedin className="w-3 h-3" /> Developed by Eleandro </a>
                </div>
             </div>
        )}

        {gameState === 'WIN' && (
             <div className="absolute inset-0 flex items-center justify-center bg-[#121212]/60 backdrop-blur-md z-50 animate-in zoom-in duration-500">
                <div className="bg-[#1e1e1e]/95 p-8 rounded-[32px] border border-[#66bb6a] shadow-[0_0_50px_rgba(102,187,106,0.3)] max-w-sm w-full text-center m-4 relative overflow-hidden max-h-[90dvh] overflow-y-auto no-scrollbar">
                    <div className="w-24 h-24 bg-[#66bb6a]/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce"> <Sparkles className="w-12 h-12 text-[#66bb6a]" /> </div>
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Congratulations!</h2>
                    <p className="text-xl font-bold text-[#42a5f5] mb-2">You are the best!</p>
                    <div className="bg-[#2d2d2d] rounded-xl p-4 mb-8 border border-[#66bb6a]/30"> <p className="text-xs text-[#c4c7c5] uppercase tracking-wider font-bold mb-1">Victory Score</p> <p className="text-5xl font-black text-[#66bb6a]">{score.toLocaleString()}</p> </div>
                    <button onClick={() => { initAudio(); playSound('click'); setGameState('MENU'); gameStateRef.current = 'MENU'; }} className="w-full py-4 bg-[#66bb6a] hover:bg-[#57a05b] text-white rounded-full font-bold text-lg flex items-center justify-center gap-2 transition-all hover:scale-105"> <RotateCcw className="w-5 h-5" /> Play Again </button>
                    <a href="https://www.linkedin.com/in/eleandro-mangrich" target="_blank" rel="noopener noreferrer" className="mt-4 text-xs text-[#c4c7c5] hover:text-[#42a5f5] transition-colors flex items-center justify-center gap-1"> <Linkedin className="w-3 h-3" /> Developed by Eleandro </a>
                </div>
             </div>
        )}
      </div>

      {/* RIGHT: SIDEBAR HUD */}
      <div className="md:w-72 md:h-full md:border-l w-full h-auto border-t bg-[#1e1e1e] border-[#444746] flex flex-row md:flex-col z-20 shadow-2xl relative shrink-0 order-2 md:order-2">
          <div className="hidden md:block p-6 border-b border-[#444746]">
              <div className="flex items-center gap-3 mb-2"> <div className="p-2 bg-[#42a5f5]/20 rounded-lg"> <Target className="w-5 h-5 text-[#42a5f5]" /> </div> <h2 className="text-xl font-bold text-white tracking-tight leading-tight">PrismShot</h2> </div>
              <a href="https://www.linkedin.com/in/eleandro-mangrich" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity mt-2"> <Linkedin className="w-4 h-4 text-[#0077b5]" /> <p className="text-[10px] text-[#c4c7c5] font-bold tracking-wider">DEVELOPED BY ELEANDRO</p> </a>
              <div className="flex items-center justify-end mt-4"> <button onClick={() => { playSound('click'); setShowTutorial(true); setTutorialStep(0); }} className="p-2 bg-[#2d2d2d] rounded-lg text-[#c4c7c5] hover:text-[#42a5f5] hover:bg-[#3d3d3d] transition-all flex items-center gap-2 text-xs font-bold"> <HelpCircle className="w-4 h-4" /> Help </button> </div>
          </div>
          <div className="flex-1 p-3 md:p-6 flex flex-row md:flex-col gap-4 md:gap-8 overflow-x-auto md:overflow-y-auto items-center md:items-stretch no-scrollbar">
              <div className="flex flex-col md:space-y-2 min-w-[80px]">
                   <div className="hidden md:flex items-center justify-between"> <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Score</span> <Trophy className="w-4 h-4 text-[#ffd700]" /> </div>
                   <div className="bg-transparent md:bg-[#2d2d2d] md:rounded-2xl md:p-4 md:border md:border-[#444746]"> <span className="text-xl md:text-3xl font-black text-white block"> <span className="md:hidden text-xs text-[#c4c7c5] mr-2">PTS</span> {score.toLocaleString()} </span> </div>
              </div>
              
              {/* AI HINT BUTTON */}
              <div className="flex flex-col md:space-y-2">
                  <div className="hidden md:flex items-center justify-between"> <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Gemini AI</span> <BrainCircuit className="w-3 h-3 text-[#42a5f5]" /> </div>
                  <button 
                    disabled={isAiLoading || gameState !== 'PLAYING'}
                    onClick={requestAiHint}
                    className={`flex items-center justify-center gap-2 p-3 md:p-4 rounded-2xl border transition-all duration-200 ${isAiLoading ? 'bg-[#2d2d2d] border-[#444746] opacity-50' : 'bg-[#42a5f5]/10 border-[#42a5f5]/30 hover:bg-[#42a5f5]/20 hover:border-[#42a5f5] text-[#42a5f5]'}`}
                  >
                    {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <span className="hidden md:inline font-bold text-sm">{isAiLoading ? 'Analyzing...' : 'Get Hint'}</span>
                  </button>
              </div>

              <div className="flex-1 md:flex-none space-y-0 md:space-y-2 flex flex-col justify-center">
                  <div className="hidden md:flex items-center justify-between"> 
                    <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Ammo</span> 
                    <Target className="w-3 h-3 text-[#c4c7c5]" /> 
                  </div>
                  <div className="flex items-center gap-4 px-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[8px] text-[#c4c7c5] uppercase mb-1">Now</span>
                      <div className="w-12 h-12 rounded-full border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] flex items-center justify-center bg-[#2d2d2d]">
                         <div 
                            className="w-10 h-10 rounded-full" 
                            style={{ 
                                background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${COLOR_CONFIG[selectedColor].hex} 40%, ${adjustColor(COLOR_CONFIG[selectedColor].hex, -60)} 100%)` 
                            }} 
                         />
                      </div>
                    </div>
                    <div className="flex flex-col items-center opacity-60">
                      <span className="text-[8px] text-[#c4c7c5] uppercase mb-1">Next</span>
                      <div className="w-10 h-10 rounded-full border border-dashed border-[#444746] flex items-center justify-center bg-[#2d2d2d]">
                         <div 
                            className="w-8 h-8 rounded-full" 
                            style={{ 
                                background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${COLOR_CONFIG[nextColor].hex} 40%, ${adjustColor(COLOR_CONFIG[nextColor].hex, -60)} 100%)` 
                            }} 
                         />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="flex-1 md:flex-none space-y-0 md:space-y-2 flex flex-col justify-center">
                  <div className="hidden md:flex items-center justify-between"> <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Selection</span> <Palette className="w-3 h-3 text-[#c4c7c5]" /> </div>
                  <div className="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto pb-1 md:pb-0 px-1 items-center">
                      {availableColors.length === 0 ? ( 
                          <p className="col-span-3 text-center text-xs text-gray-500 py-4 italic whitespace-nowrap">Empty</p> 
                      ) : ( 
                          COLOR_KEYS.slice(0, DIFFICULTY_SETTINGS[difficulty].maxColors).map(color => { 
                              const isAvailable = availableColors.includes(color); 
                              const isSelected = selectedColor === color; 
                              const config = COLOR_CONFIG[color]; 
                              return ( 
                                  <button 
                                      key={color} 
                                      disabled={!isAvailable} 
                                      onClick={() => { if(isAvailable) { playSound('click'); setSelectedColor(color); } }} 
                                      className={`aspect-square rounded-lg flex items-center justify-center transition-all duration-200 relative shrink-0 ${!isAvailable ? 'opacity-20 cursor-not-allowed bg-[#2d2d2d]' : 'hover:scale-110 shadow-lg'} ${isSelected ? 'ring-2 ring-[#42a5f5] z-10 scale-110 w-10 h-10 md:w-full' : 'border border-[#444746] w-8 h-8 md:w-full'}`} 
                                      style={{ backgroundColor: '#262626' }}
                                  > 
                                      {isAvailable && ( 
                                        <div 
                                          className="w-full h-full rounded-full transform scale-75" 
                                          style={{ 
                                            background: `radial-gradient(circle at 30% 30%, #ffffff 0%, ${config.hex} 40%, ${adjustColor(config.hex, -60)} 100%)`,
                                            boxShadow: isSelected ? `0 0 10px ${config.hex}` : 'none'
                                          }} 
                                        /> 
                                      )} 
                                  </button> 
                              ) 
                          }) 
                      )}
                  </div>
              </div>
              <div className="flex-1 md:flex-none space-y-0 md:space-y-2 flex flex-col justify-center">
                  <div className="hidden md:flex items-center justify-between"> <span className="text-xs text-[#c4c7c5] uppercase tracking-wider font-medium">Style</span> <Palette className="w-3 h-3 text-[#c4c7c5]" /> </div>
                  <div className="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto pb-1 md:pb-0 px-1 items-center">
                      {(Object.values(HANDLE_THEMES)).map((theme) => ( <button key={theme.id} onClick={() => { playSound('click'); setHandleDesign(theme.id); }} className={`w-8 h-8 rounded-full border-2 transition-all duration-200 relative shrink-0 hover:scale-110`} style={{ backgroundColor: theme.handleColor, borderColor: handleDesign === theme.id ? theme.glowColor : '#444746', boxShadow: handleDesign === theme.id ? `0 0 10px ${theme.glowColor}` : 'none' }}> {handleDesign === theme.id && <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white animate-pulse" />} </button> ))}
                  </div>
              </div>
               <button onClick={() => { playSound('click'); setGameState('MENU'); gameStateRef.current = 'MENU'; }} className="md:hidden p-3 rounded-xl bg-[#2d2d2d] border border-[#444746] text-[#e3e3e3] shrink-0"> <MenuIcon className="w-5 h-5" /> </button>
          </div>
          <div className="hidden md:block p-6 border-t border-[#444746] bg-[#1a1a1a]">
              {/* AdSense Placeholder */}
              <div className="mb-4 p-2 border border-dashed border-[#444746] rounded-lg text-center">
                <p className="text-[10px] text-[#c4c7c5] uppercase mb-2">Advertisement</p>
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                     data-ad-slot="XXXXXXXXXX"
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
              </div>
              <button onClick={() => { playSound('click'); setGameState('MENU'); gameStateRef.current = 'MENU'; }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#e3e3e3] text-sm font-bold transition-colors border border-[#444746]"> <MenuIcon className="w-4 h-4" /> Main Menu </button>
          </div>
      </div>
    </div>
  );
};

export default PrismShot;
