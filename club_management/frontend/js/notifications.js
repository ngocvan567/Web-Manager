// ===== ADMIN ANNOUNCEMENTS MANAGEMENT =====

let announcementsData = [];

// Load all announcements
async function loadAnnouncements() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    announcementsData = await API.Announcements.getAll();
    renderAnnouncements(announcementsData);
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render announcements
function renderAnnouncements(announcements) {
  const container = document.getElementById('announcementsList');
  if (!container) return;
  
  if (!announcements || announcements.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📢</div>
        <h3>Chưa có thông báo</h3>
        <p>Chưa có thông báo nào được tạo</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = announcements.map(ann => `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${Auth.escapeHtml(ann.title)}</h3>
        <div class="d-flex gap-1 align-center">
          <span class="badge ${ann.target === 'ALL' ? 'badge-primary' : 'badge-info'}">
            ${ann.target === 'ALL' ? 'Toàn CLB' : Auth.getDepartmentName(ann.target)}
          </span>
          <span class="badge ${ann.status === 'SENT' ? 'badge-success' : 'badge-warning'}">
            ${ann.status === 'SENT' ? 'Đã gửi' : 'Chưa gửi'}
          </span>
        </div>
      </div>
      <p>${Auth.escapeHtml(ann.content || '')}</p>
      <div class="d-flex justify-between align-center mt-2">
        <span class="text-muted" style="font-size: 13px;">${Auth.formatDateTime(ann.created_at)}</span>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline" onclick="editAnnouncement(${ann.id})">Sửa</button>
          ${ann.status !== 'SENT' ? 
            `<button class="btn btn-sm btn-success" onclick="sendAnnouncement(${ann.id})">Gửi</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${ann.id})">Xóa</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Open add announcement modal
function openAddAnnouncementModal() {
  const modal = document.getElementById('announcementModal');
  const title = document.getElementById('announcementModalTitle');
  const body = document.getElementById('announcementModalBody');
  
  title.textContent = 'Tạo thông báo mới';
  body.innerHTML = `
    <form id="addAnnouncementForm">
      <div class="form-group">
        <label>Tiêu đề *</label>
        <input type="text" class="form-control" name="title" required>
      </div>
      <div class="form-group">
        <label>Nội dung *</label>
        <textarea class="form-control" name="content" required></textarea>
      </div>
      <div class="form-group">
        <label>Đối tượng</label>
        <select class="form-control" name="target">
          <option value="ALL">Toàn CLB</option>
          <option value="ACADEMIC">Ban Học thuật</option>
          <option value="OPERATION">Ban Vận hành</option>
          <option value="ADVISORY">Ban Cố vấn</option>
          <option value="EXECUTIVE">Ban Chủ nhiệm</option>
        </select>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('addAnnouncementForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await createAnnouncement();
  });
}

// Create announcement
async function createAnnouncement() {
  const form = document.getElementById('addAnnouncementForm');
  const formData = new FormData(form);
  
  const data = {
    title: formData.get('title'),
    content: formData.get('content'),
    target: formData.get('target'),
  };
  
  try {
    await API.Announcements.create(data);
    Auth.showAlert('Tạo thông báo thành công!', 'success');
    closeModal('announcementModal');
    loadAnnouncements();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Open edit announcement modal
function editAnnouncement(id) {
  const ann = announcementsData.find(a => a.id === id);
  if (!ann) return;
  
  const modal = document.getElementById('announcementModal');
  const title = document.getElementById('announcementModalTitle');
  const body = document.getElementById('announcementModalBody');
  
  title.textContent = 'Sửa thông báo';
  body.innerHTML = `
    <form id="editAnnouncementForm">
      <div class="form-group">
        <label>Tiêu đề *</label>
        <input type="text" class="form-control" name="title" value="${Auth.escapeHtml(ann.title || '')}" required>
      </div>
      <div class="form-group">
        <label>Nội dung *</label>
        <textarea class="form-control" name="content" required>${Auth.escapeHtml(ann.content || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Đối tượng</label>
        <select class="form-control" name="target">
          <option value="ALL" ${ann.target === 'ALL' ? 'selected' : ''}>Toàn CLB</option>
          <option value="ACADEMIC" ${ann.target === 'ACADEMIC' ? 'selected' : ''}>Ban Học thuật</option>
          <option value="OPERATION" ${ann.target === 'OPERATION' ? 'selected' : ''}>Ban Vận hành</option>
          <option value="ADVISORY" ${ann.target === 'ADVISORY' ? 'selected' : ''}>Ban Cố vấn</option>
          <option value="EXECUTIVE" ${ann.target === 'EXECUTIVE' ? 'selected' : ''}>Ban Chủ nhiệm</option>
        </select>
      </div>
    </form>
  `;
  
  modal.classList.add('active');
  
  const form = document.getElementById('editAnnouncementForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateAnnouncement(id);
  });
}

// Update announcement
async function updateAnnouncement(id) {
  const form = document.getElementById('editAnnouncementForm');
  const formData = new FormData(form);
  
  const data = {
    title: formData.get('title'),
    content: formData.get('content'),
    target: formData.get('target'),
  };
  
  try {
    await API.Announcements.update(id, data);
    Auth.showAlert('Cập nhật thông báo thành công!', 'success');
    closeModal('announcementModal');
    loadAnnouncements();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Send announcement
async function sendAnnouncement(id) {
  const ann = announcementsData.find(a => a.id === id);
  if (!ann) return;
  
  if (!confirm(`Gửi thông báo "${ann.title}"?`)) return;
  
  try {
    await API.Announcements.send(id);
    Auth.showAlert('Đã gửi thông báo!', 'success');
    loadAnnouncements();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Delete announcement
async function deleteAnnouncement(id) {
  const ann = announcementsData.find(a => a.id === id);
  if (!ann) return;
  
  if (!confirm(`Bạn có chắc muốn xóa thông báo "${ann.title}"?`)) return;
  
  try {
    await API.Announcements.delete(id);
    Auth.showAlert('Xóa thông báo thành công!', 'success');
    loadAnnouncements();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

// Initialize announcements page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('announcementsList')) {
    loadAnnouncements();
    
    const addBtn = document.getElementById('addAnnouncementBtn');
    if (addBtn) addBtn.addEventListener('click', openAddAnnouncementModal);
    
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