/* =====================================================
   ORDERFLOW - THƯ VIỆN DÙNG CHUNG CHO FRONTEND
   File: public/js/common.js
   Gồm: xác thực JWT, gọi API, toast, modal, định dạng.
   Hiệp có thể dùng lại file này cho các trang khác.
   ===================================================== */
(function (global) {
  'use strict';

  const TOKEN_KEY = 'orderflow_token';
  const LOGIN_PAGE = '/login.html';

  /* ---------------- HẰNG SỐ TRẠNG THÁI ---------------- */
  // Giá trị PHẢI trùng với enum OrderStatus ở backend
  // (src/modules/orders/entities/order.entity.ts)
  const ORDER_STATUS = {
    PENDING: 'PENDING',
    PREPARING: 'PREPARING',
    READY: 'READY',
    SERVED: 'SERVED',
    CANCELLED: 'CANCELLED', // 2 chữ L
  };

  const ORDER_STATUS_LABEL = {
    PENDING: 'Chờ xác nhận',
    PREPARING: 'Đang chế biến',
    READY: 'Sẵn sàng',
    SERVED: 'Đã phục vụ',
    CANCELLED: 'Đã hủy',
  };

  function normalizeStatus(status) {
    const value = String(status || '').trim().toUpperCase();
    return value === 'CANCELED' ? 'CANCELLED' : value;
  }

  /* ---------------- XÁC THỰC ---------------- */
  const auth = {
    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },

    setToken(token) {
      localStorage.setItem(TOKEN_KEY, token);
    },

    clear() {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* bỏ qua */
      }
    },

    // Giải mã payload JWT: { sub, username, role, iat, exp }
    parseToken(token) {
      const raw = token || auth.getToken();
      if (!raw) return null;

      try {
        const base64 = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
        );
        return JSON.parse(json);
      } catch {
        return null;
      }
    },

    isValid() {
      const payload = auth.parseToken();
      if (!payload) return false;
      if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
      return true;
    },

    getUser() {
      const payload = auth.parseToken();
      if (!payload) return null;
      return {
        id: payload.sub,
        username: payload.username,
        role: payload.role,
      };
    },

    redirectToLogin() {
      auth.clear();
      const next = location.pathname + location.search;
      location.replace(`${LOGIN_PAGE}?next=${encodeURIComponent(next)}`);
    },

    // Gọi ở đầu mỗi trang cần đăng nhập
    requireLogin() {
      if (auth.isValid()) return true;
      auth.redirectToLogin();
      return false;
    },

    logout() {
      auth.clear();
      location.replace(LOGIN_PAGE);
    },
  };

  /* ---------------- GỌI API ---------------- */
  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  async function request(url, options = {}) {
    const { skipAuthRedirect, body, headers: extraHeaders, ...rest } = options;

    const headers = { Accept: 'application/json', ...(extraHeaders || {}) };

    const token = auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload = body;
    if (payload !== undefined && typeof payload !== 'string') {
      payload = JSON.stringify(payload);
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(url, { ...rest, headers, body: payload });
    } catch {
      throw new ApiError(
        'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc server.',
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

    if (response.status === 401 && !skipAuthRedirect) {
      auth.redirectToLogin();
      throw new ApiError('Phiên đăng nhập đã hết hạn.', 401, data);
    }

    if (!response.ok) {
      let message =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        (response.status === 403
          ? 'Bạn không có quyền thực hiện hành động này.'
          : `Lỗi máy chủ (${response.status})`);

      if (Array.isArray(message)) message = message.join('. ');
      throw new ApiError(message, response.status, data);
    }

    return data;
  }

  const api = {
    request,
    get: (url, options) => request(url, { ...options, method: 'GET' }),
    post: (url, body, options) =>
      request(url, { ...options, method: 'POST', body }),
    patch: (url, body, options) =>
      request(url, { ...options, method: 'PATCH', body }),
    delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
  };

  /* ---------------- ĐỊNH DẠNG ---------------- */
  const fmt = {
    escapeHTML(value) {
      return String(value ?? '').replace(/[&<>"']/g, (c) => {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        }[c];
      });
    },

    currency(value) {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(value) || 0);
    },

    dateTime(value) {
      if (!value) return '--';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '--';

      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    },

    timeAgo(value) {
      if (!value) return '--';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '--';

      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return 'Vừa xong';

      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} phút trước`;

      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} giờ trước`;

      return fmt.dateTime(value);
    },
  };

  /* ---------------- TOAST ---------------- */
  const TOAST_ICON = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    info: 'bi-info-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
  };

  function toast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toastContainer');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const element = document.createElement('div');
    element.className = `toast toast-${type}`;
    element.setAttribute('role', type === 'error' ? 'alert' : 'status');
    element.innerHTML = `
      <i class="bi ${TOAST_ICON[type] || TOAST_ICON.info}"></i>
      <span>${fmt.escapeHTML(message)}</span>
    `;

    container.appendChild(element);

    const remove = () => {
      element.classList.add('leaving');
      setTimeout(() => element.remove(), 250);
    };

    setTimeout(remove, duration);
    element.addEventListener('click', remove);
  }

  /* ---------------- MODAL ---------------- */
  const modalStack = [];

  function openModal({ title = '', html = '', footerHTML = '', size = '', onClose } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'of-modal';

    overlay.innerHTML = `
      <div class="of-modal-dialog ${size ? `of-modal-${size}` : ''}"
           role="dialog" aria-modal="true">
        <div class="of-modal-header">
          <h2>${fmt.escapeHTML(title)}</h2>
          <button type="button" class="of-modal-close" aria-label="Đóng">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="of-modal-body">${html}</div>
        ${footerHTML ? `<div class="of-modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;

    let closed = false;

    const modal = {
      el: overlay,
      body: overlay.querySelector('.of-modal-body'),
      footer: overlay.querySelector('.of-modal-footer'),
      close() {
        if (closed) return;
        closed = true;

        const index = modalStack.indexOf(modal);
        if (index >= 0) modalStack.splice(index, 1);

        overlay.remove();
        if (!modalStack.length) document.body.classList.remove('modal-open');
        if (typeof onClose === 'function') onClose();
      },
    };

    overlay.addEventListener('mousedown', (event) => {
      if (event.target === overlay) modal.close();
    });

    overlay
      .querySelector('.of-modal-close')
      .addEventListener('click', () => modal.close());

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    modalStack.push(modal);

    return modal;
  }

  // ESC đóng modal trên cùng
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalStack.length) {
      modalStack[modalStack.length - 1].close();
    }
  });

  function confirmDialog({
    title = 'Xác nhận',
    message = '',
    confirmText = 'Đồng ý',
    cancelText = 'Hủy bỏ',
    danger = false,
  } = {}) {
    return new Promise((resolve) => {
      let result = false;

      const modal = openModal({
        title,
        size: 'sm',
        html: `<p class="of-confirm-message">${fmt.escapeHTML(message)}</p>`,
        footerHTML: `
          <button type="button" class="of-btn of-btn-ghost" data-confirm="no">
            ${fmt.escapeHTML(cancelText)}
          </button>
          <button type="button"
                  class="of-btn ${danger ? 'of-btn-danger' : 'of-btn-primary'}"
                  data-confirm="yes">
            ${fmt.escapeHTML(confirmText)}
          </button>
        `,
        onClose: () => resolve(result),
      });

      modal.footer.addEventListener('click', (event) => {
        const button = event.target.closest('[data-confirm]');
        if (!button) return;
        result = button.dataset.confirm === 'yes';
        modal.close();
      });

      const yes = modal.footer.querySelector('[data-confirm="yes"]');
      if (yes) yes.focus();
    });
  }

  global.OF = {
    ORDER_STATUS,
    ORDER_STATUS_LABEL,
    normalizeStatus,
    auth,
    api,
    ApiError,
    fmt,
    ui: { toast, openModal, confirmDialog },
  };
})(window);