const paths: Record<string, string> = {
  diamond: '<path d="m12 2 8 7-8 13L4 9zM4 9h16M8 3l4 19 4-19"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5zM12 1v2m0 18v2M1 12h2m18 0h2"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
  map: '<path d="m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3zM9 2v17m6-14v17"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  leaf: '<path d="M20 3c-14-2-20 12-10 17C20 22 23 10 20 3ZM5 22 16 9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0zM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v7m-5 0h10"/>',
  edit: '<path d="m4 16 13-13 4 4L8 20l-5 1zM14 6l4 4"/>',
};
export const icon = (name: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.diamond}</svg>`;
export const escapeHTML = (value: unknown): string => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function toast(message: string) {
  document.querySelector('.toast')?.remove(); const el = document.createElement('div'); el.className = 'toast'; el.role = 'status'; el.textContent = message; document.body.append(el); setTimeout(() => el.remove(), 4500);
}
export function modal(title: string, content: string, wide = false): HTMLDivElement {
  document.querySelector('.modal-backdrop')?.remove(); const wrap = document.createElement('div'); wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<section class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="modal-head"><h2>${escapeHTML(title)}</h2><button class="icon-button" data-close aria-label="Fechar">${icon('close')}</button></div>${content}</section>`;
  const prior = document.activeElement as HTMLElement | null; document.body.append(wrap);
  const close = () => { wrap.remove(); prior?.focus(); };
  wrap.querySelector('[data-close]')!.addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const nodes = [...wrap.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href]')].filter(el => !el.hasAttribute('disabled'));
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
  wrap.querySelector<HTMLButtonElement>('[data-close]')?.focus(); return wrap;
}
