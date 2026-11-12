/* =====================================================
   ORDERFLOW - THƯ VIỆN DÙNG CHUNG CHO CÁC TRANG PHỤ
   File: public/js/pages-common.js
   Yêu cầu: nạp /js/common.js TRƯỚC file này.
   Cung cấp (gắn vào window.OF):
     OF.http      - gọi API (get/post/patch/put/delete/upload)
     OF.util      - hàm tiện ích (debounce, định dạng, ngày giờ...)
     OF.settings  - cài đặt lưu ở localStorage
     OF.formModal - hộp thoại form có kiểm tra + báo lỗi
     OF.reservationModal - form đặt bàn dùng chung
     OF.layout    - dựng Sidebar + Header cho trang phụ
   ===================================================== */
(function (global) {
  'use strict';

  const OF = global.OF;

  if (!OF || !OF.fmt || !OF.ui) {
    console.error('Cần nạp /js/common.js trước /js/pages-common.js');
    return;
  }

  const { fmt, ui } = OF;
  const h = fmt.escapeHTML;

  /* =====================================================
     1. GỌI API (không dùng đăng nhập)
     ===================================================== */
  class HttpError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'HttpError';
      this.status = status;
      this.data = data;
    }
  }

  function buildUrl(url, query) {
    if (!query) return url;

    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    });

    const text = params.toString();
    if (!text) return url;

    return url + (url.includes('?') ? '&' : '?') + text;
  }

  async function request(url, { method = 'GET', body, query } = {}) {
    const headers = { Accept: 'application/json' };
    let payload;

    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body; // trình duyệt tự gắn Content-Type + boundary
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(buildUrl(url, query), {
        method,
        headers,
        body: payload,
      });
    } catch {
      throw new HttpError(
        'Không thể kết nối tới máy chủ. Hãy kiểm tra backend đã chạy chưa.',
        0,
      );
    }

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      let message = data && typeof data === 'object' ? data.message : '';

      if (Array.isArray(message)) message = message.join('. ');

      if (response.status === 401) {
        message =
          'API này đang yêu cầu đăng nhập (JwtAuthGuard). ' +
          'Hãy gỡ @UseGuards(JwtAuthGuard) ở controller tương ứng khi chạy môi trường phát triển.';
      } else if (response.status === 403) {
        message = 'Bạn không có quyền thực hiện thao tác này.';
      } else if (
        response.status >= 500 &&
        (!message || message === 'Internal server error')
      ) {
        message =
          'Máy chủ gặp lỗi khi xử lý (thường do dữ liệu bị trùng hoặc vi phạm ràng buộc cơ sở dữ liệu).';
      } else if (!message) {
        message = `Lỗi ${response.status}`;
      }

      throw new HttpError(message, response.status, data);
    }

    return data;
  }

  const http = {
    request,
    get: (url, query) => request(url, { method: 'GET', query }),
    post: (url, body) => request(url, { method: 'POST', body }),
    patch: (url, body) => request(url, { method: 'PATCH', body }),
    put: (url, body) => request(url, { method: 'PUT', body }),
    delete: (url) => request(url, { method: 'DELETE' }),
    upload: (url, formData) =>
      request(url, { method: 'POST', body: formData }),
    HttpError,
  };

  /* =====================================================
     2. TIỆN ÍCH
     ===================================================== */
  const PLACEHOLDER_IMG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">' +
        '<rect width="400" height="300" fill="#eef2ef"/>' +
        '<rect x="150" y="95" width="100" height="100" rx="16" fill="#fff" opacity=".8"/>' +
        '<circle cx="178" cy="128" r="10" fill="#c3cfc7"/>' +
        '<path d="M158 185l28-36 20 24 14-15 24 27z" fill="#c3cfc7"/></svg>',
    );

  const pad = (n) => String(n).padStart(2, '0');

  const util = {
    PLACEHOLDER_IMG,

    $: (selector, root = document) => root.querySelector(selector),
    $$: (selector, root = document) => Array.from(root.querySelectorAll(selector)),

    debounce(fn, wait = 250) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
      };
    },

    // Bỏ dấu + chữ thường để tìm kiếm tiếng Việt dễ hơn
    normalize(value) {
      return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .trim();
    },

    number(value) {
      return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
    },

    // Số lượng kho: tối đa 3 chữ số thập phân
    qty(value) {
      return new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 3,
      }).format(Number(value) || 0);
    },

    // Kiểm tra số có không quá `max` chữ số thập phân
    hasMaxDecimals(value, max = 3) {
      const factor = 10 ** max;
      return Math.abs(Math.round(value * factor) - value * factor) < 1e-6;
    },

    initial(name) {
      const text = String(name || '?').trim();
      return (text.split(/\s+/).pop() || '?').charAt(0).toUpperCase();
    },

    shortId(id) {
      return String(id || '').slice(0, 8).toUpperCase();
    },

    // Ngày dạng yyyy-mm-dd theo giờ máy (không lệch múi giờ)
    ymd(date = new Date()) {
      const d = new Date(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },

    // Giá trị cho <input type="datetime-local">
    toDatetimeLocal(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '';
      return `${this.ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    // Gợi ý giờ đặt bàn: 1 tiếng sau, làm tròn 15 phút
    defaultReservationTime() {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
      return this.toDatetimeLocal(d);
    },

    time(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '--';
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    date(date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '--';
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    },

    // Chuẩn hóa link ảnh: http(s) hoặc đường dẫn nội bộ, còn lại -> placeholder
    imageSrc(url) {
      const value = String(url || '').trim();
      if (/^https?:\/\//i.test(value) || /^\/[^/]/.test(value)) return value;
      return PLACEHOLDER_IMG;
    },

    // Đăng ký nhận từ khóa từ ô tìm kiếm ở header
    onSearch(handler) {
      document.addEventListener('of:search', (event) =>
        handler(String(event.detail?.query || '')),
      );
    },

    // Tải file CSV (có BOM để Excel đọc đúng tiếng Việt)
    downloadCsv(filename, rows) {
      const escape = (cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
      const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
      const blob = new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8;',
      });
      const link = document.createElement('a');

      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },

    setLoading(isLoading) {
      const loading = document.getElementById('pageLoading');
      const refresh = document.getElementById('refreshButton');

      if (loading) loading.hidden = !isLoading;
      if (refresh) {
        refresh.disabled = isLoading;
        refresh.classList.toggle('spinning', isLoading);
      }
    },

    errorState(message, retryAction = 'reload') {
      return `
        <div class="empty-state">
          <div class="empty-icon error"><i class="bi bi-wifi-off"></i></div>
          <h3>Không thể tải dữ liệu</h3>
          <p>${h(message)}</p>
          <button type="button" class="of-btn of-btn-primary" data-action="${retryAction}">
            <i class="bi bi-arrow-clockwise"></i> Thử lại
          </button>
        </div>`;
    },

    emptyState(title, text, icon = 'bi-inbox') {
      return `
        <div class="empty-state">
          <div class="empty-icon"><i class="bi ${icon}"></i></div>
          <h3>${h(title)}</h3>
          <p>${h(text)}</p>
        </div>`;
    },
  };

  /* =====================================================
     3. CÀI ĐẶT (localStorage)
     ===================================================== */
  const SETTINGS_KEY = 'orderflow_settings';

  const DEFAULT_SETTINGS = {
    orderPageSize: 9,
    pollSeconds: 15,
    lateMinutes: 15,
    reservationHoldMinutes: 15,
    restaurantName: 'OrderFlow',
    hotline: '1900 0000',
    email: 'support@orderflow.vn',
    openHours: '8:00 – 22:00',
  };

  const settings = {
    DEFAULTS: DEFAULT_SETTINGS,

    get() {
      try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        return { ...DEFAULT_SETTINGS, ...stored };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },

    set(patch) {
      const next = { ...settings.get(), ...patch };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    },

    reset() {
      try {
        localStorage.removeItem(SETTINGS_KEY);
      } catch {
        /* bỏ qua */
      }
      return { ...DEFAULT_SETTINGS };
    },
  };

  /* =====================================================
     4. HỘP THOẠI FORM
     ===================================================== */
  function formModal({
    title,
    size = '',
    html,
    submitText = 'Lưu',
    cancelText = 'Hủy',
    danger = false,
    onSubmit,
  }) {
    const formId = 'form' + Math.random().toString(36).slice(2, 9);

    const modal = ui.openModal({
      title,
      size,
      html: `<form id="${formId}" class="pg-form" novalidate>
               ${html}
               <div class="pg-form-error" role="alert" hidden></div>
             </form>`,
      footerHTML: `
        <button type="button" class="of-btn of-btn-ghost" data-cancel>${h(cancelText)}</button>
        <button type="submit" form="${formId}"
                class="of-btn ${danger ? 'of-btn-danger' : 'of-btn-primary'}"
                data-submit>${h(submitText)}</button>`,
    });

    const form = modal.body.querySelector('form');
    const errorBox = form.querySelector('.pg-form-error');
    const submitButton = modal.footer.querySelector('[data-submit]');

    const showError = (message) => {
      errorBox.textContent = message || '';
      errorBox.hidden = !message;
    };

    modal.footer
      .querySelector('[data-cancel]')
      .addEventListener('click', () => modal.close());

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showError('');

      const label = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Đang xử lý...';

      try {
        await onSubmit(form, { showError, modal });
        modal.close();
      } catch (error) {
        showError(error.message || 'Có lỗi xảy ra, vui lòng thử lại.');
        submitButton.disabled = false;
        submitButton.textContent = label;
      }
    });

    const first = form.querySelector(
      'input:not([type=hidden]):not([disabled]), select, textarea',
    );
    if (first) first.focus();

    return modal;
  }

  /* =====================================================
     5. FORM ĐẶT BÀN DÙNG CHUNG (trang Bàn ăn + Đặt bàn)
     POST /tables/:id/reservation
     ===================================================== */
  function reservationModal({ tables = [], table = null, onSaved }) {
    const fixed = Boolean(table);
    const current = table || {};

    const tableField = fixed
      ? `<div class="pg-note">
           <i class="bi bi-grid"></i>
           Bàn <strong>${h(table.tableNumber)}</strong> · sức chứa ${table.capacity} người
         </div>`
      : `<label class="pg-field">
           <span>Chọn bàn *</span>
           <select class="pg-select" name="tableId" required>
             ${tables
               .map(
                 (t) =>
                   `<option value="${h(t.id)}">Bàn ${h(t.tableNumber)} · ${t.capacity} chỗ</option>`,
               )
               .join('')}
           </select>
         </label>`;

    const html = `
      ${tableField}

      <div class="pg-form-grid">
        <label class="pg-field">
          <span>Tên khách *</span>
          <input class="pg-input" name="customerName" maxlength="120"
                 value="${h(current.customerName || '')}" required>
        </label>

        <label class="pg-field">
          <span>Số điện thoại</span>
          <input class="pg-input" name="customerPhone" maxlength="30"
                 inputmode="tel" value="${h(current.customerPhone || '')}">
        </label>

        <label class="pg-field">
          <span>Thời gian đến *</span>
          <input class="pg-input" type="datetime-local" name="reservationAt"
                 value="${
                   current.reservationAt
                     ? util.toDatetimeLocal(current.reservationAt)
                     : util.defaultReservationTime()
                 }" required>
        </label>

        <label class="pg-field">
          <span>Số khách *</span>
          <input class="pg-input" type="number" name="partySize"
                 min="1" max="100" step="1"
                 value="${current.partySize || 2}" required>
        </label>
      </div>

      <label class="pg-field">
        <span>Ghi chú</span>
        <textarea class="pg-textarea" name="note" maxlength="1000" rows="2"
                  placeholder="Ví dụ: cần ghế trẻ em, kỷ niệm sinh nhật...">${h(current.note || '')}</textarea>
      </label>`;

    return formModal({
      title:
        fixed && table.status === 'RESERVED'
          ? 'Sửa thông tin đặt bàn'
          : 'Đặt bàn',
      html,
      submitText: 'Xác nhận đặt bàn',
      async onSubmit(form) {
        const data = new FormData(form);

        const target = fixed
          ? table
          : tables.find((t) => t.id === data.get('tableId'));

        if (!target) throw new Error('Vui lòng chọn bàn.');

        const customerName = String(data.get('customerName') || '').trim();
        const customerPhone = String(data.get('customerPhone') || '').trim();
        const note = String(data.get('note') || '').trim();
        const partySize = Number(data.get('partySize'));
        const when = new Date(String(data.get('reservationAt') || ''));

        if (!customerName) throw new Error('Vui lòng nhập tên khách.');

        if (customerPhone && !/^[0-9+()\-.\s]{6,30}$/.test(customerPhone)) {
          throw new Error('Số điện thoại không hợp lệ.');
        }

        if (Number.isNaN(when.getTime())) {
          throw new Error('Vui lòng chọn thời gian đến.');
        }

        if (when.getTime() < Date.now() - 5 * 60 * 1000) {
          throw new Error('Thời gian đặt bàn phải ở hiện tại hoặc tương lai.');
        }

        if (!Number.isInteger(partySize) || partySize < 1) {
          throw new Error('Số khách phải là số nguyên lớn hơn 0.');
        }

        if (partySize > target.capacity) {
          throw new Error(
            `Số khách (${partySize}) vượt quá sức chứa của bàn ${target.tableNumber} (${target.capacity}).`,
          );
        }

        const body = {
          customerName,
          reservationAt: when.toISOString(),
          partySize,
        };

        if (customerPhone) body.customerPhone = customerPhone;
        if (note) body.note = note;

        await http.post(`/tables/${encodeURIComponent(target.id)}/reservation`, body);

        ui.toast(`Đã đặt bàn ${target.tableNumber} cho ${customerName}.`);

        if (typeof onSaved === 'function') await onSaved();
      },
    });
  }

  /* =====================================================
     6. KHUNG TRANG (SIDEBAR + HEADER)
     ===================================================== */
  const NAV = [
    { section: 'KHÔNG GIAN LÀM VIỆC' },
    { key: 'dashboard', href: '/', icon: 'bi-grid-1x2', label: 'Tổng quan' },
    { key: 'orders', href: '/#orderSection', icon: 'bi-receipt', label: 'Đơn hàng', badge: true },
    { key: 'tables', href: '/tables.html', icon: 'bi-grid', label: 'Bàn ăn' },
    { key: 'menu', href: '/menu.html', icon: 'bi-cup-hot', label: 'Thực đơn' },
    { key: 'inventory', href: '/inventory.html', icon: 'bi-box-seam', label: 'Kho hàng' },
    { key: 'reservations', href: '/reservations.html', icon: 'bi-calendar-check', label: 'Đặt bàn' },
    { key: 'customers', href: '/customers.html', icon: 'bi-people', label: 'Khách hàng' },
    { key: 'staff', href: '/staff.html', icon: 'bi-person-badge', label: 'Nhân viên' },
    { section: 'QUẢN LÝ', spaced: true },
    { key: 'reports', href: '/reports.html', icon: 'bi-bar-chart-line', label: 'Báo cáo' },
    { key: 'settings', href: '/settings.html', icon: 'bi-gear', label: 'Cài đặt' },
  ];

  function sidebarHTML(activeKey) {
    const items = NAV.map((item) => {
      if (item.section) {
        return `<p class="nav-heading ${item.spaced ? 'nav-heading-spaced' : ''}">${h(item.section)}</p>`;
      }

      return `
        <a href="${item.href}" class="nav-item ${item.key === activeKey ? 'active' : ''}">
          <i class="bi ${item.icon}"></i>
          <span>${h(item.label)}</span>
          ${item.badge ? '<span class="nav-badge" id="sidebarOrderCount">0</span>' : ''}
        </a>`;
    }).join('');

    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-logo"><i class="bi bi-shop"></i></div>
          <div class="brand-text">
            <h2>${h(settings.get().restaurantName)}</h2>
            <span>Quản lý nhà hàng</span>
          </div>
        </div>

        <nav class="sidebar-nav">${items}</nav>

        <div class="sidebar-bottom">
          <div class="support-card">
            <div class="support-icon"><i class="bi bi-headset"></i></div>
            <h4>Cần hỗ trợ?</h4>
            <p>Liên hệ với chúng tôi khi bạn cần giúp đỡ.</p>
            <button type="button" class="support-button" id="supportButton">Liên hệ hỗ trợ</button>
          </div>

          <div class="profile">
            <div class="profile-avatar">A</div>
            <div class="profile-info">
              <strong>Quản trị viên</strong>
              <span>Quản lý bảng điều khiển</span>
            </div>
          </div>
        </div>
      </aside>`;
  }

  function headerHTML({ title, subtitle, placeholder, showSearch }) {
    return `
      <header class="top-header">
        <div class="page-heading">
          <h1>${h(title)}</h1>
          <p>${h(subtitle)}</p>
        </div>

        <div class="header-right">
          ${
            showSearch
              ? `<div class="search-box">
                   <i class="bi bi-search"></i>
                   <input type="search" id="globalSearch" autocomplete="off"
                          placeholder="${h(placeholder)}">
                 </div>`
              : ''
          }

          <button type="button" class="header-icon" id="notificationButton"
                  title="Xem đơn đang chờ xác nhận" aria-label="Đơn đang chờ xác nhận">
            <i class="bi bi-bell"></i>
            <span class="notification-dot" id="notificationDot" hidden></span>
          </button>

          <div class="header-date">
            <i class="bi bi-calendar3"></i>
            <span>${h(
              new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }),
            )}</span>
          </div>
        </div>
      </header>`;
  }

  function openSupport() {
    const s = settings.get();

    ui.openModal({
      title: 'Hỗ trợ',
      size: 'sm',
      html: `
        <ul class="support-list">
          <li><i class="bi bi-telephone"></i><div><strong>Hotline</strong><span>${h(s.hotline)} (${h(s.openHours)})</span></div></li>
          <li><i class="bi bi-envelope"></i><div><strong>Email</strong><span>${h(s.email)}</span></div></li>
          <li><i class="bi bi-chat-dots"></i><div><strong>Báo lỗi hệ thống</strong><span>Liên hệ quản trị viên của nhà hàng.</span></div></li>
        </ul>`,
    });
  }

  async function loadPendingBadge() {
    try {
      const result = await http.get('/orders', {
        page: 1,
        limit: 1,
        status: 'PENDING',
      });

      const total = Number(result?.meta?.total || 0);
      const badge = document.getElementById('sidebarOrderCount');
      const dot = document.getElementById('notificationDot');

      if (badge) badge.textContent = total;
      if (dot) dot.hidden = !total;
    } catch {
      /* không có API đơn hàng thì bỏ qua */
    }
  }

  function renderShell() {
    const body = document.body;
    const app = document.querySelector('.app-container');
    const slot = document.getElementById('shellHeader');

    if (!app || !slot) return;

    const key = body.dataset.page || '';

    app.insertAdjacentHTML('afterbegin', sidebarHTML(key));

    slot.outerHTML = headerHTML({
      title: body.dataset.title || 'OrderFlow',
      subtitle: body.dataset.subtitle || '',
      placeholder: body.dataset.searchPlaceholder || 'Tìm kiếm...',
      showSearch: body.dataset.search !== 'off',
    });

    const support = document.getElementById('supportButton');
    if (support) support.addEventListener('click', openSupport);

    const bell = document.getElementById('notificationButton');
    if (bell) bell.addEventListener('click', () => (location.href = '/'));

    const search = document.getElementById('globalSearch');
    if (search) {
      const emit = util.debounce(() => {
        document.dispatchEvent(
          new CustomEvent('of:search', { detail: { query: search.value.trim() } }),
        );
      }, 250);

      search.addEventListener('input', emit);
    }

    loadPendingBadge();
  }

  renderShell();

  Object.assign(OF, {
    http,
    util,
    settings,
    formModal,
    reservationModal,
    layout: { renderShell, openSupport },
  });
})(window);
