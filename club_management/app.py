import os
from functools import wraps
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_mysqldb import MySQL
import MySQLdb.cursors

app = Flask(__name__)
app.secret_key = 'super_secret_club_management_key'

# Tắt bộ nhớ đệm Cache trên toàn hệ thống Flask
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# ---------------------------------------------------------
# CẤU HÌNH KẾT NỐI CSDL MYSQL WORKBENCH
# ---------------------------------------------------------
app.config['MYSQL_HOST'] = os.environ.get('MYSQL_HOST', '127.0.0.1')
app.config['MYSQL_PORT'] = int(os.environ.get('MYSQL_PORT', 3300))
app.config['MYSQL_USER'] = os.environ.get('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.environ.get('MYSQL_PASSWORD', '123456')
app.config['MYSQL_DB'] = os.environ.get('MYSQL_DB', 'club_management')
app.config['MYSQL_CURSORCLASS'] = 'DictCursor'

mysql = MySQL(app)

# ---------------------------------------------------------
# BẮT LỖI HTTP
# ---------------------------------------------------------
@app.errorhandler(500)
def internal_server_error(e):
    if request.path.startswith('/api/'):
        return jsonify({'status': 'error', 'message': f'Lỗi nội bộ Server (500): {str(e)}'}), 500
    return "<h1>500 Internal Server Error</h1>", 500

@app.errorhandler(404)
def not_found_error(e):
    if request.path.startswith('/api/'):
        return jsonify({'status': 'error', 'message': 'API Route không tồn tại (404)'}), 404
    return "<h1>404 Not Found</h1>", 404

# ---------------------------------------------------------
# MIDDLEWARE PHÂN QUYỀN (RBAC)
# ---------------------------------------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return jsonify({'status': 'error', 'message': 'Chưa đăng nhập. Vui lòng đăng nhập lại.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session or str(session['user'].get('role', '')).upper() != 'ADMIN':
            return jsonify({'status': 'error', 'message': 'Từ chối truy cập! Quyền ADMIN mới được phép.'}), 403
        return f(*args, **kwargs)
    return decorated_function

# ---------------------------------------------------------
# ROUTE GIAO DIỆN TRANG WEB (HTML PAGES)
# ---------------------------------------------------------
@app.route('/')
def index():
    if 'user' in session:
        user_role = str(session['user'].get('role', '')).upper()
        if user_role == 'ADMIN':
            return redirect('/admin/dashboard')
        return redirect('/member/dashboard')
    return redirect('/login')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    if 'user' not in session or str(session['user'].get('role', '')).upper() != 'ADMIN':
        return redirect('/login')
    return render_template('admin/dashboard.html')

@app.route('/member/dashboard')
def member_dashboard():
    if 'user' not in session:
        return redirect('/login')
    if str(session['user'].get('role', '')).upper() == 'ADMIN':
        return redirect('/admin/dashboard')
    return render_template('member/dashboard.html')

# ---------------------------------------------------------
# RESTFUL APIS - AUTH & USERS
# ---------------------------------------------------------

# 1. API Đăng ký tài khoản
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.json or {}
    mssv = data.get('mssv', '').strip()
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    course = data.get('course', 'K19').strip()

    if not mssv or not email or not password or not full_name:
        return jsonify({'status': 'error', 'message': 'Vui lòng nhập đầy đủ các thông tin bắt buộc.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (mssv, email))
        if cursor.fetchone():
            cursor.close()
            return jsonify({'status': 'error', 'message': 'MSSV hoặc Email này đã được sử dụng.'}), 400

        cursor.execute("""
            INSERT INTO users (username, password, full_name, email, role)
            VALUES (%s, %s, %s, %s, 'member')
        """, (mssv, password, full_name, email))
        user_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO members (user_id, student_code, full_name, email, course, department_id, position)
            VALUES (%s, %s, %s, %s, %s, 1, 'Thành Viên')
            ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
        """, (user_id, mssv, full_name, email, course))

        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đăng ký tài khoản thành công!'}), 201

    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi lưu CSDL: {str(e)}'}), 500

# 2. API Đăng nhập
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.json or {}
    account = data.get('account', '').strip()
    password = data.get('password', '').strip()

    if not account or not password:
        return jsonify({'status': 'error', 'message': 'Vui lòng điền đầy đủ tài khoản và mật khẩu.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            SELECT u.id, u.username, u.full_name, u.email, u.password, u.role,
                   COALESCE(m.department_id, 1) as department_id, 
                   COALESCE(d.department_name, 'Chưa Phân Ban') as department_name, 
                   COALESCE(m.position, 'Thành Viên') as position
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN departments d ON m.department_id = d.department_id
            WHERE u.username = %s OR u.email = %s
        """, (account, account))
        user = cursor.fetchone()
        cursor.close()

        if not user:
            return jsonify({'status': 'error', 'message': 'Tài khoản không tồn tại.'}), 400

        if str(user['password']).strip() != password:
            return jsonify({'status': 'error', 'message': 'Mật khẩu không chính xác.'}), 400

        user_role = str(user['role'] or 'member').upper()

        user_payload = {
            'id': user['id'],
            'mssv': user['username'],
            'name': user['full_name'],
            'email': user['email'],
            'role': user_role,
            'department_id': user['department_id'],
            'department_name': user['department_name'],
            'position': user['position']
        }

        session['user'] = user_payload
        return jsonify({'status': 'success', 'user': user_payload}), 200

    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 3. API Đăng xuất
@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user', None)
    return jsonify({'status': 'success', 'message': 'Đã đăng xuất.'}), 200

# 4. API Lấy thông tin Member hiện tại
@app.route('/api/me', methods=['GET'])
@login_required
def get_me():
    user_id = session['user']['id']
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT u.id, u.username as mssv, u.full_name, u.email, UPPER(u.role) as role, 'ACTIVE' as status,
               COALESCE(m.course, 'K19') as course, 
               COALESCE(m.position, 'Thành Viên') as position, 
               COALESCE(d.department_id, 1) as department_id, 
               COALESCE(d.department_name, 'Chưa Phân Ban') as department_name
        FROM users u
        LEFT JOIN members m ON u.id = m.user_id
        LEFT JOIN departments d ON m.department_id = d.department_id
        WHERE u.id = %s
    """, (user_id,))
    user_info = cursor.fetchone()
    cursor.close()
    return jsonify({'status': 'success', 'user': user_info})

# 5. API Lấy danh sách người dùng (ADMIN)
@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            SELECT u.id, u.username as mssv, u.full_name, u.email, UPPER(u.role) as role, 
                   'ACTIVE' as status,
                   COALESCE(m.department_id, 1) as department_id, 
                   COALESCE(d.department_name, 'Chưa Phân Ban') as department_name, 
                   COALESCE(m.position, 'Thành Viên') as position
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN departments d ON m.department_id = d.department_id
            ORDER BY u.id ASC
        """)
        users = cursor.fetchall()
        cursor.close()
        return jsonify({'status': 'success', 'data': users})
    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 6. API Thay đổi Role (ADMIN)
@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def change_role(user_id):
    data = request.json or {}
    new_role = str(data.get('role', '')).lower()
    if new_role not in ['admin', 'member', 'executive']:
        return jsonify({'status': 'error', 'message': 'Role không hợp lệ.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': f'Đã chuyển Role thành {new_role.upper()}.'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 7. API Khóa/Mở tài khoản (ADMIN)
@app.route('/api/users/<int:user_id>/status', methods=['PUT'])
@admin_required
def change_status(user_id):
    return jsonify({'status': 'success', 'message': 'Cập nhật trạng thái tài khoản thành công.'})

# ---------------------------------------------------------
# RESTFUL APIS - QUẢN LÝ BAN & THÀNH VIÊN BAN
# ---------------------------------------------------------

# 8. API Phân Ban cho Member (ADMIN)
@app.route('/api/members/<int:user_id>/department', methods=['PUT'])
@admin_required
def change_member_dept(user_id):
    data = request.json or {}
    dept_id = data.get('department_id')

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT user_id FROM members WHERE user_id = %s", (user_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO members (user_id, student_code, full_name, email, department_id, position)
                SELECT id, username, full_name, email, %s, 'Thành Viên'
                FROM users WHERE id = %s
            """, (dept_id, user_id))
        else:
            cursor.execute("UPDATE members SET department_id = %s WHERE user_id = %s", (dept_id, user_id))

        mysql.connection.commit()

        cursor.execute("SELECT department_name FROM departments WHERE department_id = %s", (dept_id,))
        dept_info = cursor.fetchone()
        dept_name = dept_info['department_name'] if dept_info else 'Ban mới'

        cursor.close()
        return jsonify({'status': 'success', 'message': f'Đã chuyển thành viên sang {dept_name}!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi cập nhật CSDL: {str(e)}'}), 500

# 9. API Danh sách tất cả Ban
@app.route('/api/departments', methods=['GET'])
@login_required
def get_departments():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM departments ORDER BY department_id ASC")
    depts = cursor.fetchall()
    cursor.close()
    return jsonify({'status': 'success', 'data': depts})

# 10. API Lấy Thành viên & Hoạt động của 1 Ban (ADMIN)
@app.route('/api/departments/<int:dept_id>/details', methods=['GET'])
@admin_required
def get_department_details(dept_id):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("SELECT * FROM departments WHERE department_id = %s", (dept_id,))
        dept_info = cursor.fetchone()

        cursor.execute("""
            SELECT m.user_id, m.full_name, m.email, m.student_code, m.position, m.course
            FROM members m
            WHERE m.department_id = %s
        """, (dept_id,))
        members = cursor.fetchall()

        cursor.execute("""
            SELECT da.activity_id, da.title, da.description, da.created_at, 'Admin' as created_by_name
            FROM department_activities da
            WHERE da.department_id = %s
            ORDER BY da.created_at DESC
        """, (dept_id,))
        activities = cursor.fetchall()

        cursor.close()
        return jsonify({
            'status': 'success',
            'department': dept_info,
            'members': members,
            'activities': activities
        })
    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 11. API Thêm Hoạt động mới cho Ban (ADMIN)
@app.route('/api/departments/<int:dept_id>/activities', methods=['POST'])
@admin_required
def add_department_activity(dept_id):
    data = request.json or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()

    if not title:
        return jsonify({'status': 'error', 'message': 'Vui lòng nhập tên hoạt động.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO department_activities (department_id, title, description)
            VALUES (%s, %s, %s)
        """, (dept_id, title, description))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Thêm hoạt động cho Ban thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# ---------------------------------------------------------
# RESTFUL APIS - SỰ KIỆN & ĐIỂM DANH (MEMBER & ADMIN)
# ---------------------------------------------------------

# 12. API Xem danh sách Sự kiện
@app.route('/api/events', methods=['GET'])
@login_required
def get_events():
    cursor = mysql.connection.cursor()
    user_id = session['user']['id']
    cursor.execute("""
        SELECT e.*, COALESCE(ea.attendance_status, 'Absent') as attendance_status
        FROM events e
        LEFT JOIN event_attendance ea ON e.event_id = ea.event_id AND ea.user_id = %s
        ORDER BY e.start_time DESC
    """, (user_id,))
    events = cursor.fetchall()
    cursor.close()
    return jsonify({'status': 'success', 'data': events})

# 13. API Thêm Sự kiện Mới (ADMIN)
@app.route('/api/events/add', methods=['POST'])
@admin_required
def add_event():
    data = request.json or {}
    title = data.get('title')
    description = data.get('description')
    location = data.get('location')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    if not title or not start_time:
        return jsonify({'status': 'error', 'message': 'Vui lòng nhập tên sự kiện và thời gian bắt đầu.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO events (title, description, location, start_time, end_time, host_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (title, description, location, start_time, end_time, session['user']['id']))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Thêm sự kiện mới thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 14. API Chỉnh sửa Sự kiện (ADMIN)
@app.route('/api/events/<int:event_id>/edit', methods=['PUT'])
@admin_required
def edit_event(event_id):
    data = request.json or {}
    title = data.get('title')
    description = data.get('description')
    location = data.get('location')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            UPDATE events 
            SET title = %s, description = %s, location = %s, start_time = %s, end_time = %s
            WHERE event_id = %s
        """, (title, description, location, start_time, end_time, event_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Cập nhật sự kiện thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 15. API Xóa Sự kiện (ADMIN)
@app.route('/api/events/<int:event_id>/delete', methods=['DELETE'])
@admin_required
def delete_event(event_id):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("DELETE FROM events WHERE event_id = %s", (event_id,))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đã xóa sự kiện!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 16. API Đăng ký tham gia sự kiện (MEMBER) - Đa tuyến đường
@app.route('/api/events/register', methods=['POST'])
@app.route('/api/events/<int:event_id>/register', methods=['POST'])
@login_required
def register_event(event_id=None):
    data = request.json or {}
    target_event_id = event_id or data.get('event_id')
    user_id = session['user']['id']

    if not target_event_id:
        return jsonify({'status': 'error', 'message': 'Thiếu ID sự kiện.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO event_attendance (event_id, user_id, attendance_status, check_in_time)
            VALUES (%s, %s, 'Registered', NOW())
            ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status)
        """, (target_event_id, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đăng ký tham gia sự kiện thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 17. API Điểm danh sự kiện (MEMBER) - Đa tuyến đường giải quyết lỗi 404
@app.route('/api/attendance/checkin', methods=['POST'])
@app.route('/api/events/checkin', methods=['POST'])
@app.route('/api/events/<int:event_id>/checkin', methods=['POST'])
@login_required
def checkin_event(event_id=None):
    data = request.json or {}
    target_event_id = event_id or data.get('event_id')
    user_id = session['user']['id']

    if not target_event_id:
        return jsonify({'status': 'error', 'message': 'Thiếu ID sự kiện.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO event_attendance (event_id, user_id, attendance_status, check_in_time)
            VALUES (%s, %s, 'Present', NOW())
            ON DUPLICATE KEY UPDATE attendance_status = 'Present', check_in_time = NOW()
        """, (target_event_id, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Điểm danh sự kiện thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 18. API Lấy Lịch sử Đăng ký Tham gia Sự kiện (ADMIN)
@app.route('/api/events/<int:event_id>/registrations', methods=['GET'])
@admin_required
def get_event_registrations(event_id):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            SELECT ea.attendance_id, ea.attendance_status, ea.check_in_time as registered_at, ea.check_in_time,
                   u.full_name, u.username as mssv, u.email
            FROM event_attendance ea
            JOIN users u ON ea.user_id = u.id
            WHERE ea.event_id = %s
            ORDER BY ea.attendance_id DESC
        """, (event_id,))
        registrations = cursor.fetchall()
        cursor.close()
        return jsonify({'status': 'success', 'data': registrations})
    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 19. API Lịch sử điểm danh & Đăng ký sự kiện của cá nhân (MEMBER)
@app.route('/api/attendance/my-history', methods=['GET'])
@login_required
def get_my_attendance():
    user_id = session['user']['id']
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            SELECT ea.attendance_status, ea.check_in_time as registered_at, ea.check_in_time, e.title, e.location, e.start_time
            FROM event_attendance ea
            JOIN events e ON ea.event_id = e.event_id
            WHERE ea.user_id = %s
            ORDER BY e.start_time DESC
        """, (user_id,))
        history = cursor.fetchall()
        cursor.close()
        return jsonify({'status': 'success', 'data': history})
    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# ---------------------------------------------------------
# RESTFUL APIS - QUẢN LÝ THÔNG BÁO (ANNOUNCEMENTS)
# ---------------------------------------------------------

# 20. API Lấy danh sách thông báo (Dùng chung Admin & Member)
@app.route('/api/announcements', methods=['GET'])
@login_required
def get_announcements():
    cursor = mysql.connection.cursor()
    try:
        user_role = str(session['user'].get('role', '')).upper()
        if user_role == 'ADMIN':
            sql = """
                SELECT a.announcement_id, a.title, a.content, a.status, a.created_at, 
                       COALESCE(u.full_name, 'Ban Chủ Nhiệm') as created_by_name
                FROM announcements a
                LEFT JOIN users u ON a.created_by = u.id
                ORDER BY a.created_at DESC
            """
            cursor.execute(sql)
        else:
            sql = """
                SELECT a.announcement_id, a.title, a.content, a.created_at, 
                       COALESCE(u.full_name, 'Ban Chủ Nhiệm') as created_by_name
                FROM announcements a
                LEFT JOIN users u ON a.created_by = u.id
                WHERE a.status = 'Đã đăng'
                ORDER BY a.created_at DESC
            """
            cursor.execute(sql)

        announcements = cursor.fetchall()
        cursor.close()
        return jsonify({'status': 'success', 'data': announcements})
    except Exception as e:
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 21. API Tạo thông báo mới (ADMIN)
@app.route('/api/announcements/add', methods=['POST'])
@app.route('/api/announcements', methods=['POST'])
@admin_required
def add_announcement():
    data = request.json or {}
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    status = data.get('status', 'Đã đăng').strip()

    if not title or not content:
        return jsonify({'status': 'error', 'message': 'Vui lòng nhập tiêu đề và nội dung thông báo.'}), 400

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO announcements (title, content, status, created_by)
            VALUES (%s, %s, %s, %s)
        """, (title, content, status, session['user']['id']))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đăng thông báo thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# 22. API Xóa thông báo (ADMIN)
@app.route('/api/announcements/<int:announcement_id>', methods=['DELETE'])
@app.route('/api/announcements/<int:announcement_id>/delete', methods=['DELETE'])
@admin_required
def delete_announcement(announcement_id):
    cursor = mysql.connection.cursor()
    try:
        cursor.execute("DELETE FROM announcements WHERE announcement_id = %s", (announcement_id,))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đã xóa thông báo!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

# ---------------------------------------------------------
# RESTFUL APIS - QUẢN LÝ THU CHI QUỸ
# ---------------------------------------------------------

# 23. API Quản lý Thu Chi Quỹ (ADMIN) - Khớp với bảng `financials`
@app.route('/api/finances', methods=['GET', 'POST'])
@app.route('/api/finance', methods=['GET', 'POST'])
@admin_required
def handle_finances():
    cursor = mysql.connection.cursor()
    if request.method == 'GET':
        try:
            cursor.execute("""
                SELECT f.transaction_id, f.amount, f.transaction_type, f.description, 
                       f.created_at, u.full_name as created_by_name
                FROM financials f
                LEFT JOIN users u ON f.created_by = u.id
                ORDER BY f.created_at DESC
            """)
            finances = cursor.fetchall()
            cursor.close()
            return jsonify({'status': 'success', 'data': finances})
        except Exception as e:
            cursor.close()
            return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

    if request.method == 'POST':
        data = request.json or {}
        fin_type = data.get('type') or data.get('transaction_type')
        amount = data.get('amount')
        description = data.get('description')

        if not fin_type or not amount or not description:
            return jsonify({'status': 'error', 'message': 'Vui lòng điền đầy đủ thông tin thu chi.'}), 400

        try:
            cursor.execute("""
                INSERT INTO financials (transaction_type, amount, description, created_by)
                VALUES (%s, %s, %s, %s)
            """, (fin_type, amount, description, session['user']['id']))
            mysql.connection.commit()
            cursor.close()
            return jsonify({'status': 'success', 'message': 'Ghi sổ quỹ thu chi thành công!'})
        except Exception as e:
            mysql.connection.rollback()
            cursor.close()
            return jsonify({'status': 'error', 'message': f'Lỗi CSDL: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)