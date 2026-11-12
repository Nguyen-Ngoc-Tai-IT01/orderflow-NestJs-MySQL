/* =====================================================
   ORDERFLOW - TRANG ĐẶT BÀN
   File: public/js/reservations.js
   Đặt bàn nằm ngay trên bảng restaurant_tables:
     GET  /tables                  -> lấy danh sách bàn
     POST /tables/:id/reservation  -> đặt / sửa đặt bàn
     DELETE /tables/:id/reservation-> hủy đặt bàn
     PATCH /tables/:id {status}    -> nhận khách (OCCUPIED)
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, reservationModal, settings } = window.OF;
  const h = fmt.escapeHTML;

  const SOON_MINUTES = 120; // "Sắp đến" = trong 2 giờ tới

  const state = {
    tables: [],
    tab: 'ALL',
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

  /* ---------------- Phân loại theo thời gian ---------------- */
  function reservations() {
    return state.tables
      .filter((t) => t.status === 'RESERVED' && t.reservationAt)
      .sort((a, b) => new Date(a.reservationAt) - new Date(b.reservationAt));
  }

  // Trả về: overdue | soon | today | upcoming
  function phaseOf(table) {
    const now = Date.now();
    const at = new Date(table.reservationAt).getTime();
    const hold = Number(settings.get().reservationHoldMinutes) * 60 * 1000;

    if (now > at + hold) return 'overdue';
    if (at - now <= SOON_MINUTES * 60 * 1000) return 'soon';
    if (util.ymd(at) === util.ymd(now)) return 'today';
    return 'upcoming';
  }

  const isToday = (table) => util.ymd(table.reservationAt) === util.ymd(new Date());

  function relativeText(table) {
    const diff = Math.round((new Date(table.reservationAt).getTime() - Date.now()) / 60000);

    if (diff >= 0) {
      if (diff < 60) return `Còn ${diff} phút`;
      if (diff < 24 * 60) return `Còn ${Math.floor(diff / 60)} giờ ${diff % 60} phút`;
      return `Còn ${Math.floor(diff / (24 * 60))} ngày`;
    }

    const late = Math.abs(diff);
    if (late < 60) return `Trễ ${late} phút`;
    if (late < 24 * 60) return `Trễ ${Math.floor(late / 60)} giờ`;
    return `Trễ ${Math.floor(late / (24 * 60))} ngày`;
  }

  const PHASE_BADGE = {
    overdue: { text: 'Quá giờ', cls: 'danger' },
    soon: { text: 'Sắp đến', cls: 'warning' },
    today: { text: 'Hôm nay', cls: 'success' },
    upcoming: { text: 'Sắp tới', cls: 'info' },
  };

  /* ---------------- Hiển thị ---------------- */
  function matchTab(table) {
    const phase = phaseOf(table);

    if (state.tab === 'TODAY') return isToday(table);
    if (state.tab === 'UPCOMING') return !isToday(table) && phase !== 'overdue';
    if (state.tab === 'OVERDUE') return phase === 'overdue';
    return true;
  }

  function filtered() {
    const keyword = util.normalize(state.search);

    return reservations().filter((table) => {
      if (!matchTab(table)) return false;
      if (!keyword) return true;

      return [table.customerName, table.customerPhone, table.tableNumber]
        .map(util.normalize)
        .some((value) => value.includes(keyword));
    });
  }

  function renderStats() {
    const all = reservations();

    const overdue = all.filter((t) => phaseOf(t) === 'overdue').length;
    const soon = all.filter((t) => phaseOf(t) === 'soon').length;
    const today = all.filter(isToday).length;
    const upcoming = all.filter((t) => !isToday(t) && phaseOf(t) !== 'overdue').length;

    $('statTotal').textContent = all.length;
    $('statToday').textContent = today;
    $('statSoon').textContent = soon;
    $('statOverdue').textContent = overdue;

    $('countAll').textContent = all.length;
    $('countToday').textContent = today;
    $('countUpcoming').textContent = upcoming;
    $('countOverdue').textContent = overdue;
  }

  function renderRow(table) {
    const id = h(table.id);
    const phase = phaseOf(table);
    const badge = PHASE_BADGE[phase];
    const disabled = state.busy.has(table.id) ? 'disabled' : '';

    return `
      <tr>
        <td>
          <strong>${h(util.time(table.reservationAt))}</strong>
          <div class="pg-muted" style="font-size:10px">${h(util.date(table.reservationAt))}</div>
          <div style="font-size:10px;margin-top:3px;color:${phase === 'overdue' ? 'var(--red)' : 'var(--text-secondary)'}">
            ${h(relativeText(table))}
          </div>
        </td>
        <td>
          <div class="pg-cell-main">
            <div class="pg-avatar">${h(util.initial(table.customerName))}</div>
            <div>
              <strong>${h(table.customerName || '--')}</strong>
              <small>${h(table.customerPhone || 'Chưa có SĐT')}</small>
            </div>
          </div>
        </td>
        <td><strong>${h(table.tableNumber)}</strong></td>
        <td>${table.partySize || '--'} / ${table.capacity} người</td>
        <td>${table.note ? h(table.note) : '<span class="pg-muted">--</span>'}</td>
        <td><span class="pg-badge pg-badge-${badge.cls}">${badge.text}</span></td>
        <td>
          <div class="pg-row-actions">
            <button type="button" class="of-btn of-btn-sm of-btn-primary" data-action="seat"
                    data-id="${id}" ${disabled}><i class="bi bi-person-check"></i> Nhận khách</button>
            <button type="button" class="pg-icon-btn" data-action="edit" data-id="${id}"
                    title="Sửa đặt bàn" aria-label="Sửa đặt bàn" ${disabled}><i class="bi bi-pencil"></i></button>
            <button type="button" class="pg-icon-btn danger" data-action="cancel" data-id="${id}"
                    title="Hủy đặt bàn" aria-label="Hủy đặt bàn" ${disabled}><i class="bi bi-calendar-x"></i></button>
          </div>
        </td>
      </tr>`;
  }

  function render() {
    renderStats();

    const body = $('reservationBody');
    const footer = $('tableFooter');

    if (state.error) {
      body.innerHTML = `<tr><td colspan="7">${util.errorState(state.error)}</td></tr>`;
      footer.textContent = '';
      return;
    }

    const list = filtered();

    if (!list.length) {
      const filtering = state.search || state.tab !== 'ALL';

      body.innerHTML = `<tr><td colspan="7">${util.emptyState(
        filtering ? 'Không tìm thấy lượt đặt bàn' : 'Chưa có lượt đặt bàn nào',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Bấm "Đặt bàn mới" để giữ chỗ cho khách.',
        'bi-calendar-check',
      )}</td></tr>`;
      footer.textContent = '';
      return;
    }

    body.innerHTML = list.map(renderRow).join('');
    footer.textContent = `Hiển thị ${list.length} / ${reservations().length} lượt đặt bàn`;
  }

  /* ---------------- Thao tác ---------------- */
  async function run(id, task, message) {
    state.busy.add(id);
    render();

    try {
      await task();
      ui.toast(message);
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busy.delete(id);
      await load({ silent: true });
    }
  }

  async function seat(table) {
    await run(
      table.id,
      () => http.patch(`/tables/${encodeURIComponent(table.id)}`, { status: 'OCCUPIED' }),
      `Đã nhận khách ${table.customerName || ''} vào bàn ${table.tableNumber}.`,
    );
  }

  async function cancel(table) {
    const ok = await ui.confirmDialog({
      title: 'Hủy đặt bàn?',
      message: `Hủy đặt bàn ${table.tableNumber} của "${table.customerName || ''}"?`,
      confirmText: 'Hủy đặt bàn',
      cancelText: 'Giữ lại',
      danger: true,
    });

    if (!ok) return;

    await run(
      table.id,
      () => http.delete(`/tables/${encodeURIComponent(table.id)}/reservation`),
      'Đã hủy đặt bàn.',
    );
  }

  function openCreate() {
    // Chỉ cho chọn bàn trống để không ghi đè đặt chỗ của khách khác
    const available = state.tables.filter((t) => t.status === 'AVAILABLE');

    if (!available.length) {
      ui.toast('Hiện không còn bàn trống để đặt.', 'warning');
      return;
    }

    reservationModal({ tables: available, onSaved: () => load({ silent: true }) });
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

    $('refreshButton').addEventListener('click', () => load());
    $('addReservation').addEventListener('click', openCreate);

    $('reservationBody').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;

      const { action, id } = button.dataset;

      if (action === 'reload') return load();

      const table = state.tables.find((t) => t.id === id);
      if (!table) return;

      if (action === 'seat') seat(table);
      if (action === 'cancel') cancel(table);

      if (action === 'edit') {
        reservationModal({ table, onSaved: () => load({ silent: true }) });
      }
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });

    // Cập nhật mốc "còn bao lâu / quá giờ" mỗi 30 giây
    setInterval(() => {
      if (!document.hidden && !document.querySelector('.of-modal')) {
        load({ silent: true });
      }
    }, 30000);
  }

  bind();
  load();
})();
