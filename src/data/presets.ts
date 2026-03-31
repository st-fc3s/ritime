import { Faculty, Year, Semester, FacultyTimetablePresets } from '../types';

// 26年度 プリセットのインポート
import { presets as presets26KeieiSpring } from './presets/Keiei/26KeieiSpring';
import { presets as presets26KeieiFall } from './presets/Keiei/26KeieiFall';
import { presets as presets26SeisakuSpring } from './presets/Seisaku/26SeisakuSpring';
import { presets as presets26SeisakuFall } from './presets/Seisaku/26SeisakuFall';
import { presets as presets26ShinriSpring } from './presets/Shinri/26ShinriSpring';
import { presets as presets26ShinriFall } from './presets/Shinri/26ShinriFall';
import { presets as presets26GlobalSpring } from './presets/Global/26GlobalSpring';
import { presets as presets26GlobalFall } from './presets/Global/26GlobalFall';
import { presets as presets26EizoSpring } from './presets/Eizo/26EizoSpring';
import { presets as presets26EizoFall } from './presets/Eizo/26EizoFall';
import { presets as presets26JohoSpring } from './presets/Joho/26JohoSpring';
import { presets as presets26JohoFall } from './presets/Joho/26JohoFall';

/**
 * 年度設定
 */
export const YEARS: Year[] = ['2026', '2027', '2028', '2029'];

/**
 * 学部設定
 */
export const FACULTIES: Faculty[] = [
  '経営学部',
  '政策科学部',
  '総合心理学部',
  'グローバル教養学部',
  '映像学部',
  '情報理工学部'
];

/**
 * 全年度・全学部・全セメスターのプリセット集約
 * 構造: 年度 -> 学部 -> セメスター -> 曜日 -> 時限 -> 教科リスト
 */
export const ALL_YEAR_SUBJECT_PRESETS: Record<Year, Record<Faculty, Record<Semester, FacultyTimetablePresets>>> = {
  '2026': {
    '経営学部': {
      'Spring': presets26KeieiSpring,
      'Fall': presets26KeieiFall
    },
    '政策科学部': {
      'Spring': presets26SeisakuSpring,
      'Fall': presets26SeisakuFall
    },
    '総合心理学部': {
      'Spring': presets26ShinriSpring,
      'Fall': presets26ShinriFall
    },
    'グローバル教養学部': {
      'Spring': presets26GlobalSpring,
      'Fall': presets26GlobalFall
    },
    '映像学部': {
      'Spring': presets26EizoSpring,
      'Fall': presets26EizoFall
    },
    '情報理工学部': {
      'Spring': presets26JohoSpring,
      'Fall': presets26JohoFall
    }
  },
  '2027': {} as any, // 必要に応じて追加
  '2028': {} as any,
  '2029': {} as any
};

/**
 * 場所のプリセット（接尾辞として使用）
 */
export const LOCATION_SUFFIXES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
