// ===== API - BACKEND THẬT =====
const USE_MOCK = false;
const API_BASE_URL = '/api';

function resolveAppPath(path) {
  const scripts = document.querySelectorAll('script[src$="js/api.js"]');
  let base = '';
  if (scripts.length) {
    const src = scripts[0].getAttribute('src') || '';
    base = src.replace(/js\/api\.js$/, '');
  }
  return base + path.replace(/^\//, '');
}
window.resolveAppPath = resolveAppPath;

function normalizeUser(user) {
  if (!user) return user;
  return {
    ...user,
    name: user.name || user.full_name || '',
    mssv: user.mssv || user.student_code || '',
    role: String(user.role || 'member').toUpperCase(),
    status: String(user.status || 'ACTIVE').toUpperCase(),
    department: user.department || user.department_name || user.department_id || null,
    departmentName: user.departmentName || user.department_name || ''
  };
}

function normalizeMember(row) {
  if (!row) return row;
  return {
    ...row,
    id: row.id ?? row.user_id,
    name: row.name || row.full_name || '',
    mssv: row.mssv || row.student_code || '',
    role: String(row.role || 'member').toUpperCase(),
    status: String(row.status || 'ACTIVE').toUpperCase(),
    department: row.department || row.department_name || row.department_id || null,
    departmentName: row.departmentName || row.department_name || ''
  };
}

function normalizeEvent(row) {
  if (!row) return row;
  return {
    ...row,
    id: row.id ?? row.event_id,
    name: row.name || row.title || '',
    date: row.date || row.start_time,
    status: row.status || 'ACTIVE',
    registered_count: Number(row.registered_count || 0)
  };
}

async function apiRequest(endpoint, method='GET', data=null) {
  const token = localStorage.getItem('token');
  const headers = {'Content-Type':'application/json'};
  if (token) headers.Authorization = `Bearer ${token}`;

  const config = {method, headers};
  if (data !== null && data !== undefined) config.body = JSON.stringify(data);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (e) {
    throw new Error('Không kết nối được Backend. Hãy chắc chắn Flask đang chạy tại http://127.0.0.1:5500');
  }

  // Read once as text: this prevents "Unexpected end of JSON input"
  // when a server/proxy accidentally returns an empty body.
  const text = await response.text();
  let result = {};
  if (text.trim()) {
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('Response không phải JSON:', text);
      throw new Error(`Backend trả về dữ liệu không hợp lệ (HTTP ${response.status})`);
    }
  }

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('login.html')) {
      window.location.href = resolveAppPath('/login.html');
    }
    throw new Error(result.message || 'Phiên đăng nhập đã hết hạn');
  }
  if (response.status === 403) throw new Error(result.message || 'Bạn không có quyền thực hiện thao tác này');
  if (!response.ok) throw new Error(result.message || `Lỗi HTTP ${response.status}`);
  return result;
}

function dataOf(result) {
  return result && Object.prototype.hasOwnProperty.call(result, 'data') ? result.data : result;
}

const AuthAPI = {
  register: async data => {
    const r = await apiRequest('/register','POST',data);
    if (r.user) r.user = normalizeUser(r.user);
    return r;
  },
  login: async data => {
    const payload = {username: data.username || data.identifier || data.email, password: data.password};
    const r = await apiRequest('/login','POST',payload);
    if (r.user) r.user = normalizeUser(r.user);
    return r;
  },
  me: async () => {
    const r = await apiRequest('/me');
    if (r.user) r.user = normalizeUser(r.user);
    return r;
  },
  logout: () => apiRequest('/logout','POST')
};

const UsersAPI = {
  getAll: async()=> (dataOf(await apiRequest('/users'))||[]).map(normalizeUser),
  getById: async id=>normalizeUser(dataOf(await apiRequest(`/users/${id}`))),
  create: data=>apiRequest('/users','POST',data),
  update: (id,data)=>apiRequest(`/users/${id}`,'PUT',data),
  delete: id=>apiRequest(`/users/${id}`,'DELETE'),
  changeRole: (id,role)=>apiRequest(`/users/${id}/role`,'PUT',{role}),
  changeStatus: (id,status)=>apiRequest(`/users/${id}/status`,'PUT',{status}),
  resetPassword: id=>apiRequest(`/users/${id}/reset-password`,'POST')
};

const MembersAPI = {
  getAll: async()=> (dataOf(await apiRequest('/members'))||[]).map(normalizeMember),
  getById: async id=>normalizeMember(dataOf(await apiRequest(`/members/${id}`))),
  create: data=>apiRequest('/members','POST',data),
  update: (id,data)=>apiRequest(`/members/${id}`,'PUT',data),
  delete: id=>apiRequest(`/members/${id}`,'DELETE'),
  addToDepartment: (id,departmentId)=>apiRequest(`/members/${id}/department`,'POST',{department_id:departmentId}),
  removeFromDepartment: id=>apiRequest(`/members/${id}/department`,'DELETE'),
  changeDepartment: (id,departmentId)=>apiRequest(`/members/${id}/department`,'PUT',{department_id:departmentId})
};

const DepartmentsAPI = {
  getAll: async()=>dataOf(await apiRequest('/departments'))||[],
  getById: async id=>dataOf(await apiRequest(`/departments/${id}`)),
  create: data=>apiRequest('/departments','POST',data),
  update: (id,data)=>apiRequest(`/departments/${id}`,'PUT',data),
  delete: id=>apiRequest(`/departments/${id}`,'DELETE'),
  getMembers: async id=>dataOf(await apiRequest(`/departments/${id}/members`))||[],
  setLeader: (id,memberId)=>apiRequest(`/departments/${id}/leader`,'PUT',{member_id:memberId}),
  setViceLeader: (id,memberId)=>apiRequest(`/departments/${id}/vice-leader`,'PUT',{member_id:memberId})
};

const EventsAPI = {
  getAll: async()=> (dataOf(await apiRequest('/events'))||[]).map(normalizeEvent),
  getById: async id=>normalizeEvent(dataOf(await apiRequest(`/events/${id}`))),
  create: data=>apiRequest('/events','POST',data),
  update: (id,data)=>apiRequest(`/events/${id}`,'PUT',data),
  delete: id=>apiRequest(`/events/${id}`,'DELETE'),
  cancel: id=>apiRequest(`/events/${id}/cancel`,'POST'),
  getRegistrations: async id=>dataOf(await apiRequest(`/events/${id}/registrations`))||[],
  getStats: async id=>dataOf(await apiRequest(`/events/${id}/stats`))||{}
};

const AttendanceAPI = {
  getAll: async()=>dataOf(await apiRequest('/attendance'))||[],
  getById: async id=>dataOf(await apiRequest(`/attendance/${id}`)),
  create: data=>apiRequest('/attendance','POST',data),
  open: id=>apiRequest(`/attendance/${id}/open`,'POST'),
  close: id=>apiRequest(`/attendance/${id}/close`,'POST'),
  updateStatus: (id,memberId,status)=>apiRequest(`/attendance/${id}/members/${memberId}`,'PUT',{status}),
  getHistory: async()=>dataOf(await apiRequest('/attendance/history'))||[],
  getRate: async()=>dataOf(await apiRequest('/attendance/rate'))||{rate:0}
};

const AnnouncementsAPI = {
  getAll: async()=>dataOf(await apiRequest('/announcements'))||[],
  getById: async id=>dataOf(await apiRequest(`/announcements/${id}`)),
  create: data=>apiRequest('/announcements','POST',data),
  update: (id,data)=>apiRequest(`/announcements/${id}`,'PUT',data),
  delete: id=>apiRequest(`/announcements/${id}`,'DELETE'),
  send: (id)=>apiRequest(`/announcements/${id}`,'PUT',{status:'Đã đăng'})
};

const RegistrationsAPI = {
  getAll: async()=>dataOf(await apiRequest('/registrations'))||[],
  getByEvent: async id=>dataOf(await apiRequest(`/registrations/event/${id}`))||[],
  register: id=>apiRequest(`/registrations/event/${id}`,'POST'),
  cancel: id=>apiRequest(`/registrations/event/${id}`,'DELETE'),
  getMyRegistrations: async()=>dataOf(await apiRequest('/registrations/my'))||[]
};

const StatisticsAPI = {
  getOverview: async()=>dataOf(await apiRequest('/statistics/overview'))||{},
  getMembers: async()=>dataOf(await apiRequest('/statistics/members'))||[],
  getEvents: async()=>dataOf(await apiRequest('/statistics/events'))||[],
  getAttendance: async()=>dataOf(await apiRequest('/statistics/attendance'))||[]
};

const ProfileAPI = {
  get: async()=>dataOf(await apiRequest('/profile')),
  update: data=>apiRequest('/profile','PUT',data),
  changePassword: data=>apiRequest('/profile/change-password','POST',data)
};

// Storage is kept as a graceful, empty backend feature until a real file table is configured.
const StorageAPI = {
  getAll: async()=>[],
  upload: async()=>{throw new Error('Kho lưu trữ chưa được cấu hình trong database');},
  delete: async()=>{throw new Error('Kho lưu trữ chưa được cấu hình trong database');},
  download: async()=>{throw new Error('Kho lưu trữ chưa được cấu hình trong database');}
};

window.API = {
  baseUrl:API_BASE_URL,useMock:false,Auth:AuthAPI,Users:UsersAPI,Members:MembersAPI,
  Departments:DepartmentsAPI,Events:EventsAPI,Attendance:AttendanceAPI,
  Announcements:AnnouncementsAPI,Registrations:RegistrationsAPI,Statistics:StatisticsAPI,
  Storage:StorageAPI,Profile:ProfileAPI
};
