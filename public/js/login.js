/* =====================================================
   ORDERFLOW - LOGIN
   File: public/js/login.js
   API: POST /auth/login
   ===================================================== */

(function () {
    'use strict';

    const API_LOGIN = '/auth/login';

    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const rememberCheckbox = document.getElementById('rememberUsername');
    const togglePassword = document.getElementById('togglePassword');

    const loginButton = document.getElementById('loginButton');
    const loginMessage = document.getElementById('loginMessage');

    // Hiển thị thông báo
    function showMessage(message, type = 'error') {
        loginMessage.textContent = message;
        loginMessage.className = `login-message ${type}`;
        loginMessage.hidden = false;
    }

    // Ẩn thông báo
    function hideMessage() {
        loginMessage.hidden = true;
        loginMessage.textContent = '';
    }

    // Bật / tắt trạng thái nút đăng nhập
    function setLoading(loading) {
        loginButton.disabled = loading;

        const text = loginButton.querySelector('.button-text');
        const icon = loginButton.querySelector('i');

        if (loading) {
            text.textContent = 'Đang đăng nhập...';
            icon.className = 'bi bi-arrow-repeat';
        } else {
            text.textContent = 'Đăng nhập';
            icon.className = 'bi bi-arrow-right';
        }
    }

    // Ghi nhớ tên đăng nhập
    function loadRememberedUsername() {
        const savedUsername = localStorage.getItem('orderflow_username');

        if (savedUsername) {
            usernameInput.value = savedUsername;
            rememberCheckbox.checked = true;
            passwordInput.focus();
        } else {
            usernameInput.focus();
        }
    }

    // Ẩn / hiện mật khẩu
    togglePassword.addEventListener('click', function () {
        const isPassword = passwordInput.type === 'password';

        passwordInput.type = isPassword ? 'text' : 'password';

        this.innerHTML = isPassword
            ? '<i class="bi bi-eye-slash"></i>'
            : '<i class="bi bi-eye"></i>';

        this.setAttribute(
            'aria-label',
            isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
        );
    });

    // Xử lý đăng nhập
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        hideMessage();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            showMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API_LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const message =
                    result?.message ||
                    'Tên đăng nhập hoặc mật khẩu không chính xác.';

                throw new Error(
                    Array.isArray(message) ? message.join(', ') : message
                );
            }

            if (!result || !result.access_token) {
                throw new Error('Máy chủ không trả về mã xác thực.');
            }

            // Lưu JWT để gọi các API cần đăng nhập
            localStorage.setItem('access_token', result.access_token);

            // Tương thích với những đoạn code cũ đang đọc các tên token khác
            localStorage.setItem('accessToken', result.access_token);
            localStorage.setItem('token', result.access_token);

            // Ghi nhớ hoặc xóa tên đăng nhập
            if (rememberCheckbox.checked) {
                localStorage.setItem('orderflow_username', username);
            } else {
                localStorage.removeItem('orderflow_username');
            }

            showMessage('Đăng nhập thành công. Đang chuyển đến Dashboard...', 'success');

            setTimeout(function () {
                window.location.replace('/');
            }, 600);

        } catch (error) {
            showMessage(
                error.message || 'Không thể đăng nhập. Vui lòng thử lại.'
            );
        } finally {
            setLoading(false);
        }
    });

    // Khởi tạo trang
    loadRememberedUsername();

})();