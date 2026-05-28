
  const nextPath = "";

  function showRegister(event) {
    event.preventDefault();
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('register-modal').style.display = 'flex';
  }

  function hideRegister(event) {
    if (event) event.preventDefault();
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('register-modal').style.display = 'none';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('register-modal').style.display === 'flex') {
      hideRegister();
    }
  });

  document.getElementById('register-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('register-modal')) {
      hideRegister();
    }
  });

  function getSafeNextPath() {
    if (!nextPath || typeof nextPath !== 'string') return '';
    if (!nextPath.startsWith('/') || nextPath.startsWith('//')) return '';
    return nextPath;
  }

  function handleLogin(event) {
    event.preventDefault();
    const form = document.getElementById('login-form');
    const email = form.email.value;
    const password = form.password.value;
    
    fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    .then(r => {
      if (!r.ok) throw new Error('Login failed');
      return r.json();
    })
    .then(data => {
      const returnPath = getSafeNextPath();
      if (returnPath) {
        window.location.href = returnPath;
        return;
      }

      if (data.role === 'admin') {
        window.location.href = '/admin';
      } else if (data.role === 'student') {
        window.location.href = '/dashboard';
      } else {
        alert('Login successful, but role not determined.');
        window.location.href = '/';
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      alert('Invalid email or password. Please try again.');
    });
  }

  function handleRegister(event) {
    event.preventDefault();
    const form = document.getElementById('register-form');
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirm = form.confirm.value;
    
    if (password !== confirm) {
      alert('Passwords do not match.');
      return;
    }
    
    fetch('/api/students/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
      headers: { 'Content-Type': 'application/json' },
    })
    .then(r => {
      if (!r.ok) throw new Error('Registration failed');
      return r.json();
    })
    .then(data => {
      alert('Registration successful! Please log in with your credentials.');
      document.getElementById('register-form').reset();
      hideRegister();
      document.getElementById('login-form').email.focus();
    })
    .catch(err => {
      console.error('Registration error:', err);
      alert('Registration failed. Email may already be registered.');
    });
  }

