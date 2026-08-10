import datetime
import jwt
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config

auth_bp = Blueprint('auth', __name__)

def get_db():
    return current_app.extensions['mysql']

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    student_code = data.get('mssv') or data.get('username')
    password = data.get('password')

    if not student_code or not password:
        return jsonify({'message': 'Vui lòng nhập đầy đủ MSSV/Username và Mật khẩu!'}), 400

    mysql = get_db()
    cursor = mysql.connection.cursor()
    
    query = """
        SELECT u.id, u.username, u.password, u.full_name, u.email, u.role, 
               m.student_code, m.department_id, d.department_name
        FROM users u
        LEFT JOIN members m ON u.id = m.user_id
        LEFT JOIN departments d ON m.department_id = d.department_id
        WHERE m.student_code = %s OR u.username = %s OR u.email = %s
    """
    cursor.execute(query, (student_code, student_code, student_code))
    user = cursor.fetchone()
    cursor.close()

    if not user:
        return jsonify({'message': 'MSSV/Tên đăng nhập hoặc Mật khẩu không đúng!'}), 400

    is_password_valid = False
    if user['password'] == password:
        is_password_valid = True
    else:
        try:
            is_password_valid = check_password_hash(user['password'], password)
        except Exception:
            is_password_valid = False

    if not is_password_valid:
        return jsonify({'message': 'MSSV/Tên đăng nhập hoặc Mật khẩu không đúng!'}), 400

    dept_code_map = {1: 'NONE', 2: 'EXECUTIVE', 3: 'ACADEMIC', 4: 'ADVISORY', 5: 'OPERATION'}
    role_formatted = 'ADMIN' if str(user['role']).lower() == 'admin' else 'MEMBER'

    user_payload = {
        'id': user['id'],
        'mssv': user['student_code'] or user['username'],
        'fullname': user['full_name'],
        'role': role_formatted,
        'department': {
            'id': user['department_id'],
            'name': user['department_name'] or 'Không ban',
            'code': dept_code_map.get(user['department_id'], 'NONE')
        }
    }

    token = jwt.encode({
        'user_id': user['id'],
        'role': str(user['role']).lower(),
        'department_id': user['department_id'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, Config.SECRET_KEY, algorithm="HS256")

    if isinstance(token, bytes):
        token = token.decode('utf-8')

    return jsonify({
        'message': 'Đăng nhập thành công!',
        'access_token': token,
        'user': user_payload
    }), 200


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    mssv = data.get('mssv')
    email = data.get('email')
    password = data.get('password')

    if not mssv or not email or not password:
        return jsonify({'message': 'Vui lòng nhập đầy đủ MSSV, Email và Mật khẩu!'}), 400

    mysql = get_db()
    cursor = mysql.connection.cursor()

    cursor.execute("SELECT * FROM members WHERE student_code = %s AND email = %s", (mssv, email))
    member = cursor.fetchone()
    
    if not member:
        cursor.close()
        return jsonify({'message': 'MSSV hoặc Email chưa có trong danh sách CLB!'}), 400

    cursor.execute("SELECT * FROM users WHERE email = %s OR username = %s", (email, mssv))
    if cursor.fetchone():
        cursor.close()
        return jsonify({'message': 'Tài khoản đã tồn tại!'}), 400

    hashed_password = generate_password_hash(password)

    cursor.execute(
        "INSERT INTO users (username, password, full_name, email, role) VALUES (%s, %s, %s, %s, %s)",
        (mssv, hashed_password, member['full_name'], email, 'member')
    )
    new_user_id = cursor.lastrowid
    
    cursor.execute("UPDATE members SET user_id = %s WHERE student_code = %s", (new_user_id, mssv))
    mysql.connection.commit()
    cursor.close()

    return jsonify({'message': 'Đăng ký thành công!'}), 201