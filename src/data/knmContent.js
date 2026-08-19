export const KNM_SECTIONS = [
    {
        id: 'exam',
        nav: '改制',
        title: '考試怎麼考',
        kicker: '2025.7.1 考綱',
        facts: [
            { label: '題型', value: '40 題影片情境' },
            { label: '時間', value: '45 分鐘' },
            { label: '及格', value: '28 題（70%）' },
        ],
        blocks: [
            {
                type: 'p',
                text: '2025 年 7 月 1 日起，KNM 從「你該怎麼做」改考「你知道什麼事實」。舊考綱用了十年，常被批評對移民說教、帶刻板印象。',
            },
            {
                type: 'compare',
                left: { title: '舊：行為規範', items: ['同事生日該不該祝賀', 'Gedragsregels'] },
                right: { title: '新：事實知識', items: ['國法是否高於宗教規章', 'Feitelijke kennis'] },
            },
            {
                type: 'list',
                title: '五大新考點',
                items: [
                    {
                        lead: '大屠殺與反猶',
                        body: '納粹佔領荷蘭期間約 10.4 萬猶太人遇害（如 Anne Frank）。在荷蘭，反猶與歧視是違法行為。',
                    },
                    {
                        lead: '女性自主',
                        body: '女性可自由工作、選擇配偶、決定是否／何時生育，並可隨時離婚。家庭成員強迫皆違法。',
                    },
                    {
                        lead: '法律永遠優先',
                        body: '宗教或文化規則與國法衝突時，國法優先。例如禁止童婚、強迫婚姻、女性割禮。',
                    },
                    {
                        lead: 'DigiD',
                        body: '登入政府、稅務、學貸網站的唯一帳號。密碼不可給任何人（含配偶、家人、會計師）。政府不會主動問密碼。',
                    },
                    {
                        lead: 'POH 醫護助理',
                        body: '家醫診所內的專業助理：慢性病追蹤（糖尿病、高血壓）與初期心理諮詢，無需額外掛號費。',
                    },
                ],
            },
        ],
    },
    {
        id: 'routes',
        nav: '融入',
        title: '三大融入途徑',
        kicker: 'Wi2021',
        blocks: [
            {
                type: 'p',
                text: '2021 年新融入法依能力把人分到三條路。MAP 與 PVT 是強制模組。',
            },
            {
                type: 'cards',
                items: [
                    {
                        title: '教育途徑 O-route',
                        meta: '想升學',
                        rows: [
                            '銜接 MBO、HBO 或大學 WO',
                            '荷語 B1 或 B2，含語言銜接課 Taalschakeltraject（學術荷語、數學等）',
                            '學歷通常須等同 HAVO-5 或 MBO-4（IDW 評估）',
                        ],
                    },
                    {
                        title: 'B1 途徑 B1-route',
                        meta: '標準求職',
                        rows: [
                            '儘快就業、參與社會',
                            '目標荷語 B1；合格學校上滿 600 小時仍未達標，經市鎮廳同意可降考 A2',
                            '必修 MAP',
                        ],
                    },
                    {
                        title: '自立途徑 Z-route',
                        meta: '完成制，不考電腦試',
                        rows: [
                            '學習困難或高齡者',
                            '難民：至少 800 小時語言／KNM 課 + 800 小時社會參與（志工或實習）',
                            '市鎮廳最終面談 Eindgesprek 通過即發證',
                        ],
                    },
                ],
            },
            {
                type: 'list',
                title: '兩個強制模組',
                items: [
                    {
                        lead: 'MAP',
                        body: '勞動市場與參與：職涯定位、履歷、面試、實習或志工。Wi2021 適用者免費；逾期未完成罰 €340。',
                    },
                    {
                        lead: 'PVT',
                        body: '參與宣言：學平等、自由、法治並簽署。Wi2021 須在 3 年內完成。',
                    },
                ],
            },
        ],
    },
    {
        id: 'health',
        nav: '醫療',
        title: '醫療與保險',
        kicker: '約 7–9 題',
        blocks: [
            {
                type: 'p',
                text: '這是題量最大的一章。核心：家醫是守門員，沒轉介信看不成專科。',
            },
            {
                type: 'list',
                title: '家庭醫師 Huisarts',
                items: [
                    {
                        lead: '先看家醫',
                        body: '除立即命危外，感冒、心理諮商、懷孕都先預約 huisarts。',
                    },
                    {
                        lead: '轉介信 Verwijsbrief',
                        body: '看醫院專科（皮膚科、心臟科等）必須有家醫轉介信，否則醫院不收、保險不賠。',
                    },
                    {
                        lead: '一人一位',
                        body: '只能登記一位家醫，且須住在其服務區。搬家後要自己找新家醫登記。',
                    },
                ],
            },
            {
                type: 'phones',
                items: [
                    { num: '112', when: '危及生命：心臟病發、嚴重車禍、火災、正在發生的暴力犯罪' },
                    { num: 'HAP', when: '下班後／週末：不能等但非命危，如半夜高燒、嚴重嘔吐' },
                    { num: '0900-8844', when: '一般非緊急報警' },
                ],
            },
            {
                type: 'list',
                title: '藥與保險',
                items: [
                    {
                        lead: 'Apotheek vs Drogist',
                        body: '處方藥去藥局 Apotheek 憑醫囑領；止痛藥等成藥可在藥妝店 Drogist 買。',
                    },
                    {
                        lead: '基礎保險',
                        body: '18 歲以上強制買 Basisverzekering；18 歲以下隨父母免費加保。',
                    },
                    {
                        lead: '自負額 €385',
                        body: '2025 年標準每年 €385。醫院與處方藥算入；家醫看診、孕產照護、18 歲以下醫療不算。',
                    },
                    {
                        lead: '牙醫',
                        body: '成人牙醫不在基礎險，需附加險或自費。',
                    },
                    {
                        lead: '產後照護 Kraamzorg',
                        body: '出生後前 8 天，保險給付專業助理到府。須在懷孕五個月前申請。',
                    },
                ],
            },
        ],
    },
    {
        id: 'work',
        nav: '工作',
        title: '工作、收入與津貼',
        kicker: '誰負責什麼',
        blocks: [
            {
                type: 'list',
                title: '勞動契約',
                items: [
                    { lead: 'Vast 不定期', body: '無結束日，最有保障，最難解僱。' },
                    { lead: 'Tijdelijk 定期', body: '有明確期限。連續 3 份定期後，第 4 份必須轉不定期。' },
                    { lead: 'Oproep 臨時', body: '隨叫隨到（含 0 小時約），保障最少。' },
                    { lead: 'Vakantiegeld', body: '每年 5 月加發基本年薪的 8%。' },
                    { lead: '最低時薪', body: '2025 年起 21 歲以上約 €14.06／小時。' },
                ],
            },
            {
                type: 'dl',
                title: '機構速記（最愛考）',
                rows: [
                    { k: '失業金 WW、病假金、殘障金 WIA', v: 'UWV' },
                    { k: '老人年金 AOW、兒童津貼 Kinderbijslag', v: 'SVB' },
                    { k: '所得稅、四大津貼', v: 'Belastingdienst' },
                    { k: '護照、駕照、垃圾、地址變更', v: 'Gemeente' },
                    { k: '自雇／創業登記', v: 'KvK' },
                ],
            },
            {
                type: 'callout',
                text: '失業金不會自動發。須在失業前一週至失業後一週內，用 DigiD 到 UWV 網站主動申請。',
            },
            {
                type: 'list',
                title: '四大津貼 Toeslagen',
                items: [
                    { lead: 'Zorgtoeslag', body: '健保津貼，補助低收入者保費。' },
                    { lead: 'Huurtoeslag', body: '房租津貼，多為社會住宅且收入低者。' },
                    { lead: 'Kinderopvangtoeslag', body: '托兒津貼，雙薪或求學家長，最高可補助 96%。' },
                    { lead: 'Kindgebonden budget', body: '低收入家庭的額外兒童預算。' },
                ],
            },
            {
                type: 'callout',
                text: '收入越高，津貼越少。收入大幅增加必須立刻向稅務局申報，否則年底要退溢領，還可能罰款。',
            },
        ],
    },
    {
        id: 'home',
        nav: '住房',
        title: '住房與鄰里',
        kicker: '社會住宅 · 垃圾 · 安靜時段',
        blocks: [
            {
                type: 'list',
                items: [
                    {
                        lead: '社會住宅',
                        body: '2025 年月租上限約 €880，有收入上限，平均等 5–15 年。',
                    },
                    {
                        lead: '誰修什麼',
                        body: '房東：屋頂、暖氣、熱水器等結構。租客：燈泡、清溝等小維修。',
                    },
                    {
                        lead: '糾紛',
                        body: '先跟房東講；無效可找房租委員會 Huurcommissie 免費仲裁。',
                    },
                    {
                        lead: '搬家報址',
                        body: '5 個工作日內向新市政府申報地址，否則最高罰 €325。',
                    },
                    {
                        lead: '市政稅',
                        body: 'Gemeentebelasting 付垃圾、污水、路燈，金額看房產估值 WOZ。',
                    },
                ],
            },
            {
                type: 'chips',
                title: '垃圾分類',
                items: ['GFT 廚餘／綠桶', 'PMD 塑膠金屬／橘袋', '紙類／藍桶', '玻璃', '大型垃圾預約或送 Milieustraat'],
            },
            {
                type: 'callout',
                text: '晚上 10 點到早上 7 點是 Nachtrust 安靜時間。鄰居太吵：先平靜溝通，不要直接報警。',
            },
        ],
    },
    {
        id: 'school',
        nav: '教育',
        title: '教育分流',
        kicker: '12 歲分流',
        blocks: [
            {
                type: 'list',
                items: [
                    {
                        lead: '義務教育',
                        body: '5–16 歲強制上學。16–18 歲若還沒有起步文憑 Startkwalificatie（HAVO、VWO 或 MBO-2），須繼續讀。',
                    },
                    {
                        lead: '不准無故請假',
                        body: '不可為了提前出國旅遊讓孩子缺課，義務教育官員 Leerplichtambtenaar 會開罰單。',
                    },
                ],
            },
            {
                type: 'cards',
                items: [
                    { title: 'VMBO · 4 年', meta: '職業中學', rows: ['畢業銜接 MBO'] },
                    { title: 'HAVO · 5 年', meta: '普通中學', rows: ['畢業銜接 HBO 應用大學'] },
                    { title: 'VWO · 6 年', meta: '大學預備', rows: ['畢業銜接 WO 研究型大學'] },
                ],
            },
            {
                type: 'p',
                text: 'MBO 分 1–4 級，只有 MBO Niveau 4 能升 HBO。HBO 偏實務，WO 偏學術；進 WO 通常要 VWO 或已有 HBO 學位。',
            },
        ],
    },
    {
        id: 'state',
        nav: '政治',
        title: '國家與權利',
        kicker: '三權分立',
        blocks: [
            {
                type: 'p',
                text: '政體是憲政君主制加議會民主。國王是國家元首、簽署法律但無實權；首相是行政首長。',
            },
            {
                type: 'dl',
                title: 'Trias Politica',
                rows: [
                    { k: '立法 · 國會 Staten-Generaal', v: '下議院 Tweede Kamer 150 席直選（權力最大）；上議院 Eerste Kamer 75 席由省議會選出，做技術審查' },
                    { k: '司法 · 法官 Rechter', v: '獨立公正。只有法官能定刑責，警察與部長不行' },
                    { k: '行政 · 政府 Regering', v: '國王 + 內閣；實權在首相與各部部長' },
                ],
            },
            {
                type: 'list',
                items: [
                    { lead: '憲法第一條', body: '人人平等，禁止歧視。' },
                    { lead: '選舉權', body: '18 歲以上荷蘭籍。Actief = 去投票；Passief = 可被選。外國人住滿 5 年可投市議會 Gemeenteraad。' },
                ],
            },
        ],
    },
    {
        id: 'history',
        nav: '史地',
        title: '歷史與地理',
        kicker: '必考數字與日期',
        blocks: [
            {
                type: 'map',
            },
            {
                type: 'list',
                items: [
                    { lead: '地理', body: '12 省。首都阿姆斯特丹（Noord-Holland），政府在海牙 Den Haag（Zuid-Holland）。約 1/4 領土低於海平面，靠三角洲工程 Deltawerken 防洪。Randstad（阿姆、鹿特丹、海牙、烏特勒支一帶）住了約一半人口。' },
                    { lead: '黃金時代', body: '17 世紀靠全球貿易（VOC 東印度公司）致富，藝術（林布蘭）也到巔峰。' },
                    { lead: '殖民', body: '印尼與蘇利南曾是殖民地，現已獨立。荷蘭曾深度參與大西洋奴隸貿易。' },
                ],
            },
            {
                type: 'dl',
                title: '節日',
                rows: [
                    { k: '4 月 27 日', v: '國王節 Koningsdag，全國穿橘' },
                    { k: '5 月 4 日', v: '追思日 Dodenherdenking，晚 8 點全國默哀兩分鐘' },
                    { k: '5 月 5 日', v: '解放日 Bevrijdingsdag，紀念 1945 年二戰結束' },
                    { k: '12 月 5 日', v: '聖尼古拉斯節 Sinterklaas，給小孩禮物' },
                ],
            },
        ],
    },
    {
        id: 'tips',
        nav: '備考',
        title: '備考筆記',
        kicker: '考場節奏',
        blocks: [
            {
                type: 'list',
                items: [
                    { lead: '單字', body: '閱讀聽力成敗在字彙。生字連句子一起抄，記語境。' },
                    { lead: '新聞', body: '每天看 NOS journaal in makkelijke taal，練聽力也補社會事實。' },
                    { lead: '考古題', body: '考前一個月刷完。影片和音檔聽完再答，避免陷阱。' },
                    { lead: '節奏', body: '聽力閱讀時間通常夠。不確定先標記 Markering，全部寫完再回頭。' },
                ],
            },
            {
                type: 'p',
                text: '荷蘭強調法治、平等與責任。這些不只是考點，也是之後申請津貼、看醫生、談勞動契約會用到的權利。',
            },
        ],
    },
]
