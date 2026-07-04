import { getCardRoots, segmentWord } from './src/services/wordUtils.js';
const words = [
    { front: 'toevallig', tips: '' },
    { front: 'overwegen', tips: '' }
];
words.forEach(c => {
    const roots = getCardRoots(c);
    const segs = segmentWord(c.front, roots);
    console.log(c.front, roots, segs.map(s => s.text + (s.isRoot ? '(R)' : '(-)')).join(' | '));
});
