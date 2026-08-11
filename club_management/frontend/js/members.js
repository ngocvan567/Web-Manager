// ===== ADMIN MEMBERS MANAGEMENT =====

let membersData = [];

// Load all members
async function loadMembers() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    membersData = await API.Members.getAll();
    renderMembers(membersData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render members table
function renderMembers(members) {
  const container = document.getElementById('membersTable');
  if (!container) return;
  
  if (!members || members.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">👥</div>
        <h3>Chưa có thành viên</h3>
        <p>Chưa có thành viên nào đăng ký</p>
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
            <th>Ban</th>
            <th>Khóa</th>
            <th>Ngành</th>
            <th>Status</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(member => `
            <tr>
              <td>${Auth.escapeHtml(member.mssv || '-')}</td>
              <td>${Auth.escapeHtml(member.name || '-')}</td>
              <td>${Auth.escapeHtml(member.email || '-')}</td>
              <td>
                <span class="department-badge ${Auth.getDepartmentClass(member.department)}">
                  ${Auth.getDepartmentName(member.department)}
                </span>
              </td>
              <td>${Auth.escapeHtml(member.course || '-')}</td>
              <td>${Auth.escapeHtml(member.major || '-')}</td>
              <td><span class="badge ${Auth.getStatusClass(member.status)}">${member.status || 'ACTIVE'}</span></td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline" onclick="viewMember(${member.id})">Xem</button>
                  <button class="btn btn-sm btn-outline" onclick="editMember(${member.id})">Sửa</button>
                  <button class="btn btn-sm btn-primary" onclick="changeMemberDepartment(${member.id})">Chuyển ban</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteMember(${member.id})">Xóa</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Filter members
function filterMembers() {
  const searchInput = document.getElementById('searchMember');
  const deptFilter = document.getElementById('filterDepartment');
  const courseFilter = document.getElementById('filterCourse');
  const majorFilter = document.getElementById('filterMajor');
  
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  const dept = deptFilter ? deptFilter.value : '';
  const course = courseFilter ? courseFilter.value : '';
  const major = majorFilter ? majorFilter.value : '';
  
  const filtered = membersData.filter(member => {
    const matchSearch = !searchTerm || 
      (member.name && member.name.toLowerCase().includes(searchTerm)) ||
      (member.mssv && member.mssv.toLowerCase().includes(searchTerm)) ||
      (member.email && member.email.toLowerCase().includes(searchTerm));
    
    const matchDept = !dept || member.department === dept;
    const matchCourse = !course || member.course === course;
    const matchMajor = !major || member.major === major;
    
    return matchSearch && matchDept && matchCourse && matchMajor;
  });
  
  renderMembers(filtered);
}

// View member details
function viewMember(id) {
  const member = membersData.find(m => m.id === id);
  if (!member) return;
  
  const modal = document.getElementById('memberModal');
  const title = document.getElementById('memberModalTitle');
  const body = document.getElementById('memberModalBody');
  
  title.textContent = 'Chi tiết thành viên';
  body.innerHTML = `
    <div class="profile-grid">
      <div class="profile-field">
        <label>MSSV</label>
        <div class="value">${Auth.escapeHtml(member.mssv || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Họ tên</label>
        <div class="value">${Auth.escapeHtml(member.name || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Email</label>
        <div class="value">${Auth.escapeHtml(member.email || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Số điện thoại</label>
        <div class="value">${Auth.escapeHtml(member.phone || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Ban</label>
        <div class="value">${Auth.getDepartmentName(member.department)}</div>
      </div>
      <div class="profile-field">
        <label>Khóa</label>
        <div class="value">${Auth.escapeHtml(member.course || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Ngành</label>
        <div class="value">${Auth.escapeHtml(member.major || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Status</label>
        <div class="value">${member.status || 'ACTIVE'}</div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// Open add member modal
function openAddMemberModal() {
  const modal = document.getElementById('memberModal');
  const title = document.getElementById('memberModalTitle');
  const body = document.getElementById('memberModalBody');
  
  title.textContent = 'Thêm thành viên mới';
  body.innerHTML = `
    <form id="addMemberForm">
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
        <label>Số điện thoại</label>
        <input type="text" class="form-control" name="phone">
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
      <div class="form-group">
        <label>Khóa</label>
        <input type="text" class="form-control" name="course">
      </div>
      <div class="form-group">
        <label>Ngành</label>
        <input type="text" class="form-control" name="major">
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('addMemberForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createMember();
  });
}

// Create member
async function createMember() {
  const form = document.getElementById('addMemberForm');
  const formData = new FormData(form);
  
  const data = {
    mssv: formData.get('mssv'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    department_id: formData.get('department_id') || null,
    course: formData.get('course'),
    major: formData.get('major'),
  };
  
  try {
    await API.Members.create(data);
    Auth.showAlert('Thêm thành viên thành công!', 'success');
    closeModal('memberModal');
    loadMembers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Open edit member modal
function editMember(id) {
  const member = membersData.find(m => m.id === id);
  if (!member) return;
  
  const modal = document.getElementById('memberModal');
  const title = document.getElementById('memberModalTitle');
  const body = document.getElementById('memberModalBody');
  
  title.textContent = 'Sửa thông tin thành viên';
  body.innerHTML = `
    <form id="editMemberForm">
      <div class="form-group">
        <label>MSSV</label>
        <input type="text" class="form-control" name="mssv" value="${Auth.escapeHtml(member.mssv || '')}">
      </div>
      <div class="form-group">
        <label>Họ tên</label>
        <input type="text" class="form-control" name="name" value="${Auth.escapeHtml(member.name || '')}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" class="form-control" name="email" value="${Auth.escapeHtml(member.email || '')}">
      </div>
      <div class="form-group">
        <label>Số điện thoại</label>
        <input type="text" class="form-control" name="phone" value="${Auth.escapeHtml(member.phone || '')}">
      </div>
      <div class="form-group">
        <label>Khóa</label>
        <input type="text" class="form-control" name="course" value="${Auth.escapeHtml(member.course || '')}">
      </div>
      <div class="form-group">
        <label>Ngành</label>
        <input type="text" class="form-control" name="major" value="${Auth.escapeHtml(member.major || '')}">
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('editMemberForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateMember(id);
  });
}

// Update member
async function updateMember(id) {
  const form = document.getElementById('editMemberForm');
  const formData = new FormData(form);
  
  const data = {
    mssv: formData.get('mssv'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    course: formData.get('course'),
    major: formData.get('major'),
  };
  
  try {
    await API.Members.update(id, data);
    Auth.showAlert('Cập nhật thành viên thành công!', 'success');
    closeModal('memberModal');
    loadMembers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Change member department
function changeMemberDepartment(id) {
  const member = membersData.find(m => m.id === id);
  if (!member) return;
  
  const modal = document.getElementById('memberModal');
  const title = document.getElementById('memberModalTitle');
  const body = document.getElementById('memberModalBody');
  
  title.textContent = `Chuyển ban - ${member.name || member.mssv}`;
  body.innerHTML = `
    <form id="changeDeptForm">
      <div class="form-group">
        <label>Ban hiện tại</label>
        <div class="value">${Auth.getDepartmentName(member.department)}</div>
      </div>
      <div class="form-group">
        <label>Chuyển sang ban *</label>
        <select class="form-control" name="department_id" required>
          <option value="">Không ban</option>
          <option value="ACADEMIC" ${member.department === 'ACADEMIC' ? 'selected' : ''}>Ban Học thuật</option>
          <option value="OPERATION" ${member.department === 'OPERATION' ? 'selected' : ''}>Ban Vận hành</option>
          <option value="ADVISORY" ${member.department === 'ADVISORY' ? 'selected' : ''}>Ban Cố vấn</option>
          <option value="EXECUTIVE" ${member.department === 'EXECUTIVE' ? 'selected' : ''}>Ban Chủ nhiệm</option>
        </select>
      </div>
      <p class="text-muted" style="font-size: 13px;">
        Khi chuyển ban, quyền và giao diện của thành viên sẽ tự động thay đổi theo ban mới.
      </p>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('changeDeptForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await changeDepartment(id);
  });
}

// Change department
async function changeDepartment(id) {
  const form = document.getElementById('changeDeptForm');
  const formData = new FormData(form);
  const departmentId = formData.get('department_id');
  
  try {
    if (departmentId) {
      await API.Members.changeDepartment(id, departmentId);
    } else {
      await API.Members.removeFromDepartment(id);
    }
    Auth.showAlert('Chuyển ban thành công!', 'success');
    closeModal('memberModal');
    loadMembers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Delete member
async function deleteMember(id) {
  const member = membersData.find(m => m.id === id);
  if (!member) return;
  
  if (!confirm(`Bạn có chắc muốn xóa thành viên ${member.name || member.mssv}?`)) return;
  
  try {
    await API.Members.delete(id);
    Auth.showAlert('Xóa thành viên thành công!', 'success');
    loadMembers();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize members page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('membersTable')) {
    loadMembers();
    
    const searchInput = document.getElementById('searchMember');
    if (searchInput) searchInput.addEventListener('input', filterMembers);
    
    const deptFilter = document.getElementById('filterDepartment');
    const courseFilter = document.getElementById('filterCourse');
    const majorFilter = document.getElementById('filterMajor');
    if (deptFilter) deptFilter.addEventListener('change', filterMembers);
    if (courseFilter) courseFilter.addEventListener('change', filterMembers);
    if (majorFilter) majorFilter.addEventListener('change', filterMembers);
    
    const addBtn = document.getElementById('addMemberBtn');
    if (addBtn) addBtn.addEventListener('click', openAddMemberModal);
    
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