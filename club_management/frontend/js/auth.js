// ===== AUTHENTICATION HELPERS =====

// Fallback định nghĩa resolveAppPath nếu api.js chưa được nạp
// (đảm bảo các redirect hoạt động đúng với file:// protocol)
if (typeof resolveAppPath === 'undefined') {
  window.resolveAppPath = function(path) {
    const scripts = document.querySelectorAll('script[src$="js/api.js"]');
    let base = '';
    if (scripts.length > 0) {
      const src = scripts[0].getAttribute('src') || '';
      base = src.replace(/js\/api\.js$/, '');
    }
    return base + path.replace(/^\//, '');
  };
}

// Get current user from localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

// Get token
function getToken() {
  return localStorage.getItem('token');
}

// Check if user is logged in
function isLoggedIn() {
  return !!getToken() && !!getCurrentUser();
}

// Check if user is ADMIN
function isAdmin() {
  const user = getCurrentUser();
  return user && String(user.role).toUpperCase() === 'ADMIN';
}

// Check if user is MEMBER
function isMember() {
  const user = getCurrentUser();
  return user && String(user.role).toUpperCase() === 'MEMBER';
}

// Get user's department
function getUserDepartment() {
  const user = getCurrentUser();
  return user ? user.department : null;
}

// Save auth data after login
function saveAuthData(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Clear auth data on logout
function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Redirect based on role
function redirectByRole() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = resolveAppPath('/login.html');
    return;
  }
  
  if (String(user.role).toUpperCase() === 'ADMIN') {
    window.location.href = resolveAppPath('/admin/dashboard.html');
  } else {
    window.location.href = resolveAppPath('/member/dashboard.html');
  }
}

// Protect admin pages - redirect if not ADMIN
function requireAdmin() {
  if (!isLoggedIn()) {
    window.location.href = resolveAppPath('/login.html');
    return false;
  }
  
  if (!isAdmin()) {
    window.location.href = resolveAppPath('/member/dashboard.html');
    return false;
  }
  
  return true;
}

// Protect member pages - redirect if not MEMBER
function requireMember() {
  if (!isLoggedIn()) {
    window.location.href = resolveAppPath('/login.html');
    return false;
  }
  
  if (!isMember()) {
    window.location.href = resolveAppPath('/admin/dashboard.html');
    return false;
  }
  
  return true;
}

// Protect department pages - check if member belongs to department
function requireDepartment(department) {
  if (!requireMember()) return false;
  
  const user = getCurrentUser();
  if (user.department !== department) {
    window.location.href = resolveAppPath('/member/dashboard.html');
    return false;
  }
  
  return true;
}

// Handle logout
async function handleLogout() {
  try {
    await API.Auth.logout();
  } catch (e) {
    // Ignore logout API errors
  }
  
  clearAuthData();
  window.location.href = resolveAppPath('/login.html');
}

// Initialize topbar user info
function initTopbar() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Set user name in topbar
  const userNameEls = document.querySelectorAll('.user-info .name');
  userNameEls.forEach(el => {
    el.textContent = user.name || user.mssv || 'User';
  });
  
  // Set user role
  const userRoleEls = document.querySelectorAll('.user-info .role');
  userRoleEls.forEach(el => {
    el.textContent = user.role || '';
  });
  
  // Set avatar initials
  const avatarEls = document.querySelectorAll('.user-avatar');
  avatarEls.forEach(el => {
    const name = user.name || user.mssv || 'U';
    el.textContent = name.charAt(0).toUpperCase();
  });
  
  // Toggle user dropdown
  const userToggle = document.querySelector('.topbar-user');
  if (userToggle) {
    userToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = userToggle.querySelector('.user-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('active');
      }
    });
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-user')) {
      document.querySelectorAll('.user-dropdown').forEach(d => d.classList.remove('active'));
    }
  });
  
  // Logout button
  const logoutBtn = document.querySelector('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
}

// Initialize sidebar toggle for mobile
function initSidebarToggle() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.admin-sidebar, .member-sidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

// Initialize sidebar navigation
function initSidebarNav() {
  // Handle submenu toggles
  document.querySelectorAll('.nav-item.has-submenu').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      item.classList.toggle('open');
    });
  });
  
  // Highlight active nav item based on current page
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href && href.includes(currentPage)) {
      item.classList.add('active');
    }
  });
}

// Show alert message
function showAlert(message, type = 'danger', containerId = 'alertContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message || 'Có lỗi xảy ra. Vui lòng thử lại.';
  
  container.innerHTML = '';
  container.appendChild(alert);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alert.remove();
  }, 5000);
}

// Show loading state
function showLoading(containerId = 'loadingContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
}

// Hide loading state
function hideLoading(containerId = 'loadingContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// Format datetime
function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get department name
function getDepartmentName(department) {
  const departments = {
    'ACADEMIC': 'Ban Học thuật',
    'OPERATION': 'Ban Vận hành',
    'ADVISORY': 'Ban Cố vấn',
    'EXECUTIVE': 'Ban Chủ nhiệm',
    'NULL': 'Không ban',
    null: 'Không ban',
    undefined: 'Không ban',
  };
  
  return departments[department] || department || 'Không ban';
}

// Get department badge class
function getDepartmentClass(department) {
  const classes = {
    'ACADEMIC': 'academic',
    'OPERATION': 'operation',
    'ADVISORY': 'advisory',
    'EXECUTIVE': 'executive',
  };
  
  return classes[department] || 'none';
}

// Get status badge class
function getStatusClass(status) {
  const classes = {
    'ACTIVE': 'badge-success',
    'INACTIVE': 'badge-danger',
    'LOCKED': 'badge-warning',
    'PENDING': 'badge-warning',
  };
  
  return classes[status] || 'badge-gray';
}

// Get role badge class
function getRoleClass(role) {
  return role === 'ADMIN' ? 'badge-primary' : 'badge-info';
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTopbar();
  initSidebarToggle();
  initSidebarNav();
});

// ===== EXPORT =====
window.Auth = {
  getCurrentUser,
  getToken,
  isLoggedIn,
  isAdmin,
  isMember,
  getUserDepartment,
  saveAuthData,
  clearAuthData,
  redirectByRole,
  requireAdmin,
  requireMember,
  requireDepartment,
  handleLogout,
  showAlert,
  showLoading,
  hideLoading,
  formatDate,
  formatDateTime,
  getDepartmentName,
  getDepartmentClass,
  getStatusClass,
  getRoleClass,
  escapeHtml,
};