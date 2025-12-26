/* =========================
   CONFIG
========================= */
const ADMIN_PASSWORD = "123456"; // đổi pass ở đây
const DB_NAME = "GreenShop_db_v2";
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

const CATEGORIES = [
  "Các loại lọc","Két nước","Két gió","Gạt mưa","Nước giải nhiệt","Bơm xăng","Bơm nước",
  "Má phanh","Máy lọc không khí","Nắp két nước","Quạt","Kèn","Phụ gia","Lọc nhớt"
];

/* =========================
   STATE
========================= */
const state = {
  isAdmin: localStorage.getItem("pas_admin_v2") === "1",
  query: "",
  activeCategory: "Lọc nhớt",
  activeBrand: null,
  sort: "newest",

  products: [],
  movements: [],
  stockMap: new Map(),

  draftImage: "",
  viewProductId: null,

  cartCount: Number(localStorage.getItem("pas_cart_v2") || "0")
};

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const btnToggleSidebar = $("btnToggleSidebar");
const sidebar = $("sidebar");

const categorySelect = $("categorySelect");
const searchInput = $("searchInput");
const searchBtn = $("searchBtn");
const sortSelect = $("sortSelect");

const catList = $("catList");
const brandTags = $("brandTags");

const pageTitle = $("pageTitle");
const crumbCategory = $("crumbCategory");

const productGrid = $("productGrid");
const emptyState = $("emptyState");

const cartCount = $("cartCount");
const cartBadge = $("cartBadge");

const btnOpenAdmin = $("btnOpenAdmin");
const adminModal = $("adminModal");
const adminPass = $("adminPass");
const adminLoginBtn = $("adminLoginBtn");
const adminLogoutBtn = $("adminLogoutBtn");
const btnOpenInventory = $("btnOpenInventory");
const btnOpenProductModal = $("btnOpenProductModal");

const productModal = $("productModal");
const pmTitle = $("pmTitle");
const pId = $("pId");
const pName = $("pName");
const pSku = $("pSku");
const pCategory = $("pCategory");
const pBrand = $("pBrand");
const pDesc = $("pDesc");
const pImageFile = $("pImageFile");
const btnPickImage = $("btnPickImage");
const btnUseUrl = $("btnUseUrl");
const urlBox = $("urlBox");
const pImageUrl = $("pImageUrl");
const pImagePreview = $("pImagePreview");

const qvImg = $("qvImg");
const qvName = $("qvName");
const qvMeta = $("qvMeta");
const qvDesc = $("qvDesc");
const qvStock = $("qvStock");

const saveProductBtn = $("saveProductBtn");
const deleteProductBtn = $("deleteProductBtn");
const resetFormBtn = $("resetFormBtn");

const inventoryModal = $("inventoryModal");
const mType = $("mType");
const mProduct = $("mProduct");
const mQty = $("mQty");
const mNote = $("mNote");
const mSave = $("mSave");
const invFilter = $("invFilter");
const invTableBody = $("invTableBody");
const hisFilter = $("hisFilter");
const historyList = $("historyList");

const viewModal = $("viewModal");
const vImg = $("vImg");
const vName = $("vName");
const vMeta = $("vMeta");
const vDesc = $("vDesc");
const vStock = $("vStock");
const btnEditFromView = $("btnEditFromView");
const btnGoInventoryFromView = $("btnGoInventoryFromView");
const btnAddToCart = $("btnAddToCart");

const toast = $("toast");
const toastText = $("toastText");

/* =========================
   INIT
========================= */
let _db = null;
init();

async function init(){
  wireModalClose();
  wireUI();

  await dbInit();
  await ensureSeedOnce();
  await refreshAll();

  syncCartUI();
  syncAdminButtons();
}

function wireModalClose(){
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeAllModals();
  });
}

function wireUI(){
  btnToggleSidebar.addEventListener("click", () => sidebar.classList.toggle("show"));

  searchBtn.addEventListener("click", () => { state.query = (searchInput.value||"").trim(); render(); });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ state.query = (searchInput.value||"").trim(); render(); }
  });

  categorySelect.addEventListener("change", () => {
    const v = categorySelect.value;
    if (v === "all") return;
    setActiveCategory(v);
    render();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    render();
  });

  btnOpenAdmin.addEventListener("click", () => openModal(adminModal));

  adminLoginBtn.addEventListener("click", () => {
    const pass = (adminPass.value||"").trim();
    if (pass === ADMIN_PASSWORD){
      state.isAdmin = true;
      localStorage.setItem("pas_admin_v2", "1");
      adminPass.value = "";
      toastOK("Đăng nhập admin thành công");
      syncAdminButtons();
    } else toastBad("Sai mật khẩu!");
  });

  adminLogoutBtn.addEventListener("click", () => {
    state.isAdmin = false;
    localStorage.setItem("pas_admin_v2", "0");
    toastOK("Đã đăng xuất");
    syncAdminButtons();
  });

  btnOpenInventory.addEventListener("click", () => {
    if (!state.isAdmin) return toastBad("Chỉ admin dùng kho.");
    openInventoryModal();
  });

  btnOpenProductModal.addEventListener("click", () => {
    if (!state.isAdmin) return toastBad("Chỉ admin thêm sản phẩm.");
    openProductModalForCreate();
  });

  // Product modal - upload
  btnPickImage.addEventListener("click", () => pImageFile.click());
  btnUseUrl.addEventListener("click", () => urlBox.hidden = !urlBox.hidden);

  pImageFile.addEventListener("change", async () => {
    const f = pImageFile.files && pImageFile.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrlCompressed(f, 900, 0.86);
    state.draftImage = dataUrl;
    pImagePreview.src = dataUrl;
    updateQuickViewFromForm();
  });

  pImageUrl.addEventListener("input", () => {
    const url = (pImageUrl.value||"").trim();
    if (!url) return;
    state.draftImage = url;
    pImagePreview.src = url;
    updateQuickViewFromForm();
  });

  [pName,pSku,pCategory,pBrand,pDesc].forEach(el => {
    el.addEventListener("input", updateQuickViewFromForm);
    el.addEventListener("change", updateQuickViewFromForm);
  });

  saveProductBtn.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Bạn chưa đăng nhập admin.");
    await saveProductFromForm();
  });

  deleteProductBtn.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Bạn chưa đăng nhập admin.");
    const id = pId.value;
    if (!id) return;
    if (!confirm("Xoá sản phẩm này?")) return;
    await dbDelete("products", id);
    await refreshAll();
    toastOK("Đã xoá sản phẩm");
    closeAllModals();
  });

  resetFormBtn.addEventListener("click", () => resetProductForm());

  // Inventory
  mSave.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Chỉ admin dùng kho.");
    const type = mType.value;
    const productId = mProduct.value;
    const qty = Number(mQty.value||0);
    const note = (mNote.value||"").trim();
    if (!productId) return toastBad("Chọn sản phẩm.");
    if (!Number.isFinite(qty) || qty <= 0) return toastBad("Số lượng phải > 0.");

    await dbPut("movements", { id: rid(), type, productId, qty, note, at: Date.now() });
    mQty.value = ""; mNote.value = "";
    await refreshAll();
    toastOK("Đã lưu phiếu");
    renderInventoryTables();
  });

  invFilter.addEventListener("input", () => renderInventoryTables());
  hisFilter.addEventListener("input", () => renderInventoryHistory());

  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;

      document.querySelectorAll(".tabpane").forEach(p => p.classList.remove("active"));
      $("tab-" + tab).classList.add("active");

      if (tab === "create") renderInventoryTables();
      if (tab === "history") renderInventoryHistory();
    });
  });

  // View modal actions
  btnEditFromView.addEventListener("click", () => {
    if (!state.isAdmin) return toastBad("Chỉ admin mới sửa.");
    const p = state.products.find(x => x.id === state.viewProductId);
    if (!p) return;
    closeAllModals();
    openProductModalForEdit(p);
  });

  btnGoInventoryFromView.addEventListener("click", () => {
    if (!state.isAdmin) return toastBad("Chỉ admin dùng kho.");
    closeAllModals();
    openInventoryModal(state.viewProductId);
  });

  btnAddToCart.addEventListener("click", () => {
    state.cartCount += 1;
    localStorage.setItem("pas_cart_v2", String(state.cartCount));
    syncCartUI();
    toastOK("Đã thêm vào giỏ (demo)");
  });
}

function syncAdminButtons(){
  adminLogoutBtn.hidden = !state.isAdmin;
  adminLoginBtn.hidden = state.isAdmin;
  btnOpenProductModal.disabled = !state.isAdmin;
  btnOpenInventory.disabled = !state.isAdmin;
  btnOpenAdmin.innerHTML = state.isAdmin
    ? `<i class="fa-solid fa-user-shield"></i> Admin: ON`
    : `<i class="fa-solid fa-user-shield"></i> Đăng nhập Admin`;
}

function syncCartUI(){
  cartCount.textContent = String(state.cartCount);
  cartBadge.textContent = String(state.cartCount);
}

/* =========================
   RENDER
========================= */
async function refreshAll(){
  state.products = await dbGetAll("products");
  state.movements = await dbGetAll("movements");
  buildStockMap();

  renderCategorySelect();
  renderSidebarCategories();
  setActiveCategory(state.activeCategory); // keep
  renderBrands();
  fillInventoryProductSelect();
  render();
}

function renderCategorySelect(){
  categorySelect.innerHTML =
    `<option value="all">Chọn danh mục</option>` +
    CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  pCategory.innerHTML = CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
}

function renderSidebarCategories(){
  catList.innerHTML = CATEGORIES.map(c => `
    <li data-cat="${escAttr(c)}" class="${c===state.activeCategory?"active":""}">
      <span>${esc(c)}</span><span class="arrow">›</span>
    </li>
  `).join("");

  catList.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      setActiveCategory(li.dataset.cat);
      sidebar.classList.remove("show");
      renderBrands();
      render();
    });
  });
}

function setActiveCategory(cat){
  state.activeCategory = cat;
  state.activeBrand = null;

  pageTitle.textContent = cat;
  crumbCategory.textContent = cat;
  categorySelect.value = cat;

  catList.querySelectorAll("li").forEach(li => {
    li.classList.toggle("active", li.dataset.cat === cat);
  });
}

function renderBrands(){
  const inCat = state.products.filter(p => p.category === state.activeCategory);
  const brands = [...new Set(inCat.map(p => (p.brand||"").trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"vi"));

  const allBtn = `<button class="tag ${state.activeBrand? "" : "active"}" data-brand="">Tất cả</button>`;
  const html = brands.map(b => `
    <button class="tag ${state.activeBrand===b?"active":""}" data-brand="${escAttr(b)}">${esc(b)}</button>
  `).join("");

  brandTags.innerHTML = allBtn + html;

  brandTags.querySelectorAll(".tag").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.brand || "";
      state.activeBrand = v ? v : null;
      render();
    });
  });
}

function getFilteredSortedProducts(){
  let items = state.products.filter(p => p.category === state.activeCategory);

  if (state.activeBrand){
    items = items.filter(p => (p.brand||"").trim() === state.activeBrand);
  }

  const q = (state.query||"").toLowerCase();
  if (q){
    items = items.filter(p =>
      (p.name||"").toLowerCase().includes(q) ||
      (p.sku||"").toLowerCase().includes(q) ||
      (p.brand||"").toLowerCase().includes(q)
    );
  }

  items.sort((a,b) => {
    if (state.sort === "az") return (a.name||"").localeCompare((b.name||""),"vi");
    if (state.sort === "za") return (b.name||"").localeCompare((a.name||""),"vi");
    if (state.sort === "stockDesc") return stockOf(b.id) - stockOf(a.id);
    if (state.sort === "stockAsc") return stockOf(a.id) - stockOf(b.id);
    return (Number(b.createdAt||0) - Number(a.createdAt||0));
  });

  return items;
}

function render(){
  const items = getFilteredSortedProducts();
  emptyState.hidden = items.length !== 0;

  productGrid.innerHTML = items.map(p => {
    const img = p.image || FALLBACK_IMG;
    const stock = stockOf(p.id);
    return `
      <article class="card" data-id="${escAttr(p.id)}">
        <div class="card-img">
          <img src="${escAttr(img)}" alt="${escAttr(p.name)}" onerror="this.src='${escAttr(FALLBACK_IMG)}'"/>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(p.name)}</div>
          <div class="card-actions">
            <div class="stock">Tồn: ${stock}</div>
            <div class="contact">Liên hệ</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  productGrid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => openViewModal(card.dataset.id));
  });
}

/* =========================
   VIEW MODAL
========================= */
function openViewModal(id){
  const p = state.products.find(x => x.id === id);
  if (!p) return;
  state.viewProductId = id;

  vImg.src = p.image || FALLBACK_IMG;
  vName.textContent = p.name || "";
  vMeta.textContent = `${p.category||""} • ${p.brand||"—"} • ${p.sku||""}`;
  vDesc.textContent = p.desc || "";
  vStock.textContent = String(stockOf(id));

  openModal(viewModal);
}

/* =========================
   PRODUCT MODAL
========================= */
function openProductModalForCreate(){
  pmTitle.textContent = "Thêm sản phẩm";
  deleteProductBtn.hidden = true;
  resetProductForm();
  openModal(productModal);
}
function openProductModalForEdit(p){
  pmTitle.textContent = "Sửa sản phẩm";
  deleteProductBtn.hidden = false;

  pId.value = p.id;
  pName.value = p.name || "";
  pSku.value = p.sku || "";
  pCategory.value = p.category || CATEGORIES[0];
  pBrand.value = p.brand || "";
  pDesc.value = p.desc || "";

  state.draftImage = p.image || "";
  pImagePreview.src = state.draftImage || FALLBACK_IMG;

  pImageUrl.value = "";
  urlBox.hidden = true;
  pImageFile.value = "";

  updateQuickViewFromForm();
  openModal(productModal);
}
function resetProductForm(){
  pId.value = "";
  pName.value = "";
  pSku.value = "";
  pCategory.value = state.activeCategory || CATEGORIES[0];
  pBrand.value = "Sakura";
  pDesc.value = "";

  state.draftImage = "";
  pImagePreview.src = FALLBACK_IMG;
  pImageUrl.value = "";
  urlBox.hidden = true;
  pImageFile.value = "";

  updateQuickViewFromForm();
}
function updateQuickViewFromForm(){
  const name = (pName.value||"").trim() || "Tên sản phẩm";
  const sku = (pSku.value||"").trim();
  const cat = pCategory.value || "";
  const brand = (pBrand.value||"").trim() || "—";
  const desc = (pDesc.value||"").trim() || "Mô tả ngắn";
  const img = state.draftImage || (pImageUrl.value||"").trim() || FALLBACK_IMG;

  qvImg.src = img;
  qvName.textContent = name;
  qvMeta.textContent = `${cat} • ${brand} • ${sku}`;
  qvDesc.textContent = desc;

  const id = pId.value;
  qvStock.textContent = id ? String(stockOf(id)) : "0";
}

async function saveProductFromForm(){
  const id = pId.value || rid();
  const name = (pName.value||"").trim();
  const sku = (pSku.value||"").trim();
  const category = pCategory.value;
  const brand = (pBrand.value||"").trim();
  const desc = (pDesc.value||"").trim();
  const image = state.draftImage || (pImageUrl.value||"").trim() || FALLBACK_IMG;

  if (!name) return toastBad("Tên sản phẩm là bắt buộc.");
  if (!category) return toastBad("Danh mục là bắt buộc.");

  const existing = state.products.find(x => x.id === id);
  const createdAt = existing ? existing.createdAt : Date.now();

  await dbPut("products", { id, name, sku, category, brand, desc, image, createdAt });
  await refreshAll();
  toastOK("Đã lưu sản phẩm");
  closeAllModals();
}

/* =========================
   INVENTORY
========================= */
function buildStockMap(){
  const map = new Map();
  for (const m of state.movements){
    const sign = (m.type === "IN") ? 1 : -1;
    map.set(m.productId, (map.get(m.productId)||0) + sign * Number(m.qty||0));
  }
  state.stockMap = map;
}
function stockOf(id){ return state.stockMap.get(id) || 0; }

function fillInventoryProductSelect(){
  mProduct.innerHTML = state.products
    .slice()
    .sort((a,b)=>(a.name||"").localeCompare((b.name||""),"vi"))
    .map(p => `<option value="${escAttr(p.id)}">${esc(p.name)} ${p.sku?`(${esc(p.sku)})`:""}</option>`)
    .join("");
}

function openInventoryModal(focusProductId=null){
  if (focusProductId) mProduct.value = focusProductId;

  // reset tab
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".tabpane").forEach(x => x.classList.remove("active"));
  document.querySelector('.tab[data-tab="create"]').classList.add("active");
  $("tab-create").classList.add("active");

  renderInventoryTables();
  openModal(inventoryModal);
}

function renderInventoryTables(){
  const q = (invFilter.value||"").toLowerCase().trim();
  const rows = state.products
    .slice()
    .sort((a,b)=> (stockOf(b.id)-stockOf(a.id)) || (a.name||"").localeCompare((b.name||""),"vi"))
    .filter(p => !q || (p.name||"").toLowerCase().includes(q) || (p.sku||"").toLowerCase().includes(q))
    .map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.sku||"")}</td>
        <td>${esc(p.category||"")}</td>
        <td><b>${stockOf(p.id)}</b></td>
      </tr>
    `).join("");

  invTableBody.innerHTML = rows || `<tr><td colspan="4">Chưa có dữ liệu</td></tr>`;
}

function renderInventoryHistory(){
  const q = (hisFilter.value||"").toLowerCase().trim();
  const items = state.movements
    .slice()
    .sort((a,b)=>Number(b.at||0)-Number(a.at||0))
    .filter(m => {
      if (!q) return true;
      const p = state.products.find(x => x.id === m.productId);
      const hay = `${p?.name||""} ${p?.sku||""} ${m.note||""}`.toLowerCase();
      return hay.includes(q);
    });

  historyList.innerHTML = items.map(m => {
    const p = state.products.find(x => x.id === m.productId);
    const name = p ? p.name : "(đã xoá sản phẩm)";
    const sku = p?.sku || "";
    const cls = m.type === "IN" ? "in" : "out";
    const label = m.type === "IN" ? "NHẬP" : "XUẤT";
    return `
      <div class="his-item">
        <div class="his-top">
          <div><b>${esc(name)}</b> <span style="color:#6b7280;font-weight:800">${sku?`(${esc(sku)})`:""}</span></div>
          <div class="his-tag ${cls}">${label} • SL: ${Number(m.qty||0)}</div>
        </div>
        <div class="his-sub">
          <b>Thời gian:</b> ${new Date(m.at).toLocaleString("vi-VN")}<br/>
          <b>Ghi chú:</b> ${esc(m.note||"—")}
        </div>
      </div>
    `;
  }).join("") || `<div style="color:#6b7280;font-weight:800">Chưa có phiếu.</div>`;
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
   IMAGE HELPERS (preview + compress)
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
   ID + ESC
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

/* =========================
   INDEXEDDB
========================= */
function dbInit(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("products")){
        const s = db.createObjectStore("products", {keyPath:"id"});
        s.createIndex("by_category","category",{unique:false});
        s.createIndex("by_brand","brand",{unique:false});
        s.createIndex("by_createdAt","createdAt",{unique:false});
      }
      if (!db.objectStoreNames.contains("movements")){
        const s = db.createObjectStore("movements", {keyPath:"id"});
        s.createIndex("by_productId","productId",{unique:false});
        s.createIndex("by_at","at",{unique:false});
      }
      if (!db.objectStoreNames.contains("meta")){
        db.createObjectStore("meta", {keyPath:"key"});
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}
function store(name, mode="readonly"){
  return _db.transaction(name, mode).objectStore(name);
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

async function ensureSeedOnce(){
  const seeded = await dbGetMeta("seeded");
  if (seeded) return;

  const now = Date.now();
  const demo = [
    mk("Lọc nhớt giấy Sakura EO-88990","EO-88990","Lọc nhớt","Sakura","Lọc giấy Sakura",now-80000),
    mk("Lọc nhớt giấy Sakura EO-68020","EO-68020","Lọc nhớt","Sakura","Giữ sạch dầu",now-70000),
    mk("Lọc nhớt giấy Sakura EO-65090","EO-65090","Lọc nhớt","Sakura","Tương thích nhiều xe",now-60000),
    mk("Lọc nhớt giấy Sakura EO-53880","EO-53880","Lọc nhớt","Sakura","Bền, giá tốt",now-50000),
  ];
  for (const p of demo) await dbPut("products", p);

  // tồn đầu
  await dbPut("movements",{id:rid(), type:"IN", productId:demo[0].id, qty:40, note:"Tồn đầu kỳ", at:now-40000});
  await dbPut("movements",{id:rid(), type:"IN", productId:demo[1].id, qty:25, note:"Tồn đầu kỳ", at:now-40000});
  await dbPut("movements",{id:rid(), type:"IN", productId:demo[2].id, qty:30, note:"Tồn đầu kỳ", at:now-40000});
  await dbPut("movements",{id:rid(), type:"IN", productId:demo[3].id, qty:15, note:"Tồn đầu kỳ", at:now-40000});

  await dbSetMeta("seeded", true);
}
function mk(name, sku, category, brand, desc, createdAt){
  return { id: rid(), name, sku, category, brand, desc, image:FALLBACK_IMG, createdAt };
}
