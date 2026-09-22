(() => {
  "use strict";

  const syncStatus = document.getElementById("syncStatus");
  const syncText = document.getElementById("syncText");
  const ordersList = document.getElementById("ordersList");
  const searchInput = document.getElementById("searchInput");
  const newOrderBtn = document.getElementById("newOrderBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");

  const orderDialog = document.getElementById("orderDialog");
  const orderForm = document.getElementById("orderForm");
  const dialogTitle = document.getElementById("dialogTitle");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const firebaseKey = document.getElementById("firebaseKey");
  const orderNumber = document.getElementById("orderNumber");
  const clientName = document.getElementById("clientName");
  const articles = document.getElementById("articles");
  const orderDate = document.getElementById("orderDate");

  let allOrders = [];

  function setStatus(kind, text) {
    syncStatus.className = `sync-status sync-${kind}`;
    syncText.textContent = text;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "";
    const [y, m, d] = value.split("-");
    if (!y || !m || !d) return value;
    return `${d}/${m}/${y}`;
  }

  function renderOrders() {
    const q = searchInput.value.trim().toLowerCase();

    const filtered = allOrders.filter(order => {
      const haystack = [
        order.numeroPedido,
        order.cliente,
        order.articulos,
        order.fecha
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });

    if (!filtered.length) {
      ordersList.innerHTML = `<div class="empty-state">${
        q ? "No hay pedidos que coincidan con la búsqueda." : "Todavía no hay pedidos. Pulsa «+ Nuevo pedido»."
      }</div>`;
      return;
    }

    ordersList.innerHTML = filtered.map(order => `
      <article class="order-row" data-key="${escapeHtml(order.key)}">
        <div class="order-number">${escapeHtml(order.numeroPedido)}</div>
        <div class="client-name">${escapeHtml(order.cliente)}</div>
        <div class="articles-cell">${escapeHtml(order.articulos)}</div>
        <div class="date-cell">${escapeHtml(formatDate(order.fecha))}</div>
        <div class="row-actions">
          <button class="row-btn edit" type="button" data-action="edit">Editar</button>
          <button class="row-btn delete" type="button" data-action="delete">Eliminar</button>
        </div>
      </article>
    `).join("");
  }

  function openNewOrder() {
    dialogTitle.textContent = "Nuevo pedido";
    firebaseKey.value = "";
    orderForm.reset();
    orderDate.value = new Date().toISOString().slice(0, 10);
    orderDialog.showModal();
    setTimeout(() => orderNumber.focus(), 50);
  }

  function openEditOrder(order) {
    dialogTitle.textContent = "Editar pedido";
    firebaseKey.value = order.key;
    orderNumber.value = order.numeroPedido || "";
    clientName.value = order.cliente || "";
    articles.value = order.articulos || "";
    orderDate.value = order.fecha || "";
    orderDialog.showModal();
    setTimeout(() => orderNumber.focus(), 50);
  }

  async function saveOrder(event) {
    event.preventDefault();

    const payload = {
      numeroPedido: orderNumber.value.trim(),
      cliente: clientName.value.trim(),
      articulos: articles.value.trim(),
      fecha: orderDate.value,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (!payload.numeroPedido || !payload.cliente || !payload.articulos || !payload.fecha) {
      alert("Rellena todos los campos.");
      return;
    }

    try {
      setStatus("connecting", "Guardando...");

      if (firebaseKey.value) {
        await firebase.database().ref(`pedidos/${firebaseKey.value}`).update(payload);
      } else {
        payload.createdAt = firebase.database.ServerValue.TIMESTAMP;
        await firebase.database().ref("pedidos").push(payload);
      }

      orderDialog.close();
      setStatus("online", "Sincronizado");
    } catch (error) {
      console.error(error);
      setStatus("offline", "Error al guardar");
      alert("Firebase no ha permitido guardar el pedido. Revisa las reglas de Realtime Database.");
    }
  }

  async function deleteOrder(key) {
    const order = allOrders.find(item => item.key === key);
    const label = order?.numeroPedido ? ` ${order.numeroPedido}` : "";

    if (!confirm(`¿Eliminar el pedido${label}?`)) return;

    try {
      setStatus("connecting", "Eliminando...");
      await firebase.database().ref(`pedidos/${key}`).remove();
      setStatus("online", "Sincronizado");
    } catch (error) {
      console.error(error);
      setStatus("offline", "Error al eliminar");
      alert("No se ha podido eliminar. Revisa las reglas de Firebase.");
    }
  }

  function exportBackup() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      pedidos: allOrders.map(({ key, ...order }) => order)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pizarra-pedidos-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const pedidos = Array.isArray(parsed) ? parsed : parsed.pedidos;

      if (!Array.isArray(pedidos)) throw new Error("Formato inválido");

      if (!confirm(`Se van a añadir ${pedidos.length} pedidos a la base actual. ¿Continuar?`)) {
        importInput.value = "";
        return;
      }

      setStatus("connecting", "Importando...");

      const ref = firebase.database().ref("pedidos");
      const updates = {};

      pedidos.forEach(order => {
        const key = ref.push().key;
        updates[key] = {
          numeroPedido: String(order.numeroPedido ?? "").trim(),
          cliente: String(order.cliente ?? "").trim(),
          articulos: String(order.articulos ?? "").trim(),
          fecha: String(order.fecha ?? "").trim(),
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
      });

      await ref.update(updates);
      setStatus("online", "Sincronizado");
    } catch (error) {
      console.error(error);
      alert("No se ha podido importar el archivo. Comprueba que sea una copia válida.");
    } finally {
      importInput.value = "";
    }
  }

  function boot() {
    try {
      if (!window.firebaseConfig) {
        throw new Error("No se ha cargado firebase-config.js");
      }

      firebase.initializeApp(window.firebaseConfig);
      const db = firebase.database();

      db.ref(".info/connected").on("value", snapshot => {
        if (snapshot.val() === true) {
          setStatus("online", "Sincronizado");
        } else {
          setStatus("connecting", "Conectando...");
        }
      });

      db.ref("pedidos").on(
        "value",
        snapshot => {
          const raw = snapshot.val() || {};

          allOrders = Object.entries(raw).map(([key, value]) => ({
            key,
            ...value
          }));

          allOrders.sort((a, b) => {
            const aTime = Number(a.createdAt || a.updatedAt || 0);
            const bTime = Number(b.createdAt || b.updatedAt || 0);
            return bTime - aTime;
          });

          renderOrders();
        },
        error => {
          console.error("Firebase read error:", error);
          setStatus("offline", "Sin acceso a la base");
          ordersList.innerHTML = `
            <div class="empty-state">
              Firebase está conectado, pero no permite leer los pedidos.<br>
              Revisa la pestaña <strong>Realtime Database → Reglas</strong>.
            </div>`;
        }
      );
    } catch (error) {
      console.error(error);
      setStatus("offline", "Error de configuración");
      ordersList.innerHTML = `
        <div class="empty-state">
          No se ha podido iniciar Firebase.<br>
          Pulsa F12 → Consola para ver el error.
        </div>`;
    }
  }

  searchInput.addEventListener("input", renderOrders);
  newOrderBtn.addEventListener("click", openNewOrder);
  closeDialogBtn.addEventListener("click", () => orderDialog.close());
  cancelBtn.addEventListener("click", () => orderDialog.close());
  orderForm.addEventListener("submit", saveOrder);
  exportBtn.addEventListener("click", exportBackup);
  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) importBackup(file);
  });

  ordersList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest(".order-row");
    const key = row?.dataset.key;
    if (!key) return;

    if (button.dataset.action === "edit") {
      const order = allOrders.find(item => item.key === key);
      if (order) openEditOrder(order);
    }

    if (button.dataset.action === "delete") {
      deleteOrder(key);
    }
  });

  boot();
})();
