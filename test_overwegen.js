import { getCardRoots, segmentWord } from './src/services/wordUtils.js';

// Case 1: no tips
console.log('No tips:', segmentWord('overwegen', getCardRoots({ front: 'overwegen', tips: '' })));

// Case 2: tips has over, wegen
console.log('With tips over, wegen:', segmentWord('overwegen', getCardRoots({ front: 'overwegen', tips: 'over wegen' })));

// Case 3: tips has ver?
console.log('With ver:', segmentWord('overwegen', ['o', 'ver', 'wegen']));

