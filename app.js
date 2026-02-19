import {
  db,
  auth,
  storage,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  ref,
  uploadBytes,
  getDownloadURL,
} from "./firebase.js";

/* ==============================
   ELEMENTOS
============================== */
const screenLogin = document.getElementById("screenLogin");
const screenSystem = document.getElementById("screenSystem");

const btnLogin = document.getElementById("btnLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMsg = document.getElementById("loginMsg");

const userEmail = document.getElementById("userEmail");
const btnLogout = document.getElementById("btnLogout");

/* Produtos */
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productStockLoja = document.getElementById("productStockLoja");
const productStockBalcao = document.getElementById("productStockBalcao");
const productStockOnline = document.getElementById("productStockOnline");
const productPhoto = document.getElementById("productPhoto");

const btnAddProduct = document.getElementById("btnAddProduct");
const productMsg = document.getElementById("productMsg");
const productSearch = document.getElementById("productSearch");
const productList = document.getElementById("productList");

/* Estoque */
const entrySearch = document.getElementById("entrySearch");
const entrySuggestions = document.getElementById("entrySuggestions");
const entryLocation = document.getElementById("entryLocation");
const entryQty = document.getElementById("entryQty");
const entryDateTime = document.getElementById("entryDateTime");
const btnAddEntry = document.getElementById("btnAddEntry");
const entryMsg = document.getElementById("entryMsg");

/* Estoque List */
const stockFilterName = document.getElementById("stockFilterName");
const stockFilterLocation = document.getElementById("stockFilterLocation");
const stockList = document.getElementById("stockList");

/* Venda */
const saleSearch = document.getElementById("saleSearch");
const saleSuggestions = document.getElementById("saleSuggestions");
const saleLocation = document.getElementById("saleLocation");
const saleQty = document.getElementById("saleQty");
const salePayment = document.getElementById("salePayment");
const saleDateTime = document.getElementById("saleDateTime");
const saleNote = document.getElementById("saleNote");
const btnAddSale = document.getElementById("btnAddSale");
const saleMsg = document.getElementById("saleMsg");

/* ==============================
   CONTAGEM
============================== */
const countLocation = document.getElementById("countLocation");
const countDateTime = document.getElementById("countDateTime");
const countTableBody = document.getElementById("countTableBody");
const btnSaveCount = document.getElementById("btnSaveCount");
const countMsg = document.getElementById("countMsg");

// Quando mudar o local, carregar os produtos daquele local
if (countLocation) {
  countLocation.addEventListener("change", loadCountTable);
}

// Botão Registrar Contagem do Local
if (btnSaveCount) {
  btnSaveCount.addEventListener("click", saveCount);
}

async function saveCount() {
  const location = countLocation.value;
  const dateTime = countDateTime.value;

  if (!location || !dateTime) return;

  const rows = countTableBody.querySelectorAll("tr");

  for (const row of rows) {
    const input = row.querySelector(".new-count-input");
    if (!input) continue;

    const productId = input.dataset.productId;
    const currentQty = parseInt(input.dataset.currentQty);
    const newQtyRaw = input.value;

    const newQty = newQtyRaw === ""
      ? currentQty
      : parseInt(newQtyRaw);

    if (isNaN(newQty)) continue;

    const delta = newQty - currentQty;

    // Se não houve alteração, ignora
    if (delta === 0) continue;

    const productSnap = await getDocs(collection(db, "products"));
    const product = productSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((p) => p.id === productId);

    if (!product) continue;

    // Se diminuiu estoque → gerar venda automática HOTEL
    if (delta < 0) {
      const qtyVendida = Math.abs(delta);
      const total = qtyVendida * product.price;

      await addDoc(collection(db, "sales"), {
        productId: product.id,
        productName: product.name,
        location,
        quantity: qtyVendida,
        unitPrice: product.price,
        total,
        paymentMethod: "HOTEL",
        note: "VENDA AUTOMÁTICA - CONTAGEM",
        createdAt: todayISOFromLocal(dateTime),
      });
    }

    // Atualiza estoque para novo valor
    await updateStock(
      product.id,
      product.name,
      location,
      delta
    );

    // Atualiza data/hora do estoque
    const stockRef = doc(db, "stock", `${product.id}_${location}`);
    await updateDoc(stockRef, {
      updatedAt: todayISOFromLocal(dateTime),
    });
  }

  await loadStock();
  //await loadReports();
  await loadDashboard();
  await loadCountTable();
}





/* Relatórios */
const reportSearch = document.getElementById("reportSearch");
const reportLocation = document.getElementById("reportLocation");
const btnLoadReports = document.getElementById("btnLoadReports");
const reportTotal = document.getElementById("reportTotal");
const reportList = document.getElementById("reportList");

const filterSaleLocation = document.getElementById("filterSaleLocation");
const filterSalePayment = document.getElementById("filterSalePayment");
const filterSaleStart = document.getElementById("filterSaleStart");
const filterSaleEnd = document.getElementById("filterSaleEnd");

filterSaleLocation.addEventListener("change", loadReports);
filterSalePayment.addEventListener("change", loadReports);
filterSaleStart.addEventListener("change", loadReports);
filterSaleEnd.addEventListener("change", loadReports);


/* Dashboard */
const statProducts = document.getElementById("statProducts");
const statSales = document.getElementById("statSales");
const statSalesTotal = document.getElementById("statSalesTotal");

/* ==============================
   VARIÁVEIS
============================== */
let PRODUCTS = [];
let STOCK = [];
let selectedEntryProduct = null;
let selectedSaleProduct = null;
let selectedCountProduct = null;

/* ==============================
   FUNÇÕES AUXILIARES
============================== */
function showMsg(el, text, color = "#fbbf24") {
  el.innerText = text;
  el.style.color = color;
}

function gerarCodigo(nome, seq) {
  let letras = nome
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4);

  while (letras.length < 4) letras += "X";

  return `${letras}${String(seq).padStart(4, "0")}`;
}

function formatMoney(v) {
  return (v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toUpperText(t) {
  if (!t) return "";
  return t.toString().toUpperCase().trim();
}

function nowDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function todayISOFromLocal(localValue) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject("Erro ao comprimir imagem");
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ==============================
   MENU / TABS
============================== */
document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu-btn").forEach((b) =>
      b.classList.remove("active")
    );
    btn.classList.add("active");

    const tabId = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab").forEach((tab) =>
      tab.classList.add("hidden")
    );
    document.getElementById(tabId).classList.remove("hidden");
  });
});

/* ==============================
   LOGIN
============================== */
btnLogin.addEventListener("click", async () => {
  loginMsg.innerText = "";

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
  } catch (err) {
    showMsg(loginMsg, "Erro no login. Verifique email e senha.", "#f87171");
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    screenLogin.classList.add("hidden");
    screenSystem.classList.remove("hidden");

    userEmail.innerText = user.email;
    btnLogout.classList.remove("hidden");

    entryDateTime.value = nowDateTimeLocal();
    saleDateTime.value = nowDateTimeLocal();
    countDateTime.value = nowDateTimeLocal();

    await loadAll();
  } else {
    screenLogin.classList.remove("hidden");
    screenSystem.classList.add("hidden");

    userEmail.innerText = "";
    btnLogout.classList.add("hidden");
  }
});

/* ==============================
   CARREGAR DADOS
============================== */
async function loadAll() {
  await loadProducts();
  await loadStock();
  await loadDashboard();
  await loadReports(); // ✅ Relatórios carregam junto
}


async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  PRODUCTS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  renderProductList();
}

async function loadStock() {
  const snap = await getDocs(collection(db, "stock"));
  STOCK = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderStockList();
}

function renderProductList() {
  productList.innerHTML = "";

  const filter = toUpperText(productSearch.value);

  PRODUCTS.filter((p) => p.active !== false)
    .filter((p) => p.name.includes(filter))
    .forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          ${
            p.photoURL
              ? `<img class="product-photo" src="${p.photoURL}" />`
              : "-"
          }
        </td>
        <td data-label="Código">${p.code}</td>
        <td>${p.name}</td>
        <td>${formatMoney(p.price)}</td>
        <td>
          <button class="action-btn action-edit" data-id="${p.id}">EDITAR</button>
          <button class="action-btn action-hide" data-id="${p.id}">OCULTAR</button>
        </td>
      `;

      productList.appendChild(tr);
    });

  document.querySelectorAll(".action-edit").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(btn.dataset.id));
  });

  document.querySelectorAll(".action-hide").forEach((btn) => {
    btn.addEventListener("click", () => hideProduct(btn.dataset.id));
  });
}

function renderStockList() {
  stockList.innerHTML = "";

  const filterName = toUpperText(stockFilterName.value);
  const filterLocation = stockFilterLocation.value;

  STOCK.filter((s) => {
    if (filterName && !s.productName.includes(filterName)) return false;
    if (filterLocation && s.location !== filterLocation) return false;
    return true;
  }).forEach((s) => {
    const tr = document.createElement("tr");

    const qtyClass = s.quantity === 0 ? "stock-zero" : "stock-ok";

    tr.innerHTML = `
      <td>${s.productName}</td>
      <td>${s.location}</td>
      <td class="${qtyClass}">${s.quantity}</td>
      <td>${s.updatedAt ? new Date(s.updatedAt).toLocaleString("pt-BR") : "-"}</td>
    `;

    stockList.appendChild(tr);
  });
}

productSearch.addEventListener("input", renderProductList);
stockFilterName.addEventListener("input", renderStockList);
stockFilterLocation.addEventListener("change", renderStockList);

/* ==============================
   CADASTRO DE PRODUTO
============================== */
btnAddProduct.addEventListener("click", async () => {
  productMsg.innerText = "";

  const name = toUpperText(productName.value);
  const price = parseFloat(productPrice.value);

  const loja = parseInt(productStockLoja.value);
  const balcao = parseInt(productStockBalcao.value);
  const online = parseInt(productStockOnline.value);

  if (!name) return showMsg(productMsg, "Nome obrigatório.", "#f87171");
  if (!price || isNaN(price) || price <= 0)
    return showMsg(productMsg, "Preço inválido.", "#f87171");

  if (isNaN(loja) || loja < 0) return showMsg(productMsg, "Estoque LOJA inválido.", "#f87171");
  if (isNaN(balcao) || balcao < 0) return showMsg(productMsg, "Estoque BALCÃO inválido.", "#f87171");
  if (isNaN(online) || online < 0) return showMsg(productMsg, "Estoque ONLINE inválido.", "#f87171");

  const seq = PRODUCTS.length + 1;
  const code = gerarCodigo(name, seq);

  let photoURL = "";

  if (productPhoto.files.length > 0) {
    const file = productPhoto.files[0];
    const compressedBlob = await compressImage(file, 800, 0.7);

    const storageRef = ref(storage, `products/${code}.jpg`);
    await uploadBytes(storageRef, compressedBlob);
    photoURL = await getDownloadURL(storageRef);
  }

  const docRef = await addDoc(collection(db, "products"), {
    code,
    name,
    price,
    photoURL,
    active: true,
    createdAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_LOJA`), {
    productId: docRef.id,
    productName: name,
    location: "LOJA",
    quantity: loja,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_BALCAO`), {
    productId: docRef.id,
    productName: name,
    location: "BALCAO",
    quantity: balcao,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_ONLINE`), {
    productId: docRef.id,
    productName: name,
    location: "ONLINE",
    quantity: online,
    updatedAt: new Date().toISOString(),
  });

  productName.value = "";
  productPrice.value = "";
  productStockLoja.value = "";
  productStockBalcao.value = "";
  productStockOnline.value = "";
  productPhoto.value = "";

  showMsg(productMsg, "Produto cadastrado com sucesso!", "#4ade80");

  await loadAll();
});

/* ==============================
   EDITAR / OCULTAR PRODUTO
============================== */
async function editProduct(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const newName = prompt("Editar Nome do Produto:", product.name);
  if (!newName) return;

  const newPrice = prompt("Editar Preço:", product.price);
  if (!newPrice) return;

  const price = parseFloat(newPrice);
  if (!price || isNaN(price) || price <= 0) {
    alert("Preço inválido.");
    return;
  }

  await updateDoc(doc(db, "products", productId), {
    name: toUpperText(newName),
    price,
  });

  alert("Produto atualizado com sucesso!");
  await loadAll();
}

async function hideProduct(productId) {
  const ok = confirm("Tem certeza que deseja OCULTAR este produto?");
  if (!ok) return;

  await updateDoc(doc(db, "products", productId), {
    active: false,
  });

  alert("Produto ocultado. Ele não aparecerá mais no sistema.");
  await loadAll();
}

/* ==============================
   DASHBOARD
============================== */
async function loadDashboard() {
  const productsSnap = await getDocs(collection(db, "products"));
  const salesSnap = await getDocs(collection(db, "sales"));

  let activeProducts = 0;

  productsSnap.docs.forEach((d) => {
    const p = d.data();
    if (p.active !== false) activeProducts++;
  });

  let totalVendido = 0;
  salesSnap.docs.forEach((d) => {
    totalVendido += d.data().total || 0;
  });

  if (statProducts) statProducts.innerText = activeProducts;
  if (statSales) statSales.innerText = salesSnap.size;
  if (statSalesTotal) statSalesTotal.innerText = formatMoney(totalVendido);
}

/* ==============================
   CONTAGEM - Carregar tabela por local
============================== */
async function loadCountTable() {
  const location = countLocation?.value;

  if (!location || !countTableBody) {
    if (countTableBody) countTableBody.innerHTML = "";
    return;
  }

  try {
    const snap = await getDocs(collection(db, "stock"));

    const stockItems = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.location === location)
      .sort((a, b) => a.productName.localeCompare(b.productName));

    countTableBody.innerHTML = "";

    stockItems.forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.productName}</td>
        <td>
          ${item.quantity}
          <br>
          <small>
            ${
              item.updatedAt
                ? new Date(item.updatedAt).toLocaleString("pt-BR")
                : "-"
            }
          </small>
        </td>
        <td>
          <input 
            type="number"
            min="0"
            class="new-count-input"
            data-product-id="${item.productId}"
            data-current-qty="${item.quantity}"
          >
        </td>
        <td class="count-diff">-</td>
      `;

      countTableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("Erro ao carregar tabela de contagem:", error);
  }
}
/* ==============================
   RELATÓRIOS
============================== */
async function loadReports() {
  if (!reportList) return;

  const snap = await getDocs(collection(db, "sales"));
  let sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const locationFilter = filterSaleLocation?.value;
  const paymentFilter = filterSalePayment?.value;
  const startFilter = filterSaleStart?.value;
  const endFilter = filterSaleEnd?.value;

  sales = sales.filter((s) => {
    let ok = true;

    if (locationFilter && locationFilter !== "TODOS") {
      if (s.location !== locationFilter) ok = false;
    }

    if (paymentFilter && paymentFilter !== "TODOS") {
      if (s.paymentMethod !== paymentFilter) ok = false;
    }

    if (startFilter && new Date(s.createdAt) < new Date(startFilter)) ok = false;
    if (endFilter && new Date(s.createdAt) > new Date(endFilter)) ok = false;

    return ok;
  });

  sales.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  reportList.innerHTML = "";

  const grouped = {};

  sales.forEach((s) => {
    const day = new Date(s.createdAt).toLocaleDateString("pt-BR");

    if (!grouped[day]) {
      grouped[day] = {
        sales: [],
        totals: {
          PIX: 0,
          DINHEIRO: 0,
          MAQUINA_LOJA: 0,
          MAQUINA_BALCAO: 0,
          total: 0,
        },
      };
    }

    grouped[day].sales.push(s);

    // 🔁 Se for HOTEL, contabiliza como MÁQ BALCÃO
    const metodo = s.paymentMethod === "HOTEL"
      ? "MAQUINA_BALCAO"
      : s.paymentMethod;
    
    // 🔒 Garante que a chave exista
    if (!grouped[day].totals[metodo]) {
      grouped[day].totals[metodo] = 0;
    }
    
    grouped[day].totals[metodo] += s.total || 0;
    grouped[day].totals.total += s.total || 0;
    
    }); // 🔴 fecha sales.forEach
    
    Object.keys(grouped).forEach((day) => {
    
      // 🔵 Cabeçalho azul do dia
      const headerRow = document.createElement("tr");
      headerRow.innerHTML = `
        <td colspan="7" class="report-day-header">
          📅 ${day}
        </td>
      `;
    
  
    reportList.appendChild(headerRow);

    // Vendas do dia
    grouped[day].sales.forEach((s) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${s.productName}</td>
        <td>${s.location}</td>
        <td>${s.quantity}</td>
        <td>${formatMoney(s.total || 0)}</td>
        <td>${s.paymentMethod}</td>
        <td>${s.createdAt ? new Date(s.createdAt).toLocaleString("pt-BR") : "-"}</td>
        <td>
          <button class="action-btn action-edit-sale">EDITAR</button>
          <button class="action-btn action-delete-sale">EXCLUIR</button>
        </td>
      `;

      reportList.appendChild(tr);

      tr.querySelector(".action-delete-sale").addEventListener("click", () => {
        deleteSale(s);
      });

      tr.querySelector(".action-edit-sale").addEventListener("click", () => {
        editSale(s);
      });
    });

    // Rodapé do dia
    const footerRow = document.createElement("tr");
    footerRow.innerHTML = `
      <td colspan="7" class="report-day-total">
        <div class="day-total-grid">
          <div>PIX<br><strong>${formatMoney(grouped[day].totals.PIX)}</strong></div>
          <div>DINHEIRO<br><strong>${formatMoney(grouped[day].totals.DINHEIRO)}</strong></div>
          <div>MÁQ LOJA<br><strong>${formatMoney(grouped[day].totals.MAQUINA_LOJA)}</strong></div>
          <div>MÁQ BALCÃO<br><strong>${formatMoney(grouped[day].totals.MAQUINA_BALCAO)}</strong></div>
          <div class="day-total-final">
            TOTAL<br>
            <strong>${formatMoney(grouped[day].totals.total)}</strong>
          </div>
        </div>
      </td>
    `;
    reportList.appendChild(footerRow);

  });
}

/* ==============================
   EDITAR VENDA
============================== */
async function editSale(sale) {
  try {
    const newQtyStr = prompt(
      `Editar quantidade da venda:\n\nProduto: ${sale.productName}\nQuantidade atual: ${sale.quantity}`,
      sale.quantity
    );

    if (!newQtyStr) return;

    const newQty = parseInt(newQtyStr);

    if (isNaN(newQty) || newQty <= 0) {
      alert("Quantidade inválida.");
      return;
    }

    if (newQty === sale.quantity) {
      alert("Nenhuma alteração feita.");
      return;
    }

    // 1️⃣ Devolve estoque antigo
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      sale.quantity
    );

    // 2️⃣ Verifica estoque disponível
    const currentStock = await getStock(
      sale.productId,
      sale.location
    );

    if (newQty > currentStock) {
      alert(`Estoque insuficiente. Disponível: ${currentStock}`);

      // desfaz devolução
      await updateStock(
        sale.productId,
        sale.productName,
        sale.location,
        -sale.quantity
      );

      return;
    }

    // 3️⃣ Aplica nova quantidade
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      -newQty
    );

    const newTotal = newQty * sale.unitPrice;

    await updateDoc(doc(db, "sales", sale.id), {
      quantity: newQty,
      total: newTotal,
    });

    await loadStock();
    await loadDashboard();
    await loadReports();

    alert("Venda editada com sucesso!");

  } catch (error) {
    console.error("Erro ao editar venda:", error);
    alert("Erro ao editar venda.");
  }
}



/* ==============================
   EXCLUIR VENDA
============================== */
async function deleteSale(sale) {
  const confirmDelete = confirm(
    `Deseja realmente excluir esta venda?\n\nProduto: ${sale.productName}\nQtd: ${sale.quantity}`
  );

  if (!confirmDelete) return;

  try {
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      sale.quantity
    );

    await deleteDoc(doc(db, "sales", sale.id));

    await loadStock();
    await loadDashboard();
    //await loadReports();

    alert("Venda excluída com sucesso e estoque restaurado!");
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    alert("Erro ao excluir venda.");
  }
}
