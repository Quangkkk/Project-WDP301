document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('[data-admin-panel]');
  const panels = document.querySelectorAll('.panel');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.dataset.adminPanel;
      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      panels.forEach((p) => p.classList.toggle('active', p.id === id));
    });
  });
});
