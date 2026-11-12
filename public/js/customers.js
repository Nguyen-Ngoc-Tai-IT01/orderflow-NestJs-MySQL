/* =====================================================
   ORDERFLOW - TRANG KHÁCH HÀNG
   File: public/js/customers.js
   Backend chưa có bảng Customer riêng, nên dữ liệu được
   TỔNG HỢP từ:
     - GET /orders  (customerName, status, totalAmount, items)
     - GET /tables  (khách đang đặt bàn: tên, SĐT, giờ hẹn)
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util } = window.OF;
  const h = fmt.escapeHTML;

  const PAGE_SIZE = 100; // tối đa của API /orders
  const MAX_PAGES = 20; // giới hạn 2000 đơn gần nhất
  const LOYAL_MIN_SERVED = 3;

  const STATUS_LABEL = {
    PENDING: 'Chờ xác nhận',
    PREPARING: 'Đang chế biến',
    READY: 'Sẵn sàng',
    SERVED: 'Đã phục vụ',
    CANCELLED: 'Đã hủy',
  };

  const state = {
    customers: [],
    tab: 'ALL',
    sort: 'spent',
    search: '',
    error: '',
    truncated: false,
    totalOrders: 0,
  };

  const $ = (id) => document.getElementById(id);

  const keyOf = (name) => util.normalize(name).replace(/\s+/g, ' ');

  /* ---------------- Tải + tổng hợp ---------------- */
  async function fetchAllOrders() {
    const orders = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;

    do {
      const result = await http.get('/orders', {
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        order: 'DESC',
      });

      const list = Array.isArray(result) ? result : result?.data || [];

      orders.push(...list);

      totalPages = Number(result?.meta?.totalPages || 1);
      total = Number(result?.meta?.total || orders.length);

      $('tableFooter').textContent = `Đang tải đơn hàng... ${orders.length}/${total}`;
      page += 1;
    } while (page <= totalPages && page <= MAX_PAGES);

    return { orders, total, truncated: page <= totalPages };
  }

  function build(orders, tables) {
    const map = new Map();

    const ensure = (name) => {
      const key = keyOf(name);
      if (!key) return null;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: String(name).trim(),
          phone: '',
          orders: [],
          served: 0,
          cancelled: 0,
          spent: 0,
          lastAt: null,
          dishes: new Map(),
          reservation: null,
        });
      }

      return map.get(key);
    };

    orders.forEach((order) => {
      const customer = ensure(order.customerName);
      if (!customer) return;

      customer.orders.push(order);

      if (order.status === 'SERVED') {
        customer.served += 1;
        customer.spent += Number(order.totalAmount) || 0;
      }

      if (order.status === 'CANCELLED') customer.cancelled += 1;

      const created = new Date(order.createdAt).getTime();
      if (!customer.lastAt || created > customer.lastAt) customer.lastAt = created;

      if (order.status !== 'CANCELLED') {
        (order.items || []).forEach((item) => {
          customer.dishes.set(
            item.name,
            (customer.dishes.get(item.name) || 0) + (Number(item.quantity) || 0),
          );
        });
      }
    });

    tables
      .filter((t) => t.customerName && (t.status === 'RESERVED' || t.status === 'OCCUPIED'))
      .forEach((table) => {
        const customer = ensure(table.customerName);
        if (!customer) return;

        if (table.customerPhone) customer.phone = table.customerPhone;

        if (table.status === 'RESERVED') {
          customer.reservation = {
            tableNumber: table.tableNumber,
            at: table.reservationAt,
            partySize: table.partySize,
          };
        }
      });

    return [...map.values()].map((customer) => {
      const favorite = [...customer.dishes.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        ...customer,
        favorite: favorite ? `${favorite[0]} (×${favorite[1]})` : '',
        loyal: customer.served >= LOYAL_MIN_SERVED,
      };
    });
  }

  async function load() {
    util.setLoading(true);

    try {
      const [ordersResult, tables] = await Promise.all([
        fetchAllOrders(),
        http.get('/tables').catch(() => []), // không có API bàn vẫn xem được khách từ đơn
      ]);

      state.customers = build(ordersResult.orders, Array.isArray(tables) ? tables : []);
      state.truncated = ordersResult.truncated;
      state.totalOrders = ordersResult.total;
      state.error = '';
    } catch (error) {
      state.customers = [];
      state.error = error.message;
    } finally {
      util.setLoading(false);
    }

    render();
  }

  /* ---------------- Hiển thị ---------------- */
  function filtered() {
    const keyword = util.normalize(state.search);

    const list = state.customers.filter((customer) => {
      if (state.tab === 'RESERVED' && !customer.reservation) return false;
      if (state.tab === 'LOYAL' && !customer.loyal) return false;
      if (!keyword) return true;

      return [customer.name, customer.phone]
        .map(util.normalize)
        .some((value) => value.includes(keyword));
    });

    const sorters = {
      spent: (a, b) => b.spent - a.spent,
      orders: (a, b) => b.orders.length - a.orders.length,
      recent: (a, b) => (b.lastAt || 0) - (a.lastAt || 0),
      name: (a, b) => a.name.localeCompare(b.name, 'vi'),
    };

    return list.sort(sorters[state.sort] || sorters.spent);
  }

  function renderStats() {
    const all = state.customers;

    $('statTotal').textContent = all.length;
    $('statLoyal').textContent = all.filter((c) => c.loyal).length;
    $('statReserved').textContent = all.filter((c) => c.reservation).length;
    $('statSpent').textContent = fmt.currency(all.reduce((sum, c) => sum + c.spent, 0));

    $('countAll').textContent = all.length;
    $('countReserved').textContent = all.filter((c) => c.reservation).length;
    $('countLoyal').textContent = all.filter((c) => c.loyal).length;
  }

  function renderRow(customer) {
    const reservation = customer.reservation;

    return `
      <tr>
        <td>
          <div class="pg-cell-main">
            <div class="pg-avatar ${customer.loyal ? 'purple' : ''}">${h(util.initial(customer.name))}</div>
            <div>
              <strong>${h(customer.name)} ${customer.loyal ? '<span class="pg-badge pg-badge-purple">Khách quen</span>' : ''}</strong>
              <small>${h(customer.phone || 'Chưa có SĐT')}</small>
            </div>
          </div>
        </td>
        <td class="center"><strong>${customer.orders.length}</strong></td>
        <td class="center">${customer.served} / <span style="color:var(--red)">${customer.cancelled}</span></td>
        <td class="num"><strong>${h(fmt.currency(customer.spent))}</strong></td>
        <td class="pg-muted">${customer.lastAt ? h(fmt.dateTime(customer.lastAt)) : '--'}</td>
        <td>${customer.favorite ? h(customer.favorite) : '<span class="pg-muted">--</span>'}</td>
        <td>
          ${
            reservation
              ? `<span class="pg-badge pg-badge-info">Bàn ${h(reservation.tableNumber)} · ${h(util.time(reservation.at))}</span>`
              : '<span class="pg-muted">--</span>'
          }
        </td>
        <td>
          <div class="pg-row-actions">
            <button type="button" class="pg-icon-btn" data-action="detail"
                    data-key="${h(customer.key)}" title="Xem chi tiết" aria-label="Xem chi tiết">
              <i class="bi bi-eye"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function render() {
    renderStats();

    const body = $('customerBody');
    const footer = $('tableFooter');

    if (state.error) {
      body.innerHTML = `<tr><td colspan="8">${util.errorState(state.error)}</td></tr>`;
      footer.textContent = '';
      return;
    }

    const list = filtered();

    if (!list.length) {
      const filtering = state.search || state.tab !== 'ALL';

      body.innerHTML = `<tr><td colspan="8">${util.emptyState(
        filtering ? 'Không tìm thấy khách hàng' : 'Chưa có thông tin khách hàng',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Khách sẽ xuất hiện khi đơn hàng hoặc đặt bàn có ghi tên khách.',
        'bi-people',
      )}</td></tr>`;
      footer.textContent = '';
      return;
    }

    body.innerHTML = list.map(renderRow).join('');

    footer.textContent =
      `Hiển thị ${list.length} / ${state.customers.length} khách` +
      (state.truncated
        ? ` · chỉ tổng hợp ${MAX_PAGES * PAGE_SIZE} đơn gần nhất trên tổng ${state.totalOrders} đơn`
        : '');
  }

  /* ---------------- Chi tiết khách ---------------- */
  function showDetail(customer) {
    const recent = [...customer.orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    const reservation = customer.reservation;

    ui.openModal({
      title: customer.name,
      size: 'lg',
      html: `
        <div class="pg-kv">
          <div><span>Số điện thoại</span><strong>${h(customer.phone || '--')}</strong></div>
          <div><span>Tổng chi tiêu</span><strong>${h(fmt.currency(customer.spent))}</strong></div>
          <div><span>Số đơn</span><strong>${customer.orders.length} (${customer.served} phục vụ · ${customer.cancelled} hủy)</strong></div>
          <div><span>Lần gần nhất</span><strong>${customer.lastAt ? h(fmt.dateTime(customer.lastAt)) : '--'}</strong></div>
          <div><span>Món hay gọi</span><strong>${h(customer.favorite || '--')}</strong></div>
          <div><span>Đặt bàn hiện tại</span><strong>${
            reservation
              ? `Bàn ${h(reservation.tableNumber)} · ${h(util.time(reservation.at))} ${h(util.date(reservation.at))} · ${reservation.partySize || '?'} khách`
              : '--'
          }</strong></div>
        </div>

        <h3 class="detail-title">Đơn hàng gần đây ${recent.length < customer.orders.length ? `(${recent.length}/${customer.orders.length})` : ''}</h3>

        ${
          recent.length
            ? `<div class="pg-table-wrap pg-scroll">
                 <table class="pg-table">
                   <thead><tr><th>Thời gian</th><th>Bàn</th><th>Trạng thái</th><th class="num">Tổng tiền</th></tr></thead>
                   <tbody>
                     ${recent
                       .map(
                         (order) => `
                       <tr>
                         <td class="pg-muted">${h(fmt.dateTime(order.createdAt))}</td>
                         <td>${h(order.tableNumber || '--')}</td>
                         <td><span class="status-badge status-${h(String(order.status).toLowerCase())}">${h(STATUS_LABEL[order.status] || order.status)}</span></td>
                         <td class="num"><strong>${h(fmt.currency(order.totalAmount))}</strong></td>
                       </tr>`,
                       )
                       .join('')}
                   </tbody>
                 </table>
               </div>`
            : '<p class="pg-muted">Khách này chưa có đơn hàng, chỉ có thông tin đặt bàn.</p>'
        }`,
    });
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

    $('sortCustomers').addEventListener('change', (event) => {
      state.sort = event.target.value;
      render();
    });

    $('refreshButton').addEventListener('click', load);

    $('customerBody').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      if (button.dataset.action === 'reload') return load();

      if (button.dataset.action === 'detail') {
        const customer = state.customers.find((c) => c.key === button.dataset.key);
        if (customer) showDetail(customer);
      }
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });
  }

  bind();
  load();
})();
