let role = localStorage.getItem('role') || '';
let username = localStorage.getItem('username') || '';

let books = [];
let transactions = [];

// Pastikan selalu ambil data terbaru tiap halaman dibuka
async function refreshLocalState() {
    const auth = window.storage?.getAuth ? window.storage.getAuth() : {};
    role = auth.role || localStorage.getItem('role') || '';
    username = auth.username || localStorage.getItem('username') || '';

    if (window.storage?.loadBooks) {
        books = await window.storage.loadBooks();
    } else {
        books = JSON.parse(localStorage.getItem('books')) || [];
    }

    if (window.storage?.loadTransactions) {
        transactions = await window.storage.loadTransactions();
    } else {
        transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    }

    localStorage.setItem('books', JSON.stringify(books));
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

window.onload = async function() {

    // theme init
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    const thumb = document.getElementById('themeThumb');
    if (thumb) thumb.classList.toggle('thumb-light', savedTheme === 'light');

    // Login state
    const roleText =
        document.getElementById('userRole');


    if (roleText) {

        if (role === 'admin') {

            roleText.innerHTML = '<i class="fa-solid fa-crown"></i>';
            roleText.classList.add('admin-role');
            roleText.classList.remove('client-member');

            document
                .querySelectorAll('.admin-only')
                .forEach(el => {

                    el.style.display = 'block';

                });



        } else {

            roleText.innerHTML = '<i class="fa-solid fa-star"></i>';
            roleText.classList.add('client-member');
            roleText.classList.remove('admin-role');

            document
                .querySelectorAll('.admin-only')
                .forEach(el => {

                    el.style.display = 'none';

                });



            const memberPage = document.getElementById('member');
            if (memberPage) {
                const memberInfo = document.getElementById('memberInfo');
                if (memberInfo) memberInfo.innerHTML = `Anda masuk sebagai <i class="fa-solid fa-crown"></i> (${username}).`;
            }

        }

        const topbarUsername = document.getElementById('topbarUsername');
        if (topbarUsername) {
            topbarUsername.innerText = username ? `Hai, ${username}` : '';
        }

    }



    // Upload drag/drop
    setupUploadHandlers();

    // Sync state & render buku awal
    await refreshLocalState();
    renderBooks();
    renderTransactions();
    renderMemberProfile();
    await renderDashboardCharts();
    await updateSupabaseStatus();
    const borrowCount = document.getElementById('borrowCount');
    if (borrowCount) {
        borrowCount.innerText = transactions.length;
    }

}

async function updateSupabaseStatus() {
    const statusEl = document.getElementById('supabaseStatus');
    if (!statusEl) return;

    const config = window.SUPABASE_CONFIG || {};
    const isConfigured = config.url && config.anonKey &&
        config.url !== 'https://YOUR_PROJECT_REF.supabase.co' &&
        config.anonKey !== 'YOUR_ANON_KEY';

    if (!isConfigured) {
        statusEl.innerText = 'Supabase offline';
        statusEl.style.borderColor = '#ef4444';
        statusEl.style.color = '#f87171';
        return;
    }

    try {
        if (window.storage?.loadBooks) {
            await window.storage.loadBooks();
        }
        statusEl.innerText = 'Supabase aktif';
        statusEl.style.borderColor = '#22c55e';
        statusEl.style.color = '#86efac';
    } catch (error) {
        console.error('Supabase connection failed:', error);
        statusEl.innerText = 'Supabase error';
        statusEl.style.borderColor = '#f97316';
        statusEl.style.color = '#fb923c';
    }
}

async function renderDashboardCharts() {
    const userList = await loadUsers();
    const bookCount = books.length;
    const borrowedCount = transactions.length;
    const availableCount = books.reduce((sum, book) => sum + Math.max(0, book.stock), 0);
    const maxValue = Math.max(bookCount, borrowedCount, availableCount, 1);

    const setChart = (id, labelId, value, cssClass) => {
        const bar = document.getElementById(id);
        const label = document.getElementById(labelId);
        if (!bar || !label) return;
        bar.style.width = `${Math.round((value / maxValue) * 100)}%`;
        bar.className = `chart-bar-inner ${cssClass}`;
        label.innerText = value;
    };

    setChart('chartTotalBooks', 'chartTotalBooksLabel', bookCount, 'white');
    setChart('chartBorrowedBooks', 'chartBorrowedBooksLabel', borrowedCount, 'orange');
    setChart('chartAvailableBooks', 'chartAvailableBooksLabel', availableCount, 'green');

    const userCountEl = document.getElementById('userCount');
    if (userCountEl) {
        userCountEl.innerText = userList.length;
    }

    // render most popular books
    renderMostPopularBooks();
}

async function loadUsers() {
    if (window.storage?.loadUsers) {
        return await window.storage.loadUsers();
    }

    try {
        return JSON.parse(localStorage.getItem('users')) || [];
    } catch (error) {
        return [];
    }
}

function renderMemberProfile() {
    const memberUsername = document.getElementById('memberUsername');
    const memberRole = document.getElementById('memberRole');
    const memberHistory = document.getElementById('memberHistory');

    if (memberUsername) {
        memberUsername.innerText = username || '-';
    }
    if (memberRole) {
        memberRole.innerText = role || '-';
    }
    if (!memberHistory) return;

    const userTransactions = transactions.filter(trx => trx.borrower === username);
    memberHistory.innerHTML = userTransactions.length > 0 ?
        userTransactions.map(trx => `
            <tr>
                <td style="padding:10px;border-bottom:1px solid #334155;">${trx.title}</td>
                <td style="padding:10px;border-bottom:1px solid #334155;">${trx.status}</td>
                <td style="padding:10px;border-bottom:1px solid #334155;">${trx.date || '-'}</td>
            </tr>
        `).join('') :
        `<tr><td colspan="3" style="padding:10px;color:#94a3b8;">Belum ada riwayat peminjaman.</td></tr>`;
}

function changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value.trim();
    const newPassword = document.getElementById('newPassword')?.value.trim();
    const confirmPassword = document.getElementById('confirmPassword')?.value.trim();
    const passwordMessage = document.getElementById('passwordMessage');

    if (!currentPassword || !newPassword || !confirmPassword) {
        if (passwordMessage) passwordMessage.innerText = 'Lengkapi semua kolom password.';
        return;
    }

    if (newPassword.length < 6) {
        if (passwordMessage) passwordMessage.innerText = 'Password baru minimal 6 karakter.';
        return;
    }

    if (newPassword !== confirmPassword) {
        if (passwordMessage) passwordMessage.innerText = 'Password baru dan konfirmasi tidak cocok.';
        return;
    }

    getUsers().then(users => {
        const userIndex = users.findIndex(user => user.username === username);
        if (userIndex === -1) {
            if (passwordMessage) passwordMessage.innerText = 'Akun tidak ditemukan.';
            return;
        }

        const user = users[userIndex];
        if (user.password !== currentPassword) {
            if (passwordMessage) passwordMessage.innerText = 'Password saat ini salah.';
            return;
        }

        users[userIndex].password = newPassword;
        saveUsers(users).then(() => {
            if (passwordMessage) passwordMessage.innerText = 'Password berhasil diubah.';
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        }).catch(error => {
            console.error(error);
            if (passwordMessage) passwordMessage.innerText = 'Gagal menyimpan password.';
        });
    });
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
        root.style.setProperty('--app-bg', '#f1f5f9');
        root.style.setProperty('--app-fg', '#0f172a');
    } else {
        root.style.setProperty('--app-bg', '#0f172a');
        root.style.setProperty('--app-fg', '#ffffff');
    }
}



function logout() {
    // buka modal kustom. jika modal tidak tersedia, fallback ke confirm
    const modal = document.getElementById('logoutModal');
    if (!modal) {
        const ok = confirm('Yakin ingin logout?');
        if (!ok) return;
        performLogout();
        return;
    }
    modal.classList.remove('hidden');
}

function cancelLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('hidden');
}

function confirmLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) modal.classList.add('hidden');
    performLogout();
}

function performLogout() {
    if (window.storage?.clearAuth) {
        window.storage.clearAuth();
    } else {
        localStorage.removeItem('role');
        localStorage.removeItem('username');
    }
    window.location.href = 'index.html';
}

function showMemberPanel() {
    const memberPage = document.getElementById('member');
    if (!memberPage) return;

    // tampilkan halaman member (dan sembunyikan halaman lain)
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.add('hidden'));

    memberPage.classList.remove('hidden');


}











function persistBooks() {
    localStorage.setItem('books', JSON.stringify(books));
    if (window.storage?.saveBooks) {
        return window.storage.saveBooks(books);
    }
    return Promise.resolve(books);
}

function persistTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    if (window.storage?.saveTransactions) {
        return window.storage.saveTransactions(transactions);
    }
    return Promise.resolve(transactions);
}

function setupUploadHandlers() {

    const uploadBox =
        document.getElementById('uploadBox');

    const coverInput =
        document.getElementById('cover');

    const previewImage =
        document.getElementById('previewImage');

    if (!uploadBox || !coverInput) return;

    const setPreview = (file) => {

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {

            if (previewImage) {

                previewImage.src = e.target.result;
                previewImage.style.display = 'block';

            }

        };

        reader.readAsDataURL(file);

    };

    const preventDefaults = (e) => {

        e.preventDefault();
        e.stopPropagation();

    };

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {

        uploadBox.addEventListener(evt, (e) => {

            preventDefaults(e);

            if (evt === 'dragenter' || evt === 'dragover') {

                uploadBox.classList.add('drag-active');

            } else {

                uploadBox.classList.remove('drag-active');

            }

        });

    });

    uploadBox.addEventListener('drop', (e) => {

        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];

        if (!file) return;

        coverInput.files = dt.files;

        setPreview(file);

    });

    uploadBox.addEventListener('click', () => {

        coverInput.click();

    });

    coverInput.addEventListener('change', () => {

        const file = coverInput.files[0];
        setPreview(file);

    });

}

function addBook() {

    const titleInput =
        document.getElementById('title');

    const authorInput =
        document.getElementById('author');

    const stockInput =
        document.getElementById('stock');

    const coverInput =
        document.getElementById('cover');

    const ebookInput =
        document.getElementById('ebook');

    const uploadBox =
        document.getElementById('uploadBox');

    // Jika uploadBox/kontrol lain tidak ada, jangan buat input “mentok”.
    if (!titleInput || !authorInput || !stockInput || !coverInput) {
        console.warn('addBook: form element tidak ditemukan');
        return;
    }

    if (uploadBox && uploadBox.classList.contains('upload-disabled')) {
        return;
    }

    // reset preview jika pernah gagal
    const previewImage =
        document.getElementById('previewImage');
    if (previewImage) previewImage.style.display = 'none';


    const title =
        titleInput.value.trim();

    const author =
        authorInput.value.trim();

    const stock =
        stockInput.value.trim();

    const file =
        coverInput.files[0];

    // load ebook file (PDF/EPUB) jadi base64 agar bisa dibaca di iframe
    const ebookFile =
        ebookInput && ebookInput.files && ebookInput.files[0];

    const ebookType =
        ebookFile && ebookFile.name ?
        ebookFile.name.toLowerCase().endsWith('.pdf') ?
        'pdf' :
        'epub' :
        '';

    if (title === '' || author === '' || stock === '') {


        alert('Lengkapi data buku');

        return;

    }

    const reader = new FileReader();

    reader.onload = function(e) {

        const coverDataUrl = e.target.result;

        // baca ebook jika ada
        if (!ebookFile) {
            const book = {
                id: books.length + 1,
                title: title,
                author: author,
                stock: parseInt(stock),
                cover: coverDataUrl,
                ebook: '',
                ebookType: ''
            };

            books.push(book);
            persistBooks();
            renderBooks();
            clearForm();
            return;
        }

        const ebookReader = new FileReader();
        ebookReader.onload = function(ev) {
            const ebookDataUrl = ev.target.result;

            const book = {
                id: books.length + 1,
                title: title,
                author: author,
                stock: parseInt(stock),
                cover: coverDataUrl,
                ebook: ebookDataUrl,
                ebookType: ebookType
            };

            books.push(book);
            persistBooks();
            renderBooks();
            clearForm();
        };

        ebookReader.readAsDataURL(ebookFile);
    };

    if (file) {

        reader.readAsDataURL(file);

    } else {

        const book = {

            id: books.length + 1,
            title: title,
            author: author,
            stock: parseInt(stock),

            cover: ''

        };

        books.push(book);

        persistBooks();

        renderBooks();

        clearForm();

    }

}



function renderRightStripBooks() {

    const sideBookList =
        document.getElementById('sideBookList');

    if (!sideBookList) return;

    sideBookList.innerHTML = '';

    books.forEach((book, index) => {

        sideBookList.innerHTML += `

          <div class="side-book">

            <img src="${book.cover}" class="side-book-cover" onclick="handleBorrowFromList(${index})">

            <div class="side-book-info">

              <h3>${book.title}</h3>

              <p>${book.author}</p>

              <p class="side-book-stock">Stock: ${book.stock}</p>

              <button class="side-book-btn" onclick="handleBorrowFromList(${index})">Lihat</button>

            </div>

          </div>

        `;

    });

}

function renderBooks() {

    renderRightStripBooks();

    const bookList =
        document.getElementById('bookList');

    const sideBookList =
        document.getElementById('sideBookList');

    bookList.innerHTML = '';

    if (sideBookList) sideBookList.innerHTML = '';

    books.forEach((book, index) => {

                bookList.innerHTML += `

          <div class="product-card">

            <img src="${book.cover}" class="product-cover" />

            <div class="product-title">${book.title}</div>

            <div class="product-author">${book.author}</div>

            <div class="product-stock">Stock: ${book.stock}</div>

            <div class="product-actions">

              <button onclick="handleBorrowFromList(${index})">Pinjam</button>

              ${role === 'admin' ? `<button class="danger" onclick="deleteBook(${index})">Hapus</button>` : ''}

            </div>

          </div>

        `;

    });

    document.getElementById('totalBooks').innerText =
        books.length;

}

function deleteBook(index) {

    books.splice(index, 1);

    persistBooks();

    renderBooks();

}

function clearForm() {

    document.getElementById('title').value = '';

    document.getElementById('author').value = '';

    document.getElementById('stock').value = '';

    document.getElementById('title').focus();

}


function searchBook() {

    const keyword =
        (document.getElementById('search')?.value || '')
        .toLowerCase();

    const statusFilter =
        document.getElementById('statusFilter')?.value || 'all';

    const cards =
        document.querySelectorAll('#bookList .product-card');

    cards.forEach(card => {

        const text =
            card.innerText.toLowerCase();

        const matchesKeyword =
            text.includes(keyword);

        const stockText =
            card.querySelector('.product-stock')?.innerText || '';

        const stockValue =
            parseInt(stockText.replace(/[^0-9]/g, '')) || 0;

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'available' && stockValue > 0) ||
            (statusFilter === 'out' && stockValue <= 0);

        card.style.display =
            matchesKeyword && matchesStatus ?
            '' :
            'none';

    });

}

function borrowBook() {

    const borrower =
        document.getElementById('borrowName').value;

    const bookId =
        parseInt(
            document.getElementById('borrowBookId').value
        );

    const book =
        books.find(book => book.id === bookId);

    if (!book) {

        alert('Buku tidak ditemukan');
        return;

    }

    if (book.stock <= 0) {

        alert('Stock buku habis');
        return;

    }

    book.stock--;

    const transaction = {

        borrower: borrower,

        bookId: book.id,

        title: book.title,

        status: 'Dipinjam'

    };

    transactions.push(transaction);

    persistTransactions();

    renderBooks();

    renderTransactions();

    document.getElementById('borrowCount')
        .innerText = transactions.length;

}

function renderTransactions() {

    const borrowList =
        document.getElementById('borrowList');

    const returnList =
        document.getElementById('returnList');

    borrowList.innerHTML = '';
    returnList.innerHTML = '';

    transactions.forEach((trx, index) => {

        borrowList.innerHTML += `

      <tr>

        <td>${trx.borrower}</td>

        <td>${trx.title}</td>

        <td>${trx.status}</td>

        <td>
          <button onclick="openReaderForBorrow(${index})">Baca Sekarang</button>
        </td>

      </tr>

    `;

        returnList.innerHTML += `

      <tr>

        <td>${trx.borrower}</td>

        <td>${trx.title}</td>

        <td>${trx.status}</td>

        <td>

          <button onclick="returnBook(${index})">

            Kembalikan

          </button>

        </td>

      </tr>

    `;

    });

}

function returnBook(index) {

    const trx = transactions[index];

    const book =
        books.find(book => book.title === trx.title);

    if (book) {

        book.stock++;

    }

    transactions.splice(index, 1);

    persistTransactions();

    renderBooks();

    renderTransactions();

    document.getElementById('borrowCount')
        .innerText = transactions.length;

}

function handleBorrowFromList(index) {

    // Saat tombol Lihat/Pinjam diklik, popup menampilkan detail buku (jumlah pinjam tetap via borrowQty)


    const book = books[index];

    if (!book) return;

    document.getElementById('popupImage').src = book.cover;

    document.getElementById('popupTitle').innerText = book.title;

    document.getElementById('popupAuthor').innerText = book.author;

    document.getElementById('popupStock').innerText = `Stock: ${book.stock}`;

    const borrowQtyInput = document.getElementById('borrowQty');

    borrowQtyInput.max = book.stock;

    borrowQtyInput.value = 1;

    const popup = document.getElementById('popup');

    popup.classList.remove('hidden');

}

function confirmBorrow() {

    const qty = parseInt(document.getElementById('borrowQty').value);

    const popupTitle = document.getElementById('popupTitle').innerText;

    const book = books.find(b => b.title === popupTitle);

    if (!book) {

        closePopup();

        return;

    }

    if (!qty || qty < 1) {

        alert('Jumlah pinjam tidak valid');
        return;

    }

    if (book.stock < qty) {

        alert('Stock tidak cukup');
        return;

    }

    book.stock -= qty;

    const transaction = {
        borrower: document.getElementById('borrowName')?.value || 'User',
        bookId: book.id,
        title: book.title,
        status: `Dipinjam (${qty})`,
        date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    };

    transactions.push(transaction);

    persistBooks();

    persistTransactions();

    renderBooks();

    renderTransactions();

    closePopup();

    document.getElementById('borrowCount').innerText = transactions.length;

}

function closePopup() {

    document.getElementById('popup').classList.add('hidden');

}

function openReaderForBorrow(index) {

    const trx = transactions[index];
    if (!trx) return;

    const book = (trx.bookId !== undefined ? books.find(b => b.id === trx.bookId) : null) ||
        books.find(b => b.title === trx.title);
    if (!book) return;

    const wrap = document.getElementById('readerWrap');
    const titleEl = document.getElementById('readerTitle');
    const authorEl = document.getElementById('readerAuthor');
    const hint = document.getElementById('readerHint');
    const notice = document.getElementById('readerNotice');

    if (!wrap) return;

    titleEl && (titleEl.innerText = book.title || '-');
    authorEl && (authorEl.innerText = book.author || '');

    if (!book.ebook) {
        if (hint) hint.style.display = 'block';
        if (notice) notice.innerText = 'Buku ini belum memiliki file e-book.';
        wrap.style.display = 'block';
        return;
    }

    if (hint) hint.style.display = 'none';
    if (notice) {
        notice.innerText = book.ebookType === 'pdf'
            ? 'File PDF sedang dibuka di tab browser...'
            : 'File e-book sedang dibuka di tab browser...';
    }
    wrap.style.display = 'block';

    function openEbookUrl(url) {
        const readerWindow = window.open(
            url,
            '_blank',
            'width=1400,height=900,scrollbars=yes,resizable=yes'
        );

        if (!readerWindow) {
            alert('Popup diblokir. Silakan izinkan popup untuk membuka file e-book.');
        }
    }

    const readerActions = document.getElementById('readerActions');
    const readerEmbed = document.getElementById('readerEmbed');
    const readerIframe = document.getElementById('readerIframe');

    if (readerActions) {
        readerActions.innerHTML = '';
    }

    if (readerEmbed) {
        readerEmbed.style.display = 'none';
    }

    function openEbookUrl(url) {
        if (readerActions) {
            readerActions.innerHTML = `
                <button onclick="window.open('${url}', '_blank')" style="padding:10px 14px;border:none;border-radius:12px;background:#2563eb;color:white;cursor:pointer;">
                    Buka PDF di Tab Baru
                </button>
                <button onclick="downloadEbook('${url}')" style="padding:10px 14px;border:none;border-radius:12px;background:#14b8a6;color:white;cursor:pointer;">
                    Download PDF
                </button>
            `;
        }

        if (readerEmbed && readerIframe) {
            readerIframe.src = url;
            readerEmbed.style.display = 'block';
        }
    }

    if (book.ebookType === 'pdf' && book.ebook.startsWith('data:application/pdf')) {
        try {
            const parts = book.ebook.split(',');
            const contentType = parts[0].match(/data:(.*?);/)?.[1] || 'application/pdf';
            const base64 = parts[1] || '';
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);
            openEbookUrl(blobUrl);
        } catch (error) {
            console.error('Gagal membuat PDF dari data URL', error);
            openEbookUrl(book.ebook);
        }
    } else {
        openEbookUrl(book.ebook);
    }
}

function downloadEbook(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ebook.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function closeReader() {
    const wrap = document.getElementById('readerWrap');
    const hint = document.getElementById('readerHint');
    const notice = document.getElementById('readerNotice');
    if (hint) hint.style.display = 'none';
    if (notice) notice.innerText = 'File e-book akan dibuka di tab browser.';
    if (wrap) wrap.style.display = 'none';
}

function showPage(pageId) {

    const pages =
        document.querySelectorAll('.page');

    pages.forEach(page => {

        page.classList.add('hidden');

    });

    document
        .getElementById(pageId)
        .classList.remove('hidden');

}

function renderMostPopularBooks() {
    const listEl = document.getElementById('popularList');
    if (!listEl) return;

    // count transactions per book title
    const counts = {};
    transactions.forEach(t => {
        const key = t.title || (t.bookId && (books.find(b => b.id === t.bookId) || {}).title) || 'Unknown';
        counts[key] = (counts[key] || 0) + 1;
    });

    const items = Object.keys(counts).map(title => ({ title, count: counts[title] }));
    // include books with zero as optional (to show more entries)
    books.forEach(b => {
        if (!counts[b.title]) items.push({ title: b.title, count: 0 });
    });

    items.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    const top = items.slice(0, 5);
    const max = top.length > 0 ? Math.max(...top.map(i => i.count)) : 1;

    listEl.innerHTML = top.map((it, idx) => `
        <div class="popular-item">
            <div class="popular-rank">${idx+1}</div>
            <div class="popular-title">${it.title}</div>
            <div class="popular-bar"><div class="popular-bar-inner" style="width:${max?Math.round((it.count/max)*100):0}%"></div></div>
            <div class="popular-count">${it.count}</div>
        </div>
    `).join('');
}