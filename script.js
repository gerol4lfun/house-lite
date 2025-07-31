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

/* --- высота стен и площадь стен -------------------------------- */
function getWallHeight(type, roof, ext = false){
  // 8) Высота помещения / потолка  ← ОБНОВЛЁННЫЙ БЛОК
const extraHcm   = +inpExtraH.value || 0;   // берём надбавку из поля
const addMeters  = (extraHcm / 100).toFixed(2).replace('.', ','); // «0,10»
const baseHouse  = roof === "lom"
                   ? "от 2,1 м до 2,4 м"
                   : "2,4 м по всему периметру";
const baseOther  = "2,10 м";

if (type === "house") {
  if (extraHcm) {
    pkg.push(`– Высота помещения: ${baseHouse} + ${addMeters} м`);
  } else {
    pkg.push(`– Высота помещения: ${baseHouse}`);
  }
} else {                               // бытовка или хозблок
  if (extraHcm) {
    pkg.push(`– Высота потолка: ${baseOther.slice(0, -2)} + ${addMeters} м`);
  } else {
    pkg.push(`– Высота потолка: ${baseOther}`);
  }
}

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
const DEPOT = [55.621800, 37.441432];   // точка отгрузки

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
  board50x150: 1000,
  planed35x140: 1400
};
const FLOOR_CAPT = {
  plain: "Пол: обрезная доска 25×150 мм",
  osb:   "Пол: ОСБ влагостойкий",
  board50x150: "Пол: чистовой 50×150 мм",
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
  "3x4":9,  "3x5":9,   "3x6":9
};
// ▸ вернуть «правильное» количество свай по типу и размеру
function getPileCount(type, w, l) {
  // две записи одного и того же размера – «3x4» и «4x3»
  const k1 = `${w}x${l}`;
  const k2 = `${l}x${w}`;

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



// Окна ПВХ / двери ПВХ
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

/* ------------------------------------------------------------------
   2. Конфиг для трёх типов строений
------------------------------------------------------------------ */
const CONFIG = {
  hoblok: {
    widths:[3,4,5,6],
    lengths:[2,2.5,3],
    basePrice:{
      "3x2":58300,"4x2":64900,"5x2":73700,"6x2":78100,
      "3x3":68200,"4x3":82500,"5x3":93500,"6x3":99000
    },
    delivery:{ perKm1:80, perKm2:140, min:5000 },
    verandaPrice:7500
  },
  bytovka: {
    widths:[3,4,5,6],
    lengths:[2,2.5,3],
    basePrice:{
      "3x2":79200,"4x2":89100,"5x2":99000,"6x2":103400,
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
  }
};

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
ymaps.ready(() => {
  map = new ymaps.Map("map", {
    center:DEPOT,
    zoom:9
  });
  // ─── Подсказки адреса, как в тепличном калькуляторе ───────────────────────────
const addrInput   = document.getElementById('inpAddr');
const suggBox     = document.getElementById('suggestions');

addrInput.addEventListener('input', () => {
    const q = addrInput.value.trim();
    if (q.length < 3) {            // меньше 3-х символов — ничего не показываем
        suggBox.style.display = 'none';
        return;
    }

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
});

// клик мимо блока — закрываем подсказки
document.addEventListener('click', e => {
    if (!e.target.closest('.address-container')) suggBox.style.display = 'none';
});



  // слушаем события
  selType.addEventListener("change", handleTypeChange);
  document.querySelectorAll('input[name="roof"]').forEach(r=>r.addEventListener("change", handleTypeChange));
  btnAddWindow.addEventListener("click", addWindowRow);
  [inpWidth, inpLength].forEach(el => el.addEventListener("change", populatePileOptions));
  btnCalc.addEventListener("click", calculate);
  btnReset.addEventListener("click", resetFilters);
btnClearAddr.addEventListener("click", clearDelivery);


  handleTypeChange();
});

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
    opt.textContent = label;
    selInRep.appendChild(opt);
  });

  // — внешняя —
  selOutRep.innerHTML = "";
  outer.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selOutRep.appendChild(opt);
  });

  // **Возвращаем default, если нет опций**
  if (inner.length === 0) selInRep.value  = "none";
  if (outer.length === 0) selOutRep.value = "none";

  // если вариантов внутренней отделки нет — прячем label
  selInRep.closest("label").style.display =
    inner.length === 0 ? "none" : "";
}

/* ------------------------------------------------------------------
   5. handleTypeChange: обновляем форму при смене типа строения
------------------------------------------------------------------ */
function handleTypeChange() {
  const type = selType.value;
  const cfg  = CONFIG[type];

  // текущая крыша
  const roof = document.querySelector('input[name="roof"]:checked').value;
  updateFinishSelects(type, roof);

  // 1) ширина / длина
inpWidth.innerHTML =
  cfg.widths.map(w => `<option>${w}</option>`).join("");
inpWidth.value = cfg.widths[0];          // ← первая ширина по умолчанию

inpLength.innerHTML =
  cfg.lengths.map(l => `<option>${l}</option>`).join("");
inpLength.value = cfg.lengths[0];        // ← первая длина по умолчанию

  // 2) показываем блок «Тип крыши» и меняем подписи
  roofContainer.style.display = "block";
  roofContainer.querySelectorAll("label").forEach(lbl => {
    const inp = lbl.querySelector("input[name='roof']");
    if (!inp) return;
    lbl.childNodes[1].nodeValue = inp.value === "lom"
      ? (type==="house" ? " Ломаная" : " Односкатная (базовая)")
      : (type==="house" ? " Двускатная" : " Двускатная (+1 800 ₽/м²)");
  });

  // 8) сбрасываем остальные селекты и чекбоксы
[selInsul, selRoofMat, selInRep, selOutRep, selPart].forEach(sel => {
  // 1. разрешаем все опции
  Array.from(sel.options).forEach(o => o.disabled = false);

  // 2. ставим первое значение
  if (sel.options.length) sel.value = sel.options[0].value;

  // 3. показываем label (если вдруг был скрыт)
  sel.closest('label').style.display = 'block';
});

// -------------------------
// уже затем – то, что добавляем
// -------------------------

selFloor.value = "plain";        // базовый пол
chkMouse.checked = chkRamp.checked = false;


// если выбран хозблок – прячем утепление
if (selType.value === 'hoblok') {
  selInsul.value = 'none';                       // ставим «без изменений»
  selInsul.closest('label').style.display = 'none'; // сам label прячем
} else {
  selInsul.closest('label').style.display = '';  // в остальных строениях показываем
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
}


/* ------------------------------------------------------------------
   6. populatePileOptions — наполняем селект сваями
------------------------------------------------------------------ */
function populatePileOptions () {
  const type = selType.value;
  const w    = +inpWidth.value;
  const l    = +inpLength.value;

  const cnt  = getPileCount(type, w, l);

  // 👉  для домов (type==='house') Ø76 не показываем
  const skip76 = (type === "house" && cnt > 12);       // все дома ≥ 6×4 м

  selPile.innerHTML = '<option value="">— без свай —</option>';
  Object.entries(PILES).forEach(([dim, price]) => {
    if (skip76 && dim.includes("×76")) return;  
    if (dim === "1.5×76" && cnt > 12) return;             // пропускаем 76-е
    selPile.innerHTML +=
      `<option value="${dim}">${dim} × ${cnt} шт (${formatPrice(price)} ₽/шт)</option>`;
  });
}


/* ------------------------------------------------------------------
   7. addWindowRow — добавляем строку «Окно / дверь»
------------------------------------------------------------------ */
function addWindowRow () {
  const clone = tmplWindowRow.content.cloneNode(true);
  const row   = clone.querySelector(".window-row");

  const selType = row.querySelector(".win-type");   // pvcWin | woodWin | pvcDoor | woodDoor
  const selCam  = row.querySelector(".win-cam");    // 1-кам / 2-кам  (только для ПВХ-окон)
  const selSize = row.querySelector(".win-size");   // размеры / варианты
  const qtyInp  = row.querySelector(".win-qty");
  const btnX    = row.querySelector(".btnRemoveWindow");

  // карты для деревянных дверей (чисто для подписи)
  const DOOR_CAPTION = { std:"Обычная", hinge:"Распашная", hingeWarm:"Распашная утеплённая",
  filen: "Филенчатая" };

  // перестраиваем drop-down при любом изменении
  function rebuild () {
    const t = selType.value;         // выбранный «тип»

    /* 1. показывать ли поле «кам.» */
    selCam.style.display = (t === "pvcWin") ? "" : "none";

    /* 2. наполняем список размеров / вариантов */
    selSize.innerHTML = '<option value="">— размер / тип —</option>';

    if (t === "pvcWin") {                        // ▸ окно ПВХ
      const cam = selCam.value;
      Object.entries(WINDOWS).forEach(([sz, cams]) => {
        if (cams[cam]) {
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(cams[cam])} ₽)</option>`;
        }
      });

    } else if (t === "pvcDoor") {                // ▸ дверь ПВХ
      Object.entries(WINDOWS).forEach(([sz, cams]) => {
        if (sz.includes("дверь ПВХ")) {
          const p = cams[2] || cams[1];
          selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(p)} ₽)</option>`;
        }
      });

    } else if (t === "woodWin") {                // ▸ окно деревянное
      Object.entries(WOOD_PRICES.win).forEach(([sz, p]) => {
        selSize.innerHTML += `<option value="${sz}">${sz} (${formatPrice(p)} ₽)</option>`;
      });

    } else if (t === "woodDoor") {               // ▸ дверь деревянная
      Object.entries(WOOD_PRICES.door).forEach(([key, p]) => {
        selSize.innerHTML +=
          `<option value="${key}">${DOOR_CAPTION[key]} (${formatPrice(p)} ₽)</option>`;
      });
    
    } else if (t === "metalDoor") {                     // ▸ дверь металлическая
  const CAPTION = {
    rf:        "Дверь металлическая РФ",
    rfThermo:  "Дверь РФ (термо)",
    thermoLux: "Термо Люкс"
  };
  Object.entries(METAL_PRICES).forEach(([code, p]) => {
    selSize.innerHTML +=
      `<option value="${code}">${CAPTION[code]} (${formatPrice(p)} ₽)</option>`;
  });
 }

  }

  // ─── события ───────────────────────────────────────────────────
  selType.addEventListener("change", rebuild);
  selCam .addEventListener("change", rebuild);
  btnX   .addEventListener("click", () => row.remove());

  rebuild();                       // первичное заполнение
  windowsContainer.appendChild(row);
}


// Человекочитаемые названия материалов
const MATERIAL_NAME = {
  osb:"ОСБ влагостойкая",
  vagBC:"Вагонка B (без сколов и синевы)",
  vagA:"Вагонка A (отборная)",
  imitB:"Имитация бруса B (без сколов и синевы)",
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

function pricePer10cm(w, l) {
  if (w <= 6 && l <= 3) return 10000;   // до 6×3
  if (w <= 6 && l <= 6) return 20000;   // до 6×6
  return 30000;                         // всё что больше
}


/* ------------------------------------------------------------------
   8. calculate — основная функция расчёта
------------------------------------------------------------------ */
async function calculate(){
  const type = selType.value;

  // --- реальные размеры, как выбрал пользователь ---
  const wReal = parseFloat(inpWidth.value);   // ширина
  const lReal = parseFloat(inpLength.value);  // длина (2, 2.5 или 3)

  // --- размеры, по которым смотрим прайсовую цену ---
  let wPrice = wReal;          // ширина всегда «как есть»
  let lPrice = lReal;          // длина 2.5 → 3 (для хозблоков/бытовок)

  if (type !== "house") {      // только для хозблоков и бытовок
    if (lReal === 2.5) lPrice = 3;
  }

  const w = wReal;   // ← «короткие» имена, как раньше
  const l = lReal;

  let basePrice = 0, del = 0, finalInt, finalExt;

  /* ===== 8.2. Базовая стоимость и доставка ===== */
  const area = w * l;
  // ── подготовка доставки ─────────────────────────────
const veh = (w > 4 || l > 4) ? 2 : 1;      // 1 или 2 машины

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
  km = await getKm(address);        // вернёт число или null
  if (km === null) return;          // getKm уже показал alert
  hasRoute = true;
}

// 3. если маршрута нет (пустой адрес) — доставка = минималка
if (!hasRoute) {
  del = minDeliv;
} else {
  // 3.1 выбираем тариф за 1 км
  let rate;
  if (type === "house") {                 // дом
    const key = `${w}x${l}`;              // например "6x5"
    rate = DELIV[key] || 300;             // 180 / 200 / 300; 300 — «запасной»
  } else {                                // хозблок или бытовка
    rate = (veh === 2)
      ? CONFIG[type].delivery.perKm2      // 140 / 180 р км
      : CONFIG[type].delivery.perKm1;     // 80 / 100 р км
  }

  // 3.2 считаем стоимость и применяем порог
  let cost = rate * km;
  if (cost < minDeliv) cost = minDeliv;

  // 3.3 округляем до 50 ₽
  del = Math.ceil(cost / 50) * 50;
}

// ───── БАЗОВАЯ СТОИМОСТЬ ─────
if (type === 'house') {                     // дом
  const roof = document.querySelector('input[name="roof"]:checked').value;
  basePrice = Math.ceil(area * RATE[roof].base / 10) * 10;

} else if (type === 'hoblok') {             // хозблок
  basePrice = getHoblokBasePrice(wPrice, lPrice);

} else {                                    // бытовка
  basePrice = CONFIG.bytovka.basePrice[`${wPrice}x${lPrice}`] || 0;
}


  /* ===== 8.3. Доп. опции ===== */
  let extras = 0, linesExtra = [];

    // универсальная функция — собираем в map
  const extraMap = {};
  function addExtra(sum, label){
    if(!sum || sum<=0) return;
    // добавляем к общей сумме
    extras += sum;
    // накапливаем по ярлыку
    if (extraMap[label]) {
      extraMap[label] += sum;
    } else {
      extraMap[label] = sum;
    }
  }

  /* --- 1. Утепление (если > базового) --- */
  // --- 1. Утепление (считаем только для бытовки и дома) ---
if (selType.value !== "hoblok" && selInsul.value !== "none") {
  // базовая толщина: 50 мм у бытовки, 100 мм у остальных
const baseInsulPrice = (type === "bytovka") ? 0 : INSUL.roll100;
const diff = INSUL[selInsul.value] - baseInsulPrice;
  if (diff > 0) addExtra(diff * area, getLabel(selInsul.selectedOptions[0]));
}


  /* --- 2. Кровля (цветной/металлочерепица) --- */
  if (selRoofMat.value !== "galv" && selRoofMat.value !== "ondulin") {
    addExtra(ROOFMAT[selRoofMat.value] * area, getLabel(selRoofMat.selectedOptions[0]));
  }

  /* --- 3. Доплата за двускатную крышу для хозблоков/бытовок --- */
  if (type !== "house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    if (roof === "gable") {
      addExtra(1800 * area, "Двускатная крыша");
    }
  }

  /* --- 4. Веранда --- */
  const vw = parseFloat(inpVerWidth.value) || 0;
  const vd = parseFloat(inpVerDepth.value) || 0;
  const verRoof = document.querySelector('input[name="verRoofType"]:checked')?.value || "verRoof";
  if (vw>0 && vd>0) {
    const verArea = vw * vd;
    addExtra(VERANDA[verRoof] * verArea, `Веранда ${vw}×${vd} м`);
  }

  /* --- 5. Шпунт-пол, высота и «анти-мышь» --- */
const floorCode  = document.getElementById('selFloor').value;
const floorExtra = FLOOR_MAT[floorCode] * area;
if (floorExtra) addExtra(floorExtra, FLOOR_CAPT[floorCode]);

// ▸ увеличение высоты
const extraH = +inpExtraH.value || 0;        // введено в см
let heightNote = "";                         // <— добавили
if (extraH > 0) {
  const steps = Math.ceil(extraH / 10);
  const addH  = steps * pricePer10cm(w, l);
  addExtra(addH, `Высота +${extraH} см`);
  heightNote = `– Высота увеличена на ${extraH} см`;   // <— запомнили
}

if (chkMouse.checked) addExtra(FLOOR.mouse * area, "Сетка «анти-мышь»");


  /* --- 6. Перегородки --- */
  const partType = selPart.value;
  const partLen  = parseFloat(inpPartLen.value) || 0;
  if (partType!=="none" && partLen>0) {
    addExtra(PART[partType]*partLen, `${PART_TITLE[partType]} (${partLen} м)`);
  }

  /* --- 8. Сваи --- */
  if (selPile.value) {
    const dim = selPile.value;
    const cnt  = getPileCount(type, w, l);
    const price = PILES[dim] * cnt;
    addExtra(price, `Свайный фундамент ${dim} × ${cnt} шт`);
  }

  /* --- 9. Пандус --- */
if (chkRamp.checked) addExtra(RAMP, "Пандус");

  /* --- 9. Окна / двери (все варианты) --- */
windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | pvcDoor | woodDoor
  const cam  = row.querySelector(".win-cam").value;
  const sel  = row.querySelector(".win-size");
  const code = sel.value;                 // строка-код из <option value="…">
  const qty  = +row.querySelector(".win-qty").value || 1;
  if (!code) return;                      // ничего не выбрано

  let price = 0, caption = "";

  switch (kind) {
    case "pvcWin":
      price   = WINDOWS[code][cam];
      caption = `Окно ПВХ ${code}`;
      break;

    case "pvcDoor":
      price   = WINDOWS[code][2] || WINDOWS[code][1];
      caption = `Дверь ПВХ ${code}`;
      break;

    case "woodWin":
      price   = WOOD_PRICES.win[code];
      caption = `Окно деревянное ${code}`;
      break;

    case "woodDoor":
      price   = WOOD_PRICES.door[code];
      const cap = { std:"Обычная", hinge:"Распашная", hingeWarm:"Распашная утеплённая" }[code];
      caption = `Дверь деревянная (${cap})`;
      break;
      case "metalDoor":
    price   = METAL_PRICES[code];
    caption = { rf:"Дверь РФ",
                rfThermo:"Дверь РФ (термо)",
                thermoLux:"Термо Люкс" }[code];
    break;
  }

  if (price) addExtra(price * qty, `${caption} (${qty} шт)`);
});

  /* ===== 8.4. Логика отделки (замена материала) ===== */

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

  /* ===== 8.5. Итоговые строки КП ===== */
const total    = basePrice + del + extras;
const roofType = document.querySelector('input[name="roof"]:checked').value;
const title    = (type === "house")
  ? `Каркасный дом с ${roofType === "lom" ? "ломаной" : "двускатной"} крышей ${w}×${l} — под ключ`
  : `${selType.options[selType.selectedIndex].text} ${w}×${l} — под ключ`;

/* ─── Заголовок + блок «Комплектация» ───────────────────────────── */
const lines = [
  `🏠 *${title}*`,
  ``,
  `🏗️ *Комплектация:*`
];

/* ===== 8.6. Комплектация (финальное состояние) ===== */
const pkg = [];

if (heightNote) pkg.push(heightNote);

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

windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const size = row.querySelector(".win-size").value;
  const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | …
  if (size && (kind === "pvcWin" || kind === "woodWin")) hasUserWindow = true;
});

if (!hasUserWindow) {
  if (type === "house") pkg.push("– Окна: 3 × деревянные 80×80 см");
  else                  pkg.push("– Окно: деревянное 60×90 см (1 шт)");
}

// 5) Базовые двери
if (type === "house") {
  // у дома есть центральная перегородка → нужно 2 двери
  pkg.push("– Двери РФ: самонаборные (2 шт)");
} else {
  pkg.push("– Дверь: самонаборная 200×70–90 см");
}

// 6) Перегородка по центру (база для дома)
if (type === "house") pkg.push("– Перегородка: по центру дома");

// 7) Доп-элементы пользователя
if (vw > 0 && vd > 0) pkg.push(`– Веранда: ${vw}×${vd} м`);
if (chkMouse.checked) pkg.push("– Сетка «анти-мышь»");

if (partType !== "none" && partLen) {
  pkg.push(`– ${PART_TITLE[partType]} (${partLen} м)`);
}

if (selPile.value) {
  const pileCnt = getPileCount(type, w, l);          // ← корректное число свай
  pkg.push(`– Свайный фундамент: ${selPile.value} × ${pileCnt} шт`);
}

/* --- Окна / двери пользователя --- */
windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const kind = row.querySelector(".win-type").value;   // pvcWin | woodWin | pvcDoor | woodDoor | metalDoor
  const size = row.querySelector(".win-size").value;
  const qty  = +row.querySelector(".win-qty").value || 1;
  if (!size) return;

  // Заголовок строки
  const textMap = {
    pvcWin:   "Окно ПВХ",
    pvcDoor:  "Дверь ПВХ",
    woodWin:  "Окно деревянное",
    woodDoor: "Дверь деревянная",
    metalDoor:"Дверь металлическая"
  };
  const title = textMap[kind] || "Окно/дверь";

  // «Красивые» подписи для специальных размеров / кодов
  const NICE_WOOD  = {
    std:       "обычная",
    hinge:     "распашная",
    hingeWarm: "распашная утеплённая",
    filen:     "филенчатая"
  };
  const NICE_METAL = {
    rf:        "РФ",
    rfThermo:  "РФ (термо)",
    thermoLux: "Термо Люкс"
  };

  const nice =
        (kind === "woodDoor")  ? (NICE_WOOD[size]  || size) :
        (kind === "metalDoor") ? (NICE_METAL[size] || size) :
                                 size;

  pkg.push(`– ${title} ${nice} (${qty} шт)`);
});


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
pkg.forEach(l => lines.push(l + "  "));

/* ─── Блок «Стоимость» ───────────────────────────────────────── */
lines.push(
  ``,
  `💰 *Стоимость:*`
);

lines.push(`– Базовая: ${formatPrice(basePrice)} ₽  `);

if (hasRoute) {
  lines.push(`– Доставка: ${formatPrice(del)} ₽  `);
} else {
  lines.push(`– Доставка: от ${formatPrice(del)} ₽  `);
}

  linesExtra = Object.entries(extraMap).map(([label, sum]) => {
  // убираем «(1 шт)» из лейбла и вычисляем count
  const cnt = (label.match(/\((\d+) шт\)/)?.[1] || 1);
  const cleanLabel = label.replace(/\s*\(\d+ шт\)/, "");
  return `▪ ${cleanLabel} (${cnt} шт): ${formatPrice(sum)} ₽`;
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
// ---------- НОВЫЙ БЛОК «Почему мы» ----------
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
// --------------------------------------------


out.innerHTML = lines.join("\n");

}

/* ------------------------------------------------------------------
   9. Геокодер + маршрут
------------------------------------------------------------------ */
async function getKm(address){
  try{
    // 1. Ищем координаты введённого адреса
    const res   = await ymaps.geocode(address,{results:1});
    const obj   = res.geoObjects.get(0);
    if(!obj){ alert("Адрес не найден"); return null; }

    const coords = obj.geometry.getCoordinates();   // точка клиента

    // 2. Строим маршрут «база → клиент»
    const route = await ymaps.route([DEPOT, coords], { avoidTolls:true });

    // 3. Длина маршрута в км
    const km = route.getLength() / 1000;

    // 4. Показываем под полем адреса
    document.getElementById('kmInfo').textContent =
          km.toFixed(1).replace('.', ',') + ' км';
    
     // ссылка: маршрут «от моего местоположения → к клиенту»
const [lon, lat] = coords;                        // порядок: долгота, широта
const url = `https://yandex.ru/maps/?rtext=~${lon},${lat}&rtt=auto`;

const link = document.getElementById('mapLink');
link.href        = url;                           // куда кликнёт водитель
link.textContent = address;                       // что он увидит
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
    alert("Ошибка Яндекс.Карт (см. консоль)");
    console.error(e);
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
