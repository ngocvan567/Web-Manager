from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from auth import login_required, admin_required
from database import query_db, execute_db
from utils import data

event_bp=Blueprint("events",__name__)

EVENT_SQL = """SELECT e.*, e.event_id AS id, e.title AS name, e.start_time AS date,
    COALESCE((SELECT COUNT(*) FROM event_attendance ea WHERE ea.event_id=e.event_id),0) AS registered_count,
    u.full_name AS host_name
    FROM events e LEFT JOIN users u ON u.id=e.host_by"""


@event_bp.get("/events")
@login_required
def all_events():
    rows = query_db(EVENT_SQL + " ORDER BY e.start_time DESC")
    return jsonify({"success":True,"data":rows})


@event_bp.get("/events/<int:eid>")
@login_required
def one_event(eid):
    e=query_db(EVENT_SQL+" WHERE e.event_id=%s",(eid,),one=True)
    if not e:return jsonify({"success":False,"message":"Không tìm thấy sự kiện"}),404
    rows=query_db("""SELECT ea.user_id AS id,ea.attendance_status AS status,
        u.full_name AS name,u.email,m.student_code AS mssv,
        m.department_id,d.department_name AS department
        FROM event_attendance ea JOIN users u ON u.id=ea.user_id
        LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id
        WHERE ea.event_id=%s""",(eid,))
    e["registrations"]=rows
    e["attendance"]=rows
    return jsonify({"success":True,"data":e})


@event_bp.post("/events")
@admin_required
def create():
    d=data()
    if not d.get("title") and not d.get("name"):
        return jsonify({"success":False,"message":"Thiếu tên sự kiện"}),400
    i=execute_db("""INSERT INTO events(title,description,location,start_time,end_time,host_by)
        VALUES(%s,%s,%s,%s,%s,%s)""",
        (d.get("title") or d.get("name"),d.get("description"),d.get("location"),
         d.get("start_time") or d.get("date"),d.get("end_time") or d.get("date"),
         d.get("host_by") or get_jwt_identity()))
    return jsonify({"success":True,"id":i}),201


@event_bp.put("/events/<int:eid>")
@admin_required
def update(eid):
    d=data()
    execute_db("""UPDATE events SET title=%s,description=%s,location=%s,start_time=%s,end_time=%s
        WHERE event_id=%s""",
        (d.get("title") or d.get("name"),d.get("description"),d.get("location"),
         d.get("start_time") or d.get("date"),d.get("end_time") or d.get("date"),eid))
    return jsonify({"success":True})


@event_bp.delete("/events/<int:eid>")
@admin_required
def delete(eid):
    execute_db("DELETE FROM event_attendance WHERE event_id=%s",(eid,))
    execute_db("DELETE FROM events WHERE event_id=%s",(eid,))
    return jsonify({"success":True})


@event_bp.post("/events/<int:eid>/cancel")
@admin_required
def cancel(eid):
    # Keep the event row; use a compatible status only if the column exists.
    try:
        execute_db("UPDATE events SET status='CANCELLED' WHERE event_id=%s",(eid,))
    except Exception:
        return jsonify({"success":False,"message":"Sự kiện không có cột status trong database"}),400
    return jsonify({"success":True})


@event_bp.get("/events/<int:eid>/registrations")
@admin_required
def registrations(eid):
    rows=query_db("""SELECT ea.user_id AS id,ea.user_id,ea.attendance_status AS status,
        u.full_name AS name,u.email,m.student_code AS mssv,
        m.department_id,d.department_name AS department
        FROM event_attendance ea JOIN users u ON u.id=ea.user_id
        LEFT JOIN members m ON m.user_id=u.id
        LEFT JOIN departments d ON d.department_id=m.department_id
        WHERE ea.event_id=%s ORDER BY u.full_name""",(eid,))
    for r in rows:
        r["role"] = str(r.get("role") or "MEMBER").upper()
    return jsonify({"success":True,"data":rows})


@event_bp.get("/events/<int:eid>/stats")
@admin_required
def stats(eid):
    row=query_db("""SELECT
        COUNT(*) total,
        SUM(attendance_status='Present') present_count,
        SUM(attendance_status='Absent') absent_count,
        SUM(attendance_status='Registered') registered_count
        FROM event_attendance WHERE event_id=%s""",(eid,),one=True)
    return jsonify({"success":True,"data":row or {}})
