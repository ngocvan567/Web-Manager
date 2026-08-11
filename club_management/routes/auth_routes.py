from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from database import query_db, execute_db
from utils import data

auth_bp = Blueprint("auth", __name__)

@auth_bp.post("/register")
def register():
    d = data()
    required = ["username", "password", "full_name", "email"]
    missing = [x for x in required if not d.get(x)]
    if missing:
        return jsonify({"success": False, "message": "Thiếu: " + ", ".join(missing)}), 400
    if len(d["password"]) < 6:
        return jsonify({"success": False, "message": "Mật khẩu tối thiểu 6 ký tự"}), 400

    if query_db("SELECT id FROM users WHERE username=%s OR email=%s",
                (d["username"], d["email"]), one=True):
        return jsonify({"success": False, "message": "Username hoặc email đã tồn tại"}), 409

    new_id = execute_db(
        """INSERT INTO users(id,username,password,full_name,email,role)
        SELECT COALESCE(MAX(id),0)+1,%s,%s,%s,%s,'member' FROM users""",
        (d["username"], generate_password_hash(d["password"]), d["full_name"], d["email"])
    )
    execute_db(
        """INSERT INTO members(user_id,student_code,full_name,email,course,department_id,position)
        VALUES(%s,%s,%s,%s,%s,1,'Thành Viên')""",
        (new_id, d.get("student_code"), d["full_name"], d["email"], d.get("course"))
    )
    user = query_db("""SELECT u.id,u.username,u.full_name,u.email,u.role,
        m.student_code,m.course,m.department_id,m.position,d.department_name
        FROM users u LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id WHERE u.id=%s""",
        (new_id,), one=True)
    token = create_access_token(identity=str(new_id), additional_claims={"role":"member"})
    return jsonify({"success":True,"token":token,"user":user}), 201

@auth_bp.post("/login")
def login():
    d = data()
    key = d.get("username") or d.get("identifier") or d.get("email")
    password = d.get("password")
    if not key or not password:
        return jsonify({"success":False,"message":"Thiếu username/password"}), 400

    u = query_db("""SELECT u.*,m.student_code,m.course,m.department_id,m.position,
        d.department_name FROM users u LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id
        WHERE u.username=%s OR u.email=%s OR m.student_code=%s""", (key,key,key), one=True)
    if not u:
        return jsonify({"success":False,"message":"Sai tài khoản hoặc mật khẩu"}), 401

    ok = False
    try:
        ok = check_password_hash(u["password"] or "", password)
    except Exception:
        pass

    # Tương thích database cũ đang lưu 123456 dạng plaintext.
    if not ok and u["password"] == password:
        ok = True
        execute_db("UPDATE users SET password=%s WHERE id=%s",
                   (generate_password_hash(password), u["id"]))

    if not ok:
        return jsonify({"success":False,"message":"Sai tài khoản hoặc mật khẩu"}), 401

    role = str(u.get("role") or "member").strip().lower()
    if role not in ("admin", "member"):
        role = "member"
    status = str(u.get("status") or "ACTIVE").upper()
    if status in ("LOCKED", "INACTIVE"):
        return jsonify({"success":False,"message":"Tài khoản đang bị khóa hoặc ngừng hoạt động"}), 403
    u.pop("password", None)
    token = create_access_token(identity=str(u["id"]), additional_claims={"role":role})
    return jsonify({"success":True,"token":token,"user":u})

@auth_bp.get("/me")
@jwt_required()
def me():
    uid = get_jwt_identity()
    u = query_db("""SELECT u.id,u.username,u.full_name,u.email,u.role,
        m.student_code,m.course,m.department_id,m.position,d.department_name
        FROM users u LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id WHERE u.id=%s""",
        (uid,), one=True)
    if not u:
        return jsonify({"success":False,"message":"Không tìm thấy tài khoản"}), 404
    return jsonify({"success":True,"user":u})

@auth_bp.post("/logout")
@jwt_required()
def logout():
    return jsonify({"success":True,"message":"Đã đăng xuất. Frontend hãy xóa token."})
