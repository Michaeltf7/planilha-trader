/**
 * DB.js - Wrapper para IndexedDB para substituir o localStorage
 * Permite armazenamento de grandes volumes de dados (como imagens base64)
 */

const DB = {
    dbName: 'TraderDB',
    dbVersion: 1,
    storeName: 'traderData',
    _db: null,

    /**
     * Inicializa a conexão com o banco de dados
     */
    init() {
        return new Promise((resolve, reject) => {
            if (this._db) return resolve(this._db);

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("Erro ao abrir IndexedDB:", event.target.error);
                reject("Erro ao abrir banco de dados");
            };

            request.onsuccess = (event) => {
                this._db = event.target.result;
                resolve(this._db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    },

    /**
     * Salva um valor no banco de dados
     * @param {string} key 
     * @param {any} value 
     */
    async set(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.put(value, key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Recupera um valor do banco de dados
     * @param {string} key 
     */
    async get(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Remove um valor do banco de dados
     * @param {string} key 
     */
    async delete(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Limpa todo o banco de dados
     */
    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    /**
     * Recupera todas as chaves e valores para Backup
     */
    async getAll() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this._db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            const keysRequest = store.getAllKeys();

            request.onsuccess = () => {
                const values = request.result;
                keysRequest.onsuccess = () => {
                    const keys = keysRequest.result;
                    const result = {};
                    keys.forEach((key, i) => {
                        result[key] = values[i];
                    });
                    resolve(result);
                };
            };
            request.onerror = () => reject(request.error);
        });
    }
};
