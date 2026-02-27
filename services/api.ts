
import { Customer, Product, ExerciseTask, CustomerStatus, ExerciseType } from '../types';
import { DEFAULT_SIDEBAR_BLOCKS } from '../constants';
import { toISODateKey } from '../utils/date';

const API_URL = "https://script.google.com/macros/s/AKfycbz-LULoUAWuucTFc-4-vjXJJJm-zpeCd23yz7oF-Ji5x5SbLSzGuPbLBBRDrSvn7HYRZw/exec";

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
  if (typeof fetch === 'undefined') {
    throw new Error("FETCH_NOT_AVAILABLE: The 'fetch' API is not available in this environment.");
  }

  const url = new URL(API_URL);
  const options: RequestInit = { 
    method,
    mode: 'cors',
    credentials: 'omit',
    redirect: 'follow'
  };
  
  if (method === 'GET') {
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.append(k, String(params[k]));
      }
    });
    url.searchParams.append('_t', Date.now().toString());
  } else {
    options.body = JSON.stringify(params);
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  }
  
  try {
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`HTTP_ERROR: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    let result;
    try { 
      result = JSON.parse(text); 
    } catch (e) { 
      console.error("Raw response text:", text);
      throw new Error("INVALID_JSON_RESPONSE"); 
    }
    if (!result.success) throw new Error(result.error || "API_LOGIC_ERROR");
    return result.data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error("CORS or Network Error: Failed to fetch. Please ensure the Google Apps Script is deployed as 'Anyone' and the URL is correct.");
    }
    console.error("API Request Detail:", { url: url.toString(), method, error });
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
  getCustomerById: async (id: string, token?: string) => {
    const data = await request({ action: 'getCustomer', id, token });
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
  getPlanEditorData: async (id?: string, templateId?: string) => {
    const data = await request({ action: 'getPlanEditorData', id, templateId });
    if (data.customer) data.customer = normalizeCustomer(data.customer);
    if (data.template) data.template = normalizeCustomer(data.template);
    return data;
  },
  saveProducts: async (p: Product[]) => request({ action: 'saveProducts', payload: p }, 'POST'),
  getVideoDates: async () => request({ action: 'getVideoDates' }),
  getVideoGroups: async () => request({ action: 'getVideoGroups' }),
  getPlan: async (customerId: string, videoDate: string, token?: string) => request({ action: 'getPlan', customerId, videoDate: toISODateKey(videoDate), token }),
  deleteCustomer: async (id: string) => request({ action: 'deleteCustomer', id }, 'POST'),
  saveVideoGroupTasks: async (videoDate: string, tasks: ExerciseTask[]) => request({ action: 'saveVideoGroupTasks', videoDate: toISODateKey(videoDate), tasks }, 'POST'),
  deleteVideoTask: async (rowNumber: number) => request({ action: 'deleteVideoTask', rowNumber }, 'POST'),
  deleteVideoGroup: async (videoDateKey: string) => request({ action: 'deleteVideoGroup', videoDateKey: toISODateKey(videoDateKey) }, 'POST'),
  refreshClientData: async (id: string, token?: string) => {
    const data = await request({ action: 'getClientData', id, token });
    if (!data || !data.customer) return null;
    return { 
      customer: normalizeCustomer(data.customer), 
      tasks: data.tasks || [] 
    };
  }
};
