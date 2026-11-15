// ==========================================================
// Interações gerais das páginas com cabeçalho (index e conteúdos).
// Por enquanto: abrir/fechar o menu no celular.
// ==========================================================

const menuToggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav');

if (menuToggle && nav) {
  // Ao clicar nas 3 linhas, alternamos (toggle) a classe que o CSS
  // usa para mostrar ou esconder o menu.
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('nav--open');
  });

  // Fecha o menu depois de clicar em um link
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => nav.classList.remove('nav--open'));
  });
}


// ==========================================================
// EXTRAS: efeitos suaves ao rolar a página.
// Tudo é opcional: se algo falhar, o site continua funcionando.
// ==========================================================
(function () {
  // Imagens lazy: mostra quando terminar de carregar
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    if (img.complete) img.classList.add('img--loaded');
    else {
      img.addEventListener('load', () => img.classList.add('img--loaded'));
      img.addEventListener('error', () => img.classList.add('img--loaded'));
    }
  });

  // Sombra no cabeçalho + botão de voltar ao topo
  const header = document.querySelector('.header');
  const toTop = document.createElement('button');
  toTop.className = 'to-top';
  toTop.type = 'button';
  toTop.setAttribute('aria-label', 'Voltar ao topo');
  toTop.textContent = '↑';
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(toTop);

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (header) header.classList.toggle('header--scrolled', y > 8);
      toTop.classList.toggle('to-top--show', y > 600);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!('IntersectionObserver' in window)) return;

  // Elementos que aparecem suavemente (só na página inicial)
  const targets = document.querySelectorAll(
    '.section__heading, .section__text, .card, .goals li, .team li, .team__school, .cta__inner'
  );
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('reveal--in');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', (i % 5) * 70 + 'ms');
    revealObs.observe(el);
  });

  // Destaca no menu a seção que está na tela
  const links = document.querySelectorAll('.nav a[href^="#"]');
  const map = new Map();
  links.forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) map.set(sec, a);
  });
  if (map.size) {
    const navObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const a = map.get(e.target);
        if (a && e.isIntersecting) {
          links.forEach((l) => l.classList.remove('nav__active'));
          a.classList.add('nav__active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => navObs.observe(sec));
  }
})();


// "Começar agora": quem já está logado vai direto para o diário;
// quem não está vai para o login (de lá dá para criar conta).
(function () {
  const btn = document.getElementById('btn-comecar');
  if (!btn) return;
  try {
    if (typeof getSessao === 'function' && getSessao()) btn.href = 'diario.html';
  } catch (e) { /* mantém o link do login */ }
})();
