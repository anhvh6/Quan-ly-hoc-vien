
/**
 * MAGA PHƯƠNG - BACKEND CORE (Google Apps Script) - OPTIMIZED V53
 * FIX: ADDED MISSING getCustomer ACTION
 */

const SPREADSHEET_ID = '1SV3Zwk93Kti3YxyYuRfTwkM9arm893t0rAMT7iAWeP0';
const MASTER_SHEET_NAME = 'Lich phac do';
const CUSTOMER_SHEET_NAME = 'Customers';
const PRODUCT_SHEET_NAME = 'Sản phẩm';
const PLAN_SHEET_NAME = 'Lịch trình';
const TIMEZONE = "Asia/Ho_Chi_Minh";
const CACHE_TTL = 30;

function wrapResponse_(success, data, error, action) {
  const response = { success: !!success, data: data || null, error: error || null, meta: { v: "V53", action, time: new Date().toISOString() } };
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function clearBackendCache_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(["CACHE_getCustomers", "CACHE_getProducts", "CACHE_getVideoGroups", "CACHE_getVideoDates"]);
  } catch(e) {}
}

function doGet(e) {
  const params = e.parameter || {};
  const action = params.action;
  if (!action) return wrapResponse_(false, null, 'MISSING_ACTION', 'NONE');
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (['getCustomers', 'getProducts', 'getVideoGroups', 'getVideoDates'].includes(action)) {
      const cached = CacheService.getScriptCache().get("CACHE_" + action);
      if (cached) return wrapResponse_(true, JSON.parse(cached), null, action + "_cached");
    }
    
    let result;
    switch (action) {
      case 'getCustomers': result = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME); break;
      case 'getCustomer': result = getCustomerById_Global(ss, params.id); break;
      case 'getProducts': result = dbReadSheet_Global(ss, PRODUCT_SHEET_NAME); break;
      case 'getVideoGroups': result = getVideoGroupStats(ss); break;
      case 'getVideoDates': result = getUniqueVideoDates(ss); break;
      case 'getPlan': result = getPlanData(ss, params.customerId, params.videoDate); break;
      case 'diagnoseMasterPlans': result = diagnoseMasterPlans(ss); break;
      default: return wrapResponse_(false, null, 'UNKNOWN_GET_ACTION: ' + action, action);
    }
    
    if (result && ['getCustomers', 'getProducts', 'getVideoGroups', 'getVideoDates'].includes(action)) {
       try { CacheService.getScriptCache().put("CACHE_" + action, JSON.stringify(result), CACHE_TTL); } catch(e){}
    }
    return wrapResponse_(true, result, null, action);
  } catch (err) {
    return wrapResponse_(false, null, err.toString(), action);
  }
}

function doPost(e) {
  try {
    let params = JSON.parse(e.postData.contents);
    const action = params.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    clearBackendCache_();
    
    let result;
    switch (action) {
      case 'upsertCustomer': result = upsertCustomer(ss, params.payload); break;
      case 'savePlan': result = savePlan(ss, params.customerId, params.tasks); break;
      case 'saveVideoGroupTasks': result = saveVideoGroupTasksBatch(ss, params.videoDate, params.tasks); break;
      case 'deleteVideoTask': result = deleteVideoTask(ss, params.rowNumber); break;
      case 'deleteVideoGroup': result = deleteVideoGroupBatch(ss, params.videoDateKey); break;
      case 'saveProducts': result = saveProducts(ss, params.payload); break;
      case 'deleteCustomer': result = deleteCustomerById(ss, params.id); break;
      default: return wrapResponse_(false, null, 'UNKNOWN_POST_ACTION: ' + action, action);
    }
    return wrapResponse_(true, result, null, action);
  } catch (err) {
    return wrapResponse_(false, null, err.toString(), "POST_ERROR");
  }
}

function toDateKey_Global(input) {
  if (!input) return "";
  if (input instanceof Date) return Utilities.formatDate(input, TIMEZONE, "yyyy-MM-dd");
  
  let s = String(input).trim();
  if (!s) return "";

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[1] + "-" + isoMatch[2] + "-" + isoMatch[3];

  let parts = s.split(/[/-]/);
  if (parts.length >= 2) {
    let d, m, y;
    if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2] || "01"; }
    else { d = parts[0]; m = parts[1]; y = parts[2] || new Date().getFullYear(); }
    try {
      let dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      if (!isNaN(dt.getTime())) return Utilities.formatDate(dt, TIMEZONE, "yyyy-MM-dd");
    } catch(e) {}
  }
  return "";
}

function formatVnDisplayDate_Global(input) {
  const key = toDateKey_Global(input);
  if (!key) return String(input);
  const p = key.split('-');
  return p[2] + "/" + p[1] + "/" + p[0];
}

function dbReadSheet_Global(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h || "").toLowerCase().trim().replace(/\s+/g, '_'));
  
  return values.slice(1).map((row, i) => {
    const obj = { _rowNumber: i + 2 };
    headers.forEach((h, j) => {
      if (!h) return;
      let val = row[j];
      if (val instanceof Date) {
        val = (h.includes('date') || h === 'video_date' || h === 'created_at' || h === 'updated_at') 
          ? formatVnDisplayDate_Global(val) 
          : Utilities.formatDate(val, TIMEZONE, "yyyy-MM-dd");
      }
      obj[h] = val;
    });
    return obj;
  });
}

function getCustomerById_Global(ss, id) {
  if (!id) return null;
  const customers = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME);
  return customers.find(c => String(c.customer_id) === String(id)) || null;
}

function getPlanData(ss, customerId, videoDate) {
  const targetKey = toDateKey_Global(videoDate);
  if (!customerId || customerId === "NEW") {
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return [];
    const values = sheet.getDataRange().getValues();
    
    return values.slice(1)
      .map((r, i) => ({
        day: r[0],
        type: r[1],
        title: r[2],
        detail: r[3],
        link: r[4],
        video_date: r[5], 
        _rowNumber: i + 2 
      }))
      .filter(task => toDateKey_Global(task.video_date) === targetKey)
      .map(task => ({
        ...task,
        video_date: formatVnDisplayDate_Global(task.video_date)
      }))
      .sort((a, b) => a.day - b.day);
  }
  const planSheet = ss.getSheetByName(PLAN_SHEET_NAME);
  if (!planSheet || planSheet.getLastRow() < 2) return [];
  return dbReadSheet_Global(ss, PLAN_SHEET_NAME)
    .filter(t => String(t.customer_id) === String(customerId))
    .sort((a, b) => a.day - b.day);
}

function getVideoGroupStats(ss) {
  const masterSheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!masterSheet) return [];
  const mValues = masterSheet.getLastRow() > 1 ? masterSheet.getDataRange().getValues() : [];
  if (mValues.length < 2) return [];
  const custSheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const cValues = (custSheet && custSheet.getLastRow() > 1) ? custSheet.getDataRange().getValues() : [];
  const groups = {};
  mValues.slice(1).forEach(r => {
    const key = toDateKey_Global(r[5]);
    if (!key) return;
    if (!groups[key]) groups[key] = { video_date: formatVnDisplayDate_Global(r[5]), video_date_key: key, total_days: new Set(), total_tasks: 0, mandatory_tasks: 0, optional_tasks: 0, active_students: 0 };
    const g = groups[key];
    g.total_tasks++;
    g.total_days.add(r[0]);
    if (String(r[1]).includes('Bắt buộc')) g.mandatory_tasks++; else g.optional_tasks++;
  });
  if (cValues.length > 1) {
    const cHeaders = cValues[0].map(h => String(h || "").toLowerCase().trim());
    const vIdx = cHeaders.indexOf('video_date'), sIdx = cHeaders.indexOf('status');
    if (vIdx > -1 && sIdx > -1) {
      cValues.slice(1).forEach(r => {
        const key = toDateKey_Global(r[vIdx]);
        if (groups[key] && String(r[sIdx]).toUpperCase() === 'ACTIVE') groups[key].active_students++;
      });
    }
  }
  return Object.values(groups).map(g => ({ ...g, total_days: g.total_days.size })).sort((a, b) => b.video_date_key.localeCompare(a.video_date_key));
}

function getUniqueVideoDates(ss) {
  const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const dates = [...new Set(values.slice(1).map(r => toDateKey_Global(r[5])).filter(Boolean))];
  return dates.sort().reverse().map(formatVnDisplayDate_Global);
}

function saveVideoGroupTasksBatch(ss, videoDate, tasks) {
  const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!sheet) throw new Error("Master sheet not found");
  const targetKey = toDateKey_Global(videoDate);
  const displayDate = formatVnDisplayDate_Global(videoDate);
  const values = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [["Day", "Type", "Title", "Detail", "Link", "Video Date"]];
  const newRows = [values[0], ...values.slice(1).filter(r => toDateKey_Global(r[5]) !== targetKey)];
  tasks.forEach(t => newRows.push([parseInt(t.day) || 1, t.type, t.title, t.detail, t.link, displayDate]));
  sheet.clearContents().getRange(1, 1, newRows.length, 6).setValues(newRows);
  if (newRows.length > 1) sheet.getRange(2, 6, newRows.length-1, 1).setNumberFormat('dd/MM/yyyy');
  return { success: true, targetKey };
}

function deleteVideoGroupBatch(ss, videoDateKey) {
  const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (!sheet) return { success: false };
  const targetKey = toDateKey_Global(videoDateKey);
  const values = sheet.getDataRange().getValues();
  const newRows = [values[0], ...values.slice(1).filter(r => toDateKey_Global(r[5]) !== targetKey)];
  sheet.clearContents().getRange(1, 1, newRows.length, 6).setValues(newRows);
  return { success: true };
}

function deleteVideoTask(ss, row) {
  const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
  if (sheet && row <= sheet.getLastRow() && row > 1) sheet.deleteRow(row);
  return { success: true };
}

function upsertCustomer(ss, payload) {
  const sheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  if (!sheet) throw new Error("Customer sheet not found");
  const values = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [["Customer ID", "Customer Name", "Sdt", "Email", "Dia chi", "San pham", "Gia tien", "Trang thai gan", "Trang thai", "Ma vd", "Note", "Chewing status", "Start date", "End date", "Duration days", "Video date", "Status", "Sidebar blocks json", "Link", "Token", "Created at", "Updated at", "App title", "App slogan"]];
  const headers = values[0].map(h => String(h || "").toLowerCase().trim().replace(/\s+/g, '_'));
  const rowData = headers.map(h => {
    let val = payload[h] || "";
    if (h.includes('start') || h.includes('end')) { 
      const k = toDateKey_Global(val); 
      if (k) {
        let p = k.split('-');
        val = new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
      }
    }
    return (typeof val === 'object' && !(val instanceof Date)) ? JSON.stringify(val) : val;
  });
  const idIdx = headers.indexOf('customer_id');
  let rowIndex = -1;
  if (idIdx > -1) {
    for (let i = 1; i < values.length; i++) if (String(values[i][idIdx]) === String(payload.customer_id)) { rowIndex = i + 1; break; }
  }
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]); else sheet.appendRow(rowData);
  return { success: true, customer_id: payload.customer_id };
}

function savePlan(ss, id, tasks) {
  const sheet = ss.getSheetByName(PLAN_SHEET_NAME);
  if (!sheet) throw new Error("Plan sheet not found");
  const values = sheet.getLastRow() > 0 ? sheet.getDataRange().getValues() : [["Customer ID", "Day", "Type", "Title", "Detail", "Link", "Is Deleted"]];
  const newRows = [values[0], ...values.slice(1).filter(r => String(r[0]) !== String(id))];
  tasks.forEach(t => newRows.push([id, t.day, t.type, t.title, t.detail, t.link, t.is_deleted ? 1 : 0]));
  sheet.clearContents().getRange(1, 1, newRows.length, 7).setValues(newRows);
  return { success: true };
}

function saveProducts(ss, p) {
  const sheet = ss.getSheetByName(PRODUCT_SHEET_NAME);
  if (!sheet) throw new Error("Product sheet not found");
  const rows = [["ID_SP", "Ten_SP", "Gia_Nhap", "Gia_Ban", "Trang_Thai"], ...p.map(x => [x.id_sp, x.ten_sp, x.gia_nhap, x.gia_ban, x.trang_thai])];
  sheet.clearContents().getRange(1, 1, rows.length, 5).setValues(rows);
  return { success: true };
}

function deleteCustomerById(ss, id) {
  const sheet = ss.getSheetByName(CUSTOMER_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h || "").toLowerCase().trim().replace(/\s+/g, '_'));
  const idIdx = headers.indexOf('customer_id');
  const sIdx = headers.indexOf('status');
  if (idIdx > -1 && sIdx > -1) {
    for (let i = 1; i < values.length; i++) if (String(values[i][idIdx]) === String(id)) { sheet.getRange(i + 1, sIdx + 1).setValue("DELETED"); return { success: true }; }
  }
  return { success: false };
}

function diagnoseMasterPlans(ss) {
  const s = ss.getSheetByName(MASTER_SHEET_NAME);
  return { success: true, masterSheetFound: !!s, lastRow: s ? s.getLastRow() : 0, allSheets: ss.getSheets().map(x => x.getName()) };
}
