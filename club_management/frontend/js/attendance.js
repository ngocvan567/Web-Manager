// ===== ADMIN ATTENDANCE MANAGEMENT =====

let attendanceData = [];

// Load all attendance sessions
async function loadAttendance() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    attendanceData = await API.Attendance.getAll();
    renderAttendance(attendanceData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render attendance table
function renderAttendance(sessions) {
  const container = document.getElementById('attendanceTable');
  if (!container) return;
  
  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">✅</div>
        <h3>Chưa có phiên điểm danh</h3>
        <p>Chưa có phiên điểm danh nào được tạo</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Sự kiện</th>
            <th>Ngày</th>
            <th>Trạng thái</th>
            <th>Tham gia</th>
            <th>Vắng</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map(session => `
            <tr>
              <td>${Auth.escapeHtml(session.event_name || '-')}</td>
              <td>${Auth.formatDateTime(session.date)}</td>
              <td>
                <span class="badge ${session.status === 'OPEN' ? 'badge-success' : session.status === 'CLOSED' ? 'badge-gray' : 'badge-warning'}">
                  ${session.status === 'OPEN' ? 'Đang mở' : session.status === 'CLOSED' ? 'Đã đóng' : 'Chưa mở'}
                </span>
              </td>
              <td>${session.present_count || 0}</td>
              <td>${session.absent_count || 0}</td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline" onclick="viewAttendance(${session.id})">Xem</button>
                  ${session.status !== 'OPEN' ? 
                    `<button class="btn btn-sm btn-success" onclick="openAttendance(${session.id})">Mở</button>` : 
                    `<button class="btn btn-sm btn-warning" onclick="closeAttendance(${session.id})">Đóng</button>`}
                  <button class="btn btn-sm btn-primary" onclick="markAttendance(${session.id})">Điểm danh</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Open add attendance modal
function openAddAttendanceModal() {
  const modal = document.getElementById('attendanceModal');
  const title = document.getElementById('attendanceModalTitle');
  const body = document.getElementById('attendanceModalBody');
  
  title.textContent = 'Tạo phiên điểm danh';
  body.innerHTML = `
    <form id="addAttendanceForm">
      <div class="form-group">
        <label>Sự kiện *</label>
        <select class="form-control" name="event_id" required>
          <option value="">-- Chọn sự kiện --</option>
          ${(eventsData || []).map(event => 
            `<option value="${event.id}">${Auth.escapeHtml(event.name)}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Ngày *</label>
        <input type="datetime-local" class="form-control" name="date" required>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('addAttendanceForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createAttendance();
  });
}

// Create attendance session
async function createAttendance() {
  const form = document.getElementById('addAttendanceForm');
  const formData = new FormData(form);
  
  const data = {
    event_id: formData.get('event_id'),
    date: formData.get('date'),
  };
  
  try {
    await API.Attendance.create(data);
    Auth.showAlert('Tạo phiên điểm danh thành công!', 'success');
    closeModal('attendanceModal');
    loadAttendance();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// View attendance details
async function viewAttendance(id) {
  const session = attendanceData.find(s => s.id === id);
  if (!session) return;
  
  try {
    const details = await API.Attendance.getById(id);
    
    const modal = document.getElementById('attendanceModal');
    const title = document.getElementById('attendanceModalTitle');
    const body = document.getElementById('attendanceModalBody');
    
    title.textContent = `Chi tiết điểm danh - ${session.event_name || ''}`;
    
    if (!details.members || details.members.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="icon">✅</div>
          <h3>Chưa có điểm danh</h3>
          <p>Chưa có thành viên nào được điểm danh</p>
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
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${details.members.map(member => `
                <tr>
                  <td>${Auth.escapeHtml(member.mssv || '-')}</td>
                  <td>${Auth.escapeHtml(member.name || '-')}</td>
                  <td>
                    <span class="badge ${member.status === 'PRESENT' ? 'badge-success' : member.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'}">
                      ${member.status === 'PRESENT' ? 'Có mặt' : member.status === 'ABSENT' ? 'Vắng mặt' : 'Chưa điểm danh'}
                    </span>
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

// Open attendance session
async function openAttendance(id) {
  if (!confirm('Mở phiên điểm danh này?')) return;
  
  try {
    await API.Attendance.open(id);
    Auth.showAlert('Đã mở phiên điểm danh!', 'success');
    loadAttendance();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close attendance session
async function closeAttendance(id) {
  if (!confirm('Đóng phiên điểm danh này?')) return;
  
  try {
    await API.Attendance.close(id);
    Auth.showAlert('Đã đóng phiên điểm danh!', 'success');
    loadAttendance();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Mark attendance
async function markAttendance(id) {
  const session = attendanceData.find(s => s.id === id);
  if (!session) return;
  
  try {
    const details = await API.Attendance.getById(id);
    
    if (!details.members || details.members.length === 0) {
      Auth.showAlert('Chưa có thành viên để điểm danh', 'warning');
      return;
    }
    
    const modal = document.getElementById('attendanceModal');
    const title = document.getElementById('attendanceModalTitle');
    const body = document.getElementById('attendanceModalBody');
    
    title.textContent = `Điểm danh - ${session.event_name || ''}`;
    body.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>MSSV</th>
              <th>Họ tên</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${details.members.map(member => `
              <tr>
                <td>${Auth.escapeHtml(member.mssv || '-')}</td>
                <td>${Auth.escapeHtml(member.name || '-')}</td>
                <td>
                  <select class="form-control" id="attendanceStatus_${member.id}" 
                          onchange="updateAttendanceStatus(${id}, ${member.id}, this.value)">
                    <option value="PRESENT" ${member.status === 'PRESENT' ? 'selected' : ''}>Có mặt</option>
                    <option value="ABSENT" ${member.status === 'ABSENT' ? 'selected' : ''}>Vắng mặt</option>
                    <option value="PENDING" ${member.status === 'PENDING' || !member.status ? 'selected' : ''}>Chưa điểm danh</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    modal.classList.add('active');
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Update attendance status
async function updateAttendanceStatus(sessionId, memberId, status) {
  try {
    await API.Attendance.updateStatus(sessionId, memberId, status);
    Auth.showAlert('Cập nhật trạng thái điểm danh thành công!', 'success');
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize attendance page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('attendanceTable')) {
    // Load events for dropdown
    API.Events.getAll().then(events => {
      eventsData = events || [];
    }).catch(() => {});
    
    loadAttendance();
    
    const addBtn = document.getElementById('addAttendanceBtn');
    if (addBtn) addBtn.addEventListener('click', openAddAttendanceModal);
    
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