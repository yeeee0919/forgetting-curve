import { getCardRoots, segmentWord } from './src/services/wordUtils.js';

const words = [
    { front: 'toevallig', tips: '【字源分析】：toevallig 是由 toe + val + ig 構成' },
    { front: 'overwegen', tips: '【字源分析】：overwegen 來自 over + wegen' }
];

words.forEach(c => {
    const roots = getCardRoots(c);
    const segs = segmentWord(c.front, roots);
    console.log(c.front, roots, segs.map(s => s.text + (s.isRoot ? '(R)' : '(-)')).join(' | '));
});
