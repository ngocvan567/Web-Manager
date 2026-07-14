/* =========================================================
   Website Quản lý Câu lạc bộ Sinh viên — Frontend (mock data)
   Toàn bộ dữ liệu được lưu trong localStorage để demo giao diện.
   Khi có backend Flask + MySQL, thay các hàm trong DB.* bằng
   các lệnh gọi fetch() tới API thật.
   ========================================================= */

const STORAGE_KEY = 'clubData_v1';
const SESSION_KEY = 'clubSession_v1';

const ROLE_LABEL = { admin: 'Quản trị viên', leader: 'Ban điều hành', member: 'Thành viên' };
const AVATAR_COLORS = ['#C7962F', '#2C7A68', '#A1432B', '#5B6FA6', '#8A5FB0'];

/* ---------------- Seed data ---------------- */
function seedData(){
  return {
    users: [
      { id: 'u1', username: 'admin', password: 'admin123', fullName: 'Nguyễn Thị Ngọc Vân', mssv: 'DE210748', email: 'van.nguyen@fpt.edu.vn', role: 'admin', joined: '2025-09-01' },
     
    ],
    events: [
      { id: 'e1', name: 'Workshop: Nhập môn Bảo mật Web', date: '2026-07-20', location: 'Phòng LAB 302', description: 'Giới thiệu OWASP Top 10 và demo khai thác lỗi cơ bản.', code: 'SEC302', createdBy: 'u1' },
      { id: 'e2', name: 'Sinh hoạt CLB định kỳ tháng 7', date: '2026-07-26', location: 'Sảnh A, Tòa nhà chính', description: 'Tổng kết hoạt động tháng và bầu Ban điều hành mới.', code: 'CLB726', createdBy: 'u2' },
      { id: 'e3', name: 'Cuộc thi CTF nội bộ', date: '2026-08-09', location: 'Phòng LAB 305', description: 'Thử thách Capture The Flag dành cho thành viên câu lạc bộ.', code: 'CTF809', createdBy: 'u1' },
    ],
    attendance: [
      { id: 'a1', eventId: 'e1', userId: 'u3', at: '2026-07-14T08:02:00' },
      { id: 'a2', eventId: 'e1', userId: 'u4', at: '2026-07-14T08:05:00' },
    ],
  };
}

const DB = {
  load(){
    let raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      const data = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    try{ return JSON.parse(raw); } catch(e){ const data = seedData(); localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data; }
  },
  save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },
};

let state = DB.load();
let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
let currentView = 'dashboard';

/* ---------------- Helpers ---------------- */
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const uid = (p) => p + Math.random().toString(36).slice(2,8);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function initials(name){
  return (name || '?').trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase();
}
function colorFor(id){
  let sum = 0; for(const c of id) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function avatarHtml(name, id, size='avatar'){
  return `<div class="${size}" style="background:${colorFor(id)}">${initials(name)}</div>`;
}
function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function dayMonth(iso){
  const d = new Date(iso + 'T00:00:00');
  return { d: d.getDate(), m: 'Th' + (d.getMonth()+1) };
}
function toast(msg){
  const t = $('#toast');
  $('#toastMsg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}
function currentUser(){ return state.users.find(u => u.id === session?.userId) || null; }
function can(action){
  const u = currentUser();
  if(!u) return false;
  if(action === 'manageMembers') return u.role === 'admin';
  if(action === 'manageEvents') return u.role === 'admin' || u.role === 'leader';
  if(action === 'viewAttendanceAll') return u.role === 'admin' || u.role === 'leader';
  return false;
}

/* =========================================================
   AUTH
   ========================================================= */
function setAuthTab(tab){
  $$('.auth-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#loginForm').classList.toggle('hidden', tab !== 'login');
  $('#registerForm').classList.toggle('hidden', tab !== 'register');
}

function handleLogin(e){
  e.preventDefault();
  const username = $('#loginUsername').value.trim();
  const password = $('#loginPassword').value;
  const err = $('#loginError');
  const user = state.users.find(u => u.username === username && u.password === password);
  if(!user){ err.textContent = 'Sai tên đăng nhập hoặc mật khẩu.'; return; }
  err.textContent = '';
  session = { userId: user.id };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  enterApp();
}

function handleRegister(e){
  e.preventDefault();
  const fullName = $('#regFullName').value.trim();
  const mssv = $('#regMssv').value.trim();
  const email = $('#regEmail').value.trim();
  const username = $('#regUsername').value.trim();
  const password = $('#regPassword').value;
  const err = $('#registerError');

  if(!fullName || !mssv || !username || password.length < 6){
    err.textContent = 'Vui lòng điền đầy đủ thông tin. Mật khẩu tối thiểu 6 ký tự.';
    return;
  }
  if(state.users.some(u => u.username === username)){
    err.textContent = 'Tên đăng nhập đã được sử dụng.';
    return;
  }
  err.textContent = '';
  const user = { id: uid('u'), username, password, fullName, mssv, email, role: 'member', joined: new Date().toISOString().slice(0,10) };
  state.users.push(user);
  DB.save(state);
  session = { userId: user.id };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  toast('Đăng ký thành công. Chào mừng bạn!');
  enterApp();
}

function logout(){
  session = null;
  localStorage.removeItem(SESSION_KEY);
  $('#appScreen').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');
  $('#loginForm').reset();
  $('#registerForm').reset();
}

function enterApp(){
  $('#authScreen').classList.add('hidden');
  $('#appScreen').classList.remove('hidden');
  renderSidebarUser();
  buildNav();
  switchView('dashboard');
}

/* =========================================================
   NAV / SHELL
   ========================================================= */
const NAV_ITEMS = [
  { id:'dashboard', label:'Tổng quan', icon:'◆' },
  { id:'members', label:'Thành viên', icon:'◆', guard:'manageMembers' },
  { id:'events', label:'Sự kiện', icon:'◆' },
  { id:'attendance', label:'Điểm danh', icon:'◆' },
  { id:'profile', label:'Hồ sơ của tôi', icon:'◆' },
];

function buildNav(){
  const nav = $('#navGroup');
  nav.innerHTML = NAV_ITEMS
    .filter(item => !item.guard || can(item.guard))
    .map(item => `<button class="nav-item" data-view="${item.id}"><span class="dot"></span>${item.label}</button>`)
    .join('');
  $$('.nav-item', nav).forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
}

function renderSidebarUser(){
  const u = currentUser();
  if(!u) return;
  $('#sidebarUser').innerHTML = `
    <div class="who">
      ${avatarHtml(u.fullName, u.id)}
      <div>
        <div class="name">${escapeHtml(u.fullName)}</div>
        <div class="role">${ROLE_LABEL[u.role]}</div>
      </div>
    </div>
    <button class="btn ghost small logout-btn" id="logoutBtn">Đăng xuất</button>
  `;
  $('#logoutBtn').addEventListener('click', logout);
}

const VIEW_TITLES = {
  dashboard: ['Tổng quan', 'Tình hình hoạt động của câu lạc bộ'],
  members: ['Thành viên', 'Quản lý danh sách và vai trò thành viên'],
  events: ['Sự kiện', 'Lịch hoạt động và mã điểm danh'],
  attendance: ['Điểm danh', 'Ghi nhận tham gia sự kiện'],
  profile: ['Hồ sơ của tôi', 'Thẻ thành viên câu lạc bộ'],
};

function switchView(view){
  if(view === 'members' && !can('manageMembers')) view = 'dashboard';
  currentView = view;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const [title, sub] = VIEW_TITLES[view];
  $('#topbarTitle').textContent = title;
  $('#topbarSub').textContent = sub;
  const renderers = { dashboard: renderDashboard, members: renderMembers, events: renderEvents, attendance: renderAttendance, profile: renderProfile };
  $('#viewRoot').innerHTML = '';
  renderers[view]();
}

/* =========================================================
   DASHBOARD
   ========================================================= */
function renderDashboard(){
  const u = currentUser();
  const totalMembers = state.users.length;
  const totalEvents = state.events.length;
  const upcoming = state.events.filter(ev => ev.date >= today()).sort((a,b) => a.date.localeCompare(b.date))[0];
  const totalAttendance = state.attendance.length;

  const root = $('#viewRoot');
  root.innerHTML = `
    <div class="stat-row">
      <div class="stat-card"><div class="n">${totalMembers}</div><div class="l">Tổng số thành viên</div></div>
      <div class="stat-card"><div class="n">${totalEvents}</div><div class="l">Sự kiện đã tạo</div></div>
      <div class="stat-card"><div class="n">${totalAttendance}</div><div class="l">Lượt điểm danh</div></div>
      <div class="stat-card"><div class="n">${upcoming ? fmtDate(upcoming.date) : '—'}</div><div class="l">Sự kiện gần nhất</div></div>
    </div>
    <div class="dash-grid">
      <div class="panel">
        <h3>Sự kiện sắp diễn ra</h3>
        <div id="dashEvents"></div>
      </div>
      <div class="panel">
        <h3>Thành viên mới tham gia</h3>
        <div id="dashMembers"></div>
      </div>
    </div>
  `;

  const upcomingEvents = state.events.filter(ev => ev.date >= today()).sort((a,b) => a.date.localeCompare(b.date)).slice(0,4);
  $('#dashEvents').innerHTML = upcomingEvents.length ? upcomingEvents.map(ev => `
    <div class="mini-row"><span>${escapeHtml(ev.name)}</span><span class="mssv">${fmtDate(ev.date)}</span></div>
  `).join('') : `<div class="mini-row"><span>Chưa có sự kiện nào sắp tới.</span></div>`;

  const recentMembers = [...state.users].sort((a,b) => b.joined.localeCompare(a.joined)).slice(0,4);
  $('#dashMembers').innerHTML = recentMembers.map(m => `
    <div class="mini-row"><span>${escapeHtml(m.fullName)}</span><span class="badge role-${m.role}">${ROLE_LABEL[m.role]}</span></div>
  `).join('');
}
function today(){ return new Date().toISOString().slice(0,10); }

/* =========================================================
   MEMBERS (admin only)
   ========================================================= */
function renderMembers(){
  const root = $('#viewRoot');
  root.innerHTML = `
    <div class="toolbar">
      <div class="search"><input id="memberSearch" placeholder="Tìm theo tên hoặc MSSV..." /></div>
      <button class="btn" id="addMemberBtn">+ Thêm thành viên</button>
    </div>
    <div id="membersTableWrap"></div>
  `;
  $('#addMemberBtn').addEventListener('click', () => openMemberModal());
  $('#memberSearch').addEventListener('input', (e) => paintMembersTable(e.target.value));
  paintMembersTable('');
}

function paintMembersTable(query){
  const q = query.trim().toLowerCase();
  const rows = state.users.filter(u => !q || u.fullName.toLowerCase().includes(q) || u.mssv.toLowerCase().includes(q));
  const wrap = $('#membersTableWrap');
  if(!rows.length){
    wrap.innerHTML = `<div class="empty-state"><div class="glyph">◇</div>Không tìm thấy thành viên phù hợp.</div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Thành viên</th><th>MSSV</th><th>Email</th><th>Vai trò</th><th>Ngày tham gia</th><th></th></tr></thead>
      <tbody>
        ${rows.map(u => `
          <tr>
            <td><div class="member-cell">${avatarHtml(u.fullName, u.id)}<span>${escapeHtml(u.fullName)}</span></div></td>
            <td class="mssv">${escapeHtml(u.mssv)}</td>
            <td>${escapeHtml(u.email || '—')}</td>
            <td><span class="badge role-${u.role}">${ROLE_LABEL[u.role]}</span></td>
            <td class="mssv">${fmtDate(u.joined)}</td>
            <td>
              <div class="row-actions">
                <button class="btn ghost small" data-edit="${u.id}">Sửa</button>
                <button class="btn danger small" data-del="${u.id}" ${u.id === session.userId ? 'disabled' : ''}>Xóa</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  $$('[data-edit]', wrap).forEach(b => b.addEventListener('click', () => openMemberModal(b.dataset.edit)));
  $$('[data-del]', wrap).forEach(b => b.addEventListener('click', () => deleteMember(b.dataset.del)));
}

function deleteMember(id){
  if(!confirm('Xóa thành viên này khỏi hệ thống?')) return;
  state.users = state.users.filter(u => u.id !== id);
  state.attendance = state.attendance.filter(a => a.userId !== id);
  DB.save(state);
  paintMembersTable($('#memberSearch').value);
  toast('Đã xóa thành viên.');
}

function openMemberModal(id){
  const editing = state.users.find(u => u.id === id);
  const body = `
    <div class="field"><label>Họ và tên</label><input id="mFullName" value="${escapeHtml(editing?.fullName || '')}" /></div>
    <div class="field"><label>MSSV</label><input id="mMssv" value="${escapeHtml(editing?.mssv || '')}" /></div>
    <div class="field"><label>Email</label><input id="mEmail" value="${escapeHtml(editing?.email || '')}" /></div>
    <div class="field"><label>Vai trò</label>
      <select id="mRole">
        <option value="member" ${editing?.role === 'member' ? 'selected' : ''}>Thành viên</option>
        <option value="leader" ${editing?.role === 'leader' ? 'selected' : ''}>Ban điều hành</option>
        <option value="admin" ${editing?.role === 'admin' ? 'selected' : ''}>Quản trị viên</option>
      </select>
    </div>
    ${!editing ? `
    <div class="field"><label>Tên đăng nhập</label><input id="mUsername" /></div>
    <div class="field"><label>Mật khẩu</label><input id="mPassword" type="password" /></div>
    ` : ''}
    <div class="field-error" id="mError"></div>
  `;
  openModal(editing ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới', body, () => {
    const fullName = $('#mFullName').value.trim();
    const mssv = $('#mMssv').value.trim();
    const email = $('#mEmail').value.trim();
    const role = $('#mRole').value;
    if(!fullName || !mssv){ $('#mError').textContent = 'Vui lòng nhập họ tên và MSSV.'; return false; }

    if(editing){
      Object.assign(editing, { fullName, mssv, email, role });
    } else {
      const username = $('#mUsername').value.trim();
      const password = $('#mPassword').value;
      if(!username || password.length < 6){ $('#mError').textContent = 'Tên đăng nhập và mật khẩu (≥6 ký tự) là bắt buộc.'; return false; }
      if(state.users.some(u => u.username === username)){ $('#mError').textContent = 'Tên đăng nhập đã tồn tại.'; return false; }
      state.users.push({ id: uid('u'), username, password, fullName, mssv, email, role, joined: today() });
    }
    DB.save(state);
    paintMembersTable($('#memberSearch')?.value || '');
    toast(editing ? 'Đã cập nhật thành viên.' : 'Đã thêm thành viên mới.');
    return true;
  });
}

/* =========================================================
   EVENTS
   ========================================================= */
function renderEvents(){
  const root = $('#viewRoot');
  root.innerHTML = `
    <div class="toolbar">
      <div class="eyebrow">${state.events.length} sự kiện</div>
      ${can('manageEvents') ? `<button class="btn" id="addEventBtn">+ Tạo sự kiện</button>` : ''}
    </div>
    <div class="event-grid" id="eventGrid"></div>
  `;
  if(can('manageEvents')) $('#addEventBtn').addEventListener('click', () => openEventModal());
  paintEvents();
}

function paintEvents(){
  const grid = $('#eventGrid');
  const list = [...state.events].sort((a,b) => a.date.localeCompare(b.date));
  if(!list.length){ grid.innerHTML = `<div class="empty-state"><div class="glyph">◇</div>Chưa có sự kiện nào.</div>`; return; }
  grid.innerHTML = list.map(ev => {
    const dm = dayMonth(ev.date);
    return `
    <div class="ticket">
      <div class="ticket-date"><div class="d">${dm.d}</div><div class="m">${dm.m}</div></div>
      <div class="ticket-perf"></div>
      <div class="ticket-main">
        <h4>${escapeHtml(ev.name)}</h4>
        <div class="meta">${escapeHtml(ev.location)}</div>
        <div class="meta">${fmtDate(ev.date)}</div>
        <div class="desc">${escapeHtml(ev.description || '')}</div>
        <div class="code-row">
          <span class="code">${escapeHtml(ev.code)}</span>
          <span class="mssv">${state.attendance.filter(a => a.eventId === ev.id).length} đã điểm danh</span>
        </div>
        ${can('manageEvents') ? `
        <div class="actions">
          <button class="btn ghost small" data-edit-ev="${ev.id}">Sửa</button>
          <button class="btn danger small" data-del-ev="${ev.id}">Xóa</button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
  $$('[data-edit-ev]', grid).forEach(b => b.addEventListener('click', () => openEventModal(b.dataset.editEv)));
  $$('[data-del-ev]', grid).forEach(b => b.addEventListener('click', () => deleteEvent(b.dataset.delEv)));
}

function deleteEvent(id){
  if(!confirm('Xóa sự kiện này?')) return;
  state.events = state.events.filter(e => e.id !== id);
  state.attendance = state.attendance.filter(a => a.eventId !== id);
  DB.save(state);
  paintEvents();
  toast('Đã xóa sự kiện.');
}

function openEventModal(id){
  const editing = state.events.find(e => e.id === id);
  const body = `
    <div class="field"><label>Tên sự kiện</label><input id="eName" value="${escapeHtml(editing?.name || '')}" /></div>
    <div class="field"><label>Ngày diễn ra</label><input id="eDate" type="date" value="${editing?.date || ''}" /></div>
    <div class="field"><label>Địa điểm</label><input id="eLocation" value="${escapeHtml(editing?.location || '')}" /></div>
    <div class="field"><label>Mô tả</label><textarea id="eDesc" rows="3">${escapeHtml(editing?.description || '')}</textarea></div>
    <div class="field"><label>Mã điểm danh</label><input id="eCode" value="${escapeHtml(editing?.code || genCode())}" style="text-transform:uppercase" /></div>
    <div class="field-error" id="eError"></div>
  `;
  openModal(editing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới', body, () => {
    const name = $('#eName').value.trim();
    const date = $('#eDate').value;
    const location = $('#eLocation').value.trim();
    const description = $('#eDesc').value.trim();
    const code = $('#eCode').value.trim().toUpperCase();
    if(!name || !date || !location || !code){ $('#eError').textContent = 'Vui lòng điền đầy đủ thông tin bắt buộc.'; return false; }
    if(editing){
      Object.assign(editing, { name, date, location, description, code });
    } else {
      state.events.push({ id: uid('e'), name, date, location, description, code, createdBy: session.userId });
    }
    DB.save(state);
    paintEvents();
    toast(editing ? 'Đã cập nhật sự kiện.' : 'Đã tạo sự kiện mới.');
    return true;
  });
}
function genCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }

/* =========================================================
   ATTENDANCE
   ========================================================= */
function renderAttendance(){
  const root = $('#viewRoot');
  if(can('viewAttendanceAll')){
    root.innerHTML = `
      <div class="toolbar">
        <div class="field" style="margin:0; min-width:280px;">
          <label>Chọn sự kiện</label>
          <select id="attendEventSelect">
            ${state.events.map(ev => `<option value="${ev.id}">${escapeHtml(ev.name)} — ${fmtDate(ev.date)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="attendTableWrap"></div>
    `;
    $('#attendEventSelect').addEventListener('change', paintAttendanceTable);
    if(state.events.length) paintAttendanceTable();
    else $('#attendTableWrap').innerHTML = `<div class="empty-state"><div class="glyph">◇</div>Chưa có sự kiện nào để điểm danh.</div>`;
  } else {
    root.innerHTML = `
      <div class="checkin-box">
        <h3>Điểm danh sự kiện</h3>
        <div class="sub">Nhập mã điểm danh do Ban điều hành cung cấp tại sự kiện.</div>
        <div class="code-input">
          <input id="checkinCode" maxlength="8" placeholder="MÃ SỰ KIỆN" />
          <button class="btn" id="checkinBtn">Điểm danh</button>
        </div>
        <div class="attend-msg" id="checkinMsg"></div>
      </div>
      <div class="stamp-list">
        <h3 style="font-family:var(--font-display); font-size:16px; margin-bottom:10px;">Lịch sử tham gia của tôi</h3>
        <div id="myStamps"></div>
      </div>
    `;
    $('#checkinBtn').addEventListener('click', doSelfCheckin);
    $('#checkinCode').addEventListener('keydown', e => { if(e.key === 'Enter') doSelfCheckin(); });
    paintMyStamps();
  }
}

function paintAttendanceTable(){
  const eventId = $('#attendEventSelect').value;
  const ev = state.events.find(e => e.id === eventId);
  const attendees = state.attendance.filter(a => a.eventId === eventId);
  const wrap = $('#attendTableWrap');
  wrap.innerHTML = `
    <table>
      <thead><tr><th>Thành viên</th><th>MSSV</th><th>Thời gian điểm danh</th><th></th></tr></thead>
      <tbody>
        ${attendees.map(a => {
          const u = state.users.find(x => x.id === a.userId);
          if(!u) return '';
          return `<tr>
            <td><div class="member-cell">${avatarHtml(u.fullName, u.id)}<span>${escapeHtml(u.fullName)}</span></div></td>
            <td class="mssv">${escapeHtml(u.mssv)}</td>
            <td class="mssv">${new Date(a.at).toLocaleString('vi-VN')}</td>
            <td><div class="row-actions"><button class="btn ghost small" data-un="${a.id}">Bỏ điểm danh</button></div></td>
          </tr>`;
        }).join('') || `<tr><td colspan="4"><div class="empty-state">Chưa có ai điểm danh cho "${escapeHtml(ev?.name || '')}".</div></td></tr>`}
      </tbody>
    </table>
    <div class="toolbar" style="margin-top:14px;">
      <div class="field" style="margin:0; flex:1;">
        <label>Điểm danh thủ công cho thành viên</label>
        <select id="manualMemberSelect">
          <option value="">— Chọn thành viên —</option>
          ${state.users.filter(u => !attendees.some(a => a.userId === u.id)).map(u => `<option value="${u.id}">${escapeHtml(u.fullName)} (${u.mssv})</option>`).join('')}
        </select>
      </div>
      <button class="btn secondary" id="manualCheckinBtn" style="align-self:flex-end;">Thêm</button>
    </div>
  `;
  $$('[data-un]', wrap).forEach(b => b.addEventListener('click', () => {
    state.attendance = state.attendance.filter(a => a.id !== b.dataset.un);
    DB.save(state); paintAttendanceTable(); toast('Đã bỏ điểm danh.');
  }));
  $('#manualCheckinBtn').addEventListener('click', () => {
    const userId = $('#manualMemberSelect').value;
    if(!userId) return;
    state.attendance.push({ id: uid('a'), eventId, userId, at: new Date().toISOString() });
    DB.save(state); paintAttendanceTable(); toast('Đã ghi nhận điểm danh.');
  });
}

function doSelfCheckin(){
  const code = $('#checkinCode').value.trim().toUpperCase();
  const msg = $('#checkinMsg');
  const ev = state.events.find(e => e.code === code);
  if(!ev){ msg.className = 'attend-msg err'; msg.textContent = 'Mã điểm danh không hợp lệ.'; return; }
  const already = state.attendance.some(a => a.eventId === ev.id && a.userId === session.userId);
  if(already){ msg.className = 'attend-msg err'; msg.textContent = `Bạn đã điểm danh cho "${ev.name}" trước đó.`; return; }
  state.attendance.push({ id: uid('a'), eventId: ev.id, userId: session.userId, at: new Date().toISOString() });
  DB.save(state);
  msg.className = 'attend-msg ok';
  msg.textContent = `Điểm danh thành công cho "${ev.name}"!`;
  $('#checkinCode').value = '';
  paintMyStamps();
}

function paintMyStamps(){
  const mine = state.attendance.filter(a => a.userId === session.userId)
    .map(a => ({ ...a, ev: state.events.find(e => e.id === a.eventId) }))
    .filter(a => a.ev)
    .sort((a,b) => b.at.localeCompare(a.at));
  const wrap = $('#myStamps');
  wrap.innerHTML = mine.length ? mine.map(a => `
    <div class="stamp-row"><span class="stamp">✓</span><span>${escapeHtml(a.ev.name)}</span><span class="mssv" style="margin-left:auto;">${fmtDate(a.ev.date)}</span></div>
  `).join('') : `<div class="empty-state"><div class="glyph">◇</div>Bạn chưa điểm danh sự kiện nào.</div>`;
}

/* =========================================================
   PROFILE / MEMBERSHIP CARD
   ========================================================= */
function renderProfile(){
  const u = currentUser();
  const attendedCount = state.attendance.filter(a => a.userId === u.id).length;
  const root = $('#viewRoot');
  root.innerHTML = `
    <div class="card-wrap">
      <div class="mcard">
        <div class="mcard-top">
          <div class="club">Ngoc Van <span>CLB</span></div>
          <span class="badge role-${u.role}">${ROLE_LABEL[u.role]}</span>
        </div>
        <div class="mcard-body">
          ${avatarHtml(u.fullName, u.id, 'avatar-lg')}
          <div>
            <div class="fullname">${escapeHtml(u.fullName)}</div>
            <div class="mssv-line">${escapeHtml(u.mssv)}</div>
          </div>
        </div>
        <div class="mcard-perf"></div>
        <div class="mcard-bottom">
          <div><div class="k">Tham gia từ</div><div class="v">${fmtDate(u.joined)}</div></div>
          <div><div class="k">Email</div><div class="v">${escapeHtml(u.email || '—')}</div></div>
          <div><div class="k">Đã điểm danh</div><div class="v">${attendedCount} sự kiện</div></div>
        </div>
      </div>
    </div>
    <div class="panel" style="max-width:420px; margin:22px auto 0;">
      <h3>Đổi mật khẩu</h3>
      <div class="field"><label>Mật khẩu mới</label><input id="newPassword" type="password" placeholder="Tối thiểu 6 ký tự" /></div>
      <div class="field-error" id="pwError"></div>
      <button class="btn secondary" id="pwSaveBtn">Cập nhật mật khẩu</button>
    </div>
  `;
  $('#pwSaveBtn').addEventListener('click', () => {
    const pw = $('#newPassword').value;
    if(pw.length < 6){ $('#pwError').textContent = 'Mật khẩu cần tối thiểu 6 ký tự.'; return; }
    u.password = pw;
    DB.save(state);
    $('#newPassword').value = '';
    $('#pwError').textContent = '';
    toast('Đã cập nhật mật khẩu.');
  });
}

/* =========================================================
   MODAL
   ========================================================= */
function openModal(title, bodyHtml, onSave){
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>${title}</h3><button class="modal-close">✕</button></div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-foot">
        <button class="btn ghost" data-cancel>Hủy</button>
        <button class="btn" data-save>Lưu</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if(e.target === backdrop) close(); });
  $('.modal-close', backdrop).addEventListener('click', close);
  $('[data-cancel]', backdrop).addEventListener('click', close);
  $('[data-save]', backdrop).addEventListener('click', () => { if(onSave() !== false) close(); });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  $$('.auth-tabs button').forEach(b => b.addEventListener('click', () => setAuthTab(b.dataset.tab)));
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);

  if(session && currentUser()){
    enterApp();
  }
});