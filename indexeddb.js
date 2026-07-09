// Minimal IndexedDB helper for storing file blobs (covers and ebooks)
(function () {
    const DB_NAME = 'perpus-files';
    const DB_VERSION = 1;
    let dbPromise = null;

    function openDB() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function (ev) {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains('covers')) db.createObjectStore('covers');
                if (!db.objectStoreNames.contains('ebooks')) db.createObjectStore('ebooks');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }

    async function putFile(storeName, key, blob) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const r = store.put(blob, String(key));
            r.onsuccess = () => resolve(true);
            r.onerror = () => reject(r.error);
        });
    }

    async function getFile(storeName, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const r = store.get(String(key));
            r.onsuccess = () => resolve(r.result || null);
            r.onerror = () => reject(r.error);
        });
    }

    async function deleteFile(storeName, key) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const r = store.delete(String(key));
            r.onsuccess = () => resolve(true);
            r.onerror = () => reject(r.error);
        });
    }

    window.fileDB = {
        putCover: (id, blob) => putFile('covers', id, blob),
        getCover: (id) => getFile('covers', id),
        deleteCover: (id) => deleteFile('covers', id),
        putEbook: (id, blob) => putFile('ebooks', id, blob),
        getEbook: (id) => getFile('ebooks', id),
        deleteEbook: (id) => deleteFile('ebooks', id),
        ready: openDB
    };
})();
