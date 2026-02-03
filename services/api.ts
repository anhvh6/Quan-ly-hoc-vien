
import { Customer, Product, ExerciseTask, CustomerStatus, ExerciseType, VideoGroup } from '../types';
import { DEFAULT_SIDEBAR_BLOCKS } from '../constants';
import { toISODateKey } from '../utils/date';

const API_URL = `https://script.google.com/macros/s/AKfycbzC0SDT4doyLZLTL7ysj-oyLKJozgXxYsA7OXxOv-fwl0SNbblOGq_MT3JPcwtsF7RbGA/exec`;

const clientCache = new Map<string, { data: any, expiry: number }>();
const CACHE_DURATION = 60000; // Tăng lên 60s để giảm tải cho GAS

const normalizeCustomer = (item: any): Customer => {
  if (!item) return item;
  let blocks = item.sidebar_blocks_json;
  if (typeof blocks === 'string' && blocks.trim() !== '') {
    try { blocks = JSON.parse(blocks); } catch (e) { blocks = DEFAULT_SIDEBAR_BLOCKS; }
  }
  if (!Array.isArray(blocks) || blocks.length === 0) blocks = DEFAULT_SIDEBAR_BLOCKS;

  let sanPham = item.san_pham;
  if (typeof sanPham === 'string' && sanPham.trim() !== '') {
    try { sanPham = JSON.parse(sanPham); } catch (e) { sanPham = []; }
  }
  return { ...item, sidebar_blocks_json: blocks, san_pham: Array.isArray(sanPham) ? sanPham : [] };
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const request = async (params: any, method: 'GET' | 'POST' = 'GET', retries = 2): Promise<any> => {
  const cacheKey = method === 'GET' ? JSON.stringify(params) : null;
  if (cacheKey && clientCache.has(cacheKey)) {
    const entry = clientCache.get(cacheKey)!;
    if (entry.expiry > Date.now()) return entry.data;
    clientCache.delete(cacheKey);
  }

  const url = new URL(API_URL);
  url.searchParams.append('action', params.action);
  if (method === 'GET') {
    Object.keys(params).forEach(k => {
      if (k !== 'action' && params[k] !== undefined && params[k] !== null) {
        url.searchParams.append(k, String(params[k]));
      }
    });
  }

  const options: RequestInit = { 
    method, 
    redirect: 'follow', 
    mode: 'cors' 
  };
  
  if (method === 'POST') {
    options.body = JSON.stringify(params);
    options.headers = { 'Content-Type': 'text/plain' };
    clientCache.clear();
  }
  
  try {
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const result = await response.json();
    if (!result) throw new Error("Server returned nothing");
    if (result.success === false) throw new Error(result.error || "Backend logic error");
    
    if (cacheKey) clientCache.set(cacheKey, { data: result.data, expiry: Date.now() + CACHE_DURATION });
    return result.data;
  } catch (error: any) {
    if (retries > 0 && (error.message.includes('Failed to fetch') || error.message.includes('HTTP Error'))) {
      console.warn(`[API RETRY] Action: ${params.action}. Retries left: ${retries}`);
      await wait(1000 * (3 - retries)); // Exponential wait
      return request(params, method, retries - 1);
    }
    console.error(`[API FAIL] Action: ${params.action}`, error);
    const dataActions = ['getCustomers', 'getProducts', 'getVideoGroups', 'getVideoDates', 'getCustomer'];
    if (dataActions.includes(params.action)) return method === 'GET' && params.action === 'getCustomer' ? null : [];
    throw error;
  }
};

export const api = {
  getCustomers: async () => {
    const data = await request({ action: 'getCustomers' });
    return (Array.isArray(data) ? data : []).map(normalizeCustomer);
  },
  getCustomerById: async (id: string) => {
    const data = await request({ action: 'getCustomer', id });
    return data ? normalizeCustomer(data) : null;
  },
  upsertCustomer: async (data: Partial<Customer>) => {
    const payload = { ...data, start_date: toISODateKey(data.start_date), updated_at: new Date().toISOString() };
    const res = await request({ action: 'upsertCustomer', payload }, 'POST');
    return normalizeCustomer(payload);
  },
  getProducts: async () => {
    const data = await request({ action: 'getProducts' });
    return (Array.isArray(data) ? data : []).map((p: any) => ({
      id_sp: p.id_sp || p.ID_SP || '', 
      ten_sp: p.ten_sp || p.Ten_SP || '', 
      gia_nhap: Number(p.gia_nhap || p.Gia_Nhap || 0), 
      gia_ban: Number(p.gia_ban || p.Gia_Ban || 0), 
      trang_thai: Number(p.trang_thai || p.Trang_Thai || 0)
    }));
  },
  saveProducts: async (p: Product[]) => request({ action: 'saveProducts', payload: p }, 'POST'),
  getVideoDates: async () => {
    const data = await request({ action: 'getVideoDates' });
    return Array.isArray(data) ? data : [];
  },
  getVideoGroups: async () => {
    const data = await request({ action: 'getVideoGroups' });
    return Array.isArray(data) ? data : [];
  },
  getPlan: async (customerId: string, videoDate: string) => {
    const data = await request({ action: 'getPlan', customerId, videoDate: toISODateKey(videoDate) });
    return Array.isArray(data) ? data : [];
  },
  savePlan: async (customerId: string, tasks: ExerciseTask[]) => request({ action: 'savePlan', customerId, tasks }, 'POST'),
  saveVideoGroupTasks: async (videoDate: string, tasks: ExerciseTask[]) => request({ action: 'saveVideoGroupTasks', videoDate: toISODateKey(videoDate), tasks }, 'POST'),
  deleteCustomer: async (id: string) => request({ action: 'deleteCustomer', id }, 'POST'),
  deleteVideoTask: async (rowNumber: number) => request({ action: 'deleteVideoTask', rowNumber }, 'POST'),
  deleteVideoGroup: async (videoDateKey: string) => request({ action: 'deleteVideoGroup', videoDateKey: toISODateKey(videoDateKey) }, 'POST'),
  refreshClientData: async (id: string) => {
    const customer = await api.getCustomerById(id);
    if (!customer) return null;
    const tasks = await api.getPlan(id, customer.video_date);
    return { customer, tasks };
  }
};
