import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Calendar, Link as LinkIcon, Settings, Plus, X, ChevronRight, ChevronLeft, Upload, Download, Check, GraduationCap, Layout, AlertTriangle, RefreshCw, RotateCcw} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Semester, Year, Subject, TimetableData, LinkCategory, LinkItem, SubjectPool, Faculty} from './types';
import { YEARS, FACULTIES, ALL_YEAR_SUBJECT_PRESETS } from './data/presets';
import { LINK_PRESETS } from './data/links';

const DAYS = ['月', '火', '水', '木', '金'];
const PERIODS = ['1', '2', '3', '4', '5', '6', '7'];
const PERIOD_TIMES = [
  '9:00~10:35',
  '10:45~12:20',
  '13:10~14:45',
  '14:55~16:30',
  '16:40~18:15',
  '18:25~20:00',
  '20:10~21:45'
];

const getCurrentAcademicYear = (): Year => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  
  // Academic year starts in April
  const academicYear = month < 4 ? year - 1 : year;
  const yearStr = academicYear.toString();
  
  // If the calculated year is in the supported list, use it
  if (YEARS.includes(yearStr as Year)) {
    return yearStr as Year;
  }
  
  // If it's before the supported range, return the first year
  if (academicYear < parseInt(YEARS[0])) {
    return YEARS[0];
  }
  
  // If it's after the supported range, return the last year
  return YEARS[YEARS.length - 1];
};

const getCurrentSemester = (): Semester => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  
  // Spring: April to August
  // Fall: September to March
  if (month >= 4 && month < 9) {
    return 'Spring';
  }
  return 'Fall';
};

const SUBJECT_COLORS = [
  { name: 'Indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', active: 'bg-indigo-600' },
  { name: 'Rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', active: 'bg-rose-600' },
  { name: 'Emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', active: 'bg-emerald-600' },
  { name: 'Amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', active: 'bg-amber-600' },
  { name: 'Sky', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', active: 'bg-sky-600' },
  { name: 'Violet', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', active: 'bg-violet-600' },
  { name: 'Orange', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', active: 'bg-orange-600' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'timetable' | 'links' | 'settings'>('timetable');
  const [isFirstTime, setIsFirstTime] = useState(() => {
    return !localStorage.getItem('hasCompletedSetup');
  });
  const [setupMode, setSetupMode] = useState<'choice' | 'manual' | 'import'>('choice');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [year, setYear] = useState<Year>(() => {
    const saved = localStorage.getItem('year');
    if (saved) return saved as Year;
    return getCurrentAcademicYear();
  });
  const [semester, setSemester] = useState<Semester>(() => {
    const saved = localStorage.getItem('semester');
    if (saved) return saved as Semester;
    return getCurrentSemester();
  });
  const [faculty, setFaculty] = useState<Faculty>(() => {
    const saved = localStorage.getItem('faculty');
    return (saved as Faculty) || '情報理工学部';
  });
  
  // Consolidated timetable state (nested by year, semester and faculty)
  const [timetableData, setTimetableData] = useState<TimetableData>(() => {
    const saved = localStorage.getItem('timetableData');
    return saved ? JSON.parse(saved) : {};
  });
  
  const currentData = useMemo(() => {
    return timetableData[year]?.[semester]?.[faculty] || {};
  }, [timetableData, year, semester, faculty]);

  const updateCurrentData = (key: string, subject: Subject | undefined) => {
    setTimetableData(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [semester]: {
          ...(prev[year]?.[semester] || {}),
          [faculty]: {
            ...(prev[year]?.[semester]?.[faculty] || {}),
            [key]: subject
          }
        }
      }
    }));
  };

  const resetCurrentData = () => {
    setTimetableData(prev => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [semester]: {
          ...(prev[year]?.[semester] || {}),
          [faculty]: {}
        }
      }
    }));

    // Also clear custom subjects from the pool for this faculty/semester/year
    setSubjectPool(prev => {
      const newPool = { ...prev };
      if (newPool[year]?.[semester]?.[faculty]) {
        const facultyPool = { ...newPool[year][semester][faculty] };
        Object.keys(facultyPool).forEach(key => {
          // Keep only non-custom (preset) subjects
          facultyPool[key] = facultyPool[key].filter(s => !s.isCustom);
        });
        newPool[year][semester][faculty] = facultyPool;
      }
      return newPool;
    });
  };

  // Cell-specific subject pools (nested by year and faculty)
  const [subjectPool, setSubjectPool] = useState<SubjectPool>(() => {
    const saved = localStorage.getItem('subjectPool');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist subjectPool
  useEffect(() => {
    localStorage.setItem('subjectPool', JSON.stringify(subjectPool));
  }, [subjectPool]);

  // Initialize subjectPool with presets if empty
  useEffect(() => {
    setSubjectPool(prev => {
      const newPool = { ...prev };
      let updated = false;

      Object.entries(ALL_YEAR_SUBJECT_PRESETS).forEach(([y, faculties]) => {
        const yearName = y as Year;
        Object.entries(faculties).forEach(([f, semesters]) => {
          const facultyName = f as Faculty;
          Object.entries(semesters).forEach(([s, cells]) => {
            const semesterName = s as Semester;
            
            if (!newPool[yearName]?.[semesterName]?.[facultyName]) {
              if (!newPool[yearName]) newPool[yearName] = {};
              if (!newPool[yearName][semesterName]) newPool[yearName][semesterName] = {};
              newPool[yearName][semesterName][facultyName] = cells;
              updated = true;
            }
          });
        });
      });

      return updated ? newPool : prev;
    });
  }, []);

  // Links state
  const [linkCategories, setLinkCategories] = useState<LinkCategory[]>(LINK_PRESETS);

  // Selection modal state
  const [selectingCell, setSelectingCell] = useState<{ day: number; period: number } | null>(null);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSelectingYear, setIsSelectingYear] = useState(false);
  const [isSelectingFaculty, setIsSelectingFaculty] = useState(false);
  const [isConfirmingCancelAdd, setIsConfirmingCancelAdd] = useState(false);
  const [confirmingSubject, setConfirmingSubject] = useState<Subject | null>(null);
  const [viewingSubjectCell, setViewingSubjectCell] = useState<{ day: number; period: number; subject: Subject } | null>(null);
  const [newSubject, setNewSubject] = useState({ code: '', name: '', professor: '', location: '', syllabusUrl: '', color: 'Indigo' });

  const [maxPeriods, setMaxPeriods] = useState<number>(() => {
    const saved = localStorage.getItem('maxPeriods');
    return saved ? parseInt(saved, 10) : 5;
  });
  const [isConfirmingMaxPeriodsChange, setIsConfirmingMaxPeriodsChange] = useState(false);
  const [pendingMaxPeriods, setPendingMaxPeriods] = useState<number | null>(null);

  const [isConfirmingImport, setIsConfirmingImport] = useState(false);
  const [importData, setImportData] = useState<{
    year: Year;
    semester: Semester;
    faculty: Faculty;
    data: Record<string, Subject>;
    subjectPool?: Record<string, Subject[]>;
    itemCount: number;
    willOverwrite: boolean;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const now = new Date();
    const HHmm = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    const YYYYMMDD = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0');
    const semesterKanji = semester === 'Spring' ? '春' : '秋';
    const filename = `${HHmm}_${YYYYMMDD}_${year}_${faculty}_${semesterKanji}.json`;

    const dataToExport = {
      year,
      semester,
      faculty,
      data: currentData,
      subjectPool: subjectPool[year]?.[semester]?.[faculty] || {}
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const refreshDatabase = () => {
    setSubjectPool(prev => {
      const newPool = JSON.parse(JSON.stringify(prev));

      YEARS.forEach(y => {
        if (!newPool[y]) newPool[y] = {};
        
        (['Spring', 'Fall'] as Semester[]).forEach(s => {
          if (!newPool[y][s]) newPool[y][s] = {};
          
          FACULTIES.forEach((f) => {
            if (!newPool[y][s][f]) newPool[y][s][f] = {};
            
            for (let d = 0; d < 5; d++) {
              for (let p = 0; p < 7; p++) {
                const key = `${d}-${p}`;
                
                // 1. 現在のプールから「ユーザーが自分で追加した授業(isCustom)」だけを抽出
                const currentPool = newPool[y][s][f][key] || [];
                const placedSubject = timetableData[y]?.[s]?.[f]?.[key];
                
                const customSubjects = currentPool.filter((subj: Subject) => {
                  if (!subj.isCustom) return false;
                  // 配置されているか、または今まさに選択中である場合は残す
                  const isPlaced = placedSubject && placedSubject.isCustom && placedSubject.code === subj.code && placedSubject.name === subj.name;
                  return isPlaced;
                });
                
                // 2. プログラム側の最新プリセットを取得
                const yearPresets = ALL_YEAR_SUBJECT_PRESETS[y];
                const periodPresets = yearPresets?.[f]?.[s]?.[d.toString()]?.[p.toString()] || [];
                
                // 3. プリセットに色を割り当て
                const coloredPresets = periodPresets.map((preset, idx) => ({
                  ...preset,
                  color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length].name,
                  isCustom: false
                }));

                // 4. 「カスタム授業」 + 「最新プリセット」 でプールを再構築（古いプリセットはここで消える）
                newPool[y][s][f][key] = [...customSubjects, ...coloredPresets];
              }
            }
          });
        });
      });

      return newPool;
    });
    
    // alert('データベースを最新の状態に同期しました。\n（プログラムから削除された古いデータは消去されました）');
  };

    const handleRefreshApp = () => {
    window.location.reload();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        if (!importedData.data || typeof importedData.data !== 'object') {
          setImportError('無効なファイル形式です。時間割データが見つかりません。');
          return;
        }

        const targetYear = importedData.year || year;
        const targetSemester = importedData.semester || semester;
        const targetFaculty = importedData.faculty || faculty;

        const itemCount = Object.keys(importedData.data).length;
        const existingData = timetableData[targetYear]?.[targetSemester]?.[targetFaculty] || {};
        const willOverwrite = Object.keys(existingData).length > 0;

        setImportData({
          year: targetYear,
          semester: targetSemester,
          faculty: targetFaculty,
          data: importedData.data,
          subjectPool: importedData.subjectPool,
          itemCount,
          willOverwrite
        });
        setIsConfirmingImport(true);
      } catch (error) {
        console.error('Import error:', error);
        setImportError('ファイルの読み込みに失敗しました。ファイルが破損しているか、JSON形式ではありません。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    if (!importData) return;

    const { year: targetYear, semester: targetSemester, faculty: targetFaculty, data: importedData, subjectPool: importedSubjectPool } = importData;

    setTimetableData(prev => ({
      ...prev,
      [targetYear]: {
        ...(prev[targetYear] || {}),
        [targetSemester]: {
          ...(prev[targetYear]?.[targetSemester] || {}),
          [targetFaculty]: importedData
        }
      }
    }));

    if (importedSubjectPool) {
      setSubjectPool(prev => ({
        ...prev,
        [targetYear]: {
          ...(prev[targetYear] || {}),
          [targetSemester]: {
            ...(prev[targetYear]?.[targetSemester] || {}),
            [targetFaculty]: {
              ...(prev[targetYear]?.[targetSemester]?.[targetFaculty] || {}),
              ...importedSubjectPool
            }
          }
        }
      }));
    }

    setYear(targetYear);
    setSemester(targetSemester);
    setFaculty(targetFaculty);
    setIsConfirmingImport(false);
    setImportData(null);
    
    // If we were in setup, complete it
    if (isFirstTime) {
      handleCompleteSetup();
    }
  };

  useEffect(() => {
    localStorage.setItem('maxPeriods', maxPeriods.toString());
  }, [maxPeriods]);

  useEffect(() => {
    localStorage.setItem('year', year);
  }, [year]);

  useEffect(() => {
    localStorage.setItem('semester', semester);
  }, [semester]);

  useEffect(() => {
    localStorage.setItem('faculty', faculty);
  }, [faculty]);

  useEffect(() => {
    localStorage.setItem('timetableData', JSON.stringify(timetableData));
  }, [timetableData]);

useEffect(() => {
  const checkDateAndSync = () => {
      const currentYear = getCurrentAcademicYear();
      const currentSemester = getCurrentSemester();
      
      // 1. Update year/semester if needed
      setYear(prev => {
        if (prev !== currentYear) return currentYear;
        return prev;
      });
      setSemester(prev => {
        if (prev !== currentSemester) return currentSemester;
        return prev;
      });

      // 2. Trigger Database Sync (Smart Sync)
      refreshDatabase();
    };

    // Check on mount
    checkDateAndSync();

    // Check every hour (1-hour update)
    const interval = setInterval(checkDateAndSync, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  // Online status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCompleteSetup = () => {
    localStorage.setItem('hasCompletedSetup', 'true');
    setIsFirstTime(false);
  };

  const handleMaxPeriodsChange = (newMax: number) => {
    if (newMax < maxPeriods) {
      // Check if any subjects exist in the periods that will be hidden
      const hiddenPeriodsExist = Object.keys(currentData).some(key => {
        const period = parseInt(key.split('-')[1], 10);
        return period >= newMax;
      });

      if (hiddenPeriodsExist) {
        setPendingMaxPeriods(newMax);
        setIsConfirmingMaxPeriodsChange(true);
        return;
      }
    }
    setMaxPeriods(newMax);
  };

  const confirmMaxPeriodsChange = () => {
    if (pendingMaxPeriods !== null) {
      setMaxPeriods(pendingMaxPeriods);
      setPendingMaxPeriods(null);
    }
    setIsConfirmingMaxPeriodsChange(false);
  };

  const handleCellClick = (day: number, period: number) => {
    const subject = currentData[`${day}-${period}`];
    if (subject) {
      setViewingSubjectCell({ day, period, subject });
    } else {
      setSelectingCell({ day, period });
    }
  };

  const isFormDirty = useMemo(() => {
    return !!(newSubject.code || newSubject.name || newSubject.professor || newSubject.location || newSubject.syllabusUrl);
  }, [newSubject]);

  const handleBackFromAdd = () => {
    if (isFormDirty) {
      setIsConfirmingCancelAdd(true);
    } else {
      setIsAddingSubject(false);
      setNewSubject({ code: '', name: '', professor: '', location: '', syllabusUrl: '', color: 'Indigo' });
    }
  };

  const handleCloseModal = () => {
    if (isAddingSubject && isFormDirty) {
      setIsConfirmingCancelAdd(true);
    } else {
      setSelectingCell(null);
      setIsAddingSubject(false);
      setConfirmingSubject(null);
      setNewSubject({ code: '', name: '', professor: '', location: '', syllabusUrl: '', color: 'Indigo' });
    }
  };

  const confirmCancelAdd = () => {
    setIsAddingSubject(false);
    setIsConfirmingCancelAdd(false);
    setConfirmingSubject(null);
    setNewSubject({ code: '', name: '', professor: '', location: '', syllabusUrl: '', color: 'Indigo' });
  };

  const handleSelectSubject = (subject: Subject) => {
    setConfirmingSubject(subject);
  };

  const handleConfirmSubject = () => {
    if (selectingCell && confirmingSubject) {
      const key = `${selectingCell.day}-${selectingCell.period}`;
      const previousSubject = currentData[key];

      // If previous subject was custom, remove it from the pool
      if (previousSubject?.isCustom) {
        setSubjectPool(prev => ({
          ...prev,
          [year]: {
            ...(prev[year] || {}),
            [semester]: {
              ...(prev[year]?.[semester] || {}),
              [faculty]: {
                ...(prev[year]?.[semester]?.[faculty] || {}),
                [key]: (prev[year]?.[semester]?.[faculty]?.[key] || []).filter(s => 
                  !(s.isCustom && s.code === previousSubject.code && s.name === previousSubject.name)
                )
              }
            }
          }
        }));
      }

      // Add the new subject to the pool if it's custom and not already there
      if (confirmingSubject.isCustom) {
        setSubjectPool(prev => {
          const pool = prev[year]?.[semester]?.[faculty]?.[key] || [];
          const exists = pool.some(s => s.code === confirmingSubject.code && s.name === confirmingSubject.name);
          if (!exists) {
            return {
              ...prev,
              [year]: {
                ...(prev[year] || {}),
                [semester]: {
                  ...(prev[year]?.[semester] || {}),
                  [faculty]: {
                    ...(prev[year]?.[semester]?.[faculty] || {}),
                    [key]: [...pool, confirmingSubject]
                  }
                }
              }
            };
          }
          return prev;
        });
      }

      updateCurrentData(key, confirmingSubject);
      setConfirmingSubject(null);
      setSelectingCell(null);
      setNewSubject({ code: '', name: '', professor: '', location: '', syllabusUrl: '', color: 'Indigo' });
    }
  };

  const handleRemoveSubject = () => {
    if (viewingSubjectCell) {
      const { day, period, subject } = viewingSubjectCell;
      const key = `${day}-${period}`;

      // If previous subject was custom, remove it from the pool
      if (subject.isCustom) {
        setSubjectPool(prev => ({
          ...prev,
          [year]: {
            ...(prev[year] || {}),
            [semester]: {
              ...(prev[year]?.[semester] || {}),
              [faculty]: {
                ...(prev[year]?.[semester]?.[faculty] || {}),
                [key]: (prev[year]?.[semester]?.[faculty]?.[key] || []).filter(s => 
                  !(s.isCustom && s.code === subject.code && s.name === subject.name)
                )
              }
            }
          }
        }));
      }

      updateCurrentData(key, undefined);
      setViewingSubjectCell(null);
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.name || !selectingCell) return;
    
    // Validate subject code length if provided
    if (newSubject.code && newSubject.code.length !== 5) {
      return;
    }
    
    const subject: Subject = { 
      ...newSubject, 
      isCustom: true 
    };
    
    handleSelectSubject(subject);
    setIsAddingSubject(false);
  };

  const currentCellPool = useMemo(() => {
    if (!selectingCell) return [];
    return subjectPool[year]?.[semester]?.[faculty]?.[`${selectingCell.day}-${selectingCell.period}`] || [];
  }, [selectingCell, subjectPool, year, semester, faculty]);

  return (
    <div className="h-dvh flex flex-col bg-neutral-50 text-neutral-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-white border-b border-neutral-200 px-4 py-2 z-10 relative">
        <div className="flex items-center justify-between">
          <div className="w-8" /> {/* Spacer */}
          <h1 className="text-base font-bold text-center flex-1">
            {activeTab === 'timetable' ? `${year}年度 ${semester === 'Spring' ? '春' : '秋'}セメスター` : 
             activeTab === 'links' ? 'リンク集' : '設定'}
          </h1>
          <div className="w-8 flex justify-end">
            {!isOnline && (
              <div className="text-amber-500" title="オフライン">
                <AlertTriangle size={18} />
              </div>
            )}
          </div>
        </div>
        {!isOnline && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 ${activeTab === 'timetable' ? 'overflow-hidden' : 'overflow-y-auto'} p-1.5 max-w-4xl mx-auto w-full`}>
        <AnimatePresence mode="wait">
          {activeTab === 'timetable' && (
            <motion.div
              key="timetable"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full"
            >
              <div 
                className="grid gap-1 w-full h-full"
                style={{ 
                  gridTemplateColumns: '34px repeat(5, 1fr)',
                  gridTemplateRows: `28px repeat(${maxPeriods}, 1fr)`
                }}
              >
                {/* Header Row */}
                <div className="h-full"></div>
                {DAYS.map(day => (
                  <div key={day} className="h-full flex items-center justify-center font-bold text-sm sm:text-base text-neutral-500">
                    {day}
                  </div>
                ))}

                {/* Grid Rows */}
                {PERIODS.slice(0, maxPeriods).map((period, pIdx) => (
                  <React.Fragment key={period}>
                    <div className="flex flex-col items-center justify-center font-bold text-neutral-400 h-full">
                      <span className="text-sm sm:text-base">{period}</span>
                      <span className="text-[8px] sm:text-[9px] leading-tight opacity-80 font-bold whitespace-pre-line text-center">
                        {PERIOD_TIMES[pIdx].split('~').join('\n')}
                      </span>
                    </div>
                    {DAYS.map((_, dIdx) => {
                      const subject = currentData[`${dIdx}-${pIdx}`];
                      const colorConfig = SUBJECT_COLORS.find(c => c.name === subject?.color) || SUBJECT_COLORS[0];
                      
                      return (
                        <button
                          key={`${dIdx}-${pIdx}`}
                          onClick={() => handleCellClick(dIdx, pIdx)}
                          className={`h-full border rounded-md p-0.5 sm:p-1 text-[9px] sm:text-[11px] leading-tight flex flex-col items-center justify-center text-center transition-colors
                            ${subject ? `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}` : 'bg-white border-neutral-200 hover:bg-neutral-100'}`}
                        >
                          {subject ? (
                            <>
                              <span className="font-bold line-clamp-3">{subject.name}</span>
                              {subject.location && (
                                <span className="text-[7px] sm:text-[9px] mt-0.5 sm:mt-1 opacity-50 truncate w-full">{subject.location}</span>
                              )}
                            </>
                          ) : (
                            <Plus size={12} className="text-neutral-300" />
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'links' && (
            <motion.div
              key="links"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {linkCategories.length === 0 ? (
                <div className="text-center py-20 text-neutral-400">
                  <LinkIcon size={48} className="mx-auto mb-4 opacity-20" />
                  <p>リンクが登録されていません</p>
                </div>
              ) : (
                linkCategories.map(category => (
                  <div key={category.name} className="space-y-2">
                    <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-2">
                      {category.name}
                    </h2>
                    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
                      {category.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors group"
                        >
                          <span className="font-medium">{link.title}</span>
                          <ChevronRight size={16} className="text-neutral-300 group-hover:text-indigo-500 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Layout size={18} />
                  <h2 className="font-bold text-sm">表示設定</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400 font-bold">表示する時限数</p>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-lg">
                    {[5, 6, 7].map(num => (
                      <button
                        key={num}
                        onClick={() => handleMaxPeriodsChange(num)}
                        className={`py-2 text-sm font-medium rounded-md transition-all ${maxPeriods === num ? 'bg-white shadow-sm text-[#a9383a]' : 'text-neutral-400 hover:text-neutral-700'}`}
                      >
                        {num}限まで
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Calendar size={18} />
                  <h2 className="font-bold text-sm">年度設定</h2>
                </div>
                <button
                  onClick={() => setIsSelectingYear(true)}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-700 hover:bg-neutral-100 transition-all"
                >
                  <span className="font-bold">{year}年度</span>
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Calendar size={18} />
                  <h2 className="font-bold text-sm">セメスター設定</h2>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-lg">
                  <button
                    onClick={() => setSemester('Spring')}
                    className={`py-2 text-sm font-medium rounded-md transition-all ${semester === 'Spring' ? 'bg-white shadow-sm text-[#a9383a]' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    春セメスター
                  </button>
                  <button
                    onClick={() => setSemester('Fall')}
                    className={`py-2 text-sm font-medium rounded-md transition-all ${semester === 'Fall' ? 'bg-white shadow-sm text-[#a9383a]' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    秋セメスター
                  </button>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <GraduationCap size={18} />
                  <h2 className="font-bold text-sm">学部設定</h2>
                </div>
                <button
                  onClick={() => setIsSelectingFaculty(true)}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-700 hover:bg-neutral-100 transition-all"
                >
                  <span className="font-bold">{faculty}</span>
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
                <h2 className="font-bold text-sm text-neutral-500">データ管理</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#C9383A] border border-[#a9383a] rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Download size={16} />
                    エクスポート
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-[#C9383A] border border-[#a9383a] rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Upload size={16} />
                    インポート
                  </button>
                </div>
                {/* <button 
                  onClick={refreshDatabase}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-amber-600 border border-amber-100 rounded-lg hover:bg-amber-50 transition-colors"
                >
                  <RefreshCw size={16} />
                  授業リストの更新
                </button>
                <button 
                  onClick={handleRefreshApp}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <RotateCcw size={16} />
                  アプリをリフレッシュ
                </button> */}
                <button 
                  onClick={() => setIsResetting(true)}
                  className="w-full py-3 text-sm font-medium text-white bg-red-500 border border-red-100 rounded-lg hover:bg-red-600 transition-colors"
                >
                  時間割をリセット
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Year Selection Modal */}
        <AnimatePresence>
          {isSelectingYear && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSelectingYear(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                  <h2 className="font-bold">年度を選択</h2>
                  <button onClick={() => setIsSelectingYear(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-1 gap-2">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setIsSelectingYear(false);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${year === y ? 'bg-[#FFEDED] border-[#a9383a] text-[#C9383A]' : 'bg-white border-neutral-100 text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      <span className="font-bold">{y}年度</span>
                      {year === y && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Faculty Selection Modal */}
        <AnimatePresence>
          {isSelectingFaculty && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSelectingFaculty(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                  <h2 className="font-bold">学部を選択</h2>
                  <button onClick={() => setIsSelectingFaculty(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                    <X size={20} className="text-neutral-400" />
                  </button>
                </div>
                <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
                  {FACULTIES.map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        setFaculty(f);
                        setIsSelectingFaculty(false);
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${faculty === f ? 'bg-[#FFEDED] border-[#a9383a] text-[#C9383A]' : 'bg-white border-neutral-100 text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      <span className="font-bold">{f}</span>
                      {faculty === f && <Check size={18} />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Cancel Add Confirmation Modal */}
        <AnimatePresence>
          {isConfirmingCancelAdd && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfirmingCancelAdd(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden"
              >
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <ChevronLeft size={24} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold">入力を破棄しますか？</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      入力中の内容は保存されません。本当にもどりますか？
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setIsConfirmingCancelAdd(false)}
                      className="py-3 px-4 rounded-xl bg-neutral-100 font-bold text-neutral-600 hover:bg-neutral-200 transition-colors text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={confirmCancelAdd}
                      className="py-3 px-4 rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 text-sm"
                    >
                      はい
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Subject Confirmation Modal */}
        <AnimatePresence>
          {confirmingSubject && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  if (confirmingSubject.isCustom) {
                    setIsConfirmingCancelAdd(true);
                  } else {
                    setConfirmingSubject(null);
                  }
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className={`h-12 flex-none flex items-center justify-center ${
                  (SUBJECT_COLORS.find(c => c.name === confirmingSubject.color) || SUBJECT_COLORS[0]).active
                }`}>
                  <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                    <Check size={20} className="text-white" />
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">授業登録の確認</span>
                    <h2 className="text-lg font-black text-neutral-900 leading-tight">{confirmingSubject.name}</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-neutral-400 flex-none">
                        <GraduationCap size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">教授名</p>
                        <p className="text-xs font-bold text-neutral-700 truncate">{confirmingSubject.professor || '未登録'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-neutral-400 flex-none">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">場所</p>
                        <p className="text-xs font-bold text-neutral-700 truncate">{confirmingSubject.location || '未登録'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">コード</p>
                        <p className="text-xs font-bold text-neutral-700">{confirmingSubject.code}</p>
                      </div>
                      {confirmingSubject.syllabusUrl ? (
                        <a 
                          href={confirmingSubject.syllabusUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 bg-indigo-50 rounded-xl flex flex-col justify-center hover:bg-indigo-100 transition-colors group"
                        >
                          <p className="text-[9px] font-bold text-indigo-400 uppercase">シラバス</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-indigo-600">開く</span>
                            <ChevronRight size={10} className="text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </a>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-xl flex flex-col justify-center opacity-60">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase">シラバス</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-neutral-400">未登録</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-center flex-wrap gap-1.5">
                        {SUBJECT_COLORS.map(color => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setConfirmingSubject(prev => prev ? ({ ...prev, color: color.name }) : null)}
                            className={`w-5 h-5 rounded-full border transition-all ${color.active} ${confirmingSubject.color === color.name ? 'scale-110 border-neutral-900 ring-1 ring-white' : 'border-transparent opacity-60'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (confirmingSubject.isCustom) {
                          setIsConfirmingCancelAdd(true);
                        } else {
                          setConfirmingSubject(null);
                        }
                      }}
                      className="py-3 px-4 rounded-xl bg-neutral-100 font-bold text-neutral-600 hover:bg-neutral-200 transition-colors text-xs"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleConfirmSubject}
                      className={`py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 text-xs ${
                        (SUBJECT_COLORS.find(c => c.name === confirmingSubject.color) || SUBJECT_COLORS[0]).active
                      }`}
                    >
                      登録する
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Subject Details Modal */}
        <AnimatePresence>
          {viewingSubjectCell && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingSubjectCell(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className={`h-12 flex-none flex items-center justify-center ${
                  (SUBJECT_COLORS.find(c => c.name === viewingSubjectCell.subject.color) || SUBJECT_COLORS[0]).active
                }`}>
                  <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                    <Calendar size={20} className="text-white" />
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">授業詳細</span>
                    <h2 className="text-lg font-black text-neutral-900 leading-tight">{viewingSubjectCell.subject.name}</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-neutral-400 flex-none">
                        <GraduationCap size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">教授名</p>
                        <p className="text-xs font-bold text-neutral-700 truncate">{viewingSubjectCell.subject.professor || '未登録'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-neutral-400 flex-none">
                        <Calendar size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">場所</p>
                        <p className="text-xs font-bold text-neutral-700 truncate">{viewingSubjectCell.subject.location || '未登録'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase">コード</p>
                        <p className="text-xs font-bold text-neutral-700">{viewingSubjectCell.subject.code}</p>
                      </div>
                      {viewingSubjectCell.subject.syllabusUrl ? (
                        <a 
                          href={viewingSubjectCell.subject.syllabusUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-3 bg-indigo-50 rounded-xl flex flex-col justify-center hover:bg-indigo-100 transition-colors group"
                        >
                          <p className="text-[9px] font-bold text-indigo-400 uppercase">シラバス</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-indigo-600">開く</span>
                            <ChevronRight size={10} className="text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </a>
                      ) : (
                        <div className="p-3 bg-neutral-50 rounded-xl flex flex-col justify-center opacity-60">
                          <p className="text-[9px] font-bold text-neutral-400 uppercase">シラバス</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-neutral-400">未登録</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectingCell({ day: viewingSubjectCell.day, period: viewingSubjectCell.period });
                        setViewingSubjectCell(null);
                      }}
                      className="py-3 px-4 rounded-xl bg-neutral-100 font-bold text-neutral-600 hover:bg-neutral-200 transition-colors text-xs"
                    >
                      変更する
                    </button>
                    <button
                      onClick={handleRemoveSubject}
                      className="py-3 px-4 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors shadow-sm text-xs"
                    >
                      削除する
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Max Periods Change Confirmation Modal */}
        <AnimatePresence>
          {isConfirmingMaxPeriodsChange && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfirmingMaxPeriodsChange(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden"
              >
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold">表示を減らしますか？</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      非表示になる時間帯に登録済みの授業があります。データは保持されますが、画面には表示されなくなります。
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setIsConfirmingMaxPeriodsChange(false)}
                      className="py-3 px-4 rounded-xl bg-neutral-100 font-bold text-neutral-600 hover:bg-neutral-200 transition-colors text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={confirmMaxPeriodsChange}
                      className="py-3 px-4 rounded-xl bg-amber-500 font-bold text-white hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 text-sm"
                    >
                      はい
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reset Confirmation Modal */}
        <AnimatePresence>
          {isResetting && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsResetting(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden"
              >
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <X size={24} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold">時間割をリセット</h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      {year}年度 {semester === 'Spring' ? '春' : '秋'}セメスター ({faculty}) の時間割をすべて消去しますか？
                      <span className="text-red-500 font-medium block mt-1">※この操作は取り消せません。</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setIsResetting(false)}
                      className="py-3 px-4 rounded-xl bg-neutral-100 font-bold text-neutral-600 hover:bg-neutral-200 transition-colors text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        resetCurrentData();
                        setIsResetting(false);
                      }}
                      className="py-3 px-4 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-200 text-sm"
                    >
                      リセット
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImport} 
          accept=".json" 
          className="hidden" 
        />
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-none bg-white border-t border-neutral-200 flex justify-around items-stretch h-14 z-20 shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${activeTab === 'timetable' ? 'text-[#a9383a]' : 'text-neutral-400'}`}
        >
          <Calendar size={20} />
          <span className="text-[10px] font-bold">時間割</span>
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${activeTab === 'links' ? 'text-[#a9383a]' : 'text-neutral-400'}`}
        >
          <LinkIcon size={20} />
          <span className="text-[10px] font-bold">リンク</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${activeTab === 'settings' ? 'text-[#a9383a]' : 'text-neutral-400'}`}
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold">設定・更新</span>
        </button>
      </nav>

      {/* First Time Setup Modal */}
      <AnimatePresence>
        {isFirstTime && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 space-y-8 overflow-y-auto">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200 mb-4 rotate-3">
                    <Calendar size={32} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-black text-neutral-900">ようこそ！</h1>
                  <p className="text-sm text-neutral-500 font-medium">
                    {setupMode === 'choice' ? '利用方法を選択してください。' : 'まずはあなたの時間割の設定を行いましょう。'}
                  </p>
                </div>

                {setupMode === 'choice' && (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={() => setSetupMode('manual')}
                      className="group p-6 bg-white border-2 border-neutral-100 rounded-[24px] text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Plus size={24} />
                        </div>
                        <div>
                          <p className="font-black text-neutral-900">新しく作成する</p>
                          <p className="text-xs text-neutral-500 font-medium">年度や学部を選んで始めます</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setSetupMode('import')}
                      className="group p-6 bg-white border-2 border-neutral-100 rounded-[24px] text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Upload size={24} />
                        </div>
                        <div>
                          <p className="font-black text-neutral-900">データを引き継ぐ</p>
                          <p className="text-xs text-neutral-500 font-medium">保存したJSONファイルを読み込みます</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {setupMode === 'manual' && (
                  <div className="space-y-6">
                    {/* Year Selection */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">年度</label>
                      <div className="grid grid-cols-2 gap-2">
                        {YEARS.map(y => (
                          <button
                            key={y}
                            onClick={() => setYear(y)}
                            className={`py-3 rounded-2xl font-bold transition-all border-2 ${
                              year === y 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200'
                            }`}
                          >
                            {y}年度
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Semester Selection */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">セメスター</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Spring', 'Fall'] as Semester[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setSemester(s)}
                            className={`py-3 rounded-2xl font-bold transition-all border-2 ${
                              semester === s 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200'
                            }`}
                          >
                            {s === 'Spring' ? '春セメスター' : '秋セメスター'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Faculty Selection */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">学部</label>
                      <div className="grid grid-cols-1 gap-2">
                        {FACULTIES.map(f => (
                          <button
                            key={f}
                            onClick={() => setFaculty(f)}
                            className={`py-3 px-4 rounded-2xl font-bold text-left transition-all border-2 flex items-center justify-between ${
                              faculty === f 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200'
                            }`}
                          >
                            <span>{f}</span>
                            {faculty === f && <Check size={18} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSetupMode('choice')}
                        className="flex-1 py-5 bg-neutral-100 text-neutral-600 font-black rounded-2xl hover:bg-neutral-200 transition-all"
                      >
                        戻る
                      </button>
                      <button
                        onClick={handleCompleteSetup}
                        className="flex-[2] py-5 bg-neutral-900 text-white font-black rounded-2xl shadow-xl hover:bg-neutral-800 transition-all active:scale-[0.98]"
                      >
                        はじめる
                      </button>
                    </div>
                  </div>
                )}

                {setupMode === 'import' && (
                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-50 rounded-[24px] border border-indigo-100 space-y-4">
                      <p className="text-sm text-indigo-700 leading-relaxed font-medium text-center">
                        以前に書き出した時間割データ（JSONファイル）を選択してください。
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl border-2 border-indigo-200 hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload size={20} />
                        ファイルを選択
                      </button>
                    </div>

                    <button
                      onClick={() => setSetupMode('choice')}
                      className="w-full py-5 bg-neutral-100 text-neutral-600 font-black rounded-2xl hover:bg-neutral-200 transition-all"
                    >
                      戻る
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingImport && importData && (
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmingImport(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                  <Upload size={32} className="text-indigo-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">時間割のインポート</h2>
                  <p className="text-sm text-neutral-500">
                    {importData.year}年度 {importData.faculty} {importData.semester === 'Spring' ? '春' : '秋'}セメスターのデータをインポートします。
                  </p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">インポート件数</span>
                  <span className="font-bold">{importData.itemCount}件</span>
                </div>
                {importData.willOverwrite && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                      既存の {importData.year}年度 {importData.faculty} {importData.semester === 'Spring' ? '春' : '秋'}セメスターの時間割データは上書きされます。
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmImport}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  インポートを実行
                </button>
                <button
                  onClick={() => setIsConfirmingImport(false)}
                  className="w-full py-4 text-neutral-500 font-bold hover:bg-neutral-50 rounded-2xl transition-all"
                >
                  キャンセル
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Error Modal */}
      <AnimatePresence>
        {importError && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setImportError(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">インポートエラー</h2>
                  <p className="text-sm text-red-600 font-medium">{importError}</p>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-neutral-500 uppercase">トラブルシューティング</h3>
                <ul className="text-xs text-neutral-600 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>このアプリから書き出したJSONファイルであることを確認してください。</li>
                  <li>ファイルが破損していないか確認してください。</li>
                  <li>正しいファイル形式（.json）を選択しているか確認してください。</li>
                </ul>
              </div>

              <button
                onClick={() => setImportError(null)}
                className="w-full py-4 bg-neutral-900 text-white font-bold rounded-2xl hover:bg-neutral-800 transition-all active:scale-[0.98]"
              >
                閉じる
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Selection Modal */}
      <AnimatePresence>
        {selectingCell && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-2xl h-auto max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="font-bold">
                    {DAYS[selectingCell.day]}曜 {PERIODS[selectingCell.period]}限 の授業を選択
                  </h2>
                  <span className="text-[10px] text-indigo-600 font-medium">{year}年度 {faculty} のリストを表示中</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (isAddingSubject) {
                        handleBackFromAdd();
                      } else {
                        setIsAddingSubject(true);
                      }
                    }}
                    className={`flex items-center gap-1 transition-colors ${
                      isAddingSubject 
                        ? 'px-3 py-1.5 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100' 
                        : 'p-2 text-indigo-600 hover:bg-indigo-50 rounded-full'
                    }`}
                  >
                    {isAddingSubject ? (
                      <>
                        <ChevronLeft size={18} />
                        <span className="text-sm font-bold">戻る</span>
                      </>
                    ) : (
                      <Plus size={20} />
                    )}
                  </button>
                  <button 
                    onClick={handleCloseModal}
                    className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className={`flex-1 ${isAddingSubject ? 'overflow-visible' : 'overflow-y-auto'} p-4 space-y-4`}>
                {isAddingSubject ? (
                  <form onSubmit={handleAddSubject} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">授業コード (5桁)</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="例: 12345"
                        value={newSubject.code}
                        onChange={e => {
                          const val = e.target.value
                            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
                            .replace(/\D/g, '')
                            .slice(0, 5);
                          setNewSubject(prev => ({ ...prev, code: val }));
                        }}
                        className="w-full p-2.5 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">
                        教科名 <span className="text-red-500 ml-1">*必須</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="例: 英語上級"
                        value={newSubject.name}
                        onChange={e => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2.5 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">教授名</label>
                      <input
                        type="text"
                        placeholder="例: 立命 太郎"
                        value={newSubject.professor}
                        onChange={e => setNewSubject(prev => ({ ...prev, professor: e.target.value }))}
                        className="w-full p-2.5 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">場所</label>
                      <input
                        type="text"
                        placeholder="例: H321"
                        value={newSubject.location}
                        onChange={e => setNewSubject(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-2.5 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">シラバスURL</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newSubject.syllabusUrl}
                        onChange={e => setNewSubject(prev => ({ ...prev, syllabusUrl: e.target.value }))}
                        className="w-full p-2.5 bg-neutral-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors text-sm"
                      >
                        保存
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-neutral-400 uppercase">授業リスト</span>
                    </div>
                    <div className="grid gap-2">
                      {currentCellPool.length === 0 ? (
                        <div className="text-center py-12 px-6 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus size={20} className="text-neutral-400" />
                          </div>
                          <p className="text-sm font-bold text-neutral-600 mb-1">
                            登録されている授業がありません
                          </p>
                          <p className="text-[11px] text-neutral-400 leading-relaxed">
                            この曜日・時限のプリセットが登録されていないか、<br/>
                            まだ自分で授業を追加していません。<br/>
                            右上の「+」ボタンから新しく登録できます。
                          </p>
                        </div>
                      ) : (
                        currentCellPool.map((subject, idx) => {
                          const key = `${selectingCell.day}-${selectingCell.period}`;
                          const registeredSubject = currentData[key];
                          const isSelected = registeredSubject?.code === subject.code;
                          const displayColor = isSelected ? registeredSubject.color : subject.color;
                          const colorConfig = SUBJECT_COLORS.find(c => c.name === displayColor) || SUBJECT_COLORS[0];
                          
                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectSubject({ ...subject, color: isSelected ? registeredSubject.color : 'Indigo' })}
                              className={`flex items-center justify-between p-4 rounded-xl transition-all text-left group border-2 ${
                                isSelected 
                                  ? `${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}` 
                                  : 'bg-neutral-50 border-transparent hover:bg-neutral-100'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 text-xs font-bold shrink-0 ${isSelected ? 'opacity-60' : 'opacity-40'}`}>{subject.code}</div>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-sm leading-tight">{subject.name}</div>
                                  <div className="text-[10px] opacity-60 flex items-center gap-1">
                                    <GraduationCap size={10} />
                                    {subject.professor || '教授未登録'}
                                  </div>
                                </div>
                              </div>
                              {isSelected ? (
                                <Check size={16} className={colorConfig.text} />
                              ) : (
                                <Check size={16} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          );
                        })
                      )}
                      
                      <button
                        onClick={() => {
                          const key = `${selectingCell.day}-${selectingCell.period}`;
                          const previousSubject = currentData[key];

                          // If previous subject was custom, remove it from the pool
                          if (previousSubject?.isCustom) {
                            setSubjectPool(prev => ({
                              ...prev,
                              [year]: {
                                ...(prev[year] || {}),
                                [semester]: {
                                  ...(prev[year]?.[semester] || {}),
                                  [faculty]: {
                                    ...(prev[year]?.[semester]?.[faculty] || {}),
                                    [key]: (prev[year]?.[semester]?.[faculty]?.[key] || []).filter(s => 
                                      !(s.isCustom && s.code === previousSubject.code && s.name === previousSubject.name)
                                    )
                                  }
                                }
                              }
                            }));
                          }

                          updateCurrentData(key, undefined);
                          setSelectingCell(null);
                        }}
                        className="mt-4 p-4 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        選択を解除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
