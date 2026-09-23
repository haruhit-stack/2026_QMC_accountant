const PRODUCTS = [
  { name: '大人', price: 600 },
  { name: '小学生以下', price: 400 },
  { name: '三歳以下', price: 0 },
  { name: 'ビラ持参orSNSフォロー', price: -100 },
  { name: '小学生以下の付き添いの大人', price: -100 }
];

const STORAGE_KEY = 'qmc_register_transactions_v1';
let currentCart = [];

const $ = (id) => document.getElementById(id),
  productButtons = $('productButtons'),
  cartList = $('cartList'),
  cartCount = $('cartCount'),
  totalPrice = $('totalPrice'),
  cashReceived = $('cashReceived'),
  changeBox = $('changeBox'),
  changeLabel = $('changeLabel'),
  changeAmount = $('changeAmount'),
  message = $('message'),
  historyDialog = $('historyDialog'),
  historyList = $('historyList'),
  historyTotalSales = $('historyTotalSales'),
  importButton = $('importButton'),
  importFileInput = $('importFileInput');

function yen(v) {
  return Number(v).toLocaleString('ja-JP') + '円';
}

function getTransactions() {
  try {
    const x = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}

function saveTransactions(x) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(x));
}

function showMessage(t) {
  message.textContent = t;
  message.classList.add('show');
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => message.classList.remove('show'), 2200);
}

function renderProducts() {
  productButtons.innerHTML = '';
  PRODUCTS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'product-button';
    b.innerHTML = `<span class="product-name"></span><span class="product-price"></span>`;
    b.querySelector('.product-name').textContent = p.name;
    b.querySelector('.product-price').textContent = p.price < 0 ? `割引 ${yen(p.price)}` : yen(p.price);
    if (p.price < 0) b.querySelector('.product-price').classList.add('discount');
    b.onclick = () => addToCart(p);
    productButtons.appendChild(b);
  });
}

function addToCart(p) {
  const x = currentCart.find((i) => i.name === p.name);
  if (x) x.quantity++;
  else currentCart.push({ name: p.name, price: p.price, quantity: 1 });
  renderCart();
}

function changeQuantity(name, d) {
  const x = currentCart.find((i) => i.name === name);
  if (!x) return;
  x.quantity += d;
  if (x.quantity <= 0) currentCart = currentCart.filter((i) => i.name !== name);
  renderCart();
}

function getTotal() {
  return currentCart.reduce((s, i) => s + i.price * i.quantity, 0);
}

function renderCart() {
  cartList.innerHTML = '';
  if (!currentCart.length) {
    cartList.innerHTML = '<p class="empty-message">商品を選択してください</p>';
  } else {
    currentCart.forEach((i) => {
      const r = document.createElement('div');
      r.className = 'cart-item';
      r.innerHTML = `<div><div class="cart-item-name"></div><div class="cart-item-detail"></div></div><div class="quantity-controls"><button class="quantity-button">−</button><span class="quantity"></span><button class="quantity-button">+</button></div>`;
      r.querySelector('.cart-item-name').textContent = i.name;
      r.querySelector('.cart-item-detail').textContent =
        `${yen(i.price)} × ${i.quantity} = ${yen(i.price * i.quantity)}`;
      r.querySelector('.quantity').textContent = i.quantity;
      r.querySelectorAll('.quantity-button')[0].onclick = () => changeQuantity(i.name, -1);
      r.querySelectorAll('.quantity-button')[1].onclick = () => changeQuantity(i.name, 1);
      cartList.appendChild(r);
    });
  }
  totalPrice.textContent = yen(getTotal());
  cartCount.textContent = currentCart.reduce((s, i) => s + i.quantity, 0) + '点';
  updateChange();
}

function updateChange() {
  const total = getTotal(),
    received = parseInt(cashReceived.value, 10);
  changeBox.classList.remove('ok', 'shortage', 'neutral');
  if (!Number.isFinite(received)) {
    changeLabel.textContent = 'お釣り';
    changeAmount.textContent = yen(0);
    changeBox.classList.add('neutral');
    return;
  }
  const c = received - total;
  if (c >= 0) {
    changeLabel.textContent = 'お釣り';
    changeAmount.textContent = yen(c);
    changeBox.classList.add('ok');
  } else {
    changeLabel.textContent = '不足';
    changeAmount.textContent = yen(Math.abs(c));
    changeBox.classList.add('shortage');
  }
}

function clearCart() {
  currentCart = [];
  cashReceived.value = '';
  renderCart();
}

function checkout() {
  if (!currentCart.length) return showMessage('商品が選択されていません');
  const total = getTotal(),
    received = parseInt(cashReceived.value, 10);
  if (!Number.isFinite(received) || received < total) return showMessage('受け取った現金が不足しています');
  if (totalPrice < 0) return showMessage('金額がマイナスです');

  const t = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    amount: total,
    received,
    change: received - total,
    items: currentCart.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
  };

  const ts = getTransactions();
  ts.push(t);
  saveTransactions(ts);
  showMessage('会計は完了しました');
  clearCart();
}

function formatDate(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d);
}

function renderHistory() {
  const ts = getTransactions();
  historyList.innerHTML = '';
  historyTotalSales.textContent = yen(ts.reduce((s, t) => s + Number(t.amount || 0), 0));
  if (!ts.length) {
    historyList.innerHTML = '<p class="empty-message">会計履歴はありません</p>';
    return;
  }
  [...ts].reverse().forEach((t) => {
    const x = document.createElement('div');
    x.className = 'history-item';
    x.innerHTML =
      '<div class="history-top"><span class="amount"></span><span class="history-date"></span></div><div class="history-detail"></div>';
    x.querySelector('.amount').textContent = yen(t.amount);
    x.querySelector('.history-date').textContent = formatDate(t.timestamp);
    x.querySelector('.history-detail').textContent =
      `${(t.items || []).map((i) => `${i.name} ×${i.quantity}`).join('、')}｜受取 ${yen(t.received)}｜お釣り ${yen(t.change)}`;
    historyList.appendChild(x);
  });
}

function exportCSV() {
  const ts = getTransactions();
  if (!ts.length) return showMessage('出力する履歴がありません');
  const rows = [
    ['日時', '金額', '受取金額', 'お釣り', '内訳'],
    ...ts.map((t) => [
      formatDate(t.timestamp),
      t.amount,
      t.received,
      t.change,
      (t.items || []).map((i) => `${i.name} x ${i.quantity}`).join(' / ')
    ])
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `QMCレジ_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');

      if (lines.length <= 1) {
        return showMessage('インポートできるデータがありません');
      }

      const currentTransactions = getTransactions();
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        const cleanRow = row.map((cell) => cell.replace(/^"|"$/g, '').replaceAll('""', '"').trim());

        if (cleanRow.length < 5) continue;

        const [dateStr, amountStr, receivedStr, changeStr, itemsStr] = cleanRow;

        const items = itemsStr.split(' / ').map((itemText) => {
          const parts = itemText.split(' x ');
          const name = parts[0] || '不明な商品';
          const quantity = parseInt(parts[1], 10) || 1;

          const matchedProduct = PRODUCTS.find((p) => p.name === name);
          const price = matchedProduct ? matchedProduct.price : 0;

          return { name, price, quantity };
        });

        let timestamp = new Date().toISOString();
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          timestamp = parsedDate.toISOString();
        }

        const newTransaction = {
          id: `imported-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: timestamp,
          amount: parseInt(amountStr, 10) || 0,
          received: parseInt(receivedStr, 10) || 0,
          change: parseInt(changeStr, 10) || 0,
          items: items
        };

        currentTransactions.push(newTransaction);
        importedCount++;
      }

      if (importedCount > 0) {
        saveTransactions(currentTransactions);
        renderHistory();
        showMessage(`${importedCount}件の履歴を取り込みました`);
      } else {
        showMessage('有効なデータが見つかりませんでした');
      }
    } catch (err) {
      console.error(err);
      showMessage('CSVファイルの解析に失敗しました');
    } finally {
      importFileInput.value = '';
    }
  };

  reader.readAsText(file, 'UTF-8');
}

function clearHistory() {
  if (!getTransactions().length) return showMessage('削除する履歴がありません');
  if (confirm('会計履歴をすべて削除します。\nこの操作は元に戻せません。')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showMessage('会計履歴を削除しました');
  }
}

$('historyButton').onclick = () => {
  renderHistory();
  historyDialog.showModal();
};
$('closeHistoryButton').onclick = () => historyDialog.close();
$('clearHistoryButton').onclick = clearHistory;
$('exportButton').onclick = exportCSV;
importButton.onclick = () => importFileInput.click();
importFileInput.onchange = importCSV;
$('clearCartButton').onclick = clearCart;
$('checkoutButton').onclick = checkout;
cashReceived.oninput = updateChange;

renderProducts();
renderCart();

if ('serviceWorker' in navigator && window.isSecureContext) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.error));
}
