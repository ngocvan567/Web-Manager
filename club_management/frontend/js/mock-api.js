// ===== MOCK API - LƯU DỮ LIỆU BẰNG LOCALSTORAGE =====
// File này mô phỏng backend bằng localStorage để demo không cần server

const DB_KEYS = {
  users: 'club_users',
  members: 'club_members',
  departments: 'club_departments',
  events: 'club_events',
  attendance: 'club_attendance',
  announcements: 'club_announcements',
  registrations: 'club_registrations',
  storage: 'club_storage',
  session: 'club_session',
};

// ===== DATABASE HELPERS =====
function dbGet(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function dbSet(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function dbGetById(key, id) {
  return dbGet(key).find(item => item.id === id);
}

function dbNextId(key) {
  const items = dbGet(key);
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
}

// ===== SEED DATA =====
function seedDatabase() {
  // Seed departments
  if (!localStorage.getItem(DB_KEYS.departments)) {
    dbSet(DB_KEYS.departments, [
      { id: 1, name: 'Ban Chủ nhiệm', code: 'EXECUTIVE', description: 'Điều hành và quản lý hoạt động chung của câu lạc bộ', member_count: 0, leader_name: null, vice_leader_name: null },
      { id: 2, name: 'Ban Học thuật', code: 'ACADEMIC', description: 'Quản lý hoạt động học thuật của câu lạc bộ', member_count: 0, leader_name: null, vice_leader_name: null },
      { id: 3, name: 'Ban Vận hành', code: 'OPERATION', description: 'Quản lý hoạt động vận hành và tổ chức sự kiện', member_count: 0, leader_name: null, vice_leader_name: null },
      { id: 4, name: 'Ban Cố vấn', code: 'ADVISORY', description: 'Tư vấn và hỗ trợ định hướng cho câu lạc bộ', member_count: 0, leader_name: null, vice_leader_name: null },
    ]);
  }
  
  // Seed admin account
  if (!localStorage.getItem(DB_KEYS.users)) {
    const admin = {
      id: 1,
      mssv: 'ADMIN001',
      name: 'Quản trị viên',
      email: 'admin@club.com',
      password: 'admin123',
      phone: '',
      major: '',
      course: '',
      role: 'ADMIN',
      department: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dbSet(DB_KEYS.users, [admin]);
    dbSet(DB_KEYS.members, []);
  }
  
  // Seed sample events
  if (!localStorage.getItem(DB_KEYS.events)) {
    dbSet(DB_KEYS.events, [
      {
        id: 1,
        name: 'Workshop Lập trình Web',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Phòng B1.201',
        description: 'Workshop giới thiệu về lập trình web hiện đại',
        status: 'ACTIVE',
        registered_count: 0,
        present_count: 0,
        absent_count: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Giao lưu Câu lạc bộ',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Sân trường',
        description: 'Hoạt động giao lưu giữa các câu lạc bộ',
        status: 'ACTIVE',
        registered_count: 0,
        present_count: 0,
        absent_count: 0,
        created_at: new Date().toISOString(),
      },
    ]);
  }
  
  // Seed announcements
  if (!localStorage.getItem(DB_KEYS.announcements)) {
    dbSet(DB_KEYS.announcements, [
      {
        id: 1,
        title: 'Chào mừng đến với Câu lạc bộ',
        content: 'Chào mừng tất cả thành viên mới đến với câu lạc bộ của chúng ta!',
        target: 'ALL',
        status: 'SENT',
        created_at: new Date().toISOString(),
      },
    ]);
  }
  
  // Seed attendance
  if (!localStorage.getItem(DB_KEYS.attendance)) {
    dbSet(DB_KEYS.attendance, []);
  }
  
  // Seed registrations
  if (!localStorage.getItem(DB_KEYS.registrations)) {
    dbSet(DB_KEYS.registrations, []);
  }
  
  // Seed storage
  if (!localStorage.getItem(DB_KEYS.storage)) {
    dbSet(DB_KEYS.storage, []);
  }
}

// ===== AUTH MOCK =====
const MockAuth = {
  register(data) {
    const users = dbGet(DB_KEYS.users);
    
    // Check duplicate
    const exists = users.find(u => u.mssv === data.mssv || u.email === data.email);
    if (exists) {
      throw new Error('MSSV hoặc Email đã được sử dụng.');
    }
    
    const newUser = {
      id: dbNextId(DB_KEYS.users),
      mssv: data.mssv,
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone || '',
      major: data.major || '',
      course: data.course || '',
      role: 'MEMBER',
      department: null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    users.push(newUser);
    dbSet(DB_KEYS.users, users);
    
    // Also add to members
    const members = dbGet(DB_KEYS.members);
    members.push({
      id: newUser.id,
      mssv: newUser.mssv,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      major: newUser.major,
      course: newUser.course,
      department: null,
      status: 'ACTIVE',
      created_at: newUser.created_at,
    });
    dbSet(DB_KEYS.members, members);
    
    return { message: 'Đăng ký thành công!' };
  },
  
  login(data) {
    const users = dbGet(DB_KEYS.users);
    const user = users.find(u => 
      (u.mssv === data.identifier || u.email === data.identifier) && 
      u.password === data.password
    );
    
    if (!user) {
      throw new Error('MSSV/Email hoặc mật khẩu không đúng.');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new Error('Tài khoản đã bị khóa.');
    }
    
    const token = 'mock_token_' + user.id + '_' + Date.now();
    localStorage.setItem(DB_KEYS.session, JSON.stringify({ token, user_id: user.id }));
    
    const { password, ...userData } = user;
    return { token, user: userData };
  },
  
  logout() {
    localStorage.removeItem(DB_KEYS.session);
    return { message: 'Đăng xuất thành công!' };
  },
};

// ===== USERS MOCK =====
const MockUsers = {
  getAll() {
    const users = dbGet(DB_KEYS.users);
    return users.map(({ password, ...user }) => user);
  },
  
  getById(id) {
    const user = dbGetById(DB_KEYS.users, id);
    if (!user) throw new Error('Không tìm thấy tài khoản');
    const { password, ...userData } = user;
    return userData;
  },
  
  create(data) {
    const users = dbGet(DB_KEYS.users);
    const exists = users.find(u => u.mssv === data.mssv || u.email === data.email);
    if (exists) throw new Error('MSSV hoặc Email đã được sử dụng.');
    
    const newUser = {
      id: dbNextId(DB_KEYS.users),
      mssv: data.mssv,
      name: data.name,
      email: data.email,
      password: data.password || '123456',
      phone: data.phone || '',
      major: data.major || '',
      course: data.course || '',
      role: data.role || 'MEMBER',
      department: data.department_id || null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    users.push(newUser);
    dbSet(DB_KEYS.users, users);
    
    // Update members
    const members = dbGet(DB_KEYS.members);
    const member = members.find(m => m.id === newUser.id);
    if (member) {
      member.department = newUser.department;
      member.role = newUser.role;
      dbSet(DB_KEYS.members, members);
    }
    
    return { message: 'Tạo tài khoản thành công!', user: newUser };
  },
  
  update(id, data) {
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    users[index] = { ...users[index], ...data, updated_at: new Date().toISOString() };
    dbSet(DB_KEYS.users, users);
    
    // Update members
    const members = dbGet(DB_KEYS.members);
    const memberIndex = members.findIndex(m => m.id === id);
    if (memberIndex !== -1) {
      members[memberIndex] = { 
        ...members[memberIndex], 
        ...data, 
        department: data.department_id || members[memberIndex].department,
        updated_at: new Date().toISOString() 
      };
      dbSet(DB_KEYS.members, members);
    }
    
    return { message: 'Cập nhật tài khoản thành công!' };
  },
  
  delete(id) {
    let users = dbGet(DB_KEYS.users);
    users = users.filter(u => u.id !== id);
    dbSet(DB_KEYS.users, users);
    
    let members = dbGet(DB_KEYS.members);
    members = members.filter(m => m.id !== id);
    dbSet(DB_KEYS.members, members);
    
    return { message: 'Xóa tài khoản thành công!' };
  },
  
  changeRole(id, role) {
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    users[index].role = role;
    users[index].updated_at = new Date().toISOString();
    dbSet(DB_KEYS.users, users);
    
    return { message: `Đã chuyển quyền thành ${role}!` };
  },
  
  changeStatus(id, status) {
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    users[index].status = status;
    users[index].updated_at = new Date().toISOString();
    dbSet(DB_KEYS.users, users);
    
    return { message: 'Cập nhật trạng thái thành công!' };
  },
  
  resetPassword(id) {
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    users[index].password = '123456';
    users[index].updated_at = new Date().toISOString();
    dbSet(DB_KEYS.users, users);
    
    return { message: 'Đã đặt lại mật khẩu thành 123456!' };
  },
};

// ===== MEMBERS MOCK =====
const MockMembers = {
  getAll() {
    return dbGet(DB_KEYS.members);
  },
  
  getById(id) {
    const member = dbGetById(DB_KEYS.members, id);
    if (!member) throw new Error('Không tìm thấy thành viên');
    return member;
  },
  
  create(data) {
    const members = dbGet(DB_KEYS.members);
    const exists = members.find(m => m.mssv === data.mssv);
    if (exists) throw new Error('MSSV đã tồn tại');
    
    const newMember = {
      id: dbNextId(DB_KEYS.members),
      mssv: data.mssv,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      major: data.major || '',
      course: data.course || '',
      department: data.department_id || null,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    
    members.push(newMember);
    dbSet(DB_KEYS.members, members);
    
    // Also create user account
    const users = dbGet(DB_KEYS.users);
    const userExists = users.find(u => u.mssv === data.mssv);
    if (!userExists) {
      users.push({
        id: newMember.id,
        mssv: data.mssv,
        name: data.name,
        email: data.email,
        password: '123456',
        phone: data.phone || '',
        major: data.major || '',
        course: data.course || '',
        role: 'MEMBER',
        department: data.department_id || null,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      dbSet(DB_KEYS.users, users);
    }
    
    return { message: 'Thêm thành viên thành công!' };
  },
  
  update(id, data) {
    const members = dbGet(DB_KEYS.members);
    const index = members.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Không tìm thấy thành viên');
    
    members[index] = { ...members[index], ...data, updated_at: new Date().toISOString() };
    dbSet(DB_KEYS.members, members);
    
    // Update user
    const users = dbGet(DB_KEYS.users);
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...data, updated_at: new Date().toISOString() };
      dbSet(DB_KEYS.users, users);
    }
    
    return { message: 'Cập nhật thành viên thành công!' };
  },
  
  delete(id) {
    let members = dbGet(DB_KEYS.members);
    members = members.filter(m => m.id !== id);
    dbSet(DB_KEYS.members, members);
    return { message: 'Xóa thành viên thành công!' };
  },
  
  changeDepartment(id, departmentId) {
    const members = dbGet(DB_KEYS.members);
    const index = members.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Không tìm thấy thành viên');
    
    members[index].department = departmentId;
    members[index].updated_at = new Date().toISOString();
    dbSet(DB_KEYS.members, members);
    
    // Update user department
    const users = dbGet(DB_KEYS.users);
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      users[userIndex].department = departmentId;
      users[userIndex].updated_at = new Date().toISOString();
      dbSet(DB_KEYS.users, users);
    }
    
    return { message: 'Chuyển ban thành công!' };
  },
  
  removeFromDepartment(id) {
    return MockMembers.changeDepartment(id, null);
  },
};

// ===== DEPARTMENTS MOCK =====
const MockDepartments = {
  getAll() {
    const departments = dbGet(DB_KEYS.departments);
    const members = dbGet(DB_KEYS.members);
    
    return departments.map(dept => ({
      ...dept,
      member_count: members.filter(m => m.department === dept.code).length,
    }));
  },
  
  getById(id) {
    const dept = dbGetById(DB_KEYS.departments, id);
    if (!dept) throw new Error('Không tìm thấy ban');
    return dept;
  },
  
  create(data) {
    const departments = dbGet(DB_KEYS.departments);
    const exists = departments.find(d => d.code === data.code);
    if (exists) throw new Error('Mã ban đã tồn tại');
    
    const newDept = {
      id: dbNextId(DB_KEYS.departments),
      name: data.name,
      code: data.code,
      description: data.description || '',
      member_count: 0,
      leader_name: null,
      vice_leader_name: null,
    };
    
    departments.push(newDept);
    dbSet(DB_KEYS.departments, departments);
    
    return { message: 'Tạo ban thành công!' };
  },
  
  update(id, data) {
    const departments = dbGet(DB_KEYS.departments);
    const index = departments.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Không tìm thấy ban');
    
    departments[index] = { ...departments[index], ...data };
    dbSet(DB_KEYS.departments, departments);
    
    return { message: 'Cập nhật ban thành công!' };
  },
  
  delete(id) {
    let departments = dbGet(DB_KEYS.departments);
    departments = departments.filter(d => d.id !== id);
    dbSet(DB_KEYS.departments, departments);
    return { message: 'Xóa ban thành công!' };
  },
  
  getMembers(id) {
    const dept = dbGetById(DB_KEYS.departments, id);
    if (!dept) throw new Error('Không tìm thấy ban');
    
    const members = dbGet(DB_KEYS.members);
    return members.filter(m => m.department === dept.code);
  },
  
  setLeader(id, memberId) {
    const departments = dbGet(DB_KEYS.departments);
    const index = departments.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Không tìm thấy ban');
    
    const members = dbGet(DB_KEYS.members);
    const member = members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy thành viên');
    
    departments[index].leader_name = member.name;
    dbSet(DB_KEYS.departments, departments);
    
    return { message: 'Thiết lập Trưởng ban thành công!' };
  },
  
  setViceLeader(id, memberId) {
    const departments = dbGet(DB_KEYS.departments);
    const index = departments.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Không tìm thấy ban');
    
    const members = dbGet(DB_KEYS.members);
    const member = members.find(m => m.id === memberId);
    if (!member) throw new Error('Không tìm thấy thành viên');
    
    departments[index].vice_leader_name = member.name;
    dbSet(DB_KEYS.departments, departments);
    
    return { message: 'Thiết lập Phó ban thành công!' };
  },
};

// ===== EVENTS MOCK =====
const MockEvents = {
  getAll() {
    return dbGet(DB_KEYS.events);
  },
  
  getById(id) {
    const event = dbGetById(DB_KEYS.events, id);
    if (!event) throw new Error('Không tìm thấy sự kiện');
    return event;
  },
  
  create(data) {
    const events = dbGet(DB_KEYS.events);
    const newEvent = {
      id: dbNextId(DB_KEYS.events),
      name: data.name,
      date: data.date,
      location: data.location || '',
      description: data.description || '',
      status: 'ACTIVE',
      registered_count: 0,
      present_count: 0,
      absent_count: 0,
      created_at: new Date().toISOString(),
    };
    
    events.push(newEvent);
    dbSet(DB_KEYS.events, events);
    
    return { message: 'Tạo sự kiện thành công!' };
  },
  
  update(id, data) {
    const events = dbGet(DB_KEYS.events);
    const index = events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Không tìm thấy sự kiện');
    
    events[index] = { ...events[index], ...data };
    dbSet(DB_KEYS.events, events);
    
    return { message: 'Cập nhật sự kiện thành công!' };
  },
  
  delete(id) {
    let events = dbGet(DB_KEYS.events);
    events = events.filter(e => e.id !== id);
    dbSet(DB_KEYS.events, events);
    return { message: 'Xóa sự kiện thành công!' };
  },
  
  cancel(id) {
    const events = dbGet(DB_KEYS.events);
    const index = events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Không tìm thấy sự kiện');
    
    events[index].status = 'CANCELLED';
    dbSet(DB_KEYS.events, events);
    
    return { message: 'Đã hủy sự kiện!' };
  },
  
  getRegistrations(id) {
    const registrations = dbGet(DB_KEYS.registrations);
    const members = dbGet(DB_KEYS.members);
    
    return registrations
      .filter(r => r.event_id === id)
      .map(reg => {
        const member = members.find(m => m.id === reg.member_id);
        return {
          ...reg,
          mssv: member ? member.mssv : '',
          name: member ? member.name : '',
          email: member ? member.email : '',
          department: member ? member.department : null,
        };
      });
  },
  
  getStats(id) {
    const event = dbGetById(DB_KEYS.events, id);
    if (!event) throw new Error('Không tìm thấy sự kiện');
    return {
      registered: event.registered_count || 0,
      present: event.present_count || 0,
      absent: event.absent_count || 0,
    };
  },
};

// ===== ATTENDANCE MOCK =====
const MockAttendance = {
  getAll() {
    const attendance = dbGet(DB_KEYS.attendance);
    const events = dbGet(DB_KEYS.events);
    
    return attendance.map(session => {
      const event = events.find(e => e.id === session.event_id);
      return {
        ...session,
        event_name: event ? event.name : '',
      };
    });
  },
  
  getById(id) {
    const session = dbGetById(DB_KEYS.attendance, id);
    if (!session) throw new Error('Không tìm thấy phiên điểm danh');
    
    const members = dbGet(DB_KEYS.members);
    const sessionMembers = session.members || [];
    
    return {
      ...session,
      members: members.map(member => {
        const record = sessionMembers.find(sm => sm.member_id === member.id);
        return {
          ...member,
          status: record ? record.status : 'PENDING',
        };
      }),
    };
  },
  
  create(data) {
    const attendance = dbGet(DB_KEYS.attendance);
    const members = dbGet(DB_KEYS.members);
    
    const newSession = {
      id: dbNextId(DB_KEYS.attendance),
      event_id: data.event_id,
      date: data.date,
      status: 'OPEN',
      members: members.map(m => ({ member_id: m.id, status: 'PENDING' })),
      present_count: 0,
      absent_count: 0,
      created_at: new Date().toISOString(),
    };
    
    attendance.push(newSession);
    dbSet(DB_KEYS.attendance, attendance);
    
    return { message: 'Tạo phiên điểm danh thành công!' };
  },
  
  open(id) {
    const attendance = dbGet(DB_KEYS.attendance);
    const index = attendance.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy phiên điểm danh');
    
    attendance[index].status = 'OPEN';
    dbSet(DB_KEYS.attendance, attendance);
    
    return { message: 'Đã mở phiên điểm danh!' };
  },
  
  close(id) {
    const attendance = dbGet(DB_KEYS.attendance);
    const index = attendance.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy phiên điểm danh');
    
    attendance[index].status = 'CLOSED';
    const members = attendance[index].members || [];
    attendance[index].present_count = members.filter(m => m.status === 'PRESENT').length;
    attendance[index].absent_count = members.filter(m => m.status === 'ABSENT').length;
    dbSet(DB_KEYS.attendance, attendance);
    
    return { message: 'Đã đóng phiên điểm danh!' };
  },
  
  mark(id, memberId, status) {
    const attendance = dbGet(DB_KEYS.attendance);
    const index = attendance.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy phiên điểm danh');
    
    if (!attendance[index].members) attendance[index].members = [];
    const memberIndex = attendance[index].members.findIndex(m => m.member_id === memberId);
    
    if (memberIndex === -1) {
      attendance[index].members.push({ member_id: memberId, status });
    } else {
      attendance[index].members[memberIndex].status = status;
    }
    
    dbSet(DB_KEYS.attendance, attendance);
    
    return { message: 'Điểm danh thành công!' };
  },
  
  updateStatus(id, memberId, status) {
    return MockAttendance.mark(id, memberId, status);
  },
  
  getHistory() {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) return [];
    
    const { user_id } = JSON.parse(session);
    const attendance = dbGet(DB_KEYS.attendance);
    const events = dbGet(DB_KEYS.events);
    
    return attendance.map(s => {
      const event = events.find(e => e.id === s.event_id);
      const record = (s.members || []).find(m => m.member_id === user_id);
      return {
        event_name: event ? event.name : '',
        date: s.date,
        status: record ? record.status : 'PENDING',
      };
    });
  },
  
  getRate() {
    const history = MockAttendance.getHistory();
    if (history.length === 0) return { rate: 0 };
    
    const present = history.filter(h => h.status === 'PRESENT').length;
    const rate = Math.round((present / history.length) * 100);
    return { rate };
  },
};

// ===== ANNOUNCEMENTS MOCK =====
const MockAnnouncements = {
  getAll() {
    return dbGet(DB_KEYS.announcements);
  },
  
  getById(id) {
    const ann = dbGetById(DB_KEYS.announcements, id);
    if (!ann) throw new Error('Không tìm thấy thông báo');
    return ann;
  },
  
  create(data) {
    const announcements = dbGet(DB_KEYS.announcements);
    const newAnn = {
      id: dbNextId(DB_KEYS.announcements),
      title: data.title,
      content: data.content,
      target: data.target || 'ALL',
      status: 'DRAFT',
      created_at: new Date().toISOString(),
    };
    
    announcements.push(newAnn);
    dbSet(DB_KEYS.announcements, announcements);
    
    return { message: 'Tạo thông báo thành công!' };
  },
  
  update(id, data) {
    const announcements = dbGet(DB_KEYS.announcements);
    const index = announcements.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy thông báo');
    
    announcements[index] = { ...announcements[index], ...data };
    dbSet(DB_KEYS.announcements, announcements);
    
    return { message: 'Cập nhật thông báo thành công!' };
  },
  
  delete(id) {
    let announcements = dbGet(DB_KEYS.announcements);
    announcements = announcements.filter(a => a.id !== id);
    dbSet(DB_KEYS.announcements, announcements);
    return { message: 'Xóa thông báo thành công!' };
  },
  
  send(id) {
    const announcements = dbGet(DB_KEYS.announcements);
    const index = announcements.findIndex(a => a.id === id);
    if (index === -1) throw new Error('Không tìm thấy thông báo');
    
    announcements[index].status = 'SENT';
    dbSet(DB_KEYS.announcements, announcements);
    
    return { message: 'Đã gửi thông báo!' };
  },
};

// ===== REGISTRATIONS MOCK =====
const MockRegistrations = {
  getAll() {
    const registrations = dbGet(DB_KEYS.registrations);
    const members = dbGet(DB_KEYS.members);
    const events = dbGet(DB_KEYS.events);
    
    return registrations.map(reg => {
      const member = members.find(m => m.id === reg.member_id);
      const event = events.find(e => e.id === reg.event_id);
      return {
        ...reg,
        name: member ? member.name : '',
        mssv: member ? member.mssv : '',
        event_name: event ? event.name : '',
      };
    });
  },
  
  getByEvent(eventId) {
    return MockEvents.getRegistrations(eventId);
  },
  
  register(eventId) {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) throw new Error('Chưa đăng nhập');
    
    const { user_id } = JSON.parse(session);
    const registrations = dbGet(DB_KEYS.registrations);
    
    const exists = registrations.find(r => r.event_id === eventId && r.member_id === user_id);
    if (exists) throw new Error('Bạn đã đăng ký sự kiện này rồi');
    
    registrations.push({
      id: dbNextId(DB_KEYS.registrations),
      event_id: eventId,
      member_id: user_id,
      status: 'REGISTERED',
      created_at: new Date().toISOString(),
    });
    dbSet(DB_KEYS.registrations, registrations);
    
    // Update event count
    const events = dbGet(DB_KEYS.events);
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex !== -1) {
      events[eventIndex].registered_count = (events[eventIndex].registered_count || 0) + 1;
      dbSet(DB_KEYS.events, events);
    }
    
    return { message: 'Đăng ký sự kiện thành công!' };
  },
  
  cancel(eventId) {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) throw new Error('Chưa đăng nhập');
    
    const { user_id } = JSON.parse(session);
    let registrations = dbGet(DB_KEYS.registrations);
    registrations = registrations.filter(r => !(r.event_id === eventId && r.member_id === user_id));
    dbSet(DB_KEYS.registrations, registrations);
    
    return { message: 'Hủy đăng ký thành công!' };
  },
  
  getMyRegistrations() {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) return [];
    
    const { user_id } = JSON.parse(session);
    const registrations = dbGet(DB_KEYS.registrations);
    const events = dbGet(DB_KEYS.events);
    
    return registrations
      .filter(r => r.member_id === user_id)
      .map(reg => {
        const event = events.find(e => e.id === reg.event_id);
        return { ...reg, event_name: event ? event.name : '' };
      });
  },
};

// ===== STATISTICS MOCK =====
const MockStatistics = {
  getOverview() {
    const users = dbGet(DB_KEYS.users);
    const members = dbGet(DB_KEYS.members);
    const departments = dbGet(DB_KEYS.departments);
    const events = dbGet(DB_KEYS.events);
    const announcements = dbGet(DB_KEYS.announcements);
    const registrations = dbGet(DB_KEYS.registrations);
    
    return {
      total_users: users.length,
      total_members: members.length,
      total_departments: departments.length,
      total_events: events.length,
      total_announcements: announcements.length,
      total_registrations: registrations.length,
      attendance_rate: MockAttendance.getRate().rate,
    };
  },
  
  getMembers() {
    return dbGet(DB_KEYS.members);
  },
  
  getEvents() {
    return dbGet(DB_KEYS.events);
  },
  
  getAttendance() {
    return dbGet(DB_KEYS.attendance);
  },
};

// ===== STORAGE MOCK =====
const MockStorage = {
  getAll() {
    return dbGet(DB_KEYS.storage);
  },
  
  upload(data) {
    const storage = dbGet(DB_KEYS.storage);
    const newFile = {
      id: dbNextId(DB_KEYS.storage),
      name: data.name,
      type: data.type,
      size: data.size,
      data: data.data,
      created_at: new Date().toISOString(),
    };
    
    storage.push(newFile);
    dbSet(DB_KEYS.storage, storage);
    
    return { message: 'Tải lên thành công!' };
  },
  
  delete(id) {
    let storage = dbGet(DB_KEYS.storage);
    storage = storage.filter(f => f.id !== id);
    dbSet(DB_KEYS.storage, storage);
    return { message: 'Xóa file thành công!' };
  },
  
  download(id) {
    const file = dbGetById(DB_KEYS.storage, id);
    if (!file) throw new Error('Không tìm thấy file');
    return file;
  },
};

// ===== PROFILE MOCK =====
const MockProfile = {
  get() {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) throw new Error('Chưa đăng nhập');
    
    const { user_id } = JSON.parse(session);
    const user = dbGetById(DB_KEYS.users, user_id);
    if (!user) throw new Error('Không tìm thấy tài khoản');
    
    const { password, ...userData } = user;
    return userData;
  },
  
  update(data) {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) throw new Error('Chưa đăng nhập');
    
    const { user_id } = JSON.parse(session);
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === user_id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    users[index] = { ...users[index], ...data, updated_at: new Date().toISOString() };
    dbSet(DB_KEYS.users, users);
    
    // Update members
    const members = dbGet(DB_KEYS.members);
    const memberIndex = members.findIndex(m => m.id === user_id);
    if (memberIndex !== -1) {
      members[memberIndex] = { ...members[memberIndex], ...data };
      dbSet(DB_KEYS.members, members);
    }
    
    return { message: 'Cập nhật hồ sơ thành công!' };
  },
  
  changePassword(data) {
    const session = localStorage.getItem(DB_KEYS.session);
    if (!session) throw new Error('Chưa đăng nhập');
    
    const { user_id } = JSON.parse(session);
    const users = dbGet(DB_KEYS.users);
    const index = users.findIndex(u => u.id === user_id);
    if (index === -1) throw new Error('Không tìm thấy tài khoản');
    
    if (users[index].password !== data.current_password) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }
    
    users[index].password = data.new_password;
    users[index].updated_at = new Date().toISOString();
    dbSet(DB_KEYS.users, users);
    
    return { message: 'Đổi mật khẩu thành công!' };
  },
};

// ===== INITIALIZE =====
seedDatabase();

// ===== EXPORT MOCK API =====
window.MockAPI = {
  Auth: MockAuth,
  Users: MockUsers,
  Members: MockMembers,
  Departments: MockDepartments,
  Events: MockEvents,
  Attendance: MockAttendance,
  Announcements: MockAnnouncements,
  Registrations: MockRegistrations,
  Statistics: MockStatistics,
  Storage: MockStorage,
  Profile: MockProfile,
};