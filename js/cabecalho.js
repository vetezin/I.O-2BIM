(() => {
  const top = document.querySelector('.topo');
  const filters = document.querySelector('.filtros, #filters');
  if (!top) return;
  const nav = top.querySelector('.navegacao');
  if (nav) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'menu-principal';
    sidebar.setAttribute('aria-label', 'Menu principal');
    const brand = document.createElement('div');
    brand.className = 'sidebar-brand';
    brand.innerHTML = 'ALCAR<small>Suprimentos</small>';
    sidebar.append(brand, nav);
    document.body.prepend(sidebar);
    const file = location.pathname.split('/').pop() || 'index.html';
    for (const link of nav.querySelectorAll('a')) {
      if (link.getAttribute('href') === file) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'menu-toggle';
    toggle.textContent = 'Menu';
    toggle.setAttribute('aria-controls', sidebar.id);
    toggle.setAttribute('aria-expanded', 'false');
    top.prepend(toggle);
    function closeMenu() {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(open));
      if (open) nav.querySelector('a')?.focus();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
        closeMenu();
        toggle.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!sidebar.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    matchMedia('(max-width:850px)').addEventListener('change', closeMenu);
  }
  function measure() {
    document.documentElement.style.setProperty('--altura-topo', `${top.getBoundingClientRect().height}px`);
    const height = filters && !filters.hidden && getComputedStyle(filters).position === 'sticky' ? filters.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--altura-filtros', `${height}px`);
  }
  const observer = new ResizeObserver(measure);
  observer.observe(top);
  if (filters) observer.observe(filters);
  window.addEventListener('resize', measure);
  measure();
})();
