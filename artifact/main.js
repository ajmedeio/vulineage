async function execute_database_server_request(sqlite_query) {
    let response = await fetch('https://database.vulineage.com', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"query": sqlite_query})
    })
    return response.json()
}

(async () => {
    
})();
