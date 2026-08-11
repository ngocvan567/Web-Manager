// ===== ADMIN DEPARTMENTS MANAGEMENT =====

let departmentsData = [];

// Load all departments
async function loadDepartments() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    departmentsData = await API.Departments.getAll();
    renderDepartments(departmentsData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render departments
function renderDepartments(departments) {
  const container = document.getElementById('departmentsList');
  if (!container) return;
  
  if (!departments || departments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🏢</div>
        <h3>Chưa có ban</h3>
        <p>Chưa có ban nào được tạo</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="stat-grid">
      ${departments.map(dept => `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${Auth.escapeHtml(dept.name)}</h3>
            <span class="department-badge ${Auth.getDepartmentClass(dept.code)}">${dept.code || ''}</span>
          </div>
          <p class="text-muted mb-2">${Auth.escapeHtml(dept.description || '')}</p>
          <div class="d-flex justify-between align-center mb-2">
            <span class="text-muted">Thành viên: <strong>${dept.member_count || 0}</strong></span>
            <span class="text-muted">Trưởng ban: <strong>${Auth.escapeHtml(dept.leader_name || 'Chưa có')}</strong></span>
          </div>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline" onclick="viewDepartment(${dept.id})">Xem</button>
            <button class="btn btn-sm btn-outline" onclick="editDepartment(${dept.id})">Sửa</button>
            <button class="btn btn-sm btn-primary" onclick="viewDepartmentMembers(${dept.id})">Thành viên</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDepartment(${dept.id})">Xóa</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// View department details
function viewDepartment(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  const modal = document.getElementById('departmentModal');
  const title = document.getElementById('departmentModalTitle');
  const body = document.getElementById('departmentModalBody');
  
  title.textContent = 'Chi tiết ban';
  body.innerHTML = `
    <div class="profile-grid">
      <div class="profile-field">
        <label>Tên ban</label>
        <div class="value">${Auth.escapeHtml(dept.name || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Mã ban</label>
        <div class="value">${Auth.escapeHtml(dept.code || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Mô tả</label>
        <div class="value">${Auth.escapeHtml(dept.description || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Số thành viên</label>
        <div class="value">${dept.member_count || 0}</div>
      </div>
      <div class="profile-field">
        <label>Trưởng ban</label>
        <div class="value">${Auth.escapeHtml(dept.leader_name || 'Chưa có')}</div>
      </div>
      <div class="profile-field">
        <label>Phó ban</label>
        <div class="value">${Auth.escapeHtml(dept.vice_leader_name || 'Chưa có')}</div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// Open add department modal
function openAddDepartmentModal() {
  const modal = document.getElementById('departmentModal');
  const title = document.getElementById('departmentModalTitle');
  const body = document.getElementById('departmentModalBody');
  
  title.textContent = 'Thêm ban mới';
  body.innerHTML = `
    <form id="addDepartmentForm">
      <div class="form-group">
        <label>Tên ban *</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="form-group">
        <label>Mã ban *</label>
        <input type="text" class="form-control" name="code" required placeholder="VD: ACADEMIC">
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea class="form-control" name="description"></textarea>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('addDepartmentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createDepartment();
  });
}

// Create department
async function createDepartment() {
  const form = document.getElementById('addDepartmentForm');
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
  };
  
  try {
    await API.Departments.create(data);
    Auth.showAlert('Tạo ban thành công!', 'success');
    closeModal('departmentModal');
    loadDepartments();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Open edit department modal
function editDepartment(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  const modal = document.getElementById('departmentModal');
  const title = document.getElementById('departmentModalTitle');
  const body = document.getElementById('departmentModalBody');
  
  title.textContent = 'Sửa ban';
  body.innerHTML = `
    <form id="editDepartmentForm">
      <div class="form-group">
        <label>Tên ban *</label>
        <input type="text" class="form-control" name="name" value="${Auth.escapeHtml(dept.name || '')}" required>
      </div>
      <div class="form-group">
        <label>Mã ban *</label>
        <input type="text" class="form-control" name="code" value="${Auth.escapeHtml(dept.code || '')}" required>
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea class="form-control" name="description">${Auth.escapeHtml(dept.description || '')}</textarea>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('editDepartmentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateDepartment(id);
  });
}

// Update department
async function updateDepartment(id) {
  const form = document.getElementById('editDepartmentForm');
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    code: formData.get('code'),
    description: formData.get('description'),
  };
  
  try {
    await API.Departments.update(id, data);
    Auth.showAlert('Cập nhật ban thành công!', 'success');
    closeModal('departmentModal');
    loadDepartments();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// View department members
async function viewDepartmentMembers(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  try {
    const members = await API.Departments.getMembers(id);
    
    const modal = document.getElementById('departmentModal');
    const title = document.getElementById('departmentModalTitle');
    const body = document.getElementById('departmentModalBody');
    
    title.textContent = `Thành viên - ${dept.name}`;
    
    if (!members || members.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="icon">👥</div>
          <h3>Chưa có thành viên</h3>
          <p>Ban này chưa có thành viên nào</p>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(member => `
                <tr>
                  <td>${Auth.escapeHtml(member.mssv || '-')}</td>
                  <td>${Auth.escapeHtml(member.name || '-')}</td>
                  <td>${Auth.escapeHtml(member.email || '-')}</td>
                  <td>
                    ${member.is_leader ? '<span class="badge badge-primary">Trưởng ban</span>' : 
                      member.is_vice_leader ? '<span class="badge badge-info">Phó ban</span>' : 
                      '<span class="badge badge-gray">Thành viên</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
    
    modal.classList.add('active');
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Set department leader
async function setDepartmentLeader(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  try {
    const members = await API.Departments.getMembers(id);
    
    if (!members || members.length === 0) {
      Auth.showAlert('Ban này chưa có thành viên', 'warning');
      return;
    }
    
    const memberOptions = members.map(m => 
      `<option value="${m.id}">${Auth.escapeHtml(m.name)} (${Auth.escapeHtml(m.mssv)})</option>`
    ).join('');
    
    const modal = document.getElementById('departmentModal');
    const title = document.getElementById('departmentModalTitle');
    const body = document.getElementById('departmentModalBody');
    
    title.textContent = `Thiết lập Trưởng ban - ${dept.name}`;
    body.innerHTML = `
      <form id="setLeaderForm">
        <div class="form-group">
          <label>Chọn thành viên làm Trưởng ban *</label>
          <select class="form-control" name="member_id" required>
            <option value="">-- Chọn thành viên --</option>
            ${memberOptions}
          </select>
        </div>
      </form>
    `;
    
    modal.classList.add('active');
    
    const form = document.getElementById('setLeaderForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memberId = new FormData(form).get('member_id');
      try {
        await API.Departments.setLeader(id, memberId);
        Auth.showAlert('Thiết lập Trưởng ban thành công!', 'success');
        closeModal('departmentModal');
        loadDepartments();
      } catch (error) {
        Auth.showAlert(error.message, 'danger');
      }
    });
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Set department vice leader
async function setDepartmentViceLeader(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  try {
    const members = await API.Departments.getMembers(id);
    
    if (!members || members.length === 0) {
      Auth.showAlert('Ban này chưa có thành viên', 'warning');
      return;
    }
    
    const memberOptions = members.map(m => 
      `<option value="${m.id}">${Auth.escapeHtml(m.name)} (${Auth.escapeHtml(m.mssv)})</option>`
    ).join('');
    
    const modal = document.getElementById('departmentModal');
    const title = document.getElementById('departmentModalTitle');
    const body = document.getElementById('departmentModalBody');
    
    title.textContent = `Thiết lập Phó ban - ${dept.name}`;
    body.innerHTML = `
      <form id="setViceLeaderForm">
        <div class="form-group">
          <label>Chọn thành viên làm Phó ban *</label>
          <select class="form-control" name="member_id" required>
            <option value="">-- Chọn thành viên --</option>
            ${memberOptions}
          </select>
        </div>
      </form>
    `;
    
    modal.classList.add('active');
    
    const form = document.getElementById('setViceLeaderForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const memberId = new FormData(form).get('member_id');
      try {
        await API.Departments.setViceLeader(id, memberId);
        Auth.showAlert('Thiết lập Phó ban thành công!', 'success');
        closeModal('departmentModal');
        loadDepartments();
      } catch (error) {
        Auth.showAlert(error.message, 'danger');
      }
    });
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Delete department
async function deleteDepartment(id) {
  const dept = departmentsData.find(d => d.id === id);
  if (!dept) return;
  
  if (!confirm(`Bạn có chắc muốn xóa ban ${dept.name}?`)) return;
  
  try {
    await API.Departments.delete(id);
    Auth.showAlert('Xóa ban thành công!', 'success');
    loadDepartments();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize departments page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('departmentsList')) {
    loadDepartments();
    
    const addBtn = document.getElementById('addDepartmentBtn');
    if (addBtn) addBtn.addEventListener('click', openAddDepartmentModal);
    
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
      });
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }
});