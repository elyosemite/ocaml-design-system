/* Página principal: a escolha de tema, os valores ao vivo dos tokens e o botão de copiar.
   O tema usa o mesmo atributo e a mesma chave de localStorage que o resto da documentação (docs.js). */
(() => {
  const root = document.documentElement;
  const KEY = 'ocaml-ds-theme';
  const buttons = [...document.querySelectorAll('[data-set-theme]')];
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const current = () => (root.dataset.contrast === 'more' ? 'contrast' : isDark() ? 'dark' : 'light');

  function fillValues() {
    const css = getComputedStyle(root);
    document.querySelectorAll('[data-token]').forEach((el) => { el.textContent = css.getPropertyValue(el.dataset.token).trim(); });
  }
  function sync() {
    const now = current();
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setTheme === now)));
    fillValues();
  }
  buttons.forEach((b) => b.addEventListener('click', () => {
    const value = b.dataset.setTheme;
    if (value === 'contrast') {
      root.dataset.contrast = 'more';
    } else {
      delete root.dataset.contrast;
      root.dataset.theme = value;
      try { localStorage.setItem(KEY, value); } catch (e) { /* sem armazenamento: o tema vale só nesta visita */ }
    }
    sync();
  }));
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-contrast'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
  sync();

  // Copiar: o rótulo vira "Copiado" por dois segundos; sem acesso à área de transferência, o código fica selecionado.
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const target = document.querySelector(btn.dataset.copy);
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(target.textContent);
        btn.textContent = 'Copiado';
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        btn.textContent = 'Selecionado: use Ctrl+C';
      }
      setTimeout(() => { btn.textContent = label; }, 2000);
    });
  });

  /* ---------- Os cards de exemplo: o mínimo para cada um responder como no produto ---------- */
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // Controle segmentado: uma opção por grupo
  $$('.segmented').forEach((group) => group.addEventListener('click', (e) => {
    const b = e.target.closest('[role="radio"]'); if (!b) return;
    $$('[role="radio"]', group).forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    group.dispatchEvent(new CustomEvent('change-option', { detail: b }));
  }));
  // Preço do plano acompanha Mensal/Anual
  $$('[data-price-toggle]').forEach((group) => group.addEventListener('change-option', (e) => {
    const out = group.closest('.demo-card').querySelector('[data-price-value]');
    if (out) out.textContent = 'R$ ' + e.detail.dataset.price;
  }));
  // Abas: uma selecionada
  $$('.demo-tabs').forEach((list) => list.addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]'); if (!t) return;
    $$('[role="tab"]', list).forEach((x) => x.setAttribute('aria-selected', String(x === t)));
  }));
  // Mostrar e esconder a senha
  $$('[data-show-pass]').forEach((btn) => btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.showPass);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Esconder a senha' : 'Mostrar a senha');
    btn.querySelector('use').setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  }));
  // Botões de alternar (barra de formatação)
  $$('.demo-toolbar [aria-pressed]').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
  // Notificações: "Salvar" só acende quando algo mudou; é um exemplo, então diz que nada foi salvo
  $$('[data-dirty-form]').forEach((form) => {
    const card = form.closest('.demo-card');
    const save = card.querySelector('[data-dirty-save]'), help = card.querySelector('[data-dirty-help]');
    const initial = $$('input', form).map((i) => i.checked).join();
    form.addEventListener('change', () => {
      const dirty = $$('input', form).map((i) => i.checked).join() !== initial;
      save.disabled = !dirty;
      help.textContent = dirty ? 'Há mudanças para salvar.' : 'Nada mudou ainda.';
    });
    save.addEventListener('click', () => { help.textContent = 'É um exemplo: nada foi salvo.'; });
  });
  // Confirmação perigosa: a ação só acende depois do "Entendo"
  $$('[data-confirm-check]').forEach((check) => {
    const action = check.closest('.modal').querySelector('[data-confirm-action]');
    check.addEventListener('change', () => { action.disabled = !check.checked; });
  });
  // Carrinho: quantidade, contagem e total
  $$('[data-cart]').forEach((list) => {
    const card = list.closest('.demo-card');
    const recalc = () => {
      let count = 0, total = 0;
      $$('li', list).forEach((li) => { const q = Number(li.querySelector('output').textContent); count += q; total += q * Number(li.dataset.unit); });
      card.querySelector('[data-cart-count]').textContent = count;
      card.querySelector('[data-cart-total]').textContent = 'R$ ' + total;
    };
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-qty]'); if (!b) return;
      const out = b.parentElement.querySelector('output');
      out.textContent = Math.max(0, Number(out.textContent) + Number(b.dataset.qty));
      recalc();
    });
  });
  // Contador de caracteres
  $$('[data-count]').forEach((ta) => {
    const out = document.getElementById(ta.dataset.count);
    const sync = () => { out.textContent = `${ta.value.length} de ${ta.maxLength} caracteres`; };
    ta.addEventListener('input', sync); sync();
  });

  /* ---------- A história: linhas do token até a parte do card ----------
     Cada <li data-target data-edge> da lista de um capítulo vira uma linha que sai do nome do token e
     termina numa bolinha sobre o alvo. data-edge diz onde no alvo: near (a borda voltada para o texto),
     center, corner, fill, pad, surface (dentro do card, no respiro de baixo) e shadow (logo abaixo do card).
     Abaixo de 60rem as linhas somem e a lista continua dizendo o mesmo. */
  const NS = 'http://www.w3.org/2000/svg';
  const wide = matchMedia('(min-width: 60rem)');
  function point(edge, t, flip) {
    // near: logo fora da borda voltada para o texto, no respiro em volta do elemento, sem cobrir o conteúdo
    const nearX = flip ? t.right + 8 : t.left - 8;
    const cy = t.top + t.height / 2;
    switch (edge) {
      case 'center': return [t.left + t.width / 2, cy];
      case 'top': return [t.left + t.width / 2, t.top - 6];
      case 'corner': return [flip ? t.right - 2 : t.left + 2, t.top + 2];
      case 'fill': return [flip ? t.left + 10 : t.right - 10, t.bottom - 7];
      case 'pad': return [flip ? t.right - 5 : t.left + 5, cy];
      case 'surface': return [flip ? t.right - 12 : t.left + 12, t.bottom - 10];
      case 'shadow': return [flip ? t.right - 48 : t.left + 48, t.bottom + 9];
      default: return [nearX, cy];
    }
  }
  function drawRow(row) {
    let svg = row.querySelector(':scope > .callout-lines');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'callout-lines diagram');
      svg.setAttribute('aria-hidden', 'true');
      row.prepend(svg);
    }
    svg.replaceChildren();
    if (!wide.matches) return;
    const box = row.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const flip = row.classList.contains('showcase__row--flip');
    $$('.callouts li[data-target]', row).forEach((li) => {
      const target = row.querySelector(li.dataset.target);
      const label = li.querySelector('code');
      if (!target || !label) return;
      const l = label.getBoundingClientRect();
      const [tx, ty] = point(li.dataset.edge, target.getBoundingClientRect(), flip);
      const x1 = (flip ? l.left - 6 : l.right + 6) - box.left, y1 = l.top + l.height / 2 - box.top;
      const x2 = tx - box.left, y2 = ty - box.top;
      // curva suave: sai na horizontal do nome do token e chega na horizontal ao alvo
      const dx = (x2 - x1) * 0.5;
      const line = document.createElementNS(NS, 'path');
      line.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x2); dot.setAttribute('cy', y2); dot.setAttribute('r', 4);
      svg.append(line, dot);
    });
  }
  const rows = $$('.showcase__row');
  const drawAll = () => rows.forEach(drawRow);
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(drawAll); };
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(schedule); rows.forEach((r) => ro.observe(r)); }
  wide.addEventListener('change', schedule);
  window.addEventListener('resize', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  schedule();
})();
