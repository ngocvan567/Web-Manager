# Club Management - bản đã sửa

## 1. Chạy
```bash
pip install -r requirements.txt
python app.py
```
Mở duy nhất:
`http://127.0.0.1:5500/`

Không cần Live Server/port 5500 riêng cho frontend.

## 2. Database
`config.py` mặc định:
- host: 127.0.0.1
- port: 3300
- user: root
- database: club_management

Nếu MySQL của bạn dùng port khác, sửa biến môi trường `DB_PORT`.

Có file `database_setup.sql` để bổ sung:
- `users.status` (ACTIVE/LOCKED/INACTIVE)
- `attendance_sessions`

Ứng dụng cũng tự kiểm tra và tạo các phần bổ sung khi khởi động nếu user DB có quyền ALTER/CREATE.

## 3. Phân quyền
Role lấy trực tiếp từ bảng `users.role`:
- `admin` -> giao diện `/admin/dashboard.html`
- `member` -> giao diện `/member/dashboard.html`

Backend **không tin role lưu ở trình duyệt**. Mỗi API có quyền Admin sẽ kiểm tra JWT rồi đọc lại role hiện tại từ MySQL. Vì vậy nếu Admin đổi role của một tài khoản thành `member`, tài khoản đó sẽ mất quyền Admin ở API ngay.

Các API tạo/sửa/xóa tài khoản, ban, sự kiện, thông báo, tài chính, điểm danh đều yêu cầu Admin.

## 4. Đăng nhập
Frontend gửi `username`; backend chấp nhận:
- username
- email
- MSSV (`members.student_code`)

Tài khoản bị `LOCKED` hoặc `INACTIVE` sẽ không đăng nhập được.

## 5. Giao diện Backend Database
Sau khi đăng nhập Admin, mở:
`http://127.0.0.1:5500/backend`

Đây là giao diện riêng để:
- đăng nhập bằng tài khoản Admin trong MySQL;
- xem trạng thái kết nối MySQL;
- xem số lượng dữ liệu;
- xem bảng Users, Members, Departments, Events, Announcements, Financials.

Giao diện Database là **chỉ đọc** và chỉ API Admin mới truy cập được.

## 6. Đã sửa các lỗi chính
- Frontend gửi `identifier` nhưng backend chờ `username`.
- `response.json()` trên response rỗng gây `Unexpected end of JSON input`.
- API không tồn tại trước đây có thể trả `index.html`; giờ `/api/*` không tồn tại sẽ trả JSON 404.
- `/api/users` không tồn tại; đã đồng bộ với frontend.
- Bổ sung API role/status/reset-password.
- Bổ sung statistics, registrations, profile, attendance session.
- Đồng bộ dữ liệu `name/mssv/department/role/status`.
- Login MSSV/email/username.
- Backend kiểm tra quyền theo database.
