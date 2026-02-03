
export enum ExerciseType {
  MANDATORY = "Bắt buộc",
  OPTIONAL = "Bổ trợ"
}

export enum CustomerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED"
}

export interface Product {
  id_sp: string;
  ten_sp: string;
  gia_nhap: number;
  gia_ban: number;
  trang_thai: number; // 1 = in stock, 0 = out of stock
}

export interface PurchasedProduct {
  id_sp: string;
  ten_sp: string;
  so_luong: number;
  don_gia: number;
  gia_nhap: number;
  thanh_tien: number;
}

export interface SidebarBlock {
  id: string;
  title: string;
  content: string;
  type: 'default' | 'dark';
  video_link?: string;
  color?: string;
}

export interface ExerciseTask {
  id?: string;
  day: number;
  type: ExerciseType;
  title: string;
  detail: string;
  link: string;
  is_deleted: boolean;
  video_date?: string; 
  _rowNumber?: number; // Số dòng thực tế trong Google Sheet
  _video_date_key?: string; // Khóa ngày chuẩn hóa yyyy-MM-dd
}

export interface VideoGroup {
  video_date: string;
  video_date_key: string; // Khóa ngày chuẩn hóa yyyy-MM-dd
  total_days: number;
  total_tasks: number;
  mandatory_tasks: number;
  optional_tasks: number;
  active_students: number;
  is_invalid?: boolean; // Đánh dấu nếu năm bất thường (<2000 hoặc >2100)
}

export interface Customer {
  customer_id: string;
  customer_name: string;
  sdt: string;
  email: string;
  dia_chi: string;
  san_pham: PurchasedProduct[];
  gia_tien: number;
  trang_thai_gan: string;
  trang_thai: number;
  ma_vd: string;
  note: string;
  chewing_status: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  video_date: string;
  status: CustomerStatus;
  sidebar_blocks_json: SidebarBlock[];
  link: string;
  token: string;
  created_at: string;
  updated_at: string;
  app_title?: string;
  app_slogan?: string;
}
