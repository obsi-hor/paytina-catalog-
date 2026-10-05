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

// ---------- ОПИСАНИЯ ТИПОВ ПОИСКА ----------
const typeDescriptions = {
  domain: {
    title: 'Домен',
    text: 'Введи домен — получишь WHOIS, DNS-записи, поддомены из Certificate Transparency и данные ASN.'
  },
  email: {
    title: 'Email',
    text: 'Введи email — проверим MX-записи, SPF/DKIM/DMARC, участие в утечках и связанные аккаунты.'
  },
  ip: {
    title: 'IP',
    text: 'Введи IP — узнаешь геолокацию, ASN, открытые порты, баннеры сервисов и историю резолва.'
  },
  nick: {
    title: 'Ник',
    text: 'Введи никнейм — найдём аккаунты на площадках, связанные профили и упоминания в открытых источниках.'
  },
  phone: {
    title: 'Номер',
    text: 'Введи номер телефона — определим оператора, регион, мессенджеры и публичные упоминания.'
  }
};

const types = document.querySelectorAll('#types span');
const typeDesc = document.getElementById('typeDescription');

types.forEach(t => {
  t.addEventListener('click', () => {
    types.forEach(x => x.classList.remove('active'));
    t.classList.add('active');

    const data = typeDescriptions[t.dataset.type];
    if (data) {
      typeDesc.innerHTML = `<h3>${data.title}</h3><p>${data.text}</p>`;
    }
  });
});

// ---------- ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА ----------
const langs = document.querySelectorAll('#lang span');
langs.forEach(l => {
  l.addEventListener('click', () => {
    langs.forEach(x => x.classList.remove('active'));
    l.classList.add('active');
  });
});

// ---------- АВТОРИЗАЦИЯ (имитация) ----------
const loginBtn = document.getElementById('loginBtn');
const subscribeBtn = document.getElementById('subscribeBtn');
const profileTelegram = document.getElementById('profileTelegram');

// Проверяем, был ли уже вход
if (localStorage.getItem('tg_user')) {
  setLoggedIn(localStorage.getItem('tg_user'));
}

loginBtn.addEventListener('click', () => {
  // Имитация входа. Позже заменим на реальный Telegram Login.
  const fakeUser = '@user' + Math.floor(Math.random() * 9000 + 1000);
  localStorage.setItem('tg_user', fakeUser);
  setLoggedIn(fakeUser);
});

function setLoggedIn(username) {
  loginBtn.classList.add('hidden');
  subscribeBtn.classList.remove('hidden');
  profileTelegram.textContent = username;
}

// ---------- МОДАЛКА ПОДПИСКИ ----------
const subModal = document.getElementById('subModal');
const closeSubModal = document.getElementById('closeSubModal');

subscribeBtn.addEventListener('click', () => {
  subModal.classList.remove('hidden');
});

closeSubModal.addEventListener('click', () => {
  subModal.classList.add('hidden');
});

subModal.addEventListener('click', (e) => {
  if (e.target === subModal) subModal.classList.add('hidden');
});

// ---------- ПРОМОКОД ----------
const promoToggle = document.getElementById('promoToggle');
const promoInput = document.getElementById('promoInput');

promoToggle.addEventListener('click', () => {
  promoInput.classList.toggle('hidden');
});

document.getElementById('promoApply').addEventListener('click', () => {
  const code = promoInput.querySelector('input').value.trim();
  if (!code) return;
  // Заглушка. Реальная проверка будет на бэкенде.
  document.getElementById('profilePromo').textContent = code;
  alert('Промокод сохранён: ' + code);
});

// ---------- ПОКУПКА ----------
document.querySelectorAll('.plan-buy').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const plan = e.target.closest('.plan');
    const planName = plan.querySelector('.plan-name').textContent;
    const price = plan.dataset.price;

    // Позже здесь будет переход в Telegram-бот с параметрами
    // Например: window.location.href = 'https://t.me/YourBot?start=buy_' + plan.dataset.plan;
    alert(`Переход в Telegram-бот для оплаты:\n${planName} — ${price} ⭐`);
  });
});
