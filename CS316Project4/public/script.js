// JavaScript for the four pages

if (document.getElementById("login")) {
let username = document.getElementById('username');
let password = document.getElementById('password');
let remember = document.getElementById('remember');
let message = document.getElementById('message');

remember.checked = localStorage.getItem('remember') === 'yes';
if (remember.checked) username.value = localStorage.getItem('username') || '';

remember.addEventListener('change', function() {
    localStorage.setItem('remember', remember.checked ? 'yes' : 'no');
    if (!remember.checked) localStorage.removeItem('username');
    else localStorage.setItem('username', username.value);
});
username.addEventListener('input', function() {
    if (remember.checked) localStorage.setItem('username', username.value);
});

document.getElementById('login').addEventListener('click', async function() {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: username.value, password: password.value})
    });
    const data = await response.json();
    if (response.ok) {
        if (remember.checked) localStorage.setItem('username', username.value);
        window.location.href = 'form.html';
    } else {
        message.textContent = data.error;
        alert(data.error);
    }
});

}

if (document.getElementById("create")) {
document.getElementById('create').addEventListener('click', async function() {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;
    if (!username.trim() || !password) {
        alert('Enter a username and password.');
        return;
    }
    const response = await fetch('/api/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: username, password: password})
    });
    const data = await response.json();
    const message = document.getElementById('message');
    message.textContent = data.message || data.error;
    if (response.ok) {
        const link = document.createElement('a');
        link.href = 'index.html';
        link.textContent = 'Go to Login';
        message.appendChild(document.createTextNode(' '));
        message.appendChild(link);
    } else alert(data.error);
});

}

if (document.getElementById("tableBody")) {
let records = [];
let select = document.getElementById('account');
let tableBody = document.getElementById('tableBody');

function addRow(question, answer) {
    const row = document.createElement('tr');
    const heading = document.createElement('td');
    const value = document.createElement('td');
    heading.textContent = question;
    value.textContent = answer === '' || answer == null ? 'Not answered' : answer;
    row.appendChild(heading);
    row.appendChild(value);
    tableBody.appendChild(row);
}

select.addEventListener('change', function() {
    tableBody.textContent = '';
    const record = records.find(item => item.id === select.value);
    if (!record) {
        addRow('Status', 'Choose an account');
        return;
    }
    const answers = record.answers || {};
    addRow('Account ID', record.id);
    addRow('Favorite game', answers.name);
    addRow('Game type', answers.favoriteGame);
    addRow('Platform', answers.platform);
    addRow('Hours per week', answers.playTime);
    addRow('Why they enjoy gaming', answers.comments);
});

async function loadRecords() {
    const response = await fetch('/api/records');
    records = await response.json();
    for (let record of records) {
        const option = document.createElement('option');
        option.value = record.id;
        option.textContent = record.id;
        select.appendChild(option);
    }
}
loadRecords();

}

if (document.getElementById("survey")) {
let nameBox = document.getElementById('name');
let platform = document.getElementById('platform');
let playTime = document.getElementById('playTime');
let comments = document.getElementById('comments');
let message = document.getElementById('message');

async function loadForm() {
    const response = await fetch('/api/my-form');
    if (!response.ok) {
        window.location.href = 'index.html';
        return;
    }
    const data = await response.json();
    if (data.answers) {
        nameBox.value = data.answers.name;
        platform.value = data.answers.platform;
        playTime.value = data.answers.playTime;
        comments.value = data.answers.comments;
        const radios = document.getElementsByName('favoriteGame');
        for (let radio of radios) radio.checked = radio.value === data.answers.favoriteGame;
    }
}

document.getElementById('survey').addEventListener('submit', async function(event) {
    event.preventDefault();
    let favoriteGame = '';
    for (let radio of document.getElementsByName('favoriteGame')) {
        if (radio.checked) favoriteGame = radio.value;
    }
    const answers = {
        name: nameBox.value,
        favoriteGame: favoriteGame,
        platform: platform.value,
        playTime: playTime.value,
        comments: comments.value
    };
    const response = await fetch('/api/my-form', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(answers)
    });
    const data = await response.json();
    message.textContent = data.message || data.error;
});

document.getElementById('logout').addEventListener('click', async function() {
    await fetch('/api/logout', {method: 'POST'});
    window.location.href = 'index.html';
});
loadForm();

}
