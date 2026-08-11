from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from auth import login_required, admin_required
from database import query_db, execute_db
from utils import data

announcement_bp=Blueprint("announcements",__name__)

@announcement_bp.get("/announcements")
@login_required
def published():
    return jsonify({"success":True,"data":query_db("""SELECT a.*,u.full_name creator_name
        FROM announcements a LEFT JOIN users u ON u.id=a.created_by
        WHERE a.status='Đã đăng' ORDER BY a.publish_date DESC""")})

@announcement_bp.get("/announcements/all")
@admin_required
def all_items():
    return jsonify({"success":True,"data":query_db("""SELECT a.*,u.full_name creator_name
        FROM announcements a LEFT JOIN users u ON u.id=a.created_by ORDER BY a.created_at DESC""")})

@announcement_bp.post("/announcements")
@admin_required
def create():
    d=data()
    if not d.get("title") or not d.get("content"):
        return jsonify({"success":False,"message":"Thiếu title/content"}),400
    i=execute_db("""INSERT INTO announcements(title,content,created_by,publish_date,status)
        VALUES(%s,%s,%s,%s,%s)""",(d["title"],d["content"],get_jwt_identity(),d.get("publish_date"),d.get("status","Đã đăng")))
    return jsonify({"success":True,"id":i}),201

@announcement_bp.put("/announcements/<int:aid>")
@admin_required
def update(aid):
    d=data()
    execute_db("""UPDATE announcements SET title=%s,content=%s,publish_date=%s,status=%s
        WHERE announcement_id=%s""",(d.get("title"),d.get("content"),d.get("publish_date"),d.get("status","Đã đăng"),aid))
    return jsonify({"success":True})

@announcement_bp.delete("/announcements/<int:aid>")
@admin_required
def delete(aid):
    execute_db("DELETE FROM announcements WHERE announcement_id=%s",(aid,))
    return jsonify({"success":True})
