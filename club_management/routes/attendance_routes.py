from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from auth import login_required, admin_required
from database import query_db, execute_db
from utils import data

attendance_bp=Blueprint("attendance",__name__)

def ensure_sessions_table():
    execute_db("""CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        session_date DATETIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")


@attendance_bp.get("/attendance")
@admin_required
def all_sessions():
    ensure_sessions_table()
    rows=query_db("""SELECT s.id,s.event_id,s.session_date AS date,s.status,
        e.title AS event_name,
        COALESCE(SUM(ea.attendance_status='Present'),0) present_count,
        COALESCE(SUM(ea.attendance_status='Absent'),0) absent_count
        FROM attendance_sessions s
        LEFT JOIN events e ON e.event_id=s.event_id
        LEFT JOIN event_attendance ea ON ea.event_id=s.event_id
        GROUP BY s.id,s.event_id,s.session_date,s.status,e.title
        ORDER BY s.session_date DESC""")
    return jsonify({"success":True,"data":rows})


@attendance_bp.post("/attendance")
@admin_required
def create_session():
    ensure_sessions_table()
    d=data()
    if not d.get("event_id") or not d.get("date"):
        return jsonify({"success":False,"message":"Thiếu event_id hoặc date"}),400
    i=execute_db("""INSERT INTO attendance_sessions(event_id,session_date,status)
        VALUES(%s,%s,'OPEN')""",(d["event_id"],d["date"]))
    return jsonify({"success":True,"id":i}),201


@attendance_bp.get("/attendance/<int:sid>")
@admin_required
def get_session(sid):
    ensure_sessions_table()
    s=query_db("""SELECT s.id,s.event_id,s.session_date AS date,s.status,e.title AS event_name
        FROM attendance_sessions s LEFT JOIN events e ON e.event_id=s.event_id
        WHERE s.id=%s""",(sid,),one=True)
    if not s:return jsonify({"success":False,"message":"Không tìm thấy phiên điểm danh"}),404
    rows=query_db("""SELECT u.id,u.full_name AS name,m.student_code AS mssv,
        COALESCE(ea.attendance_status,'Registered') AS status
        FROM members m JOIN users u ON u.id=m.user_id
        LEFT JOIN event_attendance ea ON ea.event_id=%s AND ea.user_id=u.id
        ORDER BY u.full_name""",(s["event_id"],))
    for r in rows:
        if r["status"] == "Present": r["status"]="PRESENT"
        elif r["status"] == "Absent": r["status"]="ABSENT"
        else: r["status"]="PENDING"
    s["members"]=rows
    return jsonify({"success":True,"data":s})


@attendance_bp.post("/attendance/<int:sid>/open")
@admin_required
def open_session(sid):
    ensure_sessions_table()
    execute_db("UPDATE attendance_sessions SET status='OPEN' WHERE id=%s",(sid,))
    return jsonify({"success":True})


@attendance_bp.post("/attendance/<int:sid>/close")
@admin_required
def close_session(sid):
    ensure_sessions_table()
    execute_db("UPDATE attendance_sessions SET status='CLOSED' WHERE id=%s",(sid,))
    return jsonify({"success":True})


@attendance_bp.put("/attendance/<int:sid>/members/<int:uid>")
@admin_required
def update_session_status(sid,uid):
    ensure_sessions_table()
    s=query_db("SELECT event_id FROM attendance_sessions WHERE id=%s",(sid,),one=True)
    if not s:return jsonify({"success":False,"message":"Không tìm thấy phiên điểm danh"}),404
    status=data().get("status") or data().get("attendance_status")
    mapping={"PRESENT":"Present","ABSENT":"Absent","PENDING":"Registered",
             "Present":"Present","Absent":"Absent","Registered":"Registered"}
    status=mapping.get(status)
    if not status:return jsonify({"success":False,"message":"Trạng thái không hợp lệ"}),400
    exists=query_db("SELECT attendance_id FROM event_attendance WHERE event_id=%s AND user_id=%s",
                    (s["event_id"],uid),one=True)
    if exists:
        execute_db("""UPDATE event_attendance SET attendance_status=%s,
            check_in_time=CASE WHEN %s='Present' THEN NOW() ELSE check_in_time END
            WHERE event_id=%s AND user_id=%s""",(status,status,s["event_id"],uid))
    else:
        execute_db("""INSERT INTO event_attendance(event_id,user_id,attendance_status,check_in_time)
            VALUES(%s,%s,%s,CASE WHEN %s='Present' THEN NOW() ELSE NULL END)""",
            (s["event_id"],uid,status,status))
    return jsonify({"success":True})


@attendance_bp.get("/events/<int:eid>/attendance")
@login_required
def get_event_attendance(eid):
    return jsonify({"success":True,"data":query_db("""SELECT ea.*,u.full_name,u.email,
        m.student_code FROM event_attendance ea JOIN users u ON u.id=ea.user_id
        LEFT JOIN members m ON m.user_id=u.id WHERE ea.event_id=%s""",(eid,))})


@attendance_bp.post("/events/<int:eid>/register")
@login_required
def register(eid):
    uid=get_jwt_identity()
    if query_db("SELECT attendance_id FROM event_attendance WHERE event_id=%s AND user_id=%s",(eid,uid),one=True):
        return jsonify({"success":False,"message":"Bạn đã đăng ký"}),409
    execute_db("INSERT INTO event_attendance(event_id,user_id,attendance_status) VALUES(%s,%s,'Registered')",(eid,uid))
    return jsonify({"success":True}),201


@attendance_bp.delete("/events/<int:eid>/register")
@login_required
def cancel(eid):
    execute_db("DELETE FROM event_attendance WHERE event_id=%s AND user_id=%s",(eid,get_jwt_identity()))
    return jsonify({"success":True})


@attendance_bp.get("/attendance/history")
@login_required
def history():
    uid=get_jwt_identity()
    rows=query_db("""SELECT e.title AS event_name,e.start_time AS date,
        ea.attendance_status AS raw_status
        FROM event_attendance ea JOIN events e ON e.event_id=ea.event_id
        WHERE ea.user_id=%s ORDER BY e.start_time DESC""",(uid,))
    for r in rows:
        r["status"]={"Present":"PRESENT","Absent":"ABSENT","Registered":"PENDING"}.get(r.pop("raw_status"),"PENDING")
    return jsonify({"success":True,"data":rows})


@attendance_bp.get("/attendance/rate")
@login_required
def rate():
    uid=get_jwt_identity()
    row=query_db("""SELECT
        COUNT(*) total,
        COALESCE(SUM(attendance_status='Present'),0) present
        FROM event_attendance WHERE user_id=%s""",(uid,),one=True)
    total=int((row or {}).get("total") or 0)
    present=int((row or {}).get("present") or 0)
    return jsonify({"success":True,"data":{"rate": round(present*100/total) if total else 0}})
