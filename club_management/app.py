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
        return jsonify({'status': 'error', 'message': 'Lỗi nội bộ Server (500). Kiểm tra kết nối MySQL Workbench!'}), 500
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
# RESTFUL APIS
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
        cursor.execute("SELECT id FROM users WHERE mssv = %s OR email = %s", (mssv, email))
        if cursor.fetchone():
            cursor.close()
            return jsonify({'status': 'error', 'message': 'MSSV hoặc Email này đã được sử dụng.'}), 400

        cursor.execute("""
            INSERT INTO users (mssv, username, password, full_name, email, role, status)
            VALUES (%s, %s, %s, %s, %s, 'MEMBER', 'ACTIVE')
        """, (mssv, mssv, password, full_name, email))
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
            SELECT u.id, u.mssv, u.full_name, u.email, u.password, u.role, u.status,
                   COALESCE(m.department_id, 1) as department_id, 
                   COALESCE(d.department_name, 'Chưa Phân Ban') as department_name, 
                   COALESCE(m.position, 'Thành Viên') as position
            FROM users u
            LEFT JOIN members m ON u.id = m.user_id
            LEFT JOIN departments d ON m.department_id = d.department_id
            WHERE u.mssv = %s OR u.email = %s OR u.username = %s
        """, (account, account, account))
        user = cursor.fetchone()
        cursor.close()

        if not user:
            return jsonify({'status': 'error', 'message': 'Tài khoản không tồn tại.'}), 400

        if str(user['password']).strip() != password:
            return jsonify({'status': 'error', 'message': 'Mật khẩu không chính xác.'}), 400

        if user['status'] and str(user['status']).upper() != 'ACTIVE':
            return jsonify({'status': 'error', 'message': 'Tài khoản hiện đang bị khóa.'}), 403

        user_role = str(user['role'] or 'MEMBER').upper()

        user_payload = {
            'id': user['id'],
            'mssv': user['mssv'],
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
        SELECT u.id, u.mssv, u.full_name, u.email, UPPER(u.role) as role, u.status,
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
    cursor.execute("""
        SELECT u.id, u.mssv, u.full_name, u.email, UPPER(u.role) as role, u.status, 
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

# 6. API Thay đổi Role (ADMIN)
@app.route('/api/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def change_role(user_id):
    data = request.json or {}
    new_role = str(data.get('role', '')).upper()
    if new_role not in ['ADMIN', 'MEMBER']:
        return jsonify({'status': 'error', 'message': 'Role không hợp lệ.'}), 400

    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
    mysql.connection.commit()
    cursor.close()
    return jsonify({'status': 'success', 'message': f'Đã chuyển Role thành {new_role}.'})

# 7. API Khóa/Mở tài khoản (ADMIN)
@app.route('/api/users/<int:user_id>/status', methods=['PUT'])
@admin_required
def change_status(user_id):
    data = request.json or {}
    new_status = str(data.get('status', '')).upper()

    cursor = mysql.connection.cursor()
    cursor.execute("UPDATE users SET status = %s WHERE id = %s", (new_status, user_id))
    mysql.connection.commit()
    cursor.close()
    return jsonify({'status': 'success', 'message': 'Đã cập nhật trạng thái tài khoản.'})

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
                SELECT id, mssv, full_name, email, %s, 'Thành Viên'
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

# 9. API Danh sách Ban
@app.route('/api/departments', methods=['GET'])
@login_required
def get_departments():
    cursor = mysql.connection.cursor()
    cursor.execute("SELECT * FROM departments ORDER BY department_id ASC")
    depts = cursor.fetchall()
    cursor.close()
    return jsonify({'status': 'success', 'data': depts})

# 10. API Quản lý Sự kiện (CẬP NHẬT TRẢ VỀ TRẠNG THÁI ĐIỂM DANH)
@app.route('/api/events', methods=['GET', 'POST'])
@login_required
def handle_events():
    cursor = mysql.connection.cursor()
    if request.method == 'GET':
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

    if request.method == 'POST':
        if str(session['user'].get('role', '')).upper() != 'ADMIN':
            return jsonify({'status': 'error', 'message': 'Từ chối truy cập.'}), 403
        data = request.json or {}
        cursor.execute("""
            INSERT INTO events (title, description, location, start_time, end_time, host_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (data['title'], data['description'], data['location'], data['start_time'], data['end_time'], session['user']['id']))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Tạo sự kiện mới thành công.'})

# 11. API Đăng ký tham gia sự kiện (MEMBER)
@app.route('/api/events/register', methods=['POST'])
@login_required
def register_event():
    data = request.json or {}
    event_id = data.get('event_id')
    user_id = session['user']['id']

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO event_attendance (event_id, user_id, attendance_status)
            VALUES (%s, %s, 'Registered')
        """, (event_id, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Đăng ký tham gia sự kiện thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': 'Bạn đã đăng ký tham gia sự kiện này rồi.'}), 400

# BỔ SUNG: 11b. API Điểm danh sự kiện (MEMBER)
@app.route('/api/events/checkin', methods=['POST'])
@login_required
def checkin_event():
    data = request.json or {}
    event_id = data.get('event_id')
    user_id = session['user']['id']

    cursor = mysql.connection.cursor()
    try:
        cursor.execute("""
            INSERT INTO event_attendance (event_id, user_id, attendance_status, check_in_time)
            VALUES (%s, %s, 'Present', NOW())
            ON DUPLICATE KEY UPDATE attendance_status = 'Present', check_in_time = NOW()
        """, (event_id, user_id))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Điểm danh thành công!'})
    except Exception as e:
        mysql.connection.rollback()
        cursor.close()
        return jsonify({'status': 'error', 'message': f'Lỗi điểm danh: {str(e)}'}), 500

# 12. API Lịch sử điểm danh (MEMBER)
@app.route('/api/attendance/my-history', methods=['GET'])
@login_required
def get_my_attendance():
    user_id = session['user']['id']
    cursor = mysql.connection.cursor()
    cursor.execute("""
        SELECT ea.attendance_status, ea.check_in_time, e.title, e.location, e.start_time
        FROM event_attendance ea
        JOIN events e ON ea.event_id = e.event_id
        WHERE ea.user_id = %s
        ORDER BY e.start_time DESC
    """, (user_id,))
    history = cursor.fetchall()
    cursor.close()
    return jsonify({'status': 'success', 'data': history})

# 13. API Quản lý Thu Chi Quỹ
@app.route('/api/finances', methods=['GET', 'POST'])
@app.route('/api/finance', methods=['GET', 'POST']) # Tương thích cả /api/finance lẫn /api/finances
@admin_required
def handle_finances():
    cursor = mysql.connection.cursor()
    if request.method == 'GET':
        cursor.execute("SELECT * FROM financial_records ORDER BY created_at DESC")
        finances = cursor.fetchall()
        cursor.close()
        return jsonify({'status': 'success', 'data': finances})

    if request.method == 'POST':
        data = request.json or {}
        fin_type = data.get('type')
        amount = data.get('amount')
        description = data.get('description')

        if not fin_type or not amount or not description:
            return jsonify({'status': 'error', 'message': 'Vui lòng điền đầy đủ thông tin thu chi.'}), 400

        cursor.execute("""
            INSERT INTO financial_records (type, amount, description, created_by)
            VALUES (%s, %s, %s, %s)
        """, (fin_type, amount, description, session['user']['id']))
        mysql.connection.commit()
        cursor.close()
        return jsonify({'status': 'success', 'message': 'Ghi sổ quỹ thu chi thành công!'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)