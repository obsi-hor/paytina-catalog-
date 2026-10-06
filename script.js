// ---------- ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ----------
const navItems = document.querySelectorAll('#nav .nav-item');
const sections = document.querySelectorAll('.section');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(item.dataset.section).classList.add('active');

    if (item.dataset.section === 'graph') {
      setTimeout(() => {
        if (!cy) initGraph();
        if (cy && cy.elements().length === 0) buildGraph('example.com');
        if (cy) cy.resize();
      }, 100);
    }
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

const savedLang = localStorage.getItem('lang');
if (savedLang) {
  langs.forEach(x => x.classList.toggle('active', x.dataset.lang === savedLang));
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

// ---------- ИСТОРИЯ ----------
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

const clearBtn = document.getElementById('clearHistory');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('history');
    renderHistory();
  });
}

// ---------- ГРАФ ----------
let cy = null;

const COLORS = {
  domain: '#3B82F6',
  ip:     '#22C55E',
  email:  '#F59E0B',
  nick:   '#A855F7',
  phone:  '#EF4444'
};

function initGraph() {
  const container = document.getElementById('cy');
  if (!container) return;

  cy = cytoscape({
    container: container,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': 'data(color)',
          'label': 'data(label)',
          'color': '#E8EAED',
          'font-size': 11,
          'text-valign': 'bottom',
          'text-margin-y': 6,
          'width': 34,
          'height': 34,
          'border-width': 2,
          'border-color': '#0A0D12',
          'text-outline-width': 2,
          'text-outline-color': '#050608'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': '#2A3340',
          'target-arrow-color': '#2A3340',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': 9,
          'color': '#6B7280',
          'text-outline-width': 2,
          'text-outline-color': '#050608'
        }
      },
      {
        selector: 'node:selected',
        style: { 'border-color': '#3B82F6', 'border-width': 3 }
      }
    ],
    layout: { name: 'cose', animate: true },
    wheelSensitivity: 0.2
  });

  cy.on('tap', 'node', (e) => {
    showNodeDetails(e.target.data());
  });
}

function showNodeDetails(node) {
  const aside = document.querySelector('aside');
  if (!aside) return;
  aside.innerHTML = `
    <h3>Узел</h3>
    <div class="profile-row"><span class="label">Тип</span><span class="value">${node.type || '—'}</span></div>
    <div class="profile-row"><span class="label">Значение</span><span class="value">${node.label}</span></div>
    <div class="profile-row"><span class="label">ID</span><span class="value">${node.id}</span></div>
  `;
}

function buildGraph(selector) {
  if (!cy) initGraph();
  if (!cy) return;

  const nodes = [
    { data: { id: 'root',  label: selector,         type: 'domain', color: COLORS.domain } },
    { data: { id: 'ip1',   label: '93.184.216.34',  type: 'ip',     color: COLORS.ip } },
    { data: { id: 'ns1',   label: 'ns1.' + selector, type: 'domain', color: COLORS.domain } },
    { data: { id: 'mx1',   label: 'mail.' + selector, type: 'domain', color: COLORS.domain } },
    { data: { id: 'em1',   label: 'admin@' + selector, type: 'email', color: COLORS.email } },
    { data: { id: 'nick1', label: '@admin',          type: 'nick',   color: COLORS.nick } }
  ];

  const edges = [
    { data: { source: 'root', target: 'ip1',  label: 'A' } },
    { data: { source: 'root', target: 'ns1',  label: 'NS' } },
    { data: { source: 'root', target: 'mx1',  label: 'MX' } },
    { data: { source: 'mx1',  target: 'em1',  label: 'admin' } },
    { data: { source: 'root', target: 'nick1', label: 'owner' } }
  ];

  cy.elements().remove();
  cy.add([...nodes, ...edges]);
  cy.layout({ name: 'cose', animate: true, padding: 30 }).run();
}

const graphBuildBtn = document.getElementById('graphBuild');
const graphInput = document.getElementById('graphInput');
const graphResetBtn = document.getElementById('graphReset');

if (graphBuildBtn) {
  graphBuildBtn.addEventListener('click', () => {
    const val = graphInput.value.trim() || 'example.com';
    buildGraph(val);
  });
}

if (graphResetBtn) {
  graphResetBtn.addEventListener('click', () => {
    if (cy) cy.elements().remove();
    graphInput.value = '';
  });
}

// ---------- ИИ-ПОИСК ----------
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const clearPreview = document.getElementById('clearPreview');
const aiInput = document.getElementById('aiInput');
const aiAnalyze = document.getElementById('aiAnalyze');
const aiReport = document.getElementById('aiReport');

if (uploadBox && fileInput) {
  uploadBox.addEventListener('click', () => fileInput.click());

  uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
  });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Пока поддерживаются только изображения.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

if (clearPreview) {
  clearPreview.addEventListener('click', () => {
    preview.classList.add('hidden');
    previewImg.src = '';
    if (fileInput) fileInput.value = '';
  });
}

if (aiAnalyze) {
  aiAnalyze.addEventListener('click', () => {
    const text = aiInput.value.trim();
    const hasImage = !preview.classList.contains('hidden');

    if (!text && !hasImage) {
      alert('Введи текст или загрузи фото.');
      return;
    }

    let report = 'Анализ завершён.\n\n';
    if (hasImage) {
      report += `🖼 Изображение: ${previewName.textContent}\n`;
      report += `   EXIF-данные будут извлечены позже.\n`;
      report += `   Reverse image search — в разработке.\n\n`;
    }
    if (text) {
      report += `📝 Запрос: ${text}\n`;
      report += `   Тип определён автоматически.\n`;
      report += `   Данные из открытых источников — в разработке.\n`;
    }

    aiReport.textContent = report;
    addHistory(text || previewName.textContent || 'изображение');
  });
    }
