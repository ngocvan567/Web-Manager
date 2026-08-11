from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from database import query_db


def _current_user():
    """Always read the current role from MySQL, not only from the JWT claim."""
    uid = get_jwt_identity()
    if uid is None:
        return None
    return query_db(
        "SELECT id, username, email, role FROM users WHERE id=%s",
        (uid,), one=True
    )


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user = _current_user()
            if not user:
                return jsonify({"success": False, "message": "Tài khoản không tồn tại"}), 401
            return fn(*args, **kwargs)
        except Exception:
            return jsonify({"success": False, "message": "Bạn chưa đăng nhập hoặc phiên đã hết hạn"}), 401
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user = _current_user()
            if not user:
                return jsonify({"success": False, "message": "Tài khoản không tồn tại"}), 401
            role = str(user.get("role") or "member").strip().lower()
            if role != "admin":
                return jsonify({"success": False, "message": "Bạn không có quyền Admin"}), 403
            return fn(*args, **kwargs)
        except Exception as exc:
            # Do not leak database details to the browser.
            return jsonify({"success": False, "message": "Không thể xác thực quyền truy cập"}), 401
    return wrapper


def member_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user = _current_user()
            if not user:
                return jsonify({"success": False, "message": "Tài khoản không tồn tại"}), 401
            role = str(user.get("role") or "member").strip().lower()
            if role != "member":
                return jsonify({"success": False, "message": "Khu vực này dành cho Member"}), 403
            return fn(*args, **kwargs)
        except Exception:
            return jsonify({"success": False, "message": "Bạn chưa đăng nhập hoặc phiên đã hết hạn"}), 401
    return wrapper
