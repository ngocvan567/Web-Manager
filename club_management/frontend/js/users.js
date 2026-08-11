// ===== ADMIN USERS MANAGEMENT =====

let usersData = [];
let currentFilter = '';

// Load all users
async function loadUsers() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    usersData = await API.Users.getAll();
    renderUsers(usersData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render users table
function renderUsers(users) {
  const container = document.getElementById('usersTable');
  if (!container) return;
  
  if (!users || users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">👤</div>
        <h3>Chưa có tài khoản</h3>
        <p>Chưa có tài khoản nào được đăng ký</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>MSSV</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Role</th>
            <th>Ban</th>
            <th>Status</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(user => `
            <tr>
              <td>${Auth.escapeHtml(user.mssv || '-')}</td>
              <td>${Auth.escapeHtml(user.name || '-')}</td>
              <td>${Auth.escapeHtml(user.email || '-')}</td>
              <td><span class="badge ${Auth.getRoleClass(user.role)}">${user.role || 'MEMBER'}</span></td>
              <td>
                <span class="department-badge ${Auth.getDepartmentClass(user.department)}">
                  ${Auth.getDepartmentName(user.department)}
                </span>
              </td>
              <td><span class="badge ${Auth.getStatusClass(user.status)}">${user.status || 'ACTIVE'}</span></td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline" onclick="viewUser(${user.id})">Xem</button>
                  <button class="btn btn-sm btn-outline" onclick="editUser(${user.id})">Sửa</button>
                  <button class="btn btn-sm btn-warning" onclick="changeUserRole(${user.id})">Đổi quyền</button>
                  <button class="btn btn-sm ${user.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}" 
                          onclick="toggleUserStatus(${user.id})">
                    ${user.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Xóa</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Filter users
function filterUsers() {
  const searchInput = document.getElementById('searchUser');
  const roleFilter = document.getElementById('filterRole');
  const statusFilter = document.getElementById('filterStatus');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const role = roleFilter ? roleFilter.value : '';
  const status = statusFilter ? statusFilter.value : '';
  
  const filtered = usersData.filter(user => {
    const matchSearch = !searchTerm || 
      (user.name && user.name.toLowerCase().includes(searchTerm)) ||
      (user.mssv && user.mssv.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm));
    
    const matchRole = !role || user.role === role;
    const matchStatus = !status || user.status === status;
    
    return matchSearch && matchRole && matchStatus;
  });
  
  renderUsers(filtered);
}

// View user details
function viewUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const body = document.getElementById('userModalBody');
  
  title.textContent = 'Chi tiết tài khoản';
  body.innerHTML = `
    <div class="profile-grid">
      <div class="profile-field">
        <label>MSSV</label>
        <div class="value">${Auth.escapeHtml(user.mssv || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Họ tên</label>
        <div class="value">${Auth.escapeHtml(user.name || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Email</label>
        <div class="value">${Auth.escapeHtml(user.email || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Role</label>
        <div class="value">${user.role || 'MEMBER'}</div>
      </div>
      <div class="profile-field">
        <label>Ban</label>
        <div class="value">${Auth.getDepartmentName(user.department)}</div>
      </div>
      <div class="profile-field">
        <label>Status</label>
        <div class="value">${user.status || 'ACTIVE'}</div>
      </div>
      <div class="profile-field">
        <label>Ngày tạo</label>
        <div class="value">${Auth.formatDate(user.created_at)}</div>
      </div>
      <div class="profile-field">
        <label>Cập nhật</label>
        <div class="value">${Auth.formatDate(user.updated_at)}</div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// Open add user modal
function openAddUserModal() {
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const body = document.getElementById('userModalBody');
  
  title.textContent = 'Thêm tài khoản mới';
  body.innerHTML = `
    <form id="addUserForm">
      <div class="form-group">
        <label>MSSV *</label>
        <input type="text" class="form-control" name="mssv" required>
      </div>
      <div class="form-group">
        <label>Họ tên *</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" class="form-control" name="email" required>
      </div>
      <div class="form-group">
        <label>Mật khẩu *</label>
        <input type="password" class="form-control" name="password" required minlength="6">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select class="form-control" name="role">
          <option value="MEMBER">MEMBER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ban</label>
        <select class="form-control" name="department_id">
          <option value="">Không ban</option>
          <option value="ACADEMIC">Ban Học thuật</option>
          <option value="OPERATION">Ban Vận hành</option>
          <option value="ADVISORY">Ban Cố vấn</option>
          <option value="EXECUTIVE">Ban Chủ nhiệm</option>
        </select>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  // Handle form submit
  const form = document.getElementById('addUserForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createUser();
  });
}

// Create new user
async function createUser() {
  const form = document.getElementById('addUserForm');
  const formData = new FormData(form);
  
  const data = {
    mssv: formData.get('mssv'),
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
    department_id: formData.get('department_id') || null,
  };
  
  try {
    await API.Users.create(data);
    Auth.showAlert('Tạo tài khoản thành công!', 'success');
    closeModal('userModal');
    loadUsers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Open edit user modal
function editUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  const modal = document.getElementById('userModal');
  const title = document.getElementById('userModalTitle');
  const body = document.getElementById('userModalBody');
  
  title.textContent = 'Sửa tài khoản';
  body.innerHTML = `
    <form id="editUserForm">
      <div class="form-group">
        <label>MSSV</label>
        <input type="text" class="form-control" name="mssv" value="${Auth.escapeHtml(user.mssv || '')}">
      </div>
      <div class="form-group">
        <label>Họ tên</label>
        <input type="text" class="form-control" name="name" value="${Auth.escapeHtml(user.name || '')}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" class="form-control" name="email" value="${Auth.escapeHtml(user.email || '')}">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select class="form-control" name="role">
          <option value="MEMBER" ${user.role === 'MEMBER' ? 'selected' : ''}>MEMBER</option>
          <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ban</label>
        <select class="form-control" name="department_id">
          <option value="">Không ban</option>
          <option value="ACADEMIC" ${user.department === 'ACADEMIC' ? 'selected' : ''}>Ban Học thuật</option>
          <option value="OPERATION" ${user.department === 'OPERATION' ? 'selected' : ''}>Ban Vận hành</option>
          <option value="ADVISORY" ${user.department === 'ADVISORY' ? 'selected' : ''}>Ban Cố vấn</option>
          <option value="EXECUTIVE" ${user.department === 'EXECUTIVE' ? 'selected' : ''}>Ban Chủ nhiệm</option>
        </select>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  // Handle form submit
  const form = document.getElementById('editUserForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateUser(id);
  });
}

// Update user
async function updateUser(id) {
  const form = document.getElementById('editUserForm');
  const formData = new FormData(form);
  
  const data = {
    mssv: formData.get('mssv'),
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    department_id: formData.get('department_id') || null,
  };
  
  try {
    await API.Users.update(id, data);
    Auth.showAlert('Cập nhật tài khoản thành công!', 'success');
    closeModal('userModal');
    loadUsers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Change user role
async function changeUserRole(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  const newRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
  const confirmMsg = `Chuyển quyền của ${user.name || user.mssv} từ ${user.role} sang ${newRole}?`;
  
  if (!confirm(confirmMsg)) return;
  
  try {
    await API.Users.changeRole(id, newRole);
    Auth.showAlert(`Đã chuyển quyền thành ${newRole}!`, 'success');
    loadUsers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Toggle user status (lock/unlock)
async function toggleUserStatus(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  const newStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
  const action = newStatus === 'LOCKED' ? 'khóa' : 'mở khóa';
  
  if (!confirm(`Bạn có chắc muốn ${action} tài khoản ${user.name || user.mssv}?`)) return;
  
  try {
    await API.Users.changeStatus(id, newStatus);
    Auth.showAlert(`Đã ${action} tài khoản!`, 'success');
    loadUsers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Delete user
async function deleteUser(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  if (!confirm(`Bạn có chắc muốn xóa tài khoản ${user.name || user.mssv}? Hành động này không thể hoàn tác!`)) return;
  
  try {
    await API.Users.delete(id);
    Auth.showAlert('Xóa tài khoản thành công!', 'success');
    loadUsers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Reset password
async function resetPassword(id) {
  const user = usersData.find(u => u.id === id);
  if (!user) return;
  
  if (!confirm(`Đặt lại mật khẩu cho tài khoản ${user.name || user.mssv}?`)) return;
  
  try {
    await API.Users.resetPassword(id);
    Auth.showAlert('Đã đặt lại mật khẩu!', 'success');
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize users page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('usersTable')) {
    loadUsers();
    
    // Search input
    const searchInput = document.getElementById('searchUser');
    if (searchInput) {
      searchInput.addEventListener('input', filterUsers);
    }
    
    // Filters
    const roleFilter = document.getElementById('filterRole');
    const statusFilter = document.getElementById('filterStatus');
    if (roleFilter) roleFilter.addEventListener('change', filterUsers);
    if (statusFilter) statusFilter.addEventListener('change', filterUsers);
    
    // Add user button
    const addBtn = document.getElementById('addUserBtn');
    if (addBtn) {
      addBtn.addEventListener('click', openAddUserModal);
    }
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      });
    });
    
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }
});