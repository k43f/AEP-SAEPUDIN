import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Users, 
  Clock, 
  Volume2, 
  VolumeX,
  Trophy,
  LayoutGrid,
  ChevronRight,
  Plus,
  Minus,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTimer } from './hooks/useTimer';
import { useSound } from './hooks/useSound';

interface QuestionSection {
  id: string;
  name: string;
  count: number;
}

interface QuestionInstance {
  sectionId: string;
  sectionName: string;
  localIdx: number;
  targetTeamLabel?: string;
  isRebutan: boolean;
}

interface Team {
  id: string;
  name: string;
  questionScores: number[];
  color: string;
  label: string;
}

const TEAM_PALETTES = [
  { label: 'A', color: '#ef4444' }, // Red
  { label: 'B', color: '#3b82f6' }, // Blue
  { label: 'C', color: '#10b981' }, // Green
  { label: 'D', color: '#f59e0b' }, // Amber
  { label: 'E', color: '#8b5cf6' }, // Purple
  { label: 'F', color: '#ec4899' }, // Pink
  { label: 'G', color: '#06b6d4' }, // Cyan
  { label: 'H', color: '#f97316' }, // Orange
];

const DEFAULT_SECTIONS: QuestionSection[] = [
  { id: 's1', name: 'Soal Wajib', count: 10 },
  { id: 's2', name: 'Soal Wajib-Lempar', count: 10 },
  { id: 's3', name: 'Soal Rebutan', count: 10 },
];

const DEFAULT_TEAMS: Team[] = [
  { id: '1', name: '', questionScores: [], color: '#ef4444', label: 'A' }, // Red
  { id: '2', name: '', questionScores: [], color: '#3b82f6', label: 'B' }, // Blue
  { id: '3', name: '', questionScores: [], color: '#10b981', label: 'C' }, // Green
  { id: '4', name: '', questionScores: [], color: '#f59e0b', label: 'D' }, // Amber
];

const TIME_PRESETS = [
  { label: '10s', value: 10 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '5m', value: 300 },
];

export default function App() {
  const [sections, setSections] = useState<QuestionSection[]>(() => {
    const saved = localStorage.getItem('quiz-sections-v7');
    return saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
  });

  const getQuestionInstances = useCallback((currentSections: QuestionSection[], teamLabels: string[]): QuestionInstance[] => {
    const instances: QuestionInstance[] = [];

    // Separate team-specific sections (e.g. Wajib, Wajib-Lempar) from shared sections (e.g. Rebutan)
    const teamSections = currentSections.filter(s => !s.name.toLowerCase().includes('rebutan'));
    const sharedSections = currentSections.filter(s => s.name.toLowerCase().includes('rebutan'));

    // Group rows per team: Regu A (Wajib, Wajib-Lempar), Regu B (Wajib, Wajib-Lempar), etc.
    teamLabels.forEach(teamLabel => {
      teamSections.forEach(s => {
        for (let i = 1; i <= s.count; i++) {
          instances.push({
            sectionId: s.id,
            sectionName: s.name,
            localIdx: i,
            targetTeamLabel: teamLabel,
            isRebutan: false
          });
        }
      });
    });

    // Shared sections (e.g. Soal Rebutan) remain shared at the end
    sharedSections.forEach(s => {
      for (let i = 1; i <= s.count; i++) {
        instances.push({
          sectionId: s.id,
          sectionName: s.name,
          localIdx: i,
          isRebutan: true
        });
      }
    });

    return instances;
  }, []);

  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('quiz-teams-v8') || localStorage.getItem('quiz-teams-v7');
    const initialTeams: Team[] = saved ? JSON.parse(saved) : DEFAULT_TEAMS;
    
    const savedSections = localStorage.getItem('quiz-sections-v7');
    const currentSections = savedSections ? JSON.parse(savedSections) : DEFAULT_SECTIONS;
    const teamLabels = initialTeams.map(t => t.label);
    const instances = getQuestionInstances(currentSections, teamLabels);
    const totalQuestions = instances.length;
      
    return initialTeams.map((t: Team) => ({
      ...t,
      questionScores: t.questionScores.length === totalQuestions 
        ? t.questionScores 
        : Array(totalQuestions).fill(0)
    }));
  });

  const [roundCount, setRoundCount] = useState<number>(() => {
    const saved = localStorage.getItem('quiz-round-count');
    return saved ? Math.max(1, Math.min(10, parseInt(saved, 10) || 4)) : 4;
  });

  const roundsList = [
    ...Array.from({ length: roundCount }, (_, i) => `Babak ${i + 1}`),
    'Final'
  ];

  const [round, setRound] = useState(() => {
    const saved = localStorage.getItem('quiz-current-round');
    return saved || 'Babak 1';
  });

  useEffect(() => {
    localStorage.setItem('quiz-round-count', roundCount.toString());
  }, [roundCount]);

  useEffect(() => {
    localStorage.setItem('quiz-current-round', round);
  }, [round]);

  useEffect(() => {
    if (!roundsList.includes(round)) {
      setRound(roundsList[0] || 'Babak 1');
    }
  }, [roundsList, round]);

  const [eventName, setEventName] = useState(() => localStorage.getItem('quiz-event-name') || 'LOMBA CERDAS CERMAT');
  const [eventLevel, setEventLevel] = useState(() => localStorage.getItem('quiz-event-level') || 'Rayon 1');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('quiz-theme');
    return saved === 'light' ? false : true;
  });

  useEffect(() => {
    localStorage.setItem('quiz-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('quiz-event-name', eventName);
  }, [eventName]);

  useEffect(() => {
    localStorage.setItem('quiz-event-level', eventLevel);
  }, [eventLevel]);

  const [selectedDuration, setSelectedDuration] = useState(20);
  const [showSettings, setShowSettings] = useState(false);

  const { playBeep, playWarning, playGong } = useSound();

  const onFinish = useCallback(() => {
    if (soundEnabled) playGong();
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, [soundEnabled, playGong]);

  const onTick = useCallback((remaining: number) => {
    if (soundEnabled && remaining <= 5 && remaining > 0) {
      playWarning();
    }
  }, [soundEnabled, playWarning]);

  const { timeLeft, isActive, toggle, reset, formatTime } = useTimer(onFinish, onTick);

  const theme = {
    bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
    card: isDarkMode ? 'bg-slate-900' : 'bg-white',
    cardInner: isDarkMode ? 'bg-slate-950' : 'bg-slate-100',
    border: isDarkMode ? 'border-slate-800' : 'border-slate-200',
    borderLight: isDarkMode ? 'border-slate-800/50' : 'border-slate-200/50',
    text: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    textMuted: isDarkMode ? 'text-slate-500' : 'text-slate-400',
    textDim: isDarkMode ? 'text-slate-400' : 'text-slate-600',
    input: isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900',
    header: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200',
    select: isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200',
  };

  useEffect(() => {
    localStorage.setItem('quiz-teams-v8', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('quiz-sections-v7', JSON.stringify(sections));
    
    // Resize team scores when sections change
    const teamLabels = teams.map(t => t.label);
    const instances = getQuestionInstances(sections, teamLabels);
    const totalQuestions = instances.length;
    
    setTeams(prev => prev.map(t => {
      if (t.questionScores.length === totalQuestions) return t;
      const newScores = Array(totalQuestions).fill(0);
      // Copy existing scores where possible
      t.questionScores.forEach((score, i) => {
        if (i < totalQuestions) newScores[i] = score;
      });
      return { ...t, questionScores: newScores };
    }));
  }, [sections, getQuestionInstances, teams.length]);

  const handleTeamCountChange = (newCount: number) => {
    if (newCount < 2 || newCount > 8 || newCount === teams.length) return;

    const targetLabels = Array.from({ length: newCount }, (_, i) => 
      TEAM_PALETTES[i]?.label || String.fromCharCode(65 + i)
    );

    const newInstances = getQuestionInstances(sections, targetLabels);
    const totalQuestions = newInstances.length;

    setTeams(prev => {
      let updatedTeams: Team[] = [];
      if (newCount > prev.length) {
        updatedTeams = [...prev];
        for (let i = prev.length; i < newCount; i++) {
          const palette = TEAM_PALETTES[i] || {
            label: String.fromCharCode(65 + i),
            color: '#64748b'
          };
          updatedTeams.push({
            id: (i + 1).toString(),
            name: '',
            questionScores: Array(totalQuestions).fill(0),
            color: palette.color,
            label: palette.label,
          });
        }
      } else {
        updatedTeams = prev.slice(0, newCount);
      }

      return updatedTeams.map(t => {
        const newScores = Array(totalQuestions).fill(0);
        t.questionScores.forEach((score, idx) => {
          if (idx < totalQuestions) newScores[idx] = score;
        });
        return { ...t, questionScores: newScores };
      });
    });
  };

  const handleQuestionScoreChange = (teamId: string, qIdx: number, val: number) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const newScores = [...t.questionScores];
        newScores[qIdx] = val;
        return { ...t, questionScores: newScores };
      }
      return t;
    }));
  };

  const handleNameChange = (id: string, newName: string) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  const [confirmType, setConfirmType] = useState<'scores' | 'data' | null>(null);

  const teamLabels = teams.map(t => t.label);
  const questionInstances = getQuestionInstances(sections, teamLabels);

  const handleResetOnlyScores = () => {
    const totalQuestions = questionInstances.length;
    setTeams(prev => prev.map(team => ({
      ...team,
      questionScores: Array(totalQuestions).fill(0)
    })));
    setConfirmType(null);
  };

  const handleResetScores = () => {
    const totalQuestions = questionInstances.length;
    setTeams(prev => prev.map(team => ({ 
      ...team, 
      name: '',
      questionScores: Array(totalQuestions).fill(0) 
    })));
    setRound('Babak 1');
    reset(selectedDuration);
    setConfirmType(null);
  };

  const calculateTotal = (team: Team) => team.questionScores.reduce((a, b) => a + b, 0);
  const highestScore = Math.max(...teams.map(calculateTotal));
  const winners = teams.filter(t => calculateTotal(t) === highestScore && highestScore > 0);

  const addSection = () => {
    setSections([...sections, { id: Math.random().toString(36).substr(2, 9), name: 'Bagian Baru', count: 5 }]);
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const updateSection = (id: string, field: keyof QuestionSection, value: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('id-ID');
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(eventName.toUpperCase(), 105, 14, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(eventLevel.toUpperCase(), 105, 20, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${round} | Dicetak pada: ${timestamp}`, 105, 26, { align: 'center' });

    // Calculate Rankings for Keterangan column
    const sortedUniqueScores = Array.from(new Set<number>(teams.map(t => calculateTotal(t)))).sort((a, b) => b - a);
    const getKeterangan = (team: Team) => {
      const score = calculateTotal(team);
      const rankIndex = sortedUniqueScores.indexOf(score);
      if (rankIndex >= 0) {
        return `Juara ${rankIndex + 1}`;
      }
      return '-';
    };

    // Summary Table sorted by rank / score descending
    const sortedTeamsForSummary = [...teams].sort((a, b) => calculateTotal(b) - calculateTotal(a));
    const summaryData = sortedTeamsForSummary.map((t, idx) => [
      (idx + 1).toString(),
      `Regu ${t.label}`,
      t.name ? t.name.toUpperCase() : 'TANPA NAMA',
      calculateTotal(t).toString(),
      getKeterangan(t)
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Peringkat', 'Regu', 'Nama Sekolah / Peserta', 'Total Skor', 'Keterangan']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        2: { halign: 'left' },
        3: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
      },
      styles: { fontSize: 9 }
    });

    // Detailed Scores Table
    const detailedData = questionInstances.map((inst, i) => [
      (i + 1).toString(),
      inst.targetTeamLabel ? `${inst.sectionName} Regu ${inst.targetTeamLabel}` : inst.sectionName,
      `Soal ${inst.localIdx}`,
      ...teams.map(t => t.questionScores[i]?.toString() || '0')
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [['No', 'Bagian', 'Item', ...teams.map(t => `Regu ${t.label}`)]],
      body: detailedData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 45 },
        2: { cellWidth: 25 },
      }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.text('Mengetahui,', 145, finalY);
    doc.text('Panitia Lomba', 145, finalY + 18);

    // Format segments for filename: Hasil_LCC_Rayon1_Babak1.pdf
    const sanitizeWord = (word: string) => {
      const clean = word.trim().toLowerCase();
      if (!clean) return '';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    };

    const getEventCode = (name: string) => {
      const clean = name.trim();
      if (!clean) return 'LCC';
      if (/lomba\s+cerdas\s+cermat/i.test(clean) || /cerdas\s+cermat/i.test(clean)) return 'LCC';
      const words = clean.split(/\s+/);
      if (words.length === 1 && clean.length <= 8) {
        return clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      }
      if (clean.length > 15) {
        return words.map(w => w[0]?.toUpperCase() || '').join('');
      }
      return words.map(sanitizeWord).join('').replace(/[^a-zA-Z0-9]/g, '');
    };

    const cleanRayonPart = (level: string) => {
      const clean = level.trim();
      if (!clean) return 'Rayon1';
      
      // Match pattern like "Rayon 3", "TINGKAT RAYON 3", "Rayon 1A", "Rayon Barat"
      const rayonMatch = clean.match(/rayon\s*([a-zA-Z0-9]+)/i);
      if (rayonMatch) {
        const numOrName = sanitizeWord(rayonMatch[1]);
        return `Rayon${numOrName}`;
      }

      // Filter out redundant prefix words like "tingkat"
      const words = clean
        .split(/[\s\-_/]+/)
        .filter(w => !/^tingkat$/i.test(w) || clean.split(/\s+/).length === 1);
      
      return words.map(sanitizeWord).join('').replace(/[^a-zA-Z0-9]/g, '') || 'Rayon1';
    };

    const cleanRoundPart = (rnd: string) => {
      const clean = rnd.trim();
      if (!clean) return 'Babak1';
      const babakMatch = clean.match(/babak\s*([a-zA-Z0-9]+)/i);
      if (babakMatch) {
        const numOrName = sanitizeWord(babakMatch[1]);
        return `Babak${numOrName}`;
      }
      if (/final/i.test(clean)) return 'Final';
      return clean
        .split(/[\s\-_/]+/)
        .map(sanitizeWord)
        .join('')
        .replace(/[^a-zA-Z0-9]/g, '');
    };

    const eventPart = getEventCode(eventName || 'LCC');
    const rayonPart = cleanRayonPart(eventLevel || 'Rayon1');
    const babakPart = cleanRoundPart(round || 'Babak1');
    doc.save(`Hasil_${eventPart}_${rayonPart}_${babakPart}.pdf`);
  };

  return (
    <div className={`h-screen ${theme.bg} ${theme.text} font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col transition-colors duration-300`}>
      {/* Header */}
      <header className={`${theme.header} border-b shrink-0 transition-colors`}>
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between px-6 py-2 h-14">
          <div className="flex items-center gap-3 shrink-0">
            <Trophy className="text-blue-500" size={18} />
            <div className="flex flex-col">
              <h1 className={`text-sm font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-tighter leading-tight`}>
                QuizMaster Pro <span className={isDarkMode ? 'text-slate-600' : 'text-slate-400'}>v7.0</span>
              </h1>
              <span className={`text-[9px] font-black ${theme.textMuted} uppercase tracking-widest leading-tight`}>created by Aep Sepudin, M.Pd</span>
              <span className={`text-[8px] font-bold ${isDarkMode ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-tight leading-tight`}>WA 0895326931483 • fisika77@gmail.com</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-8 overflow-hidden">
            <div className="bg-blue-500/5 px-6 py-1 rounded-full border border-blue-500/10">
              <span className="text-xs font-black text-blue-500 uppercase tracking-[0.2em] truncate block max-w-md">
                {eventName} • {eventLevel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="relative">
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={`${theme.select} text-blue-500 text-xs font-black px-4 py-1.5 rounded-xl appearance-none cursor-pointer hover:border-blue-500/50 transition-all focus:outline-none focus:ring-1 focus:ring-blue-500/50 pr-8 uppercase tracking-widest`}
              >
                {roundsList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-600 text-white' : `${isDarkMode ? 'text-slate-600' : 'text-slate-400'} hover:text-blue-500`}`}
              >
                <Settings size={18} />
              </button>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`${isDarkMode ? 'text-slate-600' : 'text-slate-400'} hover:text-blue-500 transition-colors`}>
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center gap-1 text-[10px] font-black text-green-500 hover:text-green-400 border border-green-500/30 px-3 py-1 rounded-lg transition-all"
              >
                <Download size={14} /> PDF
              </button>
              <div className="flex items-center gap-2">
                {confirmType === 'scores' ? (
                  <button 
                    onClick={handleResetOnlyScores}
                    className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded animate-pulse"
                  >
                    YAKIN RESET SKOR?
                  </button>
                ) : confirmType === 'data' ? (
                  <button 
                    onClick={handleResetScores}
                    className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded animate-pulse"
                  >
                    HAPUS SEMUA DATA?
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setConfirmType('scores')} 
                      className="text-[9px] font-black text-amber-500/50 hover:text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded"
                    >
                      RESET SKOR
                    </button>
                    <button 
                      onClick={() => setConfirmType('data')}
                      className="text-[9px] font-black text-red-500/50 hover:text-red-500 py-0.5 px-2 border border-red-500/10 rounded"
                    >
                      RESET DATA
                    </button>
                  </>
                )}
                {confirmType && (
                  <button onClick={() => setConfirmType(null)} className="text-[9px] font-black text-slate-500 hover:text-white">
                    BATAL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col px-4 pb-4 pt-0 gap-1.5 relative">
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`absolute top-4 right-4 bottom-4 w-80 ${theme.card} border ${theme.border} rounded-3xl shadow-2xl z-40 p-6 flex flex-col gap-6`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Settings size={18} className="text-blue-500" />
                  Pengaturan
                </h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tema Tampilan</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsDarkMode(true)}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                          isDarkMode 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="w-full h-8 bg-slate-950 border border-slate-800 rounded-md" />
                        <span className="text-[9px] font-black uppercase">Dark</span>
                      </button>
                      <button
                        onClick={() => setIsDarkMode(false)}
                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                          !isDarkMode 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="w-full h-8 bg-slate-100 border border-slate-200 rounded-md" />
                        <span className="text-[9px] font-black uppercase">Normal</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Users size={12} className="text-blue-400" />
                        Jumlah Regu / Peserta
                      </span>
                      <span className="text-xs font-black text-blue-400 font-mono">{teams.length} REGU</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[2, 3, 4, 5, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => handleTeamCountChange(num)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all ${
                            teams.length === num
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Pilihan Kustom (2 - 8 Regu):</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTeamCountChange(Math.max(2, teams.length - 1))}
                          disabled={teams.length <= 2}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono font-black text-white text-xs">{teams.length}</span>
                        <button
                          onClick={() => handleTeamCountChange(Math.min(8, teams.length + 1))}
                          disabled={teams.length >= 8}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={12} className="text-amber-400" />
                        Banyak Babak
                      </span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        {roundCount} BABAK + FINAL
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => setRoundCount(num)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black border transition-all ${
                            roundCount === num
                              ? 'bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Pilihan Kustom (1 - 10 Babak):</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRoundCount(Math.max(1, roundCount - 1))}
                          disabled={roundCount <= 1}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-mono font-black text-white text-xs">{roundCount}</span>
                        <button
                          onClick={() => setRoundCount(Math.min(10, roundCount + 1))}
                          disabled={roundCount >= 10}
                          className="w-6 h-6 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center disabled:opacity-30 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span className="text-[8px] font-medium text-slate-400 italic">
                      * Babak Final tetap otomatis disertakan di akhir pilihan dropdown.
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identitas Kegiatan</span>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <label className={`text-[8px] font-black ${theme.textMuted} uppercase mb-1`}>Nama Kegiatan</label>
                        <input
                          type="text"
                          value={eventName}
                          onChange={(e) => setEventName(e.target.value)}
                          className={`${theme.input} rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500`}
                          placeholder="Lomba LCC..."
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className={`text-[8px] font-black ${theme.textMuted} uppercase mb-1`}>Tingkat / Rayon</label>
                        <input
                          type="text"
                          value={eventLevel}
                          onChange={(e) => setEventLevel(e.target.value)}
                          className={`${theme.input} rounded-lg p-2 text-xs font-bold outline-none focus:border-blue-500`}
                          placeholder="Contoh: Rayon 1 / Rayon 2 / Kabupaten..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>Bagian Soal</span>
                    <button 
                      onClick={addSection}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-md transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {sections.map((s, idx) => (
                      <div key={s.id} className={`${theme.cardInner} p-3 rounded-xl border ${theme.border} space-y-2`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black ${theme.textMuted}`}>#{idx + 1}</span>
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => updateSection(s.id, 'name', e.target.value)}
                            className={`flex-1 bg-transparent text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} outline-none border-b ${theme.border} focus:border-blue-500`}
                            placeholder="Nama Bagian..."
                          />
                          <button onClick={() => removeSection(s.id)} className={`${theme.textMuted} hover:text-red-500`}>
                            <Minus size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className={`text-[10px] ${theme.textMuted} font-bold uppercase`}>Jumlah Soal</span>
                          <input
                            type="number"
                            min="1"
                            value={s.count}
                            onChange={(e) => updateSection(s.id, 'count', parseInt(e.target.value) || 1)}
                            className={`w-16 ${isDarkMode ? 'bg-slate-900' : 'bg-white'} border ${theme.border} rounded px-2 py-1 text-xs font-bold text-center ${isDarkMode ? 'text-white' : 'text-slate-900'} outline-none`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unit Timer Central & Config */}
        <div className="flex justify-center gap-4 shrink-0">
          <div className={`${theme.card} border ${theme.border} rounded-3xl py-1 px-4 flex flex-col items-center justify-center gap-1 shadow-2xl min-w-[380px] min-h-[100px]`}>
            <div className="flex items-center gap-6 w-full justify-center">
              <div className={`text-7xl font-black font-mono leading-none tracking-tighter tabular-nums ${
                timeLeft <= 5 && timeLeft > 0 ? 'text-red-500 animate-pulse' : (isDarkMode ? 'text-white' : 'text-slate-900')
              }`}>
                {formatTime(timeLeft)}
              </div>

              <div className="flex flex-col gap-3">
                <div className={`flex gap-2 ${theme.cardInner} p-1 rounded-xl border ${theme.border}`}>
                  {TIME_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => { setSelectedDuration(preset.value); reset(preset.value); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                        selectedDuration === preset.value && !isActive
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : `${theme.card} ${theme.border} ${theme.textMuted} hover:text-blue-500`
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={toggle}
                    className={`flex-1 py-1.5 rounded-xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-amber-500 text-white' : 'bg-green-600 text-white shadow-lg shadow-green-500/20'
                    }`}
                  >
                    {isActive ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button
                    onClick={() => reset(selectedDuration)}
                    className={`ml-2 w-10 py-1.5 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'} rounded-xl flex items-center justify-center border ${theme.border}`}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`${theme.card} border ${theme.border} rounded-3xl py-1 px-4 flex flex-col gap-1 shadow-2xl min-w-[480px]`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-[10px] font-black ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}>
                <LayoutGrid size={12} className="text-blue-500" />
                Setting Soal
              </h3>
              <div className="flex items-center gap-3">
                <div className="text-[9px] font-black text-blue-500/50">
                  TOTAL: {questionInstances.length}
                </div>
                <button 
                  onClick={addSection}
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 p-1 rounded-md transition-all"
                  title="Tambah Bagian"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>

            <div className="flex flex-row items-center gap-3 overflow-x-auto custom-scrollbar pb-1">
              {sections.map(s => {
                const nameLower = s.name.toLowerCase();
                const isRebutan = nameLower.includes('rebutan');
                const isLempar = nameLower.includes('lempar');
                const isWajib = nameLower.includes('wajib') && !isLempar;

                const label = isWajib ? 'WAJIB' : isLempar ? 'WAJIB-LEMPAR' : isRebutan ? 'REBUTAN' : 'BAGIAN';
                const labelColor = isWajib ? 'text-blue-500/60' : isLempar ? 'text-amber-500/60' : isRebutan ? 'text-purple-500/60' : 'text-slate-500/60';
                return (
                  <div key={s.id} className={`flex items-center gap-3 ${theme.cardInner} p-2 rounded-2xl border ${theme.borderLight} shrink-0`}>
                    <div className="flex flex-col">
                      <span className={`text-[8px] font-black tracking-widest ${labelColor}`}>{label}</span>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateSection(s.id, 'name', e.target.value)}
                        className={`bg-transparent text-[10px] font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'} outline-none w-24 border-b border-transparent focus:border-slate-300`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={s.count}
                        onChange={(e) => updateSection(s.id, 'count', parseInt(e.target.value) || 1)}
                        className={`w-10 ${isDarkMode ? 'bg-slate-900' : 'bg-white'} border ${theme.border} rounded-lg py-1 text-xs font-black text-blue-400 outline-none text-center`}
                      />
                      <button onClick={() => removeSection(s.id)} className={`${isDarkMode ? 'text-slate-800' : 'text-slate-400'} hover:text-red-500 transition-colors`}>
                        <Minus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ScoreBoard Summary Header */}
        <div 
          className="grid gap-3 px-4 pt-3.5 pb-1 overflow-x-auto custom-scrollbar shrink-0 relative z-10"
          style={{ 
            gridTemplateColumns: `repeat(${teams.length}, minmax(${teams.length > 5 ? '160px' : '190px'}, 1fr))` 
          }}
        >
          {teams.map(team => {
            const isWinner = winners.some(w => w.id === team.id);
            
            // Dynamic font sizing based on length
            const nameLength = team.name.length;
            const fontSizeClass = nameLength > 25 ? 'text-xs' : nameLength > 20 ? 'text-sm' : nameLength > 15 ? 'text-base' : 'text-xl';

            return (
              <div key={team.id} className={`relative group ${isWinner ? 'z-20' : 'z-0'}`}>
                <div 
                  className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all shadow-xl h-full min-h-[140px] relative ${isWinner ? 'animate-winner-glow' : ''}`}
                  style={{ 
                    borderColor: isWinner ? team.color : (isDarkMode ? `${team.color}40` : `${team.color}20`),
                    backgroundColor: isDarkMode ? `${team.color}05` : `${team.color}03`,
                    color: team.color // used for currentColor in animation
                  }}
                >
                  <div 
                    className="text-[12px] font-black uppercase tracking-[0.2em] mb-2 px-4 py-1 rounded-full"
                    style={{ backgroundColor: isDarkMode ? `${team.color}20` : `${team.color}10`, color: team.color }}
                  >
                    Regu {team.label}
                  </div>
                  <div className="w-full px-2">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => handleNameChange(team.id, e.target.value)}
                      className={`w-full bg-transparent text-center font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} hover:bg-black/5 rounded-xl p-1 outline-none transition-all placeholder:text-slate-300 uppercase focus:ring-1 ${fontSizeClass}`}
                      style={{ '--tw-ring-color': team.color } as any}
                      placeholder="NAMA SEKOLAH"
                    />
                  </div>
                  <div 
                    className="mt-3 font-mono text-5xl font-black transition-colors drop-shadow-2xl"
                    style={{ color: team.color }}
                  >
                    {calculateTotal(team)}
                  </div>
                  {isWinner && (
                    <div 
                      className="absolute -top-3.5 -right-2 z-30 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 p-2 rounded-full shadow-2xl border-2 border-slate-950 animate-bounce flex items-center justify-center ring-2 ring-yellow-400/60"
                      title="Juara / Skor Tertinggi"
                    >
                      <Trophy size={18} className="fill-slate-950 text-slate-950 drop-shadow" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unified Questions Table */}
        <div className={`flex-1 ${isDarkMode ? 'bg-slate-900/30' : 'bg-white/50'} border ${theme.border} rounded-3xl overflow-hidden flex flex-col shadow-inner`}>
          <div className={`${theme.card} py-2 px-4 border-b ${theme.border} sticky top-0 z-20 overflow-x-auto custom-scrollbar`}>
            <div 
              className="grid gap-3 items-center min-w-[640px]"
              style={{
                gridTemplateColumns: `40px minmax(160px, 1.6fr) repeat(${teams.length}, minmax(70px, 1fr))`
              }}
            >
              <div className={`text-center text-[10px] font-black ${theme.textMuted} uppercase`}>NO</div>
              <div className={`text-[10px] font-black ${theme.textMuted} uppercase`}>BAGIAN / PERTANYAAN</div>
              {teams.map(team => (
                <div key={team.id} className="text-center text-xs font-black uppercase" style={{ color: team.color }}>
                  REGU {team.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar p-2 space-y-1">
            {questionInstances.map((inst, qIdx) => (
              <div 
                key={qIdx} 
                className={`grid gap-3 items-center py-1 px-4 min-w-[640px] ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'} rounded-xl border ${theme.borderLight} hover:border-blue-500/30 transition-colors`}
                style={{
                  gridTemplateColumns: `40px minmax(160px, 1.6fr) repeat(${teams.length}, minmax(70px, 1fr))`
                }}
              >
                <div className={`text-center text-xs font-mono font-bold ${theme.textMuted}`}>{qIdx + 1}</div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest truncate ${
                    inst.sectionName.toLowerCase().includes('rebutan')
                      ? 'text-purple-500/80'
                      : inst.sectionName.toLowerCase().includes('lempar')
                      ? 'text-amber-500/80'
                      : 'text-blue-500/80'
                  }`}>
                    {inst.sectionName} {inst.targetTeamLabel ? `Regu ${inst.targetTeamLabel}` : ''}
                  </span>
                  <span className={`text-[10px] font-bold ${theme.textDim}`}>Pertanyaan {inst.localIdx}</span>
                </div>
                {teams.map(team => (
                  <div key={team.id} className="px-1">
                    <input
                      type="number"
                      value={team.questionScores[qIdx] === 0 ? '' : team.questionScores[qIdx]}
                      onChange={(e) => handleQuestionScoreChange(team.id, qIdx, parseInt(e.target.value) || 0)}
                      className={`w-full border text-center py-1 rounded-lg text-sm font-black font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                        inst.targetTeamLabel === team.label 
                          ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-extrabold' 
                          : `${isDarkMode ? 'bg-slate-950/80 border-slate-800 text-white opacity-40 hover:opacity-100' : 'bg-slate-50 border-slate-200 text-slate-900 opacity-60 hover:opacity-100'}`
                      }`}
                      placeholder="-"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
