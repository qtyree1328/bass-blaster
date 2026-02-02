import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";

export const Route = createFileRoute("/bass-game/")({
  component: BassGame,
});

// ============ MUSIC THEORY HELPERS ============

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Major scale intervals (whole whole half whole whole whole half)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// Chord qualities for each degree of major scale
const SCALE_CHORD_QUALITIES = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

// Chord intervals (root, third, fifth)
const CHORD_INTERVALS: Record<string, number[]> = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
};

// Circle of 4ths (going up by 4ths)
const CIRCLE_OF_FOURTHS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];

// Bass tuning (standard 4-string): E1, A1, D2, G2
const BASS_OPEN_STRINGS = [28, 33, 38, 43]; // MIDI note numbers (E1=28)
const STRING_NAMES = ['E', 'A', 'D', 'G'];
const FRET_COUNT = 12;

function getNoteIndex(noteName: string): number {
  const clean = noteName.replace(/[0-9]/g, '');
  let idx = NOTE_NAMES.indexOf(clean);
  if (idx === -1) idx = FLAT_NAMES.indexOf(clean);
  return idx;
}

function getNoteName(midiNote: number, useFlats = false): string {
  const names = useFlats ? FLAT_NAMES : NOTE_NAMES;
  return names[midiNote % 12];
}

function getMajorScaleNotes(root: string): string[] {
  const rootIdx = getNoteIndex(root);
  return MAJOR_SCALE_INTERVALS.map(interval => NOTE_NAMES[(rootIdx + interval) % 12]);
}

function getChordNotes(root: string, quality: string): string[] {
  const rootIdx = getNoteIndex(root);
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS['maj'];
  return intervals.map(interval => NOTE_NAMES[(rootIdx + interval) % 12]);
}

function getScaleChords(root: string): { root: string; quality: string; notes: string[] }[] {
  const scaleNotes = getMajorScaleNotes(root);
  return scaleNotes.map((note, i) => ({
    root: note,
    quality: SCALE_CHORD_QUALITIES[i],
    notes: getChordNotes(note, SCALE_CHORD_QUALITIES[i]),
  }));
}

// Get all fret positions where a note can be played
function getNotePositions(noteName: string): { string: number; fret: number }[] {
  const positions: { string: number; fret: number }[] = [];
  const noteIdx = getNoteIndex(noteName);
  
  BASS_OPEN_STRINGS.forEach((openNote, stringIdx) => {
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      if ((openNote + fret) % 12 === noteIdx) {
        positions.push({ string: stringIdx, fret });
      }
    }
  });
  
  return positions;
}

// ============ FRETBOARD COMPONENT ============

interface FretboardProps {
  highlightNotes: string[];
  playedNotes: string[];
  showAllPositions?: boolean;
}

function Fretboard({ highlightNotes, playedNotes, showAllPositions = true }: FretboardProps) {
  const fretWidth = 60;
  const stringSpacing = 30;
  const topPadding = 30;
  const leftPadding = 50;
  
  // Get positions for highlighted notes
  const positions: { string: number; fret: number; note: string; played: boolean }[] = [];
  highlightNotes.forEach(note => {
    const notePositions = getNotePositions(note);
    const isPlayed = playedNotes.includes(note);
    if (showAllPositions) {
      notePositions.forEach(pos => {
        positions.push({ ...pos, note, played: isPlayed });
      });
    } else {
      // Show only the most practical position
      const best = notePositions.sort((a, b) => {
        // Prefer lower frets and middle strings
        const scoreA = a.fret + Math.abs(a.string - 1.5) * 0.5;
        const scoreB = b.fret + Math.abs(b.string - 1.5) * 0.5;
        return scoreA - scoreB;
      })[0];
      if (best) positions.push({ ...best, note, played: isPlayed });
    }
  });

  return (
    <svg 
      width={leftPadding + FRET_COUNT * fretWidth + 20} 
      height={topPadding + 3 * stringSpacing + 40}
      className="bg-gradient-to-b from-amber-900/40 to-amber-800/20 rounded-xl border border-amber-500/30"
    >
      {/* Nut */}
      <rect x={leftPadding - 5} y={topPadding - 5} width={8} height={3 * stringSpacing + 10} fill="#f5f5dc" />
      
      {/* Frets */}
      {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
        <g key={`fret-${i}`}>
          <line
            x1={leftPadding + i * fretWidth}
            y1={topPadding}
            x2={leftPadding + i * fretWidth}
            y2={topPadding + 3 * stringSpacing}
            stroke="#888"
            strokeWidth={i === 0 ? 4 : 2}
          />
          {/* Fret numbers */}
          <text
            x={leftPadding + i * fretWidth + fretWidth / 2}
            y={topPadding + 3 * stringSpacing + 20}
            textAnchor="middle"
            fill="#888"
            fontSize="12"
            fontFamily="monospace"
          >
            {i + 1}
          </text>
        </g>
      ))}
      
      {/* Fret markers (dots) */}
      {[3, 5, 7, 9, 12].map(fret => (
        <circle
          key={`marker-${fret}`}
          cx={leftPadding + (fret - 0.5) * fretWidth}
          cy={topPadding + 1.5 * stringSpacing}
          r={fret === 12 ? 6 : 4}
          fill="#555"
        />
      ))}
      
      {/* Strings */}
      {STRING_NAMES.map((name, i) => (
        <g key={`string-${i}`}>
          <line
            x1={leftPadding - 10}
            y1={topPadding + i * stringSpacing}
            x2={leftPadding + FRET_COUNT * fretWidth + 10}
            y2={topPadding + i * stringSpacing}
            stroke={i < 2 ? '#ccc' : '#999'}
            strokeWidth={4 - i * 0.5}
          />
          {/* String name */}
          <text
            x={leftPadding - 25}
            y={topPadding + i * stringSpacing + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize="14"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {name}
          </text>
        </g>
      ))}
      
      {/* Highlighted notes */}
      {positions.map((pos, i) => {
        const x = pos.fret === 0 
          ? leftPadding - 15 
          : leftPadding + (pos.fret - 0.5) * fretWidth;
        const y = topPadding + pos.string * stringSpacing;
        const noteIndex = highlightNotes.indexOf(pos.note);
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1']; // Root, 3rd, 5th
        const color = colors[noteIndex % 3] || '#fff';
        
        return (
          <g key={`note-${i}`}>
            <circle
              cx={x}
              cy={y}
              r={14}
              fill={pos.played ? '#22c55e' : color}
              stroke={pos.played ? '#fff' : '#000'}
              strokeWidth={2}
              style={{
                filter: pos.played ? 'drop-shadow(0 0 8px #22c55e)' : 'none',
                transition: 'all 0.2s ease',
              }}
            />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fill="#000"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              {pos.note}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ MODES GAME ============

interface ModesGameProps {
  onBack: () => void;
}

function ModesGame({ onBack }: ModesGameProps) {
  const [rootNote, setRootNote] = useState<string | null>(null);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [playedNotes, setPlayedNotes] = useState<Set<string>>(new Set());
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(true);
  
  const chords = rootNote ? getScaleChords(rootNote) : [];
  const currentChord = chords[currentChordIndex];

  // MIDI setup
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(access => {
        setMidiAccess(access);
        
        const handleMIDIMessage = (event: MIDIMessageEvent) => {
          const [status, note] = event.data as Uint8Array;
          if ((status & 0xf0) === 0x90 && event.data[2] > 0) {
            // Note on
            const noteName = getNoteName(note);
            setPlayedNotes(prev => new Set([...prev, noteName]));
          }
        };
        
        access.inputs.forEach(input => {
          input.onmidimessage = handleMIDIMessage;
        });
        
        access.onstatechange = () => {
          access.inputs.forEach(input => {
            input.onmidimessage = handleMIDIMessage;
          });
        };
      }).catch(console.error);
    }
  }, []);

  // Check if chord is complete
  useEffect(() => {
    if (!currentChord) return;
    
    const chordNotes = currentChord.notes;
    const allPlayed = chordNotes.every(note => playedNotes.has(note));
    
    if (allPlayed) {
      setTimeout(() => {
        if (currentChordIndex < chords.length - 1) {
          setCurrentChordIndex(i => i + 1);
          setPlayedNotes(new Set());
        } else {
          setCompleted(true);
        }
      }, 500);
    }
  }, [playedNotes, currentChord, currentChordIndex, chords.length]);

  // Keyboard fallback for testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
        'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
        'u': 'A#', 'j': 'B'
      };
      if (keyMap[e.key.toLowerCase()]) {
        setPlayedNotes(prev => new Set([...prev, keyMap[e.key.toLowerCase()]]));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const reset = () => {
    setCurrentChordIndex(0);
    setPlayedNotes(new Set());
    setCompleted(false);
  };

  if (!rootNote) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          🎵 MODES - Chord Progressions
        </h2>
        <p className="text-purple-300">Select a root note to practice the 7 diatonic chords</p>
        
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {NOTE_NAMES.map(note => (
            <button
              key={note}
              onClick={() => setRootNote(note)}
              className="px-4 py-3 bg-black/50 border border-purple-500/50 rounded-lg text-xl font-bold text-cyan-400 hover:border-pink-500 hover:bg-pink-500/20 transition-all"
            >
              {note}
            </button>
          ))}
        </div>
        
        <button
          onClick={onBack}
          className="text-purple-400 hover:text-pink-400 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-4xl font-black text-green-400">🎉 COMPLETE!</h2>
        <p className="text-purple-300 text-xl">You played all 7 chords in {rootNote} major!</p>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold hover:scale-105 transition-transform"
          >
            Play Again
          </button>
          <button
            onClick={() => { setRootNote(null); reset(); }}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg font-bold hover:scale-105 transition-transform"
          >
            New Key
          </button>
        </div>
        
        <button onClick={onBack} className="text-purple-400 hover:text-pink-400">
          ← Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-purple-400 hover:text-pink-400">
          ← Back
        </button>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          Key of {rootNote} Major
        </h2>
        <button
          onClick={() => { setRootNote(null); reset(); }}
          className="text-purple-400 hover:text-pink-400"
        >
          Change Key
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2 justify-center">
        {chords.map((chord, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded text-sm font-bold transition-all ${
              i < currentChordIndex
                ? 'bg-green-500 text-white'
                : i === currentChordIndex
                ? 'bg-pink-500 text-white scale-110'
                : 'bg-black/30 text-purple-400'
            }`}
          >
            {chord.root}{chord.quality}
          </div>
        ))}
      </div>

      {/* Current chord display */}
      <div className="text-center bg-black/30 rounded-xl p-6 border border-purple-500/30">
        <p className="text-purple-400 text-sm mb-2">Play this chord:</p>
        <h3 className="text-5xl font-black text-white mb-4">
          {currentChord.root}
          <span className="text-pink-400">{currentChord.quality}</span>
        </h3>
        <div className="flex justify-center gap-4 text-2xl">
          {currentChord.notes.map((note, i) => (
            <span
              key={i}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                playedNotes.has(note)
                  ? 'bg-green-500 text-white scale-110'
                  : 'bg-black/50 text-cyan-400 border border-cyan-500/50'
              }`}
            >
              {note}
            </span>
          ))}
        </div>
        <p className="text-purple-400 text-sm mt-2">
          {playedNotes.size}/{currentChord.notes.length} notes played
        </p>
      </div>

      {/* Fretboard */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <Fretboard
          highlightNotes={currentChord.notes}
          playedNotes={[...playedNotes]}
          showAllPositions={showAllPositions}
        />
      </div>

      <div className="flex justify-center">
        <label className="flex items-center gap-2 text-purple-300 text-sm">
          <input
            type="checkbox"
            checked={showAllPositions}
            onChange={e => setShowAllPositions(e.target.checked)}
            className="w-4 h-4"
          />
          Show all positions
        </label>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-purple-500 text-xs">
        {midiAccess ? '🎸 MIDI connected! Play on your bass.' : 
         'No MIDI detected. Use keyboard: A=C, W=C#, S=D, E=D#, D=E, F=F, T=F#, G=G, Y=G#, H=A, U=A#, J=B'}
      </p>
    </div>
  );
}

// ============ CIRCLE OF 4THS GAME ============

interface CircleOf4thsGameProps {
  onBack: () => void;
}

function CircleOf4thsGame({ onBack }: CircleOf4thsGameProps) {
  const [rootNote, setRootNote] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playedCorrect, setPlayedCorrect] = useState(false);
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(true);

  // Build the circle starting from selected root
  const getCircleFromRoot = (root: string) => {
    const startIdx = CIRCLE_OF_FOURTHS.indexOf(root);
    if (startIdx === -1) {
      // Handle sharps by finding equivalent flat
      const flatIdx = getNoteIndex(root);
      const flatName = FLAT_NAMES[flatIdx];
      const idx = CIRCLE_OF_FOURTHS.indexOf(flatName);
      return [...CIRCLE_OF_FOURTHS.slice(idx), ...CIRCLE_OF_FOURTHS.slice(0, idx)];
    }
    return [...CIRCLE_OF_FOURTHS.slice(startIdx), ...CIRCLE_OF_FOURTHS.slice(0, startIdx)];
  };

  const circle = rootNote ? getCircleFromRoot(rootNote) : [];
  const currentNote = circle[currentIndex];

  // MIDI setup
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(access => {
        setMidiAccess(access);
        
        const handleMIDIMessage = (event: MIDIMessageEvent) => {
          const [status, note] = event.data as Uint8Array;
          if ((status & 0xf0) === 0x90 && event.data[2] > 0) {
            const noteName = getNoteName(note);
            // Check if played note matches (accounting for enharmonics)
            const currentNoteIdx = getNoteIndex(currentNote);
            const playedNoteIdx = getNoteIndex(noteName);
            
            if (currentNoteIdx === playedNoteIdx) {
              setPlayedCorrect(true);
            }
          }
        };
        
        access.inputs.forEach(input => {
          input.onmidimessage = handleMIDIMessage;
        });
        
        access.onstatechange = () => {
          access.inputs.forEach(input => {
            input.onmidimessage = handleMIDIMessage;
          });
        };
      }).catch(console.error);
    }
  }, [currentNote]);

  // Progress when note is correct
  useEffect(() => {
    if (playedCorrect) {
      setTimeout(() => {
        if (currentIndex < 11) {
          setCurrentIndex(i => i + 1);
          setPlayedCorrect(false);
        } else {
          setCompleted(true);
        }
      }, 400);
    }
  }, [playedCorrect, currentIndex]);

  // Keyboard fallback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
        'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
        'u': 'A#', 'j': 'B'
      };
      const played = keyMap[e.key.toLowerCase()];
      if (played) {
        const currentNoteIdx = getNoteIndex(currentNote);
        const playedNoteIdx = getNoteIndex(played);
        if (currentNoteIdx === playedNoteIdx) {
          setPlayedCorrect(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNote]);

  const reset = () => {
    setCurrentIndex(0);
    setPlayedCorrect(false);
    setCompleted(false);
  };

  if (!rootNote) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          🔄 CIRCLE OF 4THS
        </h2>
        <p className="text-purple-300">Select a starting note to practice the circle of fourths</p>
        <p className="text-purple-500 text-sm">C → F → Bb → Eb → Ab → Db → Gb → B → E → A → D → G → C</p>
        
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {NOTE_NAMES.map(note => (
            <button
              key={note}
              onClick={() => setRootNote(note)}
              className="px-4 py-3 bg-black/50 border border-purple-500/50 rounded-lg text-xl font-bold text-cyan-400 hover:border-pink-500 hover:bg-pink-500/20 transition-all"
            >
              {note}
            </button>
          ))}
        </div>
        
        <button
          onClick={onBack}
          className="text-purple-400 hover:text-pink-400 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-4xl font-black text-green-400">🎉 FULL CIRCLE!</h2>
        <p className="text-purple-300 text-xl">You completed the circle of 4ths from {rootNote}!</p>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold hover:scale-105 transition-transform"
          >
            Play Again
          </button>
          <button
            onClick={() => { setRootNote(null); reset(); }}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg font-bold hover:scale-105 transition-transform"
          >
            New Start
          </button>
        </div>
        
        <button onClick={onBack} className="text-purple-400 hover:text-pink-400">
          ← Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-purple-400 hover:text-pink-400">
          ← Back
        </button>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          Circle of 4ths
        </h2>
        <button
          onClick={() => { setRootNote(null); reset(); }}
          className="text-purple-400 hover:text-pink-400"
        >
          Change Start
        </button>
      </div>

      {/* Circle visualization */}
      <div className="flex justify-center">
        <svg width="300" height="300" viewBox="-150 -150 300 300">
          {circle.map((note, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x = Math.cos(angle) * 110;
            const y = Math.sin(angle) * 110;
            const isActive = i === currentIndex;
            const isPast = i < currentIndex;
            
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={isActive ? 28 : 22}
                  fill={isPast ? '#22c55e' : isActive ? '#ec4899' : '#1e1b4b'}
                  stroke={isActive ? '#fff' : '#6366f1'}
                  strokeWidth={isActive ? 3 : 1}
                  style={{
                    filter: isActive ? 'drop-shadow(0 0 10px #ec4899)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fill={isPast || isActive ? '#fff' : '#a5b4fc'}
                  fontSize={isActive ? '16' : '14'}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {note}
                </text>
              </g>
            );
          })}
          {/* Center text */}
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fill="#a855f7"
            fontSize="12"
            fontFamily="monospace"
          >
            4ths
          </text>
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fill="#6366f1"
            fontSize="10"
            fontFamily="monospace"
          >
            {currentIndex + 1}/12
          </text>
        </svg>
      </div>

      {/* Current note display */}
      <div className="text-center bg-black/30 rounded-xl p-6 border border-purple-500/30">
        <p className="text-purple-400 text-sm mb-2">Play this note:</p>
        <h3 className={`text-6xl font-black transition-all ${playedCorrect ? 'text-green-400 scale-110' : 'text-white'}`}>
          {currentNote}
        </h3>
        <p className="text-purple-400 text-sm mt-2">
          {currentIndex < 11 ? `Next: ${circle[currentIndex + 1]}` : 'Last one!'}
        </p>
      </div>

      {/* Fretboard */}
      <div className="flex justify-center overflow-x-auto pb-2">
        <Fretboard
          highlightNotes={[currentNote]}
          playedNotes={playedCorrect ? [currentNote] : []}
          showAllPositions={showAllPositions}
        />
      </div>

      <div className="flex justify-center">
        <label className="flex items-center gap-2 text-purple-300 text-sm">
          <input
            type="checkbox"
            checked={showAllPositions}
            onChange={e => setShowAllPositions(e.target.checked)}
            className="w-4 h-4"
          />
          Show all positions
        </label>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-purple-500 text-xs">
        {midiAccess ? '🎸 MIDI connected! Play on your bass.' : 
         'No MIDI detected. Use keyboard: A=C, W=C#, S=D, E=D#, D=E, F=F, T=F#, G=G, Y=G#, H=A, U=A#, J=B'}
      </p>
    </div>
  );
}

// ============ ARCADE GAME (original) ============

interface ArcadeGameProps {
  onBack: () => void;
}

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

function ArcadeGame({ onBack }: ArcadeGameProps) {
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

  useEffect(() => {
    const img = new Image();
    img.src = '/bass-icon.webp';
    img.onload = () => { bassImageRef.current = img; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key === 'ArrowUp') e.preventDefault();
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

  const handleTouchEnd = useCallback(() => { touchRef.current.active = false; }, []);

  const spawnEnemy = useCallback(() => {
    const types: Array<'quarter' | 'eighth' | 'sixteenth'> = ['quarter', 'eighth', 'sixteenth'];
    const type = types[Math.floor(Math.random() * types.length)];
    const health = type === 'quarter' ? 3 : type === 'eighth' ? 2 : 1;
    const speed = (type === 'sixteenth' ? 3 : type === 'eighth' ? 2 : 1.5) + wave * 0.2;
    enemiesRef.current.push({
      id: idCounterRef.current++,
      x: 50 + Math.random() * 700,
      y: -40,
      type, speed, health, angle: 0,
    });
  }, [wave]);

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      particlesRef.current.push({
        id: idCounterRef.current++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30, color,
      });
    }
  }, []);

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
      
      const moveSpeed = 6;
      if (keysRef.current.has('arrowleft') || keysRef.current.has('a')) {
        player.x = Math.max(player.width / 2, player.x - moveSpeed);
      }
      if (keysRef.current.has('arrowright') || keysRef.current.has('d')) {
        player.x = Math.min(canvas.width - player.width / 2, player.x + moveSpeed);
      }
      
      if (touchRef.current.active) {
        const targetX = touchRef.current.x;
        const diff = targetX - player.x;
        player.x += diff * 0.15;
        player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
      }
      
      const shouldFire = keysRef.current.has(' ') || keysRef.current.has('arrowup') || touchRef.current.active;
      if (shouldFire && now - lastShotRef.current > settings.fireRate) {
        laserRef.current.push({
          id: idCounterRef.current++,
          x: player.x,
          y: player.y - player.height / 2,
          speed: 12,
        });
        lastShotRef.current = now;
      }
      
      if (now - lastSpawnRef.current > settings.spawnRate) {
        spawnEnemy();
        lastSpawnRef.current = now;
      }
      
      laserRef.current = laserRef.current.filter(laser => {
        laser.y -= laser.speed;
        return laser.y > -20;
      });
      
      let scoreGain = 0;
      enemiesRef.current = enemiesRef.current.filter(enemy => {
        enemy.y += enemy.speed;
        enemy.angle += 0.05;
        
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
        
        if (enemy.y > canvas.height + 50) return false;
        return true;
      });
      
      if (scoreGain > 0) setScore(s => s + scoreGain);
      
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });
      
      if (enemiesRef.current.length === 0 && now - lastSpawnRef.current > 2000) {
        setWave(w => w + 1);
      }
      
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0020');
      gradient.addColorStop(0.5, '#1a0040');
      gradient.addColorStop(1, '#0a0020');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 50; i++) {
        const sx = (i * 137.5 + now * 0.01) % canvas.width;
        const sy = (i * 91.3 + now * 0.02) % canvas.height;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      laserRef.current.forEach(laser => {
        const laserGradient = ctx.createLinearGradient(laser.x, laser.y - 20, laser.x, laser.y + 10);
        laserGradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
        laserGradient.addColorStop(0.3, '#ff00ff');
        laserGradient.addColorStop(0.7, '#ff88ff');
        laserGradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
        ctx.fillStyle = laserGradient;
        ctx.fillRect(laser.x - 3, laser.y - 20, 6, 30);
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(laser.x - 2, laser.y - 15, 4, 20);
        ctx.shadowBlur = 0;
      });
      
      enemiesRef.current.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(Math.sin(enemy.angle) * 0.2);
        const baseColors = { quarter: '#ff00ff', eighth: '#00ffff', sixteenth: '#ffff00' };
        ctx.fillStyle = baseColors[enemy.type];
        ctx.font = `bold ${enemy.type === 'quarter' ? 50 : enemy.type === 'eighth' ? 40 : 35}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = baseColors[enemy.type];
        ctx.shadowBlur = 20;
        const noteSymbols = { quarter: '♩', eighth: '♪', sixteenth: '♬' };
        ctx.fillText(noteSymbols[enemy.type], 0, 0);
        ctx.shadowBlur = 0;
        if (enemy.health > 1) {
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(enemy.health.toString(), 0, -30);
        }
        ctx.restore();
      });
      
      particlesRef.current.forEach(p => {
        const alpha = p.life / 30;
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.save();
      ctx.translate(player.x, player.y);
      if (bassImageRef.current) {
        const imgWidth = player.width;
        const imgHeight = player.height;
        ctx.drawImage(bassImageRef.current, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(bassImageRef.current, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BASS', 0, 0);
      }
      ctx.restore();
      
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-purple-400 hover:text-pink-400">← Back</button>
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
          BASS INVADERS
        </h2>
        <div className="text-sm text-purple-400">HI: {highScore}</div>
      </div>

      {gameState === 'menu' && (
        <div className="text-center space-y-4">
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
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl text-xl font-black hover:scale-105 transition-transform shadow-lg shadow-pink-500/50"
          >
            🎸 START
          </button>
          <div className="text-left bg-black/30 border border-cyan-500/30 rounded-xl p-4 max-w-md mx-auto text-xs">
            <h3 className="text-cyan-400 font-bold mb-2">CONTROLS</h3>
            <ul className="space-y-1 text-purple-200">
              <li>• ←/→ or A/D to move</li>
              <li>• SPACE or ↑ to fire</li>
              <li>• Touch and drag on mobile</li>
            </ul>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full rounded-xl border-2 border-purple-500 shadow-lg shadow-purple-500/30 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      )}

      {gameState === 'gameover' && (
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-black text-red-500">GAME OVER</h2>
          <p className="text-2xl text-cyan-400">SCORE: {score}</p>
          <p className="text-lg text-purple-300">WAVE: {wave}</p>
          {score >= highScore && score > 0 && (
            <p className="text-lg text-yellow-400 animate-pulse">★ NEW HIGH SCORE! ★</p>
          )}
          <button
            onClick={startGame}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl text-lg font-black hover:scale-105 transition-transform"
          >
            🎸 PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============

type GameMode = 'menu' | 'arcade' | 'modes' | 'circle4ths';

function BassGame() {
  const [gameMode, setGameMode] = useState<GameMode>('menu');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0020] to-[#1a0040] text-white font-mono">
      <header className="py-3 border-b border-purple-500/30">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center">
          <a href="/" className="text-purple-400 hover:text-purple-300 text-sm">← Hub</a>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">
            🎸 BASS PRACTICE
          </h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {gameMode === 'menu' && (
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
                BASS PRACTICE
              </h2>
              <p className="text-purple-300">Choose your training mode</p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
              <button
                onClick={() => setGameMode('modes')}
                className="p-6 bg-black/30 border-2 border-cyan-500/50 rounded-xl text-left hover:border-cyan-400 hover:bg-cyan-500/10 transition-all group"
              >
                <h3 className="text-2xl font-black text-cyan-400 group-hover:text-cyan-300">🎵 MODES</h3>
                <p className="text-purple-300 text-sm mt-1">Practice 7 diatonic chord triads in any key</p>
                <p className="text-purple-500 text-xs mt-2">D: Dmaj → Emin → F#min → Gmaj → Amaj → Bmin → C#dim</p>
              </button>

              <button
                onClick={() => setGameMode('circle4ths')}
                className="p-6 bg-black/30 border-2 border-pink-500/50 rounded-xl text-left hover:border-pink-400 hover:bg-pink-500/10 transition-all group"
              >
                <h3 className="text-2xl font-black text-pink-400 group-hover:text-pink-300">🔄 CIRCLE OF 4THS</h3>
                <p className="text-purple-300 text-sm mt-1">Navigate the circle of fourths at your own pace</p>
                <p className="text-purple-500 text-xs mt-2">C → F → Bb → Eb → Ab → Db → Gb → B → E → A → D → G</p>
              </button>

              <button
                onClick={() => setGameMode('arcade')}
                className="p-6 bg-black/30 border-2 border-orange-500/50 rounded-xl text-left hover:border-orange-400 hover:bg-orange-500/10 transition-all group"
              >
                <h3 className="text-2xl font-black text-orange-400 group-hover:text-orange-300">👾 BASS INVADERS</h3>
                <p className="text-purple-300 text-sm mt-1">Arcade shooter - destroy the rogue notes!</p>
                <p className="text-purple-500 text-xs mt-2">Use arrow keys or touch to play</p>
              </button>
            </div>

            <div className="text-purple-500 text-sm">
              <p>🎸 Connect your bass via MIDI for the best experience</p>
              <p>⌨️ Keyboard fallback available for testing</p>
            </div>
          </div>
        )}

        {gameMode === 'arcade' && <ArcadeGame onBack={() => setGameMode('menu')} />}
        {gameMode === 'modes' && <ModesGame onBack={() => setGameMode('menu')} />}
        {gameMode === 'circle4ths' && <CircleOf4thsGame onBack={() => setGameMode('menu')} />}
      </main>
    </div>
  );
}
