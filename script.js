const CONFIG = {
    owner: 'daifermoreno3-beep',
    repo: 'contrese-as.com'
};

let token = localStorage.getItem('gh_token');
let user = localStorage.getItem('logged_user');

if (token && user) showApp();

function toggleAuthMode() {
    const t = document.getElementById('auth-title');
    t.innerText = t.innerText === 'Bienvenido' ? 'Crear Cuenta' : 'Bienvenido';
}

async function processAuth() {
    const u = document.getElementById('auth-user').value;
    const p = document.getElementById('auth-pass').value;
    const t = document.getElementById('auth-token').value;
    const isLogin = document.getElementById('auth-title').innerText === 'Bienvenido';

    const activeToken = t || token;
    if (!activeToken || !u || !p) return alert("Faltan datos");

    try {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/users.json`, {
            headers: { 'Authorization': `token ${activeToken}` }
        });
        
        let users = []; let sha = null;
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
            users = JSON.parse(atob(data.content));
        }

        if (isLogin) {
            if (users.find(x => x.u === u && x.p === p)) {
                localStorage.setItem('gh_token', activeToken);
                localStorage.setItem('logged_user', u);
                location.reload();
            } else alert("Datos incorrectos");
        } else {
            users.push({u, p});
            await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/users.json`, {
                method: 'PUT',
                headers: { 'Authorization': `token ${activeToken}` },
                body: JSON.stringify({ message: "reg", content: btoa(JSON.stringify(users)), sha })
            });
            alert("Cuenta creada, ahora inicia sesión");
            location.reload();
        }
    } catch (e) { alert("Error de conexión o Token inválido"); }
}

function showApp() {
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    loadFiles();
}

async function uploadFile() {
    const file = document.getElementById('file-input').files[0];
    const alias = document.getElementById('file-alias').value;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        const content = reader.result.split(',')[1];
        const fileName = Date.now() + "_" + file.name.replace(/\s+/g, '_');
        
        const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/uploads/${fileName}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${localStorage.getItem('gh_token')}` },
            body: JSON.stringify({ message: "upload", content })
        });

        if (res.ok) {
            await updateDB({ id: fileName, u: user, name: alias || file.name, type: file.type, date: new Date().toLocaleDateString() });
            alert("Subido!");
            showTab('files');
        }
    };
    reader.readAsDataURL(file);
}

async function updateDB(entry) {
    const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/db.json`, {
        headers: { 'Authorization': `token ${localStorage.getItem('gh_token')}` }
    });
    const data = await res.json();
    const db = JSON.parse(atob(data.content));
    db.push(entry);
    await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/db.json`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${localStorage.getItem('gh_token')}` },
        body: JSON.stringify({ message: "db", content: btoa(JSON.stringify(db)), sha: data.sha })
    });
}

async function loadFiles() {
    const list = document.getElementById('file-list');
    const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/db.json`, {
        headers: { 'Authorization': `token ${localStorage.getItem('gh_token')}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const db = JSON.parse(atob(data.content));
    const myFiles = db.filter(x => x.u === user);
    
    list.innerHTML = myFiles.map(f => `
        <div class="file-item">
            <strong>${f.name}</strong><br>
            <small>${f.date}</small>
            <div style="margin-top:10px">
                <button class="btn btn-ghost" onclick="preview('${f.id}','${f.type}')">Ver</button>
            </div>
        </div>
    `).join('');
}

function preview(id, type) {
    const url = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/uploads/${id}`;
    const body = document.getElementById('preview-body');
    document.getElementById('modal').style.display = 'flex';
    body.innerHTML = type.includes('image') ? `<img src="${url}">` : `<iframe src="${url}" height="400"></iframe>`;
}

function closePreview() { document.getElementById('modal').style.display = 'none'; }
function showTab(t) { 
    document.querySelectorAll('.tab-content').forEach(x => x.classList.add('hidden'));
    document.getElementById('tab-'+t).classList.remove('hidden');
}
function logout() { localStorage.clear(); location.reload(); }