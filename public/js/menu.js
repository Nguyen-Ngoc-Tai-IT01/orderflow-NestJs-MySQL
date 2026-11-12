/* =====================================================
   ORDERFLOW - TRANG THỰC ĐƠN
   File: public/js/menu.js
   API: GET/POST /menu, PATCH /menu/:id,
        POST /menu/:id/image (multipart, field "image")
   Lưu ý: DELETE /menu/:id ở backend chỉ là "ngừng bán"
   (isAvailable = false), nên trang này dùng nút Ngừng bán / Bán lại.
   ===================================================== */
(function () {
  'use strict';

  const { fmt, ui, http, util, formModal } = window.OF;
  const h = fmt.escapeHTML;

  const DEFAULT_CATEGORIES = ['Main', 'Noodles', 'Rice', 'Appetizer', 'Drink', 'Dessert'];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const state = {
    items: [],
    category: '',
    availability: '',
    search: '',
    error: '',
    busy: new Set(),
  };

  const $ = (id) => document.getElementById(id);

  /* ---------------- Tải dữ liệu ---------------- */
  async function load({ silent = false } = {}) {
    if (!silent) util.setLoading(true);

    try {
      const data = await http.get('/menu');
      state.items = Array.isArray(data) ? data : [];
      state.error = '';
    } catch (error) {
      if (silent) return;
      state.items = [];
      state.error = error.message;
    } finally {
      if (!silent) util.setLoading(false);
    }

    renderFilters();
    render();
  }

  function categories() {
    return [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, 'vi'),
    );
  }

  /* ---------------- Hiển thị ---------------- */
  function renderFilters() {
    const select = $('categoryFilter');
    const list = categories();

    select.innerHTML =
      '<option value="">Tất cả phân loại</option>' +
      list
        .map(
          (name) =>
            `<option value="${h(name)}" ${name === state.category ? 'selected' : ''}>${h(name)}</option>`,
        )
        .join('');

    // Phân loại đang lọc không còn món nào -> bỏ lọc
    if (state.category && !list.includes(state.category)) state.category = '';
  }

  function filtered() {
    const keyword = util.normalize(state.search);

    return state.items.filter((item) => {
      if (state.category && item.category !== state.category) return false;
      if (state.availability === 'on' && !item.isAvailable) return false;
      if (state.availability === 'off' && item.isAvailable) return false;
      if (!keyword) return true;

      return util.normalize(item.name).includes(keyword);
    });
  }

  function renderStats() {
    const on = state.items.filter((item) => item.isAvailable).length;

    $('statTotal').textContent = state.items.length;
    $('statOn').textContent = on;
    $('statOff').textContent = state.items.length - on;
    $('statCategories').textContent = categories().length;
  }

  function renderCard(item) {
    const id = h(item.id);
    const busy = state.busy.has(item.id) ? 'disabled' : '';

    return `
      <article class="pg-menu-card ${item.isAvailable ? '' : 'is-off'}">
        <div class="pg-menu-img">
          <img src="${h(util.imageSrc(item.imageUrl))}" alt="${h(item.name)}"
               loading="lazy" referrerpolicy="no-referrer"
               onerror="this.onerror=null;this.src='${util.PLACEHOLDER_IMG}'">
          <span class="pg-badge ${item.isAvailable ? 'pg-badge-success' : 'pg-badge-muted'}">
            ${item.isAvailable ? 'Đang bán' : 'Ngừng bán'}
          </span>
        </div>

        <div class="pg-menu-body">
          <span class="pg-menu-category">${h(item.category)}</span>
          <h3>${h(item.name)}</h3>
          <strong class="pg-menu-price">${h(fmt.currency(item.price))}</strong>

          <div class="pg-menu-actions">
            <button type="button" class="of-btn of-btn-sm of-btn-ghost"
                    data-action="edit" data-id="${id}" ${busy}>
              <i class="bi bi-pencil"></i> Sửa
            </button>
            <button type="button"
                    class="of-btn of-btn-sm ${item.isAvailable ? 'of-btn-ghost' : 'of-btn-primary'}"
                    data-action="toggle" data-id="${id}" ${busy}>
              <i class="bi ${item.isAvailable ? 'bi-slash-circle' : 'bi-arrow-counterclockwise'}"></i>
              ${item.isAvailable ? 'Ngừng bán' : 'Bán lại'}
            </button>
          </div>
        </div>
      </article>`;
  }

  function render() {
    renderStats();

    const grid = $('menuGrid');

    if (state.error) {
      grid.innerHTML = util.errorState(state.error);
      return;
    }

    const list = filtered();

    if (!list.length) {
      const filtering = state.search || state.category || state.availability;

      grid.innerHTML = util.emptyState(
        filtering ? 'Không tìm thấy món nào' : 'Thực đơn đang trống',
        filtering
          ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Bấm "Thêm món" để tạo món ăn đầu tiên.',
        'bi-cup-hot',
      );
      return;
    }

    // Gom theo phân loại khi đang xem tất cả
    if (state.category) {
      grid.innerHTML = list.map(renderCard).join('');
      return;
    }

    const groups = new Map();

    list.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });

    grid.innerHTML = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'vi'))
      .map(
        ([name, items]) =>
          `<div class="pg-group-title">${h(name)} <span>${items.length}</span></div>` +
          items.map(renderCard).join(''),
      )
      .join('');
  }

  /* ---------------- Bật / tắt bán ---------------- */
  async function toggle(item) {
    const next = !item.isAvailable;

    if (!next) {
      const ok = await ui.confirmDialog({
        title: 'Ngừng bán món?',
        message: `"${item.name}" sẽ bị ẩn khỏi thực đơn gọi món. Bạn có thể bán lại bất cứ lúc nào.`,
        confirmText: 'Ngừng bán',
      });

      if (!ok) return;
    }

    state.busy.add(item.id);
    render();

    try {
      await http.patch(`/menu/${encodeURIComponent(item.id)}`, { isAvailable: next });
      ui.toast(next ? `Đã bán lại "${item.name}".` : `Đã ngừng bán "${item.name}".`);
    } catch (error) {
      ui.toast(error.message, 'error', 5000);
    } finally {
      state.busy.delete(item.id);
      await load({ silent: true });
    }
  }

  /* ---------------- Form thêm / sửa món ---------------- */
  function menuForm(item = null) {
    const editing = Boolean(item);

    const options = [...new Set([...DEFAULT_CATEGORIES, ...categories()])];

    const modal = formModal({
      title: editing ? 'Sửa món ăn' : 'Thêm món mới',
      size: 'lg',
      submitText: editing ? 'Lưu thay đổi' : 'Thêm món',
      html: `
        <div class="pg-form-grid">
          <div class="pg-form" style="gap:14px">
            <label class="pg-field">
              <span>Tên món *</span>
              <input class="pg-input" name="name" maxlength="150"
                     value="${h(item?.name || '')}" required>
            </label>

            <label class="pg-field">
              <span>Giá bán (VNĐ) *</span>
              <input class="pg-input" type="number" name="price" min="0" step="500"
                     value="${item ? Number(item.price) : ''}" required>
            </label>

            <label class="pg-field">
              <span>Phân loại *</span>
              <input class="pg-input" name="category" maxlength="50" list="categoryList"
                     value="${h(item?.category || '')}" required>
              <datalist id="categoryList">
                ${options.map((c) => `<option value="${h(c)}">`).join('')}
              </datalist>
            </label>

            <label class="pg-switch">
              <input type="checkbox" name="isAvailable" ${!item || item.isAvailable ? 'checked' : ''}>
              <span class="pg-switch-track"></span>
              <span>Đang bán</span>
            </label>
          </div>

          <div class="pg-form" style="gap:14px">
            <img class="pg-image-preview" id="menuPreview"
                 src="${h(util.imageSrc(item?.imageUrl))}" alt="Xem trước ảnh món">

            <label class="pg-field">
              <span>Tải ảnh lên (JPG, PNG, WebP, GIF ≤ 5MB)</span>
              <input class="pg-input" type="file" name="image"
                     accept="image/jpeg,image/png,image/webp,image/gif"
                     style="padding-top:7px">
            </label>

            <label class="pg-field">
              <span>Hoặc dán link ảnh</span>
              <input class="pg-input" name="imageUrl" maxlength="2048"
                     placeholder="https://..." value="${h(item?.imageUrl || '')}">
              <small>Nếu chọn file, ảnh tải lên sẽ được dùng thay cho link.</small>
            </label>
          </div>
        </div>`,

      async onSubmit(form) {
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const category = String(data.get('category') || '').trim();
        const imageUrl = String(data.get('imageUrl') || '').trim();
        const price = Number(data.get('price'));
        const file = data.get('image');
        const isAvailable = form.elements.isAvailable.checked;

        if (!name) throw new Error('Vui lòng nhập tên món.');
        if (!category) throw new Error('Vui lòng nhập phân loại.');

        if (data.get('price') === '' || !Number.isFinite(price) || price < 0) {
          throw new Error('Giá bán phải là số không âm.');
        }

        if (imageUrl && !/^https?:\/\/|^\//i.test(imageUrl)) {
          throw new Error('Link ảnh phải bắt đầu bằng http://, https:// hoặc /.');
        }

        if (file && file.size > 0) {
          if (!IMAGE_TYPES.includes(file.type)) {
            throw new Error('Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.');
          }

          if (file.size > MAX_IMAGE_SIZE) {
            throw new Error('Ảnh vượt quá 5MB.');
          }
        }

        const duplicate = state.items.some(
          (m) =>
            m.id !== item?.id &&
            m.name.trim().toLowerCase() === name.toLowerCase(),
        );

        if (duplicate) throw new Error(`Món "${name}" đã tồn tại trong thực đơn.`);

        const body = { name, price, category, isAvailable };

        if (editing) body.imageUrl = imageUrl;
        else if (imageUrl) body.imageUrl = imageUrl;

        let saved;

        if (editing) {
          saved = await http.patch(`/menu/${encodeURIComponent(item.id)}`, body);
        } else {
          saved = await http.post('/menu', body);
        }

        // Tải ảnh lên (nếu có chọn file)
        if (file && file.size > 0) {
          const upload = new FormData();
          upload.append('image', file);

          try {
            await http.upload(`/menu/${encodeURIComponent(saved.id)}/image`, upload);
          } catch (error) {
            await load({ silent: true });
            ui.toast(`Đã lưu món nhưng tải ảnh lỗi: ${error.message}`, 'warning', 6000);
            return;
          }
        }

        ui.toast(editing ? 'Đã cập nhật món ăn.' : `Đã thêm món "${name}".`);
        await load({ silent: true });
      },
    });

    // Xem trước ảnh khi chọn file hoặc dán link
    const form = modal.body.querySelector('form');
    const preview = form.querySelector('#menuPreview');
    let objectUrl = '';

    const setPreview = (src) => {
      preview.onerror = () => {
        preview.onerror = null;
        preview.src = util.PLACEHOLDER_IMG;
      };
      preview.src = src;
    };

    form.elements.image.addEventListener('change', () => {
      const file = form.elements.image.files[0];

      if (objectUrl) URL.revokeObjectURL(objectUrl);

      if (file) {
        objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
      }
    });

    form.elements.imageUrl.addEventListener('change', () => {
      if (!form.elements.image.files[0]) {
        setPreview(util.imageSrc(form.elements.imageUrl.value));
      }
    });
  }

  /* ---------------- Sự kiện ---------------- */
  function bind() {
    $('refreshButton').addEventListener('click', () => load());
    $('addMenu').addEventListener('click', () => menuForm());

    $('categoryFilter').addEventListener('change', (event) => {
      state.category = event.target.value;
      render();
    });

    $('availabilityFilter').addEventListener('change', (event) => {
      state.availability = event.target.value;
      render();
    });

    $('menuGrid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;

      const { action, id } = button.dataset;

      if (action === 'reload') return load();

      const item = state.items.find((m) => m.id === id);
      if (!item) return;

      if (action === 'edit') menuForm(item);
      if (action === 'toggle') toggle(item);
    });

    util.onSearch((query) => {
      state.search = query;
      render();
    });
  }

  bind();
  load();
})();
