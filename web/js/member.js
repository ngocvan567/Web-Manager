let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  const rawUser = localStorage.getItem('user_info');
  if (!rawUser) {
    window.location.href = '/index.html';
    return;
  }

  currentUser = JSON.parse(rawUser);
  if (!currentUser) {
    window.location.href = '/index.html';
    return;
  }

  const welcomeEl = document.getElementById('member-welcome');
  if (welcomeEl) {
    welcomeEl.innerText = `Xin chào: ${currentUser.fullname || currentUser.mssv} (${currentUser.mssv})`;
  }

  setupDepartmentUI(currentUser.department);
  renderMemberView('dashboard');
});

function setupDepartmentUI(dept) {
  const deptContainer = document.getElementById('dynamic-dept-menu');
  const badge = document.getElementById('dept-badge');

  if (!deptContainer || !badge) return;

  if (!dept || dept.code === 'NONE') {
    badge.innerText = "MEMBER (Chưa thuộc ban)";
    deptContainer.innerHTML = '';
    return;
  }

  badge.innerText = `BAN: ${dept.name.toUpperCase()}`;

  let deptMenuHtml = `<li style="padding: 10px 20px; color: #64748b; font-size: 12px;">KHU VỰC ${dept.name.toUpperCase()}</li>`;

  switch (dept.code) {
    case 'ACADEMIC':
      deptMenuHtml += `<li><a href="#" onclick="renderMemberView('dept-academic')">📚 Nhiệm Vụ Học Thuật</a></li>`;
      break;
    case 'OPERATION':
      deptMenuHtml += `<li><a href="#" onclick="renderMemberView('dept-operation')">⚙️ Task Vận Hành</a></li>`;
      break;
    case 'ADVISORY':
      deptMenuHtml += `<li><a href="#" onclick="renderMemberView('dept-advisory')">💡 Hoạt Động Cố Vấn</a></li>`;
      break;
    case 'EXECUTIVE':
      deptMenuHtml += `<li><a href="#" onclick="renderMemberView('dept-executive')">📈 Báo Cáo CLB</a></li>`;
      break;
  }

  deptContainer.innerHTML = deptMenuHtml;
}

function renderMemberView(view) {
  const container = document.getElementById('member-main-container');
  if (!container) return;

  switch (view) {
    case 'dashboard':
      container.innerHTML = `
        <div class="stat-card">
          <h4>Thông Tin Hoạt Động</h4>
          <p style="margin-top: 10px;">Ban hiện tại: <b>${currentUser.department ? currentUser.department.name : 'Chưa phân ban'}</b></p>
        </div>
      `;
      break;

    case 'attendance':
      loadMemberAttendance(container);
      break;

    case 'dept-academic':
      container.innerHTML = `
        <h3>📚 Khu Vực Ban Học Thuật</h3>
        <p>Nhiệm vụ: Chuẩn bị Workshop Linux</p>
      `;
      break;

    case 'dept-operation':
      container.innerHTML = `
        <h3>⚙️ Khu Vực Ban Vận Hành</h3>
        <p>Kiểm tra thiết bị và khu vực điểm danh.</p>
      `;
      break;

    default:
      container.innerHTML = `<h4>Tính năng đang được cập nhật...</h4>`;
  }
}

async function loadMemberAttendance(container) {
  try {
    const session = await ApiClient.get('/member/active-attendance');
    if (session && session.is_open) {
      container.innerHTML = `
        <div class="stat-card" style="border: 2px solid #10b981;">
          <span class="badge badge-success">🟢 ĐANG MỞ ĐIỂM DANH</span>
          <h3 style="margin-top: 10px;">${session.event_name}</h3>
          <button class="btn-primary" style="margin-top: 15px;" onclick="submitAttendance(${session.id})">ĐIỂM DANH NGAY</button>
        </div>
      `;
    } else {
      container.innerHTML = `<div class="stat-card"><p>🔒 Hiện không có phiên điểm danh nào mở.</p></div>`;
    }
  } catch (err) {
    console.error("Lỗi điểm danh:", err);
  }
}

async function submitAttendance(sessionId) {
  try {
    const res = await ApiClient.post('/member/attendance', { session_id: sessionId });
    alert(res.message || "✅ Điểm danh thành công!");
    renderMemberView('attendance');
  } catch (err) {
    console.error("Lỗi gửi điểm danh:", err);
  }
}