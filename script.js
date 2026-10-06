// ---------- ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ----------
const navItems = document.querySelectorAll('#nav .nav-item');
const sections = document.querySelectorAll('.section');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(item.dataset.section).classList.add('active');
  });
});

// ---------- ОПИСАНИЯ ТИПОВ ----------
const typeDescriptions = {
  domain: { title: 'Домен', text: 'Введи домен — получишь WHOIS, DNS-записи, поддомены из Certificate Transparency и данные ASN.' },
  email:  { title: 'Email',  text: 'Введи email — проверим MX-записи, SPF/DKIM/DMARC, участие в утечках и связанные аккаунты.' },
  ip:     { title: 'IP',     text: 'Введи IP — узнаешь геолокацию, ASN, открытые порты, баннеры сервисов и историю резолва.' },
  nick:   { title: 'Ник',    text: 'Введи никнейм — найдём аккаунты на площадках, связанные профили и упоминания в открытых источниках.' },
  phone:  { title: 'Номер',  text: 'Введи номер телефона — определим оператора, регион, мессенджеры и публичные упоминания.' }
};

const types = document.querySelectorAll('#types span');
const typeDesc = document.getElementById('typeDescription');
let currentType = 'domain';

types.forEach(t => {
  t.addEventListener('click', () => {
    types.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    currentType = t.dataset.type;
    const d = typeDescriptions[currentType];
    if (d) typeDesc.innerHTML = `<h3>${d.title}</h3><p>${d.text}</p>`;
  });
});

// ---------- ЯЗЫК ----------
const langs = document.querySelectorAll('#lang span');
const profileLang = document.getElementById('profileLang');
const langNames = { ru: 'Русский', uk: 'Українська', kz: 'Қазақша', en: 'English' };

langs.forEach(l => {
  l.addEventListener('click', () => {
    langs.forEach(x => x.classList.remove('active'));
    l.classList.add('active');
    if (profileLang) profileLang.textContent = langNames[l.dataset.lang] || 'Русский';
    localStorage.setItem('lang', l.dataset.lang);
  });
});

// восстановление языка
const savedLang = localStorage.getItem('lang');
if (savedLang) {
  langs.forEach(x => {
    x.classList.toggle('active', x.dataset.lang === savedLang);
  });
  if (profileLang) profileLang.textContent = langNames[savedLang] || 'Русский';
}

// ---------- КАТАЛОГ ----------
const tools = [
  { name: 'Shodan',       desc: 'Поиск устройств и открытых портов',            url: 'https://shodan.io',          tag: 'сеть' },
  { name: 'Censys',       desc: 'Сканирование интернета и хостов',              url: 'https://search.censys.io',   tag: 'сеть' },
  { name: 'crt.sh',       desc: 'Certificate Transparency — поддомены',          url: 'https://crt.sh',             tag: 'домены' },
  { name: 'VirusTotal',   desc: 'Репутация доменов, IP и файлов',               url: 'https://virustotal.com',     tag: 'репутация' },
  { name: 'urlscan.io',   desc: 'Анализ сайтов и скриншоты',                    url: 'https://urlscan.io',         tag: 'веб' },
  { name: 'HIBP',         desc: 'Проверка email в утечках',                     url: 'https://haveibeenpwned.com', tag: 'утечки' },
  { name: 'Sherlock',     desc: 'Поиск аккаунтов по нику',                      url: 'https://github.com/sherlock-project/sherlock', tag: 'соцсети' },
  { name: 'Holehe',       desc: 'Проверка email на площадках',                  url: 'https://github.com/megadose/holehe', tag: 'почта' },
  { name: 'DNSDumpster',  desc: 'Карта DNS-записей домена',                     url: 'https://dnsdumpster.com',    tag: 'домены' },
  { name: 'Wayback',      desc: 'Архив старых версий сайтов',                   url: 'https://web.archive.org',    tag: 'архив' },
  { name: 'IPinfo',       desc: 'Геолокация и ASN для IP',                      url: 'https://ipinfo.io',          tag: 'сеть' },
  { name: 'BGPView',      desc: 'ASN, префиксы, маршруты BGP',                  url: 'https://bgpview.io',         tag: 'сеть' }
];

const grid = document.getElementById('catalogGrid');
if (grid) {
  tools.forEach(t => {
    const a = document.createElement('a');
    a.className = 'tool';
    a.href = t.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `<div class="name">${t.name}</div>
                   <div class="desc">${t.desc}</div>
                   <span class="tag">${t.tag}</span>`;
    grid.appendChild(a);
  });
}

// ---------- ИСТОРИЯ ЗАПРОСОВ ----------
const historyList = document.getElementById('historyList');
const profileScans = document.getElementById('profileScans');

function getHistory() {
  try { return JSON.parse(localStorage.getItem('history') || '[]'); }
  catch { return []; }
}

function saveHistory(h) { localStorage.setItem('history', JSON.stringify(h)); }

function renderHistory() {
  const h = getHistory();
  if (profileScans) profileScans.textContent = h.length;

  if (!historyList) return;

  if (!h.length) {
    historyList.innerHTML = '<div class="history-empty">Пока пусто. Сделай первый запрос.</div>';
    return;
  }

  historyList.innerHTML = h.slice(0, 20).map(item =>
    `<div class="history-item">
       <span class="q">${item.q}</span>
       <span class="t">${item.t}</span>
     </div>`
  ).join('');
}

function addHistory(q) {
  const h = getHistory();
  const now = new Date();
  const time = now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  h.unshift({ q, t: time });
  saveHistory(h.slice(0, 50));
  renderHistory();
}

renderHistory();

// ---------- ПОИСК ----------
const searchInput = document.querySelector('#search .search-bar input');
const searchBtn = document.querySelector('#search .search-bar button');

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (!val) return;
    addHistory(val);
    alert(`Запрос сохранён: ${val}\n\nРеальный поиск подключим позже.`);
    searchInput.value = '';
  });
}

// очистка истории
const clearBtn = document.getElementById('clearHistory');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('history');
    renderHistory();
  });
    }
