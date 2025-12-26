/* =========================
   CONFIG
========================= */
const ADMIN_PASSWORD = "123456"; // đổi pass ở đây
const DB_NAME = "greenshop_db_v1";
const DB_VERSION = 1;

const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b1f1d"/><stop offset="1" stop-color="#052e2b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="400" cy="280" r="120" fill="rgba(24,194,156,.18)"/>
    <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="28" font-weight="700" fill="rgba(231,255,248,.75)">No Image</text>
  </svg>`);

const CATEGORIES = [
  "Các loại lọc","Két nước","Két gió","Gạt mưa","Nước giải nhiệt","Bơm xăng","Bơm nước",
  "Má phanh","Máy lọc không khí","Nắp két nước","Quạt","Kèn","Phụ gia","Lọc nhớt"
];

/* =========================
   STATE
========================= */
const state = {
  isAdmin: false,
  query: "",
  category: "all",
  brand: null,
  sort: "newest",
  sliderIndex: 0,

  products: [],     // loaded
  movements: [],    // loaded
  stockMap: new Map(), // productId -> qty

  draftImageDataUrl: "", // image for preview before saving
  currentViewProductId: null
};

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const loginLabel = $("loginLabel");
const btnLogin = $("btnLogin");
const btnInventory = $("btnInventory");
const btnImportExport = $("btnImportExport");

const categorySelect = $("categorySelect");
const searchInput = $("searchInput");
const searchBtn = $("searchBtn");
const sortSelect = $("sortSelect");

const categoryChips = $("categoryChips");
const brandChips = $("brandChips");

const productGrid = $("productGrid");
const emptyState = $("emptyState");
const resultCount = $("resultCount");

const statProducts = $("statProducts");
const statStock = $("statStock");

const toast = $("toast");
const toastText = $("toastText");

const loginModal = $("loginModal");
const adminPass = $("adminPass");
const adminLoginBtn = $("adminLoginBtn");
const adminLogoutBtn = $("adminLogoutBtn");

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

const viewModal = $("viewModal");
const vImg = $("vImg");
const vName = $("vName");
const vMeta = $("vMeta");
const vDesc = $("vDesc");
const vStock = $("vStock");
const btnEditFromView = $("btnEditFromView");
const btnGoInventoryFromView = $("btnGoInventoryFromView");

const inventoryModal = $("inventoryModal");
const mType = $("mType");
const mProduct = $("mProduct");
const mQty = $("mQty");
const mNote = $("mNote");
const mSave = $("mSave");
const invTableBody = $("invTableBody");
const invFilter = $("invFilter");
const historyList = $("historyList");
const hisFilter = $("hisFilter");

const ieModal = $("ieModal");
const btnExport = $("btnExport");
const importFile = $("importFile");
const btnWipe = $("btnWipe");

const btnAddProduct = $("btnAddProduct");
const btnResetFilters = $("btnResetFilters");

const btnQuickAdd = $("btnQuickAdd");
const btnQuickInventory = $("btnQuickInventory");
const btnOpenInventoryFromSlide = $("btnOpenInventoryFromSlide");
const btnExportFromSlide = $("btnExportFromSlide");

const slider = $("slider");
const sliderDots = $("sliderDots");
const prevSlide = $("prevSlide");
const nextSlide = $("nextSlide");

/* =========================
   INIT
========================= */
init();

async function init(){
  wireModalClose();
  wireUI();

  await dbInit();
  await ensureSeedOnce();

  await refreshAll();
  initSlider();
}

function wireModalClose(){
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) {
      closeAllModals();
    }
  });
}

function wireUI(){
  // Login modal
  btnLogin.addEventListener("click", () => openModal(loginModal));
  adminLoginBtn.addEventListener("click", () => {
    const pass = (adminPass.value || "").trim();
    if (pass === ADMIN_PASSWORD){
      state.isAdmin = true;
      localStorage.setItem("greenshop_admin", "1");
      adminPass.value = "";
      syncAdminUI();
      toastOK("Đăng nhập admin thành công");
      closeAllModals();
    } else {
      toastBad("Sai mật khẩu!");
    }
  });
  adminLogoutBtn.addEventListener("click", () => {
    state.isAdmin = false;
    localStorage.setItem("greenshop_admin", "0");
    syncAdminUI();
    toastOK("Đã đăng xuất");
    closeAllModals();
  });

  // Load admin flag
  state.isAdmin = localStorage.getItem("greenshop_admin") === "1";
  syncAdminUI();

  btnAddProduct.addEventListener("click", () => openProductModalForCreate());
  btnQuickAdd.addEventListener("click", () => openProductModalForCreate());

  btnInventory.addEventListener("click", () => openInventoryModal());
  btnQuickInventory.addEventListener("click", () => openInventoryModal());
  btnOpenInventoryFromSlide.addEventListener("click", () => openInventoryModal());

  btnImportExport.addEventListener("click", () => openModal(ieModal));
  btnExportFromSlide.addEventListener("click", () => { openModal(ieModal); });

  // Search/filter
  searchBtn.addEventListener("click", () => { state.query = (searchInput.value||"").trim(); render(); });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){ state.query = (searchInput.value||"").trim(); render(); }
  });

  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    state.brand = null;
    render();
  });

  sortSelect.addEventListener("change", () => { state.sort = sortSelect.value; render(); });

  btnResetFilters.addEventListener("click", () => {
    state.query = "";
    state.category = "all";
    state.brand = null;
    state.sort = "newest";
    searchInput.value = "";
    categorySelect.value = "all";
    sortSelect.value = "newest";
    render();
  });

  // Product modal actions
  btnPickImage.addEventListener("click", () => pImageFile.click());
  btnUseUrl.addEventListener("click", () => { urlBox.hidden = !urlBox.hidden; });

  pImageFile.addEventListener("change", async () => {
    const f = pImageFile.files && pImageFile.files[0];
    if (!f) return;
    // Preview before save (compress a bit)
    const dataUrl = await fileToDataUrlCompressed(f, 800, 0.85);
    state.draftImageDataUrl = dataUrl;
    pImagePreview.src = dataUrl;
    updateQuickViewFromForm();
  });

  pImageUrl.addEventListener("input", () => {
    const url = (pImageUrl.value||"").trim();
    if (url) {
      state.draftImageDataUrl = url;
      pImagePreview.src = url;
      updateQuickViewFromForm();
    }
  });

  [pName,pSku,pCategory,pBrand,pDesc].forEach(inp => {
    inp.addEventListener("input", updateQuickViewFromForm);
    inp.addEventListener("change", updateQuickViewFromForm);
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
    await dbDeleteProduct(id);
    await refreshAll();
    toastOK("Đã xoá sản phẩm");
    closeAllModals();
  });

  resetFormBtn.addEventListener("click", () => resetProductForm());

  // View modal buttons
  btnEditFromView.addEventListener("click", () => {
    if (!state.isAdmin) return toastBad("Chỉ admin mới sửa.");
    const id = state.currentViewProductId;
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    closeAllModals();
    openProductModalForEdit(p);
  });
  btnGoInventoryFromView.addEventListener("click", () => {
    closeAllModals();
    openInventoryModal(state.currentViewProductId);
  });

  // Inventory
  mSave.addEventListener("click", async () => {
    if (!state.isAdmin) return toastBad("Chỉ admin mới tạo phiếu.");
    const type = mType.value;
    const productId = mProduct.value;
    const qty = Number(mQty.value || 0);
    const note = (mNote.value||"").trim();
    if (!productId) return toastBad("Chọn sản phẩm.");
    if (!Number.isFinite(qty) || qty <= 0) return toastBad("Số lượng phải > 0.");

    await dbAddMovement({
      id: rid(),
      type,
      productId,
      qty,
      note,
      at: Date.now()
    });

    mQty.value = "";
    mNote.value = "";
    await refreshAll();
    toastOK("Đã lưu phiếu");
    // refresh tables in modal
    renderInventoryTables();
  });

  invFilter.addEventListener("input", () => renderInventoryTables());
  hisFilter.addEventListener("input", () => renderInventoryHistory());

  // Tabs
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

  // Import/Export
  btnExport.addEventListener("click", async () => {
    const data = await dbExportAll();
    downloadJson(data, `greenshop-backup-${new Date().toISOString().slice(0,10)}.json`);
    toastOK("Đã xuất JSON");
  });

  importFile.addEventListener("change", async () => {
    const f = importFile.files && importFile.files[0];
    if (!f) return;
    if (!confirm("Nhập JSON sẽ ghi đè toàn bộ dữ liệu hiện tại. Tiếp tục?")) return;
    const txt = await f.text();
    const data = JSON.parse(txt);
    await dbImportAll(data);
    await refreshAll();
    toastOK("Nhập dữ liệu thành công");
    closeAllModals();
    importFile.value = "";
  });

  btnWipe.addEventListener("click", async () => {
    if (!confirm("Xoá toàn bộ dữ liệu (sản phẩm + phiếu)?")) return;
    await dbWipeAll();
    await refreshAll();
    toastOK("Đã xoá toàn bộ dữ liệu");
    closeAllModals();
  });

  // Slider nav
  prevSlide.addEventListener("click", () => sliderGo(-1));
  nextSlide.addEventListener("click", () => sliderGo(1));
}

/* =========================
   ADMIN UI SYNC
========================= */
function syncAdminUI(){
  if (state.isAdmin){
    loginLabel.textContent = "Admin: ON";
    adminLogoutBtn.hidden = false;
    adminLoginBtn.hidden = true;
  } else {
    loginLabel.textContent = "Đăng nhập";
    adminLogoutBtn.hidden = true;
    adminLoginBtn.hidden = false;
  }
}

/* =========================
   RENDER
========================= */
async function refreshAll(){
  state.products = await dbGetAllProducts();
  state.movements = await dbGetAllMovements();
  buildStockMap();

  fillCategoryOptions();
  renderCategoryChips();
  renderBrandChips();
  fillInventoryProductSelect();

  updateStats();
  render();
}

function updateStats(){
  statProducts.textContent = String(state.products.length);
  let total = 0;
  state.stockMap.forEach(v => total += v);
  statStock.textContent = String(total);
}

function fillCategoryOptions(){
  // top select
  categorySelect.innerHTML = `<option value="all">Tất cả danh mục</option>` +
    CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");

  categorySelect.value = state.category;

  // product modal
  pCategory.innerHTML = CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
}

function renderCategoryChips(){
  const items = ["all", ...CATEGORIES];
  categoryChips.innerHTML = items.map(c => {
    const active = (state.category === c) ? "active" : "";
    const label = (c === "all") ? "Tất cả" : c;
    return `<button class="chip ${active}" data-cat="${escAttr(c)}" type="button">
      <i class="fa-solid fa-folder"></i> ${esc(label)}
    </button>`;
  }).join("");

  categoryChips.querySelectorAll("[data-cat]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      state.brand = null;
      categorySelect.value = state.category;
      renderBrandChips();
      render();
    });
  });
}

function renderBrandChips(){
  const list = getFilteredProductsBase(); // base by category
  const brands = [...new Set(list.map(p => (p.brand||"").trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"vi"));

  const allActive = !state.brand;
  const all = `<button class="chip ${allActive ? "active":""}" data-brand="" type="button">
    <i class="fa-solid fa-tag"></i> Tất cả
  </button>`;

  const html = brands.map(b => {
    const active = (state.brand === b) ? "active":"";
    return `<button class="chip ${active}" data-brand="${escAttr(b)}" type="button">
      <i class="fa-solid fa-tag"></i> ${esc(b)}
    </button>`;
  }).join("");

  brandChips.innerHTML = all + html;

  brandChips.querySelectorAll("[data-brand]").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.brand || "";
      state.brand = v ? v : null;
      render();
    });
  });
}

function getFilteredProductsBase(){
  let items = [...state.products];
  if (state.category !== "all"){
    items = items.filter(p => p.category === state.category);
  }
  return items;
}

function getFilteredSortedProducts(){
  let items = getFilteredProductsBase();

  if (state.brand){
    items = items.filter(p => (p.brand||"").trim() === state.brand);
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
    // newest
    return (Number(b.createdAt||0) - Number(a.createdAt||0));
  });

  return items;
}

function render(){
  const items = getFilteredSortedProducts();
  resultCount.textContent = String(items.length);
  emptyState.hidden = items.length !== 0;

  productGrid.innerHTML = items.map(p => {
    const img = p.image || FALLBACK_IMG;
    const stock = stockOf(p.id);
    const isAdminTxt = state.isAdmin ? "Admin: có thể sửa" : "Khách: chỉ xem";
    return `
      <article class="card" data-id="${escAttr(p.id)}">
        <div class="card-img">
          <div class="badge"><i class="fa-solid fa-tag"></i> <span>${esc(p.sku || "SKU")}</span></div>
          <img src="${escAttr(img)}" alt="${escAttr(p.name)}" onerror="this.src='${escAttr(FALLBACK_IMG)}'"/>
        </div>
        <div class="card-body">
          <div class="card-title">${esc(p.name)}</div>
          <div class="card-meta">
            <span class="pchip"><i class="fa-solid fa-folder"></i> ${esc(p.category || "")}</span>
            <span class="pchip"><i class="fa-solid fa-certificate"></i> ${esc(p.brand || "—")}</span>
          </div>
          <div class="card-desc">${esc(p.desc || "")}</div>
          <div class="card-foot">
            <div class="stock"><i class="fa-solid fa-warehouse"></i> ${stock}</div>
            <div class="adminmark">${esc(isAdminTxt)}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  productGrid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      openViewModal(id);
    });
  });
}

/* =========================
   VIEW MODAL
========================= */
function openViewModal(productId){
  const p = state.products.find(x => x.id === productId);
  if (!p) return;
  state.currentViewProductId = productId;

  vImg.src = p.image || FALLBACK_IMG;
  vName.textContent = p.name || "";
  vMeta.textContent = `${p.category || ""} • ${p.brand || "—"} • ${p.sku || ""}`;
  vDesc.textContent = p.desc || "";
  vStock.textContent = String(stockOf(productId));

  openModal(viewModal);
}

/* =========================
   PRODUCT MODAL
========================= */
function openProductModalForCreate(){
  if (!state.isAdmin) return toastBad("Bạn cần đăng nhập admin.");
  pmTitle.textContent = "Thêm sản phẩm";
  deleteProductBtn.hidden = true;
  resetProductForm();
  openModal(productModal);
}

function openProductModalForEdit(p){
  if (!state.isAdmin) return toastBad("Bạn cần đăng nhập admin.");
  pmTitle.textContent = "Sửa sản phẩm";
  deleteProductBtn.hidden = false;

  pId.value = p.id;
  pName.value = p.name || "";
  pSku.value = p.sku || "";
  pCategory.value = p.category || CATEGORIES[0];
  pBrand.value = p.brand || "";
  pDesc.value = p.desc || "";

  // image
  state.draftImageDataUrl = p.image || "";
  pImagePreview.src = state.draftImageDataUrl || FALLBACK_IMG;
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
  pCategory.value = (state.category !== "all") ? state.category : (CATEGORIES[0] || "");
  pBrand.value = "";
  pDesc.value = "";

  state.draftImageDataUrl = "";
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
  const img = state.draftImageDataUrl || FALLBACK_IMG;

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

  // image: prefer draft (file or url). If empty, fallback.
  const image = (state.draftImageDataUrl || (pImageUrl.value||"").trim() || FALLBACK_IMG);

  if (!name) return toastBad("Tên sản phẩm là bắt buộc.");
  if (!category) return toastBad("Danh mục là bắt buộc.");

  const existing = state.products.find(x => x.id === id);
  const createdAt = existing ? existing.createdAt : Date.now();

  await dbUpsertProduct({
    id, name, sku, category,
    brand, desc, image,
    createdAt
  });

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
function stockOf(productId){
  return state.stockMap.get(productId) || 0;
}

function fillInventoryProductSelect(){
  mProduct.innerHTML = state.products
    .slice()
    .sort((a,b)=>(a.name||"").localeCompare((b.name||""),"vi"))
    .map(p => `<option value="${escAttr(p.id)}">${esc(p.name)} ${p.sku ? `(${esc(p.sku)})`:""}</option>`)
    .join("");
}

function openInventoryModal(focusProductId=null){
  if (!state.isAdmin) return toastBad("Bạn cần đăng nhập admin để dùng kho.");
  openModal(inventoryModal);

  // set focus product
  if (focusProductId){
    mProduct.value = focusProductId;
  }

  // default tab create
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".tabpane").forEach(x => x.classList.remove("active"));
  document.querySelector('.tab[data-tab="create"]').classList.add("active");
  $("tab-create").classList.add("active");

  renderInventoryTables();
}

function renderInventoryTables(){
  const q = (invFilter.value||"").toLowerCase().trim();
  const rows = state.products
    .slice()
    .sort((a,b)=> (stockOf(b.id)-stockOf(a.id)) || (a.name||"").localeCompare((b.name||""),"vi"))
    .filter(p => {
      if (!q) return true;
      return (p.name||"").toLowerCase().includes(q) || (p.sku||"").toLowerCase().includes(q);
    })
    .map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.sku||"")}</td>
        <td>${esc(p.category||"")}</td>
        <td><b>${stockOf(p.id)}</b></td>
      </tr>
    `).join("");

  invTableBody.innerHTML = rows || `<tr><td colspan="4">Không có dữ liệu</td></tr>`;
}

function renderInventoryHistory(){
  const q = (hisFilter.value||"").toLowerCase().trim();
  const items = state.movements
    .slice()
    .sort((a,b)=> (Number(b.at||0) - Number(a.at||0)))
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
    const tagClass = (m.type === "IN") ? "in" : "out";
    const tagText = (m.type === "IN") ? "NHẬP" : "XUẤT";
    const icon = (m.type === "IN") ? "fa-arrow-down" : "fa-arrow-up";
    return `
      <div class="his-item">
        <div class="his-top">
          <div class="his-title">
            <i class="fa-solid ${icon}"></i>
            ${esc(name)} ${sku ? `<span class="muted">(${esc(sku)})</span>`:""}
          </div>
          <div class="his-tag ${tagClass}">${tagText} • SL: ${Number(m.qty||0)}</div>
        </div>
        <div class="his-sub">
          <b>Thời gian:</b> ${new Date(m.at).toLocaleString("vi-VN")}<br/>
          <b>Ghi chú:</b> ${esc(m.note || "—")}
        </div>
      </div>
    `;
  }).join("") || `<div class="muted">Chưa có phiếu nào.</div>`;
}

/* =========================
   SLIDER
========================= */
function initSlider(){
  const slides = slider.querySelectorAll(".slide");
  sliderDots.innerHTML = Array.from(slides).map((_,i)=>(
    `<button class="dotbtn ${i===0?"active":""}" data-i="${i}" type="button"></button>`
  )).join("");

  sliderDots.querySelectorAll(".dotbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      sliderSet(i);
    });
  });

  // auto
  setInterval(() => sliderGo(1), 6000);
}

function sliderGo(delta){
  const slides = slider.querySelectorAll(".slide");
  const next = (state.sliderIndex + delta + slides.length) % slides.length;
  sliderSet(next);
}
function sliderSet(i){
  const slides = slider.querySelectorAll(".slide");
  slides.forEach(s => s.classList.remove("active"));
  slides[i].classList.add("active");
  state.sliderIndex = i;

  sliderDots.querySelectorAll(".dotbtn").forEach(d => d.classList.remove("active"));
  sliderDots.querySelectorAll(`.dotbtn[data-i="${i}"]`).forEach(d => d.classList.add("active"));
}

/* =========================
   MODAL HELPERS
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

/* =========================
   TOAST
========================= */
let toastTimer = null;
function toastOK(msg){
  showToast(msg, true);
}
function toastBad(msg){
  showToast(msg, false);
}
function showToast(msg, ok){
  toast.hidden = false;
  toastText.textContent = msg;
  toast.querySelector("i").className = ok ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation";
  toast.style.borderColor = ok ? "rgba(24,194,156,.30)" : "rgba(239,68,68,.35)";
  toast.style.background = ok ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.40)";

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

/* =========================
   IMAGE: file -> dataURL (compressed)
   - preview trước khi save
========================= */
async function fileToDataUrlCompressed(file, maxSize=800, quality=0.85){
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  // draw to canvas to resize
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

  // output jpeg
  return canvas.toDataURL("image/jpeg", quality);
}

/* =========================
   DOWNLOAD JSON
========================= */
function downloadJson(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   ID + ESCAPE
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
   INDEXEDDB LAYER
========================= */
let _db = null;

function dbInit(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
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

function tx(storeName, mode="readonly"){
  const t = _db.transaction(storeName, mode);
  return t.objectStore(storeName);
}

function dbGetAllProducts(){
  return new Promise((resolve, reject) => {
    const r = tx("products").getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}
function dbGetAllMovements(){
  return new Promise((resolve, reject) => {
    const r = tx("movements").getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

function dbUpsertProduct(p){
  return new Promise((resolve, reject) => {
    const r = tx("products","readwrite").put(p);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

function dbDeleteProduct(id){
  return new Promise((resolve, reject) => {
    const r = tx("products","readwrite").delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

function dbAddMovement(m){
  return new Promise((resolve, reject) => {
    const r = tx("movements","readwrite").add(m);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

function dbGetMeta(key){
  return new Promise((resolve, reject) => {
    const r = tx("meta").get(key);
    r.onsuccess = () => resolve(r.result?.value);
    r.onerror = () => reject(r.error);
  });
}
function dbSetMeta(key, value){
  return new Promise((resolve, reject) => {
    const r = tx("meta","readwrite").put({key, value});
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

/* Seed demo products once */
async function ensureSeedOnce(){
  const seeded = await dbGetMeta("seeded_v1");
  if (seeded) return;

  const now = Date.now();
  const demo = [
    { id: rid(), name:"Lọc nhớt Sakura EO-88990", sku:"EO-88990", category:"Lọc nhớt", brand:"Sakura", desc:"Lọc giấy chính hãng, bền.", image:FALLBACK_IMG, createdAt:now-60000 },
    { id: rid(), name:"Lọc gió Sakura A-28100", sku:"A-28100", category:"Két gió", brand:"Sakura", desc:"Tăng hiệu suất nạp gió.", image:FALLBACK_IMG, createdAt:now-50000 },
    { id: rid(), name:"Nước giải nhiệt Coolant 1L", sku:"COOL-1L", category:"Nước giải nhiệt", brand:"Sakura", desc:"Chống sôi, bảo vệ két.", image:FALLBACK_IMG, createdAt:now-40000 },
    { id: rid(), name:"Má phanh BP-110", sku:"BP-110", category:"Má phanh", brand:"Sakura", desc:"Phanh êm, ít bụi.", image:FALLBACK_IMG, createdAt:now-30000 },
  ];

  for (const p of demo) await dbUpsertProduct(p);

  // some initial stock
  await dbAddMovement({id: rid(), type:"IN", productId: demo[0].id, qty: 50, note:"Tồn đầu kỳ", at: now-20000});
  await dbAddMovement({id: rid(), type:"IN", productId: demo[1].id, qty: 30, note:"Tồn đầu kỳ", at: now-20000});
  await dbAddMovement({id: rid(), type:"IN", productId: demo[2].id, qty: 80, note:"Tồn đầu kỳ", at: now-20000});
  await dbAddMovement({id: rid(), type:"IN", productId: demo[3].id, qty: 20, note:"Tồn đầu kỳ", at: now-20000});

  await dbSetMeta("seeded_v1", true);
}

/* Export / Import / Wipe */
async function dbExportAll(){
  const products = await dbGetAllProducts();
  const movements = await dbGetAllMovements();
  return { version: 1, exportedAt: Date.now(), products, movements };
}

async function dbWipeAll(){
  await new Promise((resolve,reject)=>{
    const t = _db.transaction(["products","movements","meta"], "readwrite");
    t.objectStore("products").clear();
    t.objectStore("movements").clear();
    t.objectStore("meta").clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  // reset seed flag so demo can seed again if desired
  await dbSetMeta("seeded_v1", true);
}

async function dbImportAll(data){
  if (!data || !Array.isArray(data.products) || !Array.isArray(data.movements)){
    throw new Error("Invalid backup file");
  }

  await new Promise((resolve,reject)=>{
    const t = _db.transaction(["products","movements","meta"], "readwrite");
    const ps = t.objectStore("products");
    const ms = t.objectStore("movements");
    const meta = t.objectStore("meta");

    ps.clear(); ms.clear(); meta.clear();

    for (const p of data.products) ps.put(p);
    for (const m of data.movements) ms.put(m);

    meta.put({key:"seeded_v1", value:true});
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/* =========================
   Open modals shortcuts
========================= */
function openInventoryModalFromAnywhere(){
  openInventoryModal();
}

/* Hook buttons in slider that open IE modal */
document.addEventListener("DOMContentLoaded", () => {
  // no-op; wired in init()
});
