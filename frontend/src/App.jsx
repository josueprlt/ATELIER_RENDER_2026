import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  Activity, 
  Terminal, 
  Send, 
  RefreshCw, 
  Sliders, 
  Globe, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  PlusCircle, 
  User, 
  Code,
  ArrowUpRight
} from 'lucide-react';

function App() {
  // Configurable API URL with LocalStorage fallback
  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('render_api_url');
    if (saved) return saved;
    // Auto-detection based on host
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:10000';
    }
    // Return empty for production so it uses relative path, 
    // or placeholder that user can override
    return '';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);

  // App States
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, connected, error
  const [dbStatus, setDbStatus] = useState({ status: 'checking', dialect: '', database: '', host: '', error: '' });
  const [appInfo, setAppInfo] = useState({ app: '', student: '', version: '' });
  const [envInfo, setEnvInfo] = useState({ env: '' });
  const [messages, setMessages] = useState([]);
  
  // Form States
  const [formName, setFormName] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [dbInitMessage, setDbInitMessage] = useState('');

  // Fetch all info from the API
  const fetchAllData = async (urlToUse = apiUrl) => {
    setBackendStatus('checking');
    setDbStatus(prev => ({ ...prev, status: 'checking' }));
    
    // Normaliser l'URL (enlever le slash final)
    const base = urlToUse.replace(/\/$/, '');

    try {
      // 1. Health check / Info
      const infoRes = await fetch(`${base}/info`).catch(e => { throw e; });
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        setAppInfo(infoData);
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }

      // 2. Env check
      const envRes = await fetch(`${base}/env`).catch(() => null);
      if (envRes && envRes.ok) {
        const envData = await envRes.json();
        setEnvInfo(envData);
      }

      // 3. Database status
      const dbRes = await fetch(`${base}/api/status`).catch(() => null);
      if (dbRes) {
        const dbData = await dbRes.json();
        if (dbRes.ok) {
          setDbStatus({
            status: dbData.status,
            dialect: dbData.dialect || 'unknown',
            database: dbData.database || 'unknown',
            host: dbData.host || 'unknown',
            error: ''
          });
        } else {
          setDbStatus({
            status: 'disconnected',
            dialect: dbData.dialect || 'unknown',
            database: '',
            host: '',
            error: dbData.error || 'Erreur de connexion'
          });
        }
      } else {
        setDbStatus(prev => ({ ...prev, status: 'disconnected', error: 'Impossible de joindre /api/status' }));
      }

      // 4. Load messages
      const msgRes = await fetch(`${base}/api/messages`).catch(() => null);
      if (msgRes && msgRes.ok) {
        const msgData = await msgRes.json();
        if (Array.isArray(msgData)) {
          setMessages(msgData);
        } else if (msgData.status === 'error') {
          // Table non initialisée par exemple
          setMessages([]);
          setDbInitMessage(msgData.message);
        }
      }

    } catch (error) {
      console.error("API Fetch Error:", error);
      setBackendStatus('error');
      setDbStatus({ status: 'disconnected', dialect: '', database: '', host: '', error: 'Serveur injoignable' });
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [apiUrl]);

  // Handle API URL save
  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('render_api_url', tempApiUrl);
    setApiUrl(tempApiUrl);
    setShowSettings(false);
  };

  // Submit Feedback Message
  const handleSubmitMessage = async (e) => {
    e.preventDefault();
    if (!formName || !formMessage) {
      setFormError('Veuillez remplir tous les champs.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    const base = apiUrl.replace(/\/$/, '');

    try {
      const res = await fetch(`${base}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: formName, message: formMessage })
      });

      const data = await res.json();

      if (res.ok) {
        setFormSuccess(true);
        setFormName('');
        setFormMessage('');
        // Reload messages
        fetchAllData();
      } else {
        setFormError(data.message || "Une erreur est survenue lors de l'envoi.");
      }
    } catch (error) {
      setFormError("Impossible de se connecter à l'API pour envoyer le message.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Database
  const handleInitDb = async () => {
    setIsInitializing(true);
    setDbInitMessage('');
    const base = apiUrl.replace(/\/$/, '');

    try {
      const res = await fetch(`${base}/api/init-db`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (res.ok) {
        setDbInitMessage("Succès: " + data.message);
        fetchAllData();
      } else {
        setDbInitMessage("Erreur: " + data.message);
      }
    } catch (error) {
      setDbInitMessage("Erreur: Impossible de contacter le serveur d'initialisation.");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Background Blobs */}
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>

      {/* Header */}
      <header className="app-header">
        <div className="app-badge">
          <Activity size={14} className="dot connected" />
          <span>Atelier Render 2026</span>
        </div>
        <h1 className="app-title">DevPortal Engine</h1>
        <p className="app-subtitle">
          Une architecture DevOps industrielle complète déployée sur le cloud Render avec GitHub Actions et Terraform.
        </p>

        {/* API Settings toggle */}
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} />
            <span>Config Backend API</span>
          </button>
        </div>

        {/* API Configuration Panel */}
        {showSettings && (
          <div className="panel" style={{ maxWidth: '500px', margin: '1.5rem auto 0 auto', textAlign: 'left' }}>
            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} />
              <span>Adresse de l'API Flask</span>
            </h4>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label className="form-label">URL Backend Flask (Render ou Local) :</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={tempApiUrl} 
                  onChange={(e) => setTempApiUrl(e.target.value)}
                  placeholder="https://flask-render-iac-username.onrender.com"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block' }}>
                  Par défaut : <strong>http://localhost:10000</strong> en local. 
                  En production, saisissez l'URL de votre Web Service Flask générée par Render.
                </small>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Stats / Status Grid */}
      <section className="dashboard-grid">
        {/* Card 1: API Server Status */}
        <div className="stat-card">
          <div className="card-header-row">
            <span className="stat-label">Serveur Flask</span>
            <div className="icon-wrapper">
              <Server size={20} />
            </div>
          </div>
          <div className="stat-value">
            <span className="status-indicator">
              <span className={`dot ${backendStatus === 'connected' ? 'connected' : backendStatus === 'checking' ? 'unknown' : 'disconnected'}`}></span>
              {backendStatus === 'connected' ? 'En ligne' : backendStatus === 'checking' ? 'Vérification...' : 'Hors ligne'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {apiUrl ? apiUrl : 'URL relative (Production)'}
          </div>
        </div>

        {/* Card 2: Database Connection */}
        <div className="stat-card">
          <div className="card-header-row">
            <span className="stat-label">Base PostgreSQL</span>
            <div className="icon-wrapper">
              <Database size={20} />
            </div>
          </div>
          <div className="stat-value">
            <span className="status-indicator">
              <span className={`dot ${dbStatus.status === 'connected' ? 'connected' : dbStatus.status === 'checking' ? 'unknown' : 'disconnected'}`}></span>
              {dbStatus.status === 'connected' ? 'Connectée' : dbStatus.status === 'checking' ? 'Vérification...' : 'Déconnectée'}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Moteur : <strong style={{ color: 'var(--text-primary)' }}>{dbStatus.dialect || 'Aucun'}</strong>
          </div>
        </div>

        {/* Card 3: Student Environment */}
        <div className="stat-card">
          <div className="card-header-row">
            <span className="stat-label">Étudiant</span>
            <div className="icon-wrapper">
              <User size={20} />
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>
            {appInfo.student || 'Non configuré'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            App : {appInfo.app || 'Flask'} (v{appInfo.version || '?'})
          </div>
        </div>

        {/* Card 4: Terraform Env Inject */}
        <div className="stat-card">
          <div className="card-header-row">
            <span className="stat-label">Var Environnement</span>
            <div className="icon-wrapper">
              <Terminal size={20} />
            </div>
          </div>
          <div className="stat-value">
            <span style={{ 
              background: 'hsla(190, 95%, 50%, 0.1)', 
              color: 'var(--color-secondary)',
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontFamily: 'monospace'
            }}>
              ENV = "{envInfo.env || 'undefined'}"
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Injecté via Terraform
          </div>
        </div>
      </section>

      {/* Main Interactive panels */}
      <main className="content-grid">
        {/* Left Panel: Database interaction */}
        <section className="panel">
          <h2 className="panel-title">
            <Database size={24} style={{ color: 'var(--color-primary)' }} />
            <span>Gestionnaire PostgreSQL en Direct</span>
          </h2>

          {/* Database Setup Check */}
          {dbStatus.status === 'connected' && (
            <div className="db-actions">
              <button 
                className="btn btn-success" 
                onClick={handleInitDb}
                disabled={isInitializing}
              >
                <RefreshCw size={16} className={isInitializing ? 'spin' : ''} />
                <span>{isInitializing ? 'Initialisation...' : 'Initialiser les Tables'}</span>
              </button>
              
              <button className="btn btn-secondary" onClick={() => fetchAllData()}>
                <RefreshCw size={16} />
                <span>Rafraîchir</span>
              </button>
            </div>
          )}

          {dbInitMessage && (
            <div className={`alert ${dbInitMessage.includes('Succès') ? 'alert-success' : 'alert-info'}`}>
              {dbInitMessage.includes('Succès') ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span>{dbInitMessage}</span>
            </div>
          )}

          {dbStatus.status !== 'connected' && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <div>
                <strong>Base de données injoignable.</strong><br />
                {dbStatus.error ? `Détails : ${dbStatus.error}` : "Vérifiez que le backend Flask est en ligne et que la variable d'environnement DATABASE_URL est correctement configurée sur Render."}
              </div>
            </div>
          )}

          {/* Add Message Form */}
          <div style={{ marginBottom: '2.5rem', background: 'hsla(240, 20%, 6%, 0.2)', padding: '1.5rem', borderRadius: '16px', border: '1px solid hsla(240, 20%, 15%, 0.5)' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PlusCircle size={18} style={{ color: 'var(--color-secondary)' }} />
              <span>Poster un message sur la BDD</span>
            </h3>

            {formError && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="alert alert-success">
                <CheckCircle size={16} />
                <span>Votre message a été enregistré dans PostgreSQL !</span>
              </div>
            )}

            <form onSubmit={handleSubmitMessage}>
              <div className="form-group">
                <label className="form-label">Votre Nom</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Alice Smith"
                  disabled={dbStatus.status !== 'connected' || isSubmitting}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea 
                  className="form-control" 
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Écrivez un message qui sera stocké durablement dans PostgreSQL..."
                  disabled={dbStatus.status !== 'connected' || isSubmitting}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={dbStatus.status !== 'connected' || isSubmitting}
              >
                <Send size={16} />
                <span>{isSubmitting ? 'Envoi...' : 'Enregistrer dans la BDD'}</span>
              </button>
            </form>
          </div>

          {/* Messages list */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
              Messages stockés ({messages.length})
            </h3>
            
            {messages.length === 0 ? (
              <div className="no-messages">
                <span className="no-messages-icon">✉️</span>
                <p>Aucun message trouvé.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Assurez-vous d'avoir initialisé les tables et d'ajouter un message ci-dessus !
                </p>
              </div>
            ) : (
              <div className="messages-container">
                {messages.map((msg) => (
                  <div key={msg.id} className="message-card">
                    <div className="message-header">
                      <span className="message-author">{msg.name}</span>
                      <span className="message-time">
                        {new Date(msg.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <p className="message-text">{msg.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Architecture & Adminer Quick Link */}
        <section className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 className="panel-title">
              <Code size={24} style={{ color: 'var(--color-secondary)' }} />
              <span>Outils & Architecture</span>
            </h2>

            <div className="arch-list">
              <div className="arch-item">
                <span className="arch-dot react"></span>
                <div className="arch-content">
                  <h4>React (Frontend)</h4>
                  <p>Hébergé en Static Site sur Render. Interface utilisateur premium en temps réel.</p>
                </div>
              </div>

              <div className="arch-item">
                <span className="arch-dot flask"></span>
                <div className="arch-content">
                  <h4>Flask (Backend API)</h4>
                  <p>Déployé en Web Service (image Docker GHCR) géré par Terraform.</p>
                </div>
              </div>

              <div className="arch-item">
                <span className="arch-dot postgres"></span>
                <div className="arch-content">
                  <h4>PostgreSQL (Base de données)</h4>
                  <p>Hébergement managé Render sécurisé pour stocker les données.</p>
                </div>
              </div>

              <div className="arch-item">
                <span className="arch-dot adminer"></span>
                <div className="arch-content">
                  <h4>Adminer (Administration)</h4>
                  <p>Déployé en conteneur autonome via Terraform pour visualiser les tables SQL en direct.</p>
                </div>
              </div>
            </div>

            <div className="alert alert-info">
              <Globe size={16} />
              <div>
                <strong>Astuce Adminer :</strong><br />
                Pour vous connecter sur Adminer, utilisez les identifiants PostgreSQL fournis par Render (Host, User, Password, DB Name).
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem', borderTop: '1px solid hsla(240, 20%, 20%, 0.5)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Accès Rapides Plateforme</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a 
                href={apiUrl ? `https://adminer-${appInfo.student ? appInfo.student.toLowerCase().replace(/\s+/g, '-') : 'iac'}.onrender.com` : '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Terminal size={16} style={{ color: 'var(--color-warning)' }} />
                  Ouvrir Adminer Web UI
                </span>
                <ArrowUpRight size={16} />
              </a>

              <a 
                href="https://dashboard.render.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={16} style={{ color: 'var(--color-secondary)' }} />
                  Dashboard Render Cloud
                </span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid hsla(240, 20%, 20%, 0.3)', paddingTop: '2rem' }}>
        <p>Atelier Render 2026 - Développé par <strong>{appInfo.student || 'Josué Perrault'}</strong></p>
        <p style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>Propulsé par React, Flask, PostgreSQL, Adminer, Docker, GitHub Actions, Terraform & Render</p>
      </footer>
    </div>
  );
}

export default App;
