const PRODUCTS = [
  { name: '大人', price: 600 },
  { name: '小学生以下', price: 400 },
  { name: '三歳以下', price: 0 },
  { name: 'ビラ持参orSNSフォロー', price: -100 },
  { name: '小学生以下の付き添いの大人', price: -100 }
];

function yen(n) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
}

const STORAGE_KEY = 'qmc_register_transactions_v1';
let currentCart = [];

// サーバーからデータを保持しておく変数
let transactionsCache = [];

// サーバーから最新データを非同期で取得する関数
async function fetchTransactions() {
  try {
    const res = await fetch('/api/transactions');
    if (res.ok) {
      transactionsCache = await res.json();
    }
  } catch (err) {
    console.error('データの取得に失敗しました', err);
  }
  return transactionsCache;
}

// 従来の関数名を変えずに、中身をキャッシュを返すようにする
function getTransactions() {
  return transactionsCache;
}


const $ = (id) => document.getElementById(id);

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
      r.querySelector('.cart-item-detail').textContent = `${yen(i.price)} × ${i.quantity} = ${yen(i.price * i.quantity)}`;
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

async function checkout() {
  if (!currentCart.length) return showMessage('商品が選択されていません');
  const total = getTotal(),
    received = parseInt(cashReceived.value, 10);
  if (!Number.isFinite(received) || received < total) return showMessage('受け取った現金が不足しています');
  const hasNormalProduct = currentCart.some((product) => product.price >= 0);

  if (!hasNormalProduct) return showMessage('通常商品を選択してください');

const t = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    amount: total,
    received,
    change: received - total,
    items: currentCart.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity }))
  };

  try {
    // サーバーへデータを送信する
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t)
    });

    if (res.ok) {
      await fetchTransactions(); // キャッシュを最新に更新
      showMessage('会計は完了しました');
      clearCart();
    } else {
      showMessage('会計の保存に失敗しました');
    }
  } catch (err) {
    console.error(err);
    showMessage('サーバー通信エラー');
  }
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
  const totalGroup = ts.length;
  const totalPeople = ts.reduce((sum, transaction) => {
    const People = (transaction.items || []).reduce((Peoplesum, item) => {
      if (item.name !== 'ビラ持参orSNSフォロー'&& item.name !== '小学生以下の付き添いの大人') {
        return Peoplesum + item.quantity;
      }
      return Peoplesum;
    }, 0);

    return sum + People;
  }, 0);
  historyTotalPeople.textContent = totalPeople + '人';
  historyTotalGroups.textContent = totalGroup + '団体';

  historyList.innerHTML = '';
  historyTotalSales.textContent = yen(ts.reduce((s, t) => s + Number(t.amount || 0), 0));
  if (!ts.length) {
    historyList.innerHTML = '<p class="empty-message">会計履歴はありません</p>';
    return;
  }
  [...ts].reverse().forEach((t) => {
    const x = document.createElement('div');
    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = `
  <svg viewBox="0 0 24 24" width="22" height="22">
    <path
      d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9zm4 2v8h2v-8h-2zm4 0v8h2v-8h-2z"
      fill="currentColor"
    />
  </svg>
`;

// async を追加
    deleteButton.onclick = async () => {
      if (confirm('この会計履歴を削除しますか？')) {
        try {
          // サーバーに削除を依頼
          const res = await fetch(`/api/transactions/${t.id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            await fetchTransactions();
            renderHistory();
            showMessage('履歴を削除しました');
          } else {
            showMessage('削除に失敗しました');
          }
        } catch (err) {
          console.error(err);
          showMessage('サーバー通信エラー');
        }
      }
    };

    x.className = 'history-item';
    x.innerHTML =
      '<div class="history-content"><div class="history-top"><span class="amount"></span><span class="history-date"></span></div><div class="history-detail"></div></div>';
    x.querySelector('.amount').textContent = yen(t.amount);
    x.querySelector('.history-date').textContent = formatDate(t.timestamp);
    x.querySelector('.history-detail').textContent =
      `${(t.items || []).map((i) => `${i.name} ×${i.quantity}`).join('、')}｜受取 ${yen(t.received)}｜お釣り ${yen(t.change)}`;
    historyList.appendChild(x);
    x.appendChild(deleteButton);
    deleteButton.className = 'delete-button';
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

// async を追加
async function clearHistory() {
  if (!transactionsCache.length) return showMessage('削除する履歴がありません');
  if (confirm('会計履歴をすべて削除します。\nこの操作は元に戻せません。')) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchTransactions();
        renderHistory();
        showMessage('会計履歴を削除しました');
      } else {
        showMessage('削除に失敗しました');
      }
    } catch (err) {
      console.error(err);
      showMessage('サーバー通信エラー');
    }
  }
}

// async と await を追加
$('historyButton').onclick = async () => {
  await fetchTransactions(); // 開く前にサーバーから最新を取得
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
