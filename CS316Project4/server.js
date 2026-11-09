const http = require('http');
const fs = require('fs');

const port = process.env.PORT || 3000;
const accountsFile = 'accounts.json';
let sessions = {}; // Login sessions last until the server restarts.

function accounts() {
    return JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
}

function send(res, status, data) {
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(data));
}

function getUser(req) {
    let cookie = req.headers.cookie || '';
    let token = '';
    for (let part of cookie.split(';')) {
        if (part.trim().startsWith('session=')) {
            token = part.trim().substring(8);
        }
    }
    return sessions[token];
}

function accountFile(id) {
    return 'account_' + id + '.json';
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 100000) req.destroy();
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (error) { reject(error); }
        });
        req.on('error', reject);
    });
}

http.createServer(async function(req, res) {
    let url = req.url.split('?')[0];

    try {
        if (req.method === 'POST' && url === '/api/create') {
            let input = await readBody(req);
            let username = String(input.username || '').trim();
            let password = String(input.password || '');
            if (!username || !password) return send(res, 400, {error: 'Enter a username and password.'});
            let list = accounts();
            for (let item of list) {
                if (item.username === username) return send(res, 400, {error: 'Username already exists.'});
            }
            // A sequential ID keeps the project simple and does not reuse deleted IDs.
            let id = String(list.length + 1);
            let filename = accountFile(id);
            let newAccount = {id: id, username: username, password: password, file: filename};
            let form = {id: id, username: username, password: password, answers: null};
            fs.writeFileSync(accountFile(id), JSON.stringify(form, null, 2));
            list.push(newAccount);
            fs.writeFileSync(accountsFile, JSON.stringify(list, null, 2));
            return send(res, 200, {message: 'Account created! Your ID is ' + id + '.'});
        }

        if (req.method === 'POST' && url === '/api/login') {
            let input = await readBody(req);
            let list = accounts();
            for (let item of list) {
                if (item.username === input.username && item.password === input.password) {
                    let token = String(Math.random()).substring(2) + String(Math.random()).substring(2);
                    sessions[token] = item.id;
                    res.setHeader('Set-Cookie', 'session=' + token + '; HttpOnly; SameSite=Lax; Path=/');
                    return send(res, 200, {message: 'Logged in'});
                }
            }
            return send(res, 401, {error: 'Incorrect username or password.'});
        }

        if (req.method === 'POST' && url === '/api/logout') {
            let cookie = req.headers.cookie || '';
            for (let part of cookie.split(';')) {
                if (part.trim().startsWith('session=')) delete sessions[part.trim().substring(8)];
            }
            res.setHeader('Set-Cookie', 'session=; Max-Age=0; Path=/');
            return send(res, 200, {message: 'Logged out'});
        }

        if (url === '/api/my-form') {
            let id = getUser(req);
            if (!id) return send(res, 401, {error: 'Please log in first.'});
            let filename = accountFile(id);
            let form = JSON.parse(fs.readFileSync(filename, 'utf8'));
            if (req.method === 'GET') return send(res, 200, form);
            if (req.method === 'POST') {
                let input = await readBody(req);
                form.answers = {
                    name: String(input.name || ''),
                    favoriteGame: String(input.favoriteGame || ''),
                    platform: String(input.platform || ''),
                    playTime: String(input.playTime || ''),
                    comments: String(input.comments || '')
                };
                fs.writeFileSync(filename, JSON.stringify(form, null, 2));
                return send(res, 200, {message: 'Survey saved!'});
            }
        }

        if (req.method === 'GET' && url === '/api/records') {
            let result = [];
            for (let item of accounts()) {
                let form = JSON.parse(fs.readFileSync(accountFile(item.id), 'utf8'));
                result.push({id: item.id, answers: form.answers});
            }
            return send(res, 200, result);
        }

        if (req.method !== 'GET') return send(res, 404, {error: 'Not found'});
        if (url === '/') url = '/index.html';
        // Serve only the website files, never accounts.json or account data.
        let allowed = ['index.html', 'create.html', 'records.html', 'form.html',
                       'style.css', 'script.js'];
        let name = url.substring(1);
        if (!allowed.includes(name)) return send(res, 404, {error: 'Not found'});
        let type = 'text/javascript';
        if (name.endsWith('.html')) type = 'text/html';
        if (name.endsWith('.css')) type = 'text/css';
        res.writeHead(200, {'Content-Type': type});
        res.end(fs.readFileSync('public/' + name));
    } catch (error) {
        if (error.code === 'ENOENT') return send(res, 404, {error: 'File not found'});
        send(res, 400, {error: 'Could not complete request.'});
    }
}).listen(port, function() {
    console.log('Server running at http://localhost:' + port);
});
