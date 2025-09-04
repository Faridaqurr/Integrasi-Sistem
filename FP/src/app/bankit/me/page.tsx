'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mqttClient } from '../../../utils/mqttClient';

type User = {
  id: string;
  name: string;
  email: string;
};

export default function MePage() {
  const [user, setUser] = useState<User | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const data = localStorage.getItem('user');
    if (data) {
      const parsedUser = JSON.parse(data);
      setUser(parsedUser);
    }

    const topic = 'B/O/bankit/wallet-identity/response';

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
        if (res.status && res.data) {
        // SIMPAN NAMA EWALLET KE LOCAL STORAGE
        localStorage.setItem('e-wallet', JSON.stringify(res.data));
        console.log('📩 Wallet response:', res.data);
        setIsLoading(false);
        router.push('/wallet');
        }
        else {
          setError(res.message || 'Gagal memilih wallet');
          setIsLoading(false);
        }
      }
    };

    mqttClient.on('message', handler);

    return () => {
      mqttClient.unsubscribe(topic);
      mqttClient.off('message', handler);
    };
  }, [router]);

  const handleChooseWallet = () => {
    if (!user || !paymentMethod) {
      setError('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    setIsLoading(true);
    setError('');

    const payload = {
      email: user.email,
      payment_method: paymentMethod,
    };

    mqttClient.publish('B/O/bankit/wallet-identity/request', JSON.stringify(payload));
    console.log('📤 Request wallet sent:', payload);
  };

  const walletOptions = [
    {
      id: 'owo',
      name: 'OWO',
      description: 'Digital wallet yang mudah dan aman',
      icon: '🦉',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      features: ['Transfer Cepat', 'Cashback', 'QR Payment']
    },
    {
      id: 'ringaja',
      name: 'RingAja',
      description: 'Pembayaran digital terpercaya',
      icon: '💫',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      features: ['Multi Platform', 'Reward Points', 'Bill Payment']
    },
    {
      id: 'dopay',
      name: 'DoPay',
      description: 'Solusi pembayaran modern',
      icon: '💳',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      features: ['Smart Payment', 'Investment', 'Savings']
    }
  ];

  if (!user) return (
    <div style={styles.container}>
      <div style={styles.loadingCard}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Memuat profil...</p>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* Profile Header */}
      <div style={styles.profileCard}>
        <div style={styles.avatarContainer}>
          <div style={styles.avatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={styles.onlineIndicator}></div>
        </div>
        <div style={styles.profileInfo}>
          <h1 style={styles.welcomeText}>Halo, {user.name}! 👋</h1>
          <p style={styles.emailText}>{user.email}</p>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}></span>
            <span style={styles.statusText}>Akun Aktif</span>
          </div>
        </div>
      </div>

      {/* Wallet Selection */}
      <div style={styles.selectionCard}>
        <div style={styles.selectionHeader}>
          <h2 style={styles.selectionTitle}>Pilih E-Wallet Anda</h2>
          <p style={styles.selectionSubtitle}>Pilih metode pembayaran yang ingin Anda gunakan</p>
        </div>

        <div style={styles.walletGrid}>
          {walletOptions.map((wallet) => (
            <div
              key={wallet.id}
              style={{
                ...styles.walletCard,
                ...(paymentMethod === wallet.id ? styles.walletCardSelected : {}),
                background: paymentMethod === wallet.id ? wallet.color : styles.walletCard.background
              }}
              onClick={() => setPaymentMethod(wallet.id)}
            >
              <div style={styles.walletCardHeader}>
                <div style={styles.walletIcon}>{wallet.icon}</div>
                <div style={styles.walletInfo}>
                  <h3 style={{
                    ...styles.walletName,
                    color: paymentMethod === wallet.id ? 'white' : styles.walletName.color
                  }}>
                    {wallet.name}
                  </h3>
                  <p style={{
                    ...styles.walletDescription,
                    color: paymentMethod === wallet.id ? 'rgba(255,255,255,0.9)' : styles.walletDescription.color
                  }}>
                    {wallet.description}
                  </p>
                </div>
                {paymentMethod === wallet.id && (
                  <div style={styles.checkIcon}>✓</div>
                )}
              </div>
              
              <div style={styles.featuresList}>
                {wallet.features.map((feature, index) => (
                  <div key={index} style={styles.feature}>
                    <span style={{
                      ...styles.featureDot,
                      background: paymentMethod === wallet.id ? 'rgba(255,255,255,0.3)' : '#e2e8f0'
                    }}></span>
                    <span style={{
                      ...styles.featureText,
                      color: paymentMethod === wallet.id ? 'rgba(255,255,255,0.9)' : styles.featureText.color
                    }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={styles.errorCard}>
            <span style={styles.errorIcon}>⚠️</span>
            <p style={styles.errorText}>{error}</p>
          </div>
        )}

        <button 
          onClick={handleChooseWallet} 
          disabled={!paymentMethod || isLoading}
          style={{
            ...styles.continueButton,
            ...((!paymentMethod || isLoading) ? styles.continueButtonDisabled : {})
          }}
        >
          {isLoading ? (
            <>
              <div style={styles.buttonSpinner}></div>
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Lanjutkan ke Wallet</span>
              <span style={styles.buttonArrow}>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '1.5rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center' as const,
    maxWidth: '400px',
    margin: '2rem auto',
    boxShadow: '0 25px 50px rgba(102, 126, 234, 0.25)',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '1.1rem',
    margin: '0',
  },
  profileCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '2rem',
    marginBottom: '1.5rem',
    maxWidth: '700px',
    margin: '0 auto 1.5rem',
    boxShadow: '0 25px 50px rgba(102, 126, 234, 0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  avatarContainer: {
    position: 'relative' as const,
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  onlineIndicator: {
    position: 'absolute' as const,
    bottom: '5px',
    right: '5px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#10b981',
    border: '3px solid white',
  },
  profileInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #334155, #475569)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  emailText: {
    fontSize: '1.1rem',
    color: '#64748b',
    margin: '0 0 1rem 0',
    fontWeight: '500',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
  },
  statusText: {
    margin: '0',
  },
  selectionCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '2.5rem',
    maxWidth: '700px',
    margin: '0 auto',
    boxShadow: '0 25px 50px rgba(102, 126, 234, 0.25)',
  },
  selectionHeader: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  selectionTitle: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  selectionSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    margin: '0',
  },
  walletGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    marginBottom: '2rem',
  },
  walletCard: {
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative' as const,
    boxShadow: '0 0 0 rgba(0,0,0,0)', // biar transisi smooth
  },
  walletCardSelected: {
    border: '2px solid transparent', // hindari warning
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)',
    transform: 'translateY(-1px)',
    },
  walletCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem',
  },
  walletIcon: {
    fontSize: '2.5rem',
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  walletDescription: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0',
  },
  checkIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'white',
  },
  featuresList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  featureDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#e2e8f0',
  },
  featureText: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
  },
  errorCard: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  errorIcon: {
    fontSize: '1.2rem',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '1rem',
    margin: '0',
    fontWeight: '500',
  },
  continueButton: {
    width: '100%',
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
    gap: '0.75rem',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  continueButtonDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  buttonSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  buttonArrow: {
    fontSize: '1.2rem',
    transition: 'transform 0.3s ease',
  },
};