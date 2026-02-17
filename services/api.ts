
import { Customer, Product, ExerciseTask, CustomerStatus, ExerciseType } from '../types';
import { DEFAULT_SIDEBAR_BLOCKS } from '../constants';
import { toISODateKey } from '../utils/date';

const API_URL = "https://script.google.com/macros/s/AKfycbxa6EuNJQdzDeSD-nS9PK06AchRJdcXC8Xp13ipY-R-AgdrBQQfU5tvTCmu3zOdE9PJ_g/exec";

const normalizeCustomer = (item: any): Customer => {
  if (!item) return item;
  
  let blocks = item.sidebar_blocks_json || item.blocks;
  if (typeof blocks === 'string' && blocks.trim() !== '') {
    try { blocks = JSON.parse(blocks); } catch (e) { blocks = DEFAULT_SIDEBAR_BLOCKS; }
  }
  if (!Array.isArray(blocks) || blocks.length === 0) blocks = DEFAULT_SIDEBAR_BLOCKS;

  let sanPham = item.san_pham || item.San_Pham;
  if (typeof sanPham === 'string' && sanPham.trim() !== '') {
    try { sanPham = JSON.parse(sanPham); } catch (e) { sanPham = []; }
  }

  return { 
    ...item, 
    customer_id: String(item.customer_id || ""),
    customer_name: String(item.customer_name || "").toUpperCase(),
    sdt: String(item.sdt || item.SDT || item.phone || "").trim(),
    email: String(item.email || item.Email || "").trim().toLowerCase(),
    dia_chi: String(item.dia_chi || item.Dia_Chi || "").trim(),
    note: String(item.note || ""), 
    sidebar_blocks_json: blocks,
    san_pham: Array.isArray(sanPham) ? sanPham : [],
    gia_tien: Number(item.gia_tien || item.Gia_tien || 0),
    trang_thai: Number(item.trang_thai || 0),
    chewing_status: String(item.chewing_status || item.chewing || ""),
    app_title: item.app_title || "Phác đồ 30 ngày thay đổi khuôn mặt",
    app_slogan: item.app_slogan || "Hành trình đánh thức vẻ đẹp tự nhiên, gìn giữ thanh xuân."
  };
};

const request = async (params: any, method: 'GET' | 'POST' = 'GET'): Promise<any> => {
  const url = new URL(API_URL);
  const options: RequestInit = { 
    method,
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow'
  };
  
  if (method === 'GET') {
    Object.keys(params).forEach(k => url.searchParams.append(k, String(params[k])));
    url.searchParams.append('_t', Date.now().toString());
  } else {
    options.body = JSON.stringify(params);
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  }
  
  try {
    const response = await fetch(url.toString(), options);
    const text = await response.text();
    let result;
    try { result = JSON.parse(text); } catch (e) { throw new Error("INVALID_RESPONSE"); }
    if (!result.success) throw new Error(result.error || "API Error");
    return result.data;
  } catch (error: any) {
    console.error("API Request Error:", error);
    throw error;
  }
};

export const api = {
  testConnection: async () => {
    try {
      const data = await request({ action: 'test' });
      return { ok: data === "OK" };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  },
  getCustomers: async () => {
    const data = await request({ action: 'getCustomers' });
    return (data || []).map(normalizeCustomer);
  },
  getCustomerById: async (id: string) => {
    const data = await request({ action: 'getCustomer', id });
    return data ? normalizeCustomer(data) : null;
  },
  upsertCustomer: async (data: Partial<Customer>, tasks?: ExerciseTask[] | null) => {
    const payload = { 
      ...data, 
      updated_at: new Date().toISOString(),
      start_date: toISODateKey(data.start_date),
      tasks: tasks // Gửi null để backend xóa phác đồ riêng
    };
    const res = await request({ action: 'upsertCustomer', payload }, 'POST');
    return normalizeCustomer(res.payload || payload);
  },
  getProducts: async () => request({ action: 'getProducts' }),
  saveProducts: async (p: Product[]) => request({ action: 'saveProducts', payload: p }, 'POST'),
  getVideoDates: async () => request({ action: 'getVideoDates' }),
  getVideoGroups: async () => request({ action: 'getVideoGroups' }),
  getPlan: async (customerId: string, videoDate: string) => request({ action: 'getPlan', customerId, videoDate: toISODateKey(videoDate) }),
  deleteCustomer: async (id: string) => request({ action: 'deleteCustomer', id }, 'POST'),
  saveVideoGroupTasks: async (videoDate: string, tasks: ExerciseTask[]) => request({ action: 'saveVideoGroupTasks', videoDate: toISODateKey(videoDate), tasks }, 'POST'),
  deleteVideoTask: async (rowNumber: number) => request({ action: 'deleteVideoTask', rowNumber }, 'POST'),
  deleteVideoGroup: async (videoDateKey: string) => request({ action: 'deleteVideoGroup', videoDateKey: toISODateKey(videoDateKey) }, 'POST'),
  refreshClientData: async (id: string) => {
    const data = await request({ action: 'getCustomer', id });
    if (!data) return null;
    const customer = normalizeCustomer(data);
    const tasks = await api.getPlan(id, customer.video_date);
    return { customer, tasks: tasks || [] };
  }
};
