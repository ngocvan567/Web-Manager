// ===== MEMBER DASHBOARD =====

// Load member dashboard data
async function loadMemberDashboard() {
  if (!Auth.requireMember()) return;
  
  try {
    Auth.showLoading();
    
    const user = Auth.getCurrentUser();
    
    // Set welcome message
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl && user) {
      welcomeEl.textContent = user.name || 'Thành viên';
    }
    
    // Set department badge
    const deptEl = document.getElementById('memberDepartment');
    if (deptEl) {
      deptEl.innerHTML = `
        <span class="department-badge ${Auth.getDepartmentClass(user.department)}">
          ${Auth.getDepartmentName(user.department)}
        </span>
      `;
    }
    
    // Load upcoming events
    const events = await API.Events.getAll();
    const upcomingEvents = (events || []).filter(e => e.status === 'ACTIVE').slice(0, 5);
    renderUpcomingEvents(upcomingEvents);
    
    // Load announcements
    const announcements = await API.Announcements.getAll();
    const recentAnnouncements = (announcements || []).slice(0, 5);
    renderAnnouncements(recentAnnouncements);
    
    // Load attendance rate
    try {
      const rate = await API.Attendance.getRate();
      const rateEl = document.getElementById('attendanceRate');
      if (rateEl) {
        const percentage = rate.rate || 0;
        rateEl.textContent = `${percentage}%`;
        
        const progressFill = document.getElementById('attendanceProgress');
        if (progressFill) {
          progressFill.style.width = `${percentage}%`;
          if (percentage < 50) progressFill.classList.add('danger');
          else if (percentage < 75) progressFill.classList.add('warning');
        }
      }
    } catch (e) {
      // Attendance rate may not be available
    }
    
    // Load my registrations
    try {
      const registrations = await API.Registrations.getMyRegistrations();
      const regCount = document.getElementById('myRegistrations');
      if (regCount) regCount.textContent = (registrations || []).length;
    } catch (e) {
      // Registrations may not be available
    }
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render upcoming events
function renderUpcomingEvents(events) {
  const container = document.getElementById('upcomingEvents');
  if (!container) return;
  
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <h3>Chưa có sự kiện</h3>
        <p>Chưa có sự kiện sắp tới</p>
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
      <a href="${resolveAppPath('/member/events.html')}" class="btn btn-sm btn-outline">Xem</a>
    </li>
  `).join('');
}

// Render announcements
function renderAnnouncements(announcements) {
  const container = document.getElementById('recentAnnouncements');
  if (!container) return;
  
  if (!announcements || announcements.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📢</div>
        <h3>Chưa có thông báo</h3>
        <p>Chưa có thông báo nào</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = announcements.map(ann => `
    <li>
      <div class="activity-icon" style="background: #fef3c7;">📢</div>
      <div class="activity-text">
        <div class="title">${Auth.escapeHtml(ann.title)}</div>
        <div class="time">${Auth.formatDateTime(ann.created_at)}</div>
      </div>
    </li>
  `).join('');
}

// Load member profile
async function loadMemberProfile() {
  if (!Auth.requireMember()) return;
  
  try {
    Auth.showLoading();
    
    const user = Auth.getCurrentUser();
    
    // Fill profile fields
    const fields = {
      'profileName': user.name,
      'profileMssv': user.mssv,
      'profileEmail': user.email,
      'profilePhone': user.phone || '-',
      'profileMajor': user.major || '-',
      'profileCourse': user.course || '-',
      'profileDepartment': Auth.getDepartmentName(user.department),
      'profileRole': user.role,
      'profileStatus': user.status,
    };
    
    Object.keys(fields).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = fields[id] || '-';
    });
    
    // Set avatar
    const avatarEl = document.getElementById('profileAvatar');
    if (avatarEl) {
      const name = user.name || 'U';
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
    
    // Set department badge
    const deptBadge = document.getElementById('profileDeptBadge');
    if (deptBadge) {
      deptBadge.innerHTML = `
        <span class="department-badge ${Auth.getDepartmentClass(user.department)}">
          ${Auth.getDepartmentName(user.department)}
        </span>
      `;
    }
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Update member profile
async function updateMemberProfile() {
  const form = document.getElementById('profileForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const data = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    major: formData.get('major'),
    course: formData.get('course'),
  };
  
  try {
    const result = await API.Profile.update(data);
    Auth.showAlert('Cập nhật hồ sơ thành công!', 'success');
    
    // Update local user data
    const user = Auth.getCurrentUser();
    if (user) {
      user.name = data.name;
      user.phone = data.phone;
      user.major = data.major;
      user.course = data.course;
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Reload profile
    loadMemberProfile();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Change password
async function changePassword() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;
  
  const formData = new FormData(form);
  const currentPassword = formData.get('current_password');
  const newPassword = formData.get('new_password');
  const confirmPassword = formData.get('confirm_password');
  
  // Validate
  if (!currentPassword || !newPassword || !confirmPassword) {
    Auth.showAlert('Vui lòng điền đầy đủ thông tin', 'danger');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    Auth.showAlert('Mật khẩu xác nhận không khớp', 'danger');
    return;
  }
  
  if (newPassword.length < 6) {
    Auth.showAlert('Mật khẩu phải có ít nhất 6 ký tự', 'danger');
    return;
  }
  
  try {
    await API.Profile.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    
    Auth.showAlert('Đổi mật khẩu thành công!', 'success');
    form.reset();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Load member events
async function loadMemberEvents() {
  if (!Auth.requireMember()) return;
  
  try {
    Auth.showLoading();
    
    const events = await API.Events.getAll();
    renderMemberEvents(events || []);
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render member events
function renderMemberEvents(events) {
  const container = document.getElementById('memberEvents');
  if (!container) return;
  
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📅</div>
        <h3>Chưa có sự kiện</h3>
        <p>Chưa có sự kiện nào</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="event-grid">
      ${events.map(event => `
        <div class="event-card">
          <div class="event-card-header">
            <h3>${Auth.escapeHtml(event.name)}</h3>
            <span class="badge ${event.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}">${event.status || 'ACTIVE'}</span>
          </div>
          <div class="event-card-body">
            <div class="event-meta">
              <span class="icon">📅</span>
              <span>${Auth.formatDate(event.date)}</span>
            </div>
            <div class="event-meta">
              <span class="icon">🕐</span>
              <span>${Auth.formatDateTime(event.date)}</span>
            </div>
            <div class="event-meta">
              <span class="icon">📍</span>
              <span>${Auth.escapeHtml(event.location || 'Chưa xác định')}</span>
            </div>
            <p class="mt-1">${Auth.escapeHtml(event.description || '')}</p>
          </div>
          <div class="event-card-footer">
            <button class="btn btn-sm btn-primary" onclick="registerEvent(${event.id})">Đăng ký</button>
            <span class="text-muted">${event.registered_count || 0} đã đăng ký</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Register for event
async function registerEvent(eventId) {
  try {
    await API.Registrations.register(eventId);
    Auth.showAlert('Đăng ký sự kiện thành công!', 'success');
    loadMemberEvents();
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  }
}

// Load member attendance
async function loadMemberAttendance() {
  if (!Auth.requireMember()) return;
  
  try {
    Auth.showLoading();
    
    const history = await API.Attendance.getHistory();
    renderAttendanceHistory(history || []);
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render attendance history
function renderAttendanceHistory(history) {
  const container = document.getElementById('attendanceHistory');
  if (!container) return;
  
  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">✅</div>
        <h3>Chưa có lịch sử điểm danh</h3>
        <p>Chưa có buổi điểm danh nào</p>
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
          </tr>
        </thead>
        <tbody>
          ${history.map(item => `
            <tr>
              <td>${Auth.escapeHtml(item.event_name || '')}</td>
              <td>${Auth.formatDate(item.date)}</td>
              <td>
                <span class="badge ${item.status === 'PRESENT' ? 'badge-success' : item.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'}">
                  ${item.status === 'PRESENT' ? 'Có mặt' : item.status === 'ABSENT' ? 'Vắng mặt' : 'Chưa điểm danh'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Load member announcements
async function loadMemberAnnouncements() {
  if (!Auth.requireMember()) return;
  
  try {
    Auth.showLoading();
    
    const announcements = await API.Announcements.getAll();
    renderMemberAnnouncements(announcements || []);
    
  } catch (error) {
    Auth.showAlert(error.message, 'danger');
  } finally {
    Auth.hideLoading();
  }
}

// Render member announcements
function renderMemberAnnouncements(announcements) {
  const container = document.getElementById('memberAnnouncements');
  if (!container) return;
  
  if (!announcements || announcements.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📢</div>
        <h3>Chưa có thông báo</h3>
        <p>Chưa có thông báo nào</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = announcements.map(ann => `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${Auth.escapeHtml(ann.title)}</h3>
        <span class="badge ${ann.target === 'ALL' ? 'badge-primary' : 'badge-info'}">
          ${ann.target === 'ALL' ? 'Toàn CLB' : Auth.getDepartmentName(ann.target)}
        </span>
      </div>
      <p>${Auth.escapeHtml(ann.content || '')}</p>
      <div class="text-muted mt-1" style="font-size: 13px;">
        ${Auth.formatDateTime(ann.created_at)}
      </div>
    </div>
  `).join('');
}

// Initialize member pages
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('memberDashboard')) {
    loadMemberDashboard();
  }
  
  if (document.getElementById('memberProfile')) {
    loadMemberProfile();
  }
  
  if (document.getElementById('memberEvents')) {
    loadMemberEvents();
  }
  
  if (document.getElementById('attendanceHistory')) {
    loadMemberAttendance();
  }
  
  if (document.getElementById('memberAnnouncements')) {
    loadMemberAnnouncements();
  }
  
  // Profile form submit
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      updateMemberProfile();
    });
  }
  
  // Change password form submit
  const changePasswordForm = document.getElementById('changePasswordForm');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      changePassword();
    });
  }
});