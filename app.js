/* =========================
   CONFIG
========================= */
const ADMIN_PASSWORD = "123456"; // đổi mật khẩu ở đây
const DB_NAME = "kho_db_v4";
const DB_VERSION = 1;

const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <circle cx="400" cy="300" r="130" fill="#e5e7eb"/>
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="28" font-weight="700" fill="#6b7280">No Image</text>
  </svg>`);

/* =========================
   STATE
========================= */
const state = {
  isAdmin: localStorage.getItem("is_admin_v4") === "1",
  products: [],
  movements: [],
  stock: new Map(),

  // filters
  q: "",
  cat: "",
  brand: "",
  sort: "newest",

  // movement context
  moveProductId: null,

  // shop
  shopMode: false,
  shopQ: "",
  shopCat: ""
};

let db = null;

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const adminView = $("adminView");
const shopView = $("shopView");

const btnGoShop = $("btnGoShop");
const btnRefresh = $("btnRefresh");
const btnSnapshot = $("btnSnapshot");
const btnQuote = $("btnQuote");
const btnOpenAdmin = $("btnOpenAdmin");

const adminPill = $("adminPill");

const pId = $("pId");
const pName = $("pName");
const pImageUrl = $("pImageUrl");
const pImageFile = $("pImageFile");
const btnPickImage = $("btnPickImage");
const pCategory = $("pCategory");
const pBrand = $("pBrand");
const pPrice = $("pPrice");
const pUnit = $("pUnit");
const pInitStock = $("pInitStock");
const pOEM = $("pOEM");
const pNote = $("pNote");
const imgPreview = $("imgPreview");
const previewHint = $("previewHint");

const btnSave = $("btnSave");
const btnReset = $("btnReset");
const btnDelete = $("btnDelete");

const qSearch = $("qSearch");
const fCategory = $("fCategory");
const fBrand = $("fBrand");
const fSort = $("fSort");
const btnClearFilters = $("btnClearFilters");

const tbody = $("tbody");
const empty = $("empty");

const adminModal = $("adminModal");
const adminPass = $("adminPass");
const btnLogin = $("btnLogin");
const btnLogout = $("btnLogout");
const btnOnlyView = $("btnOnlyView");

const moveModal = $("moveModal");
const moveTitle = $("moveTitle");
const mType = $("mType");
const mQty = $("mQty");
const mNote = $("mNote");
const btnSaveMove = $("btnSaveMove");

const toast = $("toast");
const toastText = $("toastText");

const cartCount = $("cartCount");
const cartBadge = $("cartBadge");

const shopSearch = $("shopSearch");
const shopCat = $("shopCat");
const shopGrid = $("shopGrid");
const shopEmpty = $("shopEmpty");

/* =========================
   INIT
========================= */
init();

async function init(){
  wireModalClose();
  wireUI();

  await dbInit();
  await ensureSeedOnce();
  await reloadAll();

  syncAdminUI();
  renderAll();
  updatePreview(FALLBACK_IMG, true);
}

function wireModalClose(){
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close) closeAllModals();
  });
}

function wireUI(){
  btnGoShop.addEventListener("click", () => {
    state.shopMode = !state.shopMode;
    syncModeUI();
    renderAll();
  });

  btnRefresh.addEventListener("click", async () => {
    await reloadAll();
    toastOK("Đã làm mới dữ liệu");
    renderAll();
  });

  btnSnapshot.addEventListener("click", () => toastOK("Chức năng Chụp TồnKho (demo UI)"));
  btnQuote.addEventListener("click", () => toastOK("Chức năng In báo giá (demo UI)"));

  btnOpenAdmin.addEventListener("click", () => openModal(adminModal));

  btnPickImage.addEventListener("click", () => pImageFile.click());

  pImageUrl.addEventListener("input", () => {
    const url = (pImageUrl.value || "").trim();
    if (!url) return updatePreview(FALLBACK_IMG, true);
    updatePreview(url, false);
  });

  pImageFile.addEventListener("change", async () => {
    const f = pImageFile.files?.[0];
    if (!f) return;
    const dataUrl = await fileToDataUrlCompressed(f, 900, 0.86);
    pImageUrl.value = ""; // ưu tiên file
    updatePreview(dataUrl, false);
    imgPreview.dataset.src = dataUrl;
  });

  btnSave.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Bạn phải đăng nhập admin.");
    await saveProductFromForm();
  });

  btnReset.addEventListener("click", () => resetForm());

  btnDelete.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Bạn phải đăng nhập admin.");
    const id = pId.value;
    if (!id) return;
    if (!confirm("Xoá sản phẩm này?")) return;
    await dbDelete("products", id);
    await reloadAll();
    resetForm();
    toastOK("Đã xoá");
    renderAll();
  });

  // Filters
  qSearch.addEventListener("input", () => { state.q = qSearch.value.trim(); renderTable(); });
  fCategory.addEventListener("change", () => { state.cat = fCategory.value; renderTable(); });
  fBrand.addEventListener("change", () => { state.brand = fBrand.value; renderTable(); });
  fSort.addEventListener("change", () => { state.sort = fSort.value; renderTable(); });

  btnClearFilters.addEventListener("click", () => {
    state.q = ""; state.cat = ""; state.brand = ""; state.sort = "newest";
    qSearch.value = ""; fCategory.value = ""; fBrand.value = ""; fSort.value = "newest";
    renderTable();
  });

  // Admin auth
  btnLogin.addEventListener("click", () => {
    const pass = (adminPass.value || "").trim();
    if (pass === ADMIN_PASSWORD){
      state.isAdmin = true;
      localStorage.setItem("is_admin_v4", "1");
      adminPass.value = "";
      toastOK("Admin ON");
      syncAdminUI();
      closeAllModals();
      renderAll();
    } else toastBad("Sai mật khẩu!");
  });

  btnLogout.addEventListener("click", () => {
    state.isAdmin = false;
    localStorage.setItem("is_admin_v4", "0");
    toastOK("Admin OFF");
    syncAdminUI();
    closeAllModals();
    renderAll();
  });

  btnOnlyView.addEventListener("click", () => {
    state.shopMode = true;
    syncModeUI();
    closeAllModals();
    renderAll();
  });

  // Movement
  btnSaveMove.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Chỉ admin.");
    const qty = Number(mQty.value || 0);
    if (!state.moveProductId) return toastBad("Thiếu sản phẩm.");
    if (!Number.isFinite(qty) || qty <= 0) return toastBad("Số lượng > 0");

    await dbPut("movements", {
      id: rid(),
      productId: state.moveProductId,
      type: mType.value,
      qty,
      note: (mNote.value || "").trim(),
      at: Date.now()
    });

    mQty.value = "";
    mNote.value = "";
    closeAllModals();

    await reloadAll();
    toastOK("Đã lưu phiếu");
    renderAll();
  });

  // Shop view
  shopSearch.addEventListener("input", () => { state.shopQ = shopSearch.value.trim(); renderShop(); });
  shopCat.addEventListener("change", () => { state.shopCat = shopCat.value; renderShop(); });
}

function syncModeUI(){
  adminView.hidden = state.shopMode;
  shopView.hidden = !state.shopMode;
  btnGoShop.innerHTML = state.shopMode
    ? `<i class="fa-solid fa-gauge"></i> Quản lý kho`
    : `<i class="fa-solid fa-store"></i> Cửa hàng`;
}

function syncAdminUI(){
  adminPill.textContent = state.isAdmin ? "ADMIN" : "KHÁCH";
  adminPill.style.color = state.isAdmin ? "#1e3a8a" : "#6b7280";
  adminPill.style.background = state.isAdmin ? "#eef2ff" : "#f8fafc";
  btnLogout.hidden = !state.isAdmin;
  btnLogin.hidden = state.isAdmin;

  btnSave.disabled = !state.isAdmin;
  btnReset.disabled = !state.isAdmin;
  btnPickImage.disabled = !state.isAdmin;
  pImageUrl.disabled = !state.isAdmin;

  // khóa input nếu là khách
  [pName,pCategory,pBrand,pPrice,pUnit,pInitStock,pOEM,pNote].forEach(el => el.disabled = !state.isAdmin);
}

function renderAll(){
  syncModeUI();
  syncAdminUI();
  buildFilterOptions();
  renderTable();
  renderShop();
}

/* =========================
   FORM
========================= */
function resetForm(){
  pId.value = "";
  pName.value = "";
  pImageUrl.value = "";
  pCategory.value = "";
  pBrand.value = "";
  pPrice.value = "0";
  pUnit.value = "";
  pInitStock.value = "0";
  pOEM.value = "";
  pNote.value = "";
  pImageFile.value = "";
  imgPreview.dataset.src = "";
  updatePreview(FALLBACK_IMG, true);
  btnDelete.hidden = true;
}

async function saveProductFromForm(){
  const id = pId.value || rid();
  const name = (pName.value || "").trim();
  if (!name) return toastBad("Tên sản phẩm là bắt buộc.");

  const image = imgPreview.dataset.src || (pImageUrl.value || "").trim() || FALLBACK_IMG;

  const product = {
    id,
    name,
    category: (pCategory.value || "").trim(),
    brand: (pBrand.value || "").trim(),
    price: Number(pPrice.value || 0),
    unit: (pUnit.value || "").trim(),
    oem: (pOEM.value || "").trim(),
    note: (pNote.value || "").trim(),
    image,
    createdAt: state.products.find(x => x.id === id)?.createdAt || Date.now()
  };

  await dbPut("products", product);

  // tồn ban đầu chỉ áp dụng khi tạo mới (id mới) hoặc khi người dùng nhập >0 và product chưa có movement
  const initStock = Number(pInitStock.value || 0);
  const existed = state.products.some(x => x.id === id);
  if (!existed && initStock > 0){
    await dbPut("movements", {
      id: rid(),
      productId: id,
      type: "IN",
      qty: initStock,
      note: "Tồn ban đầu",
      at: Date.now()
    });
  }

  await reloadAll();
  toastOK("Đã lưu sản phẩm");
  renderAll();

  // sau khi lưu, chuyển form sang mode edit
  pId.value = id;
  btnDelete.hidden = false;
}

function fillForm(p){
  pId.value = p.id;
  pName.value = p.name || "";
  pCategory.value = p.category || "";
  pBrand.value = p.brand || "";
  pPrice.value = String(Number(p.price || 0));
  pUnit.value = p.unit || "";
  pOEM.value = p.oem || "";
  pNote.value = p.note || "";
  pInitStock.value = "0"; // không set lại tồn ban đầu
  pImageUrl.value = "";
  pImageFile.value = "";
  imgPreview.dataset.src = p.image || "";
  updatePreview(p.image || FALLBACK_IMG, !p.image);
  btnDelete.hidden = !state.isAdmin ? true : false;
}

/* =========================
   TABLE
========================= */
function buildFilterOptions(){
  // Category options from data
  const cats = uniq(state.products.map(p => (p.category||"").trim()).filter(Boolean)).sort(locale);
  const brands = uniq(state.products.map(p => (p.brand||"").trim()).filter(Boolean)).sort(locale);

  fCategory.innerHTML = `<option value="">Tất cả</option>` + cats.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  fBrand.innerHTML = `<option value="">Tất cả</option>` + brands.map(b => `<option value="${escAttr(b)}">${esc(b)}</option>`).join("");

  // shop categories
  shopCat.innerHTML = `<option value="">Tất cả loại</option>` + cats.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
}

function getFilteredProducts(){
  let items = [...state.products];

  const q = (state.q || "").toLowerCase();
  if (q){
    items = items.filter(p => {
      const hay = `${p.name||""} ${p.oem||""} ${p.brand||""} ${p.category||""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  if (state.cat) items = items.filter(p => (p.category||"").trim() === state.cat);
  if (state.brand) items = items.filter(p => (p.brand||"").trim() === state.brand);

  items.sort((a,b) => {
    if (state.sort === "az") return locale(a.name, b.name);
    if (state.sort === "za") return locale(b.name, a.name);
    if (state.sort === "stockDesc") return stockOf(b.id) - stockOf(a.id);
    if (state.sort === "stockAsc") return stockOf(a.id) - stockOf(b.id);
    return Number(b.createdAt||0) - Number(a.createdAt||0);
  });

  return items;
}

function renderTable(){
  const items = getFilteredProducts();
  empty.hidden = items.length !== 0;

  tbody.innerHTML = items.map(p => {
    const s = stockOf(p.id);
    const img = p.image || FALLBACK_IMG;
    const price = formatVND(p.price || 0);

    return `
      <tr>
        <td><input type="checkbox" data-check="${escAttr(p.id)}"/></td>
        <td>
          <div class="timg">
            <img src="${escAttr(img)}" alt="img" onerror="this.src='${escAttr(FALLBACK_IMG)}'">
          </div>
        </td>
        <td>
          <div style="font-weight:1000">${esc(p.name)}</div>
          <div class="muted small">OEM: ${esc(p.oem||"—")} • ĐV: ${esc(p.unit||"—")}</div>
        </td>
        <td>${esc(p.category||"")}</td>
        <td>${esc(p.brand||"")}</td>
        <td><span class="badge">${s}</span></td>
        <td style="font-weight:1000">${price}</td>
        <td>
          <div class="actions">
            <button class="btn btn-sm btn-ghost" data-edit="${escAttr(p.id)}">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button class="btn btn-sm btn-primary" data-in="${escAttr(p.id)}">
              <i class="fa-solid fa-arrow-down"></i> Nhập
            </button>
            <button class="btn btn-sm btn-dark" data-out="${escAttr(p.id)}">
              <i class="fa-solid fa-arrow-up"></i> Xuất
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // wire actions
  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.edit;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      if (!state.isAdmin) return toastBad("Khách chỉ xem.");
      fillForm(p);
      toastOK("Đã nạp dữ liệu để sửa");
    });
  });

  tbody.querySelectorAll("[data-in],[data-out]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.isAdmin) return toastBad("Chỉ admin nhập/xuất.");
      const id = btn.dataset.in || btn.dataset.out;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      openMoveModal(id, p.name, btn.dataset.in ? "IN" : "OUT");
    });
  });
}

/* =========================
   SHOP VIEW (KHÁCH)
========================= */
function renderShop(){
  // cart demo
  const c = Number(localStorage.getItem("cart_v4") || "0");
  if (cartCount) cartCount.textContent = String(c);
  if (cartBadge) cartBadge.textContent = String(c);

  const q = (state.shopQ || "").toLowerCase();
  const cat = state.shopCat || "";

  let items = [...state.products];
  if (cat) items = items.filter(p => (p.category||"").trim() === cat);
  if (q){
    items = items.filter(p => {
      const hay = `${p.name||""} ${p.oem||""} ${p.brand||""} ${p.category||""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  shopEmpty.hidden = items.length !== 0;

  shopGrid.innerHTML = items.map(p => {
    const img = p.image || FALLBACK_IMG;
    return `
      <div class="shop-card">
        <div class="shop-img">
          <img src="${escAttr(img)}" alt="img" onerror="this.src='${escAttr(FALLBACK_IMG)}'">
        </div>
        <div class="shop-body">
          <div class="shop-name">${esc(p.name)}</div>
          <div class="shop-meta">${esc(p.brand||"")} • ${esc(p.category||"")}</div>
          <div class="shop-stock">Tồn: ${stockOf(p.id)} • ${formatVND(p.price||0)}</div>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   MOVEMENT MODAL
========================= */
function openMoveModal(productId, productName, type){
  state.moveProductId = productId;
  moveTitle.textContent = `Sản phẩm: ${productName}`;
  mType.value = type;
  mQty.value = "";
  mNote.value = "";
  openModal(moveModal);
}

/* =========================
   PREVIEW IMAGE
========================= */
function updatePreview(src, showHint){
  imgPreview.src = src || FALLBACK_IMG;
  previewHint.style.display = showHint ? "block" : "none";
}

/* =========================
   MODAL + TOAST
========================= */
function openModal(modal){
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
}
function closeAllModals(){
  document.querySelectorAll(".modal").forEach(m => {
    m.classList.remove("open");
    m.setAttribute("aria-hidden","true");
  });
}
let toastTimer=null;
function toastOK(msg){ showToast(msg,true); }
function toastBad(msg){ showToast(msg,false); }
function showToast(msg, ok){
  toast.hidden=false;
  toastText.textContent=msg;
  toast.querySelector("i").className = ok ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation";
  toast.style.background = ok ? "#111827" : "#7f1d1d";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.hidden=true, 2200);
}

/* =========================
   STOCK CALC
========================= */
function rebuildStock(){
  const map = new Map();
  for (const m of state.movements){
    const sign = m.type === "IN" ? 1 : -1;
    map.set(m.productId, (map.get(m.productId) || 0) + sign * Number(m.qty || 0));
  }
  state.stock = map;
}
function stockOf(id){ return state.stock.get(id) || 0; }

/* =========================
   IMAGE COMPRESS
========================= */
async function fileToDataUrlCompressed(file, maxSize=900, quality=0.86){
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });

  const w = img.width, h = img.height;
  const scale = Math.min(1, maxSize / Math.max(w,h));
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = nw; canvas.height = nh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, nw, nh);

  return canvas.toDataURL("image/jpeg", quality);
}

/* =========================
   INDEXEDDB
========================= */
function dbInit(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;

      if (!d.objectStoreNames.contains("products")){
        const s = d.createObjectStore("products", {keyPath:"id"});
        s.createIndex("by_createdAt","createdAt",{unique:false});
        s.createIndex("by_category","category",{unique:false});
        s.createIndex("by_brand","brand",{unique:false});
        s.createIndex("by_oem","oem",{unique:false});
      }

      if (!d.objectStoreNames.contains("movements")){
        const s = d.createObjectStore("movements", {keyPath:"id"});
        s.createIndex("by_productId","productId",{unique:false});
        s.createIndex("by_at","at",{unique:false});
      }

      if (!d.objectStoreNames.contains("meta")){
        d.createObjectStore("meta", {keyPath:"key"});
      }
    };

    req.onsuccess = () => { db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

function store(name, mode="readonly"){
  return db.transaction(name, mode).objectStore(name);
}
function dbGetAll(name){
  return new Promise((resolve, reject) => {
    const r = store(name).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
function dbPut(name, obj){
  return new Promise((resolve, reject) => {
    const r = store(name,"readwrite").put(obj);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
function dbDelete(name, key){
  return new Promise((resolve, reject) => {
    const r = store(name,"readwrite").delete(key);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
function dbGetMeta(key){
  return new Promise((resolve, reject) => {
    const r = store("meta").get(key);
    r.onsuccess = () => resolve(r.result?.value);
    r.onerror = () => reject(r.error);
  });
}
function dbSetMeta(key, value){
  return new Promise((resolve, reject) => {
    const r = store("meta","readwrite").put({key,value});
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

async function reloadAll(){
  state.products = await dbGetAll("products");
  state.movements = await dbGetAll("movements");
  rebuildStock();

  // auto show delete if editing
  btnDelete.hidden = !(state.isAdmin && pId.value);

  // keep shop search synced if shop mode
  syncModeUI();
}

/* =========================
   SEED (demo data once)
========================= */
async function ensureSeedOnce(){
  const seeded = await dbGetMeta("seeded");
  if (seeded) return;

  const now = Date.now();
  const demo = [
    mk("Lọc nhớt giấy Sakura EO-88990","Lọc nhớt","Sakura","OEM-EO88990", 75000, "cái", "Hàng chính hãng", now-80000),
    mk("Lọc gió Toyota 17801-0L040","Két gió","Toyota","OEM-17801-0L040", 120000, "cái", "Chạy bền", now-70000),
    mk("Gạt mưa Bosch Aerotwin","Gạt mưa","Bosch","OEM-BOSCH-AERO", 180000, "bộ", "Êm, sạch", now-60000),
  ];

  for (const p of demo) await dbPut("products", p);

  // tồn ban đầu
  await dbPut("movements",{id:rid(), productId:demo[0].id, type:"IN", qty:40, note:"Tồn đầu", at:now-50000});
  await dbPut("movements",{id:rid(), productId:demo[1].id, type:"IN", qty:15, note:"Tồn đầu", at:now-50000});
  await dbPut("movements",{id:rid(), productId:demo[2].id, type:"IN", qty:10, note:"Tồn đầu", at:now-50000});

  await dbSetMeta("seeded", true);
}

function mk(name, category, brand, oem, price, unit, note, createdAt){
  return {
    id: rid(),
    name, category, brand, oem,
    price, unit,
    note,
    image: FALLBACK_IMG,
    createdAt
  };
}

/* =========================
   HELPERS
========================= */
function rid(){
  if (crypto?.getRandomValues){
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(16) + a[1].toString(16);
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}
function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escAttr(s){ return esc(s).replaceAll("\n"," "); }
function uniq(arr){ return [...new Set(arr)]; }
function locale(a,b){ return String(a||"").localeCompare(String(b||""),"vi"); }
function formatVND(n){
  const v = Number(n||0);
  return v.toLocaleString("vi-VN") + "đ";
}
