/* === 0. Пользователи ===================== */
const USERS = [
  {login:"admin",     password:"NewAdmPassword123!"},
  {login:"Юлия",      password:"NewYuliaPass456!"},
  {login:"Руслан",    password:"NewRuslanPass789!"},
  {login:"Ольга",     password:"NewOlgaPass321!"},
  {login:"Екатерина", password:"NewEkaterinaPass654!"},
  {login:"Manager6",  password:"NewManager6Pass987!"},
  {login:"Manager7",  password:"NewManager7Pass135!"},
  {login:"Manager8",  password:"NewManager8Pass246!"},
  {login:"Manager9",  password:"NewManager9Pass369!"},
  {login:"Manager10", password:"NewManager10Pass147!"}
];

/* === 1. Аутентификация ==================== */
function authenticate(){
  const login    = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value.trim();
  const errBox   = document.getElementById('auth-error');

  const ok = USERS.some(u=>u.login===login && u.password===password);
  if(!ok){
    errBox.style.display='block';
    return;
  }

  // успех
  errBox.style.display='none';
  localStorage.setItem('houseCalcUser', login);

  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('calc-container').classList.remove('hidden');

  // твоя «первая инициализация» формы
  handleTypeChange();       // размеры и т.п.
}

/* === 2. Выход ============================= */
function logout(){
  localStorage.removeItem('houseCalcUser');
  location.reload();        // перезагрузить страницу – достаточно
}

/* === 3. Автовход при перезагрузке ========= */
window.addEventListener('DOMContentLoaded', ()=>{
  if(localStorage.getItem('houseCalcUser')){
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('calc-container').classList.remove('hidden');
    handleTypeChange();
  }
});


/* ------------------------------------------------------------------
   0. Утилита форматирования цен с точкой
------------------------------------------------------------------ */
function formatPrice(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/* --- 0a. Комиссия и округление --- */
const COMM = 0.10;                                  // 10%

// Брутто (с комиссией), для любых сумм/м²/шт:
const grossInt = x => Math.round(x * (1 + COMM));

// Брутто для доставки с округлением вверх к 50 ₽:
const gross50  = x => Math.ceil((x * (1 + COMM)) / 50) * 50;

/* Преобразовать текст метки с ценой в скобках → показать с комиссией.
   Меняет каждое число «… ₽» внутри строки на «… ₽» с нашей наценкой. */
function labelGross(text){
  return text.replace(/(\d[\d\s.]*)\s*₽/g, (_, num) => {
    const n   = parseInt(String(num).replace(/[^\d]/g, ''), 10) || 0;
    const brut= grossInt(n);
    return `${formatPrice(brut)} ₽`;
  });
}

/* --- высота стен и площадь стен -------------------------------- */
function getWallHeight(type, roof, ext = false) {
  // прибавка, введённая пользователем (см)
  const extraHcm = +inpExtraH.value || 0;
  const addM     = extraHcm / 100;              // переводим в метры

  // базовая высота (м)
  let h;
  if (type === "house") {
    // у ломаной крыши внутри чуть ниже, снаружи – по стойке
    h = (roof === "lom")
        ? (ext ? 2.4 : 2.3)   // наружные стены 2 ,4 м, внутренние 2 ,3 м
        : 2.4;                // двускатная – 2 ,4 м везде
  } else {
    h = 2.1;                  // бытовка / хозблок
  }

  return +(h + addM).toFixed(2);  // итоговое число, например 2.30
}




function wallArea(w, l, h){ return 2 * (w + l) * h; }  // 2*(W+L)*H

/* ------------------------------------------------------------------
   1. Основные константы
------------------------------------------------------------------ */
function getLabel(opt) {
  return opt.text.replace(/\s*\([^)]*₽[^)]*\)/g, "").trim();
}

// Базовые тарифы
const RATE    = { lom:{ base:10450 }, gable:{ base:13750 } };
const DELIV = {
  "6x4": 180,                 // 1-я группа
  "6x5": 200, "6x6": 200, "6x7": 200,   // 2-я группа
  "6x8": 300, "6x9": 300, "6x10": 300,  // 3-я группа
  "8x8": 300, "9x8": 300                // большие
};
const MAX_KM = 250;      // лимит: 250 км от МКАД
const DEPOT = [55.621800, 37.441432];   // точка отгрузки (обычная линейка)
const DEPOT_ECONOMY = [55.443806, 37.296654];   // точка отгрузки (эконом-линейка)

// Опции по площади
const INSUL   = { roll100:550, min150:2000, rock100:1000, basalt150:4000 };
const ROOFMAT = { galv:0, ondulin:0, profColor:750, tile_lom:800, tile_gable:1200 };
const VERANDA = { verRoof:7500, verGable:9000 };

function getHoblokBasePrice(w, l){
  const key = `${w}x${l === 2.5 ? 3 : l}`;
  return CONFIG.hoblok.basePrice[key] || 0;   // просто «голый» хозблок
}

// Внутренняя отделка
const INREP = {
  osb_vag:120,
  osb_imit:350,
  vag_imitBC:250,
  vag_imitA:400,
  vag_block:1000,
  osb_vagA:500,
  vag_vagA:380,
  osb_block:1120
};
INREP['none'] = 0;  // базовая ОСБ-3
const OSB_PLAIN = 500;   // цена 1 м² простой ОСБ-3, меняйте здесь
// ------------------------------------------------------------------
// Площадь ОСБ для хозблока (стены + потолок), округление к 3 м² вверх
// ------------------------------------------------------------------
function getOsbArea(w, l) {
  const h = getWallHeight("hoblok", "lom", false);   // у хозблока всегда односкат
  const walls = wallArea(w, l, h);
  const ceil  = w * l;
  return Math.ceil((walls + ceil) / 3) * 3;          // шаг 3 м²
}

// Внешняя отделка
const OUTREP = {
  vag_ext:500,
  imitBC_ext:250,
  block_ext:1000,
  osb_extA:500,
  vag_extA:380
};
OUTREP['none'] = 500;  // базовая вагонка B–C

const FLOOR   = { floor:1000, mouse:400 };
// ▶ цены чистового пола (₽/м²)
const FLOOR_MAT = {
  plain: 0,
  osb: 500,
  board50x150: 1700,
  planed35x140: 1400
};
const FLOOR_CAPT = {
  plain: "Пол: обрезная доска 25×150 мм",
  osb:   "Пол: ОСБ влагостойкий",
  board50x150: "Пол: Шпунт доска чистовой 50×150 мм",
  planed35x140: "Пол: строганая 35×140 мм"
};
const RAMP = 2000; // пандус

// Перегородки
const PART       = { p1:2500, p2:3200, p3:4000 };
const PART_TITLE = {
  p1: "Перегородка односторонняя",
  p2: "Перегородка двусторонняя",
  p3: "Перегородка двусторонняя с утеплением 100 мм"
};

// Сваи
const PILES = {
  "1.5×76":3300, "2.0×76":4000, "2.5×76":4100, "3.0×76":4450,
  "2.0×89":4000, "2.5×89":4400, "3.0×89":4750,
  "2.0×108":4800, "2.5×108":5200, "3.0×108":5500
};
const PILE_COUNT = {
  "6x4":12, "6x5":12, "6x6":16, "6x7":20,
  "6x8":20, "6x9":24, "6x10":26, "8x8":28,
  "9x8":30
};

// ▸ точное количество свай для хозблоков / бытовок (2- и 3-метровая ширина)
const PILE_COUNT_SMALL = {
  "2x2":4,  "2x2.5":4, "2x3":4,
  "2x4":6,  "2x5":6,   "2x6":6,
  "3x2":4,  "3x2.5":4, "3x3":9,
  "3x4":9,  "3x5":9,   "3x6":9,
  /* ---- Ширина 2,5 м --------------------------------------- */
  "2.5x2":4,    "2.5x2.5":4, "2.5x3":4,      // короткие
  "2.5x4":6,    "2.5x5":6,   "2.5x6":6,      // длинные
 
  /* зеркальные варианты (когда 2,5 м — длина, а не ширина) */
  "2x2.5":4,
  "3x2.5":6,    "4x2.5":6,   "5x2.5":6, "6x2.5":6
};
// ▸ вернуть «правильное» количество свай по типу и размеру
function getPileCount(type, w, l) {
  // НОРМАЛИЗУЕМ ширины 2.1 → 2.0 и 2.3 → 2.5 (для совпадения с табличными ключами)
  const norm = v => (v === 2.1 ? 2.0 : (v === 2.3 ? 2.5 : v));
  const wn = norm(w);
  const ln = norm(l);

  // две записи одного и того же размера – «3x4» и «4x3»
  const k1 = `${wn}x${ln}`;
  const k2 = `${ln}x${wn}`;

  // ── хозблок / бытовка ─────────────────────────────
  if (type !== "house") {
    if (PILE_COUNT_SMALL[k1] !== undefined) return PILE_COUNT_SMALL[k1];
    if (PILE_COUNT_SMALL[k2] !== undefined) return PILE_COUNT_SMALL[k2];
  }

  // ── каркасный дом ─────────────────────────────────
  if (PILE_COUNT[k1] !== undefined) return PILE_COUNT[k1];
  if (PILE_COUNT[k2] !== undefined) return PILE_COUNT[k2];

  // ── на всякий случай ─────────────────────────────
  return 12;        // «безопасный» дефолт
}



// Окна ПВХ / двери ПВХ (стандартная линейка)
const WINDOWS = {
  "50×50":{1:5500, 2:7000},
  "60×90":{1:7500},
  "60×120":{1:10000},
  "60×180":{1:12000,2:17000},
  "100×100":{1:9000},
  "100×120":{1:11000,2:14000},
  "120×120":{1:13000},
  "100×140":{1:14000},
  "100×150":{1:15000},
  "120×150":{1:16500},
  "140×150":{1:17000},
  "150×150":{1:17500},
  "150×100":{1:15000},
  "150×180":{2:25000},
  "150×190":{1:25000},
  "180×190":{1:26000},
  "90×205 дверь ПВХ":{2:35000}
};
const WOOD_PRICES = {
  win: {                // окна
    "60×90": 2000,
    "80×80": 3000,
    "100×100": 3500
  },
  door: {               // двери
    std:        2000,   // обычная
    hinge:      2000,   // распашная
    hingeWarm:  3000,    // распашная утеплённая
    filen:      6000   
  }
};
const METAL_PRICES = {
  rf:         12000,   // Дверь РФ
  rfThermo:   30000,   // РФ с терморазрывом
  thermoLux:  35000    // Термо Люкс
};

// Цены для эконом-линейки (из прайса + 10%)
const ECONOMY_WINDOWS = {
  // Окна ПВХ (из прайса + 10%)
  "40×40": {1: 4950},      // 4500 + 10%
  "60×90": {1: 6050},      // 5500 + 10%
  "970×1160": {1: 10450},  // 9500 + 10%
  "1500×1800": {1: 18150}, // 16500 + 10%
  "1800×1800": {1: 21450}, // 19500 + 10%
  "90×205 дверь ПВХ": {2: 38500} // 35000 + 10%
};

const ECONOMY_WOOD_PRICES = {
  win: {                // окна деревянные (из прайса + 10%)
    "55×80": 1100,      // 1000 + 10%
    "30×30": 550        // 500 + 10%
  },
  door: {               // двери (из прайса + 10%)
    wooden_set: 3300,      // деревянная наборная 75×175 (3000 + 10%)
    wooden_swing: 5500,    // распашная (ширина 160) (5000 + 10%)
    interior_pine: 13200   // межкомнатная сосновая (12000 + 10%)
  }
};

const ECONOMY_METAL_PRICES = {
  metal_rf: 14300       // металлическая РФ (13000 + 10%)
};

/* ------------------------------------------------------------------
   2. Конфиг для трёх типов строений
------------------------------------------------------------------ */

// Конфигурация веранд на основе прайса (цены УЖЕ с наценкой 10%)
const VERANDA_CONFIG = {
  // Хозблоки с верандами
  hoblok: {
    '3x3': { main: '3x2', veranda: '3x1', price: 89100 }, // 81000 + 10%
    '4x3': { main: '4x2', veranda: '4x1', price: 102300 }, // 93000 + 10%
    '4x4': { main: '4x2', veranda: '4x2', price: 134200 }, // 122000 + 10%
    '4x4_alt': { main: '4x3', veranda: '4x1', price: 148500 }, // 135000 + 10%
    '5x3': { main: '5x2', veranda: '5x1', price: 128700 }, // 117000 + 10%
    '5x4': { main: '5x2', veranda: '5x2', price: 141900 }, // 129000 + 10%
    '5x5': { main: '5x3', veranda: '5x2', price: 207900 }, // 189000 + 10%
    '5x5_alt': { main: '5x2.5', veranda: '5x2.5', price: 201300 }, // 183000 + 10%
    '6x3': { main: '6x2', veranda: '6x1', price: 128700 }, // 117000 + 10%
    '6x4': { main: '6x3', veranda: '6x1', price: 172700 }, // 157000 + 10%
    '6x4_alt': { main: '6x2', veranda: '6x2', price: 141900 }, // 129000 + 10%
    '6x4.5': { main: '6x2.5', veranda: '6x2', price: 213400 }, // 194000 + 10%
    '6x5': { main: '6x3', veranda: '6x2', price: 221100 }, // 201000 + 10%
    '6x6': { main: '6x3', veranda: '6x3', price: 258500 }, // 235000 + 10%
    '6x6_alt': { main: '6x4', veranda: '6x2', price: 323400 } // 294000 + 10%
  },
  // Бытовки с верандами
  bytovka: {
    '3x3': { main: '3x2', veranda: '3x1', price: 95700 }, // 87000 + 10%
    '4x3': { main: '4x2', veranda: '4x1', price: 107800 }, // 98000 + 10%
    '4x4': { main: '4x2', veranda: '4x2', price: 140800 }, // 128000 + 10%
    '4x4_alt': { main: '4x3', veranda: '4x1', price: 152900 }, // 139000 + 10%
    '5x3': { main: '5x2', veranda: '5x1', price: 133100 }, // 121000 + 10%
    '5x4': { main: '5x2', veranda: '5x2', price: 145200 }, // 132000 + 10%
    '5x5': { main: '5x3', veranda: '5x2', price: 235400 }, // 214000 + 10%
    '5x5_alt': { main: '5x2.5', veranda: '5x2.5', price: 213400 }, // 194000 + 10%
    '6x3': { main: '6x2', veranda: '6x1', price: 136400 }, // 124000 + 10%
    '6x4': { main: '6x3', veranda: '6x1', price: 183700 }, // 167000 + 10%
    '6x4_alt': { main: '6x2', veranda: '6x2', price: 154000 }, // 140000 + 10%
    '6x4.5': { main: '6x2.5', veranda: '6x2', price: 225500 }, // 205000 + 10%
    '6x5': { main: '6x3', veranda: '6x2', price: 232100 }, // 211000 + 10%
    '6x6': { main: '6x3', veranda: '6x3', price: 271700 }, // 247000 + 10%
    '6x6_alt': { main: '6x4', veranda: '6x2', price: 341000 } // 310000 + 10%
  }
};

const CONFIG = {
  hoblok: {
    widths:[2,2.1,2.3,2.5,3,4],       // добавили 2.1 и 2.3; убрали 5 и 6
    lengths:[2,2.5,3,4,5,6,7,8],      // добавили 7 и 8
    basePrice:{
      "2x2":52800,"3x2":58300,"4x2":64900,"5x2":73700,"6x2":78100,
      "3x3":68200,"4x3":82500,"5x3":93500,"6x3":99000
    },
    delivery:{ perKm1:80, perKm2:140, min:5000 },
    verandaPrice:7500
  },
  bytovka: {
    widths:[2,2.1,2.3,2.5,3,4],       // добавили 2.1 и 2.3; убрали 5 и 6
    lengths:[2,2.5,3,4,5,6,7,8],      // добавили 7 и 8

    basePrice:{
      "2x2":70400,"3x2":79200,"4x2":89100,"5x2":99000,"6x2":103400,
      "3x3":95700,"4x3":108900,"5x3":136400,"6x3":139700
    },
    delivery:{ perKm1:100, perKm2:180, min:6000 },
    verandaPrice:7500
  },
  house: {
    widths:[6,7,8,9,10],
    lengths:[4,5,6,7,8,9,10],
    rates: RATE,
    deliv: DELIV
  },
  // НОВАЯ ЭКОНОМ-ЛИНЕЙКА (цены из прайса)
  hoblok_economy: {
    widths:[2,2.2,2.5,3,4,5,6,7],
    lengths:[2,2.2,2.5,2.7,3,4,5,6],
    basePrice:{
      // Хозблоки (внутри без отделки и утепления; 1 окно) - цены из прайса + 10%
      "2x2":30800,"2x2.2":33000,"2x2.5":48400,
      "3x2":40700,"3x2.2":44000,"3x2.5":56100,"3x3":64900,
      "4x2":46200,"4x2.2":49500,"4x2.5":64900,"4x3":77000,"4x4":116600,
      "5x2":51150,"5x2.2":54450,"5x2.5":73700,"5x3":97900,"5x4":152900,
      "6x2":54450,"6x2.2":56650,"6x2.5":78100,"6x2.7":96800,"6x3":100100,"6x4":158400,
      "7x2":78100,"7x2.2":82500,"7x2.5":93500,"7x3":118800
    },
    // Хозблоки с верандой спереди (цены из прайса + 10%)
    verandaPrice:{
      "3x3":89100,"4x3":102300,"4x4":134200,"4x4_alt":148500,
      "5x3":128700,"5x4":141900,"5x5":207900,"5x5_alt":201300,
      "6x3":128700,"6x4":172700,"6x4_alt":141900,"6x4.5":213400,
      "6x5":221100,"6x6":258500,"6x6_alt":323400
    },
    delivery:{ perKm:130, min:7000, assembly:7000 },
    // Сваи для эконом-линейки
    svai: {
      // Рекомендуемое количество свай по размерам
      recommendations: {
        "2x2": 4, "2x2.2": 4, "2x2.5": 6,
        "3x2": 4, "3x2.2": 4, "3x2.5": 6, "3x3": 6,
        "4x2": 4, "4x2.2": 4, "4x2.5": 6, "4x3": 6, "4x4": 6,
        "5x2": 6, "5x2.2": 6, "5x2.5": 9, "5x3": 9, "5x4": 9,
        "6x2": 6, "6x2.2": 6, "6x2.5": 9, "6x3": 9, "6x4": 9,
        "7x2": 6, "7x2.2": 6, "7x2.5": 9, "7x3": 9
      },
      // Цены на сваи
      prices: {
        "76x150": 4400,  // Ø76×1,5 м
        "76x200": 4900,  // Ø76×2,0 м
        "89x200": 5500,  // Ø89×2,0 м
        "89x250": 5900,  // Ø89×2,5 м
        "89x300": 6500   // Ø89×3,0 м
      }
    },
    isEconomy: true
  },
bytovka_economy: {
  widths:[2,2.2,2.5,3,4,5,6,7],
  lengths:[2,2.2,2.4,2.5,2.7,3,4,5,6],
  basePrice:{
    // Бытовки (утепление 50 мм стены+пол; внутри оргалит; 1 окно) - ЦЕНЫ С НАЦЕНКОЙ 10%
    "2x2":37400,"2x2.2":40700,"2x2.5":53900,
    "3x2":47850,"3x2.2":51150,"3x2.5":67100,"3x3":72600,
    "4x2":54450,"4x2.2":57750,"4x2.5":73700,"4x3":81400,"4x4":127600,
    "5x2":57200,"5x2.2":60500,"5x2.5":80300,"5x3":105600,"5x4":159500,
    "6x2":62590,"6x2.2":65450,"6x2.5":84150,"6x2.7":104500,"6x3":113300,"6x4":166100,
    "7x2":82500,"7x2.2":88000,"7x2.4":95700,"7x2.5":99000,"7x3":124300
  },
  // Бытовки с верандой спереди (с наценкой 10%)
  verandaPrice:{
    "3x3":95700,"4x3":107800,"4x4":140800,"4x4_alt":152900,
    "5x3":133100,"5x4":145200,"5x5":235400,"5x5_alt":213400,
    "6x3":136400,"6x4":183700,"6x4_alt":154000,"6x4.5":225500,
    "6x5":232100,"6x6":271700,"6x6_alt":341000
  },
  delivery:{ perKm:130, min:7000, assembly:7000 },
  // Сваи для эконом-линейки - ТОЧНЫЕ РЕКОМЕНДАЦИИ ИЗ ПРАЙСА
  svai: {
    // Рекомендуемое количество свай по размерам (из прайса)
    recommendations: {
      "2x2": 4, "2x2.2": 4, "2x2.5": 6,
      "3x2": 4, "3x2.2": 4, "3x2.5": 6, "3x3": 6,
      "4x2": 4, "4x2.2": 4, "4x2.5": 6, "4x3": 6, "4x4": 6,
      "5x2": 6, "5x2.2": 6, "5x2.5": 9, "5x3": 9, "5x4": 9,
      "6x2": 6, "6x2.2": 6, "6x2.5": 9, "6x3": 9, "6x4": 9,
      "7x2": 6, "7x2.2": 6, "7x2.4": 6, "7x2.5": 9, "7x3": 9
    },
    // Цены на сваи (с наценкой 10%)
    prices: {
      "76x150": 4840,  // Ø76×1,5 м
      "76x200": 5390,  // Ø76×2,0 м
      "89x200": 6050,  // Ø89×2,0 м
      "89x250": 6490,  // Ø89×2,5 м
      "89x300": 7150   // Ø89×3,0 м
    }
  },
  isEconomy: true
}
};
// цена 1 м² для нестандартных размеров
const NONSTD_RATE = {
  bytovka: 8800,   // ₽/м²
  hoblok:  6050    // ₽/м²
};

// ДОПОЛНИТЕЛЬНЫЕ ОПЦИИ ДЛЯ ЭКОНОМ-ЛИНЕЙКИ (ЦЕНЫ С НАЦЕНКОЙ 10%)
const ECONOMY_EXTRAS = {
  // Утепление потолка 50 мм (фикс-цены по размерам с наценкой 10%)
  ceilingInsulation: {
    "2x2": 1100, "2x2.2": 1100, "2x2.5": 1650,
    "3x2": 2200, "3x2.2": 2200, "3x2.5": 2750, "3x3": 2750,
    "4x2": 3300, "4x2.2": 3300, "4x2.5": 3850, "4x3": 3850, "4x4": 3850,
    "5x2": 4400, "5x2.2": 4400, "5x2.5": 4400, "5x3": 4400, "5x4": 4400,
    "6x2": 4400, "6x2.2": 4400, "6x2.5": 4950, "6x3": 4950, "6x4": 4950,
    "7x2": 5500, "7x2.2": 5500, "7x2.5": 6050, "7x3": 6050
  },
  
  // Перегородки (с дверью наборной или глухие) - с наценкой 10%
  partitions: {
    // Оргалит
    organlit: { "2": 6600, "2.2": 6600, "2.5": 7700, "3": 8250 },
    // ОСП-9
    osb: { "2": 7700, "2.2": 7700, "2.5": 8800, "3": 9900 },
    // Вагонка "С"
    vagonka: { "2": 13200, "2.2": 13200, "2.5": 15950, "3": 16500 },
    // Для хозблоков (односторонняя, без двери)
    hoblok: { "2": 5500, "2.2": 5500, "2.5": 7150, "3": 8250 }
  },
  
  // Внутренняя отделка (стены + потолок, по всему объёму) - с наценкой 10%
  interiorFinish: {
    // ОСП-9
    osb: {
      "2x2": 7700, "2x2.2": 7700, "2x2.5": 9350,
      "3x2": 9900, "3x2.2": 9900, "3x2.5": 12100, "3x3": 14850,
      "4x2": 12650, "4x2.2": 12650, "4x2.5": 14850, "4x3": 16500, "4x4": 16500,
      "5x2": 14300, "5x2.2": 14300, "5x2.5": 16500, "5x3": 19800, "5x4": 22000,
      "6x2": 16500, "6x2.2": 16500, "6x2.5": 18700, "6x3": 20900, "6x4": 27500,
      "7x2": 19250, "7x2.2": 19250, "7x2.5": 20350, "7x3": 26400
    },
    // Вагонка "С"
    vagonka: {
      "2x2": 19800, "2x2.2": 19800, "2x2.5": 23100,
      "3x2": 25300, "3x2.2": 25300, "3x2.5": 28600, "3x3": 30800,
      "4x2": 30800, "4x2.2": 30800, "4x2.5": 34650, "4x3": 36300, "4x4": 36300,
      "5x2": 31900, "5x2.2": 31900, "5x2.5": 36300, "5x3": 39600, "5x4": 44000,
      "6x2": 33000, "6x2.2": 33000, "6x2.5": 38500, "6x3": 42900, "6x4": 52800,
      "7x2": 38500, "7x2.2": 38500, "7x2.5": 43450, "7x3": 48400
    }
  },
  
  // Окна / двери (дополнительные) - с наценкой 10%
  windowsDoors: {
    // Окна деревянные
    woodWindows: { "55x80": 1100, "30x30": 550 },
    // Окна ПВХ (только из прайса)
    pvcWindows: { "40x40": 4950, "60x90": 6050, "970x1160": 10450, "1500x1800": 18150, "1800x1800": 21450 },
    // Двери (только из прайса)
    woodDoors: { 
      "75x175": 3300,      // деревянная наборная 75×175
      "160": 5500          // распашная (ширина 160)
    },
    metalDoors: {
      "rf": 14300          // металлическая РФ
    },
    interiorDoors: {
      "pine": 13200        // межкомнатная сосновая
    }
  },
  
  // Прочее - с наценкой 10%
  misc: {
    "steps": 2200,           // Ступени
    "ramp_75": 3300,         // пандус 75 см
    "ramp_160_180": 5500,    // пандус 160–180 см
    "block_20x20x40": 385,   // блок 20×20×40 (за шт)
    "plate_50x50": 495       // плита 50×50 (за шт)
  },
  
  // Утепление 100 мм (стены/пол/потолок; каркас 40×100) - с наценкой 10%
  insulation100: {
    "2x2": 11000, "2x2.2": 11000, "2x2.5": 13200,
    "3x2": 12100, "3x2.2": 12100, "3x2.5": 14300, "3x3": 14300,
    "4x2": 13200, "4x2.2": 13200, "4x2.5": 15400, "4x3": 15400, "4x4": 15400,
    "5x2": 14300, "5x2.2": 14300, "5x2.5": 16500, "5x3": 16500, "5x4": 16500,
    "6x2": 15400, "6x2.2": 15400, "6x2.5": 17600, "6x3": 17600, "6x4": 17600,
    "7x2": 16500, "7x2.2": 16500, "7x2.5": 18700, "7x3": 18700
  },
  
  // Огнебиозащита - с наценкой 10%
  fireProtection: {
    // Пол
    floor: {
      "2x2": 1650, "2x2.2": 1650, "2x2.5": 1650,
      "3x2": 2200, "3x2.2": 2200, "3x2.5": 2200, "3x3": 2200,
      "4x2": 2750, "4x2.2": 2750, "4x2.5": 2750, "4x3": 2750, "4x4": 4400,
      "5x2": 3300, "5x2.2": 3300, "5x2.5": 3300, "5x3": 3300, "5x4": 4400,
      "6x2": 3850, "6x2.2": 3850, "6x2.5": 3850, "6x3": 3850, "6x4": 5500,
      "7x2": 4950, "7x2.2": 4950, "7x2.5": 4950, "7x3": 4950
    },
    // Каркас
    frame: {
      "2x2": 3850, "2x2.2": 3850, "2x2.5": 3850,
      "3x2": 4400, "3x2.2": 4400, "3x2.5": 4400, "3x3": 4400,
      "4x2": 4950, "4x2.2": 4950, "4x2.5": 4950, "4x3": 4950, "4x4": 0, // в подарок
      "5x2": 5500, "5x2.2": 5500, "5x2.5": 5500, "5x3": 5500, "5x4": 0, // в подарок
      "6x2": 5500, "6x2.2": 5500, "6x2.5": 5500, "6x3": 5500, "6x4": 0, // в подарок
      "7x2": 6600, "7x2.2": 6600, "7x2.5": 6600, "7x3": 6600
    }
  },
  
  // Паро- и ветроизоляция (по кругу) - с наценкой 10%
  vaporBarrier: {
    "2x2": 2750, "2x2.2": 2750, "2x2.5": 2750,
    "3x2": 4400, "3x2.2": 4400, "3x2.5": 4400, "3x3": 4400,
    "4x2": 5500, "4x2.2": 5500, "4x2.5": 5500, "4x3": 5500, "4x4": 5500,
    "5x2": 6050, "5x2.2": 6050, "5x2.5": 6050, "5x3": 6050, "5x4": 6050,
    "6x2": 7150, "6x2.2": 7150, "6x2.5": 7150, "6x3": 7150, "6x4": 7150
  }
};


// Функция для обновления рекомендаций по сваям для эконом-линейки
function updateSvaiRecommendation() {
  const type = selType.value;
  const cfg = CONFIG[type];
  if (!cfg.isEconomy) return;
  
  const w = parseFloat(inpWidth.value) || 0;
  const l = parseFloat(inpLength.value) || 0;
  const sizeKey = `${w}x${l}`;
  
  const recommendation = cfg.svai.recommendations[sizeKey];
  const selSvaiType = document.getElementById('selSvaiType');
  if (selSvaiType && recommendation) {
    // Обновляем опции свай с количеством
    const options = selSvaiType.querySelectorAll('option');
    options.forEach(option => {
      if (option.value) {
        const price = option.textContent.match(/— (\d+[\s,]*\d*) ₽/);
        if (price) {
          const totalPrice = parseInt(price[1].replace(/\s/g, '')) * recommendation;
          option.textContent = option.textContent.replace(/— \d+[\s,]*\d* ₽/, `— ${totalPrice.toLocaleString()} ₽ (${recommendation} шт)`);
        }
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────────
// 3. Жёсткие профили отделки по типу и крыше
// ──────────────────────────────────────────────────────────────────
const FINISH_PROFILES = {
  house_lom: {
    inner: [
      ["none",     "— без изменений —"],
      ["osb_vag",  "ОСБ → вагонка B–C (120 ₽/м²)"],
      ["osb_imit", "ОСБ → имитация бруса (350 ₽/м²)"],
      ["osb_vagA", "ОСБ → вагонка A (500 ₽/м²)"],
      ["osb_block","ОСБ → блок-хаус (1120 ₽/м²)"]
    ],
    outer: [
      ["none",      "— без изменений —"],
      ["vag_ext",   "Вагонка B–C (500 ₽/м²)"],
      ["imitBC_ext","Имитация бруса B–C (250 ₽/м²)"],
      ["imitA_ext", "Имитация бруса A (400 ₽/м²)"],
      ["block_ext", "Блок-хаус (1000 ₽/м²)"],
      ["osb_extA",  "Вагонка A (500 ₽/м²)"]
    ]
  },
  house_gable: {
    inner: [
      ["none",      "— без изменений —"],
      ["vag_imitBC","Вагонка → имитация B–C (250 ₽/м²)"],
      ["vag_imitA", "Вагонка → имитация A (400 ₽/м²)"],
      ["vag_block", "Вагонка → блок-хаус (1000 ₽/м²)"],
      ["vag_vagA",  "Вагонка B–C → вагонка A (380 ₽/м²)"]
    ],
    outer: [
      ["none",      "— без изменений —"],
      ["imitBC_ext","Имитация бруса B–C (250 ₽/м²)"],
      ["imitA_ext", "Имитация бруса A (400 ₽/м²)"],
      ["block_ext", "Блок-хаус (1000 ₽/м²)"],
      ["vag_extA",  "Вагонка B–C → вагонка A (380 ₽/м²)"]
    ]
  },
  bytovka_lom: {
    inner: [
      ["none",     "— без изменений —"],
      ["osb_vag",  "ОСБ → вагонка B–C (120 ₽/м²)"],
      ["osb_imit", "ОСБ → имитация бруса (350 ₽/м²)"],
      ["osb_vagA", "ОСБ → вагонка A (500 ₽/м²)"],
      ["osb_block","ОСБ → блок-хаус (1120 ₽/м²)"]
    ],
    outer: [
      ["none",      "— без изменений —"],
      ["vag_ext",   "Вагонка B–C (500 ₽/м²)"],
      ["imitBC_ext","Имитация бруса B–C (250 ₽/м²)"],
      ["imitA_ext", "Имитация бруса A (400 ₽/м²)"],
      ["block_ext", "Блок-хаус (1000 ₽/м²)"],
      ["osb_extA",  "Вагонка A (500 ₽/м²)"],
      ["profGalv", "Профнастил оцинкованный (750 ₽/м²)"]
    ]
  },
    hoblok_lom: {
    inner: [
      ["none",     "— без отделки —"],
      ["osb_only","ОСБ-3 плита"],
      ["osb_vag",  "ОСБ → вагонка B–C (120 ₽/м²)"],
      ["osb_imit", "ОСБ → имитация бруса (350 ₽/м²)"],
      ["osb_vagA", "ОСБ → вагонка A (500 ₽/м²)"],
      ["osb_block","ОСБ → блок-хаус (1120 ₽/м²)"]
    ],
    outer: [
      ["none",       "— без изменений —"],
      ["vag_ext",    "Вагонка B–C (500 ₽/м²)"],
      ["imitBC_ext", "Имитация бруса B–C (250 ₽/м²)"],
      ["imitA_ext",  "Имитация бруса A (400 ₽/м²)"],
      ["block_ext",  "Блок-хаус (1000 ₽/м²)"],
      ["osb_extA",   "Вагонка A (500 ₽/м²)"],
      ["profGalv", "Профнастил оцинкованный (750 ₽/м²)"]
    ]
  },
  
};

// alias для двускатной крыши бытовки и хозблока
FINISH_PROFILES.bytovka_gable = FINISH_PROFILES.bytovka_lom;
FINISH_PROFILES.hoblok_gable  = FINISH_PROFILES.hoblok_lom;


/* ------------------------------------------------------------------
   3. Получаем DOM-элементы
------------------------------------------------------------------ */
const selType      = document.getElementById("selType");
const inpWidth     = document.getElementById("inpWidth");
const inpLength    = document.getElementById("inpLength");
const inpAddr      = document.getElementById("inpAddr");
const btnCalc      = document.getElementById("btnCalc");
const out          = document.getElementById("out");

const chkRamp = document.getElementById("chkRamp");

const selInsul     = document.getElementById("selInsul");
const selRoofMat   = document.getElementById("selRoofMat");
const selInRep     = document.getElementById("selInRep");
const selOutRep    = document.getElementById("selOutRep");
const selFloor   = document.getElementById("selFloor");   // выпадающий список пола
const inpExtraH  = document.getElementById("inpExtraH");  // поле высоты
const chkMouse     = document.getElementById("chkMouse");

const selPart      = document.getElementById("selPart");
const inpPartLen   = document.getElementById("inpPartLen");

const selPile      = document.getElementById("selPile");

const btnAddWindow     = document.getElementById("btnAddWindow");
const windowsContainer = document.getElementById("windowsContainer");
const tmplWindowRow    = document.getElementById("tmplWindowRow");
const roofContainer    = document.getElementById("roofContainer");

const inpVerWidth  = document.getElementById("verWidth");
const inpVerDepth  = document.getElementById("verDepth");
const btnReset     = document.getElementById("btnReset");
const btnClearAddr = document.getElementById("btnClearAddr");


/* ------------------------------------------------------------------
   4. Инициализация Яндекс.Карт и обработчики
------------------------------------------------------------------ */
let map;

// Инициализация карты
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) return;
  
  // Показываем сообщение о загрузке
  mapElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">Загрузка карты...</div>';
  
  // Проверяем загрузку API
  const checkAPI = () => {
    if (typeof ymaps !== 'undefined') {
      try {
        ymaps.ready(() => {
          // Очищаем контейнер
          mapElement.innerHTML = '';
          
          // Создаем карту
          map = new ymaps.Map("map", {
            center: DEPOT,
            zoom: 9,
            controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
          });
          
          // Добавляем маркер базы
          const baseMarker = new ymaps.Placemark(DEPOT, {
            balloonContent: 'Наша база'
          }, {
            preset: 'islands#redDotIcon'
          });
          map.geoObjects.add(baseMarker);
        });
      } catch (error) {
        console.error('Ошибка инициализации карты:', error);
        mapElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">Карта временно недоступна</div>';
      }
    } else {
      // Если API не загружен, ждем еще
      setTimeout(checkAPI, 1000);
    }
  };
  
  // Начинаем проверку
  setTimeout(checkAPI, 1000);
}

// Инициализируем карту
initMap();

// Инициализация веранд при загрузке
updateVerandaOptions();
  // ─── Подсказки адреса, как в тепличном калькуляторе ───────────────────────────
const addrInput   = document.getElementById('inpAddr');
const suggBox     = document.getElementById('suggestions');

addrInput.addEventListener('input', () => {
    const q = addrInput.value.trim();
    if (q.length < 3) {            // меньше 3-х символов — ничего не показываем
        suggBox.style.display = 'none';
        return;
    }

    if (typeof ymaps !== 'undefined') {
      ymaps.geocode(q, { results: 5 }).then(res => {
        const items = res.geoObjects.toArray();
        if (!items.length) {
            suggBox.style.display = 'none';
            return;
        }

        suggBox.innerHTML = '';            // чистим старые
        suggBox.style.display = 'block';

        items.forEach(item => {
            const div  = document.createElement('div');
            div.className = 'suggestion';

            const addr = item.getAddressLine();
            // подчёркиваем найденную часть
            const re   = new RegExp(`(${q})`, 'ig');
            div.innerHTML = addr.replace(re, '<span class="highlight">$1</span>');

            div.onclick = () => {
                addrInput.value      = addr;      // вставляем выбранный адрес
                suggBox.style.display = 'none';   // прячем подсказки
             };

            suggBox.appendChild(div);
        });
      }).catch(err => {
        console.error('geocode error', err);
        suggBox.style.display = 'none';
      });
    }
});

// клик мимо блока — закрываем подсказки
document.addEventListener('click', e => {
    if (!e.target.closest('.address-container')) suggBox.style.display = 'none';
});



  // слушаем события
  selType.addEventListener("change", handleTypeChange);
  document.querySelectorAll('input[name="roof"]').forEach(r=>r.addEventListener("change", handleTypeChange));
  
  // Обработчик для окон/дверей стандартной линейки
  if (btnAddWindow) {
    btnAddWindow.addEventListener("click", addWindowRow);
  }
  
  // Обработчик для эконом-линейки
  const btnAddWindowEconomy = document.getElementById("btnAddWindowEconomy");
  if (btnAddWindowEconomy) {
    btnAddWindowEconomy.addEventListener("click", addWindowRowEconomy);
  }
  
  // Обработчик для перегородок эконом-линейки
  const btnAddPartition = document.getElementById("btnAddPartition");
  if (btnAddPartition) {
    btnAddPartition.addEventListener("click", addPartitionRow);
  }
  
  [inpWidth, inpLength].forEach(el => {
    el.addEventListener("change", populatePileOptions);
    el.addEventListener("change", updateSvaiRecommendation);
    el.addEventListener("change", updateVerandaOptions);
  });
  
  // Обработчик для типа доставки в эконом-линейке
  document.addEventListener('change', function(e) {
    if (e.target.name === 'deliveryType') {
      // Логика доставки обрабатывается в функции calculate()
      // Здесь можно добавить визуальные изменения если нужно
    }
  });
  
  btnCalc.addEventListener("click", calculate);
  btnReset.addEventListener("click", resetFilters);
btnClearAddr.addEventListener("click", clearDelivery);
updateStaticPriceLabels(); 

  handleTypeChange();

// Кнопка «Копировать КП»
const btnCopy = document.getElementById("btnCopy");
btnCopy.addEventListener("click", () => {
  const text = out.innerText;
  if (!text) return alert("Нечего копировать.");
  navigator.clipboard.writeText(text)
    .then(() => {
      btnCopy.textContent = "Скопировано!";
      setTimeout(() => btnCopy.textContent = "Копировать КП", 1500);
    })
    .catch(() => alert("Не удалось скопировать в буфер обмена."));
});

// Функция генерации PDF временно отключена

/**
 * Жёстко заполняет селекты отделки для заданного профиля
 * @param {"hoblok"|"bytovka"|"house"} type
 * @param {"lom"|"gable"} roof
 */
function updateFinishSelects(type, roof) {
  const key     = `${type}_${roof}`;
  const profile = FINISH_PROFILES[key] || {};

  // берём безопасные массивы, даже если чего-то нет
  const inner = profile.inner || [];
  const outer = profile.outer || [];

  // — внутренняя —
  selInRep.innerHTML = "";
  inner.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = labelGross(label);
    selInRep.appendChild(opt);
  });

  // — внешняя —
  selOutRep.innerHTML = "";
  outer.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = labelGross(label);
    selOutRep.appendChild(opt);
  });

  // **Возвращаем default, если нет опций**
  if (inner.length === 0) selInRep.value  = "none";
  if (outer.length === 0) selOutRep.value = "none";

  // если вариантов внутренней отделки нет — прячем label
  if (selInRep?.closest("label")) {
    selInRep.closest("label").style.display =
      inner.length === 0 ? "none" : "";
  }
}

/* ------------------------------------------------------------------
   5. handleTypeChange: обновляем форму при смене типа строения
------------------------------------------------------------------ */
/* Переписать видимые цены в статических селектах/лейблах под нашу наценку */
function updateStaticPriceLabels(){
  // 1) Утепление (селект selInsul)
  Array.from(selInsul.options).forEach(opt => {
    if (opt.value === "none") return;
    const p = INSUL[opt.value];
    if (!p && p!==0) return;
    opt.textContent = opt.textContent.replace(/\(.*?₽\/м²\)/, `(${formatPrice(grossInt(p))} ₽/м²)`);
  });

  // 2) Кровля по площади (selRoofMat)
  Array.from(selRoofMat.options).forEach(opt => {
    const p = ROOFMAT[opt.value] || 0;
    if (p > 0){
      opt.textContent = opt.textContent.replace(/\(.*?₽\/м²\)/, `(${formatPrice(grossInt(p))} ₽/м²)`);
    }
  });

  // 3) Пол (selFloor)
  Array.from(selFloor.options).forEach(opt => {
    const p = FLOOR_MAT[opt.value];
    if (p > 0){
      opt.textContent = opt.textContent.replace(/— .*?₽\/м²\)/, `— ${formatPrice(grossInt(p))} ₽/м²)`);
    }
  });

  // 4) Перегородки (selPart)
  if (selPart) {
    Array.from(selPart.options).forEach(opt => {
      const p = PART[opt.value];
      if (p){
        opt.textContent = opt.textContent.replace(/\(.*?₽\/пог\.м\)/, `(${formatPrice(grossInt(p))} ₽/пог.м)`);
      }
    });
  }

  // 5) Сетка «анти-мышь» (лейбл с чекбоксом #chkMouse)
  const mouseLbl = document.querySelector('label input#chkMouse')?.parentElement;
  if (mouseLbl){
    mouseLbl.innerHTML = mouseLbl.innerHTML.replace(/\(.*?₽\/м²\)/, `(${formatPrice(grossInt(FLOOR.mouse))} ₽/м²)`);
  }

  // 6) Пандус (лейбл с чекбоксом #chkRamp)
  const rampLbl = document.querySelector('label input#chkRamp')?.parentElement;
  if (rampLbl){
    rampLbl.innerHTML = rampLbl.innerHTML.replace(/\(.*?₽\)/, `(${formatPrice(grossInt(RAMP))} ₽)`);
  }

  // 7) Веранда — радио «односкатная/двускатная»
  document.querySelectorAll('input[name="verRoofType"]').forEach(inp => {
    const lbl = inp.closest('label');
    if (!lbl) return;
    const p = VERANDA[inp.value];                  // 7500 / 9000
    lbl.innerHTML = lbl.innerHTML.replace(/\(.*?₽\/м²\)/, `(${formatPrice(grossInt(p))} ₽/м²)`);
  });
}


function handleTypeChange() {
  const type = selType.value;
  const cfg  = CONFIG[type];
  const isEconomy = cfg.isEconomy || false;
  
  console.log('handleTypeChange:', type, 'isEconomy:', isEconomy);

  // текущая крыша
  const roof = document.querySelector('input[name="roof"]:checked').value;
  updateFinishSelects(type, roof);

  // ─── 1) ширина / длина ──────────────────────────────
// 1. Запоминаем, что было выбрано до перерисовки
const prevW = +inpWidth.value || null;
const prevL = +inpLength.value || null;

// 2. Перерисовываем список ширин
let availableWidths, availableLengths;

if (cfg.isEconomy) {
  // Для эконом-линейки берем только те размеры, что есть в basePrice
  availableWidths = [...new Set(Object.keys(cfg.basePrice).map(key => key.split('x')[0]))].sort((a, b) => parseFloat(a) - parseFloat(b));
  availableLengths = [...new Set(Object.keys(cfg.basePrice).map(key => key.split('x')[1]))].sort((a, b) => parseFloat(a) - parseFloat(b));
  
  inpWidth.innerHTML = availableWidths.map(w => `<option>${w}</option>`).join("");
  inpLength.innerHTML = availableLengths.map(l => `<option>${l}</option>`).join("");
} else {
  // Для обычных строений используем все размеры
  availableWidths = cfg.widths;
  availableLengths = cfg.lengths;
  
  inpWidth.innerHTML = cfg.widths.map(w => `<option>${w}</option>`).join("");
  inpLength.innerHTML = cfg.lengths.map(l => `<option>${l}</option>`).join("");
}

// 3. Возвращаем старое значение, если оно есть
if (prevW && availableWidths.includes(prevW.toString())) {
  inpWidth.value = prevW;
} else {
  inpWidth.value = availableWidths[0]; // резерв по-умолчанию
}

// 5. Возвращаем прежнюю длину, если возможно
if (prevL && availableLengths.includes(prevL.toString())) {
  inpLength.value = prevL;
} else {
  inpLength.value = availableLengths[0];
}

// 6. Добавляем слушатель для обновления длин при смене ширины
if (cfg.isEconomy) {
  // Блокируем длину до выбора ширины
  inpLength.disabled = true;
  inpLength.innerHTML = '<option>— выберите сначала ширину —</option>';
  
  inpWidth.addEventListener('change', updateAvailableLengths);
  // Вызываем сразу для установки правильных длин
  updateAvailableLengths();
} else {
  // Для обычных строений разблокируем длину
  inpLength.disabled = false;
}


  // 2) показываем блок «Тип крыши» и меняем подписи
  roofContainer.querySelectorAll("label").forEach(lbl => {
  const inp = lbl.querySelector("input[name='roof']");
  if (!inp) return;
  const gableSurcharge = formatPrice(grossInt(1800)); // 1800 → 1980 ₽/м²
  lbl.childNodes[1].nodeValue = inp.value === "lom"
    ? (type==="house" ? " Ломаная" : " Односкатная (базовая)")
    : (type==="house" ? " Двускатная" : ` Двускатная (+${gableSurcharge} ₽/м²)`);
});


  // 8) сбрасываем остальные селекты и чекбоксы
[selInsul, selRoofMat, selInRep, selOutRep, selPart].forEach(sel => {
  if (!sel) return; // Пропускаем если элемент не найден
  
  // 1. разрешаем все опции
  Array.from(sel.options).forEach(o => o.disabled = false);

  // 2. ставим первое значение
  if (sel.options.length) sel.value = sel.options[0].value;

  // 3. показываем label (если вдруг был скрыт)
  if (sel.closest('label')) {
    sel.closest('label').style.display = 'block';
  }
});

// -------------------------
// уже затем – то, что добавляем
// -------------------------

selFloor.value = "plain";        // базовый пол
chkMouse.checked = chkRamp.checked = false;


// если выбран хозблок – прячем утепление
if (selType.value === 'hoblok' && selInsul) {
  selInsul.value = 'none';                       // ставим «без изменений»
  if (selInsul.closest('label')) {
    selInsul.closest('label').style.display = 'none'; // сам label прячем
  }
} else if (selInsul && selInsul.closest('label')) {
  selInsul.closest('label').style.display = '';  // в остальных строениях показываем
}

// Для эконом-линейки скрываем ВСЕ старые поля
if (isEconomy) {
  // Скрываем ВСЕ старые поля - эконом-линейка работает отдельно
  if (selInRep?.closest('label')) selInRep.closest('label').style.display = 'none';
  if (selOutRep?.closest('label')) selOutRep.closest('label').style.display = 'none';
  const verandaBlock = document.querySelector('.extras--veranda');
  if (verandaBlock) verandaBlock.style.display = 'none';
  const roofBlock = document.querySelector('input[name="roof"]')?.closest('.roof');
  if (roofBlock) roofBlock.style.display = 'none';
  // Скрываем старый блок выбора крыши
  const oldRoofContainer = document.getElementById('roofContainer');
  if (oldRoofContainer) oldRoofContainer.style.display = 'none';
  if (selRoofMat?.closest('label')) selRoofMat.closest('label').style.display = 'none';
  if (selFloor?.closest('label')) selFloor.closest('label').style.display = 'none';
  const heightBlock = document.getElementById('inpExtraH')?.closest('.opt-box');
  if (heightBlock) heightBlock.style.display = 'none';
  if (chkMouse?.closest('label')) chkMouse.closest('label').style.display = 'none';
  
  // Скрываем секцию "Дополнительные опции" для стандартной линейки
  const standardExtrasCards = document.querySelectorAll('.section-card h2');
  standardExtrasCards.forEach(h2 => {
    if (h2.textContent === 'Дополнительные опции' && !h2.textContent.includes('эконом')) {
      h2.closest('.section-card').style.display = 'none';
    }
  });
  
  // Показываем только блок эконом-опций
  const economyExtras = document.getElementById('economyExtras');
  console.log('economyExtras found:', !!economyExtras);
  if (economyExtras) {
    economyExtras.style.display = 'block';
    console.log('economyExtras shown');
  }
  
  // Показываем блок способа доставки для эконом-линейки
  const economyDeliveryOptions = document.getElementById('economyDeliveryOptions');
  if (economyDeliveryOptions) {
    economyDeliveryOptions.style.display = 'block';
  }
  
  // Автоматически заполняем рекомендуемое количество свай
  updateSvaiRecommendation();
  
  // Обновляем варианты веранд
  updateVerandaOptions();
  
  // Обновляем веранды и сваи при смене размеров (только для обычных строений)
  if (!cfg.isEconomy) {
    [inpWidth, inpLength].forEach(el => {
      el.addEventListener("change", () => {
        updateVerandaOptions();
        updateSvaiRecommendation();
      });
      el.addEventListener("input", () => {
        updateVerandaOptions();
        updateSvaiRecommendation();
      });
    });
  }
  
  // Скрываем опции утепления для хозблоков эконом
  if (type === 'hoblok_economy') {
    const insulationOptions = document.querySelectorAll('#chkCeilingInsulation, #chkInsulation100, #chkVaporBarrier');
    insulationOptions.forEach(option => {
      if (option?.closest('label')) {
        option.closest('label').style.display = 'none';
      }
    });
  } else if (type === 'bytovka_economy') {
    // Для бытовок эконом показываем все опции утепления
    const insulationOptions = document.querySelectorAll('#chkCeilingInsulation, #chkInsulation100, #chkVaporBarrier');
    insulationOptions.forEach(option => {
      if (option?.closest('label')) {
        option.closest('label').style.display = '';
      }
    });
  }
} else {
  // Показываем все опции для обычной линейки
  if (selInRep?.closest('label')) selInRep.closest('label').style.display = '';
  if (selOutRep?.closest('label')) selOutRep.closest('label').style.display = '';
  const verandaBlock = document.querySelector('.extras--veranda');
  if (verandaBlock) verandaBlock.style.display = 'block';
  const roofBlock = document.querySelector('input[name="roof"]')?.closest('.roof');
  if (roofBlock) roofBlock.style.display = 'block';
  // Показываем старый блок выбора крыши для обычной линейки
  const oldRoofContainer = document.getElementById('roofContainer');
  if (oldRoofContainer) oldRoofContainer.style.display = 'block';
  if (selRoofMat?.closest('label')) selRoofMat.closest('label').style.display = 'block';
  if (selFloor?.closest('label')) selFloor.closest('label').style.display = 'block';
  const heightBlock = document.getElementById('inpExtraH')?.closest('.opt-box');
  if (heightBlock) heightBlock.style.display = 'block';
  if (chkMouse?.closest('label')) chkMouse.closest('label').style.display = 'block';
  
  // Показываем секцию "Дополнительные опции" для стандартной линейки
  const standardExtrasCards = document.querySelectorAll('.section-card h2');
  standardExtrasCards.forEach(h2 => {
    if (h2.textContent === 'Дополнительные опции' && !h2.textContent.includes('эконом')) {
      h2.closest('.section-card').style.display = 'block';
    }
  });
  
  // Скрываем блок эконом-опций
  const economyExtras = document.getElementById('economyExtras');
  if (economyExtras) economyExtras.style.display = 'none';
  
  // Скрываем блок способа доставки для эконом-линейки
  const economyDeliveryOptions = document.getElementById('economyDeliveryOptions');
  if (economyDeliveryOptions) {
    economyDeliveryOptions.style.display = 'none';
  }
}


  // 9) дополнительные правки по типу строения
  if (type === "house") {
    // selInsul.querySelector('option[value="roll100"]').disabled = true;
  }
  // selRoofMat.querySelector('option[value="galv"]').disabled = true;
  if (type==="house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    selOutRep.querySelector(`option[value="${roof==="lom"?"vag_ext":"imitBC_ext"}"]`).disabled = true;
  } else {
    // selOutRep.querySelector('option[value="vag_ext"]').disabled = true;
  }

  // (перегородки теперь доступны всегда)
  // 10) сброс веранды и обновление свай
  inpVerWidth.value = "";
  inpVerDepth.value = "";
  populatePileOptions();
  updateStaticPriceLabels();
}


/* ------------------------------------------------------------------
   6. populatePileOptions — наполняем селект сваями
------------------------------------------------------------------ */
function populatePileOptions () {
  const type = selType.value;
  const w    = +inpWidth.value;
  const l    = +inpLength.value;

  const cnt  = getPileCount(type, w, l);

  // 👉  для домов Ø76 не показываем
  const skip76 = (type === "house" && cnt > 12);

  if (selPile) {
    selPile.innerHTML = '<option value="">— без свай —</option>';

    Object.entries(PILES).forEach(([dim, pricePerUnit]) => {
      if (skip76 && dim.includes("×76")) return;
      if (dim === "1.5×76" && cnt > 12) return;

      const priceGrossPerUnit = grossInt(pricePerUnit); // показываем с комиссией
      selPile.innerHTML +=
        `<option value="${dim}">${dim} × ${cnt} шт (${formatPrice(priceGrossPerUnit)} ₽/шт)</option>`;
    });
  }
}

/* ------------------------------------------------------------------
   7. addWindowRow — добавляем строку «Окно / дверь»
------------------------------------------------------------------ */
function addWindowRow () {
  const clone = tmplWindowRow.content.cloneNode(true);
  const row   = clone.querySelector(".window-row");

  const selType = row.querySelector(".win-type");   // pvcWin | woodWin | pvcDoor | woodDoor
  const selCam  = row.querySelector(".win-cam");    // 1-кам / 2-кам (только для ПВХ-окон)
  const selSize = row.querySelector(".win-size");   // размеры / варианты
  const qtyInp  = row.querySelector(".win-qty");
  const btnX    = row.querySelector(".btnRemoveWindow");

  const DOOR_CAPTION = {
    std:"Обычная", hinge:"Распашная", hingeWarm:"Распашная утеплённая", filen:"Филенчатая"
  };

  function rebuild () {
    const t = selType.value;
    selCam.style.display = (t === "pvcWin") ? "" : "none";
    selSize.innerHTML = '<option value="">— размер / тип —</option>';

    if (t === "pvcWin") {
      const cam = selCam.value;
      Object.entries(WINDOWS).forEach(([sz, cams]) => {
        if (cams[cam]) {
          const pGross = grossInt(cams[cam]);
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(pGross)} ₽)</option>`;
        }
      });

    } else if (t === "pvcDoor") {
      Object.entries(WINDOWS).forEach(([sz, cams]) => {
        if (sz.includes("дверь ПВХ")) {
          const p = cams[2] || cams[1];
          const pGross = grossInt(p);
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(pGross)} ₽)</option>`;
        }
      });

    } else if (t === "woodWin") {
      Object.entries(WOOD_PRICES.win).forEach(([sz, p]) => {
        selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(grossInt(p))} ₽)</option>`;
      });

    } else if (t === "woodDoor") {
      Object.entries(WOOD_PRICES.door).forEach(([key, p]) => {
        selSize.innerHTML +=
          `<option value="${key}">${DOOR_CAPTION[key]} (${formatPrice(grossInt(p))} ₽)</option>`;
      });

    } else if (t === "metalDoor") {
      const CAPTION = {
        rf:"Дверь металлическая РФ",
        rfThermo:"Дверь РФ (термо)",
        thermoLux:"Термо Люкс"
      };
      Object.entries(METAL_PRICES).forEach(([code, p]) => {
        selSize.innerHTML +=
          `<option value="${code}">${CAPTION[code]} (${formatPrice(grossInt(p))} ₽)</option>`;
      });
    }
  }

  selType.addEventListener("change", rebuild);
  selCam .addEventListener("change", rebuild);
  btnX   .addEventListener("click", () => row.remove());

  rebuild();
  windowsContainer.appendChild(row);
}

/* ------------------------------------------------------------------
   7a. addPartitionRow — добавляем строку перегородки
------------------------------------------------------------------ */
function addPartitionRow() {
  const clone = document.getElementById("tmplPartitionRowEconomy").content.cloneNode(true);
  const row = clone.querySelector(".partition-row");
  
  const materialSelect = row.querySelector(".partition-material");
  const sizeSelect = row.querySelector(".partition-size");
  const qtyInput = row.querySelector(".partition-qty");
  const removeBtn = row.querySelector(".btnRemovePartition");
  
  // Обработчик изменения материала
  materialSelect.addEventListener("change", function() {
    updatePartitionSizesInRow(row);
  });
  
  // Обработчик удаления
  removeBtn.addEventListener("click", function() {
    row.remove();
  });
  
  // Добавляем строку в контейнер
  document.getElementById("partitionsContainerEconomy").appendChild(row);
}

/* ------------------------------------------------------------------
   7b. updatePartitionSizesInRow — обновляем размеры в конкретной строке
------------------------------------------------------------------ */
function updatePartitionSizesInRow(row) {
  const material = row.querySelector(".partition-material").value;
  const sizeSelect = row.querySelector(".partition-size");
  
  // Очищаем список размеров
  sizeSelect.innerHTML = '<option value="">— размер —</option>';
  
  if (!material) {
    sizeSelect.disabled = true;
    return;
  }
  
  // Включаем выбор размера
  sizeSelect.disabled = false;
  
  // Добавляем размеры в зависимости от материала
  const sizes = {
    'organlit': [
      { value: '2', text: '2м(2,2) — 6 600₽' },
      { value: '2.5', text: '2,5м — 7 700₽' },
      { value: '3', text: '3м — 8 250₽' }
    ],
    'osb': [
      { value: '2', text: '2м(2,2) — 7 700₽' },
      { value: '2.5', text: '2,5м — 8 800₽' },
      { value: '3', text: '3м — 9 900₽' }
    ],
    'vagonka': [
      { value: '2', text: '2м(2,2) — 13 200₽' },
      { value: '2.5', text: '2,5м — 15 950₽' },
      { value: '3', text: '3м — 16 500₽' }
    ],
    'hoblok': [
      { value: '2', text: '2м(2,2) — 5 500₽' },
      { value: '2.5', text: '2,5м — 7 150₽' },
      { value: '3', text: '3м — 8 250₽' }
    ]
  };
  
  const materialSizes = sizes[material] || [];
  materialSizes.forEach(size => {
    const option = document.createElement('option');
    option.value = `${material}_${size.value}`;
    option.textContent = size.text;
    sizeSelect.appendChild(option);
  });
}

/* ------------------------------------------------------------------
   7b. addWindowRowEconomy — добавляем строку «Окно / дверь» для эконом-линейки
------------------------------------------------------------------ */
function addWindowRowEconomy () {
  const clone = tmplWindowRowEconomy.content.cloneNode(true);
  const row   = clone.querySelector(".window-row");

  const selType = row.querySelector(".win-type");   // pvcWin | woodWin | pvcDoor | woodDoor
  const selCam  = row.querySelector(".win-cam");    // 1-кам / 2-кам (только для ПВХ-окон)
  const selSize = row.querySelector(".win-size");   // размеры / варианты
  const qtyInp  = row.querySelector(".win-qty");
  const btnX    = row.querySelector(".btnRemoveWindow");

  const DOOR_CAPTION = {
    wooden_set:"Деревянная наборная 75×175", 
    wooden_swing:"Распашная (ширина 160)", 
    interior_pine:"Межкомнатная сосновая"
  };

  function rebuild () {
    const t = selType.value;
    selCam.style.display = (t === "pvcWin") ? "" : "none";
    selSize.innerHTML = '<option value="">— размер / тип —</option>';

    if (t === "pvcWin") {
      const cam = selCam.value;
      Object.entries(ECONOMY_WINDOWS).forEach(([sz, cams]) => {
        if (cams[cam]) {
          const pGross = cams[cam]; // уже с наценкой 10%
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(pGross)} ₽)</option>`;
        }
      });

    } else if (t === "pvcDoor") {
      Object.entries(ECONOMY_WINDOWS).forEach(([sz, cams]) => {
        if (sz.includes("дверь ПВХ")) {
          const p = cams[2] || cams[1];
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(p)} ₽)</option>`;
        }
      });

    } else if (t === "woodWin") {
      Object.entries(ECONOMY_WOOD_PRICES.win).forEach(([sz, p]) => {
        selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(p)} ₽)</option>`;
      });

    } else if (t === "woodDoor") {
      Object.entries(ECONOMY_WOOD_PRICES.door).forEach(([key, p]) => {
        selSize.innerHTML +=
          `<option value="${key}">${DOOR_CAPTION[key]} (${formatPrice(p)} ₽)</option>`;
      });

    } else if (t === "metalDoor") {
      Object.entries(ECONOMY_METAL_PRICES).forEach(([code, p]) => {
        selSize.innerHTML +=
          `<option value="${code}">Дверь металлическая РФ (${formatPrice(p)} ₽)</option>`;
      });
    }
  }

  selType.addEventListener("change", rebuild);
  selCam .addEventListener("change", rebuild);
  btnX   .addEventListener("click", () => row.remove());

  rebuild();
  document.getElementById("windowsContainerEconomy").appendChild(row);
}

// Человекочитаемые названия материалов
const MATERIAL_NAME = {
  osb:"ОСБ влагостойкая",
  vagBC:"Вагонка B натуральная",
  vagA:"Вагонка A (отборная)",
  imitB:"Имитация бруса B стандарт",
  imitA:"Имитация бруса A (отборный)",
  block:"Блок-хаус",
  profGalv: "Профнастил оцинкованный"

};
// Прямые цены замены (₽/м²)
const REPLACEMENT_PRICES = {
  osb:   { vagBC:120, vagA:500, imitB:350, imitA:520, block:1120 },
  vagBC: { vagA:380, imitB:250, imitA:400, block:1000, profGalv:750 },
  imitB: { imitA:750, block:600, vagA:150 }
};

// ▸ доплата за каждые 10 см высоты, зависит от площади строения
function pricePer10cm(area){          // теперь получаем готовые м²
  if (area <= 17) return 5000;
  if (area <= 23) return 10000;
  if (area <= 47) return 13000;
  return 16000;
}

// ────────────────────────────────────────────────────────────────
// ВСТАВЛЯЕМ ЗДЕСЬ — прямо перед calculate()
// ────────────────────────────────────────────────────────────────
const MODULES = [3, 2.5, 2];   // разрешённые «куски» длины

/**
 * Собирает цену из модулей 3 / 2.5 / 2 м.
 * @param {"bytovka"|"hoblok"} type
 * @param {number} w  – ширина (3-6 м)
 * @param {number} l  – нужная длина (2-6 м + …)
 * @returns {number|null} – сумма или null, если собрать нельзя
 */
function getModPrice(type, w, l) {
  const tbl = (type === "hoblok")
              ? CONFIG.hoblok.basePrice
              : CONFIG.bytovka.basePrice;

  let rest = l, sum = 0;

  for (const m of MODULES) {
    while (rest >= m - 0.001) {
      const key   = `${w}x${m}`;
      const price = tbl[key];
      if (!price) return null;         // нет такого куска ⇒ отбой
      sum  += price;
      rest -= m;
      rest  = +rest.toFixed(2);        // убираем хвосты 1e-15
    }
  }
  return rest < 0.01 ? sum : null;     // если «хвост» остался ⇒ null
}

/* ------------------------------------------------------------------
   8. calculate — основная функция расчёта
------------------------------------------------------------------ */
async function calculate(){
  const type = selType.value;
  const cfg = CONFIG[type];
  const isEconomy = cfg.isEconomy || false;

    /* ---   ОБЪЯВЛЯЕМ СРАЗУ, чтобы не было ReferenceError   --- */
  const pkg = [];                  // список «Комплектация»
  let baseWinSize,  baseWinQty;    // базовые окна
  let baseDoorLabel, baseDoorQty;  // базовые двери
  let heightNote = "";             // заметка о высоте
  let partType = "none";           // тип перегородки
  let partLen = 0;                 // длина перегородки
  let floorCode = "plain";         // код материала пола

  if (type === "house") {          // каркасный дом
  baseWinSize   = "80×80";
  baseWinQty    = 3;
  baseDoorLabel = "Двери РФ: самонаборные";
  baseDoorQty   = 2;
} else if (isEconomy) {           // эконом-линейка
  baseWinSize   = "55×80";        // деревянное окно по умолчанию
  baseWinQty    = 1;
  baseDoorLabel = "Дверь деревянная наборная 75×175 см";
  baseDoorQty   = 1;
} else {                         // бытовка / хозблок (обычная)
  baseWinSize   = "60×90";
  baseWinQty    = 1;
  baseDoorLabel = "Дверь: самонаборная 200×70–90 см";
  baseDoorQty   = 1;
}
  /* ----------------------------------------------------------- */

// --- реальные размеры, как выбрал пользователь ---
const wReal = parseFloat(inpWidth.value);   // ширина из селекта
const lReal = parseFloat(inpLength.value);  // длина из селекта

// --- размеры, по которым смотрим прайсовую цену ---
let wPrice = wReal;
let lPrice = lReal;


if (type !== "house") {                 // бытовка / хозблок
  // НОВОЕ: ширины-синонимы для прайса
  if (wReal === 2.1) wPrice = 2.0;      // 2.1 считаем как 2.0
  else if (wReal === 2.3) wPrice = 2.5; // 2.3 считаем как 2.5

  // как и было: длина 2.5 считаем по прайсу как 3
  if (lReal === 2.5) lPrice = 3;
}

  const w = wReal;   // ← «короткие» имена, как раньше
  const l = lReal;

    /* --- 4. Веранда --- */
  // ─── параметры веранды и «тёплая» площадь ─────────────────────
const vw = parseFloat(inpVerWidth.value) || 0;
const vd = parseFloat(inpVerDepth.value) || 0;

const isInsideVer = document.getElementById('chkInVer').checked; // чекбокс «внутренняя»
const verArea     = (vw > 0 && vd > 0) ? vw * vd : 0;

// Проверяем, выбрана ли веранда из прайса
const selectedVeranda = document.getElementById('selVeranda')?.value;
let verandaFromPrice = null;
if (selectedVeranda) {
  const verandaType = type === 'hoblok' ? 'hoblok' : 'bytovka';
  verandaFromPrice = VERANDA_CONFIG[verandaType]?.[selectedVeranda];
}

const warmArea    = isInsideVer ? (w * l - verArea)    // только тёплая часть
                                : (w * l);             // всё строение целиком
// ──────────────────────────────────────────────────────────────
const verRoof = document.querySelector('input[name="verRoofType"]:checked')?.value
                || 'verRoof';

  let basePrice = 0, del = 0, finalInt, finalExt;

  /* ===== 8.2. Базовая стоимость и доставка ===== */
  const area = w * l;
  // ── подготовка доставки ─────────────────────────────
const veh = (l > 4) ? 2 : 1;      // 1 или 2 машины

// 1. минимальная стоимость выезда
const minDeliv = (type === "house")
  ? 7000                      // для домов
  : CONFIG[type].delivery.min; // 5000 (хозблок) или 6000 (бытовка)

del = 0;                  // сюда положим итог доставки
let hasRoute = false;         // построен ли маршрут
let km = 0;                   // километраж

// 2. если адрес есть — пытаемся построить маршрут
const address = inpAddr.value.trim();
if (address) {
  try {
    km = await getKm(address, isEconomy);        // вернёт число или null
    if (km === null) {
      console.warn("Не удалось построить маршрут");
      hasRoute = false;
    } else {
      hasRoute = true;
    }
  } catch (error) {
    console.error("Ошибка при построении маршрута:", error);
    hasRoute = false;
  }
}

// 3. если маршрута нет (пустой адрес) — доставка = минималка
if (!hasRoute) {
  del = gross50(minDeliv); // показываем "от ..." уже с комиссией
} else {
  let rate;
  if (type === "house") {
    const key = `${w}x${l}`;
    rate = DELIV[key] || 300;
} else if (isEconomy) {
  // Эконом-линейка: выбор типа доставки (из прайса)
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
  const needsAssembly = document.getElementById('chkAssembly')?.checked;
  
  if (deliveryType === 'manipulator') {
    // Доставка манипулятором: 150 руб/км, мин. 10 000 руб (из прайса)
    rate = 150;
    let cost = rate * km;
    if (cost < 10000) cost = 10000;
    // Добавляем 10% наценку к доставке
    cost = Math.round(cost * 1.1 / 50) * 50;
    del = cost;
  } else {
    // Доставка комплектами: 130 руб/км, мин. 7 000 руб (из прайса)
    rate = 130;
    let cost = rate * km;
    if (cost < 7000) cost = 7000;
    // Добавляем 10% наценку к доставке
    cost = Math.round(cost * 1.1 / 50) * 50;
    
    // Добавляем сборку только если выбрано
    if (needsAssembly) {
      cost += CONFIG[type].delivery.assembly;
    }
    
    del = cost;
  }
  
  // Для эконом-линейки: если сборка на участке, добавляем 7000 к базовой цене
  if (needsAssembly && isEconomy) {
    basePrice += 7000;
  }
} else {
    rate = (veh === 2) ? CONFIG[type].delivery.perKm2 : CONFIG[type].delivery.perKm1;
    let cost = rate * km;
    if (cost < minDeliv) cost = minDeliv;
    const cost50 = Math.ceil(cost / 50) * 50; // по прайсу к 50
    del = gross50(cost50);                    // +10% и снова к 50 ₽
  }
}

// ───── БАЗОВАЯ СТОИМОСТЬ ─────
if (type === 'house') {
  const roof = document.querySelector('input[name="roof"]:checked').value;

  // если веранда «внутри» – забираем её квадратуру из расчёта
  const paidArea = isInsideVer ? warmArea : area;   // warmArea = (w*l - verArea)

  basePrice = Math.ceil(paidArea * RATE[roof].base / 10) * 10;

} else if (isEconomy) {                        // 2. эконом-линейка
  // Если выбрана веранда из прайса - используем её цену + 10% наценка
  if (verandaFromPrice) {
    basePrice = Math.round(verandaFromPrice.price * 1.1 / 50) * 50; // +10% и округление к 50
  } else {
    const tbl = CONFIG[type].basePrice;
    
    // Прямая попытка найти цену
    basePrice = tbl[`${wReal}x${lReal}`] ?? 0;
    
    // Если не найдено - пробуем перепутанные стороны
    if (!basePrice) basePrice = tbl[`${lReal}x${wReal}`] ?? 0;
    
    // Если все еще не найдено - используем расчет по площади
    if (!basePrice) {
      const baseArea = (isInsideVer && vw && vd) ? (wReal * lReal - verArea) : (wReal * lReal);
      const ratePerSqm = (type === 'hoblok_economy') ? 6000 : 8000; // примерные ставки
      basePrice = Math.round(baseArea * ratePerSqm / 100) * 100;
    }
  }
  
  // Автоматически добавляем 7000 к цене при выборе газели (сборка в подарок)
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
  if (deliveryType === 'kit') {
    basePrice += 7000;
  }
  
} else {                                        // 3. бытовка или хозблок (обычная)
  const tbl   = (type === 'hoblok')
                ? CONFIG.hoblok.basePrice
                : CONFIG.bytovka.basePrice;

  // 2.1 прямая попытка
  basePrice   = tbl[`${wPrice}x${lPrice}`] ?? 0;

  // 2.2 если 0 – пробуем «перепутанные» стороны
  if (!basePrice) basePrice = tbl[`${lPrice}x${wPrice}`] ?? 0;

  /* --- НОВОЕ: цены для ширины 2.5 м  (на 5 000 дешевле 3-метровых) --- */
if (!basePrice && wPrice === 2.5) {
  // берём цену для 3×L и уменьшаем на 5 000 ₽
  const ref1 = tbl[`3x${lPrice}`];       // «3 × L»
  const ref2 = tbl[`${lPrice}x3`];       // «L × 3» (если L>W)
  const ref  = ref1 ?? ref2;
  if (ref) basePrice = ref - 5000;
}
/* ------------------------------------------------------------------- */


    // 2.3 если всё ещё 0 — НЕ собираем из модулей, а считаем по м² (бытовка и хозблок)
  if (!basePrice && (type === 'bytovka' || type === 'hoblok')) {
    const baseArea = (isInsideVer && vw && vd) ? (w * l - verArea) : (w * l);
    basePrice = Math.round(baseArea * NONSTD_RATE[type] / 100) * 100;
  }
}



  /* ===== 8.3. Доп. опции ===== */
  let extras = 0, linesExtra = [];

    // универсальная функция — собираем в map
const extraMap = {};
function addExtra(sum, label){
  sum = Math.round(sum);
  sum = grossInt(sum); // ← здесь добавляем нашу 10% комиссию на ЛЮБОЙ доп
  if(!sum || sum<=0) return;
  extras += sum;
  extraMap[label] = (extraMap[label] || 0) + sum;
}

  /* --- ЭКОНОМ-ЛИНЕЙКА: упрощенные доп. опции --- */
  if (isEconomy) {
    // Для эконом-линейки используем фиксированные цены по размерам
    const sizeKey = `${wReal}x${lReal}`;
    
    // Тип крыши для эконом-линейки (фиксированные цены с +10%)
    const roofType = document.querySelector('input[name="economyRoof"]:checked')?.value;
    if (roofType === 'gable_length') {
      addExtra(22000, "Двускатная крыша по длине"); // 20000 + 10%
    } else if (roofType === 'gable_width') {
      addExtra(16500, "Двускатная крыша по ширине"); // 15000 + 10%
    }
    // Односкатная (single) - без доплаты
    
    // Утепление потолка 50 мм (только для бытовок эконом)
    if (type === 'bytovka_economy' && document.getElementById('chkCeilingInsulation')?.checked) {
      const price = ECONOMY_EXTRAS.ceilingInsulation[sizeKey];
      if (price) addExtra(price, "Утепление потолка 50 мм");
    }
    
    // Внутренняя отделка ОСП-9 (если выбрано)
    if (document.getElementById('chkInteriorOSB')?.checked) {
      const price = ECONOMY_EXTRAS.interiorFinish.osb[sizeKey];
      if (price) addExtra(price, "Внутренняя отделка ОСП-9");
    }
    
    // Внутренняя отделка вагонка "С" (если выбрано)
    if (document.getElementById('chkInteriorVagonka')?.checked) {
      const price = ECONOMY_EXTRAS.interiorFinish.vagonka[sizeKey];
      if (price) addExtra(price, "Внутренняя отделка вагонка 'С'");
    }
    
    // Утепление 100 мм (только для бытовок эконом)
    if (type === 'bytovka_economy' && document.getElementById('chkInsulation100')?.checked) {
      const price = ECONOMY_EXTRAS.insulation100[sizeKey];
      if (price) addExtra(price, "Утепление 100 мм (стены/пол/потолок)");
    }
    
    // Огнебиозащита пола (если выбрано)
    if (document.getElementById('chkFireProtectionFloor')?.checked) {
      const price = ECONOMY_EXTRAS.fireProtection.floor[sizeKey];
      if (price) addExtra(price, "Огнебиозащита пола");
    }
    
    // Огнебиозащита каркаса (если выбрано)
    if (document.getElementById('chkFireProtectionFrame')?.checked) {
      const price = ECONOMY_EXTRAS.fireProtection.frame[sizeKey];
      if (price) addExtra(price, "Огнебиозащита каркаса");
    }
    
    // Паро- и ветроизоляция (только для бытовок эконом)
    if (type === 'bytovka_economy' && document.getElementById('chkVaporBarrier')?.checked) {
      const price = ECONOMY_EXTRAS.vaporBarrier[sizeKey];
      if (price) addExtra(price, "Паро- и ветроизоляция");
    }
    
    // Перегородки (если выбраны)
    const partitionsContainer = document.getElementById('partitionsContainerEconomy');
    if (partitionsContainer) {
      partitionsContainer.querySelectorAll('.partition-row').forEach(row => {
        const material = row.querySelector('.partition-material')?.value;
        const size = row.querySelector('.partition-size')?.value;
        const qty = parseInt(row.querySelector('.partition-qty')?.value) || 0;
        
        if (material && size && qty > 0) {
          const partitionPrices = {
            'organlit_2': 6600,    // 6000 + 10%
            'organlit_2.5': 7700,  // 7000 + 10%
            'organlit_3': 8250,    // 7500 + 10%
            'osb_2': 7700,         // 7000 + 10%
            'osb_2.5': 8800,       // 8000 + 10%
            'osb_3': 9900,         // 9000 + 10%
            'vagonka_2': 13200,    // 12000 + 10%
            'vagonka_2.5': 15950,  // 14500 + 10%
            'vagonka_3': 16500,    // 15000 + 10%
            'hoblok_2': 5500,      // 5000 + 10%
            'hoblok_2.5': 7150,    // 6500 + 10%
            'hoblok_3': 8250       // 7500 + 10%
          };
          
          const price = partitionPrices[size] || 0;
          if (price > 0) {
            const optionText = row.querySelector('.partition-size').selectedOptions[0].text;
            const total = price * qty;
            addExtra(total, `${optionText} (${qty} шт)`);
          }
        }
      });
    }
    
    // Окна / двери (новый интерфейс для эконом-линейки)
    const windowsContainerEconomy = document.getElementById('windowsContainerEconomy');
    if (windowsContainerEconomy) {
      windowsContainerEconomy.querySelectorAll(".window-row").forEach(row => {
        const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | pvcDoor | woodDoor
        const cam  = row.querySelector(".win-cam").value;
        const sel  = row.querySelector(".win-size");
        const code = sel.value;                 // строка-код из <option value="…">
        const qty  = +row.querySelector(".win-qty").value || 1;
        if (!code) return;                      // ничего не выбрано

        let price = 0, caption = "";

        switch (kind) {
        /* ---------- ОКНА ---------- */
        case "pvcWin": {                        // окно ПВХ
          price   = ECONOMY_WINDOWS[code][cam];
          caption = `Окно ПВХ ${code}`;
          if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
          pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ в «Комплектацию»
          break;
        }

        case "woodWin": {                // окно деревянное
        price   = ECONOMY_WOOD_PRICES.win[code];
        caption = `Окно деревянное ${code}`;

        // если это базовый размер – просто увеличиваем счётчик
        if (code === baseWinSize) {
          baseWinQty += qty;
        } else {
          pkg.push(`– ${caption} (${qty} шт)`);
        }

        if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
        break;
      }

        /* ---------- ДВЕРИ ---------- */
        case "pvcDoor": {                       // дверь ПВХ
          price   = ECONOMY_WINDOWS[code][2] || ECONOMY_WINDOWS[code][1];
          caption = `Дверь ПВХ ${code}`;
          if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
          pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ
          break;
        }

        case "woodDoor": {               // дверь деревянная
        price = ECONOMY_WOOD_PRICES.door[code];
        const cap = { 
          wooden_set:"Деревянная наборная 75×175",
          wooden_swing:"Распашная (ширина 160)",
          interior_pine:"Межкомнатная сосновая"
        }[code];
        caption = `Дверь деревянная (${cap})`;

        if (code === "wooden_set") {          // базовая «наборная»
          baseDoorQty += qty;
        } else {
          pkg.push(`– ${caption} (${qty} шт)`);
        }

        if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
        break;
      }

        case "metalDoor": {                     // дверь металлическая
          price   = ECONOMY_METAL_PRICES[code];
          caption = "Дверь металлическая РФ";
          if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
          pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ
          break;
        }
      }
      });
    }
    
    // Прочее
    if (document.getElementById('chkSteps')?.checked) {
      addExtra(ECONOMY_EXTRAS.misc.steps, "Ступени");
    }
    if (document.getElementById('chkRamp75')?.checked) {
      addExtra(ECONOMY_EXTRAS.misc.ramp_75, "Пандус 75 см");
    }
    if (document.getElementById('chkRamp160')?.checked) {
      addExtra(ECONOMY_EXTRAS.misc.ramp_160_180, "Пандус 160-180 см");
    }
    
    // Сваи для эконом-линейки (если выбрано)
    const svaiType = document.getElementById('selSvaiType')?.value;
    const svaiQty = parseInt(document.getElementById('inpSvaiQty')?.value) || 0;
    if (svaiType && svaiQty > 0) {
      const price = CONFIG[type].svai.prices[svaiType];
      if (price) addExtra(price * svaiQty, `Сваи ${svaiType} (${svaiQty} шт)`);
    }
    
    // Пандус (если выбрано)
    if (chkRamp.checked) addExtra(RAMP, "Пандус");
    
    // Для эконом-линейки пропускаем обычную логику доп. опций
  }

  /* --- 1. Утепление (если > базового) --- */
  // --- 1. Утепление (считаем только для бытовки и дома) ---
if (!isEconomy && selType.value !== "hoblok" && selInsul.value !== "none") {
  // базовая толщина: 50 мм у бытовки, 100 мм у остальных
const baseInsulPrice = (type === "bytovka") ? 0 : INSUL.roll100;
const diff = INSUL[selInsul.value] - baseInsulPrice;
  if (diff > 0) addExtra(diff * warmArea, getLabel(selInsul.selectedOptions[0]));
}


  /* --- 2. Кровля (цветной/металлочерепица) --- */
  if (!isEconomy && selRoofMat.value !== "galv" && selRoofMat.value !== "ondulin") {
    addExtra(ROOFMAT[selRoofMat.value] * warmArea, getLabel(selRoofMat.selectedOptions[0]));
  }

  /* --- 3. Доплата за двускатную крышу для хозблоков/бытовок --- */
  if (!isEconomy && type !== "house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    if (roof === "gable") {
      addExtra(1800 * warmArea, "Двускатная крыша");
    }
  }


// --- ВЕРАHДA: одна строка при любом варианте ---
if (!isEconomy && vw > 0 && vd > 0) {
  // 3.1 цену берём:    односкатная = 7 500 ₽/м²   |   двускатная = 9 000 ₽/м²
  //    verRoof уже "verRoof" или "verGable" (7500 / 9000)
  const priceKey = verRoof;

  // 3.2 подпись: если чек-бокс «внутр.» стоит – дописываем пометку
  const label = `Веранда ${vw}×${vd} м${ isInsideVer ? " (внутр.)" : "" }`;

  addExtra( VERANDA[priceKey] * verArea, label );
}




  /* --- 5. Шпунт-пол, высота и «анти-мышь» --- */
if (!isEconomy) {
  floorCode = document.getElementById('selFloor').value;
  const floorExtra = FLOOR_MAT[floorCode] * warmArea;
  if (floorExtra) addExtra(floorExtra, FLOOR_CAPT[floorCode]);

  // ▸ увеличение высоты (только для обычной линейки)
  const extraH = +inpExtraH.value || 0;        // введено в см
  if (extraH > 0) {
    const steps = Math.ceil(extraH / 10);
    const addH  = steps * pricePer10cm(warmArea);
    addExtra(addH, `Высота +${extraH} см`);
    heightNote = `– Высота увеличена на ${extraH} см`;
  }

  if (chkMouse.checked) addExtra(FLOOR.mouse * warmArea, "Сетка «анти-мышь»");
}


  /* --- 6. Перегородки --- */
  if (!isEconomy && selPart && inpPartLen) {
    partType = selPart.value;
    partLen  = parseFloat(inpPartLen.value) || 0;
    if (partType!=="none" && partLen>0) {
      addExtra(PART[partType]*partLen, `${PART_TITLE[partType]} (${partLen} м)`);
    }
  }

  /* --- 8. Сваи --- */
  if (!isEconomy && selPile && selPile.value) {
    const dim = selPile.value;
    const cnt  = getPileCount(type, w, l);
    const price = PILES[dim] * cnt;
    addExtra(price, `Свайный фундамент ${dim} × ${cnt} шт`);
  }

  /* --- 9. Пандус --- */
if (!isEconomy && chkRamp.checked) addExtra(RAMP, "Пандус");

// 5-БИС) фиксируем базовые окна / двери (итоговое количество)

// ------------------------------------------------------------------

  /* --- 9. Окна / двери (все варианты) --- */
if (!isEconomy) {
  windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | pvcDoor | woodDoor
  const cam  = row.querySelector(".win-cam").value;
  const sel  = row.querySelector(".win-size");
  const code = sel.value;                 // строка-код из <option value="…">
  const qty  = +row.querySelector(".win-qty").value || 1;
  if (!code) return;                      // ничего не выбрано

  let price = 0, caption = "";

  switch (kind) {
  /* ---------- ОКНА ---------- */
  case "pvcWin": {                        // окно ПВХ
    price   = WINDOWS[code][cam];
    caption = `Окно ПВХ ${code}`;
    if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
    pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ в «Комплектацию»
    break;
  }

  case "woodWin": {                // окно деревянное
  price   = WOOD_PRICES.win[code];
  caption = `Окно деревянное ${code}`;

  // если это базовый размер – просто увеличиваем счётчик
  if (code === baseWinSize) {
    baseWinQty += qty;
  } else {
    pkg.push(`– ${caption} (${qty} шт)`);
  }

  if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
  break;
}

  /* ---------- ДВЕРИ ---------- */
  case "pvcDoor": {                       // дверь ПВХ
    price   = WINDOWS[code][2] || WINDOWS[code][1];
    caption = `Дверь ПВХ ${code}`;
    if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
    pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ
    break;
  }

  case "woodDoor": {               // дверь деревянная
  price = WOOD_PRICES.door[code];
  const cap = { std:"Обычная", hinge:"Распашная",
                hingeWarm:"Распашная утеплённая", filen:"Филенчатая" }[code];
  caption = `Дверь деревянная (${cap})`;

  if (code === "std") {          // базовая «самонаборная»
    baseDoorQty += qty;
  } else {
    pkg.push(`– ${caption} (${qty} шт)`);
  }

  if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
  break;
}

  case "metalDoor": {                     // дверь металлическая
    price   = METAL_PRICES[code];
    caption = { rf:"Дверь металлическая Тула",
                rfThermo:"Дверь РФ (термо)",
                thermoLux:"Термо Люкс" }[code];
    if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
    pkg.push(`– ${caption} (${qty} шт)`);        // ← ДОБАВЛЯЕМ
    break;
  }
}

});
} // закрываем блок окон/дверей для !isEconomy

  /* ===== 8.4. Логика отделки (замена материала) ===== */
  
  // Если эконом-линейка - пропускаем сложную логику отделки
  if (isEconomy) {
    // Для эконом-линейки используем упрощенную комплектацию
    finalInt = null; // без внутренней отделки по умолчанию
    finalExt = "profGalv"; // профнастил оцинкованный по умолчанию
  } else {

// вспомогательная функция «округлить вверх до ближайших 3 м²»
const round3 = m => Math.ceil(m / 3) * 3;
const IMIT   = new Set(['imitB', 'imitA']);   // всё, что считается «имитацией»

/* --- 8.4.1. Внутренняя отделка --- */
if (type === "hoblok") {
  /* ── 1. Без отделки ─────────────────────────── */
  if (selInRep.value === "none") {
    finalInt = null;           // ничего не выводим в «Комплектацию»
    /* ── 2. Только ОСБ-3 ───────────────────────── */
  } else if (selInRep.value === "osb_only") {
  // «чистая ОСБ-3»
  const cost = getOsbArea(w, l) * OSB_PLAIN;
  addExtra(cost, "ОСБ плита");   // ✦ теперь фиксируем подпись
  finalInt = "osb";

} else {  // osb_vag, osb_imit, osb_vagA, osb_block
  // стоимости «довести до ОСБ»  +  «заменить ОСБ на выбранный материал»
  const osbCost = getOsbArea(w, l) * OSB_PLAIN;   // шаг 1

  const codeMapIn = {                 // какой материал выбрал пользователь
    osb_vag:  "vagBC",
    osb_imit: "imitB",
    osb_vagA: "vagA",
    osb_block:"block"
  };
  const intTgt  = codeMapIn[selInRep.value];

  // шаг 2 — замена ОСБ → выбранный материал
  const priceIn = (REPLACEMENT_PRICES.osb || {})[intTgt] || 0;

  const h  = getWallHeight(type, "lom", false);   // всегда односкат
  const S  = wallArea(w, l, h) + w * l;           // стены + потолок
  const A  = ["imitB","imitA"].includes(intTgt) ? Math.ceil(S/3)*3 : S;

  const totalFinish = osbCost + priceIn * A;      // всё вместе

  addExtra(totalFinish, MATERIAL_NAME[intTgt]);   // 👉 одна строка в КП
  finalInt = intTgt;
}

} else {
  /* ── СТАРЫЙ код для дома и бытовки — без изменений ── */
  if (selInRep.value !== "none") {
    const roof    = document.querySelector('input[name="roof"]:checked').value;
    const intBase = (type === "house")
      ? (roof === "lom" ? "osb" : "vagBC")
      : "osb";

    const codeMapIn = {
      osb_vag:"vagBC", osb_imit:"imitB", osb_vagA:"vagA", osb_block:"block",
      vag_imitBC:"imitB", vag_imitA:"imitA", vag_block:"block"
    };
    const intTgt  = codeMapIn[selInRep.value];
    const priceIn = (REPLACEMENT_PRICES[intBase] || {})[intTgt] || 0;

    const intH       = getWallHeight(type, roof, false);
    const wallSquare = wallArea(w, l, intH);
    const ceilSquare = w * l;
    let areaInTot    = wallSquare + ceilSquare;
    if (IMIT.has(intTgt)) areaInTot = round3(areaInTot);

    addExtra(priceIn * areaInTot,
             `${MATERIAL_NAME[intBase]} → ${MATERIAL_NAME[intTgt]}`);
    finalInt = intTgt;
  } else {
    finalInt = (type === "house")
      ? (document.querySelector('input[name="roof"]:checked').value === "lom"
           ? "osb" : "vagBC")
      : "osb";
  }
}

/* --- 8.4.2. Наружная отделка --- */
if (selOutRep.value !== "none") {
  const roof     = document.querySelector('input[name="roof"]:checked').value;
  const extBase  = (type === "house")
      ? (roof === "lom" ? "vagBC" : "imitB")
      : "vagBC";

  const codeMapOut = {
  vag_ext:"vagBC",                     // ← базовая B-C, замены нет
  imitBC_ext:"imitB", imitA_ext:"imitA",
  block_ext:"block", osb_extA:"vagA", vag_extA:"vagA",profGalv:  "profGalv"
};
  const extTgt   = codeMapOut[selOutRep.value] || "vagA";
  const priceOut = (REPLACEMENT_PRICES[extBase] || {})[extTgt] || 0;

  const extH     = getWallHeight(type, roof, true);
const areaOut  = IMIT.has(extTgt) ? round3(wallArea(w, l, extH))
                                  : wallArea(w, l, extH);
  addExtra(priceOut * areaOut,
           `${MATERIAL_NAME[extBase]} → ${MATERIAL_NAME[extTgt]}`);

  finalExt = extTgt;
} else {
  finalExt = (type === "house")
      ? (document.querySelector('input[name="roof"]:checked').value === "lom" ? "vagBC" : "imitB")
      : "vagBC";
}
  } // закрываем else для isEconomy

  /* ===== 8.5. Итоговые строки КП ===== */
  
/* ─── Заголовок с учётом веранды ──────────────────────────────── */
// если ввели оба размера – добавляем хвост  «+ веранда …×…»
let verTitle = "";
if (vw > 0 && vd > 0){
  verTitle = isInsideVer
    ? `, включая веранду ${vw}×${vd}`
    : ` + веранда ${vw}×${vd}`;
}

// итоговый заголовок КП
let total = basePrice + del + extras;

// Для эконом-линейки цены уже с наценкой 10%, дополнительная наценка не нужна
if (isEconomy) {
  total = Math.round(total / 50) * 50; // только округление к 50
}
const roofType = document.querySelector('input[name="roof"]:checked').value;
// Формируем заголовок с учетом веранды из прайса
let title;
if (verandaFromPrice) {
  // Если выбрана веранда из прайса - показываем общий размер
  const totalSize = `${w}×${l}`;
  const mainSize = verandaFromPrice.main;
  const verandaSize = verandaFromPrice.veranda;
  title = `${selType.options[selType.selectedIndex].text} ${totalSize} (${mainSize} + веранда ${verandaSize}) — под ключ`;
} else if (type === "house") {
  title = `Каркасный дом с ${roofType === "lom" ? "ломаной" : "двускатной"} крышей ${w}×${l}${verTitle} — под ключ`;
} else {
  title = `${selType.options[selType.selectedIndex].text} ${w}×${l}${verTitle} — под ключ`;
}


/* ─── Заголовок + блок «Комплектация» ───────────────────────────── */
const lines = [
  `🏠 *${title}*`,
  ``,
  `🏗️ *Комплектация:*`
];

/* ===== 8.6. Комплектация (финальное состояние) ===== */

if (heightNote) pkg.push(heightNote);

  // Специальная комплектация для эконом-линейки (по прайсу поставщика)
  if (isEconomy) {
    // 1) Тип строения
    const buildingType = type === 'hoblok_economy' ? 'Деревянный хозблок' : 'Деревянная бытовка';
    pkg.push(`– Тип: ${buildingType}`);
    
    // 2) Размеры
    pkg.push(`– Внешний размер: ${w}×${l} м`);
    
    // 3) Планировка
    pkg.push("– Планировка: 1 комната");
    
    // 4) Высота потолка
    pkg.push("– Высота потолка: 1,95×2,14 м");
    
    // 5) Каркас
    pkg.push("– Обвязочный брус: 90×90 мм, обрезной, естественной влажности 25%");
    pkg.push("– Каркас: 45×45 мм обрезной, естественной влажности");
    
    // 6) Внешняя отделка
    pkg.push("– Внешняя отделка: вагонка категории С (небольшие дырки от сучков закрываем пеной)");
    
    // 7) Внутренняя отделка (базовая по прайсу или замененная опцией)
    const hasInteriorOSB = document.getElementById('chkInteriorOSB')?.checked;
    const hasInteriorVagonka = document.getElementById('chkInteriorVagonka')?.checked;
    
    if (type === 'hoblok_economy') {
      if (hasInteriorOSB) {
        pkg.push("– Внутренняя отделка: ОСП-9");
      } else if (hasInteriorVagonka) {
        pkg.push("– Внутренняя отделка: вагонка 'С'");
      } else {
        pkg.push("– Внутренняя отделка: нет");
      }
    } else {
      if (hasInteriorOSB) {
        pkg.push("– Внутренняя отделка: ОСП-9");
      } else if (hasInteriorVagonka) {
        pkg.push("– Внутренняя отделка: вагонка 'С'");
      } else {
        pkg.push("– Внутренняя отделка: оргалит (ДВП) 0,35 мм");
      }
    }
    
    // 8) Крыша
    const roofType = document.querySelector('input[name="economyRoof"]:checked')?.value;
    let roofText = "– Крыша: односкатная";
    if (roofType === 'gable_length') {
      roofText = "– Крыша: двускатная по длине";
    } else if (roofType === 'gable_width') {
      roofText = "– Крыша: двускатная по ширине";
    }
    pkg.push(roofText);
    
    // 9) Кровля
    pkg.push("– Кровля: профнастил оцинкованный С8");
    
    // 10) Пол
    if (type === 'bytovka_economy') {
      pkg.push("– Пол: ветроизоляция, черновой (обрезная доска 2-го сорта 22 мм), чистовой (обрезная доска 2-го сорта 22 мм), ОСП-9");
    } else {
      pkg.push("– Пол: обрезная доска 2-го сорта 22 мм");
    }
    
    // 11) Утепление (только для бытовок эконом)
    if (type === 'bytovka_economy') {
      const hasInsulation100 = document.getElementById('chkInsulation100')?.checked;
      if (hasInsulation100) {
        // Если выбрано утепление 100 мм, заменяем базовое
        pkg.push("– Утеплитель: 100 мм минвата, утеплены стены, пол, потолок");
      } else {
        // Базовое утепление 50 мм
        pkg.push("– Утеплитель: 50 мм минвата, утеплены стены, пол");
      }
    } else if (type === 'hoblok_economy') {
      // Хозблоки эконом без утепления
      pkg.push("– Утеплитель: нет");
    } else {
      pkg.push("– Утеплитель: нет");
    }
    
    // 12) Окна и двери (базовые по прайсу)
    pkg.push(`– Окна: ${baseWinQty} шт деревянное, размер ${baseWinSize}, открывается, одинарное`);
    pkg.push(`– Дверь: ${baseDoorQty} шт деревянная наборная, обшита вагонкой С`);
    
    // 10) Дополнительные опции (если выбраны)
    if (document.getElementById('chkCeilingInsulation')?.checked) {
      pkg.push("– Утепление потолка 50 мм");
    }
    // Внутренняя отделка уже добавлена в базовую комплектацию выше
    // Утепление 100 мм уже добавлено в базовую комплектацию выше
    if (document.getElementById('chkFireProtectionFloor')?.checked) {
      pkg.push("– Огнебиозащита пола");
    }
    if (document.getElementById('chkFireProtectionFrame')?.checked) {
      pkg.push("– Огнебиозащита каркаса");
    }
    if (type === 'bytovka_economy' && document.getElementById('chkVaporBarrier')?.checked) {
      pkg.push("– Паро- и ветроизоляция");
    }
    if (document.getElementById('chkSteps')?.checked) {
      pkg.push("– Ступени");
    }
    if (document.getElementById('chkRamp75')?.checked) {
      pkg.push("– Пандус 75 см");
    }
    if (document.getElementById('chkRamp160')?.checked) {
      pkg.push("– Пандус 160-180 см");
    }
    
    // 11) Сваи (если выбраны)
    const svaiType = document.getElementById('selSvaiType')?.value;
    const svaiQty = parseInt(document.getElementById('inpSvaiQty')?.value) || 0;
    if (svaiType && svaiQty > 0) {
      const svaiPrice = CONFIG[type].svai.prices[svaiType];
      const svaiTotal = svaiPrice * svaiQty;
      pkg.push(`– Сваи ${svaiType} (${svaiQty} шт): ${formatPrice(svaiTotal)} ₽`);
    }
    
    // 12) Дополнительные окна и двери (если выбраны)
    const windowsContainerEconomy = document.getElementById('windowsContainerEconomy');
    if (windowsContainerEconomy) {
      windowsContainerEconomy.querySelectorAll('.window-row').forEach(row => {
        const type = row.querySelector('.win-type')?.value;
        const size = row.querySelector('.win-size')?.value;
        const qty = parseInt(row.querySelector('.win-qty')?.value) || 0;
        
        if (type && size && qty > 0) {
          let price = 0;
          let label = "";
          
          if (type === 'woodWin') {
            price = ECONOMY_EXTRAS.windowsDoors.woodWindows[size] || 0;
            label = `Доп. окно деревянное ${size}`;
          } else if (type === 'pvcWin') {
            price = ECONOMY_EXTRAS.windowsDoors.pvcWindows[size] || 0;
            label = `Доп. окно ПВХ ${size}`;
          } else if (type === 'woodDoor') {
            price = ECONOMY_EXTRAS.windowsDoors.woodDoors[size] || 0;
            label = `Доп. дверь деревянная ${size}`;
          } else if (type === 'metalDoor') {
            price = ECONOMY_EXTRAS.windowsDoors.metalDoors[size] || 0;
            label = `Доп. дверь металлическая ${size}`;
          } else if (type === 'interiorDoor') {
            price = ECONOMY_EXTRAS.windowsDoors.interiorDoors[size] || 0;
            label = `Доп. дверь межкомнатная ${size}`;
          }
          
          if (price > 0) {
            const total = price * qty;
            pkg.push(`– ${label} (${qty} шт): ${formatPrice(total)} ₽`);
          }
        }
      });
    }
    
    // 13) Перегородки (если выбраны)
    const partitionsContainer = document.getElementById('partitionsContainerEconomy');
    if (partitionsContainer) {
      partitionsContainer.querySelectorAll('.partition-row').forEach(row => {
        const material = row.querySelector('.partition-material')?.value;
        const size = row.querySelector('.partition-size')?.value;
        const qty = parseInt(row.querySelector('.partition-qty')?.value) || 0;
        
        if (material && size && qty > 0) {
          const partitionPrices = {
            'organlit_2': 6600,    // 6000 + 10%
            'organlit_2.5': 7700,  // 7000 + 10%
            'organlit_3': 8250,    // 7500 + 10%
            'osb_2': 7700,         // 7000 + 10%
            'osb_2.5': 8800,       // 8000 + 10%
            'osb_3': 9900,         // 9000 + 10%
            'vagonka_2': 13200,    // 12000 + 10%
            'vagonka_2.5': 15950,  // 14500 + 10%
            'vagonka_3': 16500,    // 15000 + 10%
            'hoblok_2': 5500,      // 5000 + 10%
            'hoblok_2.5': 7150,    // 6500 + 10%
            'hoblok_3': 8250       // 7500 + 10%
          };
          
          const price = partitionPrices[size] || 0;
          if (price > 0) {
            const optionText = row.querySelector('.partition-size').selectedOptions[0].text;
            const total = price * qty;
            pkg.push(`– ${optionText} (${qty} шт): ${formatPrice(total)} ₽`);
          }
        }
      });
    }
    
    // Добавляем комплектацию для эконом-линейки в lines
    pkg.forEach(l => lines.push((l.startsWith('–') ? l : '– ' + l) + "  "));
    
} else {
  // Обычная комплектация для стандартной линейки
  // 0) Каркас (фиксированная запись)
  pkg.push("– Каркас: брус 50×100 мм (1 сорт, хвойный)");
  
  // 1) Наружная отделка
  pkg.push(`– Наружная отделка: ${MATERIAL_NAME[finalExt]}`);

  // 2) Внутренняя отделка
  if (finalInt) {                               // покажем, только если что-то выбрано
    pkg.push(`– Внутренняя отделка: ${MATERIAL_NAME[finalInt]}`);
  }


// 3) Утепление
if (type !== "hoblok") {
  const label = (selInsul.value === "none")
  ? (type === "bytovka"
        ? "Мин. вата 50 мм + ❗️ветро-влагоизоляция❗️"
        : "Мин. вата 100 мм + ❗️ветро-влагоизоляция❗️")
  : getLabel(selInsul.selectedOptions[0]);
  pkg.push(`– Утепление: ${label}`);
}

// 4) Кровля
pkg.push(`– Кровля: ${getLabel(selRoofMat.selectedOptions[0])}`);

// 5) Окна (деревянные по умолчанию) и двери базовые
let hasUserWindow = false;                    // новое имя


// -----------------------------------------------------------------

windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const size = row.querySelector(".win-size").value;
  const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | …
  if (size && (kind === "pvcWin" || kind === "woodWin")) hasUserWindow = true;
});

// 6) Перегородка по центру (база для дома)
if (type === "house") pkg.push("– Перегородка: по центру дома");

// 7) Доп-элементы пользователя
if (vw > 0 && vd > 0){
  pkg.push(`– Веранда: ${vw}×${vd} м (${isInsideVer ? 'внутренняя' : 'пристройка'})`);
}
if (chkMouse.checked) pkg.push("– Сетка «анти-мышь»");

if (partType !== "none" && partLen) {
  pkg.push(`– ${PART_TITLE[partType]} (${partLen} м)`);
}

if (selPile && selPile.value) {
  const pileCnt = getPileCount(type, w, l);          // ← корректное число свай
  pkg.push(`– Свайный фундамент: ${selPile.value} × ${pileCnt} шт`);
}

pkg.push(`– Окно деревянное ${baseWinSize} (${baseWinQty} шт)`);
pkg.push(`– ${baseDoorLabel} (${baseDoorQty} шт)`);

/* ──────── НОВЫЙ БЛОК: материал пола ──────── */
pkg.push("– " + FLOOR_CAPT[floorCode]);
/* ──────────────────────────────────────────── */


// 8) Высота помещения / потолка (учитываем extraH)
const extraHcm = +inpExtraH.value || 0;               // прибавка в см
const addM     = (extraHcm / 100).toFixed(2).replace('.', ','); // «0,10»

let heightLine;
if (type === "house") {
  const base = roofType === "lom"
    ? "от 2,1 м до 2,4 м"
    : "2,4 м по всему периметру";
  heightLine = extraHcm ? `${base} + ${addM} м` : base;
} else { // бытовка / хозблок
  const base = "2,10 м";
  heightLine = extraHcm ? `${base} + ${addM} м` : base;
}
pkg.push(`– Высота ${type==="house"?"помещения":"потолка"}: ${heightLine}`);


// — добавляем все пункты в основной массив —
pkg.forEach(l => lines.push((l.startsWith('–') ? l : '– ' + l) + "  "));
} // закрываем else для isEconomy

// ─── Площади: тёплая / веранда / общая ─────────────────────────
function nice(n){ return n.toFixed(1).replace('.', ','); }

const warmSq  = nice(warmArea);
const verSq   = nice(verArea);
const totalSq = nice(warmArea + verArea); 

lines.push('', '📐 *Площадь:*');      // один пустой отступ ПЕРЕД блоком

if (verArea > 0.01){
  lines.push(
    `– Тёплое помещение: ${warmSq} м²`,
    `– Пристройка / веранда: ${verSq} м²`
  );
}
lines.push(`– Общая площадь: ${totalSq} м²`);


/* ─── Блок «Стоимость» ───────────────────────────────────────── */
lines.push(
  ``,
  `💰 *Стоимость:*`
);

lines.push(`– Базовая: ${formatPrice(basePrice)} ₽  `);

if (hasRoute) {
  if (isEconomy) {
    // Детальная информация о доставке для эконом-линейки
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
    const assembly = document.getElementById('chkAssembly')?.checked;
    
    let deliveryText = "";
    if (deliveryType === 'manipulator') {
      deliveryText = `Доставка манипулятором: ${formatPrice(del)} ₽`;
    } else {
      deliveryText = `Доставка комплектами: ${formatPrice(del)} ₽`;
    }
    
    if (assembly) {
      deliveryText += `\n– Сборка на участке: ${formatPrice(CONFIG[type].delivery.assembly)} ₽`;
    }
    
    lines.push(`– ${deliveryText}  `);
  } else {
    lines.push(`– Доставка: ${formatPrice(del)} ₽  `);
  }
} else {
  if (isEconomy) {
    // Для эконом-линейки показываем точную сумму
    lines.push(`– Доставка: ${formatPrice(del)} ₽  `);
  } else {
    // Для стандартной линейки показываем "от"
    lines.push(`– Доставка: от ${formatPrice(del)} ₽  `);
  }
}

  linesExtra = Object.entries(extraMap).map(([label, sum]) => {
  // убираем «(1 шт)» из лейбла и вычисляем count
  const cnt = +(label.match(/\((\d+) шт\)/)?.[1] || 0); 
  const cleanLabel = label.replace(/\s*\(\d+ шт\)/, "");
  const pcs = cnt > 0 ? ` (${cnt} шт)` : "";              // выводим только если надо
  return `▪ ${cleanLabel}${pcs}: ${formatPrice(sum)} ₽`;
});

if (extras > 0) {
  lines.push(`– Дополнительно: ${formatPrice(extras)} ₽  `);
  lines.push(...linesExtra.map(l => ` ${l}`));
}
lines.push(
  ``,
  `👉 *Итого: ${formatPrice(total)} ₽*`
);

/* ─── «Подарки», сроки ─────────────────────────────────────────── */
const now = new Date();
const ex  = new Date(now);
ex.setDate(now.getDate() + 5);
const DD   = String(ex.getDate()).padStart(2, "0");
const MM   = String(ex.getMonth() + 1).padStart(2, "0");
const YYYY = ex.getFullYear();

// Подарки в зависимости от типа строения
if (isEconomy) {
  // Подарки для эконом-линейки по прайсу
  const gifts = [];
  
  // Стандартные подарки (из прайса)
  if (type === 'bytovka_economy') {
    gifts.push("Пол ОСП-9");
  }
  gifts.push("Обработка нижних лаг");
  gifts.push("Блоки фундамента");
  gifts.push("Электрика (1 выключатель + 1 розетка)");
  
  // Сборка в подарок при доставке газелью
  const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value;
  if (deliveryType === 'kit') {
    gifts.push("Сборка на участке");
  }
  
  // Дополнительные подарки по ширине (из прайса)
  if (wReal >= 2.5) {
    gifts.push("Ступени");
    gifts.push("Ветроизоляция по кругу");
  }
  
  if (wReal >= 3) {
    gifts.push("Утепление потолка");
    gifts.push("Каркас 40×100");
  }
  
  if (wReal >= 4) {
    gifts.push("Обработка каркаса");
  }
  
  lines.push(
    ``,
    `🎁 *Подарки:*`,
    ...gifts.map(gift => `– ${gift}  `),
    ``,
    `🕒 *Срок изготовления:* 1–2 дня  `,
    `💳 *Без предоплаты — оплата по факту*`,
    ``,
    `⏳ *Предложение действительно до ${DD}.${MM}.${YYYY}*`
  );
} else {
  // Обычные подарки для стандартной линейки
  lines.push(
    ``,
    `🎁 *Подарки:*`,
    `– Фундамент из блоков 40×20×20  `,
    `– Сборка за 1 день  `,
    `– Обработка полозьев антисептиком - защита от гниения  `,
    `– Ступеньки на вход  `,
    ``,
    `🕒 *Срок изготовления:* 1–2 дня  `,
    `💳 *Без предоплаты — оплата по факту*`,
    ``,
    `⏳ *Предложение действительно до ${DD}.${MM}.${YYYY}*`
  );
}
// ---------- БЛОК «Почему мы» (адаптированный под тип) ----------
if (isEconomy) {
  // Текст для эконом-линейки
  lines.push(
    "",
    "✅ *Почему мы — отличаемся от других:*",
    "– Опыт более 10 лет, работают одни и те же бригады",
    "– Дерево только хвойных пород, качественный каркас",
    "– Каркас и доска — только 1 сорт, прочный и ровный",
    "– Вагонка категории С, без синевы и гнили",
    "– Цена ниже, чем у большинства, при хорошем качестве",
    "– Гарантия на монтаж и материалы",
    "– Быстрая сборка и доставка"
  );
} else {
  // Текст для стандартной линейки
  lines.push(
    "",
    "✅ *Почему мы — отличаемся от других:*",
    "– Опыт более 10 лет, работают одни и те же бригады",
    "– Дерево только хвойных пород, не используем осину",
    "– Каркас и доска — только 1 сорт, прочный и ровный",
    "– Вагонка без синевы и гнили, отбираем вручную",
    "– Утепление с паро- и ветрозащитой — не экономим",
    "– Цена ниже, чем у большинства, при лучшем качестве",
    "– Гарантия на монтаж и материалы"
  );
}
// --------------------------------------------


out.innerHTML = lines.join("\n");
}

/* ------------------------------------------------------------------
   9. Умная система веранд
------------------------------------------------------------------ */

// Функция для обновления доступных длин при выборе ширины
function updateAvailableLengths() {
  const type = selType.value;
  const cfg = CONFIG[type];
  
  if (!cfg.isEconomy) return;
  
  const selectedWidth = inpWidth.value;
  if (!selectedWidth) return;
  
  // Находим все длины, которые есть в комбинации с выбранной шириной
  const availableLengths = [...new Set(
    Object.keys(cfg.basePrice)
      .filter(key => key.startsWith(selectedWidth + 'x'))
      .map(key => key.split('x')[1])
  )].sort((a, b) => parseFloat(a) - parseFloat(b));
  
  // Сохраняем текущую длину
  const currentLength = inpLength.value;
  
  // Обновляем выпадашку длин и разблокируем
  inpLength.innerHTML = availableLengths.map(l => `<option>${l}</option>`).join("");
  inpLength.disabled = false;
  
  // Устанавливаем длину
  if (availableLengths.includes(currentLength)) {
    inpLength.value = currentLength;
  } else {
    inpLength.value = availableLengths[0];
  }
  
  // Обновляем веранды и сваи
  updateVerandaOptions();
  updateSvaiRecommendation();
}

// Функция для поиска подходящих веранд по размерам
function findMatchingVerandas(width, length, type) {
  // Определяем тип для поиска в конфигурации веранд
  let verandaType;
  if (type === 'hoblok' || type === 'hoblok_economy') {
    verandaType = 'hoblok';
  } else if (type === 'bytovka' || type === 'bytovka_economy') {
    verandaType = 'bytovka';
  } else {
    return []; // Для других типов веранд нет
  }
  
  const availableVerandas = VERANDA_CONFIG[verandaType] || {};
  const matches = [];
  
  // Ищем веранды, где основное помещение совпадает с выбранным размером
  for (const [key, config] of Object.entries(availableVerandas)) {
    const [mainW, mainL] = config.main.split('x').map(Number);
    
    // Проверяем, подходит ли размер основного помещения
    if (mainW === width && mainL === length) {
      matches.push({
        key: key,
        main: config.main,
        veranda: config.veranda,
        price: config.price,
        description: `${config.main} + веранда ${config.veranda}`
      });
    }
  }
  
  return matches;
}

// Функция для обновления списка веранд
function updateVerandaOptions() {
  const type = selType.value;
  const width = parseFloat(inpWidth.value) || 0;
  const length = parseFloat(inpLength.value) || 0;
  
  // Показываем блок веранд только для эконом-линейки
  const verandaBlock = document.querySelector('.veranda-block');
  
  if (verandaBlock) {
    if (type === 'hoblok_economy' || type === 'bytovka_economy') {
      verandaBlock.style.display = 'block';
    } else {
      verandaBlock.style.display = 'none';
      return;
    }
  } else {
    return;
  }
  
  // Находим подходящие веранды
  const matches = findMatchingVerandas(width, length, type);
  
  // Обновляем селект веранд
  const verandaSelect = document.getElementById('selVeranda');
  
  if (verandaSelect) {
    verandaSelect.innerHTML = '<option value="">— без веранды —</option>';
    
    if (matches.length > 0) {
      matches.forEach(match => {
        const option = document.createElement('option');
        option.value = match.key;
        const priceWithMarkup = Math.round(match.price * 1.1 / 50) * 50; // +10% наценка
        // Короткий текст для компактности
        option.textContent = `${match.main} + ${match.veranda} — ${formatPrice(priceWithMarkup)} ₽`;
        verandaSelect.appendChild(option);
      });
    } else {
      const option = document.createElement('option');
      option.value = "";
      option.textContent = "Нет подходящих веранд для этого размера";
      option.disabled = true;
      verandaSelect.appendChild(option);
    }
  }
}

/* ------------------------------------------------------------------
   10. Геокодер + маршрут
------------------------------------------------------------------ */
async function getKm(address, isEconomy = false){
  try{
    if (typeof ymaps === 'undefined') {
      console.warn("Карты не загружены");
      return null;
    }
    
    // 1. Ищем координаты введённого адреса
    const res   = await ymaps.geocode(address,{results:1});
    const obj   = res.geoObjects.get(0);
    if(!obj){ alert("Адрес не найден"); return null; }

    const coords = obj.geometry.getCoordinates();   // точка клиента

    // 2. Выбираем базу в зависимости от типа строения
    const depot = isEconomy ? DEPOT_ECONOMY : DEPOT;
    
    // 3. Строим маршрут «база → клиент»
    const route = await ymaps.route([depot, coords], { avoidTolls:true });

    // 3. Длина маршрута в км
    const km = route.getLength() / 1000;

    // 4. Показываем под полем адреса
    document.getElementById('kmInfo').textContent =
          km.toFixed(1).replace('.', ',') + ' км';
 
// открыть карточку адреса (с левой панелью и кнопкой «Маршрут»)
const [lat, lon] = coords;                  // ymaps → [lat, lon]
const ll = `${lon},${lat}`;                 // в URL нужно lon,lat
const urlCard = `https://yandex.ru/maps/?text=${encodeURIComponent(address)}&ll=${ll}&z=16`;

const link = document.getElementById('mapLink');
link.href = urlCard;
link.textContent = address;
link.style.display = '';
document.getElementById('kmSep').style.display = '';


    // 5. Проверяем лимит 250 км
    if (km > MAX_KM){
      alert(`Доставка максимум ${MAX_KM} км от МКАД`);
      return null;
    }

    // 6. Рисуем маршрут на карте
    map.geoObjects.removeAll();
    map.geoObjects.add(route);

    return km;             // ← вернули число для расчётов
  }catch(e){
  console.error("Ошибка Яндекс.Карт:", e);
  return null;
}
}
  // Сброс всех фильтров и результата
function resetFilters() {
  selType.value = "house";
  handleTypeChange();
  inpAddr.value = "";
  out.textContent = "";
  map.geoObjects.removeAll();
  document.getElementById('kmInfo').textContent = '—'; 
  windowsContainer.innerHTML = "";
}

// Сброс только адреса и маршрута
function clearDelivery() {
  inpAddr.value = "";
  map.geoObjects.removeAll();
  document.getElementById('kmInfo').textContent = '—';
  document.getElementById('mapLink').style.display = 'none';
  document.getElementById('kmSep').style.display   = 'none';
  document.getElementById('mapLink').removeAttribute('href');

}
