/* =====================================================
   ORDERFLOW - TRANG BÀN ĂN
   File: public/js/tables.js
   API: GET/POST /tables, PATCH/DELETE /tables/:id,
        POST/DELETE /tables/:id/reservation
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, formModal, reservationModal } = window.OF;
  const h = fmt.escapeHTML;

  const STATUS_LABEL = {
    AVAILABLE: 'Trống',
    OCCUPIED: 'Đang phục vụ',
    RESERVED: 'Đã đặt',
  };

  const STATUS_BADGE = {
    AVAILABLE: 'success',
    OCCUPIED: 'warning',
    RESERVED: 'info',
  };

  const state = {
    tables: [],
    status: 'ALL',
    search: '',
    error: '',
    busy: new Set(),
  };

  const $ = (id) => document.getElementById(id);

  /* ---------------- Tải dữ liệu ---------------- */
  async function load({ silent = false } = {}) {
    if (!silent) util.setLoading(true);

    try {
      const data = await http.get('/tables');
      state.tables = Array.isArray(data) ? data : [];
      state.error = '';
    } catch (error) {
      if (silent) return;
      state.tables = [];
      state.error = error.message;
    } finally {
      if (!silent) util.setLoading(false);
    }

    render();
  }

  /* ---------------- Hiển thị ---------------- */
  function filtered() {
    const keyword = util.normalize(state.search);

    return state.tables.filter((table) => {
      if (state.status !== 'ALL' && table.status !== state.status) return false;
      if (!keyword) return true;

      return [table.tableNumber, table.customerName, table.customerPhone]
        .map(util.normalize)
        .some((value) => value.includes(keyword));
    });
  }

  function renderStats() {
    const count = (status) =>
      state.tables.filter((t) => t.status === status).length;

    $('statTotal').textContent = state.tables.length;
    $('statAvailable').textContent = count('AVAILABLE');
    $('statOccupied').textContent = count('OCCUPIED');
    $('statReserved').textContent = count('RESERVED');

    $('countAll').textContent = state.tables.length;
    $('countAvailable').textContent = count('AVAILABLE');
    $('countOccupied').textContent = count('OCCUPIED');
    $('countReserved').textContent = count('RESERVED');
  }

  function actionButtons(table) {
    const id = h(table.id);
    const disabled = state.busy.has(table.id) ? 'disabled' : '';
    const btn = (action, label, icon, cls = 'of-btn-ghost') =>
      `<button type="button" class="of-btn of-btn-sm ${cls}" data-action="${action}"
               data-id="${id}" ${disabled}><i class="bi ${icon}"></i> ${label}</button>`;

    const icon = (action, title, ic, cls = '') =>
      `<button type="button" class="pg-icon-btn ${cls}" data-action="${action}"
               data-id="${id}" title="${title}" aria-label="${title}" ${disabled}>
         <i class="bi ${ic}"></i></button>`;

    const main = [];

    if (table.status === 'AVAILABLE') {
      main.push(btn('seat', 'Nhận khách', 'bi-person-check', 'of-btn-primary'));
      main.push(btn('reserve', 'Đặt bàn', 'bi-calendar-plus'));
    } else if (table.status === 'RESERVED') {
      main.push(btn('seat', 'Nhận khách', 'bi-person-check', 'of-btn-primary'));
      main.push(btn('cancel-reservation', 'Hủy đặt', 'bi-calendar-x'));
    } else {
      main.push(btn('free', 'Trả bàn', 'bi-box-arrow-right', 'of-btn-primary'));
    }

    const canDelete = table.status !== 'OCCUPIED';

    return `
      <div class="pg-table-actions">${main.join('')}</div>
      <div class="pg-table-actions" style="justify-content:flex-end">
        ${icon('edit', 'Sửa bàn', 'bi-pencil')}
        ${
          canDelete
            ? icon('delete', 'Xóa bàn', 'bi-trash', 'danger')
            : `<button type="button" class="pg-icon-btn" disabled
                       title="Không thể xóa bàn đang phục vụ"><i class="bi bi-trash"></i></button>`
        }
      </div>`;
  }

  function customerBlock(table) {
    if (!table.customerName) return '';

    return `
      <div class="pg-customer">
        <strong><i class="bi bi-person"></i> ${h(table.customerName)}</strong>
        ${table.customerPhone ? `<span><i class="bi bi-telephone"></i> ${h(table.customerPhone)}</span>` : ''}
        ${
          table.reservationAt
            ? `<span><i class="bi bi-clock"></i> ${h(util.time(table.reservationAt))} · ${h(util.date(table.reservationAt))}</span>`
            : ''
        }
        ${table.partySize ? `<span><i class="bi bi-people"></i> ${table.partySize} khách</span>` : ''}
        ${table.note ? `<span><i class="bi bi-chat-left-text"></i> ${h(table.note)}</span>` : ''}
      </div>`;
  }

  function renderCard(table) {
    return `
      <article class="pg-table-card is-${h(String(table.status).toLowerCase())}">
        <div class="pg-table-top">
          <div class="pg-table-no">${h(table.tableNumber)}</div>
          <span class="pg-badge pg-badge-${STATUS_BADGE[table.status] || 'muted'}">
            ${h(STATUS_LABEL[table.status] || table.status)}
          </span>
        </div>
        <div class="pg-table-meta">
          <i class="bi bi-people"></i> Sức chứa ${table.capacity} người
        </div>
        ${customerBlock(table)}
        ${actionButtons(table)}
      </article>`;
  }

  function render() {
    renderStats();

    const grid = $('tableGrid');

    if (state.error) {
      grid.innerHTML = util.errorState(state.error);
      return;
    }

    const list = filtered();

    if (!list.length) {
      const filtering = state.search || state.status !== 'ALL';

      grid.innerHTML = util.emptyState(
        filtering ? 'Không tìm thấy bàn nào' : 'Chưa có bàn nào',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Bấm "Thêm bàn" để tạo bàn đầu tiên cho nhà hàng.',
        'bi-grid',
      );
      return;
    }

    grid.innerHTML = list.map(renderCard).join('');
  }

  /* ---------------- Thao tác ---------------- */
  async function runAction(id, task, successMessage) {
    state.busy.add(id);
    render();

    try {
      await task();
      if (successMessage) ui.toast(successMessage);
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busy.delete(id);
      await load({ silent: true });
      render();
    }
  }

  function findTable(id) {
    return state.tables.find((t) => t.id === id);
  }

  async function seatGuests(table) {
    await runAction(
      table.id,
      () => http.patch(`/tables/${encodeURIComponent(table.id)}`, { status: 'OCCUPIED' }),
      `Bàn ${table.tableNumber} đang phục vụ khách.`,
    );
  }

  async function freeTable(table) {
    const ok = await ui.confirmDialog({
      title: 'Trả bàn?',
      message: `Xác nhận khách bàn ${table.tableNumber} đã rời đi. Thông tin khách của bàn sẽ được xóa.`,
      confirmText: 'Trả bàn',
    });

    if (!ok) return;

    await runAction(
      table.id,
      () => http.patch(`/tables/${encodeURIComponent(table.id)}`, { status: 'AVAILABLE' }),
      `Bàn ${table.tableNumber} đã sẵn sàng.`,
    );
  }

  async function cancelReservation(table) {
    const ok = await ui.confirmDialog({
      title: 'Hủy đặt bàn?',
      message: `Hủy đặt bàn ${table.tableNumber} của khách "${table.customerName || ''}"?`,
      confirmText: 'Hủy đặt bàn',
      cancelText: 'Giữ lại',
      danger: true,
    });

    if (!ok) return;

    await runAction(
      table.id,
      () => http.delete(`/tables/${encodeURIComponent(table.id)}/reservation`),
      'Đã hủy đặt bàn.',
    );
  }

  async function deleteTable(table) {
    const ok = await ui.confirmDialog({
      title: 'Xóa bàn?',
      message: `Xóa bàn ${table.tableNumber}? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa bàn',
      cancelText: 'Giữ lại',
      danger: true,
    });

    if (!ok) return;

    await runAction(
      table.id,
      () => http.delete(`/tables/${encodeURIComponent(table.id)}`),
      `Đã xóa bàn ${table.tableNumber}.`,
    );
  }

  /* ---------------- Form thêm / sửa bàn ---------------- */
  function tableForm(table = null) {
    const editing = Boolean(table);

    formModal({
      title: editing ? `Sửa bàn ${table.tableNumber}` : 'Thêm bàn mới',
      size: 'sm',
      submitText: editing ? 'Lưu thay đổi' : 'Thêm bàn',
      html: `
        <label class="pg-field">
          <span>Số bàn *</span>
          <input class="pg-input" name="tableNumber" maxlength="20"
                 placeholder="Ví dụ: A1, VIP-2" value="${h(table?.tableNumber || '')}" required>
        </label>

        <label class="pg-field">
          <span>Sức chứa (người) *</span>
          <input class="pg-input" type="number" name="capacity" min="1" max="100" step="1"
                 value="${table?.capacity || 4}" required>
        </label>

        ${
          editing
            ? `<label class="pg-field">
                 <span>Trạng thái</span>
                 <select class="pg-select" name="status">
                   ${Object.entries(STATUS_LABEL)
                     .map(
                       ([value, label]) =>
                         `<option value="${value}" ${value === table.status ? 'selected' : ''}>${label}</option>`,
                     )
                     .join('')}
                 </select>
                 <small>Chuyển về "Trống" sẽ xóa thông tin khách đặt bàn.</small>
               </label>`
            : ''
        }`,

      async onSubmit(form) {
        const data = new FormData(form);
        const tableNumber = String(data.get('tableNumber') || '').trim();
        const capacity = Number(data.get('capacity'));

        if (!tableNumber) throw new Error('Vui lòng nhập số bàn.');
        if (tableNumber.length > 20) throw new Error('Số bàn tối đa 20 ký tự.');

        if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
          throw new Error('Sức chứa phải là số nguyên từ 1 đến 100.');
        }

        const duplicate = state.tables.some(
          (t) =>
            t.id !== table?.id &&
            t.tableNumber.trim().toLowerCase() === tableNumber.toLowerCase(),
        );

        if (duplicate) throw new Error(`Số bàn "${tableNumber}" đã tồn tại.`);

        if (editing) {
          const body = { tableNumber, capacity };
          const status = data.get('status');

          if (status) body.status = status;

          if (table.partySize && capacity < table.partySize) {
            throw new Error(
              `Bàn đang có đặt chỗ ${table.partySize} khách, sức chứa không được nhỏ hơn.`,
            );
          }

          await http.patch(`/tables/${encodeURIComponent(table.id)}`, body);
          ui.toast('Đã cập nhật thông tin bàn.');
        } else {
          await http.post('/tables', { tableNumber, capacity });
          ui.toast(`Đã thêm bàn ${tableNumber}.`);
        }

        await load({ silent: true });
      },
    });
  }

  /* ---------------- Sự kiện ---------------- */
  function bind() {
    $('pageTabs').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (!tab) return;

      state.status = tab.dataset.tab;

      document
        .querySelectorAll('#pageTabs .tab-button')
        .forEach((button) =>
          button.classList.toggle('active', button === tab),
        );

      render();
    });

    $('refreshButton').addEventListener('click', () => load());
    $('addTable').addEventListener('click', () => tableForm());

    $('tableGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;

      const { action, id } = button.dataset;

      if (action === 'reload') return load();

      const table = findTable(id);
      if (!table) return;

      if (action === 'seat') seatGuests(table);
      if (action === 'free') freeTable(table);
      if (action === 'edit') tableForm(table);
      if (action === 'delete') deleteTable(table);
      if (action === 'cancel-reservation') cancelReservation(table);

      if (action === 'reserve') {
        reservationModal({ table, onSaved: () => load({ silent: true }) });
      }
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });

    // Tự làm mới nhẹ nhàng mỗi 30 giây
    setInterval(() => {
      if (!document.hidden && !document.querySelector('.of-modal')) {
        load({ silent: true });
      }
    }, 30000);
  }

  bind();
  load();
})();
