const API_BASE_URL = 'http://127.0.0.1:5000/api';

class ApiClient {
  static getHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  static async request(endpoint, options = {}) {
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`Đường dẫn API '${endpoint}' không tồn tại trên Server (Mã lỗi ${response.status})!`);
      }

      if (response.status === 401 || response.status === 403) {
        localStorage.clear();
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
          window.location.href = '/index.html';
        }
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Lỗi xử lý yêu cầu!');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      alert(error.message || 'Không thể kết nối tới Server!');
      throw error;
    }
  }

  static get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
  static post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
  static put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
  static delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}