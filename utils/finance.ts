
import { Customer, Product } from '../types';

/**
 * Chuẩn hóa chuỗi để so sánh: viết thường, loại bỏ dấu, bỏ khoảng trắng thừa.
 */
const normalize = (s: any) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Kiểm tra xem học viên có ở trạng thái "chưa gán" hay không.
 * Giờ đây ưu tiên kiểm tra giá trị số 0 (Trang_thai).
 */
export function isChuaGan(input: any): boolean {
  const checkValue = (val: any): boolean => {
    // 0 là trạng thái chưa gán chính thức
    if (val === 0 || val === '0') return true;
    
    // Fallback cho dữ liệu cũ hoặc boolean
    if (val === false || String(val).toLowerCase() === 'false') return true;
    
    const s = normalize(val);
    return s.includes('chua gan');
  };

  if (typeof input === 'object' && input !== null) {
    // Ưu tiên kiểm tra trường trang_thai (số 0/1)
    if (input.trang_thai !== undefined && (input.trang_thai === 0 || input.trang_thai === '0')) return true;
    if (input.trang_thai !== undefined && (input.trang_thai === 1 || input.trang_thai === '1')) return false;

    // Các trường dự phòng khác
    return (
      checkValue(input.trang_thai_gan) || 
      checkValue(input.status_gan) ||
      checkValue(input.trangthai) ||
      checkValue(input.trang_thai_khoa_hoc) ||
      checkValue(input.assignment_status)
    );
  }
  return checkValue(input);
}

/**
 * Xây dựng bản đồ sản phẩm để tra cứu nhanh thông tin gia_nhap/gia_ban.
 */
export function buildProductMap(products: Product[]) {
  const m = new Map<string, Product>();
  (products || []).forEach(p => {
    if (!p) return;
    if (p.id_sp) m.set(String(p.id_sp).trim(), p);
    if (p.ten_sp) m.set('NAME:' + normalize(p.ten_sp), p);
  });
  return m;
}

/**
 * Tính toán doanh thu, giá vốn, lợi nhuận cho một học viên.
 */
export function calcRevenueCostProfit(customer: Customer, products: Product[]) {
  const productMap = buildProductMap(products || []);
  const items = Array.isArray(customer?.san_pham) ? customer.san_pham : [];

  let cost = 0;
  let revenueFromItems = 0;

  for (const it of items) {
    const qty = Number((it as any).so_luong ?? 0) || 0;
    if (qty <= 0) continue;

    const byId = (it as any).id_sp ? productMap.get(String((it as any).id_sp).trim()) : undefined;
    const byName = (it as any).ten_sp ? productMap.get('NAME:' + normalize((it as any).ten_sp)) : undefined;
    const p = byId || byName;

    const giaNhap = Number((it as any).gia_nhap ?? p?.gia_nhap ?? 0) || 0;
    const giaBan = Number((it as any).don_gia ?? (it as any).gia_ban ?? p?.gia_ban ?? 0) || 0;

    cost += giaNhap * qty;
    revenueFromItems += giaBan * qty;
  }

  const revenue = (Number(customer?.gia_tien ?? 0) || 0) > 0 ? Number(customer.gia_tien) : revenueFromItems;
  const profit = revenue - cost;

  return {
    revenue,
    cost,
    profit,
    hasVon: cost > 0
  };
}
