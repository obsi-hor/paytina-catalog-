// ========== DOM-ССЫЛКИ ==========
const navItems = document.querySelectorAll('#nav .nav-item');
const sections = document.querySelectorAll('.section');
const typeDesc = document.getElementById('typeDescription');
const langs = document.querySelectorAll('#lang span');
const profileLang = document.getElementById('profileLang');
const themeToggle = document.getElementById('themeToggle');
const profileTheme = document.getElementById('profileTheme');
const catalogGrid = document.getElementById('catalogGrid');
const historyList = document.getElementById('historyList');
const profileScans = document.getElementById('profileScans');
const clearBtn = document.getElementById('clearHistory');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const previewImg = document.getElementById('previewImg');
const previewName = document.getElementById('previewName');
const clearPreview = document.getElementById('clearPreview');
const exifResults = document.getElementById('exifResults');
const aiInput = document.getElementById('aiInput');
const aiAnalyze = document.getElementById('aiAnalyze');
const aiReport = document.getElementById('aiReport');
const graphBuildBtn = document.getElementById('graphBuild');
const graphInput = document.getElementById('graphInput');
const graphResetBtn = document.getElementById('graphReset');

const PROXY_URL = 'https://paytina-catalog-phone-proxy.onrender.com';

// ========== АВТООПРЕДЕЛЕНИЕ ТИПА ==========
function detectType(value) {
  const v = value.trim();
  if (!v) return null;
  if (v.includes('@')) return 'email';
  if (/^\+?[\d\s\-\(\)]{7,}$/.test(v)) return 'phone';
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return 'ip';
  if (v.includes('.')) return 'domain';
  return 'domain';
}

// ========== НАВИГАЦИЯ ==========
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(item.dataset.section);
    if (target) target.classList.add('active');
    if (item.dataset.section === 'graph') {
      setTimeout(() => { if (!cy) initGraph(); if (cy) cy.resize(); }, 100);
    }
  });
});

// ========== ЯЗЫК ==========
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

// ========== ТЕМА ==========
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  if (themeToggle) themeToggle.textContent = light ? '☀️' : '🌙';
  if (profileTheme) profileTheme.textContent = light ? 'Светлая' : 'Тёмная';
}
if (localStorage.getItem('theme') === 'light') applyTheme(true);
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light');
    applyTheme(isLight);
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

// ========== КАТАЛОГ ==========
const tools = [
  { name: 'Shodan', desc: 'Устройства и порты', url: 'https://shodan.io', tag: 'сеть' },
  { name: 'Censys', desc: 'Сканирование', url: 'https://search.censys.io', tag: 'сеть' },
  { name: 'crt.sh', desc: 'CT-логи', url: 'https://crt.sh', tag: 'домены' },
  { name: 'VirusTotal', desc: 'Репутация', url: 'https://virustotal.com', tag: 'репутация' },
  { name: 'urlscan.io', desc: 'Анализ сайтов', url: 'https://urlscan.io', tag: 'веб' },
  { name: 'HIBP', desc: 'Утечки email', url: 'https://haveibeenpwned.com', tag: 'утечки' },
  { name: 'Sherlock', desc: 'Поиск по нику', url: 'https://github.com/sherlock-project/sherlock', tag: 'соцсети' },
  { name: 'Holehe', desc: 'Email на площадках', url: 'https://github.com/megadose/holehe', tag: 'почта' },
  { name: 'DNSDumpster', desc: 'Карта DNS', url: 'https://dnsdumpster.com', tag: 'домены' },
  { name: 'Wayback', desc: 'Архив сайтов', url: 'https://web.archive.org', tag: 'архив' },
  { name: 'IPinfo', desc: 'Гео и ASN', url: 'https://ipinfo.io', tag: 'сеть' },
  { name: 'BGPView', desc: 'ASN и BGP', url: 'https://bgpview.io', tag: 'сеть' }
];
if (catalogGrid) {
  tools.forEach(t => {
    const a = document.createElement('a');
    a.className = 'tool';
    a.href = t.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `<div class="name">${t.name}</div><div class="desc">${t.desc}</div><span class="tag">${t.tag}</span>`;
    catalogGrid.appendChild(a);
  });
}

// ========== ИСТОРИЯ ==========
function getHistory() { try { return JSON.parse(localStorage.getItem('history') || '[]'); } catch { return []; } }
function saveHistory(h) { localStorage.setItem('history', JSON.stringify(h)); }
function renderHistory() {
  const h = getHistory();
  if (profileScans) profileScans.textContent = h.length;
  if (!historyList) return;
  if (!h.length) { historyList.innerHTML = '<div class="history-empty">Пока пусто.</div>'; return; }
  historyList.innerHTML = h.slice(0, 20).map(item =>
    `<div class="history-item"><span class="q">${item.q}</span><span class="t">${item.t}</span></div>`
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
if (clearBtn) {
  clearBtn.addEventListener('click', () => { localStorage.removeItem('history'); renderHistory(); });
}

// ========== API-ФУНКЦИИ ==========
async function fetchDNS(domain) {
  const recTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'];
  const out = {};
  for (const t of recTypes) {
    try {
      const r = await fetch(`https://dns.google/resolve?name=${domain}&type=${t}`);
      const j = await r.json();
      if (j.Answer) out[t] = j.Answer.map(a => a.data);
    } catch (e) { out[t] = null; }
  }
  return out;
}
async function fetchRDAP(domain) {
  try { const r = await fetch(`https://rdap.org/domain/${domain}`); if (!r.ok) return null; return await r.json(); }
  catch (e) { return null; }
}
async function fetchCT(domain) {
  try {
    const r = await fetch(`https://crt.sh/?q=${domain}&output=json`);
    const j = await r.json();
    const subs = new Set();
    j.forEach(item => {
      if (item.name_value) item.name_value.split('\n').forEach(n => {
        n = n.trim().toLowerCase();
        if (n && n.endsWith(domain)) subs.add(n);
      });
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
      query: j.ip, country: j.country, regionName: j.region, city: j.city,
      lat: j.latitude, lon: j.longitude, timezone: j.timezone?.id,
      isp: j.connection?.isp, org: j.connection?.org,
      as: j.connection?.asn ? 'AS' + j.connection.asn : '',
      asname: j.connection?.domain, proxy: j.security?.proxy, hosting: j.security?.hosting
    };
  } catch (e) { return null; }
}
async function fetchShodan(ip) {
  try {
    const r = await fetch(`https://internetdb.shodan.io/${ip}`);
    if (!r.ok) return null;
    const j = await r.json();
    return { ports: j.ports || [], hostnames: j.hostnames || [], vulns: j.vulns || [] };
  } catch (e) { return null; }
}
async function fetchWayback(domain) {
  try {
    const r = await fetch(`https://archive.org/wayback/available?url=${domain}`);
    const j = await r.json();
    return j.archived_snapshots?.closest || null;
  } catch (e) { return null; }
}
async function checkBreaches(email) {
  try {
    const r = await fetch(`https://api.xposedornot.com/v1/check-email/${email}`);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
// ========== РЕНДЕР ==========
function renderLoading() {
  if (!resultsDiv) return;
  resultsDiv.innerHTML = `<div class="result-card">
    <div class="skeleton" style="width:40%"></div>
    <div class="skeleton" style="width:80%"></div>
    <div class="skeleton" style="width:60%"></div>
  </div>`;
}
function renderError(text) {
  if (!resultsDiv) return;
  resultsDiv.innerHTML = `<div class="result-error">${text}</div>`;
}

// ========== ДОМЕН ==========
async function searchDomain(domain) {
  const [dns, rdap, ct, wayback] = await Promise.all([
    fetchDNS(domain), fetchRDAP(domain), fetchCT(domain), fetchWayback(domain)
  ]);
  let html = `<div class="result-card"><h3>🌐 Домен: ${domain}</h3>`;
  if (dns) {
    html += `<div class="info-block"><h4>DNS</h4><table class="result-table">`;
    for (const [t, vals] of Object.entries(dns)) {
      if (vals && vals.length) html += `<tr><td>${t}</td><td>${vals.join('<br>')}</td></tr>`;
    }
    html += `</table></div>`;
  }
  if (rdap) {
    html += `<div class="info-block"><h4>WHOIS / RDAP</h4><table class="result-table">`;
    if (rdap.ldhName) html += `<tr><td>Домен</td><td>${rdap.ldhName}</td></tr>`;
    if (rdap.registrar) html += `<tr><td>Регистратор</td><td>${rdap.registrar}</td></tr>`;
    if (rdap.events) rdap.events.forEach(e => {
      if (e.eventAction === 'registration') html += `<tr><td>Создан</td><td>${e.eventDate}</td></tr>`;
      if (e.eventAction === 'expiration') html += `<tr><td>Истекает</td><td>${e.eventDate}</td></tr>`;
    });
    html += `</table></div>`;
  }
  if (ct.length) {
    html += `<div class="info-block"><h4>Certificate Transparency (${ct.length})</h4><div class="subdomain-list">`;
    ct.slice(0, 100).forEach(s => html += `<span>${s}</span>`);
    html += `</div></div>`;
  }
  if (wayback) {
    html += `<div class="info-block"><h4>Wayback</h4><table class="result-table">
      <tr><td>Снимок</td><td>${wayback.timestamp}</td></tr>
      <tr><td>Ссылка</td><td>${wayback.url}</td></tr>
    </table></div>`;
  }
  html += `<div class="result-actions">
    <button class="action-btn" onclick="copyResult('${domain}')">Копировать</button>
  </div></div>`;
  return html;
}

// ========== IP ==========
async function searchIP(ip) {
  const [data, shodan] = await Promise.all([fetchIPInfo(ip), fetchShodan(ip)]);
  if (!data) return `<div class="result-error">Не удалось получить данные по IP ${ip}.</div>`;
  let html = `<div class="result-card"><h3>📍 IP: ${ip}</h3>`;
  html += `<div class="info-block"><h4>Геолокация</h4><table class="result-table">`;
  const fields = {
    country: 'Страна', regionName: 'Регион', city: 'Город',
    lat: 'Широта', lon: 'Долгота', timezone: 'Часовой пояс',
    isp: 'Провайдер', org: 'Организация', as: 'AS',
    proxy: 'Прокси/VPN', hosting: 'Хостинг'
  };
  for (const [k, label] of Object.entries(fields)) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') {
      html += `<tr><td>${label}</td><td>${data[k]}</td></tr>`;
    }
  }
  html += `</table></div>`;
  if (shodan) {
    html += `<div class="info-block"><h4>Shodan</h4><table class="result-table">`;
    if (shodan.ports.length) html += `<tr><td>Порты</td><td>${shodan.ports.join(', ')}</td></tr>`;
    if (shodan.hostnames.length) html += `<tr><td>Хосты</td><td>${shodan.hostnames.join('<br>')}</td></tr>`;
    if (shodan.vulns.length) html += `<tr><td>Уязвимости</td><td>${shodan.vulns.join('<br>')}</td></tr>`;
    html += `</table></div>`;
  }
  if (data.lat && data.lon) {
    const mapId = 'ipMap-' + ip.replace(/\./g, '-');
    html += `<div id="${mapId}" style="height:250px;border-radius:8px;margin-top:12px;border:1px solid #1A2028;"></div>`;
    setTimeout(() => renderIPMap(mapId, data.lat, data.lon, ip), 200);
  }
  html += `<div class="result-actions">
    <button class="action-btn" onclick="copyResult('${ip}')">Копировать</button>
  </div></div>`;
  return html;
}
function renderIPMap(id, lat, lon, ip) {
  const el = document.getElementById(id);
  if (!el || typeof L === 'undefined') return;
  const map = L.map(id).setView([lat, lon], 8);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
  L.marker([lat, lon]).addTo(map).bindPopup(ip).openPopup();
}

// ========== EMAIL ==========
async function searchEmail(email) {
  const domain = email.split('@')[1];
  if (!domain) return `<div class="result-error">Неверный email: ${email}</div>`;
  const [dns, breaches] = await Promise.all([fetchDNS(domain), checkBreaches(email)]);
  let html = `<div class="result-card"><h3>📧 Email: ${email}</h3>`;

  html += `<div class="info-block"><h4>Домен</h4><table class="result-table">`;
  if (dns.MX) html += `<tr><td>MX</td><td>${dns.MX.join('<br>')}</td></tr>`;
  if (dns.A) html += `<tr><td>A</td><td>${dns.A.join('<br>')}</td></tr>`;
  html += `</table></div>`;

  if (breaches && breaches.breaches && breaches.breaches.length) {
    const list = Array.isArray(breaches.breaches[0]) ? breaches.breaches[0] : breaches.breaches;
    html += `<div class="info-block"><h4>🔓 Утечки (XposedOrNot)</h4><table class="result-table">
      <tr><td>Найден</td><td>${list.length}</td></tr>
      <tr><td>Список</td><td>${list.join('<br>')}</td></tr>
    </table></div>`;
  }

  try {
    const r = await fetch(`${PROXY_URL}/email-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    const res = await r.json();

    if (res.success) {
      if (res.holehe && res.holehe.found && res.holehe.found.length) {
        html += `<div class="info-block"><h4>🔎 Регистрации (Holehe)</h4><div class="subdomain-list">`;
        res.holehe.found.forEach(s => html += `<span>${s}</span>`);
        html += `</div></div>`;
      }

      if (res.hudsonrock && !res.hudsonrock.error) {
        html += `<div class="info-block"><h4>🦠 Заражения (Hudson Rock)</h4>`;
        if (res.hudsonrock.compromised) {
          html += `<div style="padding:8px;border-radius:6px;background:rgba(239,68,68,0.1);border-left:3px solid #EF4444;">
            <span style="color:#EF4444;font-size:13px;">⚠ Найден в ${res.hudsonrock.count} инфостилерах</span></div>`;
        } else {
          html += `<div style="padding:8px;border-radius:6px;background:rgba(34,197,94,0.1);border-left:3px solid #22C55E;">
            <span style="color:#22C55E;font-size:13px;">✅ Заражений не найдено</span></div>`;
        }
        html += `</div>`;
      }

      if (res.gravatar && res.gravatar.exists) {
        html += `<div class="info-block"><h4>🖼 Gravatar</h4>`;
        html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <img src="https://www.gravatar.com/avatar/${res.gravatar.hash}?s=80&d=mp" style="width:64px;height:64px;border-radius:50%;border:2px solid #3B82F6;">
          <div>
            <div style="color:#E8EAED;font-weight:600;">${res.gravatar.display_name || '—'}</div>
            ${res.gravatar.about_me ? `<div style="color:#6B7280;font-size:12px;">${res.gravatar.about_me}</div>` : ''}
          </div>
        </div>`;
        if (res.gravatar.accounts && res.gravatar.accounts.length) {
          html += `<div class="subdomain-list">`;
          res.gravatar.accounts.forEach(a => html += `<span>${a}</span>`);
          html += `</div>`;
        }
        html += `</div>`;
      }

      if (res.emailrep && !res.emailrep.error) {
        html += `<div class="info-block"><h4>📊 Репутация (EmailRep)</h4><table class="result-table">`;
        if (res.emailrep.reputation) html += `<tr><td>Репутация</td><td>${res.emailrep.reputation}</td></tr>`;
        if (res.emailrep.suspicious !== undefined) html += `<tr><td>Подозрительный</td><td>${res.emailrep.suspicious ? '⚠ Да' : '✅ Нет'}</td></tr>`;
        if (res.emailrep.references !== undefined) html += `<tr><td>Упоминаний</td><td>${res.emailrep.references}</td></tr>`;
        if (res.emailrep.domain_exists !== undefined) html += `<tr><td>Домен существует</td><td>${res.emailrep.domain_exists ? 'Да' : 'Нет'}</td></tr>`;
        if (res.emailrep.new_domain !== undefined) html += `<tr><td>Новый домен</td><td>${res.emailrep.new_domain ? '⚠ Да' : '✅ Нет'}</td></tr>`;
        html += `</table></div>`;
      }
    }
  } catch (e) {
    console.error('Email lookup error:', e);
  }

  html += `<div class="result-actions">
    <button class="action-btn" onclick="copyResult('${email}')">Копировать</button>
  </div></div>`;
  return html;
}

// ========== НОМЕР ==========
async function searchPhone(phone) {
  try {
    const response = await fetch(`${PROXY_URL}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    });
    const result = await response.json();
    if (!result.success) return `<div class="result-error">Ошибка: ${phone}</div>`;

    let html = `<div class="result-card"><h3>📱 Номер: ${phone}`;
    if (result.from_cache) html += ` <span style="font-size:10px;color:#22C55E;border:1px solid #22C55E;padding:1px 6px;border-radius:4px;margin-left:8px;">из кэша</span>`;
    html += `</h3>`;

    const c = result.carrier;
    if (c && c.valid) {
      html += `<div class="info-block"><h4>📡 Оператор</h4><table class="result-table">
        <tr><td>Оператор</td><td>${c.carrier || '—'}</td></tr>
        <tr><td>Регион</td><td>${c.region || '—'}</td></tr>
        <tr><td>Страна</td><td>${c.country_code || '—'}</td></tr>
        <tr><td>Тип</td><td>${c.line_type === 'mobile' ? 'Мобильный' : 'Другой'}</td></tr>
        <tr><td>Формат</td><td>${c.formatted || '—'}</td></tr>
      </table></div>`;
    }

    const gc = result.getcontact;
    if (gc && !gc.error) {
      html += `<div class="info-block"><h4>👤 Контакты (GetContact)</h4>`;
      if (gc.profileImage) html += `<img src="${gc.profileImage}" class="profile-photo" alt="profile">`;
      if (gc.displayName) {
        html += `<div class="big-name">${gc.displayName}</div>`;
        if (gc.tagCount) html += `<div style="font-size:12px;color:#6B7280;margin-bottom:8px;">Сохранён у ${gc.tagCount} человек</div>`;
      } else {
        html += `<p style="color:#6B7280;font-size:13px;">Имя не найдено.</p>`;
      }
      if (gc.spamType && gc.spamType !== 'null') {
        const col = gc.spamDegree === 'high' ? '#EF4444' : '#F59E0B';
        html += `<div style="clear:both;margin-top:8px;padding:8px;border-radius:6px;background:rgba(239,68,68,0.1);border-left:3px solid ${col};">
          <span style="color:${col};font-size:13px;">⚠ Спам: ${gc.spamType}</span></div>`;
      }
      html += `</div>`;
    }

    const ps = result.phonsint;
    if (ps && ps.found && ps.found.length) {
      const registered = ps.found.filter(x => x.status === 'registered');
      if (registered.length) {
        html += `<div class="info-block"><h4>🔐 Регистрации в сервисах (phonsint)</h4><div class="subdomain-list">`;
        registered.forEach(x => html += `<span>${x.site}</span>`);
        html += `</div></div>`;
      }
    }

    const ts = result.telespotter;
    if (ts && ts.found && ts.found.length) {
      html += `<div class="info-block"><h4>📡 TeleSpotter — OSINT-следы</h4><div class="subdomain-list">`;
      ts.found.slice(0, 20).forEach(f => html += `<span>${f}</span>`);
      html += `</div></div>`;
    }

    const hr = result.hudsonrock;
    if (hr && !hr.error) {
      html += `<div class="info-block"><h4>🔓 Утечки</h4>`;
      if (hr.compromised) {
        html += `<div style="padding:8px;border-radius:6px;background:rgba(239,68,68,0.1);border-left:3px solid #EF4444;">
          <span style="color:#EF4444;font-size:13px;">⚠ Найден в ${hr.count} утечках</span></div>`;
      } else {
        html += `<div style="padding:8px;border-radius:6px;background:rgba(34,197,94,0.1);border-left:3px solid #22C55E;">
          <span style="color:#22C55E;font-size:13px;">✅ Утечек не найдено</span></div>`;
      }
      html += `</div>`;
    }

    const cleanPhone = phone.replace(/[^\d]/g, '');
    html += `<div class="messenger-buttons">
      <a class="msg-btn" href="https://t.me/+${cleanPhone}" target="_blank">✈️ Telegram</a>
      <a class="msg-btn" href="https://wa.me/${cleanPhone}" target="_blank">💬 WhatsApp</a>
    </div>`;

    html += `<div class="result-actions">
      <button class="action-btn" onclick="copyResult('${phone}')">Копировать</button>
    </div></div>`;
    return html;
  } catch (e) {
    return `<div class="result-error">Прокси засыпает. Подожди минуту.</div>`;
  }
}

// ========== ГЛАВНЫЙ ЗАПУСК ==========
async function performSearch(query) {
  const type = detectType(query);
  if (type === 'domain') return await searchDomain(query);
  if (type === 'ip') return await searchIP(query);
  if (type === 'email') return await searchEmail(query);
  if (type === 'phone') return await searchPhone(query);
  return `<div class="result-error">Не удалось определить тип: ${query}</div>`;
}

async function doSearch(value) {
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  renderLoading();
  if (parts.length === 1) {
    resultsDiv.innerHTML = await performSearch(parts[0]);
    addHistory(parts[0]);
    return;
  }
  resultsDiv.innerHTML = `<div class="multi-header">Мультипоиск: ${parts.length}</div>`;
  const results = await Promise.all(parts.map(p => performSearch(p)));
  resultsDiv.innerHTML = `<div class="multi-header">Мультипоиск: ${parts.length}</div>` + results.join('');
  parts.forEach(p => addHistory(p));
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (!val) return;
    doSearch(val);
  });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn.click(); });
}

// ========== ЦЕПОЧКИ ==========
document.querySelectorAll('.playbooks .pb').forEach(el => {
  el.addEventListener('click', async () => {
    const val = searchInput.value.trim();
    if (!val) { alert('Введи значение'); return; }
    renderLoading();
    resultsDiv.innerHTML = await performSearch(val);
    addHistory(val + ' [' + el.dataset.playbook + ']');
  });
});

// ========== ГРАФ ==========
let cy = null;
const COLORS = { domain: '#3B82F6', ip: '#22C55E', email: '#F59E0B', phone: '#EF4444' };
function initGraph() {
  const container = document.getElementById('cy');
  if (!container) return;
  cy = cytoscape({
    container: container,
    style: [
      { selector: 'node', style: {
        'background-color': 'data(color)', 'label': 'data(label)',
        'color': '#E8EAED', 'font-size': 11, 'text-valign': 'bottom',
        'text-margin-y': 6, 'width': 34, 'height': 34,
        'border-width': 2, 'border-color': '#0A0D12',
        'text-outline-width': 2, 'text-outline-color': '#050608'
      }},
      { selector: 'edge', style: {
        'width': 1.5, 'line-color': '#2A3340', 'target-arrow-color': '#2A3340',
        'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
        'label': 'data(label)', 'font-size': 9, 'color': '#6B7280',
        'text-outline-width': 2, 'text-outline-color': '#050608'
      }}
    ],
    layout: { name: 'cose', animate: true }, wheelSensitivity: 0.2
  });
}
async function buildGraph(selector) {
  if (!cy) initGraph();
  if (!cy) return;
  const nodes = [];
  const edges = [];
  const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(selector);
  const rootType = isIP ? 'ip' : 'domain';
  nodes.push({ data: { id: 'root', label: selector, type: rootType, color: COLORS[rootType] } });
  if (isIP) {
    const shodan = await fetchShodan(selector);
    if (shodan) shodan.hostnames.forEach((h, i) => {
      const id = 'host' + i;
      nodes.push({ data: { id, label: h, type: 'domain', color: COLORS.domain } });
      edges.push({ data: { source: id, target: 'root', label: 'resolves' } });
    });
  } else {
    const dns = await fetchDNS(selector);
    if (dns.A) dns.A.forEach((ip, i) => {
      const id = 'ip' + i;
      nodes.push({ data: { id, label: ip, type: 'ip', color: COLORS.ip } });
      edges.push({ data: { source: 'root', target: id, label: 'A' } });
    });
    if (dns.MX) dns.MX.forEach((mx, i) => {
      const id = 'mx' + i;
      nodes.push({ data: { id, label: mx, type: 'domain', color: COLORS.domain } });
      edges.push({ data: { source: 'root', target: id, label: 'MX' } });
    });
  }
  cy.elements().remove();
  cy.add([...nodes, ...edges]);
  cy.layout({ name: 'cose', animate: true, padding: 30 }).run();
}
if (graphBuildBtn) graphBuildBtn.addEventListener('click', async () => {
  await buildGraph(graphInput.value.trim() || 'example.com');
});
if (graphResetBtn) graphResetBtn.addEventListener('click', () => {
  if (cy) cy.elements().remove();
  graphInput.value = '';
});

// ========== EXIF ==========
function handleFile(file) {
  if (!file.type.startsWith('image/')) { alert('Только изображения.'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    previewName.textContent = file.name;
    preview.classList.remove('hidden');
    if (typeof EXIF !== 'undefined') {
      EXIF.getData(previewImg, function () { renderExif(EXIF.getAllTags(this), file); });
    }
  };
  reader.readAsDataURL(file);
}
function renderExif(tags, file) {
  const known = {
    Make: 'Производитель', Model: 'Модель', DateTimeOriginal: 'Дата съёмки',
    ExposureTime: 'Выдержка', FNumber: 'Диафрагма', ISOSpeedRatings: 'ISO',
    FocalLength: 'Фокусное расстояние', Flash: 'Вспышка',
    GPSLatitude: 'GPS широта', GPSLongitude: 'GPS долгота',
    GPSAltitude: 'GPS высота', Software: 'Софт'
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
  if (!found) html = `<div class="result-card"><h3>EXIF</h3><p class="result-error">Метаданные не найдены.</p></div>`;
  exifResults.innerHTML = html;
  addHistory(file.name);
}
if (uploadBox && fileInput) {
  uploadBox.addEventListener('click', () => fileInput.click());
  uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('dragover'); });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('dragover'));
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });
}
if (clearPreview) {
  clearPreview.addEventListener('click', () => {
    preview.classList.add('hidden');
    previewImg.src = '';
    exifResults.innerHTML = '';
    if (fileInput) fileInput.value = '';
  });
}

// ========== ИИ ==========
if (aiAnalyze) {
  aiAnalyze.addEventListener('click', () => {
    const text = aiInput.value.trim();
    const hasImage = !preview.classList.contains('hidden');
    if (!text && !hasImage) { alert('Введи текст или загрузи фото.'); return; }
    let report = 'Анализ завершён.\n\n';
    if (hasImage) report += `🖼 ${previewName.textContent}\nEXIF извлечён.\n\n`;
    if (text) report += `📝 ${text}\n`;
    aiReport.textContent = report;
    addHistory(text || previewName.textContent || 'изображение');
  });
}

// ========== КОПИРОВАНИЕ ==========
function copyResult(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => alert('Скопировано: ' + text)).catch(() => alert('Ошибка'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Скопировано: ' + text);
  }
}
window.copyResult = copyResult;
