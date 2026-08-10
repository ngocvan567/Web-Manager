import os
from flask import Flask, jsonify, render_template
from flask_mysqldb import MySQL
from flask_cors import CORS
from config import Config

app = Flask(
    __name__, 
    template_folder='../web', 
    static_folder='../web', 
    static_url_path=''
)

app.config.from_object(Config)

# Cấu hình CORS mở rộng cho phép API
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Khởi tạo MySQL chính
mysql = MySQL(app)

# Import Blueprints sau khi khởi tạo app
from routes.auth import auth_bp
from routes.member import member_bp
from routes.admin import admin_bp

# Đăng ký Blueprint với Prefix phân biệt rõ ràng
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(member_bp, url_prefix='/api/member')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/test-db')
def test_db():
    try:
        cur = mysql.connection.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        return jsonify({
            "status": "success", 
            "message": "Kết nối thành công tới MySQL Server!"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error", 
            "message": f"Lỗi kết nối MySQL: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)