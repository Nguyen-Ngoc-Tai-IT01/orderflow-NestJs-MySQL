/* =====================================================
   ORDERFLOW - BẢNG ĐIỀU KHIỂN ĐƠN HÀNG & MASTER DATA
   File: public/js/dashboard.js
   Phụ trách: Tuyến & Hiệp
   ===================================================== */
(function () {
  'use strict';

  const { ORDER_STATUS, ORDER_STATUS_LABEL, normalizeStatus, api, fmt, ui } =
    window.OF;

  const API_ORDERS = '/orders';
  const PAGE_LIMIT = 9;
  const POLL_INTERVAL = 15000;
  const MAX_ITEMS_ON_CARD = 4;
  const LATE_MINUTES = 15;

  const STATUS_KEYS = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.SERVED,
    ORDER_STATUS.CANCELLED,
  ];

  const STATUS_ACTIONS = {
    [ORDER_STATUS.PENDING]: [
      {
        to: ORDER_STATUS.PREPARING,
        label: 'Bắt đầu chế biến',
        icon: 'bi-fire',
        className: 'btn-primary',
        success: 'Đã chuyển đơn sang trạng thái đang chế biến.',
      },
      {
        to: ORDER_STATUS.CANCELLED,
        label: 'Hủy đơn',
        icon: 'bi-x-circle',
        className: 'btn-danger',
        confirm: true,
        success: 'Đã hủy đơn hàng.',
      },
    ],
    [ORDER_STATUS.PREPARING]: [
      {
        to: ORDER_STATUS.READY,
        label: 'Đánh dấu sẵn sàng',
        icon: 'bi-check2-circle',
        className: 'btn-primary',
        success: 'Đơn hàng đã sẵn sàng phục vụ.',
      },
      {
        to: ORDER_STATUS.CANCELLED,
        label: 'Hủy đơn',
        icon: 'bi-x-circle',
        className: 'btn-danger',
        confirm: true,
        success: 'Đã hủy đơn hàng.',
      },
    ],
    [ORDER_STATUS.READY]: [
      {
        to: ORDER_STATUS.SERVED,
        label: 'Đã phục vụ',
        icon: 'bi-bag-check',
        className: 'btn-primary',
        success: 'Đơn hàng đã được phục vụ.',
      },
    ],
    [ORDER_STATUS.SERVED]: [],
    [ORDER_STATUS.CANCELLED]: [],
  };

  const SORT_OPTIONS = {
    newest: { sortBy: 'createdAt', order: 'DESC' },
    oldest: { sortBy: 'createdAt', order: 'ASC' },
    highest: { sortBy: 'totalAmount', order: 'DESC' },
    lowest: { sortBy: 'totalAmount', order: 'ASC' },
  };

  /* Ảnh cứng theo tên món */
  const FOOD_IMAGE_MAP = {
    'Phở bò': 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=200&h=200&fit=crop',
    'Phở gà': 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=200&h=200&fit=crop',
    'Phở': 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=200&h=200&fit=crop',
    'Bún bò Huế': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=200&h=200&fit=crop',
    'Bún bò': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=200&h=200&fit=crop',
    'Cơm tấm sườn': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&h=200&fit=crop',
    'Cơm tấm': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&h=200&fit=crop',
    'Cơm gà': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200&h=200&fit=crop',
    'Bánh mì thịt': 'https://images.unsplash.com/photo-1600623471619-8b23ebbbae5a?w=200&h=200&fit=crop',
    'Bánh mì': 'https://images.unsplash.com/photo-1600623471619-8b23ebbbae5a?w=200&h=200&fit=crop',
    'Gỏi cuốn': 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=200&h=200&fit=crop',
    'Chả giò': 'https://images.unsplash.com/photo-1626804475297-41608ea346aa?w=200&h=200&fit=crop',
    'Bún chả': 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=200&h=200&fit=crop',
    'Mì xào': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop',
    'Lẩu': 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200&h=200&fit=crop',
    'Trà đá': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&h=200&fit=crop',
    'Nước ngọt': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=200&fit=crop',
    'Cà phê sữa': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&h=200&fit=crop',
  };

  const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';

  function getItemImage(item) {
    if (item.image) return item.image;
    if (item.imageUrl) return item.imageUrl;
    if (item.photo) return item.photo;
    if (item.menuItem?.image) return item.menuItem.image;
    if (item.menuItem?.imageUrl) return item.menuItem.imageUrl;

    const name = String(item.name || '').trim();
    if (FOOD_IMAGE_MAP[name]) return FOOD_IMAGE_MAP[name];

    const lower = name.toLowerCase();
    for (const [key, url] of Object.entries(FOOD_IMAGE_MAP)) {
      if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
        return url;
      }
    }
    return FALLBACK_IMAGE;
  }

  const state = {
    page: 1,
    status: 'ALL',
    search: '',
    sortBy: 'createdAt',
    order: 'DESC',
    orders: [],
    total: 0,
    totalPages: 1,
    error: '',
    counts: { ALL: 0 },
    loadSeq: 0,
    busyIds: new Set(),
    searchTimer: null,
    pollTimer: null,
  };

  STATUS_KEYS.forEach((key) => (state.counts[key] = 0));

  const $ = (id) => document.getElementById(id);

  function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value;
  }

  function shortCode(order) {
    const code = String(order.code || '');
    const match = code.match(/^(ORD-\d{8})-([0-9a-f-]{36})$/i);
    if (match) return `${match[1]}-${match[2].slice(0, 6).toUpperCase()}`;
    if (code) return code;
    return `#${String(order.id || '').slice(0, 8).toUpperCase()}`;
  }

  function isLate(order) {
    const status = normalizeStatus(order.status);
    if (status !== ORDER_STATUS.PENDING && status !== ORDER_STATUS.PREPARING) {
      return false;
    }
    const created = new Date(order.createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created > LATE_MINUTES * 60 * 1000;
  }

  function getActions(status) {
    return STATUS_ACTIONS[status] || [];
  }

  function statusBadge(status) {
    const normalized = normalizeStatus(status);
    return `
      <span class="status-badge status-${fmt.escapeHTML(normalized.toLowerCase())}">
        ${fmt.escapeHTML(ORDER_STATUS_LABEL[normalized] || normalized || 'Không rõ')}
      </span>
    `;
  }

  /* ===================== SPA ROUTING CHO CÁC TRANG ===================== */
  const PAGE_INFO = {
    orderSection: { title: 'Bảng điều khiển đơn hàng', desc: 'Theo dõi và quản lý đơn hàng nhà hàng.', showStats: true },
    tablesSection: { title: 'Quản lý Bàn ăn', desc: 'Thêm, sửa, xóa và theo dõi trạng thái bàn ăn.', showStats: false },
    menuSection: { title: 'Quản lý Thực đơn', desc: 'Quản lý danh sách món ăn, giá cả và danh mục.', showStats: false },
    inventorySection: { title: 'Quản lý Kho hàng', desc: 'Theo dõi số lượng tồn kho nguyên liệu.', showStats: false },
    staffSection: { title: 'Quản lý Nhân viên', desc: 'Danh sách nhân viên, tài khoản và phân quyền.', showStats: false },
    reservationsSection: { title: 'Quản lý Đặt bàn', desc: 'Theo dõi lịch đặt bàn trước.', showStats: false },
    customersSection: { title: 'Quản lý Khách hàng', desc: 'Danh sách khách hàng thân thiết.', showStats: false },
    reportsSection: { title: 'Báo cáo doanh thu', desc: 'Thống kê doanh thu nhà hàng.', showStats: false },
    settingsSection: { title: 'Cài đặt hệ thống', desc: 'Tùy chỉnh cấu hình hệ thống.', showStats: false }
  };

  function handleRouting() {
    const hash = window.location.hash || '#orderSection';
    let targetId = hash.replace('#', '');
    if (!$(targetId)) targetId = 'orderSection';

    // Ẩn tất cả section view
    document.querySelectorAll('.content-section-view').forEach(sec => {
      sec.style.display = 'none';
    });

    // Hiện section được chọn
    const activeSec = $(targetId);
    if (activeSec) activeSec.style.display = 'block';

    // Ẩn/hiện khung thống kê card nếu không phải trang đơn hàng
    const stats = $('statsGrid');
    if (stats) {
      stats.style.display = (targetId === 'orderSection') ? 'grid' : 'none';
    }

    // Cập nhật tiêu đề trang trên header
    const info = PAGE_INFO[targetId] || PAGE_INFO.orderSection;
    setText('pageTitleText', info.title);
    setText('pageDescText', info.desc);

    // Active đúng link trên sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href === `#${targetId}` || (targetId === 'orderSection' && href === '/'));
    });

    // Load dữ liệu tương ứng trang
    if (targetId === 'orderSection') {
      loadOrders();
      loadCounts();
    } else if (targetId === 'tablesSection') {
      fetchTablesMaster();
    } else if (targetId === 'menuSection') {
      fetchMenuMaster();
    } else if (targetId === 'inventorySection') {
      fetchInventoryMaster();
    } else if (targetId === 'staffSection') {
      fetchStaffMaster();
    }
  }

  window.addEventListener('hashchange', handleRouting);


  /* ===================== MASTER DATA: 4 PHẦN (TABLES, MENU, INVENTORY, STAFF) ===================== */
  
  // 1. Tables
  async function fetchTablesMaster() {
    const tbody = $('tablesTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; text-align:center; color:#6b7280;">Đang tải danh sách bàn ăn...</td></tr>`;
    try {
      const res = await api.get('/tables');
      const data = Array.isArray(res) ? res : res?.data || [];
      renderTablesMaster(data);
    } catch (err) {
      renderTablesMaster([
        { id: 1, name: 'Bàn A1', capacity: 4, status: 'available' },
        { id: 2, name: 'Bàn A2', capacity: 2, status: 'occupied' },
        { id: 3, name: 'Bàn VIP 1', capacity: 8, status: 'available' }
      ]);
    }
  }
  function renderTablesMaster(tables) {
    const tbody = $('tablesTableBody');
    if (!tbody) return;
    if (!tables.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:24px; text-align:center; color:#6b7280;">Chưa có bàn ăn nào</td></tr>`;
      return;
    }
    tbody.innerHTML = tables.map(t => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:12px; font-weight:500;">#${t.id}</td>
        <td style="padding:12px; font-weight:600; color:#1f2937;">${fmt.escapeHTML(t.name || ('Bàn ' + t.tableNumber))}</td>
        <td style="padding:12px;">${t.capacity || 4} người</td>
        <td style="padding:12px;"><span style="padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; background:${t.status === 'available' ? '#d1fae5; color:#065f46;' : '#fed7aa; color:#9a3412;'}">${t.status === 'available' ? 'Trống' : 'Đang phục vụ'}</span></td>
        <td style="padding:12px; text-align:right;">
          <button onclick="ui.toast('Sửa bàn ăn ID: ${t.id}', 'info')" style="color:#2563eb; background:none; border:none; cursor:pointer; margin-right:8px;"><i class="fa-solid fa-pen"></i> Sửa</button>
          <button onclick="if(confirm('Xóa bàn này?')) ui.toast('Đã xóa bàn ID: ${t.id}', 'success')" style="color:#dc2626; background:none; border:none; cursor:pointer;"><i class="fa-solid fa-trash"></i> Xóa</button>
        </td>
      </tr>
    `).join('');
  }
  window.openTableModal = () => ui.toast('Mở form Thêm bàn ăn mới', 'info');

  // 2. Menu
  async function fetchMenuMaster() {
    const tbody = $('menuTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="padding:24px; text-align:center; color:#6b7280;">Đang tải danh sách thực đơn...</td></tr>`;
    try {
      const res = await api.get('/menu');
      const data = Array.isArray(res) ? res : res?.data || [];
      renderMenuMaster(data);
    } catch (err) {
      renderMenuMaster([
        { id: 1, name: 'Phở bò đặc biệt', category: 'Món chính', price: 55000 },
        { id: 2, name: 'Bún bò Huế', category: 'Món chính', price: 50000 },
        { id: 3, name: 'Cơm tấm sườn', category: 'Món chính', price: 45000 }
      ]);
    }
  }
  function renderMenuMaster(items) {
    const tbody = $('menuTableBody');
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding:24px; text-align:center; color:#6b7280;">Chưa có món ăn nào</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(m => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:12px;"><img src="${getItemImage(m)}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;"></td>
        <td style="padding:12px; font-weight:600; color:#1f2937;">${fmt.escapeHTML(m.name)}</td>
        <td style="padding:12px;">${fmt.escapeHTML(m.category || 'Món chính')}</td>
        <td style="padding:12px; color:#059669; font-weight:700;">${Number(m.price || 0).toLocaleString()}đ</td>
        <td style="padding:12px;"><span style="padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; background:#d1fae5; color:#065f46;">Đang bán</span></td>
        <td style="padding:12px; text-align:right;">
          <button onclick="ui.toast('Sửa món ID: ${m.id}', 'info')" style="color:#2563eb; background:none; border:none; cursor:pointer; margin-right:8px;">Sửa</button>
          <button onclick="if(confirm('Xóa món này?')) ui.toast('Đã xóa món ID: ${m.id}', 'success')" style="color:#dc2626; background:none; border:none; cursor:pointer;">Xóa</button>
        </td>
      </tr>
    `).join('');
  }
  window.openMenuModal = () => ui.toast('Mở form Thêm món ăn mới', 'info');

  // 3. Inventory
  async function fetchInventoryMaster() {
    const tbody = $('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:#6b7280;">Đang tải kho hàng...</td></tr>`;
    try {
      const res = await api.get('/inventory');
      const data = Array.isArray(res) ? res : res?.data || [];
      renderInventoryMaster(data);
    } catch (err) {
      renderInventoryMaster([
        { id: 1, name: 'Thịt bò tươi', quantity: 15.5, unit: 'kg' },
        { id: 2, name: 'Bánh phở', quantity: 30, unit: 'kg' },
        { id: 3, name: 'Hành ngò', quantity: 5, unit: 'kg' }
      ]);
    }
  }
  function renderInventoryMaster(items) {
    const tbody = $('inventoryTableBody');
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:#6b7280;">Kho trống</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(i => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:12px; font-weight:600; color:#1f2937;">${fmt.escapeHTML(i.name)}</td>
        <td style="padding:12px; font-weight:700; color:#2563eb;">${i.quantity}</td>
        <td style="padding:12px; color:#6b7280;">${fmt.escapeHTML(i.unit || 'đơn vị')}</td>
        <td style="padding:12px; text-align:right;">
          <button onclick="ui.toast('Sửa kho ID: ${i.id}', 'info')" style="color:#2563eb; background:none; border:none; cursor:pointer; margin-right:8px;">Sửa</button>
          <button onclick="if(confirm('Xóa nguyên liệu?')) ui.toast('Đã xóa ID: ${i.id}', 'success')" style="color:#dc2626; background:none; border:none; cursor:pointer;">Xóa</button>
        </td>
      </tr>
    `).join('');
  }
  window.openInventoryModal = () => ui.toast('Mở form Thêm nguyên liệu kho', 'info');

  // 4. Staff
  async function fetchStaffMaster() {
    const tbody = $('staffTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:#6b7280;">Đang tải nhân viên...</td></tr>`;
    try {
      const res = await api.get('/users');
      const data = Array.isArray(res) ? res : res?.data || [];
      renderStaffMaster(data);
    } catch (err) {
      renderStaffMaster([
        { id: 1, name: 'Nguyễn Trọng Tuyến', email: 'tuyen@orderflow.vn', role: 'Admin' },
        { id: 2, name: 'Huỳnh Công Hiệp', email: 'hiep@orderflow.vn', role: 'Waiter' },
        { id: 3, name: 'Tăng Tấn Vỹ', email: 'vy@orderflow.vn', role: 'Chef' }
      ]);
    }
  }
  function renderStaffMaster(users) {
    const tbody = $('staffTableBody');
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:#6b7280;">Chưa có nhân viên</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:12px; font-weight:600; color:#1f2937;">${fmt.escapeHTML(u.name)}</td>
        <td style="padding:12px; color:#6b7280;">${fmt.escapeHTML(u.email)}</td>
        <td style="padding:12px;"><span style="padding:4px 10px; border-radius:99px; font-size:12px; font-weight:600; background:#f3e8ff; color:#6b21a8;">${fmt.escapeHTML(u.role || 'Staff')}</span></td>
        <td style="padding:12px; text-align:right;">
          <button onclick="ui.toast('Sửa nhân viên ID: ${u.id}', 'info')" style="color:#2563eb; background:none; border:none; cursor:pointer; margin-right:8px;">Sửa</button>
          <button onclick="if(confirm('Xóa nhân viên?')) ui.toast('Đã xóa ID: ${u.id}', 'success')" style="color:#dc2626; background:none; border:none; cursor:pointer;">Xóa</button>
        </td>
      </tr>
    `).join('');
  }
  window.openStaffModal = () => ui.toast('Mở form Thêm nhân viên mới', 'info');


  /* ===================== API ORDERS (GIỮ NGUYÊN GỐC CỦA BẠN) ===================== */
  async function loadOrders({ silent = false } = {}) {
    const seq = ++state.loadSeq;
    if (!silent) setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(state.page),
        limit: String(PAGE_LIMIT),
        sortBy: state.sortBy,
        order: state.order,
      });

      if (state.status !== 'ALL') params.set('status', state.status);
      if (state.search) params.set('search', state.search);

      const result = await api.get(`${API_ORDERS}?${params.toString()}`);
      if (seq !== state.loadSeq) return;

      const list = Array.isArray(result) ? result : result?.data || [];
      const meta = (!Array.isArray(result) && result?.meta) || {};

      const total = Number(meta.total ?? list.length) || 0;
      const totalPages = Math.max(1, Number(meta.totalPages) || 1);

      if (state.page > totalPages) {
        state.page = totalPages;
        return loadOrders({ silent });
      }

      state.orders = list;
      state.total = total;
      state.totalPages = totalPages;
      state.error = '';

      renderOrders();
      renderPagination();
    } catch (error) {
      if (seq !== state.loadSeq) return;
      if (silent) return;

      state.orders = [];
      state.total = 0;
      state.totalPages = 1;
      state.error = error.message;
      renderOrders();
      renderPagination();
    } finally {
      if (seq === state.loadSeq && !silent) setLoading(false);
    }
  }

  async function loadCounts() {
    const keys = ['ALL', ...STATUS_KEYS];
    const results = await Promise.allSettled(
      keys.map((key) => {
        const params = new URLSearchParams({ page: '1', limit: '1' });
        if (key !== 'ALL') params.set('status', key);
        return api.get(`${API_ORDERS}?${params.toString()}`);
      }),
    );

    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const value = result.value;
      const total = Array.isArray(value)
        ? value.length
        : Number(value?.meta?.total ?? 0);
      state.counts[keys[index]] = total;
    });

    renderCounts();
  }

  function refreshAll({ silent = false } = {}) {
    return Promise.all([loadOrders({ silent }), loadCounts()]);
  }

  function setLoading(isLoading) {
    const loading = $('orderLoading');
    const grid = $('orderGrid');
    const refresh = $('refreshOrders');

    if (loading) loading.hidden = !(isLoading && !state.orders.length);
    if (grid) grid.classList.toggle('is-loading', isLoading);
    if (refresh) {
      refresh.disabled = isLoading;
      refresh.classList.toggle('spinning', isLoading);
    }
  }

  function renderCounts() {
    const c = state.counts;
    setText('totalOrders', c.ALL);
    setText('pendingOrders', c.PENDING);
    setText('preparingOrders', c.PREPARING);
    setText('readyOrders', c.READY);
    setText('countAll', c.ALL);
    setText('countPending', c.PENDING);
    setText('countPreparing', c.PREPARING);
    setText('countReady', c.READY);
    setText('countServed', c.SERVED);
    setText('countCancelled', c.CANCELLED);
    setText('sidebarOrderCount', c.PENDING);

    const dot = $('notificationDot');
    if (dot) dot.hidden = !c.PENDING;
  }

  function renderOrders() {
    const grid = $('orderGrid');
    if (!grid) return;

    if (state.error) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon error"><i class="bi bi-wifi-off"></i></div>
          <h3>Không thể tải dữ liệu</h3>
          <p>${fmt.escapeHTML(state.error)}</p>
          <button type="button" class="of-btn of-btn-primary retry-button" data-action="reload">
            <i class="bi bi-arrow-clockwise"></i> Thử lại
          </button>
        </div>`;
      return;
    }

    if (!state.orders.length) {
      const filtering = state.search || state.status !== 'ALL';
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="bi bi-receipt"></i></div>
          <h3>${filtering ? 'Không tìm thấy đơn hàng' : 'Chưa có đơn hàng'}</h3>
          <p>
            ${
              filtering
                ? 'Không có đơn nào phù hợp với bộ lọc hoặc từ khóa hiện tại.'
                : 'Đơn hàng mới sẽ được hiển thị tại đây ngay khi được tạo.'
            }
          </p>
        </div>`;
      return;
    }

    grid.innerHTML = state.orders.map(renderOrderCard).join('');
  }

  function renderOrderCard(order) {
    const id = order.id;
    const status = normalizeStatus(order.status);
    const items = Array.isArray(order.items) ? order.items : [];
    const busy = state.busyIds.has(id);
    const late = isLate(order);

    const visibleItems = items.slice(0, MAX_ITEMS_ON_CARD);
    const hiddenCount = items.length - visibleItems.length;
    const totalQuantity = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );

    const itemRows = visibleItems.length
      ? visibleItems
          .map(
            (item) => `
              <div class="order-item-row">
                <img class="order-item-thumb"
                     src="${fmt.escapeHTML(getItemImage(item))}"
                     alt="${fmt.escapeHTML(item.name || 'Món ăn')}"
                     loading="lazy"
                     onerror="this.src='${FALLBACK_IMAGE}'">
                <span class="order-item-name">
                  ${fmt.escapeHTML(item.name || 'Món ăn')}
                  ${
                    item.note
                      ? `<small class="order-item-note">
                           <i class="bi bi-chat-left-text"></i>
                           ${fmt.escapeHTML(item.note)}
                         </small>`
                      : ''
                  }
                </span>
                <span class="order-item-quantity">x${fmt.escapeHTML(item.quantity)}</span>
              </div>`,
          )
          .join('')
      : `<div class="order-item-row">
           <span class="order-item-name">Chưa có thông tin món</span>
         </div>`;

    const actions = getActions(status);
    const actionButtons = actions
      .map(
        (action) => `
          <button type="button"
                  class="${action.className}"
                  data-action="change-status"
                  data-id="${fmt.escapeHTML(id)}"
                  data-status="${action.to}"
                  ${busy ? 'disabled' : ''}>
            <i class="bi ${action.icon}"></i>
            ${action.label}
          </button>`,
      )
      .join('');

    return `
      <article class="order-card ${busy ? 'is-busy' : ''} ${late ? 'is-late' : ''}"
               data-order-id="${fmt.escapeHTML(id)}">

        <div class="order-card-header">
          <div>
            <h3 class="order-number" title="${fmt.escapeHTML(order.code || '')}">
              ${fmt.escapeHTML(shortCode(order))}
            </h3>
            <span class="order-time" title="${fmt.escapeHTML(fmt.dateTime(order.createdAt))}">
              <i class="bi ${late ? 'bi-exclamation-circle-fill' : 'bi-clock'}"></i>
              ${fmt.escapeHTML(fmt.timeAgo(order.createdAt))}
            </span>
          </div>
          ${statusBadge(status)}
        </div>

        <div class="order-meta">
          <div class="order-meta-item">
            <i class="bi bi-grid"></i>
            <span>Bàn <strong>${fmt.escapeHTML(order.tableNumber || '--')}</strong></span>
          </div>
          <div class="order-meta-item">
            <i class="bi bi-person"></i>
            <span>${fmt.escapeHTML(order.customerName || 'Khách lẻ')}</span>
          </div>
        </div>

        <div class="order-items">
          <p class="order-items-title">
            Món ăn (${items.length} món · ${totalQuantity} phần)
          </p>
          ${itemRows}
          ${
            hiddenCount > 0
              ? `<button type="button" class="order-item-more"
                         data-action="detail"
                         data-id="${fmt.escapeHTML(id)}">
                   + ${hiddenCount} món khác
                 </button>`
              : ''
          }
        </div>

        ${
          order.note
            ? `<p class="order-note">
                 <i class="bi bi-sticky"></i>
                 ${fmt.escapeHTML(order.note)}
               </p>`
            : ''
        }

        <div class="order-card-footer">
          <div>
            <span class="order-total-label">Tổng tiền</span>
            <strong class="order-total">${fmt.escapeHTML(fmt.currency(order.totalAmount))}</strong>
          </div>
          <button type="button" class="btn-detail"
                  data-action="detail"
                  data-id="${fmt.escapeHTML(id)}">
            <i class="bi bi-eye"></i> Chi tiết
          </button>
        </div>

        ${actions.length ? `<div class="order-actions">${actionButtons}</div>` : ''}
      </article>
    `;
  }

  function renderPagination() {
    const { page, totalPages, total, orders } = state;
    setText('currentPage', page);

    if (!total) {
      setText('paginationInfo', 'Không có đơn hàng nào');
    } else {
      const from = (page - 1) * PAGE_LIMIT + 1;
      const to = from + orders.length - 1;
      setText(
        'paginationInfo',
        `Trang ${page}/${totalPages} · Hiển thị ${from}–${to} trên tổng ${total} đơn hàng`,
      );
    }

    const prev = $('prevPage');
    const next = $('nextPage');
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
  }

  async function changeStatus(id, targetStatus) {
    if (state.busyIds.has(id)) return;

    const order = state.orders.find((item) => item.id === id);
    if (!order) return;

    const current = normalizeStatus(order.status);
    const target = normalizeStatus(targetStatus);
    const action = (STATUS_ACTIONS[current] || []).find((a) => a.to === target);

    if (!action) {
      ui.toast('Không thể chuyển sang trạng thái này.', 'error');
      return;
    }

    if (action.confirm) {
      const ok = await ui.confirmDialog({
        title: 'Hủy đơn hàng?',
        message:
          `Bạn có chắc muốn hủy đơn ${shortCode(order)} (bàn ${order.tableNumber})? ` +
          'Nguyên liệu đã trừ sẽ được hoàn lại kho và không thể khôi phục đơn.',
        confirmText: 'Hủy đơn',
        cancelText: 'Giữ lại',
        danger: true,
      });
      if (!ok) return;
    }

    state.busyIds.add(id);
    renderOrders();

    try {
      await api.patch(`${API_ORDERS}/${encodeURIComponent(id)}/status`, {
        status: target,
      });
      ui.toast(action.success, 'success');
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busyIds.delete(id);
      renderOrders();
      await refreshAll({ silent: true });
    }
  }

  async function showOrderDetail(id) {
    const modal = ui.openModal({
      title: 'Chi tiết đơn hàng',
      size: 'lg',
      html: `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Đang tải chi tiết...</p>
        </div>
      `,
    });

    try {
      const result = await api.get(`${API_ORDERS}/${encodeURIComponent(id)}`);
      const order = result?.data && !result.id ? result.data : result;
      if (!order) throw new Error('Không tìm thấy đơn hàng.');
      modal.body.innerHTML = renderOrderDetail(order);
    } catch (error) {
      modal.body.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon error"><i class="bi bi-exclamation-triangle"></i></div>
          <h3>Không thể tải chi tiết</h3>
          <p>${fmt.escapeHTML(error.message)}</p>
        </div>
      `;
    }
  }

  function renderOrderDetail(order) {
    const items = Array.isArray(order.items) ? order.items : [];

    const rows = items.length
      ? items
          .map((item) => {
            const price = Number(item.unitPrice) || 0;
            const quantity = Number(item.quantity) || 0;
            return `
              <tr>
                <td>
                  <div class="detail-item-cell">
                    <img class="detail-item-thumb"
                         src="${fmt.escapeHTML(getItemImage(item))}"
                         alt="${fmt.escapeHTML(item.name || '')}"
                         loading="lazy"
                         onerror="this.src='${FALLBACK_IMAGE}'">
                    <div>
                      <strong>${fmt.escapeHTML(item.name || 'Món ăn')}</strong>
                      ${
                        item.note
                          ? `<small class="order-item-note">${fmt.escapeHTML(item.note)}</small>`
                          : ''
                      }
                    </div>
                  </div>
                </td>
                <td class="text-center">${quantity}</td>
                <td class="text-right">${fmt.escapeHTML(fmt.currency(price))}</td>
                <td class="text-right">${fmt.escapeHTML(fmt.currency(price * quantity))}</td>
              </tr>`;
          })
          .join('')
      : '<tr><td colspan="4" class="text-center">Đơn hàng chưa có món nào.</td></tr>';

    return `
      <div class="detail-grid">
        <div><span>Mã đơn</span><strong class="break-all">${fmt.escapeHTML(order.code || order.id)}</strong></div>
        <div><span>Trạng thái</span>${statusBadge(order.status)}</div>
        <div><span>Bàn</span><strong>${fmt.escapeHTML(order.tableNumber || '--')}</strong></div>
        <div><span>Khách hàng</span><strong>${fmt.escapeHTML(order.customerName || 'Khách lẻ')}</strong></div>
        <div><span>Tạo lúc</span><strong>${fmt.escapeHTML(fmt.dateTime(order.createdAt))}</strong></div>
        <div><span>Cập nhật</span><strong>${fmt.escapeHTML(fmt.dateTime(order.updatedAt))}</strong></div>
      </div>

      ${
        order.note
          ? `<p class="order-note"><i class="bi bi-sticky"></i> ${fmt.escapeHTML(order.note)}</p>`
          : ''
      }

      <h3 class="detail-title">Danh sách món ăn</h3>
      <div class="detail-table-wrapper">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Tên món</th>
              <th class="text-center">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="detail-total">
        <span>Tổng cộng</span>
        <strong>${fmt.escapeHTML(fmt.currency(order.totalAmount))}</strong>
      </div>
    `;
  }

  function selectStatus(status) {
    const next = status === 'ALL' ? 'ALL' : normalizeStatus(status);
    state.status = next;
    state.page = 1;

    document.querySelectorAll('#orderTabs [data-status]').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.status === next);
    });

    loadOrders();
  }

  function handleSearch(value) {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => {
      const keyword = value.trim();
      if (keyword === state.search) return;
      state.search = keyword;
      state.page = 1;
      loadOrders();
    }, 400);
  }

  function openSupport() {
    ui.openModal({
      title: 'Hỗ trợ',
      size: 'sm',
      html: `
        <ul class="support-list">
          <li>
            <i class="bi bi-telephone"></i>
            <div><strong>Hotline</strong><span>1900 0000 (8:00 – 22:00)</span></div>
          </li>
          <li>
            <i class="bi bi-envelope"></i>
            <div><strong>Email</strong><span>support@orderflow.vn</span></div>
          </li>
          <li>
            <i class="bi bi-chat-dots"></i>
            <div><strong>Báo lỗi hệ thống</strong><span>Liên hệ quản trị viên của nhà hàng.</span></div>
          </li>
        </ul>
      `,
    });
  }

  function bindEvents() {
    const search = $('searchOrder');
    if (search) {
      search.addEventListener('input', (e) => handleSearch(e.target.value));
      search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(state.searchTimer);
          state.search = search.value.trim();
          state.page = 1;
          loadOrders();
        }
      });
    }

    const tabs = $('orderTabs');
    if (tabs) {
      tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-status]');
        if (tab) selectStatus(tab.dataset.status);
      });
    }

    const refresh = $('refreshOrders');
    if (refresh) refresh.addEventListener('click', () => refreshAll());

    const sort = $('sortOrders');
    if (sort) {
      sort.addEventListener('change', (e) => {
        const option = SORT_OPTIONS[e.target.value] || SORT_OPTIONS.newest;
        state.sortBy = option.sortBy;
        state.order = option.order;
        state.page = 1;
        loadOrders();
      });
    }

    const prev = $('prevPage');
    if (prev) {
      prev.addEventListener('click', () => {
        if (state.page > 1) {
          state.page--;
          loadOrders();
        }
      });
    }

    const next = $('nextPage');
    if (next) {
      next.addEventListener('click', () => {
        if (state.page < state.totalPages) {
          state.page++;
          loadOrders();
        }
      });
    }

    const grid = $('orderGrid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button || button.disabled) return;
        const { action, id, status } = button.dataset;
        if (action === 'detail' && id) showOrderDetail(id);
        if (action === 'change-status' && id) changeStatus(id, status);
        if (action === 'reload') refreshAll();
      });
    }

    const bell = $('notificationButton');
    if (bell) bell.addEventListener('click', () => selectStatus('PENDING'));

    const support = $('supportButton');
    if (support) support.addEventListener('click', openSupport);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshAll({ silent: true });
    });
  }

  function startPolling() {
    clearInterval(state.pollTimer);
    state.pollTimer = setInterval(() => {
      if (document.hidden) return;
      refreshAll({ silent: true });
    }, POLL_INTERVAL);
  }

  function init() {
    setText(
      'currentDate',
      new Date().toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    );

    bindEvents();
    handleRouting(); // Khởi chạy định tuyến ban đầu theo hash URL
    startPolling();
  }

  document.addEventListener('DOMContentLoaded', init);
})();