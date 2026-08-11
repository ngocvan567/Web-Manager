const API = {
    async request(url, options = {}) {
        options.headers = { 
            'Content-Type': 'application/json', 
            ...options.headers 
        };
        
        try {
            const response = await fetch(url, options);
            
            // Xử lý khi chưa đăng nhập hoặc phiên hết hạn
            if (response.status === 401) {
                alert('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
                window.location.href = '/login';
                return;
            }

            // Kiểm tra Content-Type xem có phải là JSON không
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const textError = await response.text();
                console.error("Server HTML Response Error:", textError);
                throw new Error(`Máy chủ gặp lỗi (${response.status}). Vui lòng kiểm tra lại kết nối MySQL Workbench!`);
            }

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Lỗi xử lý dữ liệu từ máy chủ');
            }
            
            return data;
        } catch (err) {
            alert(err.message);
            throw err;
        }
    }
};