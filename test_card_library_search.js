import { matchesSearch } from './src/services/cardSearch.js'

let failed = 0
function assert(cond, msg) {
    if (!cond) {
        failed++
        console.error('FAIL:', msg)
    } else {
        console.log('ok:', msg)
    }
}

const huis = { front: 'huis', back: '房子' }
assert(matchesSearch(huis, ''), 'empty query matches')
assert(matchesSearch(huis, 'huis'), 'Dutch headword matches')
assert(matchesSearch(huis, 'HUIS'), 'Dutch is case-insensitive')
assert(matchesSearch(huis, '房'), 'Chinese gloss matches')
assert(matchesSearch(huis, '房子'), 'full Chinese gloss matches')
assert(!matchesSearch(huis, 'fiets'), 'unrelated Dutch does not match')
assert(!matchesSearch(huis, '腳踏車'), 'unrelated Chinese does not match')
assert(!matchesSearch({ front: 'huis', back: '房子', example_1: 'Ons huis is fijn.', example_trans_1: '我們的房子很舒服' }, '舒服'), 'example translation is not searched')

if (failed) {
    console.error(`\n${failed} failed`)
    process.exit(1)
}
console.log('\nall passed')
