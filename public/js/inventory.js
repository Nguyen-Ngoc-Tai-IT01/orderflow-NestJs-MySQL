/* =====================================================
   ORDERFLOW - TRANG KHO HÀNG
   File: public/js/inventory.js
   API: GET/POST /inventory, PATCH/DELETE /inventory/:id,
        GET/POST /inventory/:id/transactions,
        GET /inventory/:id/recipes,
        PUT /inventory/:id/recipes/:menuItemId
   Quy tắc: số lượng chỉ đổi qua Nhập kho / Xuất kho.
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, formModal } = window.OF;
  const h = fmt.escapeHTML;

  const TX_LABEL = {
    IMPORT: { text: 'Nhập kho', sign: '+', badge: 'success' },
    EXPORT: { text: 'Xuất kho', sign: '−', badge: 'warning' },
    ORDER_DEDUCT: { text: 'Trừ theo đơn hàng', sign: '−', badge: 'info' },
    ORDER_RESTORE: { text: 'Hoàn kho (hủy đơn)', sign: '+', badge: 'purple' },
  };

  const UNITS = ['kg', 'g', 'lít', 'ml', 'cái', 'quả', 'gói', 'hộp', 'lon', 'chai'];

  const state = {
    items: [],
    tab: 'ALL',
    search: '',
    error: '',
    menu: null, // cache danh sách món cho công thức
  };

  const $ = (id) => document.getElementById(id);

  /* ---------------- Trạng thái tồn kho ---------------- */
  function stockOf(item) {
    const qty = Number(item.quantity) || 0;
    const min = Number(item.minQuantity) || 0;

    if (qty <= 0) return 'out';
    if (min > 0 && qty <= min) return 'low';
    return 'ok';
  }

  const STOCK_BADGE = {
    ok: { text: 'Đủ hàng', cls: 'success' },
    low: { text: 'Sắp hết', cls: 'warning' },
    out: { text: 'Hết hàng', cls: 'danger' },
  };

  /* ---------------- Tải dữ liệu ---------------- */
  async function load({ silent = false } = {}) {
    if (!silent) util.setLoading(true);

    try {
      const data = await http.get('/inventory');
      state.items = Array.isArray(data) ? data : [];
      state.error = '';
    } catch (error) {
      if (silent) return;
      state.items = [];
      state.error = error.message;
    } finally {
      if (!silent) util.setLoading(false);
    }

    render();
  }

  async function loadMenu() {
    if (state.menu) return state.menu;

    state.menu = await http.get('/menu');
    return state.menu;
  }

  /* ---------------- Hiển thị ---------------- */
  function filtered() {
    const keyword = util.normalize(state.search);

    return state.items.filter((item) => {
      const stock = stockOf(item);

      if (state.tab === 'LOW' && stock !== 'low') return false;
      if (state.tab === 'OUT' && stock !== 'out') return false;
      if (!keyword) return true;

      return util.normalize(item.name).includes(keyword);
    });
  }

  function renderStats() {
    const counts = { ok: 0, low: 0, out: 0 };
    state.items.forEach((item) => (counts[stockOf(item)] += 1));

    $('statTotal').textContent = state.items.length;
    $('statOk').textContent = counts.ok;
    $('statLow').textContent = counts.low;
    $('statOut').textContent = counts.out;

    $('countAll').textContent = state.items.length;
    $('countLow').textContent = counts.low;
    $('countOut').textContent = counts.out;
  }

  function progress(item) {
    const qty = Number(item.quantity) || 0;
    const min = Number(item.minQuantity) || 0;
    const stock = stockOf(item);

    const percent = min > 0 ? Math.min(100, (qty / (min * 3)) * 100) : qty > 0 ? 100 : 0;

    return `<div class="pg-progress ${stock}"><i style="width:${percent.toFixed(0)}%"></i></div>`;
  }

  function renderRow(item) {
    const id = h(item.id);
    const stock = stockOf(item);
    const badge = STOCK_BADGE[stock];

    const icon = (action, title, ic, cls = '') =>
      `<button type="button" class="pg-icon-btn ${cls}" data-action="${action}"
               data-id="${id}" title="${title}" aria-label="${title}">
         <i class="bi ${ic}"></i></button>`;

    return `
      <tr>
        <td>
          <div class="pg-cell-main">
            <div class="pg-avatar ${stock === 'out' ? 'orange' : ''}"><i class="bi bi-box-seam"></i></div>
            <div>
              <strong>${h(item.name)}</strong>
              <small>Đơn vị: ${h(item.unit)}</small>
            </div>
          </div>
        </td>
        <td>
          <strong>${h(util.qty(item.quantity))} ${h(item.unit)}</strong>
          ${progress(item)}
        </td>
        <td>${h(util.qty(item.minQuantity))} ${h(item.unit)}</td>
        <td><span class="pg-badge pg-badge-${badge.cls}">${badge.text}</span></td>
        <td class="pg-muted">${h(fmt.dateTime(item.updatedAt))}</td>
        <td>
          <div class="pg-row-actions">
            ${icon('import', 'Nhập kho', 'bi-box-arrow-in-down')}
            ${icon('export', 'Xuất kho', 'bi-box-arrow-up')}
            ${icon('history', 'Lịch sử giao dịch', 'bi-clock-history')}
            ${icon('recipes', 'Công thức dùng nguyên liệu này', 'bi-journal-text')}
            ${icon('edit', 'Sửa thông tin', 'bi-pencil')}
            ${icon('delete', 'Xóa nguyên liệu', 'bi-trash', 'danger')}
          </div>
        </td>
      </tr>`;
  }

  function render() {
    renderStats();

    const body = $('inventoryBody');
    const footer = $('tableFooter');

    if (state.error) {
      body.innerHTML = `<tr><td colspan="6">${util.errorState(state.error)}</td></tr>`;
      footer.textContent = '';
      return;
    }

    const list = filtered();

    if (!list.length) {
      const filtering = state.search || state.tab !== 'ALL';

      body.innerHTML = `<tr><td colspan="6">${util.emptyState(
        filtering ? 'Không tìm thấy nguyên liệu' : 'Kho đang trống',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Bấm "Thêm nguyên liệu" để bắt đầu quản lý kho.',
        'bi-box-seam',
      )}</td></tr>`;
      footer.textContent = '';
      return;
    }

    body.innerHTML = list.map(renderRow).join('');
    footer.textContent = `Hiển thị ${list.length} / ${state.items.length} nguyên liệu`;
  }

  /* ---------------- Thêm / sửa nguyên liệu ---------------- */
  function itemForm(item = null) {
    const editing = Boolean(item);

    formModal({
      title: editing ? `Sửa "${item.name}"` : 'Thêm nguyên liệu',
      size: 'sm',
      submitText: editing ? 'Lưu thay đổi' : 'Thêm nguyên liệu',
      html: `
        <label class="pg-field">
          <span>Tên nguyên liệu *</span>
          <input class="pg-input" name="name" maxlength="120"
                 value="${h(item?.name || '')}" required>
        </label>

        <label class="pg-field">
          <span>Đơn vị *</span>
          <input class="pg-input" name="unit" maxlength="20" list="unitList"
                 placeholder="kg, lít, cái..." value="${h(item?.unit || '')}" required>
          <datalist id="unitList">${UNITS.map((u) => `<option value="${u}">`).join('')}</datalist>
        </label>

        ${
          editing
            ? ''
            : `<label class="pg-field">
                 <span>Số lượng ban đầu</span>
                 <input class="pg-input" type="number" name="quantity" min="0" step="0.001" value="0">
                 <small>Tối đa 3 chữ số thập phân.</small>
               </label>`
        }

        <label class="pg-field">
          <span>Mức tồn tối thiểu</span>
          <input class="pg-input" type="number" name="minQuantity" min="0" step="0.001"
                 value="${item ? Number(item.minQuantity) : 0}">
          <small>Tồn kho ≤ mức này sẽ báo "Sắp hết".</small>
        </label>

        ${
          editing
            ? `<div class="pg-note"><i class="bi bi-info-circle"></i>
                 Muốn đổi số lượng tồn, hãy dùng Nhập kho / Xuất kho để có lịch sử.</div>`
            : ''
        }`,

      async onSubmit(form) {
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const unit = String(data.get('unit') || '').trim();
        const minQuantity = Number(data.get('minQuantity') || 0);

        if (!name) throw new Error('Vui lòng nhập tên nguyên liệu.');
        if (!unit) throw new Error('Vui lòng nhập đơn vị.');

        if (!Number.isFinite(minQuantity) || minQuantity < 0 || !util.hasMaxDecimals(minQuantity)) {
          throw new Error('Mức tối thiểu phải là số không âm, tối đa 3 chữ số thập phân.');
        }

        const duplicate = state.items.some(
          (i) => i.id !== item?.id && i.name.trim().toLowerCase() === name.toLowerCase(),
        );

        if (duplicate) throw new Error(`Nguyên liệu "${name}" đã tồn tại.`);

        if (editing) {
          await http.patch(`/inventory/${encodeURIComponent(item.id)}`, { name, unit, minQuantity });
          ui.toast('Đã cập nhật nguyên liệu.');
        } else {
          const quantity = Number(data.get('quantity') || 0);

          if (!Number.isFinite(quantity) || quantity < 0 || !util.hasMaxDecimals(quantity)) {
            throw new Error('Số lượng phải là số không âm, tối đa 3 chữ số thập phân.');
          }

          await http.post('/inventory', { name, unit, quantity, minQuantity });
          ui.toast(`Đã thêm nguyên liệu "${name}".`);
        }

        await load({ silent: true });
      },
    });
  }

  /* ---------------- Nhập / xuất kho ---------------- */
  function transactionForm(item, initialType) {
    formModal({
      title: `Nhập / xuất kho: ${item.name}`,
      size: 'sm',
      submitText: 'Xác nhận',
      html: `
        <div class="pg-note">
          <i class="bi bi-box-seam"></i>
          Tồn kho hiện tại: <strong>${h(util.qty(item.quantity))} ${h(item.unit)}</strong>
        </div>

        <div class="pg-radio-group">
          <label class="pg-radio">
            <input type="radio" name="type" value="IMPORT" ${initialType === 'IMPORT' ? 'checked' : ''}>
            <i class="bi bi-box-arrow-in-down"></i> Nhập kho
          </label>
          <label class="pg-radio">
            <input type="radio" name="type" value="EXPORT" ${initialType === 'EXPORT' ? 'checked' : ''}>
            <i class="bi bi-box-arrow-up"></i> Xuất kho
          </label>
        </div>

        <label class="pg-field">
          <span>Số lượng (${h(item.unit)}) *</span>
          <input class="pg-input" type="number" name="quantity" min="0.001" step="0.001" required>
        </label>

        <label class="pg-field">
          <span>Ghi chú</span>
          <input class="pg-input" name="note" maxlength="200" placeholder="Nhà cung cấp, lý do xuất...">
        </label>`,

      async onSubmit(form) {
        const data = new FormData(form);
        const type = data.get('type');
        const quantity = Number(data.get('quantity'));
        const note = String(data.get('note') || '').trim();

        if (!['IMPORT', 'EXPORT'].includes(type)) throw new Error('Vui lòng chọn Nhập hoặc Xuất kho.');

        if (!Number.isFinite(quantity) || quantity < 0.001) {
          throw new Error('Số lượng phải lớn hơn 0.');
        }

        if (!util.hasMaxDecimals(quantity)) {
          throw new Error('Số lượng tối đa 3 chữ số thập phân.');
        }

        if (type === 'EXPORT' && quantity > Number(item.quantity)) {
          throw new Error(
            `Không đủ "${item.name}": cần xuất ${util.qty(quantity)} ${item.unit}, chỉ còn ${util.qty(item.quantity)} ${item.unit}.`,
          );
        }

        const body = { type, quantity };
        if (note) body.note = note;

        await http.post(`/inventory/${encodeURIComponent(item.id)}/transactions`, body);

        ui.toast(
          type === 'IMPORT'
            ? `Đã nhập ${util.qty(quantity)} ${item.unit} "${item.name}".`
            : `Đã xuất ${util.qty(quantity)} ${item.unit} "${item.name}".`,
        );

        await load({ silent: true });
      },
    });
  }

  /* ---------------- Lịch sử giao dịch ---------------- */
  async function showHistory(item) {
    const modal = ui.openModal({
      title: `Lịch sử: ${item.name}`,
      size: 'lg',
      html: '<div class="loading-state"><div class="loading-spinner"></div><p>Đang tải lịch sử...</p></div>',
    });

    try {
      const list = await http.get(`/inventory/${encodeURIComponent(item.id)}/transactions`);

      if (!Array.isArray(list) || !list.length) {
        modal.body.innerHTML = util.emptyState('Chưa có giao dịch', 'Nguyên liệu này chưa được nhập hoặc xuất.', 'bi-clock-history');
        return;
      }

      modal.body.innerHTML = `
        <div class="pg-table-wrap pg-scroll">
          <table class="pg-table">
            <thead>
              <tr><th>Thời gian</th><th>Loại</th><th class="num">Số lượng</th><th>Ghi chú / Đơn hàng</th></tr>
            </thead>
            <tbody>
              ${list
                .map((tx) => {
                  const meta = TX_LABEL[tx.type] || { text: tx.type, sign: '', badge: 'muted' };

                  const note = [
                    tx.note ? h(tx.note) : '',
                    tx.orderId ? `Đơn #${h(util.shortId(tx.orderId))}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return `
                    <tr>
                      <td class="pg-muted">${h(fmt.dateTime(tx.createdAt))}</td>
                      <td><span class="pg-badge pg-badge-${meta.badge}">${meta.text}</span></td>
                      <td class="num"><strong>${meta.sign}${h(util.qty(tx.quantity))} ${h(item.unit)}</strong></td>
                      <td>${note || '<span class="pg-muted">--</span>'}</td>
                    </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`;
    } catch (error) {
      modal.body.innerHTML = util.emptyState('Không thể tải lịch sử', error.message, 'bi-exclamation-triangle');
    }
  }

  /* ---------------- Công thức món ăn ---------------- */
  async function showRecipes(item) {
    const modal = ui.openModal({
      title: `Công thức dùng "${item.name}"`,
      size: 'lg',
      html: '<div class="loading-state"><div class="loading-spinner"></div><p>Đang tải công thức...</p></div>',
    });

    let menu = [];
    let recipes = [];

    async function refresh() {
      [menu, recipes] = await Promise.all([
        loadMenu(),
        http.get(`/inventory/${encodeURIComponent(item.id)}/recipes`),
      ]);

      draw();
    }

    function nameOf(menuItemId) {
      return menu.find((m) => m.id === menuItemId)?.name || `Món #${util.shortId(menuItemId)}`;
    }

    function draw(editId = '') {
      const current = recipes.find((r) => r.menuItemId === editId);

      modal.body.innerHTML = `
        <p class="pg-muted" style="margin-bottom:12px;font-size:11px;line-height:1.6">
          Mỗi lần khách gọi 1 phần món, hệ thống tự trừ lượng nguyên liệu bên dưới.
          Món chưa có công thức sẽ <strong>không tạo được đơn hàng</strong>.
        </p>

        ${
          recipes.length
            ? `<div class="pg-table-wrap">
                 <table class="pg-table">
                   <thead><tr><th>Món ăn</th><th class="num">Định lượng / 1 phần</th><th class="num">Sửa</th></tr></thead>
                   <tbody>
                     ${recipes
                       .map(
                         (r) => `
                       <tr>
                         <td><strong>${h(nameOf(r.menuItemId))}</strong></td>
                         <td class="num">${h(util.qty(r.quantityPerUnit))} ${h(item.unit)}</td>
                         <td class="num">
                           <button type="button" class="pg-icon-btn" data-edit="${h(r.menuItemId)}"
                                   title="Sửa định lượng"><i class="bi bi-pencil"></i></button>
                         </td>
                       </tr>`,
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
            : util.emptyState('Chưa có món nào dùng nguyên liệu này', 'Thêm công thức bên dưới.', 'bi-journal-text')
        }

        <form class="pg-form" id="recipeForm" style="margin-top:16px" novalidate>
          <div class="pg-form-grid">
            <label class="pg-field">
              <span>Món ăn *</span>
              <select class="pg-select" name="menuItemId" required>
                ${menu
                  .map(
                    (m) =>
                      `<option value="${h(m.id)}" ${m.id === editId ? 'selected' : ''}>${h(m.name)}</option>`,
                  )
                  .join('')}
              </select>
            </label>

            <label class="pg-field">
              <span>Định lượng / 1 phần (${h(item.unit)}) *</span>
              <input class="pg-input" type="number" name="quantityPerUnit" min="0.001" step="0.001"
                     value="${current ? Number(current.quantityPerUnit) : ''}" required>
            </label>
          </div>

          <div class="pg-form-error" id="recipeError" hidden></div>

          <div class="pg-settings-actions" style="margin-top:0">
            <button type="submit" class="of-btn of-btn-primary">
              <i class="bi bi-check2"></i> Lưu công thức
            </button>
          </div>
        </form>`;
    }

    modal.body.addEventListener('click', (event) => {
      const edit = event.target.closest('[data-edit]');
      if (edit) draw(edit.dataset.edit);
    });

    modal.body.addEventListener('submit', async (event) => {
      event.preventDefault();

      const form = event.target;
      const error = modal.body.querySelector('#recipeError');
      const button = form.querySelector('button[type=submit]');
      const menuItemId = form.elements.menuItemId.value;
      const quantityPerUnit = Number(form.elements.quantityPerUnit.value);

      error.hidden = true;

      if (!menuItemId) {
        error.textContent = 'Vui lòng chọn món ăn.';
        error.hidden = false;
        return;
      }

      if (!Number.isFinite(quantityPerUnit) || quantityPerUnit < 0.001 || !util.hasMaxDecimals(quantityPerUnit)) {
        error.textContent = 'Định lượng phải lớn hơn 0 và tối đa 3 chữ số thập phân.';
        error.hidden = false;
        return;
      }

      button.disabled = true;

      try {
        await http.put(
          `/inventory/${encodeURIComponent(item.id)}/recipes/${encodeURIComponent(menuItemId)}`,
          { quantityPerUnit },
        );

        ui.toast('Đã lưu công thức.');
        await refresh();
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        button.disabled = false;
      }
    });

    try {
      await refresh();
    } catch (error) {
      modal.body.innerHTML = util.emptyState('Không thể tải công thức', error.message, 'bi-exclamation-triangle');
    }
  }

  /* ---------------- Xóa nguyên liệu ---------------- */
  async function removeItem(item) {
    const ok = await ui.confirmDialog({
      title: 'Xóa nguyên liệu?',
      message: `Xóa "${item.name}"? Chỉ xóa được nguyên liệu chưa có lịch sử giao dịch và chưa nằm trong công thức nào.`,
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      danger: true,
    });

    if (!ok) return;

    try {
      await http.delete(`/inventory/${encodeURIComponent(item.id)}`);
      ui.toast(`Đã xóa "${item.name}".`);
      await load({ silent: true });
    } catch (error) {
      ui.toast(error.message, 'error', 6000);
    }
  }

  /* ---------------- Sự kiện ---------------- */
  function bind() {
    $('pageTabs').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (!tab) return;

      state.tab = tab.dataset.tab;

      document
        .querySelectorAll('#pageTabs .tab-button')
        .forEach((button) => button.classList.toggle('active', button === tab));

      render();
    });

    $('refreshButton').addEventListener('click', () => {
      state.menu = null;
      load();
    });

    $('addInventory').addEventListener('click', () => itemForm());

    $('inventoryBody').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const { action, id } = button.dataset;

      if (action === 'reload') return load();

      const item = state.items.find((i) => i.id === id);
      if (!item) return;

      if (action === 'import') transactionForm(item, 'IMPORT');
      if (action === 'export') transactionForm(item, 'EXPORT');
      if (action === 'history') showHistory(item);
      if (action === 'recipes') showRecipes(item);
      if (action === 'edit') itemForm(item);
      if (action === 'delete') removeItem(item);
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });
  }

  bind();
  load();
})();
