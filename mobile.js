import {
    db,
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc
  } from "./firebase.js";
  
  let STOCK = [];
  let showZero = false;
  
  const list = document.getElementById("list");
  const btnToggleZero = document.getElementById("btnToggleZero");
  const btnSaveAll = document.getElementById("btnSaveAll");
  const msg = document.getElementById("msg");
  
  /* ==============================
     CARREGAR ESTOQUE BALCÃO
  ============================== */
  async function loadStock() {
  
    const snap = await getDocs(collection(db, "stock"));
    STOCK = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
    render();
  }
  
  /* ==============================
     RENDER
  ============================== */
  function render() {
  
    list.innerHTML = "";
  
    STOCK
      .filter(s => s.location === "BALCAO")
      .filter(s => showZero ? true : s.quantity > 0)
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .forEach(s => {
  
        const div = document.createElement("div");
        div.className = "item";
  
        div.innerHTML = `
          <div class="item-name">${s.productName}</div>
          <div class="item-stock">Atual: ${s.quantity}</div>
          <input type="number" placeholder="Nova contagem" data-id="${s.id}">
        `;
  
        list.appendChild(div);
      });
  }
  
  /* ==============================
     TOGGLE ZERADOS
  ============================== */
  btnToggleZero.addEventListener("click", () => {
    showZero = !showZero;
    btnToggleZero.innerText = showZero
      ? "Ocultar Zerados"
      : "Mostrar Zerados";
    render();
  });
  
  /* ==============================
     SALVAR TUDO
  ============================== */
  btnSaveAll.addEventListener("click", async () => {
  
    const inputs = document.querySelectorAll("input[data-id]");
  
    for (const input of inputs) {
  
      const newValue = parseInt(input.value);
      if (isNaN(newValue)) continue;
  
      const stockRef = doc(db, "stock", input.dataset.id);
      const snap = await getDoc(stockRef);
  
      if (!snap.exists()) continue;
  
      const current = snap.data().quantity || 0;
      const delta = newValue - current;
  
      await updateDoc(stockRef, {
        quantity: newValue,
        updatedAt: new Date().toISOString()
      });
    }
  
    msg.innerText = "✅ Contagem salva com sucesso!";
    loadStock();
  });
  
  /* INIT */
  loadStock();