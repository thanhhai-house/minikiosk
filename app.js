/* =========
   CONFIG
   ========= */
const STORAGE_KEY = "pas_sakura_products_v1";
const ADMIN_FLAG_KEY = "pas_admin_logged_in_v1";

// Đổi mật khẩu ở đây (demo). Muốn bảo mật thật -> cần backend.
const ADMIN_PASSWORD = "123456";

/* =========
   DEMO DATA
   ========= */
const DEFAULT_CATEGORIES = [
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
  "Lọc nhớt"
];

const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <g fill="#9ca3af" font-family="Arial" font-size="22" font-weight="700">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">No Image</text>
    </g>
  </svg>`);

const seedProducts = () => ([
  {
    id: cryptoRandomId(),
    name: "Lọc nhớt giấy Sakura EO-88990",
    sku: "EO-88990",
    category: "Lọc nhớt",
    brand: "Sakura",
    price: 120000,
    image: FALLBACK_IMG,
    desc: "Lọc nhớt giấy, độ bền cao."
  },
  {
    id: cryptoRandomId(),
    name: "Lọc nhớt giấy Sakura EO-68020",
    sku: "EO-68020",
    category: "Lọc nhớt",
    brand: "Sakura",
    price: 115000,
    image: FALLBACK_IMG,
    desc: "Tương thích nhiều dòng xe."
  },
  {
    id: cryptoRandomId(),
    name: "Lọc nhớt giấy Sakura EO-65090",
    sku: "EO-65090",
    category: "Lọc nhớt",
    brand: "Sakura",
    price: 98000,
    image: FALLBACK_IMG,
    desc: "Giữ sạch dầu, giảm mài mòn."
  },
  {
    id: cryptoRandomId(),
    name: "Lọc gió Sakura A-28100",
    sku: "A-28100",
    category: "Két gió",
    brand: "Sakura",
    price: 165000,
    image: FALLBACK_IMG,
    desc: "Tăng hiệu quả nạp gió."
  },
  {
    id: cryptoRandomId(),
    name: "Nước giải nhiệt Sakura Coolant 1L",
    sku: "COOL-1L",
    category: "Nước giải nhiệt",
    brand: "Sakura",
    price: 75000,
    image: FALLBACK_IMG,
    desc: "Bảo vệ két nước, chống sôi."
  },
  {
    id: cryptoRandomId(),
    name: "Má phanh Sakura BP-110",
    sku: "BP-110",
    category: "Má phanh",
    brand: "Sakura",
    price: 320000,
    image: FALLBACK_IMG,
    desc: "Phanh êm, ít bụi."
  },
]);

/* =========
   STATE
   ========= */
const state = {
  products: [],
  activeCategory: "Lọc nhớt",
  activeBrand: null,
  query: "",
  sort: "newest",
  isAdmin: false
};

/* =========
   DOM
   ========= */
const el = (id) => document.getElementById(id);

const catList = el("catList");
const brandTags = el("brandTags");
const productGrid = el("productGrid");
const emptyState = el("emptyState");
const resultCount = el("resultCount");

const pageTitle = el("pageTitle");
const crumbCategory = el("crumbCategory");

const searchInput = el("searchInput");
const searchBtn = el("searchBtn");
const categorySelect = el("categorySelect");
const sortSelect = el("sortSelect");

const btnAdmin = el("btnAdmin");
const adminModal = el("adminModal");
const closeAdmin = el("closeAdmin");
const btnToggleSidebar = el("btnToggleSidebar");
const sidebar = el("sidebar");

const adminPass = el("adminPass");
const adminLoginBtn = el("adminLoginBtn");
const adminLogoutBtn = el("adminLogoutBtn");
const adminForm = el("adminForm");
const adminStatusText = el("adminStatusText");

const pId = el("pId");
const pName = el("pName");
const pSku = el("pSku");
const pCategory = el("pCategory");
const pBrand = el("pBrand");
const pPrice = el("pPrice");
const pImage = el("pImage");
const pDesc = el("pDesc");
const saveProductBtn = el("saveProductBtn");
const resetFormBtn = el("resetFormBtn");
const adminTableBody = el("adminTableBody");

/* =========
   INIT
   ========= */
init();

function init() {
  state.products = loadProducts();
  state.isAdmin = loadAdminFlag();

  // fill category select
  renderCategoryOptions();

  // sidebar categories
  renderCategories();

  // sort selection
  sortSelect.value = state.sort;

  // default page title
  setActiveCategory(state.activeCategory);

  // events
  wireEvents();

  // initial render
  render();
  syncAdminUI();
}

function wireEvents() {
  searchBtn.addEventListener("click", () => {
    state.query = (searchInput.value || "").trim();
    render();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
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

  // Admin modal open/close
  btnAdmin.addEventListener("click", () => openAdminModal());
  closeAdmin.addEventListener("click", () => closeAdminModal());
  adminModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeAdminModal();
  });

  // Admin auth
  adminLoginBtn.addEventListener("click", () => {
    const pass = (adminPass.value || "").trim();
    if (pass === ADMIN_PASSWORD) {
      state.isAdmin = true;
      saveAdminFlag(true);
      adminPass.value = "";
      syncAdminUI();
    } else {
      alert("Sai mật khẩu admin!");
    }
  });

  adminLogoutBtn.addEventListener("click", () => {
    state.isAdmin = false;
    saveAdminFlag(false);
    syncAdminUI();
  });

  // Admin form actions
  saveProductBtn.addEventListener("click", () => onSaveProduct());
  resetFormBtn.addEventListener("click", () => resetAdminForm());
}

function openAdminModal() {
  adminModal.classList.add("open");
  adminModal.setAttribute("aria-hidden", "false");
  // render admin table each time opened
  renderAdminTable();
}

function closeAdminModal() {
  adminModal.classList.remove("open");
  adminModal.setAttribute("aria-hidden", "true");
}

/* =========
   RENDER
   ========= */
function render() {
  const view = getFilteredSortedProducts();
  renderBrands(view.baseForBrands);
  renderGrid(view.items);
  resultCount.textContent = String(view.items.length);

  emptyState.hidden = view.items.length !== 0;
}

function renderCategoryOptions() {
  // Top select
  categorySelect.innerHTML = `<option value="all">Chọn danh mục</option>` +
    DEFAULT_CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

  // Admin select
  pCategory.innerHTML = DEFAULT_CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderCategories() {
  catList.innerHTML = DEFAULT_CATEGORIES.map(cat => {
    const active = cat === state.activeCategory ? "active" : "";
    return `
      <li class="cat-item ${active}" data-cat="${escapeAttr(cat)}">
        <span>${escapeHtml(cat)}</span>
        <span class="cat-arrow">›</span>
      </li>
    `;
  }).join("");

  catList.querySelectorAll(".cat-item").forEach(li => {
    li.addEventListener("click", () => {
      const cat = li.dataset.cat;
      setActiveCategory(cat);
      sidebar.classList.remove("show");
      render();
    });
  });
}

function setActiveCategory(cat) {
  state.activeCategory = cat;
  state.activeBrand = null; // reset brand when changing category
  pageTitle.textContent = cat;
  crumbCategory.textContent = cat;

  // update active class in sidebar
  catList.querySelectorAll(".cat-item").forEach(li => {
    li.classList.toggle("active", li.dataset.cat === cat);
  });

  // update top select
  categorySelect.value = cat;
}

function renderBrands(baseItems) {
  const brands = [...new Set(baseItems.map(p => (p.brand || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  if (brands.length === 0) {
    brandTags.innerHTML = `<span class="muted">Không có thương hiệu</span>`;
    return;
  }
  const allTag = `<button class="tag ${state.activeBrand ? "" : "active"}" type="button" data-brand="">Tất cả</button>`;
  const tags = brands.map(b => {
    const active = (state.activeBrand === b) ? "active" : "";
    return `<button class="tag ${active}" type="button" data-brand="${escapeAttr(b)}">${escapeHtml(b)}</button>`;
  }).join("");

  brandTags.innerHTML = allTag + tags;

  brandTags.querySelectorAll(".tag").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.dataset.brand || "";
      state.activeBrand = v ? v : null;
      render();
    });
  });
}

function renderGrid(items) {
  productGrid.innerHTML = items.map(p => {
    const priceText = p.price ? formatVND(p.price) : "Liên hệ";
    const badge = p.sku ? `<span class="badge">${escapeHtml(p.sku)}</span>` : `<span class="badge">Hot</span>`;
    const img = p.image ? p.image : FALLBACK_IMG;

    return `
      <article class="card">
        <div class="card-img">
          <img src="${escapeAttr(img)}" alt="${escapeAttr(p.name)}" onerror="this.src='${escapeAttr(FALLBACK_IMG)}'"/>
        </div>
        <div class="card-body">
          <div class="card-title">${escapeHtml(p.name)}</div>
          <div class="card-sub">${escapeHtml(p.category || "")} • ${escapeHtml(p.brand || "—")}</div>
          <div class="price-row">
            <div class="price">${priceText}</div>
            ${badge}
          </div>
          <div class="card-sub">${escapeHtml(p.desc || "")}</div>
          <div class="contact">
            <button class="btn" type="button" onclick="alert('Gọi hotline: 0779 030 356')">Liên hệ</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========
   FILTER/SORT
   ========= */
function getFilteredSortedProducts() {
  const inCategory = state.products.filter(p => p.category === state.activeCategory);

  // baseForBrands: list within category and (query?) -> like typical sites you can still show brands based on category
  const baseForBrands = inCategory;

  let items = [...inCategory];

  // brand filter
  if (state.activeBrand) {
    items = items.filter(p => (p.brand || "").trim() === state.activeBrand);
  }

  // query filter (name or sku)
  const q = (state.query || "").toLowerCase();
  if (q) {
    items = items.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    );
  }

  // sort
  items.sort((a,b) => {
    switch (state.sort) {
      case "az":
        return (a.name || "").localeCompare((b.name || ""), "vi");
      case "za":
        return (b.name || "").localeCompare((a.name || ""), "vi");
      case "priceAsc":
        return (num(a.price) - num(b.price));
      case "priceDesc":
        return (num(b.price) - num(a.price));
      case "newest":
      default:
        return (num(b.createdAt) - num(a.createdAt));
    }
  });

  return { items, baseForBrands };
}

/* =========
   ADMIN: CRUD
   ========= */
function syncAdminUI() {
  if (state.isAdmin) {
    btnAdmin.textContent = "Admin Panel";
    adminStatusText.textContent = "Bạn đang đăng nhập Admin";
    adminForm.hidden = false;
    adminLogoutBtn.hidden = false;
    adminLoginBtn.hidden = true;
    adminPass.hidden = true;
  } else {
    btnAdmin.textContent = "Đăng nhập Admin";
    adminStatusText.textContent = "Chỉ admin mới thêm/sửa/xoá sản phẩm";
    adminForm.hidden = true;
    adminLogoutBtn.hidden = true;
    adminLoginBtn.hidden = false;
    adminPass.hidden = false;
  }

  renderAdminTable();
}

function onSaveProduct() {
  if (!state.isAdmin) {
    alert("Bạn không có quyền (chưa đăng nhập admin).");
    return;
  }

  const product = {
    id: pId.value ? pId.value : cryptoRandomId(),
    name: (pName.value || "").trim(),
    sku: (pSku.value || "").trim(),
    category: pCategory.value,
    brand: (pBrand.value || "").trim(),
    price: pPrice.value ? Number(pPrice.value) : 0,
    image: (pImage.value || "").trim() || FALLBACK_IMG,
    desc: (pDesc.value || "").trim(),
    createdAt: Date.now()
  };

  if (!product.name) return alert("Vui lòng nhập Tên sản phẩm.");
  if (!product.category) return alert("Vui lòng chọn Danh mục.");

  const idx = state.products.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    // preserve original createdAt for edited item
    product.createdAt = state.products[idx].createdAt || Date.now();
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

function renderAdminTable() {
  if (!adminTableBody) return;

  const rows = [...state.products]
    .sort((a,b)=> (a.category||"").localeCompare((b.category||""),"vi") || (a.name||"").localeCompare((b.name||""),"vi"))
    .map(p => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.sku || "")}</td>
        <td>${escapeHtml(p.category || "")}</td>
        <td>${p.price ? formatVND(p.price) : "Liên hệ"}</td>
        <td>
          <div class="action-btns">
            <button class="btn" type="button" data-edit="${escapeAttr(p.id)}">Sửa</button>
            <button class="btn primary" type="button" data-del="${escapeAttr(p.id)}">Xoá</button>
          </div>
        </td>
      </tr>
    `).join("");

  adminTableBody.innerHTML = rows || `<tr><td colspan="5" class="muted">Chưa có sản phẩm</td></tr>`;

  // bind actions
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

function fillAdminForm(p) {
  pId.value = p.id;
  pName.value = p.name || "";
  pSku.value = p.sku || "";
  pCategory.value = p.category || DEFAULT_CATEGORIES[0];
  pBrand.value = p.brand || "";
  pPrice.value = p.price || 0;
  pImage.value = (p.image && p.image !== FALLBACK_IMG) ? p.image : "";
  pDesc.value = p.desc || "";
}

function resetAdminForm() {
  pId.value = "";
  pName.value = "";
  pSku.value = "";
  pCategory.value = state.activeCategory || DEFAULT_CATEGORIES[0];
  pBrand.value = "Sakura";
  pPrice.value = "";
  pImage.value = "";
  pDesc.value = "";
}

/* =========
   STORAGE
   ========= */
function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch {}
  // first run -> seed
  const seeded = seedProducts().map(p => ({...p, createdAt: Date.now()}));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadAdminFlag() {
  return localStorage.getItem(ADMIN_FLAG_KEY) === "1";
}
function saveAdminFlag(v) {
  localStorage.setItem(ADMIN_FLAG_KEY, v ? "1" : "0");
}

/* =========
   HELPERS
   ========= */
function formatVND(n) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  } catch {
    return `${n} VND`;
  }
}
function num(x){ return Number(x || 0); }

function cryptoRandomId() {
  if (window.crypto && crypto.getRandomValues) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `${arr[0].toString(16)}${arr[1].toString(16)}`;
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("\n"," "); }
