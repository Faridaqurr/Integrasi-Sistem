'use client';
import { useEffect, useState } from 'react';
import { mqttClient } from '../../../utils/mqttClient';

type Wallet = {
  balance: number;
  payment_method: string;
  wallet_name: string;
};

type HistoryItem = {
  id: string;
  amount: number;
  type: string;
  timestamp: string;
  created_at: string;
  from?: string;
  to?: string;
  description?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverMethod, setReceiverMethod] = useState('owo');
  const [amount, setAmount] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const formatRupiah = (num: number | undefined) =>
    typeof num === 'number' ? num.toLocaleString('id-ID') : '0';

  useEffect(() => {
    const ewalletData = localStorage.getItem('e-wallet');
    const userData = localStorage.getItem('user');

    if (ewalletData && userData) {
      const parsedUser = JSON.parse(userData);
      const parsedeWallet = JSON.parse(ewalletData);

      setWallet(parsedeWallet);
      setUser(parsedUser);

      const topic = `B/O/bankit/wallet-identity/request`;
      const payload = {
        email: parsedUser.email,
        payment_method: parsedeWallet.payment_method,
      };

      mqttClient.publish(topic, JSON.stringify(payload));
      console.log(`📤 Request wallet identity:`, payload);
    } else {
      setStatusMsg('❌ Wallet atau user tidak ditemukan. Silakan login dan pilih wallet terlebih dahulu.');
    }
  }, []);

  useEffect(() => {
    if (!wallet?.payment_method || !user?.email) return;

    const walletIdentityTopic = `B/O/bankit/wallet-identity/response`;
    const transferResTopic = `B/O/bankit/${wallet.payment_method}/transfer/send/response`;
    const receiveTransferTopic = `B/O/bankit/${wallet.payment_method}/transfer/receive`;
    const topupResTopic = `B/O/bankit/${wallet.payment_method}/give-balance/response`;
    const historyResTopic = `B/O/bankit/wallet-history/response`;

    const handler = (topic: string, message: Buffer) => {
      const msg = message.toString();
      console.log(`📩 MQTT [${topic}] =>`, msg);

      try {
        const res = JSON.parse(msg);

        if (topic === transferResTopic) {
          if (res.status) {
            setStatusMsg(`✅ ${res.message || 'Transfer berhasil'}`);
            if (typeof res.balance === 'number') {
              setWallet((prev) => prev ? { ...prev, balance: res.balance } : prev);
            }
          } else {
            setStatusMsg(`❌ ${res.message || 'Transfer gagal'}`);
          }
        }

        if (topic === receiveTransferTopic) {
          if (res.status) {
            const formattedAmount = formatRupiah(res.amount);
            setStatusMsg(`✅ Uang masuk sebesar Rp ${formattedAmount} dari ${res.from || 'penerima'}`);
            if (typeof res.balance === 'number') {
              setWallet((prev) => prev ? { ...prev, balance: res.balance } : prev);
            }
          }
        }

        if (topic === topupResTopic && res.status) {
          setStatusMsg(`✅ Top-Up berhasil`);
          if (typeof res.balance === 'number') {
            setWallet((prev) => prev ? { ...prev, balance: res.balance } : prev);
          }
        }

        if (topic === walletIdentityTopic && res.status && res.data) {
          setWallet(res.data);
          setStatusMsg(`✅ Wallet berhasil dimuat: ${res.data.wallet_name}`);
        }

        if (topic === historyResTopic && res.status && res.data?.transactions) {
          setHistory(res.data.transactions);
        }
      } catch {
        console.error('❌ Gagal parsing pesan MQTT:', msg);
      }
    };

    mqttClient.subscribe(walletIdentityTopic);
    mqttClient.subscribe(transferResTopic);
    mqttClient.subscribe(receiveTransferTopic);
    mqttClient.subscribe(topupResTopic);
    mqttClient.subscribe(historyResTopic);
    mqttClient.on('message', handler);

    return () => {
      mqttClient.unsubscribe(walletIdentityTopic);
      mqttClient.unsubscribe(transferResTopic);
      mqttClient.unsubscribe(receiveTransferTopic);
      mqttClient.unsubscribe(topupResTopic);
      mqttClient.unsubscribe(historyResTopic);
      mqttClient.off('message', handler);
    };
  }, [wallet?.payment_method, user?.email]);

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || !user?.email) {
      setStatusMsg('❌ Wallet tidak valid atau belum login.');
      return;
    }
    if (!receiverEmail.trim()) {
      setStatusMsg('❌ Email penerima wajib diisi.');
      return;
    }
    if (amount <= 0) {
      setStatusMsg('❌ Jumlah saldo harus lebih dari 0.');
      return;
    }

    const payload = {
      sender_email: user.email,
      receiver_payment_method: receiverMethod,
      receiver_email: receiverEmail,
      amount,
    };

    const topic = `B/O/bankit/${wallet.payment_method}/transfer/send/request`;
    mqttClient.publish(topic, JSON.stringify(payload));
    console.log(`📤 Kirim saldo ke ${receiverEmail} melalui ${receiverMethod}`, payload);
    setStatusMsg('⏳ Mengirim saldo...');
  };

  const handleTopUp = () => {
    if (!wallet || !user?.email) return;
    const topic = `B/O/bankit/${wallet.payment_method}/give-balance/request`;
    const payload = { email: user.email };
    mqttClient.publish(topic, JSON.stringify(payload));
    console.log(`📤 Meminta saldo top-up:`, payload);
    setStatusMsg('⏳ Meminta top-up...');
  };

  const handleFetchHistory = () => {
    if (!wallet || !user?.email) return;
    const topic = 'B/O/bankit/wallet-history/request';
    const payload = {
      email: user.email,
      payment_method: wallet.payment_method,
    };
    mqttClient.publish(topic, JSON.stringify(payload));
    setStatusMsg('⏳ Mengambil histori transaksi...');
  };

  const getWalletIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'owo': return '🦉';
      case 'ringaja': return '💫';
      case 'dopay': return '💳';
      default: return '💰';
    }
  };

  const getWalletColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'owo': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      case 'ringaja': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
      case 'dopay': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
      default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
  };

  if (!wallet) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Memuat wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Wallet Card */}
      <div style={{
        ...styles.walletCard,
        background: getWalletColor(wallet.payment_method)
      }}>
        <div style={styles.walletHeader}>
          <div style={styles.walletIcon}>{getWalletIcon(wallet.payment_method)}</div>
          <div style={styles.walletInfo}>
            <h2 style={styles.walletName}>{wallet.wallet_name}</h2>
            <p style={styles.walletMethod}>{wallet.payment_method.toUpperCase()}</p>
          </div>
        </div>
        <div style={styles.balanceSection}>
          <p style={styles.balanceLabel}>Saldo Tersedia</p>
          <h1 style={styles.balanceAmount}>Rp {formatRupiah(wallet.balance)}</h1>
        </div>
      </div>

      {/* Transfer Section */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>🔁</span>
          <h3 style={styles.sectionTitle}>Kirim Saldo</h3>
        </div>
        <form onSubmit={handleTransfer} style={styles.transferForm}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Penerima</label>
            <input
              style={styles.input}
              placeholder="Masukkan email penerima"
              value={receiverEmail}
              onChange={e => setReceiverEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Metode Penerima</label>
            <div style={styles.methodSelector}>
              {['owo', 'ringaja', 'dopay'].map((method) => (
                <div
                  key={method}
                  style={{
                    ...styles.methodCard,
                    ...(receiverMethod === method ? styles.methodCardSelected : {})
                  }}
                  onClick={() => setReceiverMethod(method)}
                >
                  <div style={styles.methodIcon}>{getWalletIcon(method)}</div>
                  <span style={styles.methodName}>{method.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Jumlah Transfer</label>
            <div style={styles.amountInput}>
              <span style={styles.currency}>Rp</span>
              <input
                style={styles.amountField}
                type="text"
                placeholder="0"
                value={amount.toString()}
                onChange={(e) => {
                  const numeric = e.target.value.replace(/\D/g, '');
                  const value = Number(numeric);
                  setAmount(isNaN(value) ? 0 : value);
                }}
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.primaryButton}>
            <span>Kirim Sekarang</span>
            <span style={styles.buttonArrow}>→</span>
          </button>
        </form>
      </div>

      {/* Top-up Section */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>💰</span>
          <h3 style={styles.sectionTitle}>Top-Up Saldo</h3>
        </div>
        <p style={styles.sectionDescription}>Tambah saldo wallet Anda dengan mudah</p>
        <button onClick={handleTopUp} style={styles.secondaryButton}>
          <span>Top-Up Rp 10.000</span>
          <span style={styles.buttonArrow}>+</span>
        </button>
      </div>

      {/* History Section */}
      <div style={styles.sectionCard}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>📈</span>
          <h3 style={styles.sectionTitle}>Histori Transaksi</h3>
        </div>
        <button onClick={handleFetchHistory} style={styles.secondaryButton}>
          <span>Tampilkan Histori</span>
          <span style={styles.buttonArrow}>↻</span>
        </button>
        
        <div style={styles.historyList}>
          {history.length === 0 ? (
            <div style={styles.emptyHistory}>
              <span style={styles.emptyIcon}>📋</span>
              <p style={styles.emptyText}>Belum ada histori transaksi</p>
            </div>
          ) : (
            history.map((item, i) => (
              <div key={i} style={styles.historyItem}>
                <div style={styles.historyIcon}>
                  {item.type === 'transfer' ? '🔄' : item.type === 'topup' ? '💰' : '📊'}
                </div>
                <div style={styles.historyContent}>
                  <div style={styles.historyHeader}>
                    <span style={styles.historyType}>{item.type?.toUpperCase() || 'TRANSAKSI'}</span>
                    <span style={styles.historyAmount}>Rp {formatRupiah(item.amount)}</span>
                  </div>
                  {item.description && (
                    <p style={styles.historyDescription}>{item.description}</p>
                  )}
                  <p style={styles.historyDate}>
                    {new Date(item.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div style={styles.statusCard}>
          <p style={styles.statusMessage}>{statusMsg}</p>
        </div>
      )}
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
  walletCard: {
    borderRadius: '24px',
    padding: '2rem',
    marginBottom: '1.5rem',
    color: 'white',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
  },
  walletHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  walletIcon: {
    fontSize: '3rem',
    marginRight: '1rem',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))',
  },
  walletInfo: {
    flex: 1,
  },
  walletName: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  walletMethod: {
    fontSize: '1rem',
    margin: '0',
    opacity: 0.9,
    fontWeight: '500',
  },
  balanceSection: {
    textAlign: 'center' as const,
  },
  balanceLabel: {
    fontSize: '1rem',
    margin: '0 0 0.5rem 0',
    opacity: 0.9,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    letterSpacing: '-0.02em',
  },
  sectionCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
    boxShadow: '0 25px 50px rgba(102, 126, 234, 0.15)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  sectionIcon: {
    fontSize: '1.5rem',
    marginRight: '0.75rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0',
  },
  sectionDescription: {
    color: '#64748b',
    fontSize: '1rem',
    margin: '0 0 1.5rem 0',
  },
  transferForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  },
  label: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '1rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff',
    transition: 'all 0.3s ease',
    outline: 'none',
    color: '#1e293b',
  },
  methodSelector: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  methodCard: {
    flex: 1,
    minWidth: '120px',
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    background: '#ffffff',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  methodCardSelected: {
    borderColor: '#4f46e5',
    background: 'rgba(79, 70, 229, 0.05)',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(79, 70, 229, 0.15)',
  },
  methodIcon: {
    fontSize: '1.5rem',
  },
  methodName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
  },
  amountInput: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff',
    padding: '0.5rem 1rem',
    transition: 'all 0.3s ease',
  },
  currency: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#4f46e5',
    marginRight: '0.75rem',
  },
  amountField: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    background: 'transparent',
    padding: '0.5rem 0',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 10px 25px rgba(79, 70, 229, 0.3)',
  },
  secondaryButton: {
    background: 'rgba(79, 70, 229, 0.1)',
    color: '#4f46e5',
    border: '2px solid #4f46e5',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  buttonArrow: {
    fontSize: '1.2rem',
    transition: 'transform 0.3s ease',
  },
  historyList: {
    marginTop: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  emptyHistory: {
    textAlign: 'center' as const,
    padding: '2rem',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  emptyText: {
    fontSize: '1.1rem',
    margin: '0',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '1rem',
    background: 'rgba(79, 70, 229, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(79, 70, 229, 0.1)',
  },
  historyIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem',
    marginTop: '0.25rem',
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  historyType: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase' as const,
  },
  historyAmount: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
  },
  historyDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: '0 0 0.5rem 0',
  },
  historyDate: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    margin: '0',
  },
  statusCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    padding: '1rem 1.5rem',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.15)',
  },
  statusMessage: {
    fontSize: '1rem',
    margin: '0',
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'center' as const,
  },
};