import { Customer, Product, ExerciseTask, CustomerStatus, ExerciseType } from '../types';
import { DEFAULT_SIDEBAR_BLOCKS } from '../constants';

// Simulated storage
let customers: Customer[] = [
  {
    customer_id: "C1705123456789",
    customer_name: "NGUYỄN THỊ MAI",
    sdt: "0901234567",
    email: "mai.nguyen@gmail.com",
    dia_chi: "123 Lê Lợi, Q1, TPHCM",
    // Fix: Added missing gia_nhap property to satisfy PurchasedProduct interface
    san_pham: [{ id_sp: "SP001", ten_sp: "Serum", so_luong: 2, don_gia: 500000, gia_nhap: 300000, thanh_tien: 1000000 }],
    gia_tien: 1000000,
    trang_thai_gan: "đã gán",
    // Fix: Added missing trang_thai property (1 = assigned)
    trang_thai: 1,
    ma_vd: "123456789012",
    note: "Mặt lệch nhẹ bên trái, cần tập cân bằng...",
    chewing_status: "Tập bên phải 70% – bên trái 30%",
    start_date: "2024-05-01",
    end_date: "2024-07-02",
    duration_days: 62,
    video_date: "01/01/2025",
    status: CustomerStatus.ACTIVE,
    // Fix: Changed property name from sidebar_blocks to sidebar_blocks_json to match Customer interface
    sidebar_blocks_json: DEFAULT_SIDEBAR_BLOCKS,
    link: "https://script.google.com/macros/s/AKfycb.../exec?u=C1705123456789&t=a1b2c3d4",
    token: "a1b2c3d4",
    created_at: "2024-05-01T08:30:00Z",
    updated_at: "2024-05-01T08:30:00Z",
  }
];

let products: Product[] = [
  { id_sp: "SP001", ten_sp: "Serum Vitamin C", gia_nhap: 300000, gia_ban: 500000, trang_thai: 1 },
  { id_sp: "SP002", ten_sp: "Dầu Massage", gia_nhap: 150000, gia_ban: 250000, trang_thai: 1 },
  { id_sp: "SP003", ten_sp: "Gua Sha Thạch Anh", gia_nhap: 400000, gia_ban: 650000, trang_thai: 0 },
];

const masterTasks: Record<string, ExerciseTask[]> = {
  "01/01/2025": Array.from({ length: 62 }, (_, i) => ({
    day: i + 1,
    type: i % 3 === 0 ? ExerciseType.OPTIONAL : ExerciseType.MANDATORY,
    title: `Massage bài tập ngày ${i + 1}`,
    detail: "Dùng 2 ngón tay massage theo chiều kim đồng hồ 30 giây...",
    link: "https://youtube.com/watch?v=dQw4w9WgXcQ",
    is_deleted: false
  }))
};

let planTasks: Record<string, ExerciseTask[]> = {};

export const api = {
  getCustomers: async () => {
    return [...customers];
  },
  getCustomerById: async (id: string) => {
    return customers.find(c => c.customer_id === id) || null;
  },
  upsertCustomer: async (data: Partial<Customer>) => {
    const existingIndex = customers.findIndex(c => c.customer_id === data.customer_id);
    if (existingIndex > -1) {
      customers[existingIndex] = { ...customers[existingIndex], ...data, updated_at: new Date().toISOString() };
      return customers[existingIndex];
    } else {
      const newId = "C" + Date.now();
      // Fix: Ensured all required properties are present and renamed sidebar_blocks to sidebar_blocks_json
      const newCustomer: Customer = {
        customer_id: newId,
        customer_name: (data.customer_name || "").toUpperCase(),
        sdt: data.sdt || "",
        email: data.email || "",
        dia_chi: data.dia_chi || "",
        san_pham: data.san_pham || [],
        gia_tien: data.gia_tien || 0,
        trang_thai_gan: data.trang_thai_gan || "chưa gán",
        // Fix: Added missing trang_thai property (0 = not assigned)
        trang_thai: data.trang_thai ?? 0,
        ma_vd: data.ma_vd || "",
        note: data.note || "",
        chewing_status: data.chewing_status || "Tập cân bằng 50-50",
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        end_date: data.end_date || "",
        duration_days: data.duration_days || 62,
        video_date: data.video_date || "01/01/2025",
        status: CustomerStatus.ACTIVE,
        // Fix: Changed property name to sidebar_blocks_json to match Customer interface
        sidebar_blocks_json: data.sidebar_blocks_json || DEFAULT_SIDEBAR_BLOCKS,
        token: Math.random().toString(36).substring(2, 10),
        link: `https://maga-phuong.app/#/client/${newId}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      customers.push(newCustomer);
      return newCustomer;
    }
  },
  deleteCustomer: async (id: string) => {
    const index = customers.findIndex(c => c.customer_id === id);
    if (index > -1) {
      customers[index].status = CustomerStatus.DELETED;
    }
  },
  getProducts: async () => {
    return [...products];
  },
  saveProducts: async (newProducts: Product[]) => {
    products = [...newProducts];
  },
  getPlan: async (customerId: string, videoDate: string) => {
    if (customerId === "NEW") {
      return masterTasks[videoDate] || masterTasks["01/01/2025"];
    }
    return planTasks[customerId] || masterTasks[videoDate] || masterTasks["01/01/2025"];
  },
  savePlan: async (customerId: string, tasks: ExerciseTask[]) => {
    planTasks[customerId] = tasks;
  }
};