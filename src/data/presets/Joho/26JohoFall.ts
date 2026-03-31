import { FacultyTimetablePresets } from '../../../types';

/**
 * 26年度 情報理工学部 秋セメスター プリセット
 */
export const presets: FacultyTimetablePresets = {
  '0': { // 月曜日
    '0': [ // 1限
      { code: '50101', name: 'プログラミング(秋)', professor: '大学一郎', location: 'A棟 501教室', syllabusUrl: 'https://syllabus.ritsumei.ac.jp/' },
      { code: '50102', name: '情報演習(秋)', professor: '大学次郎', location: 'B棟 502教室', syllabusUrl: 'https://syllabus.ritsumei.ac.jp/' }
    ],
    '1': [ // 2限
      { code: '50103', name: 'アルゴリズム(秋)', professor: '大学三郎', location: 'C棟 503教室', syllabusUrl: 'https://syllabus.ritsumei.ac.jp/' }
    ]
  },
  '1': { // 火曜日
    '0': [ // 1限
      { code: '50104', name: 'データベース(秋)', professor: '大学四郎', location: 'D棟 504教室', syllabusUrl: 'https://syllabus.ritsumei.ac.jp/' }
    ]
  }
};
