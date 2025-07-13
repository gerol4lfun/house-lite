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

/* ------------------------------------------------------------------
   1. Основные константы
------------------------------------------------------------------ */
function getLabel(opt) {
  return opt.text.replace(/\s*\([^)]*₽[^)]*\)/g, "").trim();
}

// Базовые тарифы
const RATE    = { lom:{ base:10450 }, gable:{ base:13750 } };
const DELIV   = {
  "6x4":180, "6x5":200, "6x6":200, "6x7":200,
  "6x8":300, "6x9":300, "6x10":300, "8x8":300,
  "9x8":300
};

// Опции по площади
const INSUL   = { roll100:550, min150:2000, rock100:1000, basalt150:4000 };
const ROOFMAT = { galv:0, ondulin:0, profColor:750, tile_lom:800, tile_gable:1200 };
const VERANDA = { verRoof:7500, verGable:9000 };

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

// Перегородки
const PART       = { p1:2500, p2:3200, p3:4000 };
const PART_TITLE = {
  p1: "Перегородка односторонняя",
  p2: "Перегородка двусторонняя",
  p3: "Перегородка двусторонняя с утеплением 100 мм"
};

// Двери и пандус
const DOORS = {
  door1:3000,
  doorRamp:2000,
  doorFil:6000,
  doorMetal:12000,
  doorTh:30000,
  doorLux:35000
};

// Сваи
const PILES = {
  "2.0×76":3800, "2.5×76":4100, "3.0×76":4450,
  "2.0×89":4000, "2.5×89":4400, "3.0×89":4750,
  "2.0×108":4800, "2.5×108":5200, "3.0×108":5500
};
const PILE_COUNT = {
  "6x4":12, "6x5":12, "6x6":16, "6x7":20,
  "6x8":20, "6x9":24, "6x10":26, "8x8":28,
  "9x8":30
};

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

/* ------------------------------------------------------------------
   2. Конфиг для трёх типов строений
------------------------------------------------------------------ */
const CONFIG = {
  hoblok: {
    widths:[3,4,5,6],
    lengths:[2,3],
    basePrice:{
      "3x2":58300,"4x2":64900,"5x2":73700,"6x2":78100,
      "3x3":68200,"4x3":82500,"5x3":93500,"6x3":99000
    },
    delivery:{ perKm1:80, perKm2:140, min:5000 },
    verandaPrice:7500
  },
  bytovka: {
    widths:[3,4,5,6],
    lengths:[2,3],
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
      ["osb_extA",  "Вагонка A (500 ₽/м²)"]
    ]
  },
  hoblok_lom: {
    inner: [],
    outer: [
      ["none",      "— без изменений —"],
      ["vag_ext",   "Вагонка B–C (500 ₽/м²)"],
      ["imitBC_ext","Имитация бруса B–C (250 ₽/м²)"],
      ["imitA_ext", "Имитация бруса A (400 ₽/м²)"],
      ["block_ext", "Блок-хаус (1000 ₽/м²)"],
      ["vag_extA",  "Вагонка B–C → вагонка A (380 ₽/м²)"]
    ]
  }
};

/* ------------------------------------------------------------------
   3. Получаем DOM-элементы
------------------------------------------------------------------ */
const selType      = document.getElementById("selType");
const inpWidth     = document.getElementById("inpWidth");
const inpLength    = document.getElementById("inpLength");
const inpAddr      = document.getElementById("inpAddr");
const btnCalc      = document.getElementById("btnCalc");
const out          = document.getElementById("out");

const selInsul     = document.getElementById("selInsul");
const selRoofMat   = document.getElementById("selRoofMat");
const selInRep     = document.getElementById("selInRep");
const selOutRep    = document.getElementById("selOutRep");
const chkFloor     = document.getElementById("chkFloor");
const chkMouse     = document.getElementById("chkMouse");

const selPart      = document.getElementById("selPart");
const inpPartLen   = document.getElementById("inpPartLen");

const selDoors     = document.getElementById("selDoors");
const chkRamp      = document.getElementById("chkRamp");

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
    center:[55.751244,37.618423],
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
  const key = `${type}_${roof}`;
  const profile = FINISH_PROFILES[key];
  if (!profile) return;

  // — внутренняя отделка —
  selInRep.innerHTML = "";
  profile.inner.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selInRep.appendChild(opt);
  });

  // — внешняя отделка —
  selOutRep.innerHTML = "";
  profile.outer.forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selOutRep.appendChild(opt);
  });

  // Скрываем блок с внутренней отделкой, если нет вариантов
  selInRep.closest("label").style.display =
    profile.inner.length === 0 ? "none" : "";
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

  // 1) ширина/длина
  inpWidth.innerHTML  = "";
  cfg.widths.forEach(w => inpWidth.innerHTML  += `<option>${w}</option>`);
  inpLength.innerHTML = "";
  cfg.lengths.forEach(l => inpLength.innerHTML += `<option>${l}</option>`);

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
  [selInsul, selRoofMat, selInRep, selOutRep, selPart, selDoors].forEach(sel => {
    Array.from(sel.options).forEach(o => o.disabled = false);
    sel.value = sel.options[0].value;
    sel.closest('label').style.display = 'block';
  });
  chkFloor.checked = chkMouse.checked = chkRamp.checked = false;

  // 9) дополнительные правки по типу строения
  if (type === "house") {
    selInsul.querySelector('option[value="roll100"]').disabled = true;
  }
  selRoofMat.querySelector('option[value="galv"]').disabled = true;
  if (type==="house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    selOutRep.querySelector(`option[value="${roof==="lom"?"vag_ext":"imitBC_ext"}"]`).disabled = true;
  } else {
    selOutRep.querySelector('option[value="vag_ext"]').disabled = true;
  }
  selDoors.querySelector('option[value="door1"]').disabled = true;

  // (перегородки теперь доступны всегда)
  // 10) сброс веранды и обновление свай
  inpVerWidth.value = "";
  inpVerDepth.value = "";
  populatePileOptions();
}


/* ------------------------------------------------------------------
   6. populatePileOptions — наполняем селект сваями
------------------------------------------------------------------ */
function populatePileOptions(){
  const w = +inpWidth.value, l = +inpLength.value;
  const cnt = PILE_COUNT[`${w}x${l}`]||12;
  selPile.innerHTML = '<option value="">— без свай —</option>';
  Object.entries(PILES).forEach(([dim, price])=>{
    selPile.innerHTML += `<option value="${dim}">${dim} × ${cnt} шт (${formatPrice(price)} ₽/шт)</option>`;
  });
}

/* ------------------------------------------------------------------
   7. addWindowRow — добавляем строку «Окно/дверь ПВХ»
------------------------------------------------------------------ */
function addWindowRow(){
  const clone = tmplWindowRow.content.cloneNode(true);
  const row   = clone.querySelector(".window-row");
  const selTypeWin = row.querySelector(".win-type");
  const selCam     = row.querySelector(".win-cam");
  const selSz      = row.querySelector(".win-size");
  const btnX       = row.querySelector(".btnRemoveWindow");

  function rebuild(){
    const cam = selCam.value, isDoor = selTypeWin.value==="pvhdoor";
    selSz.innerHTML = '<option value="">— размер —</option>';
    Object.entries(WINDOWS).forEach(([size,cams])=>{
      if(isDoor){
        if(size.includes("дверь ПВХ")){
          const p = cams[2]||cams[1];
          selSz.innerHTML += `<option value="${size}">${size} (${formatPrice(p)} ₽)</option>`;
        }
      } else if(cams[cam]){
        selSz.innerHTML += `<option value="${size}">${size} (${formatPrice(cams[cam])} ₽)</option>`;
      }
    });
  }

  selCam.addEventListener("change", rebuild);
  selTypeWin.addEventListener("change", rebuild);
  rebuild();
  btnX.addEventListener("click", ()=>row.remove());
  windowsContainer.appendChild(row);
}

// Человекочитаемые названия материалов
const MATERIAL_NAME = {
  osb:"ОСБ-3 плита",
  vagBC:"Вагонка B–C",
  vagA:"Вагонка A",
  imitB:"Имитация бруса B–C",
  imitA:"Имитация бруса A",
  block:"Блок-хаус"
};
// Прямые цены замены (₽/м²)
const REPLACEMENT_PRICES = {
  osb:   { vagBC:120, vagA:500, imitB:350, imitA:520, block:1120 },
  vagBC: { vagA:380, imitB:250, imitA:400, block:1000 },
  imitB: { imitA:750, block:600, vagA:150 }
};


/* ------------------------------------------------------------------
   8. calculate — основная функция расчёта
------------------------------------------------------------------ */
async function calculate(){
  const type = selType.value;
  const w = +inpWidth.value, l = +inpLength.value;
  let basePrice = 0, del = 0, finalInt, finalExt;

  /* ===== 8.1. Геокод + маршрут ===== */
  const addr = inpAddr.value.trim();
  if (!addr) { alert("Введите адрес"); return; }
  const km = await getKm(addr);
  if (km === null) return;

  /* ===== 8.2. Базовая стоимость и доставка ===== */
  const area = w * l;
  if (type === "house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    basePrice = Math.ceil(area * RATE[roof].base / 10) * 10;
    if (km > 250) { alert("Доставка >250 км"); return; }
    const perKm = DELIV[`${w}x${l}`] || 300;
    del = Math.max(Math.ceil(perKm * km / 50) * 50, 7000);
  } else {
    const cfg = CONFIG[type];
    basePrice = cfg.basePrice[`${w}x${l}`] || 0;
    const veh = (w > 4 || l > 4) ? 2 : 1;
    const rateKm = veh > 1 ? cfg.delivery.perKm2 : cfg.delivery.perKm1;
    del = Math.max(Math.ceil(rateKm * km * veh / 50) * 50, cfg.delivery.min);
  }

  /* ===== 8.3. Доп. опции ===== */
  let extras = 0, linesExtra = [];

  // универсальная функция
  function addExtra(sum, label){
    if(!sum || sum<=0) return;
    extras += sum;
    linesExtra.push(`▪ ${label}: ${formatPrice(sum)} ₽`);
  }

  /* --- 1. Утепление (если > базового) --- */
  if (selInsul.value !== "none") {
    const diff = INSUL[selInsul.value] - INSUL.roll100;
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

  /* --- 5. Шпунт-пол и «анти-мышь» --- */
  if (chkFloor.checked) addExtra(FLOOR.floor * area, "Шпунт-пол");
  if (chkMouse.checked) addExtra(FLOOR.mouse * area, "Сетка «анти-мышь»");

  /* --- 6. Перегородки --- */
  const partType = selPart.value;
  const partLen  = parseFloat(inpPartLen.value) || 0;
  if (partType!=="none" && partLen>0) {
    addExtra(PART[partType]*partLen, `${PART_TITLE[partType]} (${partLen} м)`);
  }

  /* --- 7. Двери и пандус --- */
  if (selDoors.value!=="none") {
    addExtra(DOORS[selDoors.value], getLabel(selDoors.selectedOptions[0]));
  }
  if (chkRamp.checked) {
    addExtra(DOORS.doorRamp, "Пандус под самонаборную дверь");
  }

  /* --- 8. Сваи --- */
  if (selPile.value) {
    const dim = selPile.value;
    const cnt = PILE_COUNT[`${w}x${l}`]||12;
    const price = PILES[dim] * cnt;
    addExtra(price, `Свайный фундамент ${dim} × ${cnt} шт`);
  }

  /* --- 9. Окна / двери ПВХ --- */
  windowsContainer.querySelectorAll(".window-row").forEach(row=>{
    const typeWin = row.querySelector(".win-type").value;
    const cam     = row.querySelector(".win-cam").value;
    const size    = row.querySelector(".win-size").value;
    const qty     = parseInt(row.querySelector(".win-qty").value) || 1;
    if(!size) return;
    const pricePer = WINDOWS[size][typeWin==="pvhdoor"?2:cam];
    addExtra(pricePer*qty, `${typeWin==="pvhdoor"?"Дверь ПВХ":"Окно ПВХ"} ${size} (${qty} шт)`);
  });

  /* ===== 8.4. Логика отделки (замена материала) ===== */
  // внутренняя отделка
  if (type !== "hoblok" && selInRep.value !== "none") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    const intBase = (type === "house")
      ? (roof === "lom" ? "osb" : "vagBC")
      : "osb";
    const codeMapIn = {
      osb_vag:"vagBC", osb_imit:"imitB", osb_vagA:"vagA", osb_block:"block",
      vag_imitBC:"imitB", vag_imitA:"imitA", vag_block:"block"
    };
    const intTgt = codeMapIn[selInRep.value];
    const priceIn = (REPLACEMENT_PRICES[intBase]||{})[intTgt] || 0;
    addExtra(priceIn * area, `${MATERIAL_NAME[intBase]} → ${MATERIAL_NAME[intTgt]}`);
    finalInt = intTgt;
  } else {
    finalInt = (type === "hoblok")
      ? null
      : (type === "house"
        ? (document.querySelector('input[name="roof"]:checked').value === "lom" ? "osb" : "vagBC")
        : "osb");
  }

  // внешняя отделка
  if (selOutRep.value !== "none") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    const extBase = (type === "house")
      ? (roof === "lom" ? "vagBC" : "imitB")
      : "vagBC";
    const codeMapOut = {
      imitBC_ext:"imitB", imitA_ext:"imitA", block_ext:"block", osb_extA:"vagA", vag_extA:"vagA"
    };
    const extTgt = codeMapOut[selOutRep.value] || "vagA";
    const priceOut = (REPLACEMENT_PRICES[extBase]||{})[extTgt] || 0;
    addExtra(priceOut * area, `${MATERIAL_NAME[extBase]} → ${MATERIAL_NAME[extTgt]}`);
    finalExt = extTgt;
  } else {
    finalExt = (type === "house")
      ? (document.querySelector('input[name="roof"]:checked').value === "lom" ? "vagBC" : "imitB")
      : "vagBC";
  }

  /* ===== 8.5. Итоговые строки КП ===== */
  const total = basePrice + del + extras;
  const roofType = document.querySelector('input[name="roof"]:checked').value;
  const title = (type === "house")
    ? `Каркасный дом с ${roofType==="lom"?"ломаной":"двускатной"} крышей ${w}×${l} — под ключ`
    : `${selType.options[selType.selectedIndex].text} ${w}×${l} — под ключ`;

  const lines = [
    `🏠 **${title}**`,
    ``,
    `💰 **Стоимость:**`,
    `– Базовая: ${formatPrice(basePrice)} ₽  `,
    `– Доставка: ${formatPrice(del)} ₽  `
  ];
  if (extras > 0) {
    lines.push(`– Дополнительно: ${formatPrice(extras)} ₽  `);
    lines.push(...linesExtra.map(l=>` ${l}`));
  }
  lines.push(
    ``,
    `👉 **Итого: ${formatPrice(total)} ₽**`,
    ``,
    `🏗️ **Комплектация:**`
  );

  /* ===== 8.6. Комплектация (финальное состояние) ===== */
  const pkg = [];

  // 1) Наружная отделка
  pkg.push(`– Наружная отделка: ${MATERIAL_NAME[finalExt]}`);

  // 2) Внутренняя отделка
  if (type !== "hoblok") {
    pkg.push(`– Внутренняя отделка: ${MATERIAL_NAME[finalInt]}`);
  }

  // 3) Утепление
  pkg.push(`– Утепление: ${getLabel(selInsul.selectedOptions[0]) || "Мин. вата 100 мм + ВВИ"}`);

  // 4) Кровля
  pkg.push(`– Кровля: ${getLabel(selRoofMat.selectedOptions[0])}`);

  // 5) Окна (деревянные по умолчанию) и двери базовые
let hasPVCwindow = false;

windowsContainer.querySelectorAll(".window-row").forEach(row => {
  const size = row.querySelector(".win-size").value;
  if (size && row.querySelector(".win-type").value === "window") {
    hasPVCwindow = true;
  }
});

// если ПВХ-окон нет — выводим базовые деревянные
if (!hasPVCwindow) {
  if (type === "house") {
    pkg.push("– Окна: 3 × деревянные 80×80 см");
  } else {
    pkg.push("– Окно: деревянное 60×90 см (1 шт)");
  }
}

// двери базовые (самонаборные) остаются без условий
if (type === "house") {
  pkg.push("– Двери РФ: самонаборные, 1 комплект");
} else {
  pkg.push("– Дверь: самонаборная 200×70–90 см");
}



  // 6) Перегородка по центру (база для дома)
  if (type==="house") pkg.push("– Перегородка: по центру дома, входит в базу");

  // 7) Доп-элементы, указанные пользователем
  //    (здесь выводим только факт, без цен и стрелок)
  if (vw>0 && vd>0) pkg.push(`– Веранда: ${vw}×${vd} м`);
  if (chkFloor.checked) pkg.push("– Шпунт-пол");
  if (chkMouse.checked) pkg.push("– Сетка «анти-мышь»");
  if (partType!=="none" && partLen>0) pkg.push(`– ${PART_TITLE[partType]} (${partLen} м)`);
  if (selDoors.value!=="none") pkg.push(`– ${getLabel(selDoors.selectedOptions[0])}`);
  if (chkRamp.checked) pkg.push("– Пандус под самонаборную дверь");
  if (selPile.value) pkg.push(`– Свайный фундамент: ${selPile.value} × ${(PILE_COUNT[`${w}x${l}`]||12)} шт`);
  // окна ПВХ
  windowsContainer.querySelectorAll(".window-row").forEach(row=>{
    const typeWin = row.querySelector(".win-type").value;
    const size    = row.querySelector(".win-size").value;
    const qty     = parseInt(row.querySelector(".win-qty").value) || 1;
    if(size) pkg.push(`– ${typeWin==="pvhdoor"?"Дверь ПВХ":"Окно ПВХ"} ${size} (${qty} шт)`);
  });

  // высота помещения
  if (type==="house") {
    pkg.push(
      roofType==="lom"
        ? "– Высота помещения: от 2,1 м до 2,4 м"
        : "– Высота помещения: 2,4 м по всему периметру"
    );
  } else {
    pkg.push(`– Высота потолка: ${type==="bytovka"?"2,00":"2,10"} м`);
  }

  // вставляем в lines
  pkg.forEach(l=>lines.push(l+"  "));

  /* ===== 8.7. «Подарки», сроки ===== */
  const now = new Date();
  const ex  = new Date(now);
  ex.setDate(now.getDate() + 5);
  const DD   = String(ex.getDate()).padStart(2, "0");
  const MM   = String(ex.getMonth() + 1).padStart(2, "0");
  const YYYY = ex.getFullYear();

  lines.push(
    ``,
    `🎁 **Подарки:**`,
    `– Фундамент из блоков  `,
    `– Сборка за 1 день  `,
    `– Обработка антисептиком  `,
    ``,
    `🕒 **Срок изготовления:** 3–7 дней  `,
    `💳 **Без предоплаты — оплата по факту**`,
    ``,
    `⏳ *Предложение действительно до ${DD}.${MM}.${YYYY}*`
  );

  out.innerHTML = lines.join("\n");
}

/* ------------------------------------------------------------------
   9. Геокодер + маршрут
------------------------------------------------------------------ */
async function getKm(address){
  try{
    const res   = await ymaps.geocode(address,{results:1});
    const obj   = res.geoObjects.get(0);
    if(!obj){ alert("Адрес не найден"); return null; }
    const coords= obj.geometry.getCoordinates();
    const route = await ymaps.route([[55.751244,37.618423], coords]);
    map.geoObjects.removeAll();
    map.geoObjects.add(route);
    return route.getLength()/1000;
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
  windowsContainer.innerHTML = "";
}

// Сброс только адреса и маршрута
function clearDelivery() {
  inpAddr.value = "";
  map.geoObjects.removeAll();
}

