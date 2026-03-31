export type Semester = 'Spring' | 'Fall';
export type Year = '2025' 
| '2026' 
// | '2027' 
// | '2028' 
// | '2029'
;
export type Theme = 'light' | 'dark' | 'system';

export type Faculty = '経営学部' | '政策科学部' | '総合心理学部' | 'グローバル教養学部' | '映像学部' | '情報理工学部';

export const FACULTY_ABBR: Record<Faculty, string> = {
  '経営学部': '経営',
  '政策科学部': '政策',
  '総合心理学部': '総心',
  'グローバル教養学部': 'グロ教',
  '映像学部': '映像',
  '情報理工学部': '情理'
};

export interface Subject {
  code: string;
  name: string;
  professor?: string;
  location?: string;
  syllabusUrl?: string;
  color?: string;
  isCustom?: boolean;
}

/**
 * 教科プリセットの型定義
 */
export interface SubjectPreset {
  code: string;
  name: string;
  professor: string;
  location: string;
  syllabusUrl: string;
}

/**
 * 曜日・時限ごとのプリセット型定義
 */
export type FacultyTimetablePresets = Record<string, Record<string, SubjectPreset[]>>;

/**
 * 学部・セメスターごとのプリセット型定義
 */
export type SemesterPresets = Record<Semester, FacultyTimetablePresets>;

export interface TimetableCell {
  day: number; // 0: Mon, 1: Tue, ..., 4: Fri
  period: number; // 0: 1st, ..., 6: 7th
  subject?: Subject;
}

export interface TimetableData {
  [year: string]: {
    [semester: string]: {
      [faculty: string]: {
        [cell: string]: Subject | undefined;
      };
    };
  };
}

export interface SubjectPool {
  [year: string]: {
    [semester: string]: {
      [faculty: string]: {
        [cell: string]: Subject[]; // key format: "day-period"
      };
    };
  };
}

export interface LinkItem {
  title: string;
  url: string;
}

export interface LinkCategory {
  name: string;
  links: LinkItem[];
}
