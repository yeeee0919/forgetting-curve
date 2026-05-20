const getTk = (a) => {
    const TKK = '406398.2087938574';
    const b = (a, b) => {
        for (let d = 0; d < b.length - 2; d += 3) {
            let c = b.charAt(d + 2);
            c = "a" <= c ? c.charCodeAt(0) - 87 : Number(c);
            c = "+" === b.charAt(d + 1) ? a >>> c : a << c;
            a = "+" === b.charAt(d) ? a + c & 4294967295 : a ^ c;
        }
        return a;
    };
    let e = TKK.split("."), h = Number(e[0]) || 0, g = [], d = 0, f = 0;
    for (; f < a.length; f++) {
        let c = a.charCodeAt(f);
        128 > c ? g[d++] = c : (2048 > c ? g[d++] = c >> 6 | 192 : (55296 === (c & 64512) && f + 1 < a.length && 56320 === (a.charCodeAt(f + 1) & 64512) ? (c = 65536 + ((c & 1023) << 10) + (a.charCodeAt(++f) & 1023), g[d++] = c >> 18 | 240, g[d++] = c >> 12 & 63 | 128) : g[d++] = c >> 12 | 224, g[d++] = c >> 6 & 63 | 128), g[d++] = c & 63 | 128);
    }
    let aNum = h;
    for (d = 0; d < g.length; d++) aNum += g[d], aNum = b(aNum, "+-a^+6");
    aNum = b(aNum, "+-3^+b+-f");
    aNum ^= Number(e[1]) || 0;
    0 > aNum && (aNum = (aNum & 2147483647) + 2147483648);
    aNum %= 1E6;
    return aNum.toString() + "." + (aNum ^ h);
};

async function test(tl) {
    const cleanText = "rond";
    const url = `https://translate.googleapis.com/translate_a/single?client=webapp&sl=nl&tl=${tl}&hl=${tl}&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&q=${encodeURIComponent(cleanText)}&tk=${getTk(cleanText)}`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(`\n\n--- tl=${tl} ---`);
    console.log(JSON.stringify(json.dict, null, 2));
}

async function run() {
    await test("zh-TW");
    await test("en");
}

run();
