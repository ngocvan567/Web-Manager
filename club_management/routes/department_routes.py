from flask import Blueprint, jsonify
from auth import login_required, admin_required
from database import query_db, execute_db
from utils import data

department_bp=Blueprint("departments",__name__)

@department_bp.get("/departments")
@login_required
def get_all():
    rows=query_db("""SELECT d.*,COUNT(m.user_id) member_count
        FROM departments d LEFT JOIN members m ON m.department_id=d.department_id
        GROUP BY d.department_id ORDER BY d.department_id""")
    return jsonify({"success":True,"data":rows})

@department_bp.get("/departments/<int:did>")
@login_required
def get_one(did):
    d=query_db("SELECT * FROM departments WHERE department_id=%s",(did,),one=True)
    if not d:return jsonify({"success":False,"message":"Không tìm thấy ban"}),404
    d["members"]=query_db("""SELECT u.id,u.full_name,u.email,u.role,m.student_code,
        m.course,m.position FROM members m JOIN users u ON u.id=m.user_id
        WHERE m.department_id=%s""",(did,))
    return jsonify({"success":True,"data":d})

@department_bp.post("/departments")
@admin_required
def create():
    d=data()
    if not d.get("department_name"):return jsonify({"success":False,"message":"Thiếu department_name"}),400
    try:
        i=execute_db("INSERT INTO departments(department_name,description) VALUES(%s,%s)",
                     (d["department_name"],d.get("description")))
    except Exception:return jsonify({"success":False,"message":"Tên ban đã tồn tại"}),409
    return jsonify({"success":True,"id":i}),201

@department_bp.put("/departments/<int:did>")
@admin_required
def update(did):
    d=data()
    execute_db("UPDATE departments SET department_name=%s,description=%s WHERE department_id=%s",
               (d.get("department_name"),d.get("description"),did))
    return jsonify({"success":True})

@department_bp.delete("/departments/<int:did>")
@admin_required
def delete(did):
    if did==1:return jsonify({"success":False,"message":"Không được xóa 'Không có ban'"}),400
    execute_db("UPDATE members SET department_id=1 WHERE department_id=%s",(did,))
    execute_db("DELETE FROM departments WHERE department_id=%s",(did,))
    return jsonify({"success":True})


@department_bp.get("/departments/<int:did>/members")
@login_required
def members_by_department(did):
    rows = query_db("""SELECT u.id,u.full_name,u.email,u.role,m.student_code,
        m.course,m.position,d.department_name
        FROM members m JOIN users u ON u.id=m.user_id
        LEFT JOIN departments d ON d.department_id=m.department_id
        WHERE m.department_id=%s ORDER BY u.full_name""", (did,))
    return jsonify({"success": True, "data": rows})


@department_bp.put("/departments/<int:did>/leader")
@admin_required
def set_leader(did):
    uid = data().get("member_id")
    if not uid:
        return jsonify({"success": False, "message": "Thiếu member_id"}), 400
    execute_db("UPDATE members SET position='Trưởng ban' WHERE user_id=%s AND department_id=%s", (uid, did))
    return jsonify({"success": True})


@department_bp.put("/departments/<int:did>/vice-leader")
@admin_required
def set_vice_leader(did):
    uid = data().get("member_id")
    if not uid:
        return jsonify({"success": False, "message": "Thiếu member_id"}), 400
    execute_db("UPDATE members SET position='Phó ban' WHERE user_id=%s AND department_id=%s", (uid, did))
    return jsonify({"success": True})
