const list = document.getElementById("list");
let items = JSON.parse(localStorage.getItem("parts") || "[]");

render();

function addItem() {
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const brand = document.getElementById("brand").value;
  const imageInput = document.getElementById("image");

  if (!name || !price || !imageInput.files[0]) {
    alert("Nhập đủ thông tin + hình ảnh");
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    items.push({
      name,
      price,
      brand,
      image: reader.result,
    });
    localStorage.setItem("parts", JSON.stringify(items));
    render();
  };
  reader.readAsDataURL(imageInput.files[0]);
}

function render() {
  list.innerHTML = "";
  items.forEach((p, i) => {
    list.innerHTML += `
      <div class="item">
        <img src="${p.image}" />
        <h3>${p.name}</h3>
        <p class="price">${Number(p.price).toLocaleString("vi-VN")}₫</p>
        <p>Hãng: ${p.brand}</p>
        <button onclick="removeItem(${i})">❌ Xóa</button>
      </div>
    `;
  });
}

function removeItem(i) {
  items.splice(i, 1);
  localStorage.setItem("parts", JSON.stringify(items));
  render();
}
