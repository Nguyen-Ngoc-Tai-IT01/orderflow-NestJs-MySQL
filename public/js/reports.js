/* =====================================================
   ORDERFLOW - TRANG BÁO CÁO
   File: public/js/reports.js
   API (module Reports):
     GET /reports/revenue?from&to&period=day|week
     GET /reports/cancelled-orders?from&to  -> { total }
     GET /reports/top-items?from&to&limit
   Biểu đồ vẽ bằng SVG thuần, không cần thư viện ngoài.
   ===================================================== */
(function () {
  'use strict';

  const { fmt, http, util } = window.OF;
  const h = fmt.escapeHTML;

  const state = {
    revenue: [],
    top: [],
    cancelled: 0,
    period: 'day',
    from: '',
    to: '',
  };

  const $ = (id) => document.getElementById(id);

  /* ---------------- Khoảng thời gian ---------------- */
  function presetRange(preset) {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let start = new Date(end);
    let last = new Date(end);

    if (preset === '7') start.setDate(end.getDate() - 6);
    else if (preset === '30') start.setDate(end.getDate() - 29);
    else if (preset === 'month') start = new Date(end.getFullYear(), end.getMonth(), 1);
    else if (preset === 'lastMonth') {
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      last = new Date(end.getFullYear(), end.getMonth(), 0);
    }

    return { from: util.ymd(start), to: util.ymd(last) };
  }

  function applyPreset(preset) {
    if (preset === 'custom') return;

    const range = presetRange(preset);
    $('fromDate').value = range.from;
    $('toDate').value = range.to;
  }

  /* ---------------- Định dạng ---------------- */
  function compact(value) {
    const n = Number(value) || 0;

    if (n >= 1e9) return `${+(n / 1e9).toFixed(1)} tỷ`;
    if (n >= 1e6) return `${+(n / 1e6).toFixed(1)} tr`;
    if (n >= 1e3) return `${+(n / 1e3).toFixed(0)}k`;
    return String(Math.round(n));
  }

  function niceMax(value) {
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    const step = [1, 2, 2.5, 5, 10].find((s) => s >= normalized) || 10;
    return step * magnitude;
  }

  function labelOf(period, key) {
    const text = String(key);

    if (period === 'week') {
      const match = text.match(/^(\d{4})-W(\d{2})$/);
      return match ? `T${Number(match[2])}/${match[1]}` : text;
    }

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}` : text;
  }

  function longLabel(period, key) {
    const text = String(key);

    if (period === 'week') {
      const match = text.match(/^(\d{4})-W(\d{2})$/);
      return match ? `Tuần ${Number(match[2])}, ${match[1]}` : text;
    }

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : text;
  }

  // Điền các ngày không có doanh thu bằng 0 để biểu đồ liền mạch
  function fillDays(rows, from, to) {
    const map = new Map(rows.map((row) => [String(row.period).slice(0, 10), row]));
    const result = [];

    const cursor = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);

    if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return rows;
    if ((end - cursor) / 86400000 > 400) return rows;

    while (cursor <= end) {
      const key = util.ymd(cursor);
      result.push(map.get(key) || { period: key, revenue: 0, orderCount: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  /* ---------------- Biểu đồ cột SVG ---------------- */
  function barChart(rows, period) {
    const W = 720;
    const H = 280;
    const pad = { l: 58, r: 10, t: 14, b: 40 };
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;

    const max = niceMax(Math.max(...rows.map((r) => r.revenue), 1));
    const slot = innerW / rows.length;
    const barW = Math.max(2, Math.min(36, slot * 0.68));
    const labelEvery = Math.ceil(rows.length / 12);

    let svg = `<svg class="pg-svg-chart" viewBox="0 0 ${W} ${H}" role="img"
                    aria-label="Biểu đồ doanh thu">`;

    for (let i = 0; i <= 4; i += 1) {
      const y = pad.t + innerH - (i / 4) * innerH;

      svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>
              <text x="${pad.l - 8}" y="${y + 3}" text-anchor="end">${h(compact((max * i) / 4))}</text>`;
    }

    rows.forEach((row, index) => {
      const height = (row.revenue / max) * innerH;
      const x = pad.l + index * slot + (slot - barW) / 2;
      const y = pad.t + innerH - height;

      svg += `<rect class="bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}"
                    width="${barW.toFixed(1)}" height="${Math.max(height, row.revenue > 0 ? 1 : 0).toFixed(1)}" rx="3">
                <title>${h(longLabel(period, row.period))}: ${h(fmt.currency(row.revenue))} · ${row.orderCount} đơn</title>
              </rect>`;

      if (index % labelEvery === 0) {
        svg += `<text x="${(x + barW / 2).toFixed(1)}" y="${H - 18}" text-anchor="middle">${h(labelOf(period, row.period))}</text>`;
      }
    });

    return svg + '</svg>';
  }

  /* ---------------- Hiển thị ---------------- */
  function renderSummary() {
    const revenue = state.revenue.reduce((sum, r) => sum + r.revenue, 0);
    const orders = state.revenue.reduce((sum, r) => sum + r.orderCount, 0);
    const average = orders ? revenue / orders : 0;
    const base = orders + state.cancelled;
    const rate = base ? (state.cancelled / base) * 100 : 0;

    $('statRevenue').textContent = fmt.currency(revenue);
    $('statOrders').textContent = util.number(orders);
    $('statAvg').textContent = fmt.currency(average);
    $('statCancelled').textContent = util.number(state.cancelled);

    const hint = $('statCancelled').parentElement.querySelector('p');
    if (hint) hint.textContent = `Tỷ lệ hủy: ${rate.toFixed(1)}%`;
  }

  function renderRevenue(error) {
    const holder = $('revenueChart');
    const body = $('revenueBody');
    const subtitle = $('revenueSubtitle');

    const range = `${util.date(state.from)} – ${util.date(state.to)}`;
    subtitle.textContent = `${range} · ${state.period === 'week' ? 'theo tuần' : 'theo ngày'}`;

    if (error) {
      holder.innerHTML = util.errorState(error, 'apply');
      body.innerHTML = '<tr><td colspan="3" class="pg-muted center">Không có dữ liệu</td></tr>';
      return;
    }

    const rows =
      state.period === 'day'
        ? fillDays(state.revenue, state.from, state.to)
        : state.revenue;

    const hasData = state.revenue.some((r) => r.revenue > 0 || r.orderCount > 0);

    holder.innerHTML = hasData
      ? barChart(rows, state.period)
      : util.emptyState('Chưa có doanh thu', 'Không có đơn nào được phục vụ trong khoảng thời gian này.', 'bi-bar-chart');

    body.innerHTML = state.revenue.length
      ? [...state.revenue]
          .reverse()
          .map(
            (r) => `
            <tr>
              <td>${h(longLabel(state.period, r.period))}</td>
              <td class="num">${r.orderCount}</td>
              <td class="num"><strong>${h(fmt.currency(r.revenue))}</strong></td>
            </tr>`,
          )
          .join('')
      : '<tr><td colspan="3" class="pg-muted center">Không có dữ liệu trong khoảng này</td></tr>';
  }

  function renderTop(error) {
    const holder = $('topItems');

    $('topSubtitle').textContent = `${util.date(state.from)} – ${util.date(state.to)} · theo số lượng bán`;

    if (error) {
      holder.innerHTML = util.errorState(error, 'apply');
      return;
    }

    if (!state.top.length) {
      holder.innerHTML = util.emptyState('Chưa có dữ liệu', 'Chưa có món nào được bán trong khoảng thời gian này.', 'bi-trophy');
      return;
    }

    const max = Math.max(...state.top.map((item) => item.quantity), 1);

    holder.innerHTML = `
      <div class="pg-hbars">
        ${state.top
          .map(
            (item, index) => `
          <div class="pg-hbar-row">
            <span class="pg-hbar-rank">${index + 1}</span>
            <div style="min-width:0">
              <span class="pg-hbar-name" title="${h(item.name)}">${h(item.name)}</span>
              <div class="pg-hbar-track"><i style="width:${((item.quantity / max) * 100).toFixed(0)}%"></i></div>
            </div>
            <span class="pg-hbar-value">${util.number(item.quantity)} phần<small>${h(fmt.currency(item.revenue))}</small></span>
          </div>`,
          )
          .join('')}
      </div>`;
  }

  /* ---------------- Tải báo cáo ---------------- */
  function showFormError(message) {
    const box = $('reportError');
    box.textContent = message || '';
    box.hidden = !message;
  }

  async function load() {
    const from = $('fromDate').value;
    const to = $('toDate').value;
    const period = $('periodSelect').value;
    const limit = Number($('limitSelect').value) || 10;

    showFormError('');

    if (!from || !to) return showFormError('Vui lòng chọn đủ ngày bắt đầu và kết thúc.');
    if (from > to) return showFormError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');

    state.from = from;
    state.to = to;
    state.period = period;

    const button = $('applyReport');
    button.disabled = true;
    util.setLoading(true);

    const [revenue, cancelled, top] = await Promise.allSettled([
      http.get('/reports/revenue', { from, to, period }),
      http.get('/reports/cancelled-orders', { from, to }),
      http.get('/reports/top-items', { from, to, limit }),
    ]);

    state.revenue = revenue.status === 'fulfilled' && Array.isArray(revenue.value) ? revenue.value : [];
    state.cancelled = cancelled.status === 'fulfilled' ? Number(cancelled.value?.total || 0) : 0;
    state.top = top.status === 'fulfilled' && Array.isArray(top.value) ? top.value : [];

    renderSummary();
    renderRevenue(revenue.status === 'rejected' ? revenue.reason.message : '');
    renderTop(top.status === 'rejected' ? top.reason.message : '');

    if (cancelled.status === 'rejected') {
      showFormError(`Không lấy được số đơn hủy: ${cancelled.reason.message}`);
    }

    button.disabled = false;
    util.setLoading(false);
  }

  /* ---------------- Xuất CSV ---------------- */
  function exportRevenue() {
    if (!state.revenue.length) return window.OF.ui.toast('Chưa có dữ liệu để xuất.', 'warning');

    util.downloadCsv(`doanh-thu_${state.from}_${state.to}.csv`, [
      ['Thời gian', 'Số đơn', 'Doanh thu (VNĐ)'],
      ...state.revenue.map((r) => [longLabel(state.period, r.period), r.orderCount, r.revenue]),
    ]);
  }

  function exportTop() {
    if (!state.top.length) return window.OF.ui.toast('Chưa có dữ liệu để xuất.', 'warning');

    util.downloadCsv(`mon-ban-chay_${state.from}_${state.to}.csv`, [
      ['Hạng', 'Tên món', 'Số lượng', 'Doanh thu (VNĐ)'],
      ...state.top.map((item, i) => [i + 1, item.name, item.quantity, item.revenue]),
    ]);
  }

  /* ---------------- Sự kiện ---------------- */
  function bind() {
    $('presetSelect').addEventListener('change', (event) => {
      applyPreset(event.target.value);
      if (event.target.value !== 'custom') load();
    });

    ['fromDate', 'toDate'].forEach((id) =>
      $(id).addEventListener('change', () => ($('presetSelect').value = 'custom')),
    );

    ['periodSelect', 'limitSelect'].forEach((id) => $(id).addEventListener('change', load));

    $('applyReport').addEventListener('click', load);
    $('refreshButton').addEventListener('click', load);
    $('exportRevenue').addEventListener('click', exportRevenue);
    $('exportTop').addEventListener('click', exportTop);

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="apply"]')) load();
    });
  }

  applyPreset($('presetSelect').value);
  bind();
  load();
})();
