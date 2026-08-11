import os
from flask import Flask, jsonify, send_from_directory, render_template_string, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from database import close_db
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.department_routes import department_bp
from routes.event_routes import event_bp
from routes.announcement_routes import announcement_bp
from routes.financial_routes import financial_bp
from routes.attendance_routes import attendance_bp
from routes.extra_routes import extra_bp
from auth import admin_required
from database import query_db, execute_db

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(user_bp, url_prefix="/api")
app.register_blueprint(department_bp, url_prefix="/api")
app.register_blueprint(event_bp, url_prefix="/api")
app.register_blueprint(announcement_bp, url_prefix="/api")
app.register_blueprint(financial_bp, url_prefix="/api")
app.register_blueprint(attendance_bp, url_prefix="/api")

app.register_blueprint(extra_bp, url_prefix="/api")


def ensure_optional_schema():
    """Add only the small compatibility pieces required by the new UI."""
    try:
        with app.app_context():
            exists = query_db("""SELECT COUNT(*) c FROM information_schema.columns
                WHERE table_schema=%s AND table_name='users' AND column_name='status'""",
                (app.config["DB_NAME"],), one=True)
            if int((exists or {}).get("c") or 0) == 0:
                execute_db("ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
            execute_db("""CREATE TABLE IF NOT EXISTS attendance_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                session_date DATETIME NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4""")
    except Exception as exc:
        # The server can still start; the backend GUI will display the DB error.
        print("[DB SETUP WARNING]", exc)




BACKEND_HTML = """
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Backend Console - Club Management</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f7fb;color:#172033}
header{background:linear-gradient(135deg,#172554,#1d4ed8);color:#fff;padding:22px 6%;display:flex;justify-content:space-between;align-items:center}
main{max-width:1200px;margin:28px auto;padding:0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
.card{background:#fff;padding:22px;border-radius:16px;box-shadow:0 6px 24px #00000012}.muted{color:#64748b}.ok{color:#15803d;font-weight:700}.bad{color:#b91c1c;font-weight:700}
button{border:0;border-radius:10px;padding:10px 15px;background:#1d4ed8;color:#fff;cursor:pointer}.danger{background:#b91c1c}
input{width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:9px;margin:6px 0 12px}
table{width:100%;border-collapse:collapse;margin-top:14px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:14px}th{background:#f8fafc}
.badge{display:inline-block;padding:4px 8px;border-radius:99px;background:#e0e7ff;color:#3730a3;font-size:12px}
.hidden{display:none}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.toolbar button{background:#334155}
</style></head>
<body>
<header><div><b>🎓 Club Management Backend Console</b><div style="opacity:.8">Flask API · MySQL · Giao diện quản trị Database</div></div><a href="/" style="color:#fff">← Website</a></header>
<main>
<section id="loginBox" class="card">
<h2>Đăng nhập Backend</h2><p class="muted">Chỉ tài khoản có role <b>ADMIN</b> trong MySQL mới được xem dữ liệu database.</p>
<input id="loginUser" placeholder="Username hoặc Email"><input id="loginPass" type="password" placeholder="Mật khẩu">
<button onclick="login()">Đăng nhập</button><p id="loginMsg" class="bad"></p>
</section>
<section id="console" class="hidden">
<div class="toolbar"><button onclick="loadOverview()">Tổng quan DB</button><button onclick="loadTable('users')">Tài khoản</button><button onclick="loadTable('members')">Thành viên</button><button onclick="loadTable('departments')">Các ban</button><button onclick="loadTable('events')">Sự kiện</button><button onclick="loadTable('announcements')">Thông báo</button><button onclick="loadTable('financials')">Tài chính</button><button class="danger" onclick="logout()">Đăng xuất</button></div>
<div id="status"></div><div id="content"></div>
</section>
</main>
<script>
const tokenKey='backend_admin_token';
const token=()=>sessionStorage.getItem(tokenKey);
async function api(url,opts={}){opts.headers={...(opts.headers||{}),'Content-Type':'application/json','Authorization':'Bearer '+token()};const r=await fetch(url,opts);const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch(e){throw Error('Backend trả về dữ liệu không hợp lệ (HTTP '+r.status+')')};if(!r.ok)throw Error(d.message||('HTTP '+r.status));return d}
async function login(){const msg=document.getElementById('loginMsg');msg.textContent='';try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('loginUser').value,password:document.getElementById('loginPass').value})});const t=await r.text();let d={};try{d=t?JSON.parse(t):{}}catch(e){throw Error('Backend không trả JSON')};if(!r.ok)throw Error(d.message||'Đăng nhập thất bại');if(String(d.user.role).toLowerCase()!=='admin')throw Error('Tài khoản này không có quyền Admin');sessionStorage.setItem(tokenKey,d.token);document.getElementById('loginBox').classList.add('hidden');document.getElementById('console').classList.remove('hidden');loadOverview()}catch(e){msg.textContent=e.message}}
function logout(){sessionStorage.removeItem(tokenKey);location.reload()}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
async function loadOverview(){try{const d=await api('/api/admin/database/overview');document.getElementById('status').innerHTML='<div class="grid">'+d.data.cards.map(c=>'<div class="card"><h3>'+esc(c.label)+'</h3><h1>'+esc(c.value)+'</h1></div>').join('')+'</div>';document.getElementById('content').innerHTML='<div class="card"><h2>Kết nối MySQL</h2><p class="ok">● Đã kết nối database: '+esc(d.data.database)+'</p><p class="muted">Host: '+esc(d.data.host)+' · Port: '+esc(d.data.port)+'</p></div>'}catch(e){document.getElementById('status').innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}}
async function loadTable(name){try{const d=await api('/api/admin/database/table/'+name);const rows=d.data.rows;const cols=d.data.columns;document.getElementById('content').innerHTML='<div class="card"><h2>'+esc(d.data.label)+'</h2><p class="muted">Chỉ đọc · dữ liệu lấy trực tiếp từ MySQL</p><div style="overflow:auto"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>'<td>'+esc(r[c])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></div>'}catch(e){document.getElementById('content').innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}}
if(token()){document.getElementById('loginBox').classList.add('hidden');document.getElementById('console').classList.remove('hidden');loadOverview()}
</script></body></html>
"""



DB_TABLES = {
    "users": ("Tài khoản", "SELECT id,username,full_name,email,role,status FROM users ORDER BY id DESC LIMIT 200"),
    "members": ("Thành viên", "SELECT m.user_id,m.student_code,m.full_name,m.email,m.course,m.department_id,m.position FROM members m ORDER BY m.user_id DESC LIMIT 200"),
    "departments": ("Các ban", "SELECT department_id,department_name,description FROM departments ORDER BY department_id"),
    "events": ("Sự kiện", "SELECT event_id,title,location,start_time,end_time,host_by FROM events ORDER BY start_time DESC LIMIT 200"),
    "announcements": ("Thông báo", "SELECT announcement_id,title,status,publish_date,created_by FROM announcements ORDER BY announcement_id DESC LIMIT 200"),
    "financials": ("Tài chính", "SELECT transaction_id,amount,transaction_type,description,reference_event_id,created_by,created_at FROM financials ORDER BY transaction_id DESC LIMIT 200"),
}

@app.get("/api/admin/database/overview")
@admin_required
def database_overview():
    cards = []
    for key, (label, sql) in DB_TABLES.items():
        try:
            table = key
            row = query_db(f"SELECT COUNT(*) AS c FROM {table}", one=True)
            cards.append({"label": label, "value": int((row or {}).get("c") or 0)})
        except Exception:
            cards.append({"label": label, "value": "N/A"})
    return jsonify({"success": True, "data": {
        "database": app.config["DB_NAME"], "host": app.config["DB_HOST"],
        "port": app.config["DB_PORT"], "cards": cards
    }})

@app.get("/api/admin/database/table/<table_name>")
@admin_required
def database_table(table_name):
    if table_name not in DB_TABLES:
        return jsonify({"success": False, "message": "Bảng không được phép xem"}), 404
    label, sql = DB_TABLES[table_name]
    rows = query_db(sql)
    cols = list(rows[0].keys()) if rows else []
    return jsonify({"success": True, "data": {"label": label, "columns": cols, "rows": rows}})

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/backend")
def backend_dashboard():
    return render_template_string(BACKEND_HTML)

@app.route("/backend/")
def backend_dashboard_slash():
    return render_template_string(BACKEND_HTML)

@app.route("/<path:path>")
def frontend_files(path):
    # API routes are handled by the registered blueprints above.
    # This catch-all only serves the frontend files.
    full_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.errorhandler(404)
def not_found(error):
    if str(request.path).startswith("/api/"):
        return jsonify({"success": False, "message": "API không tồn tại"}), 404
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.errorhandler(500)
def server_error(error):
    if str(request.path).startswith("/api/"):
        return jsonify({"success": False, "message": "Lỗi máy chủ hoặc database. Kiểm tra Terminal của Flask."}), 500
    return render_template_string("<h1>500 - Lỗi máy chủ</h1><p>Kiểm tra Terminal của Flask.</p>"), 500

@app.teardown_appcontext
def teardown(exception=None):
    close_db()

if __name__ == "__main__":
    ensure_optional_schema()
    app.run(host="0.0.0.0", port=5500, debug=True)
