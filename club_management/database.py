import mysql.connector
from flask import current_app, g

def get_db():
    if "db" not in g:
        g.db = mysql.connector.connect(
            host=current_app.config["DB_HOST"],
            port=current_app.config["DB_PORT"],
            user=current_app.config["DB_USER"],
            password=current_app.config["DB_PASSWORD"],
            database=current_app.config["DB_NAME"],
            charset="utf8mb4"
        )
    return g.db

def query_db(sql, params=(), one=False):
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        rows = cur.fetchall()
        return rows[0] if one and rows else (None if one else rows)
    finally:
        cur.close()

def execute_db(sql, params=()):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute(sql, params)
        db.commit()
        return cur.lastrowid
    finally:
        cur.close()

def close_db():
    db = g.pop("db", None)
    if db and db.is_connected():
        db.close()
