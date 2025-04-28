class LruCache {
    constructor(max = 256) {
      this.max = max;
      this.cache = new Map();
    }
  
    get(key) {
      let item = this.cache.get(key);
      if (this.cache.has(key)) {
        this.cache.delete(key);
        this.cache.set(key, item);
      }
      return item;
    }
  
    set(key, val) {
      this.cache.delete(key);
      if (this.cache.size === this.max) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, val);
    }
}

const clientCache = new LruCache()

async function execute_database_server_request(sqlite_query) {
    let cached_response = clientCache.get(sqlite_query)
    if (cached_response !== undefined) {
        console.log('Client Cache hit!', {sqlite_query})
        return cached_response
    }
    cached_response = JSON.parse(localStorage.getItem(sqlite_query))
    if (cached_response !== null) {
        console.log('Local Cache hit!', {sqlite_query})
        clientCache.set(sqlite_query, cached_response)
        return cached_response
    }

    let response = await fetch(window.databaseUrl, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"query": sqlite_query})
    })
    let responseBody = await response.json()
    try {
        clientCache.set(sqlite_query, responseBody)
        localStorage.setItem(sqlite_query, JSON.stringify(responseBody))
    } catch (e) {
        localStorage.clear()
        console.log("Local storage exceeded quota", { e })
    }
    return responseBody
}

(async () => {
    
})();

//window.databaseUrl = "https://database.vulineage.com"
window.databaseUrl = "http://localhost:9631"
