from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from auth import login_required, admin_required, member_required
from database import query_db, execute_db
from utils import data

extra_bp = Blueprint("extra", __name__)


@extra_bp.get("/statistics/overview")
@admin_required
def statistics_overview():
    def count(table):
        return int((query_db(f"SELECT COUNT(*) c FROM {table}", one=True) or {}).get("c") or 0)
    total_users = count("users")
    total_members = count("members")
    total_departments = count("departments")
    total_events = count("events")
    total_announcements = count("announcements")
    total_registrations = count("event_attendance")
    row = query_db("""SELECT COUNT(*) total, COALESCE(SUM(attendance_status='Present'),0) present
                      FROM event_attendance""", one=True) or {}
    total = int(row.get("total") or 0)
    present = int(row.get("present") or 0)
    return jsonify({"success":True,"data":{
        "total_users":total_users,"total_members":total_members,
        "total_departments":total_departments,"total_events":total_events,
        "total_announcements":total_announcements,"total_registrations":total_registrations,
        "attendance_rate":round(present*100/total) if total else 0
    }})


@extra_bp.get("/statistics/members")
@admin_required
def statistics_members():
    return jsonify({"success":True,"data":query_db("""SELECT d.department_name,COUNT(m.user_id) count
        FROM departments d LEFT JOIN members m ON m.department_id=d.department_id
        GROUP BY d.department_id,d.department_name ORDER BY d.department_id""")})


@extra_bp.get("/statistics/events")
@admin_required
def statistics_events():
    return jsonify({"success":True,"data":query_db("""SELECT e.event_id AS id,e.title AS name,e.start_time AS date,
        COALESCE(COUNT(ea.attendance_id),0) registered_count
        FROM events e LEFT JOIN event_attendance ea ON ea.event_id=e.event_id
        GROUP BY e.event_id,e.title,e.start_time ORDER BY e.start_time DESC""")})


@extra_bp.get("/statistics/attendance")
@admin_required
def statistics_attendance():
    return jsonify({"success":True,"data":query_db("""SELECT e.title event_name,
        SUM(ea.attendance_status='Present') present_count,
        SUM(ea.attendance_status='Absent') absent_count,
        COUNT(ea.attendance_id) total
        FROM event_attendance ea JOIN events e ON e.event_id=ea.event_id
        GROUP BY e.event_id,e.title ORDER BY e.start_time DESC""")})


@extra_bp.get("/registrations")
@admin_required
def registrations():
    return jsonify({"success":True,"data":query_db("""SELECT ea.attendance_id AS id,ea.event_id,ea.user_id,
        ea.attendance_status AS status,u.full_name AS name,u.email,m.student_code AS mssv,
        e.title AS event_name,e.start_time AS date
        FROM event_attendance ea JOIN users u ON u.id=ea.user_id
        JOIN events e ON e.event_id=ea.event_id
        LEFT JOIN members m ON m.user_id=u.id
        ORDER BY ea.attendance_id DESC""")})


@extra_bp.get("/registrations/event/<int:eid>")
@admin_required
def registrations_event(eid):
    return registrations_for_event(eid)


def registrations_for_event(eid):
    return jsonify({"success":True,"data":query_db("""SELECT ea.attendance_id AS id,ea.event_id,ea.user_id,
        ea.attendance_status AS status,u.full_name AS name,u.email,m.student_code AS mssv,
        e.title AS event_name,e.start_time AS date
        FROM event_attendance ea JOIN users u ON u.id=ea.user_id
        JOIN events e ON e.event_id=ea.event_id LEFT JOIN members m ON m.user_id=u.id
        WHERE ea.event_id=%s ORDER BY ea.attendance_id DESC""",(eid,))})


@extra_bp.post("/registrations/event/<int:eid>")
@member_required
def register_event(eid):
    uid=get_jwt_identity()
    if not query_db("SELECT event_id FROM events WHERE event_id=%s",(eid,),one=True):
        return jsonify({"success":False,"message":"Không tìm thấy sự kiện"}),404
    if query_db("SELECT attendance_id FROM event_attendance WHERE event_id=%s AND user_id=%s",(eid,uid),one=True):
        return jsonify({"success":False,"message":"Bạn đã đăng ký sự kiện này"}),409
    execute_db("INSERT INTO event_attendance(event_id,user_id,attendance_status) VALUES(%s,%s,'Registered')",(eid,uid))
    return jsonify({"success":True,"message":"Đăng ký sự kiện thành công"}),201


@extra_bp.delete("/registrations/event/<int:eid>")
@member_required
def cancel_registration(eid):
    execute_db("DELETE FROM event_attendance WHERE event_id=%s AND user_id=%s",(eid,get_jwt_identity()))
    return jsonify({"success":True,"message":"Hủy đăng ký thành công"})


@extra_bp.get("/registrations/my")
@member_required
def my_registrations():
    uid=get_jwt_identity()
    rows=query_db("""SELECT ea.attendance_id AS id,ea.event_id,ea.attendance_status AS status,
        e.title AS event_name,e.start_time AS date,e.location,e.description
        FROM event_attendance ea JOIN events e ON e.event_id=ea.event_id
        WHERE ea.user_id=%s ORDER BY e.start_time DESC""",(uid,))
    return jsonify({"success":True,"data":rows})


@extra_bp.get("/profile")
@login_required
def profile():
    uid=get_jwt_identity()
    row=query_db("""SELECT u.id,u.username,u.full_name AS name,u.email,
        u.role,u.status,m.student_code AS mssv,m.course,m.department_id,d.department_name,
        m.position FROM users u LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id WHERE u.id=%s""",(uid,),one=True)
    if not row:return jsonify({"success":False,"message":"Không tìm thấy hồ sơ"}),404
    row["role"]=str(row.get("role") or "member").upper()
    row["status"]=str(row.get("status") or "ACTIVE").upper()
    row["department"]=row.get("department_name") or row.get("department_id")
    return jsonify({"success":True,"data":row})


@extra_bp.put("/profile")
@login_required
def update_profile():
    uid=get_jwt_identity(); d=data()
    full_name=d.get("name") or d.get("full_name")
    if full_name:
        execute_db("UPDATE users SET full_name=%s WHERE id=%s",(full_name,uid))
        execute_db("UPDATE members SET full_name=%s WHERE user_id=%s",(full_name,uid))
    if d.get("email"):
        execute_db("UPDATE users SET email=%s WHERE id=%s",(d["email"],uid))
        execute_db("UPDATE members SET email=%s WHERE user_id=%s",(d["email"],uid))
    if "course" in d:
        execute_db("UPDATE members SET course=%s WHERE user_id=%s",(d["course"],uid))
    return jsonify({"success":True,"message":"Cập nhật hồ sơ thành công"})


@extra_bp.post("/profile/change-password")
@login_required
def change_password():
    uid=get_jwt_identity(); d=data()
    current=d.get("current_password"); new=d.get("new_password")
    if not current or not new or len(new)<6:
        return jsonify({"success":False,"message":"Mật khẩu mới phải có ít nhất 6 ký tự"}),400
    row=query_db("SELECT password FROM users WHERE id=%s",(uid,),one=True)
    ok=False
    try: ok=check_password_hash(row["password"] or "",current)
    except Exception: pass
    if not ok and row and row["password"]==current:
        ok=True
    if not ok:return jsonify({"success":False,"message":"Mật khẩu hiện tại không đúng"}),400
    execute_db("UPDATE users SET password=%s WHERE id=%s",(generate_password_hash(new),uid))
    return jsonify({"success":True,"message":"Đổi mật khẩu thành công"})
