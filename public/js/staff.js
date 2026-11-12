/* =====================================================
   ORDERFLOW - TRANG NHÂN VIÊN
   File: public/js/staff.js
   API: GET/POST /users, PATCH/DELETE /users/:id
   Trường: username, password, fullName,
           role (Admin | Chef | Waiter), isActive
   Mật khẩu chỉ được gửi lên khi tạo mới hoặc khi đổi.
   Hiển thị KHÔNG BAO GIỜ đọc trường password.
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, formModal } = window.OF;
  const h = fmt.escapeHTML;

  const ROLE_LABEL = { Admin: 'Quản trị viên', Chef: 'Đầu bếp', Waiter: 'Phục vụ' };
  const ROLE_BADGE = { Admin: 'purple', Chef: 'warning', Waiter: 'info' };
  const ROLE_AVATAR = { Admin: 'purple', Chef: 'orange', Waiter: 'blue' };

  const state = {
    users: [],
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
      const data = await http.get('/users');
      state.users = Array.isArray(data) ? data : [];
      state.error = '';
    } catch (error) {
      if (silent) return;
      state.users = [];
      state.error = error.message;
    } finally {
      if (!silent) util.setLoading(false);
    }

    render();
  }

  const activeAdmins = () =>
    state.users.filter((u) => u.role === 'Admin' && u.isActive !== false);

  /* ---------------- Hiển thị ---------------- */
  function filtered() {
    const keyword = util.normalize(state.search);

    return state.users
      .filter((user) => {
        if (state.tab !== 'ALL' && user.role !== state.tab) return false;
        if (!keyword) return true;

        return [user.fullName, user.username]
          .map(util.normalize)
          .some((value) => value.includes(keyword));
      })
      .sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), 'vi'));
  }

  function renderStats() {
    const count = (role) => state.users.filter((u) => u.role === role).length;

    $('statTotal').textContent = state.users.length;
    $('statAdmin').textContent = count('Admin');
    $('statChef').textContent = count('Chef');
    $('statWaiter').textContent = count('Waiter');

    $('countAll').textContent = state.users.length;
    $('countAdmin').textContent = count('Admin');
    $('countChef').textContent = count('Chef');
    $('countWaiter').textContent = count('Waiter');
  }

  function renderRow(user) {
    const id = h(user.id);
    const active = user.isActive !== false;
    const disabled = state.busy.has(user.id) ? 'disabled' : '';

    return `
      <tr>
        <td>
          <div class="pg-cell-main">
            <div class="pg-avatar ${ROLE_AVATAR[user.role] || ''}">${h(util.initial(user.fullName || user.username))}</div>
            <div>
              <strong>${h(user.fullName || '--')}</strong>
              <small>${h(ROLE_LABEL[user.role] || user.role)}</small>
            </div>
          </div>
        </td>
        <td><code>${h(user.username)}</code></td>
        <td><span class="pg-badge pg-badge-${ROLE_BADGE[user.role] || 'muted'}">${h(ROLE_LABEL[user.role] || user.role)}</span></td>
        <td>
          <span class="pg-badge ${active ? 'pg-badge-success' : 'pg-badge-muted'}">
            ${active ? 'Đang làm việc' : 'Tạm khóa'}
          </span>
        </td>
        <td class="pg-muted">${h(util.date(user.createdAt))}</td>
        <td>
          <div class="pg-row-actions">
            <button type="button" class="pg-icon-btn" data-action="toggle" data-id="${id}"
                    title="${active ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}"
                    aria-label="${active ? 'Tạm khóa' : 'Mở khóa'}" ${disabled}>
              <i class="bi ${active ? 'bi-lock' : 'bi-unlock'}"></i>
            </button>
            <button type="button" class="pg-icon-btn" data-action="edit" data-id="${id}"
                    title="Sửa thông tin" aria-label="Sửa thông tin" ${disabled}>
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="pg-icon-btn danger" data-action="delete" data-id="${id}"
                    title="Xóa nhân viên" aria-label="Xóa nhân viên" ${disabled}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function render() {
    renderStats();

    const body = $('staffBody');
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
        filtering ? 'Không tìm thấy nhân viên' : 'Chưa có nhân viên',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Bấm "Thêm nhân viên" để tạo tài khoản đầu tiên.',
        'bi-people',
      )}</td></tr>`;
      footer.textContent = '';
      return;
    }

    body.innerHTML = list.map(renderRow).join('');
    footer.textContent = `Hiển thị ${list.length} / ${state.users.length} nhân viên`;
  }

  /* ---------------- Form thêm / sửa ---------------- */
  function staffForm(user = null) {
    const editing = Boolean(user);

    formModal({
      title: editing ? `Sửa nhân viên: ${user.fullName || user.username}` : 'Thêm nhân viên',
      submitText: editing ? 'Lưu thay đổi' : 'Tạo tài khoản',
      html: `
        <div class="pg-form-grid">
          <label class="pg-field">
            <span>Họ và tên *</span>
            <input class="pg-input" name="fullName" maxlength="100"
                   value="${h(user?.fullName || '')}" required>
          </label>

          <label class="pg-field">
            <span>Tên đăng nhập *</span>
            <input class="pg-input" name="username" maxlength="50" autocomplete="off"
                   value="${h(user?.username || '')}" ${editing ? 'readonly' : ''} required>
            <small>${editing ? 'Không thể đổi tên đăng nhập.' : '3–50 ký tự: chữ, số, dấu chấm, gạch dưới.'}</small>
          </label>

          <label class="pg-field">
            <span>Vai trò *</span>
            <select class="pg-select" name="role">
              ${Object.entries(ROLE_LABEL)
                .map(
                  ([value, label]) =>
                    `<option value="${value}" ${(user?.role || 'Waiter') === value ? 'selected' : ''}>${label}</option>`,
                )
                .join('')}
            </select>
          </label>

          <label class="pg-field">
            <span>${editing ? 'Mật khẩu mới' : 'Mật khẩu *'}</span>
            <input class="pg-input" type="password" name="password" maxlength="50"
                   autocomplete="new-password"
                   placeholder="${editing ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}">
          </label>
        </div>

        <label class="pg-switch">
          <input type="checkbox" name="isActive" ${!user || user.isActive !== false ? 'checked' : ''}>
          <span class="pg-switch-track"></span>
          <span>Cho phép đăng nhập</span>
        </label>`,

      async onSubmit(form) {
        const data = new FormData(form);
        const fullName = String(data.get('fullName') || '').trim();
        const username = String(data.get('username') || '').trim();
        const role = data.get('role');
        const password = String(data.get('password') || '');
        const isActive = form.elements.isActive.checked;

        if (!fullName) throw new Error('Vui lòng nhập họ và tên.');

        if (!editing) {
          if (!/^[A-Za-z0-9._]{3,50}$/.test(username)) {
            throw new Error('Tên đăng nhập 3–50 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới.');
          }

          if (state.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error(`Tên đăng nhập "${username}" đã tồn tại.`);
          }

          if (password.length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.');
        } else if (password && password.length < 6) {
          throw new Error('Mật khẩu mới tối thiểu 6 ký tự.');
        }

        // Luôn giữ ít nhất 1 quản trị viên đang hoạt động
        if (editing && user.role === 'Admin' && user.isActive !== false) {
          const losingAdmin = role !== 'Admin' || !isActive;

          if (losingAdmin && activeAdmins().length <= 1) {
            throw new Error('Hệ thống cần ít nhất 1 quản trị viên đang hoạt động.');
          }
        }

        if (editing) {
          const body = { fullName, role, isActive };
          if (password) body.password = password;

          await http.patch(`/users/${encodeURIComponent(user.id)}`, body);
          ui.toast('Đã cập nhật nhân viên.');
        } else {
          await http.post('/users', { username, password, fullName, role, isActive });
          ui.toast(`Đã tạo tài khoản "${username}".`);
        }

        await load({ silent: true });
      },
    });
  }

  /* ---------------- Khóa / xóa ---------------- */
  async function toggleActive(user) {
    const next = user.isActive === false;

    if (!next && user.role === 'Admin' && activeAdmins().length <= 1) {
      ui.toast('Hệ thống cần ít nhất 1 quản trị viên đang hoạt động.', 'warning');
      return;
    }

    if (!next) {
      const ok = await ui.confirmDialog({
        title: 'Tạm khóa tài khoản?',
        message: `"${user.fullName || user.username}" sẽ không thể đăng nhập cho tới khi được mở khóa.`,
        confirmText: 'Tạm khóa',
      });

      if (!ok) return;
    }

    state.busy.add(user.id);
    render();

    try {
      await http.patch(`/users/${encodeURIComponent(user.id)}`, { isActive: next });
      ui.toast(next ? 'Đã mở khóa tài khoản.' : 'Đã tạm khóa tài khoản.');
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busy.delete(user.id);
      await load({ silent: true });
    }
  }

  async function removeUser(user) {
    if (user.role === 'Admin' && user.isActive !== false && activeAdmins().length <= 1) {
      ui.toast('Không thể xóa quản trị viên cuối cùng.', 'warning');
      return;
    }

    const ok = await ui.confirmDialog({
      title: 'Xóa nhân viên?',
      message: `Xóa vĩnh viễn tài khoản "${user.fullName || user.username}"? Thao tác này không thể hoàn tác. Nếu chỉ muốn ngừng cho đăng nhập, hãy dùng Tạm khóa.`,
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      danger: true,
    });

    if (!ok) return;

    state.busy.add(user.id);
    render();

    try {
      await http.delete(`/users/${encodeURIComponent(user.id)}`);
      ui.toast('Đã xóa nhân viên.');
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busy.delete(user.id);
      await load({ silent: true });
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

    $('refreshButton').addEventListener('click', () => load());
    $('addStaff').addEventListener('click', () => staffForm());

    $('staffBody').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;

      const { action, id } = button.dataset;

      if (action === 'reload') return load();

      const user = state.users.find((u) => u.id === id);
      if (!user) return;

      if (action === 'edit') staffForm(user);
      if (action === 'toggle') toggleActive(user);
      if (action === 'delete') removeUser(user);
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });
  }

  bind();
  load();
})();
