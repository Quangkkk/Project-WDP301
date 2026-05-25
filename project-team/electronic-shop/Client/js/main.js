document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.qty-selector').forEach((wrap) => {
    const input = wrap.querySelector('input');
    wrap.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
      input.value = Math.max(1, +input.value - 1);
    });
    wrap.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
      input.value = Math.min(99, +input.value + 1);
    });
  });
});
