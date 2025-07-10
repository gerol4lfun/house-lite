```javascript
/* ------------------------------------------------------------------
   1. КОНСТАНТЫ (копия ваших цифр, ничего не менял)
------------------------------------------------------------------ */
const RATE  = { lom:{ base:10450 }, gable:{ base:13750 } };
const DELIV = { '6x4':180,'6x5':200,'6x6':200,'6x7':200,
                '6x8':300,'6x9':300,'6x10':300,'8x8':300,'9x8':300 };
const INSUL   = { roll100:550, min150:2000, rock100:1000, basalt150:4000 };
const ROOFMAT = { profColor:750, tile_lom:800, tile_gable:1200 };
const VERANDA = { verRoof:7500, verGable:9000 };
const INREP   = { osb_vag:120, osb_imit:350, vag_imitBC:250,
                  vag_imitA:400, vag_block:1000, osb_vagA:500 };
const OUTREP  = { vag_ext:500, imitBC_ext:800, block_ext:1200, osb_extA:500 };
const FLOOR   = { floor:1000, mouse:400 };
const PART    = { p1:2500, p2:3200, p3:4000 };
const PART_TITLE = {
  p1:'перегородка односторонняя',
  p2:'перегородка двусторонняя',
  p3:'двустор. + утепл.100 мм'
};
const DOORS = {
  door1:3000, doorRamp:2000, doorFil:6000,
  doorMetal:12000, doorTh:30000, doorLux:35000
};
const PILES = {
  '2.0×76':3800,  '2.5×76':4100,  '3.0×76':4450,
  '2.0×89':4000,  '2.5×89':4400,  '3.0×89':4750,
  '2.0×108':4800, '2.5×108':5200, '3.0×108':5500
};
const PILE_COUNT = { '6x4':12,'6x5':12,'6x6':16,'6x8':20,
                     '6x9':24,'6x10':26,'8x8':28,'9x8':30 };
const WINDOWS = {
  '50×50':{1:5500,2:7000},  '60×90':{1:7500},   '60×120':{1:10000},
  '60×180':{1:12000,2:17000},                   '100×100':{1:9000},
  '100×120':{1:11000,2:14000},                  '120×120':{1:13000},
  '100×140':{1:14000},          '100×150':{1:15000},
  '120×150':{1:16500},          '140×150':{1:17000},
  '150×150':{1:17500},          '150×100':{1:15000},
  '150×180':{2:25000},          '150×190':{1:25000},
  '180×190':{1:26000},
  '90×205 дверь ПВХ':{2:35000}
};

/* ------------------------------------------------------------------
   2. DOM-элементы
------------------------------------------------------------------ */
const inpWidth   = document.getElementById('inpWidth');
const inpLength  = document.getElementById('inpLength');
const inpAddr    = document.getElementById('inpAddr');
const btnCalc    = document.getElementById('btnCalc');
const out        = document.getElementById('out');

const selInsul   = document.getElementById('selInsul');
const selRoofMat = document.getElementById('selRoofMat');
const selVeranda = document.getElementById('selVeranda');
const selInRep   = document.getElementById('selInRep');
const selOutRep  = document.getElementById('selOutRep');
const chkFloor   = document.getElementById('chkFloor');
const chkMouse   = document.getElementById('chkMouse');

const selPart    = document.getElementById('selPart');
const inpPartLen = document.getElementById('inpPartLen');

const selDoors   = document.getElementById('selDoors');
const chkRamp    = document.getElementById('chkRamp');

const selPile    = document.getElementById('selPile');

const btnAddWindow     = document.getElementById('btnAddWindow');
const windowsContainer = document.getElementById('windowsContainer');
const tmplWindowRow    = document.getElementById('tmplWindowRow');

/* ------------------------------------------------------------------
   3. Карта + подсказки (один ymaps.ready)
------------------------------------------------------------------ */
let map;                       // чтобы был доступ в getKm
ymaps.ready(() => {
  // карта
  map = new ymaps.Map('map', { center:[55.751244,37.618423], zoom:9 });

  // подсказки (SuggestView заменён на собственную реализацию)
  // new ymaps.SuggestView('inpAddr', { results:5 });

  // стартовые данные свай и кнопка добавления окон
  populatePileOptions();
  btnAddWindow.addEventListener('click', addWindowRow);
  [inpWidth, inpLength].forEach(el =>
    el.addEventListener('change', populatePileOptions));

  // кнопка «Рассчитать»
  btnCalc.onclick = calculate;

  /* ------------------------------------------------------------------
     Подсказки «как в теплицах»
  ------------------------------------------------------------------ */
  const boxSuggest = document.getElementById('addr-suggestions');

  /* показываем подсказки при вводе */
  inpAddr.addEventListener('input', () => {
    const q = inpAddr.value.trim();
    if (q.length < 2) {
      boxSuggest.style.display = 'none';
      return;
    }
    ymaps.geocode(q, { results: 5 })
      .then(res => {
        boxSuggest.innerHTML = '';
        res.geoObjects.each(obj => {
          const line = obj.getAddressLine();
          const div  = document.createElement('div');
          div.textContent = line;
          div.onclick = () => {
            inpAddr.value = line;
            boxSuggest.style.display = 'none';
            calculate();              // сразу считаем доставку
          };
          boxSuggest.appendChild(div);
        });
        boxSuggest.style.display =
          res.geoObjects.getLength() ? 'block' : 'none';
      })
      .catch(() => boxSuggest.style.display = 'none');
  });

  /* кликом вне поля скрываем список */
  document.addEventListener('click', e => {
    if (!inpAddr.parentElement.contains(e.target)) {
      boxSuggest.style.display = 'none';
    }
  });
});

/* ------------------------------------------------------------------
   4. Сваи
------------------------------------------------------------------ */
function populatePileOptions(){
  const w = +inpWidth.value, l = +inpLength.value;
  const key = `${w}x${l}`, cnt = PILE_COUNT[key]||12;
  selPile.innerHTML = '<option value="">— без свай —</option>';
  Object.entries(PILES).forEach(([dim,price])=>{
    selPile.innerHTML += `<option value="${dim}">${dim} × ${cnt} шт (${price.toLocaleString()} ₽/шт)</option>`;
  });
}

/* ------------------------------------------------------------------
   5. Динамические окна/двери ПВХ
------------------------------------------------------------------ */
function addWindowRow(){
  const clone = tmplWindowRow.content.cloneNode(true);
  const row   = clone.querySelector('.window-row');
  const selType = row.querySelector('.win-type');
  const selCam  = row.querySelector('.win-cam');
  const selSz   = row.querySelector('.win-size');
  const btnX    = row.querySelector('.btnRemoveWindow');

  // перестраиваем список размеров
  function rebuildSizes(){
    const cam    = selCam.value;
    const isDoor = selType.value === 'pvhdoor';
    selSz.innerHTML = '<option value="">— размер —</option>';

    Object.entries(WINDOWS).forEach(([size,cams])=>{
      if(isDoor){
        if(size.includes('дверь ПВХ')){
          const p = cams[2]||cams[1];
          selSz.innerHTML += `<option value="${size}">${size} (${p.toLocaleString()} ₽)</option>`;
        }
      } else if (cams[cam]){
        selSz.innerHTML += `<option value="${size}">${size} (${cams[cam].toLocaleString()} ₽)</option>`;
      }
    });
  }
  selCam .addEventListener('change', rebuildSizes);
  selType.addEventListener('change', rebuildSizes);
  rebuildSizes();

  btnX.addEventListener('click', () => row.remove());
  windowsContainer.appendChild(row);
}

/* ------------------------------------------------------------------
   6. Главная функция расчёта
------------------------------------------------------------------ */
async function calculate(){

  /* ----------- базовые размеры ----------- */
  const w = +inpWidth.value, l = +inpLength.value;
  if (w < 6 || l < 4) { alert('Минимум 6×4 м'); return; }

  const area = w * l;
  const roof = document.querySelector('input[name="roof"]:checked').value;
  const basePrice = Math.ceil(area * RATE[roof].base / 10) * 10;

  /* ----------- доставка ----------- */
  const addr = inpAddr.value.trim();
  if(!addr){ alert('Введите адрес'); return; }

  const km = await getKm(addr);        // строим маршрут + получаем км
  if (km === null) return;             // ошибка уже показана внутри
  if (km > 250) { alert('Доставка >250 км'); return; }

  const perKm = DELIV[`${w}x${l}`] || 300;
  const del   = Math.max(Math.ceil(perKm * km / 50) * 50, 7000);

  /* ----------- доп. услуги ----------- */
  let extras = 0, linesExtra = [];
  const add = (v, t) => { extras += v; linesExtra.push(`– ${t}: ${v.toLocaleString()} ₽`); };

  if (selInsul.value !== 'none')
    add(INSUL[selInsul.value] * area, selInsul.selectedOptions[0].text.split('(')[0]);

  if (selRoofMat.value !== 'none')
    add(ROOFMAT[selRoofMat.value] * area, selRoofMat.selectedOptions[0].text.split('(')[0]);

  if (selVeranda.value !== 'none')
    add(VERANDA[selVeranda.value] * area, selVeranda.selectedOptions[0].text.split('(')[0]);

  if (selInRep.value !== 'none')
    add(INREP[selInRep.value] * area, selInRep.selectedOptions[0].text.split('(')[0]);

  if (selOutRep.value !== 'none')
    add(OUTREP[selOutRep.value] * area, selOutRep.selectedOptions[0].text.split('(')[0]);

  if (chkFloor.checked) add(FLOOR.floor * area, 'Шпунт-пол');
  if (chkMouse.checked) add(FLOOR.mouse * area, 'Сетка «анти-мышь»');

  if (selPart.value !== 'none' && +inpPartLen.value > 0)
    add(PART[selPart.value] * +inpPartLen.value,
        `${PART_TITLE[selPart.value]} ${inpPartLen.value} м`);

  /* двери */
  Array.from(selDoors.selectedOptions).forEach(opt=>{
    if (opt.value !== 'none') add(DOORS[opt.value], opt.text.split('(')[0]);
  });
  if (chkRamp.checked) add(DOORS.doorRamp, 'Пандус под самонаборную');

  /* сваи */
  if (selPile.value){
    const cnt = PILE_COUNT[`${w}x${l}`] || 12;
    const price = PILES[selPile.value];
    add(price * cnt, `Сваи ${selPile.value} × ${cnt} шт`);
  }

  /* окна/двери ПВХ из динамической таблицы */
  document.querySelectorAll('.window-row').forEach(row=>{
    const type = row.querySelector('.win-type').value;
    const cam  = row.querySelector('.win-cam').value;
    const sz   = row.querySelector('.win-size').value;
    const qty  = parseInt(row.querySelector('.win-qty').value, 10) || 0;
    if (!sz || qty < 1) return;

    const cams  = WINDOWS[sz];
    const price = (type === 'pvhdoor') ? (cams[2] || cams[1]) : cams[cam];
    if (price) {
      add(price * qty,
          `${qty}× ${type === 'pvhdoor' ? 'Дверь ПВХ' : 'Окно'} ${sz}` +
          (type === 'window' ? ` ${cam}-камерное` : ``));
    }
  });

  /* ----------- итог ----------- */
  const total = basePrice + del + extras;

  const lines = [
    `🏠 Каркасный дом с ${roof==='lom' ? 'ломаной' : 'двускатной'} крышей ${w}×${l} — под ключ`,
    ``,
    `💰 Стоимость:`,
    `– Дом по базовой компл.: ${basePrice.toLocaleString()} ₽`,
    `– Доставка: ${del.toLocaleString()} ₽`
  ];
  if (extras > 0){
    lines.push(`– Доп. услуги: ${extras.toLocaleString()} ₽`, ...linesExtra);
  }
  lines.push(
    `👉 Итого: ${total.toLocaleString()} ₽`, ``,
    `📦 В комплекте:`,
    `– Наружн.: ${roof==='lom' ? 'Вагонка (B–C)' : 'Имитация бруса (B–C)'}`,
    `– Внутри: ОСБ-3`,
    `– Утепление: Мин.вата 100 мм`,
    `– Кровля: ${roof==='lom' ? 'Профнастил 0.4 мм' : 'Профлист / ондулин'}`,
    `– 3 окна 80×80 дерево`,
    `– Дверь РФ + перегородка`, ``,
    `🎁 Подарки:`,
    `– Фундамент из блоков`,
    `– Сборка за 1 день`,
    `– Обработка антисептиком`, ``,
    `🕒 Срок: 3–7 дней`,
    `💳 Без предоплаты — оплата по факту`
  );
  out.textContent = lines.join('\n');
}

/* ------------------------------------------------------------------
   7. Геокодер + маршрут (и рисуем его на карте)
------------------------------------------------------------------ */
async function getKm(address){
  try{
    const res = await ymaps.geocode(address, { results:1 });
    const obj = res.geoObjects.get(0);
    if (!obj){ alert('Адрес не найден'); return null; }

    const coords = obj.geometry.getCoordinates();
    const route  = await ymaps.route([[55.751244,37.618423], coords]);

    /* обновляем карту: очищаем старое и рисуем новое */
    map.geoObjects.removeAll();
    map.geoObjects.add(route);

    return route.getLength() / 1000;               // км
  }catch(e){
    alert('Ошибка Яндекс.Карт (см. консоль)');     // консоль = F12
    console.error(e);
    return null;
  }
}
```
