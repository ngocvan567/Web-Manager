from flask import Blueprint, request, jsonify, current_app
from utils import token_required

member_bp = Blueprint('member', __name__)

def get_db():
    return current_app.extensions['mysql']

@member_bp.route('/active-attendance', methods=['GET'])
@token_required
def get_active_attendance(current_user):
    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT event_id, title FROM events ORDER BY start_time DESC LIMIT 1")
        event = cursor.fetchone()
        cursor.close()

        if event:
            return jsonify({
                'is_open': True,
                'id': event['event_id'],
                'event_name': event['title']
            }), 200
        
        return jsonify({'is_open': False}), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi hệ thống: {str(e)}'}), 500


@member_bp.route('/attendance', methods=['POST'])
@token_required
def do_attendance(current_user):
    data = request.get_json() or {}
    event_id = data.get('session_id') or data.get('event_id')
    user_id = current_user.get('user_id') or current_user.get('id')

    if not event_id:
        return jsonify({'message': 'Thiếu ID phiên điểm danh!'}), 400

    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        query = """
            INSERT INTO event_attendance (event_id, user_id, attendance_status, check_in_time)
            VALUES (%s, %s, 'Present', NOW())
            ON DUPLICATE KEY UPDATE attendance_status = 'Present', check_in_time = NOW()
        """
        cursor.execute(query, (event_id, user_id))
        mysql.connection.commit()
        cursor.close()

        return jsonify({'message': 'Điểm danh thành công!'}), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi điểm danh: {str(e)}'}), 500