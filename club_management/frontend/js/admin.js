// ===== ADMIN DASHBOARD =====

// Load admin dashboard data
async function loadAdminDashboard() {
  if (!Auth.requireAdmin()) return;
  
  try {
    Auth.showLoading();
    
    // Load overview statistics
    const stats = await API.Statistics.getOverview();
    
    // Update stat cards
    const statCards = {
      'totalUsers': stats.total_users || 0,
      'totalMembers': stats.total_members || 0,
      'totalDepartments': stats.total_departments || 0,
      'totalEvents': stats.total_events || 0,
      'totalAnnouncements': stats.total_announcements || 0,
      'totalRegistrations': stats.total_registrations || 0,
    };
    
    Object.keys(statCards).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = statCards[id];
    });
    
    // Load recent events
    const events = await API.Events.getAll();
    const recentEvents = (events || []).slice(0, 5);
    renderRecentEvents(recentEvents);
    
    // Load recent members
    const members = await API.Members.getAll();
    const recentMembers = (members || []).slice(0, 5);
    renderRecentMembers(recentMembers);
    
    // Set welcome message
    const user = Auth.getCurrentUser();
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl && user) {
      welcomeEl.textContent = user.name || 'Admin';
    }
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render recent events
function renderRecentEvents(events) {
  const container = document.getElementById('recentEvents');
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
  
  container.innerHTML = events.map(event => `
    <li>
      <div class="activity-icon" style="background: #dbeafe;">📅</div>
      <div class="activity-text">
        <div class="title">${Auth.escapeHtml(event.name)}</div>
        <div class="time">${Auth.formatDateTime(event.date)}</div>
      </div>
      <span class="badge ${event.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}">${event.status || 'ACTIVE'}</span>
    </li>
  `).join('');
}

// Render recent members
function renderRecentMembers(members) {
  const container = document.getElementById('recentMembers');
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
  
  container.innerHTML = members.map(member => `
    <li>
      <div class="activity-icon" style="background: #d1fae5;">👤</div>
      <div class="activity-text">
        <div class="title">${Auth.escapeHtml(member.name)}</div>
        <div class="time">${Auth.escapeHtml(member.mssv || '')}</div>
      </div>
      <span class="department-badge ${Auth.getDepartmentClass(member.department)}">${Auth.getDepartmentName(member.department)}</span>
    </li>
  `).join('');
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('adminDashboard')) {
    loadAdminDashboard();
  }
});