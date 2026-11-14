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
})();
