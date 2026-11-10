(function () {
    'use strict';

    const TOKEN_KEY = 'orderflow_token';
    const token = localStorage.getItem(TOKEN_KEY);

    // Các trang quản lý đều yêu cầu đăng nhập.
    if (!token) {
        window.location.replace('/login.html');
        return;
    }

    const $ = (selector) => document.querySelector(selector);

    let tables = [];

    const STATUS_LABEL = {
        AVAILABLE: 'Bàn trống',
        OCCUPIED: 'Đang phục vụ',
        RESERVED: 'Đã đặt trước'
    };

    // Mã hóa nội dung trước khi đưa vào HTML.
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    function moneyDate(value) {
        if (!value) return '—';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return '—';

        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function showMessage(element, message, type = '') {
        if (!element) return;

        element.textContent = message;
        element.className = 'message ' + type;
    }

    function showError(error) {
        return error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
    }

    // Hàm gọi API có gắn JWT.
    async function api(url, options = {}) {
        const headers = {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        };

        const config = {
            ...options,
            headers
        };

        if (
            config.body !== undefined &&
            !(config.body instanceof FormData) &&
            typeof config.body !== 'string'
        ) {
            config.body = JSON.stringify(config.body);
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, config);

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            window.location.replace('/login.html');
            throw new Error('Phiên đăng nhập đã hết hạn.');
        }

        const text = await response.text();
        let result = null;

        try {
            result = text ? JSON.parse(text) : null;
        } catch {
            result = text;
        }

        if (!response.ok) {
            const message = Array.isArray(result?.message)
                ? result.message.join(', ')
                : result?.message;

            throw new Error(message || `Lỗi máy chủ: ${response.status}`);
        }

        return result;
    }

    // Tạo hộp thoại nhập dữ liệu.
    function openModal(title, fields, onSubmit) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';

        backdrop.innerHTML = `
            <section class="modal">
                <h2>${escapeHTML(title)}</h2>
                <form class="modal-form" id="managementForm">
                    ${fields}
                    <div class="form-error" id="modalError"></div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-light" id="modalCancel">
                            Hủy
                        </button>
                        <button type="submit" class="btn btn-primary" id="modalSubmit">
                            Lưu thông tin
                        </button>
                    </div>
                </form>
            </section>
        `;

        document.body.appendChild(backdrop);

        const close = () => backdrop.remove();

        backdrop.addEventListener('click', function (event) {
            if (event.target === backdrop) close();
        });

        backdrop.querySelector('#modalCancel').addEventListener('click', close);

        backdrop.querySelector('#managementForm').addEventListener('submit', async function (event) {
            event.preventDefault();

            const form = event.currentTarget;
            const button = form.querySelector('#modalSubmit');
            const errorBox = form.querySelector('#modalError');

            errorBox.textContent = '';
            button.disabled = true;
            button.textContent = 'Đang xử lý...';

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                await onSubmit(data);
                close();
            } catch (error) {
                errorBox.textContent = showError(error);
            } finally {
                if (document.body.contains(button)) {
                    button.disabled = false;
                    button.textContent = 'Lưu thông tin';
                }
            }
        });

        const firstInput = backdrop.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }

    function field(label, name, value = '', type = 'text', required = true, extra = '') {
        return `
            <div class="form-field">
                <label for="${escapeHTML(name)}">${escapeHTML(label)}</label>
                <input
                    id="${escapeHTML(name)}"
                    name="${escapeHTML(name)}"
                    type="${escapeHTML(type)}"
                    value="${escapeHTML(value)}"
                    ${required ? 'required' : ''}
                    ${extra}
                >
            </div>
        `;
    }

    function selectField(label, name, options, selected) {
        return `
            <div class="form-field">
                <label for="${escapeHTML(name)}">${escapeHTML(label)}</label>
                <select id="${escapeHTML(name)}" name="${escapeHTML(name)}" required>
                    ${options.map(option => `
                        <option value="${escapeHTML(option.value)}"
                            ${option.value === selected ? 'selected' : ''}>
                            ${escapeHTML(option.label)}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    function statusBadge(status) {
        return `
            <span class="status status-${escapeHTML(status)}">
                ${escapeHTML(STATUS_LABEL[status] || status || 'Chưa xác định')}
            </span>
        `;
    }

    async function loadTables() {
        const result = await api('/tables');

        if (!Array.isArray(result)) {
            throw new Error('Dữ liệu bàn trả về không đúng định dạng.');
        }

        tables = result;
    }

    function updateTableStats() {
        const count = {
            AVAILABLE: 0,
            OCCUPIED: 0,
            RESERVED: 0
        };

        tables.forEach(table => {
            if (count[table.status] !== undefined) {
                count[table.status]++;
            }
        });

        if ($('#totalTables')) $('#totalTables').textContent = tables.length;
        if ($('#availableTables')) $('#availableTables').textContent = count.AVAILABLE;
        if ($('#occupiedTables')) $('#occupiedTables').textContent = count.OCCUPIED;
        if ($('#reservedTables')) $('#reservedTables').textContent = count.RESERVED;

        if ($('#reservationTotalTables')) {
            $('#reservationTotalTables').textContent = tables.length;
        }

        if ($('#reservationCount')) {
            $('#reservationCount').textContent = count.RESERVED;
        }

        if ($('#reservationAvailable')) {
            $('#reservationAvailable').textContent = count.AVAILABLE;
        }
    }

    // ============================
    // TRANG QUẢN LÝ BÀN
    // ============================

    function renderTables() {
        const body = $('#tableBody');
        if (!body) return;

        const keyword = ($('#searchTable')?.value || '').trim().toLowerCase();
        const status = $('#statusFilter')?.value || '';

        const filtered = tables.filter(table => {
            const matchKeyword = String(table.tableNumber || '')
                .toLowerCase()
                .includes(keyword);

            const matchStatus = !status || table.status === status;

            return matchKeyword && matchStatus;
        });

        if (!filtered.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">Không tìm thấy bàn phù hợp.</td>
                </tr>
            `;
            return;
        }

        body.innerHTML = filtered.map(table => `
            <tr>
                <td><strong>${escapeHTML(table.tableNumber)}</strong></td>
                <td>${escapeHTML(table.capacity)} người</td>
                <td>${statusBadge(table.status)}</td>
                <td>${escapeHTML(table.customerName || '—')}</td>
                <td>${moneyDate(table.reservationAt)}</td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-light btn-small"
                            data-action="edit" data-id="${escapeHTML(table.id)}">
                            Sửa
                        </button>
                        <button class="btn btn-danger btn-small"
                            data-action="delete" data-id="${escapeHTML(table.id)}">
                            Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function openAddTable() {
        const fields = [
            field('Số bàn', 'tableNumber', '', 'text', true, 'maxlength="20"'),
            field('Sức chứa (người)', 'capacity', '4', 'number', true, 'min="1" max="100"')
        ].join('');

        openModal('Thêm bàn mới', fields, async data => {
            const capacity = Number(data.capacity);

            if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
                throw new Error('Sức chứa phải là số nguyên từ 1 đến 100.');
            }

            await api('/tables', {
                method: 'POST',
                body: {
                    tableNumber: data.tableNumber.trim(),
                    capacity
                }
            });

            await refreshTables();
        });
    }

    function openEditTable(id) {
        const table = tables.find(item => item.id === id);
        if (!table) return;

        const fields = [
            field('Số bàn', 'tableNumber', table.tableNumber, 'text', true, 'maxlength="20"'),
            field('Sức chứa (người)', 'capacity', table.capacity, 'number', true, 'min="1" max="100"'),
            selectField('Trạng thái', 'status', [
                { value: 'AVAILABLE', label: 'Bàn trống' },
                { value: 'OCCUPIED', label: 'Đang phục vụ' },
                { value: 'RESERVED', label: 'Đã đặt trước' }
            ], table.status)
        ].join('');

        openModal('Cập nhật thông tin bàn', fields, async data => {
            const capacity = Number(data.capacity);

            if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
                throw new Error('Sức chứa phải là số nguyên từ 1 đến 100.');
            }

            await api(`/tables/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: {
                    tableNumber: data.tableNumber.trim(),
                    capacity,
                    status: data.status
                }
            });

            await refreshTables();
        });
    }

    async function deleteTable(id) {
        const table = tables.find(item => item.id === id);
        if (!table) return;

        if (!confirm(`Bạn có chắc muốn xóa bàn ${table.tableNumber}?`)) return;

        try {
            await api(`/tables/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            });

            await refreshTables();
        } catch (error) {
            alert(showError(error));
        }
    }

    async function refreshTables() {
        const message = $('#tableMessage');

        try {
            showMessage(message, 'Đang tải dữ liệu...');

            await loadTables();
            updateTableStats();
            renderTables();

            showMessage(message, 'Đã cập nhật dữ liệu.', 'success');
        } catch (error) {
            showMessage(message, showError(error), 'error');

            if ($('#tableBody')) {
                $('#tableBody').innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-cell error">
                            ${escapeHTML(showError(error))}
                        </td>
                    </tr>
                `;
            }
        }
    }

    // ============================
    // TRANG QUẢN LÝ ĐẶT BÀN
    // ============================

    function renderReservations() {
        const body = $('#reservationBody');
        if (!body) return;

        const keyword = ($('#searchReservation')?.value || '').trim().toLowerCase();

        const reservations = tables.filter(table => {
            if (table.status !== 'RESERVED') return false;

            const text = [
                table.tableNumber,
                table.customerName,
                table.customerPhone
            ].join(' ').toLowerCase();

            return text.includes(keyword);
        });

        if (!reservations.length) {
            body.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">Chưa có thông tin đặt bàn.</td>
                </tr>
            `;
            return;
        }

        body.innerHTML = reservations.map(table => `
            <tr>
                <td><strong>${escapeHTML(table.tableNumber)}</strong></td>
                <td>${escapeHTML(table.customerName || '—')}</td>
                <td>${escapeHTML(table.customerPhone || '—')}</td>
                <td>${escapeHTML(table.partySize ?? '—')}</td>
                <td>${moneyDate(table.reservationAt)}</td>
                <td>${escapeHTML(table.note || '—')}</td>
                <td>
                    <button class="btn btn-danger btn-small"
                        data-action="cancel-reservation"
                        data-id="${escapeHTML(table.id)}">
                        Hủy đặt
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function openAddReservation() {
        const availableTables = tables.filter(table => table.status === 'AVAILABLE');

        if (!availableTables.length) {
            alert('Hiện không có bàn trống để đặt.');
            return;
        }

        const tableOptions = availableTables.map(table => ({
            value: table.id,
            label: `Bàn ${table.tableNumber} - ${table.capacity} người`
        }));

        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

        const defaultDate = now.toISOString().slice(0, 16);

        const fields = [
            selectField('Chọn bàn', 'tableId', tableOptions, tableOptions[0].value),
            field('Tên khách hàng', 'customerName', '', 'text', true, 'maxlength="120"'),
            field('Số điện thoại', 'customerPhone', '', 'tel', false, 'maxlength="30"'),
            field('Thời gian đặt bàn', 'reservationAt', defaultDate, 'datetime-local', true),
            field('Số lượng khách', 'partySize', '2', 'number', true, 'min="1" max="100"'),
            `
                <div class="form-field">
                    <label for="note">Ghi chú</label>
                    <textarea id="note" name="note" maxlength="1000"
                        placeholder="Yêu cầu của khách hàng (nếu có)"></textarea>
                </div>
            `
        ].join('');

        openModal('Tạo đặt bàn mới', fields, async data => {
            const table = tables.find(item => item.id === data.tableId);
            if (!table) throw new Error('Bàn được chọn không tồn tại.');

            const partySize = Number(data.partySize);

            if (!Number.isInteger(partySize) || partySize < 1 || partySize > 100) {
                throw new Error('Số khách phải từ 1 đến 100.');
            }

            if (partySize > table.capacity) {
                throw new Error(`Bàn này chỉ chứa tối đa ${table.capacity} người.`);
            }

            const reservationDate = new Date(data.reservationAt);

            if (Number.isNaN(reservationDate.getTime())) {
                throw new Error('Thời gian đặt bàn không hợp lệ.');
            }

            await api(`/tables/${encodeURIComponent(data.tableId)}/reservation`, {
                method: 'POST',
                body: {
                    customerName: data.customerName.trim(),
                    customerPhone: data.customerPhone.trim() || undefined,
                    reservationAt: reservationDate.toISOString(),
                    partySize,
                    note: data.note.trim() || undefined
                }
            });

            await refreshReservations();
        });
    }

    async function cancelReservation(id) {
        const table = tables.find(item => item.id === id);
        if (!table) return;

        if (!confirm(`Bạn có chắc muốn hủy đặt bàn ${table.tableNumber}?`)) return;

        try {
            await api(`/tables/${encodeURIComponent(id)}/reservation`, {
                method: 'DELETE'
            });

            await refreshReservations();
        } catch (error) {
            alert(showError(error));
        }
    }

    async function refreshReservations() {
        const message = $('#reservationMessage');

        try {
            showMessage(message, 'Đang tải dữ liệu...');

            await loadTables();
            updateTableStats();
            renderReservations();

            showMessage(message, 'Đã cập nhật dữ liệu.', 'success');
        } catch (error) {
            showMessage(message, showError(error), 'error');

            if ($('#reservationBody')) {
                $('#reservationBody').innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-cell error">
                            ${escapeHTML(showError(error))}
                        </td>
                    </tr>
                `;
            }
        }
    }

    // ============================
    // KHỞI TẠO SỰ KIỆN
    // ============================

    $('#logoutButton')?.addEventListener('click', function () {
        if (!confirm('Bạn muốn đăng xuất khỏi OrderFlow?')) return;

        localStorage.removeItem(TOKEN_KEY);
        window.location.replace('/login.html');
    });

    $('#addTableButton')?.addEventListener('click', openAddTable);
    $('#refreshButton')?.addEventListener('click', refreshTables);
    $('#searchTable')?.addEventListener('input', renderTables);
    $('#statusFilter')?.addEventListener('change', renderTables);

    $('#tableBody')?.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const id = button.dataset.id;

        if (button.dataset.action === 'edit') {
            openEditTable(id);
        }

        if (button.dataset.action === 'delete') {
            deleteTable(id);
        }
    });

    $('#addReservationButton')?.addEventListener('click', openAddReservation);
    $('#refreshReservations')?.addEventListener('click', refreshReservations);
    $('#searchReservation')?.addEventListener('input', renderReservations);

    $('#reservationBody')?.addEventListener('click', function (event) {
        const button = event.target.closest('button[data-action="cancel-reservation"]');
        if (!button) return;

        cancelReservation(button.dataset.id);
    });

    // Tự nhận diện trang hiện tại.
    if ($('#tableBody')) {
        refreshTables();
    }

    if ($('#reservationBody')) {
        refreshReservations();
    }
})();