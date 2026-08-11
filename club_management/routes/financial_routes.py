from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity
from auth import admin_required
from database import query_db, execute_db
from utils import data

financial_bp=Blueprint("financials",__name__)

@financial_bp.get("/financials")
@admin_required
def all_financials():
    return jsonify({"success":True,"data":query_db("""SELECT f.*,u.full_name creator_name,e.title event_title
        FROM financials f LEFT JOIN users u ON u.id=f.created_by
        LEFT JOIN events e ON e.event_id=f.reference_event_id ORDER BY f.created_at DESC""")})

@financial_bp.get("/financials/summary")
@admin_required
def summary():
    return jsonify({"success":True,"data":query_db("""SELECT
        COALESCE(SUM(CASE WHEN transaction_type='Thu' THEN amount ELSE 0 END),0) total_income,
        COALESCE(SUM(CASE WHEN transaction_type='Chi' THEN amount ELSE 0 END),0) total_expense,
        COALESCE(SUM(CASE WHEN transaction_type='Thu' THEN amount ELSE -amount END),0) balance
        FROM financials""",one=True)})

@financial_bp.post("/financials")
@admin_required
def create():
    d=data()
    for k in ["amount","transaction_type","description"]:
        if d.get(k) in (None,""):return jsonify({"success":False,"message":"Thiếu "+k}),400
    i=execute_db("""INSERT INTO financials(amount,transaction_type,description,reference_event_id,created_by)
        VALUES(%s,%s,%s,%s,%s)""",(d["amount"],d["transaction_type"],d["description"],d.get("reference_event_id"),get_jwt_identity()))
    return jsonify({"success":True,"id":i}),201

@financial_bp.put("/financials/<int:tid>")
@admin_required
def update(tid):
    d=data()
    execute_db("""UPDATE financials SET amount=%s,transaction_type=%s,description=%s,
        reference_event_id=%s WHERE transaction_id=%s""",(d.get("amount"),d.get("transaction_type"),d.get("description"),d.get("reference_event_id"),tid))
    return jsonify({"success":True})

@financial_bp.delete("/financials/<int:tid>")
@admin_required
def delete(tid):
    execute_db("DELETE FROM financials WHERE transaction_id=%s",(tid,))
    return jsonify({"success":True})
