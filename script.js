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
const INREP   = { osb_vag:120, osb_imit:350, vag_imitBC:250, vag_imitA:400, vag_block:1000, osb_vagA:500 };
const OUTREP  = { vag_ext:500, imitBC_ext:250, block_ext:1000, osb_extA:500 };
const FLOOR   = { floor:1000, mouse:400 };

// Перегородки
const PART       = { p1:2500, p2:3200, p3:4000 };
const PART_TITLE = {
  p1:"перегородка односторонняя",
  p2:"перегородка двусторонняя",
  p3:"двустор. + утепл.100 мм"
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

// Новые поля для веранды:
const inpVerWidth  = document.getElementById("verWidth");
const inpVerDepth  = document.getElementById("verDepth");

/* ------------------------------------------------------------------
   4. Инициализация Яндекс.Карт и обработчики
------------------------------------------------------------------ */
let map;
ymaps.ready(() => {
  map = new ymaps.Map("map", {
    center:[55.751244,37.618423],
    zoom:9
  });
  new ymaps.SuggestView("inpAddr",{ results:5 });

  // слушаем события
  selType.addEventListener("change", handleTypeChange);
  document.querySelectorAll('input[name="roof"]').forEach(r=>r.addEventListener("change", handleTypeChange));
  btnAddWindow.addEventListener("click", addWindowRow);
  [inpWidth, inpLength].forEach(el => el.addEventListener("change", populatePileOptions));
  btnCalc.addEventListener("click", calculate);

  handleTypeChange();
});

/* ------------------------------------------------------------------
   5. handleTypeChange: обновляем форму при смене типа строения
------------------------------------------------------------------ */
function handleTypeChange() {
  const type = selType.value;
  const cfg  = CONFIG[type];

  // — 1) ширина/длина
  inpWidth.innerHTML  = "";
  cfg.widths.forEach(w => inpWidth.innerHTML  += `<option>${w}</option>`);
  inpLength.innerHTML = "";
  cfg.lengths.forEach(l => inpLength.innerHTML += `<option>${l}</option>`);

  // — 2) показываем блок «Тип крыши» и меняем подписи
  roofContainer.style.display = "block";
  roofContainer.querySelectorAll("label").forEach(lbl => {
    const inp = lbl.querySelector("input[name='roof']");
    if (!inp) return;
    if (inp.value === "lom") {
      lbl.childNodes[1].nodeValue =
        type==="house" ? " Ломаная" : " Односкатная (базовая)";
    }
    if (inp.value === "gable") {
      lbl.childNodes[1].nodeValue =
        type==="house" ? " Двускатная" : " Двускатная (+1 800 ₽/м²)";
    }
  });

  // — 3) сбрасываем все доп. селекты и чекбоксы
  [selInsul, selRoofMat, selInRep, selOutRep, selPart, selDoors].forEach(sel=>{
    Array.from(sel.options).forEach(o=>o.disabled=false);
    sel.value = sel.options[0].value;
  });
  chkFloor.checked = chkMouse.checked = chkRamp.checked = false;

  // — 4) утепление: отключаем roll100 у дома
  if (type === "house") selInsul.querySelector('option[value="roll100"]').disabled = true;

  // — 5) кровля: отключаем galv везде
  selRoofMat.querySelector('option[value="galv"]').disabled = true;

  // — 6) внешняя отделка: отключаем базовую
  if (type==="house") {
    const roof = document.querySelector('input[name="roof"]:checked').value;
    selOutRep.querySelector(`option[value="${roof==="lom"?"vag_ext":"imitBC_ext"}"]`).disabled = true;
  } else {
    selOutRep.querySelector('option[value="vag_ext"]').disabled = true;
  }

  // — 7) двери: отключаем door1
  selDoors.querySelector('option[value="door1"]').disabled = true;

  // — 8) перегородки: у дома все отключаем
  if (type==="house") {
    Array.from(selPart.options).forEach(o=>{ if(o.value!=="none") o.disabled=true; });
  }

  // — 9) веранду сбрасываем
  inpVerWidth.value = "";
  inpVerDepth.value = "";
  // радиокнопки оставляем по умолчанию

  // — 10) сваи
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

/* ------------------------------------------------------------------
   8. calculate — основная функция расчёта
------------------------------------------------------------------ */
async function calculate(){
  const type = selType.value;
  const w = +inpWidth.value, l = +inpLength.value;
  let basePrice=0, del=0;

  // 8.1. Геокод + маршрут
  const addr = inpAddr.value.trim();
  if(!addr){ alert("Введите адрес"); return; }
  const km = await getKm(addr);
  if(km===null) return;

  // 8.2. Базовая и доставка
  if(type==="house"){
    const area = w*l;
    const roof = document.querySelector('input[name="roof"]:checked').value;
    basePrice = Math.ceil(area*RATE[roof].base/10)*10;
    if(km>250){ alert("Доставка >250 км"); return; }
    const perKm = DELIV[`${w}x${l}`]||300;
    del = Math.max(Math.ceil(perKm*km/50)*50,7000);
  } else {
    const cfg = CONFIG[type];
    basePrice = cfg.basePrice[`${w}x${l}`]||0;
    const veh = (w>4||l>4)?2:1;
    const rateKm = veh>1?cfg.delivery.perKm2:cfg.delivery.perKm1;
    del = Math.max(Math.ceil(rateKm*km*veh/50)*50, cfg.delivery.min);
  }

  // 8.3. Доп. услуги
  let extras=0, linesExtra=[];
  function add(sum, desc){
    extras += sum;
    linesExtra.push(`▪ ${desc}: ${formatPrice(sum)} ₽`);
  }

  // утепление
  if(selInsul.value!=="none"){
    const diff = INSUL[selInsul.value] - INSUL.roll100;
    if(diff>0) add(diff*w*l, `Мин. вата 100→${getLabel(selInsul.selectedOptions[0])}`);
  }
  // кровля
  if(selRoofMat.value!=="galv"&&selRoofMat.value!=="ondulin"){
    add(ROOFMAT[selRoofMat.value]*w*l, `Профнастил→${getLabel(selRoofMat.selectedOptions[0])}`);
  }
  if(type!=="house"){
    const roof = document.querySelector('input[name="roof"]:checked').value;
    if(roof==="gable"){
      const area = w*l, cost = 1800*area;
      add(cost, `Двускатная крыша: ${area} м²×1 800 ₽/м²`);
    }
  }
  // фасад
  if(selOutRep.value!=="none"){
    const def = type==="house"
      ?(document.querySelector('input[name="roof"]:checked').value==="lom"?"Вагонка B–C":"Имитация бруса B–C")
      :"Вагонка B–C";
    const defKey = def.includes("Вагонка")?"vag_ext":"imitBC_ext";
    const diff = OUTREP[selOutRep.value] - OUTREP[defKey];
    add(diff*w*l, `${def}→${getLabel(selOutRep.selectedOptions[0])}`);
  }
  // веранда по размерам
  const vw = parseFloat(inpVerWidth.value)||0;
  const vd = parseFloat(inpVerDepth.value)||0;
  if(vw>0&&vd>0){
    const areaV = vw*vd;
    const verType = document.querySelector('input[name="verRoofType"]:checked').value;
    const rate = VERANDA[verType];
    const cost = Math.ceil(rate*areaV);
    add(cost, `Веранда ${vw}×${vd} м (${areaV.toFixed(1)} м²)`);
  }
  // внутр. отделка
  if(selInRep.value!=="none"){
    add(INREP[selInRep.value]*w*l, `ОСБ→${getLabel(selInRep.selectedOptions[0])}`);
  }
  // пол/сетка
  if(chkFloor.checked) add(FLOOR.floor*w*l, "Шпунт-пол");
  if(chkMouse.checked) add(FLOOR.mouse*w*l, "Сетка «анти-мышь»");
  // перегородки
  if(selPart.value!=="none"&&+inpPartLen.value>0){
    add(PART[selPart.value]*+inpPartLen.value, `${PART_TITLE[selPart.value]} ${inpPartLen.value} м`);
  }
  // двери/пандус
  Array.from(selDoors.selectedOptions).forEach(o=>{
    if(o.value!=="none") add(DOORS[o.value], getLabel(o));
  });
  if(chkRamp.checked) add(DOORS.doorRamp, "Пандус под самонаборную");
  // сваи
  if(selPile.value){
    const cnt = PILE_COUNT[`${w}x${l}`]||12;
    add(PILES[selPile.value]*cnt, `Сваи ${selPile.value} × ${cnt} шт`);
  }
  // окна/двери ПВХ
  document.querySelectorAll(".window-row").forEach(row=>{
    const t = row.querySelector(".win-type").value;
    const c = row.querySelector(".win-cam").value;
    const s = row.querySelector(".win-size").value;
    const q = +row.querySelector(".win-qty").value||0;
    if(!s||q<1) return;
    const cams = WINDOWS[s];
    const price = t==="pvhdoor" ? (cams[2]||cams[1]) : cams[c];
    const pref  = t==="pvhdoor" ? "Дверь ПВХ" : "Окно ПВХ";
    add(price*q, `${q}× ${pref} ${s}`);
  });

  // 8.4. Собираем итоговые строки
  const total = basePrice + del + extras;
  const roof = document.querySelector('input[name="roof"]:checked').value;
  const title = type==="house"
    ? `Каркасный дом с ${roof==="lom"?"ломаной":"двускатной"} крышей ${w}×${l} — под ключ`
    : `${selType.options[selType.selectedIndex].text} ${w}×${l} — под ключ`;

  const lines = [
    `🏠 **${title}**`,
    ``,
    `💰 **Стоимость:**`,
    `– Базовая: ${formatPrice(basePrice)} ₽  `,
    `– Доставка: ${formatPrice(del)} ₽  `
  ];

  if(extras>0){
    lines.push(`– Дополнительно: ${formatPrice(extras)} ₽  `);
    lines.push(...linesExtra.map(l=>` ${l}`));
  }

  lines.push(
    ``,
    `👉 **Итого: ${formatPrice(total)} ₽**`,
    ``,
    `🏗️ **Комплектация:**`
  );

  // 8.5. Формируем «Комплектацию» — только итоговый материал
const pkg = [];

// 1) Наружная отделка
if (selOutRep.value !== "none") {
  // если выбрана замена — выводим новый материал
  pkg.push(`– Наружная отделка: ${getLabel(selOutRep.selectedOptions[0])}`);
} else if (type === "house") {
  pkg.push(
    roof === "lom"
      ? "– Наружная отделка: Вагонка хвойная, сорт B–C"
      : "– Наружная отделка: Имитация бруса, сорт B–C"
  );
} else {
  pkg.push("– Наружная отделка: Вагонка, сорт B–C");
}
// 2) Внутренняя отделка
let finalIn;
if (selInRep.value !== "none") {
  finalIn = getLabel(selInRep.selectedOptions[0]);
} else {
  finalIn = type === "house" ? "ОСБ-3 плита" : "ОСБ-9 мм";
}
pkg.push(`– Внутренняя отделка: ${finalIn}`);

// ... остальной pkg оставляем без изменений

  // утепление
  pkg.push(type==="house"
    ? "– Утепление: мин. вата 100 мм + ветро-влагоизоляция"
    : "– Утепление: НЕМАН мин. вата 50 мм + ветро-влагоизоляция"
  );
  // кровля
  pkg.push(`– Кровля: ${getLabel(selRoofMat.selectedOptions[0])}`);
  // окна/двери
  if(type==="house"){
    pkg.push("– Окна: 3 × деревянные 80×80 см");
    pkg.push("– Двери РФ: самонаборные, 1 комплект");
  } else {
    pkg.push("– Окно: деревянное 60×90 см (1 шт)");
    pkg.push("– Дверь: самонаборная");
  }
  // перегородка/высота
  if(type==="house"){
    pkg.push("– Перегородка: по центру, входит в базу");
    pkg.push(roof==="lom"
      ? "– Высота помещения: от 2,1 м до 2,4 м"
      : "– Высота помещения: 2,4 м по всему периметру");
  } else {
    pkg.push("– Высота потолка: 2,10 м");
  }
  // веранда итогово
  if(vw>0&&vd>0){
    pkg.push(`– Веранда: ${vw}×${vd} м`);
  }
  pkg.forEach(p=> lines.push(p+"  "));

  // подарки и сроки
  lines.push(
    ``,
    `🎁 **Подарки:**`,
    `– Фундамент из блоков  `,
    `– Сборка за 1 день  `,
    `– Обработка антисептиком  `,
    ``,
    `🕒 **Срок изготовления:** 3–7 дней  `,
    `💳 **Без предоплаты — оплата по факту**`
  );

  // спецпредложение
  const now=new Date(), ex=new Date(now);
  ex.setDate(now.getDate()+5);
  const DD   = String(ex.getDate()).padStart(2,"0");
  const MM   = String(ex.getMonth()+1).padStart(2,"0");
  const YYYY = ex.getFullYear();
  lines.push(`⏳ *Предложение действительно до ${DD}.${MM}.${YYYY}*`);

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
