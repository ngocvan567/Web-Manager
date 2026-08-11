// static/js/auth.js - Xử lý logic Đăng ký, Đăng nhập và Đăng xuất

document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 1. XỬ LÝ FORM ĐĂNG KÝ THÀNH VIÊN
    // =========================================================
    const regForm = document.getElementById('registerForm');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const mssv = document.getElementById('mssv').value.trim();
            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const course = document.getElementById('course') ? document.getElementById('course').value.trim() : 'K19';
            const pass = document.getElementById('password').value;
            const confirmPass = document.getElementById('confirmPassword').value;

            // Kiểm tra mật khẩu khớp nhau
            if (pass !== confirmPass) {
                alert('Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.');
                return;
            }

            const body = {
                mssv: mssv,
                full_name: fullName,
                email: email,
                course: course,
                password: pass
            };

            try {
                const res = await API.request('/api/register', { 
                    method: 'POST', 
                    body: JSON.stringify(body) 
                });

                if (res && res.status === 'success') {
                    alert(res.message || 'Đăng ký tài khoản thành công!');
                    // Chuyển hướng sang trang Đăng nhập sau khi đăng ký thành công
                    window.location.href = '/login';
                }
            } catch (err) {
                console.error("Lỗi đăng ký:", err);
            }
        });
    }

    // =========================================================
    // 2. XỬ LÝ FORM ĐĂNG NHẬP & CHUYỂN HƯỚNG GIAO DIỆN
    // =========================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const account = document.getElementById('account').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!account || !password) {
                alert('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
                return;
            }

            const body = {
                account: account,
                password: password
            };

            try {
                const res = await API.request('/api/login', { 
                    method: 'POST', 
                    body: JSON.stringify(body) 
                });

                if (res && res.status === 'success') {
                    // Chuẩn hóa role thành chữ hoa để so sánh tuyệt đối chính xác
                    const userRole = (res.user && res.user.role ? res.user.role : '').toUpperCase();
                    
                    if (userRole === 'ADMIN') {
                        // Chuyển hướng thẳng tới Dashboard ADMIN
                        window.location.href = '/admin/dashboard';
                    } else {
                        // Chuyển hướng tới Dashboard MEMBER
                        window.location.href = '/member/dashboard';
                    }
                }
            } catch (err) {
                console.error("Lỗi đăng nhập:", err);
            }
        });
    }
});

// =========================================================
// 3. HÀM ĐĂNG XUẤT TÀI KHOẢN
// =========================================================
async function logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất không?')) {
        try {
            await API.request('/api/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (err) {
            console.error("Lỗi đăng xuất:", err);
            window.location.href = '/login';
        }
    }
}