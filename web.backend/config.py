import os
from MySQLdb.cursors import DictCursor

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'clb_management_secret_key_2026'
    
    MYSQL_HOST = 'localhost'
    MYSQL_PORT = 3300  # Phải là kiểu int
    MYSQL_USER = 'root'
    MYSQL_PASSWORD = '123456'
    MYSQL_DB = 'club_management'
    MYSQL_CURSORCLASS = DictCursor