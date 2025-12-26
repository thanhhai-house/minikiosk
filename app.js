/* =========================
   CONFIG
========================= */
const STORAGE_KEY = "pas_products_v3";
const ADMIN_FLAG_KEY = "pas_admin_v3";
const ADMIN_PASSWORD = "123456"; // đổi pass tại đây

/* =========================
   DATA
========================= */
const CATEGORIES = [
  "Các loại lọc",
  "Két nước",
  "Két gió",
  "Gạt mưa",
  "Nước giải nhiệt",
  "Bơm xăng",
  "Bơm nước",
  "Má phanh",
  "Máy lọc không khí",
  "Nắp két nước",
  "Quạt",
  "Kèn",
  "Phụ gia",
  "Lọc nhớt",
];

const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="300" cy="220" r="90" fill="#fee2e2"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="22" font-weight="700" fill="#64748b">No Image</text>
  </svg>`);

function seedProducts() {
  const now = Date.now();
  return [
    mk("Lọc nhớt giấy Sakura EO-88990", "EO-88990", "Lọc nhớt", "Sakura", 120000, "", "Lọc giấy, độ bền cao.", now-10000),
    mk("Lọc nhớt giấy Sakura EO-68020", "EO-68020", "Lọc nhớt", "Sakura", 115000, "", "Giữ sạch dầu, giảm mài mòn.", now-9000),
    mk("Lọc nhớt giấy Sakura EO-65090", "EO-65090", "Lọc nhớt", "Sakura", 98000, "", "Tương thích nhiều dòng xe.", now-8000),
    mk("Lọc gió Sakura A-28100", "A-28100", "Két gió", "Sakura", 165000, "", "Tăng hiệu quả nạp gió.", now-7000),
    mk("Nước giải nhiệt Coolant 1L", "COOL-1L", "Nước giải nhiệt", "Sakura", 75000, "", "Chống sôi, bảo vệ két.", now-6000),
    mk("Má phanh Sakura BP-110", "BP-110", "Má phanh", "Sakura", 320000, "", "Phanh êm, ít bụi.", now-5000),
  ];
}

function mk(name, sku, category, brand, price, image, desc, createdAt){
  return {
    id: rid(),
    name, sku, category, brand,
    price: Number(price || 0),
    image: image || FALLBACK_IMG,
    desc: desc || "",
    createdAt: createdAt || Date.now()
  };
}

/* =========================
   STATE
========================= */
const state = {
  products: [],
  activeCategory: "Lọc nhớt",
  activeBrand: null,
  query: "",
  sort: "newest",
  isAdmin: false
};

/* =========================
   DOM
========================= */
const $ = (id) => document.getElementById(id);

const catList = $("catList");
const brandTags = $("brandTags");
const productGrid = $("productGrid");
const emptyState = $("emptyState");
const resultCount = $("resultCount");

const pageTitle = $("pageTitle");
const crumbCategory = $("crumbCategory");

const searchInput = $("searchInput");
const searchBtn = $("searchBtn");
const categorySelect = $("categorySelect");
const sortSelect = $("sortSelect");

const btnAdmin = $("btnAdmin");
const adminModal = $("adminModal");
const closeAdmin = $("closeAdmin");
const btnToggleSidebar = $("btnToggleSidebar");
const sidebar = $("sidebar");

const adminPass = $("adminPass");
const adminLoginBtn = $("adminLoginBtn");
const adminLogoutBtn = $("adminLogoutBtn");
const adminForm = $("adminForm");
const adminStatusText = $("adminStatusText");

const pId = $("pId");
const pName = $("pName");
const pSku = $("pSku");
const pCategory = $("pCategory");
const pBrand = $("pBrand");
const pPrice = $("pPrice");
const pImage = $("pImage");
const pDesc = $("pDesc");
const saveProductBtn = $("saveProductBtn");
const resetFormBtn = $("resetFormBtn");
const adminTableBody = $("adminTableBody");

/* =========================
   INIT
========================= */
init();

function init(){
  state.products = loadProducts();
  state.isAdmin = loadAdminFlag();

  renderCategoryOptions();
  renderCategories();

  sortSelect.value = state.sort;
  setActiveCategory(state.activeCategory);

  wireEvents();
  syncAdminUI();
  render();
}

function wireEvents(){
  searchBtn.addEventListener("click", () => {
    state.query = (searchInput.value || "").trim();
    render();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter"){
      state.query = (searchInput.value || "").trim();
      render();
    }
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

  btnToggleSidebar.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });

  btnAdmin.addEventListener("click", () => openAdminModal());
  closeAdmin.addEventListener("click", () => closeAdminModal());
  adminModal.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close) closeAdminModal();
  });

  adminLoginBtn.addEventListener("click", () => {
    const pass = (adminPass.value || "").trim();
    if (pass === ADMIN_PASSWORD){
      state.isAdmin = true;
      saveAdminFlag(true);
      adminPass.value = "";
      syncAdminUI();
      alert("Đăng nhập admin thành công!");
    } else {
      alert("Sai mật khẩu admin!");
    }
  });

  adminLogoutBtn.addEventListener("click", () => {
    state.isAdmin = false;
    saveAdminFlag(false);
    syncAdminUI();
  });

  saveProductBtn.addEventListener("click", () => onSaveProduct());
  resetFormBtn.addEventListener("click", () => resetAdminForm());
}

/* =========================
   RENDER
========================= */
function render(){
  const { items, baseForBrands } = getFilteredSortedProducts();
  renderBrands(baseForBrands);
  renderGrid(items);
  resultCount.textContent = String(items.length);
  emptyState.hidden = items.length !== 0;
}

function renderCategoryOptions(){
  categorySelect.innerHTML = `<option value="all">Chọn danh mục</option>` +
    CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");

  pCategory.innerHTML = CATEGORIES.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
}

function renderCategories(){
  catList.innerHTML = CATEGORIES.map(cat => `
    <li class="cat-item ${cat === state.activeCategory ? "active" : ""}" data-cat="${escAttr(cat)}">
      <span>${esc(cat)}</span>
      <span class="cat-arrow">›</span>
    </li>
  `).join("");

  catList.querySelectorAll(".cat-item").forEach(li => {
    li.addEventListener("click", () => {
      setActiveCategory(li.dataset.cat);
      sidebar.classList.remove("show");
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

  catList.querySelectorAll(".cat-item").forEach(li => {
    li.classList.toggle("active", li.dataset.cat === cat);
  });
}

function renderBrands(baseItems){
  const brands = [...new Set(baseItems.map(p => (p.brand||"").trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,"vi"));

  if (brands.length === 0){
    brandTags.innerHTML = `<span class="muted">Không có thương hiệu</span>`;
    return;
  }

  const allTag = `<button class="tag ${state.activeBrand ? "" : "active"}" type="button" data-brand="">Tất cả</button>`;
  const tags = brands.map(b => `
    <button class="tag ${state.activeBrand === b ? "active" : ""}" type="button" data-brand="${escAttr(b)}">${esc(b)}</button>
  `).join("");

  brandTags.innerHTML = allTag + tags;

  brandTags.querySelectorAll(".tag").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.brand || "";
      state.activeBrand = v ? v : null;
      render();
    });
  });
}

function renderGrid(items){
  productGrid.innerHTML = items.map(p => {
    const img = p.image || FALLBACK_IMG;
    const priceText = p.price ? formatVND(p.price) : "Liên hệ";

    return `
      <article class="card">
        <div class="card-img">
          <div class="corner-badge">
            <i class="fa-solid fa-tag"></i>
            <span>${esc(p.sku || "HOT")}</span>
          </div>
          <img src="${escAttr(img)}" alt="${escAttr(p.name)}" onerror="this.src='${escAttr(FALLBACK_IMG)}'"/>
        </div>

        <div class="card-body">
          <div class="card-title">${esc(p.name)}</div>

          <div class="card-sub">
            <span class="chip"><i class="fa-solid fa-layer-group"></i> ${esc(p.category || "")}</span>
            <span class="chip"><i class="fa-solid fa-certificate"></i> ${esc(p.brand || "—")}</span>
          </div>

          <div class="price-row">
            <div class="price"><i class="fa-solid fa-money-bill-wave"></i> ${priceText}</div>
          </div>

          <div class="card-sub">${esc(p.desc || "")}</div>

          <div class="contact">
            <button class="btn" type="button" onclick="alert('Hotline: 0779 030 356')">
              <i class="fa-solid fa-phone"></i> Liên hệ
            </button>
            <button class="btn primary" type="button" onclick="alert('Chức năng giỏ hàng demo')">
              <i class="fa-solid fa-cart-plus"></i> Thêm
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   FILTER/SORT
========================= */
function getFilteredSortedProducts(){
  const inCategory = state.products.filter(p => p.category === state.activeCategory);
  const baseForBrands = inCategory;

  let items = [...inCategory];

  if (state.activeBrand){
    items = items.filter(p => (p.brand||"").trim() === state.activeBrand);
  }

  const q = (state.query || "").toLowerCase();
  if (q){
    items = items.filter(p =>
      (p.name||"").toLowerCase().includes(q) ||
      (p.sku||"").toLowerCase().includes(q)
    );
  }

  items.sort((a,b) => {
    switch(state.sort){
      case "az": return (a.name||"").localeCompare((b.name||""),"vi");
      case "za": return (b.name||"").localeCompare((a.name||""),"vi");
      case "priceAsc": return (Number(a.price||0) - Number(b.price||0));
      case "priceDesc": return (Number(b.price||0) - Number(a.price||0));
      case "newest":
      default: return (Number(b.createdAt||0) - Number(a.createdAt||0));
    }
  });

  return { items, baseForBrands };
}

/* =========================
   ADMIN
========================= */
function openAdminModal(){
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden","false");
  renderAdminTable();
}

function closeAdminModal(){
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden","true");
}

function syncAdminUI(){
  if (state.isAdmin){
    adminStatusText.textContent = "Bạn đang đăng nhập Admin";
    adminForm.hidden = false;
    adminLogoutBtn.hidden = false;
    adminLoginBtn.hidden = true;
    adminPass.hidden = true;
    btnAdmin.querySelector("span").textContent = "Admin Panel";
  } else {
    adminStatusText.textContent = "Chỉ admin mới thêm/sửa/xoá sản phẩm";
    adminForm.hidden = true;
    adminLogoutBtn.hidden = true;
    adminLoginBtn.hidden = false;
    adminPass.hidden = false;
    btnAdmin.querySelector("span").textContent = "Admin";
  }

  renderAdminTable();
}

function onSaveProduct(){
  if (!state.isAdmin) return alert("Chưa đăng nhập admin.");

  const product = {
    id: pId.value ? pId.value : rid(),
    name: (pName.value || "").trim(),
    sku: (pSku.value || "").trim(),
    category: pCategory.value,
    brand: (pBrand.value || "").trim() || "Sakura",
    price: pPrice.value ? Number(pPrice.value) : 0,
    image: (pImage.value || "").trim() || FALLBACK_IMG,
    desc: (pDesc.value || "").trim(),
    createdAt: Date.now()
  };

  if (!product.name) return alert("Nhập tên sản phẩm.");
  if (!product.category) return alert("Chọn danh mục.");

  const idx = state.products.findIndex(x => x.id === product.id);
  if (idx >= 0){
    product.createdAt = state.products[idx].createdAt || product.createdAt;
    state.products[idx] = product;
  } else {
    state.products.push(product);
  }

  saveProducts(state.products);
  resetAdminForm();
  renderAdminTable();
  render();
  alert("Đã lưu sản phẩm!");
}

function resetAdminForm(){
  pId.value = "";
  pName.value = "";
  pSku.value = "";
  pCategory.value = state.activeCategory || CATEGORIES[0];
  pBrand.value = "Sakura";
  pPrice.value = "";
  pImage.value = "";
  pDesc.value = "";
}

function renderAdminTable(){
  if (!adminTableBody) return;

  const rows = [...state.products]
    .sort((a,b)=> (a.category||"").localeCompare((b.category||""),"vi") || (a.name||"").localeCompare((b.name||""),"vi"))
    .map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.sku || "")}</td>
        <td>${esc(p.category || "")}</td>
        <td>${p.price ? formatVND(p.price) : "Liên hệ"}</td>
        <td>
          <div class="action-btns">
            <button class="btn" type="button" data-edit="${escAttr(p.id)}">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button class="btn danger" type="button" data-del="${escAttr(p.id)}">
              <i class="fa-solid fa-trash"></i> Xoá
            </button>
          </div>
        </td>
      </tr>
    `).join("");

  adminTableBody.innerHTML = rows || `<tr><td colspan="5" class="muted">Chưa có sản phẩm</td></tr>`;

  adminTableBody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.edit;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      fillAdminForm(p);
    });
  });

  adminTableBody.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.isAdmin) return alert("Chưa đăng nhập admin.");
      const id = btn.dataset.del;
      const p = state.products.find(x => x.id === id);
      if (!p) return;
      if (!confirm(`Xoá sản phẩm:\n${p.name}?`)) return;
      state.products = state.products.filter(x => x.id !== id);
      saveProducts(state.products);
      renderAdminTable();
      render();
    });
  });
}

function fillAdminForm(p){
  pId.value = p.id;
  pName.value = p.name || "";
  pSku.value = p.sku || "";
  pCategory.value = p.category || CATEGORIES[0];
  pBrand.value = p.brand || "";
  pPrice.value = p.price || 0;
  pImage.value = (p.image && p.image !== FALLBACK_IMG) ? p.image : "";
  pDesc.value = p.desc || "";
}

/* =========================
   STORAGE
========================= */
function loadProducts(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw){
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch {}
  const seeded = seedProducts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveProducts(products){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadAdminFlag(){
  return localStorage.getItem(ADMIN_FLAG_KEY) === "1";
}
function saveAdminFlag(v){
  localStorage.setItem(ADMIN_FLAG_KEY, v ? "1" : "0");
}

/* =========================
   HELPERS
========================= */
function formatVND(n){
  try{
    return new Intl.NumberFormat("vi-VN", { style:"currency", currency:"VND" }).format(n);
  } catch {
    return `${n} VND`;
  }
}

function rid(){
  if (window.crypto && crypto.getRandomValues){
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
