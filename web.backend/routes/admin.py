from flask import Blueprint, request, jsonify, current_app
from utils import token_required, admin_required

admin_bp = Blueprint('admin', __name__)

def get_db():
    return current_app.extensions['mysql']

@admin_bp.route('/statistics', methods=['GET'])
@token_required
@admin_required
def get_statistics(current_user):
    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        
        cursor.execute("SELECT COUNT(*) as total FROM members")
        total_members = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM events")
        total_events = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM event_attendance WHERE attendance_status = 'Present'")
        total_present = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as total FROM event_attendance")
        total_registrations = cursor.fetchone()['total']
        
        attendance_rate = round((total_present / total_registrations * 100), 2) if total_registrations > 0 else 0
        cursor.close()

        return jsonify({
            'total_members': total_members,
            'active_members': total_members,
            'total_events': total_events,
            'attendance_rate': attendance_rate
        }), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi thống kê: {str(e)}'}), 500


@admin_bp.route('/members', methods=['GET'])
@token_required
@admin_required
def get_members(current_user):
    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        query = """
            SELECT m.member_id, m.user_id as id, m.student_code as mssv, m.full_name as fullname, 
                   m.email, m.department_id, d.department_name, 'ACTIVE' as status
            FROM members m
            LEFT JOIN departments d ON m.department_id = d.department_id
        """
        cursor.execute(query)
        members = cursor.fetchall()
        cursor.close()
        return jsonify(members), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi lấy danh sách: {str(e)}'}), 500


@admin_bp.route('/members/<int:member_id>/transfer-department', methods=['PUT'])
@token_required
@admin_required
def transfer_department(current_user, member_id):
    data = request.get_json() or {}
    new_dept_id = data.get('department_id')

    if not new_dept_id:
        return jsonify({'message': 'Vui lòng chọn Ban mới!'}), 400

    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        cursor.execute(
            "UPDATE members SET department_id = %s WHERE user_id = %s OR member_id = %s", 
            (new_dept_id, member_id, member_id)
        )
        mysql.connection.commit()
        cursor.close()
        return jsonify({'message': 'Chuyển ban thành công!'}), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi chuyển ban: {str(e)}'}), 500


@admin_bp.route('/departments', methods=['GET'])
@token_required
def get_departments(current_user):
    try:
        mysql = get_db()
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT * FROM departments")
        departments = cursor.fetchall()
        cursor.close()
        return jsonify(departments), 200
    except Exception as e:
        return jsonify({'message': f'Lỗi lấy danh sách ban: {str(e)}'}), 500