import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/bass-game/")({
  component: BassGame,
});

interface Enemy {
  id: number;
  x: number;
  y: number;
  type: 'quarter' | 'eighth' | 'sixteenth';
  speed: number;
  health: number;
  angle: number;
}

interface Laser {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

function BassGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [wave, setWave] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const playerRef = useRef({ x: 400, y: 520, width: 60, height: 100 });
  const laserRef = useRef<Laser[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShotRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const idCounterRef = useRef<number>(0);
  const bassImageRef = useRef<HTMLImageElement | null>(null);
  const touchRef = useRef<{ active: boolean; x: number }>({ active: false, x: 0 });

  // Load bass image
  useEffect(() => {
    const img = new Image();
    img.src = '/bass-icon.webp';
    img.onload = () => {
      bassImageRef.current = img;
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      touchRef.current = { active: true, x: (touch.clientX - rect.left) * scaleX };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (canvas && touchRef.current.active) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      touchRef.current.x = (touch.clientX - rect.left) * scaleX;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchRef.current.active = false;
  }, []);

  // Spawn enemy
  const spawnEnemy = useCallback(() => {
    const types: Array<'quarter' | 'eighth' | 'sixteenth'> = ['quarter', 'eighth', 'sixteenth'];
    const type = types[Math.floor(Math.random() * types.length)];
    const health = type === 'quarter' ? 3 : type === 'eighth' ? 2 : 1;
    const speed = (type === 'sixteenth' ? 3 : type === 'eighth' ? 2 : 1.5) + wave * 0.2;
    
    enemiesRef.current.push({
      id: idCounterRef.current++,
      x: 50 + Math.random() * 700,
      y: -40,
      type,
      speed,
      health,
      angle: 0,
    });
  }, [wave]);

  // Create explosion particles
  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      particlesRef.current.push({
        id: idCounterRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        color,
      });
    }
  }, []);

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setWave(1);
    playerRef.current = { x: 400, y: 520, width: 60, height: 100 };
    laserRef.current = [];
    enemiesRef.current = [];
    particlesRef.current = [];
    lastSpawnRef.current = Date.now();
    lastShotRef.current = Date.now();
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const difficultySettings = {
      easy: { spawnRate: 1200, fireRate: 200 },
      medium: { spawnRate: 800, fireRate: 150 },
      hard: { spawnRate: 500, fireRate: 100 },
    };
    const settings = difficultySettings[difficulty];

    const gameLoop = () => {
      const now = Date.now();
      const player = playerRef.current;
      
      // Player movement
      const moveSpeed = 6;
      if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
        player.x = Math.max(player.width / 2, player.x - moveSpeed);
      }
      if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
        player.x = Math.min(canvas.width - player.width / 2, player.x + moveSpeed);
      }
      
      // Touch movement
      if (touchRef.current.active) {
        const targetX = touchRef.current.x;
        const diff = targetX - player.x;
        player.x += diff * 0.15;
        player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
      }
      
      // Auto-fire (or space/touch)
      const shouldFire = keysRef.current.has(' ') || keysRef.current.has('arrowup') || touchRef.current.active;
      if (shouldFire && now - lastShotRef.current > settings.fireRate) {
        // Shoot from TOP of bass (headstock)
        laserRef.current.push({
          id: idCounterRef.current++,
          x: player.x,
          y: player.y - player.height / 2, // Top of bass image
          speed: 12,
        });
        lastShotRef.current = now;
      }
      
      // Spawn enemies
      if (now - lastSpawnRef.current > settings.spawnRate) {
        spawnEnemy();
        lastSpawnRef.current = now;
      }
      
      // Update lasers
      laserRef.current = laserRef.current.filter(laser => {
        laser.y -= laser.speed;
        return laser.y > -20;
      });
      
      // Update enemies
      let scoreGain = 0;
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.y += enemy.speed;
        enemy.angle += 0.05;
        
        // Check laser collisions
        for (let i = laserRef.current.length - 1; i >= 0; i--) {
          const laser = laserRef.current[i];
          const dx = laser.x - enemy.x;
          const dy = laser.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 30) {
            laserRef.current.splice(i, 1);
            enemy.health--;
            
            if (enemy.health <= 0) {
              const points = enemy.type === 'quarter' ? 300 : enemy.type === 'eighth' ? 200 : 100;
              scoreGain += points;
              createExplosion(enemy.x, enemy.y, enemy.type === 'quarter' ? '#ff00ff' : enemy.type === 'eighth' ? '#00ffff' : '#ffff00');
              return false;
            }
          }
        }
        
        // Check player collision
        const px = player.x;
        const py = player.y;
        const dx = px - enemy.x;
        const dy = py - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 40) {
          createExplosion(enemy.x, enemy.y, '#ff0000');
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameover');
              setHighScore(h => Math.max(h, score + scoreGain));
            }
            return newLives;
          });
          return false;
        }
        
        // Off screen
        if (enemy.y > canvas.height + 50) {
          return false;
        }
        
        return true;
      });
      
      if (scoreGain > 0) {
        setScore(s => s + scoreGain);
      }
      
      // Update particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });
      
      // Wave progression
      if (enemiesRef.current.length === 0 && now - lastSpawnRef.current > 2000) {
        setWave(w => w + 1);
      }
      
      // === DRAW ===
      
      // Background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0020');
      gradient.addColorStop(0.5, '#1a0040');
      gradient.addColorStop(1, '#0a0020');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 50; i++) {
        const sx = (i * 137.5 + now * 0.01) % canvas.width;
        const sy = (i * 91.3 + now * 0.02) % canvas.height;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw lasers
      laserRef.current.forEach(laser => {
        // Laser beam effect
        const laserGradient = ctx.createLinearGradient(laser.x, laser.y - 20, laser.x, laser.y + 10);
        laserGradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
        laserGradient.addColorStop(0.3, '#ff00ff');
        laserGradient.addColorStop(0.7, '#ff88ff');
        laserGradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
        
        ctx.fillStyle = laserGradient;
        ctx.fillRect(laser.x - 3, laser.y - 20, 6, 30);
        
        // Glow
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(laser.x - 2, laser.y - 15, 4, 20);
        ctx.shadowBlur = 0;
      });
      
      // Draw enemies (music notes)
      enemiesRef.current.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(Math.sin(enemy.angle) * 0.2);
        
        // Set color based on type and health
        const baseColors = {
          quarter: '#ff00ff',
          eighth: '#00ffff', 
          sixteenth: '#ffff00'
        };
        ctx.fillStyle = baseColors[enemy.type];
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // Draw music note symbol
        ctx.font = `bold ${enemy.type === 'quarter' ? 50 : enemy.type === 'eighth' ? 40 : 35}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Glow effect
        ctx.shadowColor = baseColors[enemy.type];
        ctx.shadowBlur = 20;
        
        const noteSymbols = {
          quarter: '♩',
          eighth: '♪',
          sixteenth: '♬'
        };
        ctx.fillText(noteSymbols[enemy.type], 0, 0);
        ctx.shadowBlur = 0;
        
        // Health indicator
        if (enemy.health > 1) {
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(enemy.health.toString(), 0, -30);
        }
        
        ctx.restore();
      });
      
      // Draw particles
      particlesRef.current.forEach(p => {
        const alpha = p.life / 30;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw player (bass guitar)
      ctx.save();
      ctx.translate(player.x, player.y);
      
      if (bassImageRef.current) {
        // Draw the bass image - it's facing up, so we draw it as-is
        const imgWidth = player.width;
        const imgHeight = player.height;
        ctx.drawImage(
          bassImageRef.current,
          -imgWidth / 2,
          -imgHeight / 2,
          imgWidth,
          imgHeight
        );
        
        // Add glow effect
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(
          bassImageRef.current,
          -imgWidth / 2,
          -imgHeight / 2,
          imgWidth,
          imgHeight
        );
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else {
        // Fallback if image not loaded
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BASS', 0, 0);
      }
      ctx.restore();
      
      // HUD
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE: ${score}`, 15, 30);
      ctx.fillText(`WAVE: ${wave}`, 15, 55);
      
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff0066';
      ctx.fillText('♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives)), canvas.width - 15, 30);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameState, difficulty, score, lives, wave, spawnEnemy, createExplosion]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0020] to-[#1a0040] text-white font-mono">
      {/* Header */}
      <header className="py-3 border-b border-purple-500/30">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <a href="/" className="text-purple-400 hover:text-purple-300 text-sm">← Back</a>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
            🎸 BASS INVADERS
          </h1>
          <div className="text-sm text-purple-400">HI: {highScore}</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {gameState === 'menu' && (
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
                BASS INVADERS
              </h2>
              <p className="text-purple-300 text-lg">
                Defend the groove! Destroy the rogue notes!
              </p>
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <p className="text-purple-300 text-sm">DIFFICULTY</p>
              <div className="flex justify-center gap-2">
                {(['easy', 'medium', 'hard'] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm uppercase transition-all ${
                      difficulty === d
                        ? 'bg-pink-500 text-white'
                        : 'bg-black/50 border border-purple-500/50 text-purple-300 hover:border-pink-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Start */}
            <button
              onClick={startGame}
              className="px-10 py-4 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl text-2xl font-black hover:scale-105 transition-transform shadow-lg shadow-pink-500/50"
            >
              🎸 START JAMMING
            </button>

            {/* Instructions */}
            <div className="text-left bg-black/30 border border-cyan-500/30 rounded-xl p-4 max-w-md mx-auto text-sm">
              <h3 className="text-cyan-400 font-bold mb-2">HOW TO PLAY</h3>
              <ul className="space-y-1 text-purple-200">
                <li>• <span className="text-pink-400">←/→</span> or <span className="text-pink-400">A/D</span> to move</li>
                <li>• <span className="text-pink-400">SPACE</span> or <span className="text-pink-400">↑</span> to fire</li>
                <li>• <span className="text-pink-400">Touch</span> and drag on mobile</li>
                <li>• Destroy the music notes before they reach you!</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-purple-500/30">
                <h4 className="text-amber-400 font-bold mb-1">ENEMIES</h4>
                <ul className="space-y-1 text-purple-200">
                  <li><span className="text-yellow-400">♬</span> Sixteenth - Fast, 100pts</li>
                  <li><span className="text-cyan-400">♪</span> Eighth - Medium, 200pts</li>
                  <li><span className="text-pink-400">♩</span> Quarter - Tough, 300pts</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-3">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full rounded-xl border-2 border-purple-500 shadow-lg shadow-purple-500/30 touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            <p className="text-center text-purple-400 text-xs">
              ← → or A/D to move • SPACE to fire • Touch to play on mobile
            </p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="text-center space-y-6">
            <h2 className="text-5xl font-black text-red-500">GAME OVER</h2>
            <div className="space-y-2">
              <p className="text-3xl text-cyan-400">SCORE: {score}</p>
              <p className="text-xl text-purple-300">WAVE: {wave}</p>
              {score >= highScore && score > 0 && (
                <p className="text-xl text-yellow-400 animate-pulse">★ NEW HIGH SCORE! ★</p>
              )}
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl text-xl font-black hover:scale-105 transition-transform"
            >
              🎸 PLAY AGAIN
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
