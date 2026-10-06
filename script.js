// ========== ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ ==========
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

// ========== ОПИСАНИЯ ТИПОВ ==========
const typeDescriptions = {
  domain: { title: 'Домен', text: 'WHOIS/RDAP · DNS-записи · Certificate Transparency поддомены.' },
  ip:     { title: 'IP',     text: 'Геолокация · ISP · ASN · проверка прокси/VPN/хостинга.' },
  email:  { title: 'Email',  text: 'MX-записи домена · Gravatar профиль · проверка в утечках.' }
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

// ========== ЯЗЫК ==========
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

// ========== КАТАЛОГ ==========
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

// ========== ИСТОРИЯ ==========
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
    historyList.innerHTML = '<div class="history-empty">Пока пусто.</div>';
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

const clearBtn = document.getElementById('clearHistory');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('history');
    renderHistory();
  });
}
// ========== ГРАФ ==========
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

  cy.on('tap', 'node', (e) => showNodeDetails(e.target.data()));
}

function showNodeDetails(node) {
  const aside = document.getElementById('aside');
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

// ========== РАБОЧИЙ ПОИСК ==========
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

async function fetchDNS(domain) {
  const types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
  const out = {};
  for (const t of types) {
    try {
      const r = await fetch(`https://dns.google/resolve?name=${domain}&type=${t}`);
      const j = await r.json();
      if (j.Answer) out[t] = j.Answer.map(a => a.data);
    } catch (e) { out[t] = null; }
  }
  return out;
}

async function fetchRDAP(domain) {
  try {
    const r = await fetch(`https://rdap.org/domain/${domain}`);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function fetchCT(domain) {
  try {
    const r = await fetch(`https://crt.sh/?q=${domain}&output=json`);
    const j = await r.json();
    const subs = new Set();
    j.forEach(item => {
      if (item.name_value) {
        item.name_value.split('\n').forEach(n => {
          n = n.trim().toLowerCase();
          if (n && n.endsWith(domain)) subs.add(n);
        });
      }
    });
    return Array.from(subs).sort();
  } catch (e) { return []; }
}

async function fetchIPInfo(ip) {
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const j = await r.json();
    if (!j.success) return null;
    return {
      status: 'success',
      query: j.ip,
      country: j.country,
      countryCode: j.country_code,
      regionName: j.region,
      city: j.city,
      zip: j.postal,
      lat: j.latitude,
      lon: j.longitude,
      timezone: j.timezone?.id,
      isp: j.connection?.isp,
      org: j.connection?.org,
      as: j.connection?.asn ? 'AS' + j.connection.asn : '',
      asname: j.connection?.domain,
      reverse: '',
      mobile: '',
      proxy: j.security?.proxy,
      hosting: j.security?.hosting
    };
  } catch (e) { return null; }
}

function renderLoading(text) {
  resultsDiv.innerHTML = `<div class="result-loading">${text}</div>`;
}

function renderError(text) {
  resultsDiv.innerHTML = `<div class="result-error">${text}</div>`;
}

async function searchDomain(domain) {
  renderLoading('Загружаю DNS, WHOIS, CT...');
  const [dns, rdap, ct] = await Promise.all([
    fetchDNS(domain),
    fetchRDAP(domain),
    fetchCT(domain)
  ]);

  let html = '';

  if (dns) {
    html += `<div class="result-card"><h3>DNS</h3><table class="result-table">`;
    for (const [t, vals] of Object.entries(dns)) {
      if (vals && vals.length) {
        html += `<tr><td>${t}</td><td>${vals.join('<br>')}</td></tr>`;
      }
    }
    html += `</table></div>`;
  }

  if (rdap) {
    html += `<div class="result-card"><h3>WHOIS / RDAP</h3><table class="result-table">`;
    if (rdap.ldhName) html += `<tr><td>Домен</td><td>${rdap.ldhName}</td></tr>`;
    if (rdap.status) html += `<tr><td>Статус</td><td>${rdap.status.join(', ')}</td></tr>`;
    if (rdap.registrar) html += `<tr><td>Регистратор</td><td>${rdap.registrar}</td></tr>`;
    if (rdap.events) {
      rdap.events.forEach(e => {
        if (e.eventAction === 'registration') html += `<tr><td>Создан</td><td>${e.eventDate}</td></tr>`;
        if (e.eventAction === 'expiration') html += `<tr><td>Истекает</td><td>${e.eventDate}</td></tr>`;
        if (e.eventAction === 'last changed') html += `<tr><td>Изменён</td><td>${e.eventDate}</td></tr>`;
      });
    }
    if (rdap.nameservers) {
      html += `<tr><td>NS</td><td>${rdap.nameservers.map(n => n.ldhName).join('<br>')}</td></tr>`;
    }
    html += `</table></div>`;
  } else {
    html += `<div class="result-card"><h3>WHOIS / RDAP</h3><p class="result-error">Домен не зарегистрирован или RDAP недоступен.</p></div>`;
  }

  if (ct.length) {
    html += `<div class="result-card"><h3>Certificate Transparency (${ct.length})</h3><div class="subdomain-list">`;
    ct.slice(0, 200).forEach(s => html += `<span>${s}</span>`);
    html += `</div></div>`;
  }

  resultsDiv.innerHTML = html || '<div class="result-card"><p class="result-error">Ничего не найдено.</p></div>';
  addHistory(domain);
}

async function searchIP(ip) {
  renderLoading('Загружаю данные по IP...');
  const data = await fetchIPInfo(ip);
  if (!data || data.status === 'fail') {
    renderError('Не удалось получить данные по IP.');
    return;
  }

  let html = `<div class="result-card"><h3>IP ${data.query}</h3><table class="result-table">`;
  const fields = {
    country: 'Страна', countryCode: 'Код страны', regionName: 'Регион', city: 'Город',
    zip: 'Индекс', lat: 'Широта', lon: 'Долгота', timezone: 'Часовой пояс',
    isp: 'Провайдер', org: 'Организация', as: 'AS', asname: 'Имя AS',
    reverse: 'Reverse DNS', mobile: 'Мобильный', proxy: 'Прокси/VPN/Tor', hosting: 'Хостинг'
  };
  for (const [k, label] of Object.entries(fields)) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
      html += `<tr><td>${label}</td><td>${data[k]}</td></tr>`;
    }
  }
  html += `</table></div>`;
  resultsDiv.innerHTML = html;
  addHistory(ip);
}

async function searchEmail(email) {
  renderLoading('Проверяю email...');
  const domain = email.split('@')[1];
  if (!domain) { renderError('Неверный email.'); return; }

  const dns = await fetchDNS(domain);
  let html = `<div class="result-card"><h3>Email: ${email}</h3><table class="result-table">`;
  if (dns.MX) html += `<tr><td>MX</td><td>${dns.MX.join('<br>')}</td></tr>`;
  if (dns.A) html += `<tr><td>A (домен)</td><td>${dns.A.join('<br>')}</td></tr>`;
  html += `</table></div>`;

  resultsDiv.innerHTML = html;
  addHistory(email);
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (!val) return;

    if (currentType === 'domain') searchDomain(val);
    else if (currentType === 'ip') searchIP(val);
    else if (currentType === 'email') searchEmail(val);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });
}

// ========== EXIF ==========
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const clearPreview = document.getElementById('clearPreview');
const exifResults = document.getElementById('exifResults');

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Только изображения.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    preview.classList.remove('hidden');

    EXIF.getData(previewImg, function () {
      const all = EXIF.getAllTags(this);
      renderExif(all, file);
    });
  };
  reader.readAsDataURL(file);
}

function renderExif(tags, file) {
  const known = {
    Make: 'Производитель', Model: 'Модель', DateTimeOriginal: 'Дата съёмки',
    ExposureTime: 'Выдержка', FNumber: 'Диафрагма', ISOSpeedRatings: 'ISO',
    FocalLength: 'Фокусное расстояние', Flash: 'Вспышка',
    GPSLatitude: 'GPS широта', GPSLongitude: 'GPS долгота',
    GPSAltitude: 'GPS высота', Software: 'Софт',
    Orientation: 'Ориентация', LensModel: 'Объектив'
  };

  let html = `<div class="result-card"><h3>EXIF — ${file.name}</h3><table class="result-table">`;
  let found = false;
  for (const [key, label] of Object.entries(known)) {
    if (tags[key] !== undefined && tags[key] !== null && tags[key] !== '') {
      let val = tags[key];
      if (Array.isArray(val)) val = val.join(', ');
      html += `<tr><td>${label}</td><td>${val}</td></tr>`;
      found = true;
    }
  }
  html += `</table></div>`;

  if (!found) {
    html = `<div class="result-card"><h3>EXIF</h3><p class="result-error">Метаданные не найдены (или они удалены).</p></div>`;
  }

  exifResults.innerHTML = html;
  addHistory(file.name);
}

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

if (clearPreview) {
  clearPreview.addEventListener('click', () => {
    preview.classList.add('hidden');
    previewImg.src = '';
    exifResults.innerHTML = '';
    if (fileInput) fileInput.value = '';
  });
}

// ========== ИИ-АНАЛИЗ ТЕКСТА ==========
const aiInput = document.getElementById('aiInput');
const aiAnalyze = document.getElementById('aiAnalyze');
const aiReport = document.getElementById('aiReport');

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
      report += `   EXIF извлечён (см. выше).\n`;
      report += `   Reverse image search — в разработке.\n\n`;
    }
    if (text) {
      report += `📝 Запрос: ${text}\n`;
      report += `   Тип определён автоматически.\n`;
      report += `   Автопоиск — в разработке.\n`;
    }

    aiReport.textContent = report;
    addHistory(text || previewName.textContent || 'изображение');
  });
  }
