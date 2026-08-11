from flask import request

def data():
    return request.get_json(silent=True) or {}
