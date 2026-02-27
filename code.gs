
/**
 * MAGA PHƯƠNG - BACKEND CORE (Google Apps Script)
 * Hệ thống quản lý phác đồ Yoga Face 30 ngày.
 */

const SPREADSHEET_ID = '1SV3Zwk93Kti3YxyYuRfTwkM9arm893t0rAMT7iAWeP0';
const MASTER_SHEET_NAME = 'Lich phac do';
const CUSTOMER_SHEET_NAME = 'Customers';
const PRODUCT_SHEET_NAME = 'Sản phẩm';
const PLAN_SHEET_NAME = 'Lịch trình';
const TIMEZONE = "Asia/Ho_Chi_Minh";

function toDateKey_Global(input) {
  if (!input) return "";
  if (input instanceof Date) {
    if (isNaN(input.getTime()) || input.getTime() === 0) return "";
    return Utilities.formatDate(input, TIMEZONE, "yyyy-MM-dd");
  }
  let s = String(input).trim();
  if (!s || s === "0" || s.startsWith("1970") || s.startsWith("01/01/1970")) return "";
  if (s.includes('T')) s = s.split('T')[0];
  let parts = s.split(/[/-]/);
  if (parts.length === 3) {
    let d, m, y;
    if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
    else { d = parts[0]; m = parts[1]; y = parts[2]; }
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return s;
}

function toDate_Global(input) {
  const k = toDateKey_Global(input);
  if (!k) return null;
  const p = k.split('-');
  return new Date(p[0], p[1]-1, p[2]);
}

function getSheetSmart_(ss, targetName) {
  const sheets = ss.getSheets();
  const normalizedTarget = targetName.toLowerCase().replace(/\s+/g, '');
  let sheet = ss.getSheetByName(targetName);
  if (sheet) return sheet;
  for (let s of sheets) {
    const sName = s.getName().toLowerCase().replace(/\s+/g, '');
    if (sName.includes(normalizedTarget) || normalizedTarget.includes(sName)) return s;
  }
  return null;
}

function dbReadSheet_Global(ss, name) {
  const s = getSheetSmart_(ss, name);
  if (!s) return [];
  const v = s.getDataRange().getValues();
  if (v.length < 2) return [];
  const h = v[0].map(x => String(x || "").toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'));
  
  return v.slice(1).map((r, i) => {
    const o = { _rowNumber: i + 2 };
    let hasContent = false;
    h.forEach((x, j) => {
      let val = r[j];
      if (val !== "" && val !== null && val !== undefined) hasContent = true;
      if (['start_date', 'end_date', 'video_date'].includes(x)) {
        val = toDateKey_Global(val);
      }
      o[x] = val;
    });

    if (name === MASTER_SHEET_NAME || name === PLAN_SHEET_NAME) {
      o.title = o.ten_bai_tap || o.bai_tap || o.title || "";
      o.detail = o.chi_tiet || o.noi_dung || o.detail || "";
      o.link = o.link_video || o.video || o.link || "";
      o.type = o.loai || o.phan_loai || o.type || "Bài bắt buộc";
      o.day = Number(o.n || o.ngay || o.day || 0);
    }
    return hasContent ? o : null;
  }).filter(x => x !== null);
}

function calculateAccessState(customer) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = toDate_Global(customer.start_date);
  const end = toDate_Global(customer.end_date);
  
  let allowed = 0, state = "ACTIVE";
  if (start) {
    allowed = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    if (allowed < 1) state = "NOT_STARTED";
  }
  
  if (customer.status === 'DELETED' || customer.status === 'INACTIVE') state = "DELETED";
  else if (end && today > end) state = "EXPIRED";
  
  return { state, allowed_day: Math.max(0, allowed) };
}

function getPlanData(ss, id, date) {
  const customer = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME).find(c => String(c.customer_id).trim() === String(id).trim());
  const isCustomized = customer ? (String(customer.is_customized) === "1" || customer.is_customized === true) : false;

  if (isCustomized && id && id !== "NEW") {
    const studentTasks = dbReadSheet_Global(ss, PLAN_SHEET_NAME)
      .filter(t => String(t.customer_id).trim() === String(id).trim());
    
    if (studentTasks.length > 0) {
      return studentTasks.map(t => {
        t._is_master = false;
        return t;
      }).sort((a, b) => Number(a.day) - Number(b.day));
    }
  }

  const masterKey = toDateKey_Global(date);
  if (!masterKey) return [];
  
  const allMasterTasks = dbReadSheet_Global(ss, MASTER_SHEET_NAME);
  return allMasterTasks
    .filter(t => toDateKey_Global(t.video_date) === masterKey)
    .map(t => {
      t._is_master = true;
      return t;
    })
    .sort((a, b) => Number(a.day) - Number(b.day));
}

function doGet(e) {
  const u = e.parameter.u;
  const t = e.parameter.t;
  const action = e.parameter.action;

  if (u && t && !action) {
    return renderStudentPage(u, t);
  }
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let res;
  try {
    switch (action) {
      case 'getCustomers': res = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME); break;
      case 'getCustomer': 
        const cId = String(e.parameter.id);
        const reqToken = e.parameter.token;
        const cObj = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME).find(c => String(c.customer_id) === cId);
        
        if (reqToken) {
          if (!cObj || String(cObj.token) !== String(reqToken)) {
            throw new Error('ACCESS_DENIED');
          }
        }
        
        if (cObj) {
          const acc = calculateAccessState(cObj);
          cObj.access_state = acc.state;
          cObj.allowed_day = acc.allowed_day;
        }
        res = cObj;
        break;
      case 'getPlan': 
        const pCustId = String(e.parameter.customerId);
        const pToken = e.parameter.token;
        
        if (pToken) {
          const pCust = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME).find(c => String(c.customer_id) === pCustId);
          if (!pCust || String(pCust.token) !== String(pToken)) {
            throw new Error('ACCESS_DENIED');
          }
        }
        
        res = getPlanData(ss, e.parameter.customerId, e.parameter.videoDate); 
        break;
      case 'getVideoDates': 
        const masterSheet = getSheetSmart_(ss, MASTER_SHEET_NAME);
        if (!masterSheet) res = [];
        else {
          const v = masterSheet.getDataRange().getValues();
          const headers = v[0].map(x => String(x||"").toLowerCase().trim());
          const vdIdx = headers.indexOf("video_date");
          const set = new Set();
          for(let i=1; i<v.length; i++) {
            const k = toDateKey_Global(v[i][vdIdx]);
            if(k) set.add(k);
          }
          res = Array.from(set).sort().reverse();
        }
        break;
      case 'getVideoGroups':
        const m = dbReadSheet_Global(ss, MASTER_SHEET_NAME);
        const custs = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME);
        const groups = {};
        m.forEach(t => {
          const k = toDateKey_Global(t.video_date);
          if (!k) return;
          if (!groups[k]) groups[k] = { video_date_key: k, video_date: t.video_date, total_tasks: 0, mandatory_tasks: 0, optional_tasks: 0, days: new Set() };
          groups[k].total_tasks++;
          const type = String(t.type || t.loai || "").toLowerCase();
          if (type.includes("bắt buộc") || type.includes("bat buoc")) groups[k].mandatory_tasks++;
          else groups[k].optional_tasks++;
          groups[k].days.add(Number(t.day) || 0);
        });
        res = Object.values(groups).map(g => {
          g.total_days = g.days.size;
          g.active_students = custs.filter(x => toDateKey_Global(x.video_date) === g.video_date_key && x.status !== "DELETED").length;
          delete g.days;
          return g;
        });
        break;
      case 'getProducts': res = dbReadSheet_Global(ss, PRODUCT_SHEET_NAME); break;
      case 'getPlanEditorData':
        const editorId = e.parameter.id;
        const editorTempId = e.parameter.templateId;
        const editorRes = {
          dates: [],
          products: [],
          customer: null,
          template: null,
          tasks: []
        };
        const mSheet = getSheetSmart_(ss, MASTER_SHEET_NAME);
        if (mSheet) {
          const v = mSheet.getDataRange().getValues();
          const headers = v[0].map(x => String(x||"").toLowerCase().trim());
          const vdIdx = headers.indexOf("video_date");
          if (vdIdx > -1) {
            const set = new Set();
            for(let i=1; i<v.length; i++) {
              const k = toDateKey_Global(v[i][vdIdx]);
              if(k) set.add(k);
            }
            editorRes.dates = Array.from(set).sort().reverse();
          }
        }
        editorRes.products = dbReadSheet_Global(ss, PRODUCT_SHEET_NAME);
        const allCusts = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME);
        if (editorId && editorId !== "undefined" && editorId !== "null" && editorId !== "NEW") {
          editorRes.customer = allCusts.find(c => String(c.customer_id) === String(editorId));
          if (editorRes.customer && !editorTempId) {
            editorRes.tasks = getPlanData(ss, editorId, editorRes.customer.video_date);
          }
        }
        if (editorTempId && editorTempId !== "undefined" && editorTempId !== "null") {
          editorRes.template = allCusts.find(c => String(c.customer_id) === String(editorTempId));
          if (editorRes.template) {
            editorRes.tasks = getPlanData(ss, editorTempId, editorRes.template.video_date);
          }
        } else if (!editorId || editorId === "NEW") {
          const latest = editorRes.dates.length > 0 ? editorRes.dates[0] : null;
          if (latest) editorRes.tasks = getPlanData(ss, "NEW", latest);
        }
        res = editorRes;
        break;
      case 'getClientData':
        const clientId = e.parameter.id;
        const clientToken = e.parameter.token;
        const clientRes = { customer: null, tasks: [] };
        const allC = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME);
        const found = allC.find(c => String(c.customer_id) === String(clientId));
        if (found) {
          if (clientToken && clientToken !== "undefined" && String(found.token) !== String(clientToken)) {
            res = { success: false, error: "ACCESS_DENIED" };
            return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
          }
          
          // Tính toán trạng thái truy cập và cảnh báo hết hạn
          const acc = calculateAccessState(found);
          found.access_state = acc.state;
          found.allowed_day = acc.allowed_day;
          
          const today = new Date(); today.setHours(0,0,0,0);
          const end = toDate_Global(found.end_date);
          found.expire_warning = (acc.state === "ACTIVE" && end && ((end.getTime() - today.getTime()) / 86400000) <= 5);
          
          clientRes.customer = found;
          clientRes.tasks = getPlanData(ss, clientId, found.video_date);
        }
        res = clientRes;
        break;
      case 'test': res = "OK"; break;
      default: res = "Action not found";
    }
    return ContentService.createTextOutput(JSON.stringify({success:true, data:res})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) { 
    return ContentService.createTextOutput(JSON.stringify({success:false, error:err.toString()})).setMimeType(ContentService.MimeType.JSON); 
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    let res;
    
    switch (action) {
      case 'upsertCustomer':
        res = upsertCustomer_Backend(ss, postData.payload);
        break;
      case 'saveProducts':
        const pSheet = getSheetSmart_(ss, PRODUCT_SHEET_NAME);
        const pHeaders = ["ID_SP", "Ten_SP", "Gia_Nhap", "Gia_Ban", "Trang_Thai"];
        const pRows = [pHeaders, ...postData.payload.map(x => [x.id_sp, x.ten_sp, x.gia_nhap, x.gia_ban, x.trang_thai])];
        pSheet.clear().getRange(1, 1, pRows.length, 5).setValues(pRows);
        res = true;
        break;
      case 'deleteCustomer':
        const cSheet = getSheetSmart_(ss, CUSTOMER_SHEET_NAME);
        const cValues = cSheet.getDataRange().getValues();
        const cIdIdx = cValues[0].map(h => String(h||"").toLowerCase()).indexOf("customer_id");
        const cStIdx = cValues[0].map(h => String(h||"").toLowerCase()).indexOf("status");
        for (let i = 1; i < cValues.length; i++) {
          if (String(cValues[i][cIdIdx]) === String(postData.id)) {
            cSheet.getRange(i + 1, cStIdx + 1).setValue("DELETED");
            break;
          }
        }
        res = true;
        break;
      case 'saveVideoGroupTasks':
        const mSheet = getSheetSmart_(ss, MASTER_SHEET_NAME);
        const mKey = toDateKey_Global(postData.videoDate);
        const mValues = mSheet.getDataRange().getValues();
        const mHeaders = mValues[0];
        const headersLower = mHeaders.map(h => String(h||"").toLowerCase());
        const mVdIdx = headersLower.indexOf("video_date");
        const mNewRows = [mHeaders];
        for (let i = 1; i < mValues.length; i++) {
          if (toDateKey_Global(mValues[i][mVdIdx]) !== mKey) mNewRows.push(mValues[i]);
        }
        postData.tasks.forEach(t => {
          const newRow = new Array(mHeaders.length).fill("");
          headersLower.forEach((h, j) => {
            if (h === 'day' || h === 'n' || h === 'ngay') newRow[j] = t.day || 0;
            else if (h === 'type' || h === 'loai') newRow[j] = t.type || "";
            else if (h === 'title' || h === 'ten_bai_tap') newRow[j] = t.title || "";
            else if (h === 'detail' || h === 'chi_tiet') newRow[j] = t.detail || "";
            else if (h === 'link' || h === 'link_video') newRow[j] = t.link || "";
            else if (h === 'video_date') newRow[j] = mKey;
          });
          mNewRows.push(newRow);
        });
        mSheet.clear().getRange(1, 1, mNewRows.length, mHeaders.length).setValues(mNewRows);
        res = true;
        break;
      case 'deleteVideoTask':
        getSheetSmart_(ss, MASTER_SHEET_NAME).deleteRow(postData.rowNumber);
        res = true;
        break;
      case 'deleteVideoGroup':
        const mgSheet = getSheetSmart_(ss, MASTER_SHEET_NAME);
        const mgValues = mgSheet.getDataRange().getValues();
        const mgVdIdx = mgValues[0].map(h => String(h||"").toLowerCase()).indexOf("video_date");
        for (let i = mgValues.length - 1; i >= 1; i--) {
          if (toDateKey_Global(mgValues[i][mgVdIdx]) === postData.videoDateKey) mgSheet.deleteRow(i + 1);
        }
        res = true;
        break;
      default: throw new Error('Action not supported: ' + action);
    }
    return ContentService.createTextOutput(JSON.stringify({success:true, data:res})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { 
    return ContentService.createTextOutput(JSON.stringify({success:false, error:err.toString()})).setMimeType(ContentService.MimeType.JSON); 
  }
}

function upsertCustomer_Backend(ss, payload) {
  const sheet = getSheetSmart_(ss, CUSTOMER_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(h => String(h || "").toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_'));

  if (!payload.customer_id || String(payload.customer_id).startsWith('NEW')) {
    payload.customer_id = 'C' + new Date().getTime();
    payload.token = Math.random().toString(36).substring(2, 10);
    payload.status = 'ACTIVE';
    payload.created_at = new Date().toISOString();
  }
  payload.updated_at = new Date().toISOString();
  
  if (payload.hasOwnProperty('tasks')) {
    payload.is_customized = (Array.isArray(payload.tasks) && payload.tasks.length > 0) ? 1 : 0;
  }

  if (payload.start_date && payload.duration_days) {
    const sDate = toDate_Global(payload.start_date);
    if (sDate) {
      const eDate = new Date(sDate.getTime());
      eDate.setDate(eDate.getDate() + Number(payload.duration_days));
      payload.end_date = toDateKey_Global(eDate);
    }
  }

  const NETLIFY_CLIENT_BASE = "https://phacdo.netlify.app/#/client";
  payload.link = `${NETLIFY_CLIENT_BASE}/${payload.customer_id}?t=${payload.token}`;

  const rowData = headers.map(h => {
    let val = payload[h];
    if (val === undefined || val === null) val = "";
    return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
  });

  let rowIndex = -1;
  const idIdx = headers.indexOf('customer_id');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(payload.customer_id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowData]);
  else sheet.appendRow(rowData);

  if (payload.hasOwnProperty('tasks')) {
    const pSheet = getSheetSmart_(ss, PLAN_SHEET_NAME);
    const pValues = pSheet.getDataRange().getValues();
    const pHeaders = pValues[0];
    const pNewRows = [pHeaders];
    for (let i = 1; i < pValues.length; i++) {
      if (String(pValues[i][0]) !== String(payload.customer_id)) pNewRows.push(pValues[i]);
    }
    
    if (Array.isArray(payload.tasks) && payload.tasks.length > 0) {
      payload.tasks.forEach(t => {
        if (!t.is_deleted) pNewRows.push([String(payload.customer_id), t.day, t.type, t.title, t.detail, t.link, 0]);
      });
    }
    
    if (pNewRows.length > 0) {
       pSheet.clear().getRange(1, 1, pNewRows.length, pHeaders.length).setValues(pNewRows);
    }
  }
  
  return { success: true, customer_id: payload.customer_id, payload };
}

function renderStudentPage(u, t) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const customerRaw = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME).find(c => String(c.customer_id) === String(u));
    if (!customerRaw || String(customerRaw.token) !== String(t)) {
      return HtmlService.createHtmlOutput("<div style='font-family:sans-serif; text-align:center; padding-top:100px;'><h1>TRUY CẬP BỊ TỪ CHỐI</h1></div>");
    }
    
    const serverData = getServerData(u, t);
    const template = HtmlService.createTemplateFromFile('StudentPage');
    
    template.customer = {
      name: customerRaw.customer_name,
      app_title: customerRaw.app_title || "PHÁC ĐỒ 30 NGÀY THAY ĐỔI KHUÔN MẶT",
      app_slogan: customerRaw.app_slogan || "Hành trình đánh thức vẻ đẹp tự nhiên, gìn giữ thanh xuân.",
      start: customerRaw.start_date,
      end: customerRaw.end_date,
      note: String(customerRaw.note || ""),
      chewing: customerRaw.chewing_status || "",
      access_state: serverData.state,
      allowed_day: serverData.allowed_day,
      expire_warning: serverData.expire_warning,
      blocks: serverData.sidebar_blocks,
      tasks: serverData.tasks
    };
    template.params = { u: u, t: t };
    
    return template.evaluate()
      .setTitle("Phác đồ Yoga Face - " + customerRaw.customer_name)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  } catch (e) { return HtmlService.createHtmlOutput("<h1>Lỗi: " + e.toString() + "</h1>"); }
}

function getServerData(u, t) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const c = dbReadSheet_Global(ss, CUSTOMER_SHEET_NAME).find(x => String(x.customer_id) === String(u));
  if (!c) return { ok: false };
  
  const acc = calculateAccessState(c);
  const state = acc.state;
  const allowed = acc.allowed_day;
  
  const today = new Date(); today.setHours(0,0,0,0);
  const end = toDate_Global(c.end_date);
  
  let blocks = [];
  try { if (c.sidebar_blocks_json) blocks = JSON.parse(c.sidebar_blocks_json); } catch (e) {}
  
  const isExpiringSoon = state === "ACTIVE" && end && ((end.getTime() - today.getTime()) / 86400000) <= 5;
  
  return { 
    ok: true, 
    tasks: getPlanData(ss, u, c.video_date), 
    state: state, 
    allowed_day: allowed, 
    expire_warning: isExpiringSoon,
    sidebar_blocks: blocks,
    start_date: c.start_date,
    end_date: c.end_date,
    app_title: c.app_title,
    app_slogan: c.app_slogan,
    note: c.note
  };
}
