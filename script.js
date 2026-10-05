// Переключение разделов
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

// Переключение типов поиска
const types = document.querySelectorAll('#types span');
types.forEach(t => {
  t.addEventListener('click', () => {
    types.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
  });
});

// Переключение языка
const langs = document.querySelectorAll('#lang span');
langs.forEach(l => {
  l.addEventListener('click', () => {
    langs.forEach(x => x.classList.remove('active'));
    l.classList.add('active');
  });
});
