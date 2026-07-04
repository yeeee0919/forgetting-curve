import { getCardRoots, segmentWord } from './src/services/wordUtils.js';

const roots = getCardRoots({ front: 'overwegen', tips: '【字源分析】：over + weeg + en' });
console.log('Roots from getCardRoots:', roots);
console.log('Segment:', segmentWord('overwegen', roots));

