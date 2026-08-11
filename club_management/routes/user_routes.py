from flask import Blueprint, jsonify
from werkzeug.security import generate_password_hash
from flask_jwt_extended import get_jwt_identity
from auth import login_required, admin_required
from database import query_db, execute_db
from utils import data

user_bp = Blueprint("users", __name__)

BASE_SQL = """SELECT u.id,u.username,u.full_name,u.email,
    LOWER(COALESCE(u.role,'member')) AS role,
    COALESCE(u.status,'ACTIVE') AS status,
    u.created_at,u.updated_at,
    m.student_code,m.course,m.department_id,m.position,
    d.department_name
    FROM users u
    LEFT JOIN members m ON m.user_id=u.id
    LEFT JOIN departments d ON d.department_id=m.department_id"""


def _department_id(value):
    if value in (None, "", "null"):
        return 1
    try:
        return int(value)
    except (TypeError, ValueError):
        aliases = {
            "ACADEMIC": "Học thuật", "OPERATION": "Vận hành",
            "ADVISORY": "Cố vấn", "EXECUTIVE": "Chủ nhiệm",
        }
        name = aliases.get(str(value).strip().upper())
        if name:
            row = query_db(
                "SELECT department_id FROM departments WHERE department_name LIKE %s LIMIT 1",
                (f"%{name}%",), one=True)
            if row:
                return row["department_id"]
    return 1


def _normalize(row):
    if not row:
        return row
    row = dict(row)
    row["role"] = str(row.get("role") or "member").upper()
    row["status"] = str(row.get("status") or "ACTIVE").upper()
    row["name"] = row.get("full_name") or ""
    row["mssv"] = row.get("student_code") or ""
    row["department"] = row.get("department_name") or row.get("department_id")
    return row


@user_bp.get("/users")
@admin_required
def users():
    rows = query_db(BASE_SQL + " ORDER BY u.id")
    return jsonify({"success": True, "data": [_normalize(r) for r in rows]})


@user_bp.get("/users/<int:uid>")
@admin_required
def user(uid):
    row = query_db(BASE_SQL + " WHERE u.id=%s", (uid,), one=True)
    if not row:
        return jsonify({"success": False, "message": "Không tìm thấy tài khoản"}), 404
    return jsonify({"success": True, "data": _normalize(row)})


@user_bp.get("/members")
@admin_required
def members():
    rows = query_db(BASE_SQL + " ORDER BY u.id")
    return jsonify({"success": True, "data": [_normalize(r) for r in rows]})


@user_bp.get("/members/<int:uid>")
@admin_required
def member(uid):
    row = query_db(BASE_SQL + " WHERE u.id=%s", (uid,), one=True)
    if not row:
        return jsonify({"success": False, "message": "Không tìm thấy member"}), 404
    return jsonify({"success": True, "data": _normalize(row)})


def _create(d):
    username = d.get("username") or d.get("mssv") or d.get("student_code")
    full_name = d.get("full_name") or d.get("name")
    email = d.get("email")
    password = d.get("password")
    role = str(d.get("role") or "member").strip().lower()
    if role not in ("admin", "member"):
        return jsonify({"success": False, "message": "Role chỉ được admin hoặc member"}), 400
    if not all([username, full_name, email, password]):
        return jsonify({"success": False, "message": "Thiếu username/MSSV, họ tên, email hoặc mật khẩu"}), 400
    if len(password) < 6:
        return jsonify({"success": False, "message": "Mật khẩu tối thiểu 6 ký tự"}), 400
    if query_db("SELECT id FROM users WHERE username=%s OR email=%s", (username, email), one=True):
        return jsonify({"success": False, "message": "Username/email đã tồn tại"}), 409

    hashed = generate_password_hash(password)
    try:
        uid = execute_db(
            """INSERT INTO users(username,password,full_name,email,role,status)
               VALUES(%s,%s,%s,%s,%s,'ACTIVE')""",
            (username, hashed, full_name, email, role))
    except Exception:
        uid = execute_db(
            """INSERT INTO users(id,username,password,full_name,email,role)
               SELECT COALESCE(MAX(id),0)+1,%s,%s,%s,%s,%s FROM users""",
            (username, hashed, full_name, email, role))

    dept = _department_id(d.get("department_id"))
    try:
        execute_db(
            """INSERT INTO members(user_id,student_code,full_name,email,course,department_id,position)
               VALUES(%s,%s,%s,%s,%s,%s,%s)""",
            (uid, d.get("mssv") or d.get("student_code"), full_name, email,
             d.get("course"), dept, d.get("position") or "Thành Viên"))
    except Exception:
        pass
    return jsonify({"success": True, "id": uid, "message": "Tạo tài khoản thành công"}), 201


@user_bp.post("/users")
@admin_required
def create_user():
    return _create(data())


@user_bp.post("/members")
@admin_required
def create_member():
    return _create(data())


def _update_user(uid, d):
    if not query_db("SELECT id FROM users WHERE id=%s", (uid,), one=True):
        return jsonify({"success": False, "message": "Không tìm thấy tài khoản"}), 404

    fields, vals = [], []
    if d.get("username") or d.get("mssv"):
        fields.append("username=%s"); vals.append(d.get("username") or d.get("mssv"))
    if "full_name" in d or "name" in d:
        fields.append("full_name=%s"); vals.append(d.get("full_name") or d.get("name"))
    if "email" in d:
        fields.append("email=%s"); vals.append(d["email"])
    if "role" in d:
        role = str(d["role"]).strip().lower()
        if role not in ("admin", "member"):
            return jsonify({"success": False, "message": "Role không hợp lệ"}), 400
        fields.append("role=%s"); vals.append(role)
    if d.get("password"):
        fields.append("password=%s"); vals.append(generate_password_hash(d["password"]))

    if fields:
        execute_db("UPDATE users SET " + ",".join(fields) + " WHERE id=%s", tuple(vals + [uid]))

    exists = query_db("SELECT user_id FROM members WHERE user_id=%s", (uid,), one=True)
    mf, mv = [], []
    if "mssv" in d: mf.append("student_code=%s"); mv.append(d["mssv"])
    if "student_code" in d: mf.append("student_code=%s"); mv.append(d["student_code"])
    if "name" in d or "full_name" in d:
        mf.append("full_name=%s"); mv.append(d.get("full_name") or d.get("name"))
    if "email" in d: mf.append("email=%s"); mv.append(d["email"])
    if "course" in d: mf.append("course=%s"); mv.append(d["course"])
    if "position" in d: mf.append("position=%s"); mv.append(d["position"])
    if "department_id" in d:
        mf.append("department_id=%s"); mv.append(_department_id(d["department_id"]))

    if mf:
        try:
            if exists:
                execute_db("UPDATE members SET " + ",".join(mf) + " WHERE user_id=%s", tuple(mv + [uid]))
            else:
                execute_db("""INSERT INTO members(user_id,student_code,full_name,email,department_id,position)
                              SELECT id,username,full_name,email,1,'Thành Viên' FROM users WHERE id=%s""", (uid,))
                execute_db("UPDATE members SET " + ",".join(mf) + " WHERE user_id=%s", tuple(mv + [uid]))
        except Exception:
            pass
    return jsonify({"success": True, "message": "Cập nhật thành công"})


@user_bp.put("/users/<int:uid>")
@admin_required
def update_user(uid):
    return _update_user(uid, data())


@user_bp.put("/members/<int:uid>")
@admin_required
def update_member(uid):
    return _update_user(uid, data())


@user_bp.put("/users/<int:uid>/role")
@admin_required
def change_role(uid):
    role = str(data().get("role") or "").strip().lower()
    if role not in ("admin", "member"):
        return jsonify({"success": False, "message": "Role không hợp lệ"}), 400
    if str(get_jwt_identity()) == str(uid) and role != "admin":
        return jsonify({"success": False, "message": "Không thể tự hạ quyền Admin đang đăng nhập"}), 400
    execute_db("UPDATE users SET role=%s WHERE id=%s", (role, uid))
    return jsonify({"success": True, "message": "Đã cập nhật quyền"})


@user_bp.put("/users/<int:uid>/status")
@admin_required
def change_status(uid):
    status = str(data().get("status") or "ACTIVE").upper()
    if status not in ("ACTIVE", "INACTIVE", "LOCKED"):
        return jsonify({"success": False, "message": "Status không hợp lệ"}), 400
    try:
        execute_db("UPDATE users SET status=%s WHERE id=%s", (status, uid))
    except Exception:
        return jsonify({"success": False, "message": "Database chưa có cột users.status. Hãy chạy database_setup.sql"}), 500
    return jsonify({"success": True, "message": "Đã cập nhật trạng thái"})


@user_bp.post("/users/<int:uid>/reset-password")
@admin_required
def reset_password(uid):
    if not query_db("SELECT id FROM users WHERE id=%s", (uid,), one=True):
        return jsonify({"success": False, "message": "Không tìm thấy tài khoản"}), 404
    execute_db("UPDATE users SET password=%s WHERE id=%s",
               (generate_password_hash("123456"), uid))
    return jsonify({"success": True, "message": "Mật khẩu mới: 123456"})


@user_bp.delete("/users/<int:uid>")
@admin_required
def delete_user(uid):
    if str(get_jwt_identity()) == str(uid):
        return jsonify({"success": False, "message": "Không thể tự xóa tài khoản đang đăng nhập"}), 400
    execute_db("DELETE FROM members WHERE user_id=%s", (uid,))
    execute_db("DELETE FROM users WHERE id=%s", (uid,))
    return jsonify({"success": True, "message": "Xóa thành công"})


@user_bp.delete("/members/<int:uid>")
@admin_required
def delete_member(uid):
    return delete_user(uid)


def _change_department(uid, method):
    d = data()
    if not query_db("SELECT id FROM users WHERE id=%s",(uid,),one=True):
        return jsonify({"success":False,"message":"Không tìm thấy thành viên"}),404
    dept = _department_id(d.get("department_id"))
    execute_db("UPDATE members SET department_id=%s WHERE user_id=%s",(dept,uid))
    return jsonify({"success":True,"message":"Đã cập nhật ban"})


@user_bp.post("/members/<int:uid>/department")
@admin_required
def add_department(uid):
    return _change_department(uid, "POST")


@user_bp.put("/members/<int:uid>/department")
@admin_required
def change_department(uid):
    return _change_department(uid, "PUT")


@user_bp.delete("/members/<int:uid>/department")
@admin_required
def remove_department(uid):
    execute_db("UPDATE members SET department_id=1 WHERE user_id=%s",(uid,))
    return jsonify({"success":True,"message":"Đã xóa thành viên khỏi ban"})
