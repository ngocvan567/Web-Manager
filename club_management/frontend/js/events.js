// ===== ADMIN EVENTS MANAGEMENT =====

let eventsData = [];

// Load all events
async function loadEvents() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    eventsData = await API.Events.getAll();
    renderEvents(eventsData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render events table
function renderEvents(events) {
  const container = document.getElementById('eventsTable');
  if (!container) return;
  
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <h3>Chưa có sự kiện</h3>
        <p>Chưa có sự kiện nào được tạo</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>Tên sự kiện</th>
            <th>Ngày</th>
            <th>Địa điểm</th>
            <th>Đăng ký</th>
            <th>Tham gia</th>
            <th>Vắng</th>
            <th>Status</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(event => `
            <tr>
              <td>${Auth.escapeHtml(event.name || '-')}</td>
              <td>${Auth.formatDateTime(event.date)}</td>
              <td>${Auth.escapeHtml(event.location || '-')}</td>
              <td>${event.registered_count || 0}</td>
              <td>${event.present_count || 0}</td>
              <td>${event.absent_count || 0}</td>
              <td>
                <span class="badge ${event.status === 'ACTIVE' ? 'badge-success' : event.status === 'CANCELLED' ? 'badge-danger' : 'badge-gray'}">
                  ${event.status || 'ACTIVE'}
                </span>
              </td>
              <td>
                <div class="d-flex gap-1">
                  <button class="btn btn-sm btn-outline" onclick="viewEvent(${event.id})">Xem</button>
                  <button class="btn btn-sm btn-outline" onclick="editEvent(${event.id})">Sửa</button>
                  <button class="btn btn-sm btn-primary" onclick="viewEventRegistrations(${event.id})">Đăng ký</button>
                  ${event.status === 'ACTIVE' ? 
                    `<button class="btn btn-sm btn-warning" onclick="cancelEvent(${event.id})">Hủy</button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="deleteEvent(${event.id})">Xóa</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// View event details
function viewEvent(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;
  
  const modal = document.getElementById('eventModal');
  const title = document.getElementById('eventModalTitle');
  const body = document.getElementById('eventModalBody');
  
  title.textContent = 'Chi tiết sự kiện';
  body.innerHTML = `
    <div class="profile-grid">
      <div class="profile-field">
        <label>Tên sự kiện</label>
        <div class="value">${Auth.escapeHtml(event.name || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Ngày</label>
        <div class="value">${Auth.formatDateTime(event.date)}</div>
      </div>
      <div class="profile-field">
        <label>Địa điểm</label>
        <div class="value">${Auth.escapeHtml(event.location || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Mô tả</label>
        <div class="value">${Auth.escapeHtml(event.description || '-')}</div>
      </div>
      <div class="profile-field">
        <label>Số đăng ký</label>
        <div class="value">${event.registered_count || 0}</div>
      </div>
      <div class="profile-field">
        <label>Số tham gia</label>
        <div class="value">${event.present_count || 0}</div>
      </div>
      <div class="profile-field">
        <label>Số vắng</label>
        <div class="value">${event.absent_count || 0}</div>
      </div>
      <div class="profile-field">
        <label>Status</label>
        <div class="value">${event.status || 'ACTIVE'}</div>
      </div>
    </div>
  `;
  
  modal.classList.add('active');
}

// Open add event modal
function openAddEventModal() {
  const modal = document.getElementById('eventModal');
  const title = document.getElementById('eventModalTitle');
  const body = document.getElementById('eventModalBody');
  
  title.textContent = 'Tạo sự kiện mới';
  body.innerHTML = `
    <form id="addEventForm">
      <div class="form-group">
        <label>Tên sự kiện *</label>
        <input type="text" class="form-control" name="name" required>
      </div>
      <div class="form-group">
        <label>Ngày *</label>
        <input type="datetime-local" class="form-control" name="date" required>
      </div>
      <div class="form-group">
        <label>Địa điểm</label>
        <input type="text" class="form-control" name="location">
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea class="form-control" name="description"></textarea>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('addEventForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createEvent();
  });
}

// Create event
async function createEvent() {
  const form = document.getElementById('addEventForm');
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    date: formData.get('date'),
    location: formData.get('location'),
    description: formData.get('description'),
  };
  
  try {
    await API.Events.create(data);
    Auth.showAlert('Tạo sự kiện thành công!', 'success');
    closeModal('eventModal');
    loadEvents();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Open edit event modal
function editEvent(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;
  
  const modal = document.getElementById('eventModal');
  const title = document.getElementById('eventModalTitle');
  const body = document.getElementById('eventModalBody');
  
  title.textContent = 'Sửa sự kiện';
  body.innerHTML = `
    <form id="editEventForm">
      <div class="form-group">
        <label>Tên sự kiện *</label>
        <input type="text" class="form-control" name="name" value="${Auth.escapeHtml(event.name || '')}" required>
      </div>
      <div class="form-group">
        <label>Ngày *</label>
        <input type="datetime-local" class="form-control" name="date" value="${event.date ? event.date.slice(0, 16) : ''}" required>
      </div>
      <div class="form-group">
        <label>Địa điểm</label>
        <input type="text" class="form-control" name="location" value="${Auth.escapeHtml(event.location || '')}">
      </div>
      <div class="form-group">
        <label>Mô tả</label>
        <textarea class="form-control" name="description">${Auth.escapeHtml(event.description || '')}</textarea>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('editEventForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateEvent(id);
  });
}

// Update event
async function updateEvent(id) {
  const form = document.getElementById('editEventForm');
  const formData = new FormData(form);
  
  const data = {
    name: formData.get('name'),
    date: formData.get('date'),
    location: formData.get('location'),
    description: formData.get('description'),
  };
  
  try {
    await API.Events.update(id, data);
    Auth.showAlert('Cập nhật sự kiện thành công!', 'success');
    closeModal('eventModal');
    loadEvents();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// View event registrations
async function viewEventRegistrations(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;
  
  try {
    const registrations = await API.Events.getRegistrations(id);
    
    const modal = document.getElementById('eventModal');
    const title = document.getElementById('eventModalTitle');
    const body = document.getElementById('eventModalBody');
    
    title.textContent = `Đăng ký - ${event.name}`;
    
    if (!registrations || registrations.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <h3>Chưa có đăng ký</h3>
          <p>Chưa có thành viên nào đăng ký sự kiện này</p>
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
                <th>Ban</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${registrations.map(reg => `
                <tr>
                  <td>${Auth.escapeHtml(reg.mssv || '-')}</td>
                  <td>${Auth.escapeHtml(reg.name || '-')}</td>
                  <td>${Auth.escapeHtml(reg.email || '-')}</td>
                  <td>
                    <span class="department-badge ${Auth.getDepartmentClass(reg.department)}">
                      ${Auth.getDepartmentName(reg.department)}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${reg.status === 'REGISTERED' ? 'badge-success' : 'badge-gray'}">
                      ${reg.status || 'REGISTERED'}
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

// Cancel event
async function cancelEvent(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;
  
  if (!confirm(`Bạn có chắc muốn hủy sự kiện ${event.name}?`)) return;
  
  try {
    await API.Events.cancel(id);
    Auth.showAlert('Đã hủy sự kiện!', 'success');
    loadEvents();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Delete event
async function deleteEvent(id) {
  const event = eventsData.find(e => e.id === id);
  if (!event) return;
  
  if (!confirm(`Bạn có chắc muốn xóa sự kiện ${event.name}?`)) return;
  
  try {
    await API.Events.delete(id);
    Auth.showAlert('Xóa sự kiện thành công!', 'success');
    loadEvents();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize events page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('eventsTable')) {
    loadEvents();
    
    const addBtn = document.getElementById('addEventBtn');
    if (addBtn) addBtn.addEventListener('click', openAddEventModal);
    
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