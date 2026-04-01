import { LinkCategory } from '../types';

/**
 * リンク集の設定
 */
export const LINK_PRESETS: LinkCategory[] = [
  {
    name: '立命館大学',
    links: [
      { title: '大学ホームページ', url: 'https://www.ritsumei.ac.jp/' },
      { title: '情報理工学部', url: 'https://www.ritsumei.ac.jp/ise/' },
      { title: '経営学部', url: 'https://www.ritsumei.ac.jp/ba/' },
      { title: '政策科学部', url: 'https://www.ritsumei.ac.jp/ps/' },
      { title: '総合心理学部', url: 'https://www.ritsumei.ac.jp/psy/' },
      { title: 'グローバル教養学部', url: 'https://www.ritsumei.ac.jp/gla/' },
      { title: '映像学部', url: 'https://www.ritsumei.ac.jp/im/' },
    ]
  },
  {
    name: '立命館生協',
    links: [
      { title: '食堂 営業時間・メニュー', url: 'https://www.ritscoop.jp/food/' },
      { title: '生協ホームページ', url: 'https://www.ritscoop.jp/' }    ]
  },
  {
    name: '学生生活サポート',
    links: [
      { title: 'CAMPUS WEB', url: 'https://cw.ritsumei.ac.jp/campusweb/' },
      { title: 'manaba+R', url: 'https://manaba.ritsumei.ac.jp/' },
      { title: '立命館大学図書館', url: 'https://library.ritsumei.ac.jp/' },
    ]
  }
];
