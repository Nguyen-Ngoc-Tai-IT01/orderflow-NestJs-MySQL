/* =====================================================
   ORDERFLOW - TRANG CÀI ĐẶT
   File: public/js/settings.js
   Backend không có API cài đặt, nên các tùy chọn được lưu
   trong localStorage của trình duyệt (OF.settings).
   Trang này cũng có công cụ kiểm tra kết nối API.
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, settings } = window.OF;
  const h = fmt.escapeHTML;

  const $ = (id) => document.getElementById(id);

  const CHECKS = [
    { name: 'Đơn hàng', url: '/orders', query: { page: 1, limit: 1 } },
    { name: 'Thực đơn', url: '/menu' },
    { name: 'Kho hàng', url: '/inventory' },
    { name: 'Bàn ăn & đặt bàn', url: '/tables' },
    { name: 'Nhân viên', url: '/users' },
    { name: 'Báo cáo: doanh thu', url: '/reports/revenue' },
    { name: 'Báo cáo: món bán chạy', url: '/reports/top-items', query: { limit: 1 } },
  ];

  function showError(form, message) {
    const box = form.querySelector('[data-error]');
    box.textContent = message || '';
    box.hidden = !message;
  }

  function fillForms() {
    const s = settings.get();

    [$('dashboardForm'), $('restaurantForm')].forEach((form) => {
      Array.from(form.elements).forEach((field) => {
        if (field.name && field.name in s) field.value = s[field.name];
      });
    });
  }

  function intInRange(value, min, max, label) {
    const number = Number(value);

    if (!Number.isInteger(number) || number < min || number > max) {
      throw new Error(`${label} phải là số nguyên từ ${min} đến ${max}.`);
    }

    return number;
  }

  /* ---------------- Lưu cài đặt ---------------- */
  function bindForms() {
    $('dashboardForm').addEventListener('submit', (event) => {
      event.preventDefault();

      const form = event.target;
      showError(form, '');

      try {
        settings.set({
          orderPageSize: intInRange(form.elements.orderPageSize.value, 3, 48, 'Số đơn mỗi trang'),
          pollSeconds: intInRange(form.elements.pollSeconds.value, 5, 300, 'Thời gian tự làm mới'),
          lateMinutes: intInRange(form.elements.lateMinutes.value, 1, 240, 'Thời gian cảnh báo đơn trễ'),
        });

        ui.toast('Đã lưu cài đặt bảng điều khiển.');
      } catch (error) {
        showError(form, error.message);
      }
    });

    $('restaurantForm').addEventListener('submit', (event) => {
      event.preventDefault();

      const form = event.target;
      showError(form, '');

      try {
        const restaurantName = form.elements.restaurantName.value.trim();
        const email = form.elements.email.value.trim();

        if (!restaurantName) throw new Error('Vui lòng nhập tên nhà hàng.');

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Email không hợp lệ.');
        }

        settings.set({
          reservationHoldMinutes: intInRange(form.elements.reservationHoldMinutes.value, 0, 180, 'Thời gian giữ bàn'),
          restaurantName,
          hotline: form.elements.hotline.value.trim(),
          openHours: form.elements.openHours.value.trim(),
          email,
        });

        // Cập nhật tên thương hiệu trên thanh bên ngay lập tức
        const brand = document.querySelector('.brand-text h2');
        if (brand) brand.textContent = restaurantName;

        ui.toast('Đã lưu thông tin nhà hàng.');
      } catch (error) {
        showError(form, error.message);
      }
    });

    $('resetSettings').addEventListener('click', async () => {
      const ok = await ui.confirmDialog({
        title: 'Khôi phục mặc định?',
        message: 'Tất cả cài đặt trên trình duyệt này sẽ trở về giá trị ban đầu.',
        confirmText: 'Khôi phục',
      });

      if (!ok) return;

      settings.reset();
      fillForms();

      const brand = document.querySelector('.brand-text h2');
      if (brand) brand.textContent = settings.get().restaurantName;

      ui.toast('Đã khôi phục cài đặt mặc định.');
    });
  }

  /* ---------------- Kiểm tra kết nối API ---------------- */
  function resultCell(result) {
    if (result.ok) return '<span class="pg-badge pg-badge-success">Hoạt động</span>';

    if (result.status === 401) {
      return `<span class="pg-badge pg-badge-warning">Yêu cầu đăng nhập</span>
              <div class="pg-muted" style="font-size:10px;margin-top:4px">Gỡ @UseGuards(JwtAuthGuard) ở controller này</div>`;
    }

    if (result.status === 0) {
      return '<span class="pg-badge pg-badge-danger">Không kết nối được</span>';
    }

    return `<span class="pg-badge pg-badge-danger">Lỗi ${result.status || ''}</span>
            <div class="pg-muted" style="font-size:10px;margin-top:4px">${h(result.message)}</div>`;
  }

  async function runCheck() {
    const body = $('checkBody');
    const button = $('runCheck');

    button.disabled = true;

    body.innerHTML = CHECKS.map(
      (check) => `
        <tr>
          <td><strong>${h(check.name)}</strong></td>
          <td><code>GET ${h(check.url)}</code></td>
          <td class="pg-muted">Đang kiểm tra...</td>
          <td class="num">--</td>
        </tr>`,
    ).join('');

    const results = await Promise.all(
      CHECKS.map(async (check) => {
        const started = performance.now();

        try {
          await http.get(check.url, check.query);
          return { ok: true, ms: performance.now() - started };
        } catch (error) {
          return {
            ok: false,
            status: error.status,
            message: error.message,
            ms: performance.now() - started,
          };
        }
      }),
    );

    body.innerHTML = CHECKS.map(
      (check, index) => `
        <tr>
          <td><strong>${h(check.name)}</strong></td>
          <td><code>GET ${h(check.url)}</code></td>
          <td>${resultCell(results[index])}</td>
          <td class="num pg-muted">${Math.round(results[index].ms)} ms</td>
        </tr>`,
    ).join('');

    const failed = results.filter((r) => !r.ok).length;

    ui.toast(
      failed ? `${failed}/${CHECKS.length} API chưa hoạt động.` : 'Tất cả API hoạt động bình thường.',
      failed ? 'warning' : 'success',
    );

    button.disabled = false;
  }

  fillForms();
  bindForms();

  $('runCheck').addEventListener('click', runCheck);
  runCheck();
})();
