'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mqttClient } from '../../../utils/mqttClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const topic = 'B/O/bankit/account-identity/response';

    // Subscribe jika belum terhubung
    const subscribeIfConnected = () => {
      if (mqttClient.connected) {
        mqttClient.subscribe(topic);
        console.log('✅ Subscribed to:', topic);
      } else {
        mqttClient.on('connect', () => {
          mqttClient.subscribe(topic);
          console.log('✅ Subscribed to (on connect):', topic);
        });
      }
    };

    subscribeIfConnected();

    const handler = (topicReceived: string, message: Buffer) => {
      if (topicReceived === topic) {
        const res = JSON.parse(message.toString());
        console.log('📩 Response:', res);
        localStorage.setItem('user', JSON.stringify({ name, email }));
        router.push('/me');
      } else {
        console.error('📥 Unhandled message on topic:', topicReceived);
      }
    };

    mqttClient.on('message', handler);

    return () => {
      mqttClient.unsubscribe(topic);
      mqttClient.off('message', handler);
    };
  }, [router, email, name]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      setError('Nama dan email harus diisi');
      return;
    }
    setError(''); // Reset error sebelum mengirim
    const payload = {
      email
    };
    mqttClient.publish('B/O/bankit/account-identity/request', JSON.stringify(payload));
    console.log('📤 Request sent:', payload)
    };

  return (
    <div style={styles.container}>
      <div style={styles.loginCard}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <div style={styles.icon}>👤</div>
          </div>
          <h1 style={styles.title}>Selamat Datang</h1>
          <p style={styles.subtitle}>Silakan masuk ke akun Anda</p>
        </div>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nama Lengkap</label>
            <input
              placeholder="Masukkan nama lengkap"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{
                ...styles.input,
                ...(name ? styles.inputFocused : {})
              }}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              placeholder="Masukkan alamat email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                ...styles.input,
                ...(email ? styles.inputFocused : {})
              }}
            />
          </div>
          
          {error && (
            <div style={styles.errorContainer}>
              <span style={styles.errorIcon}>⚠️</span>
              <p style={styles.error}>{error}</p>
            </div>
          )}
          
          <button type="submit" style={styles.button}>
            <span style={styles.buttonText}>Masuk</span>
            <span style={styles.buttonArrow}>→</span>
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '3rem 2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 25px 50px rgba(102, 126, 234, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2.5rem',
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  icon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #334155, #475569)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1rem',
    margin: '0',
    fontWeight: '400',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginLeft: '0.25rem',
  },
  input: {
    padding: '1rem 1.25rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    background: '#ffffff',
    transition: 'all 0.3s ease',
    outline: 'none',
    color: '#1e293b',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#4f46e5',
    boxShadow: '0 0 0 4px rgba(79, 70, 229, 0.1)',
    transform: 'translateY(-1px)',
  },
  button: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    padding: '1.25rem 2rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginTop: '1rem',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  buttonText: {
    flex: 1,
    textAlign: 'center' as const,
  },
  buttonArrow: {
    fontSize: '1.2rem',
    transition: 'transform 0.3s ease',
  },
  errorContainer: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  errorIcon: {
    fontSize: '1rem',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.9rem',
    margin: '0',
    fontWeight: '500',
  },
};