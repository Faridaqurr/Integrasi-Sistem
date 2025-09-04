'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mqttClient } from '../../../utils/mqttClient';

// --- TYPES (sama seperti sebelumnya) ---
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

// Komponen utama yang berisi logika
function HistoryContent() {
  const searchParams = useSearchParams();
  const walletFilter = searchParams.get('wallet'); // Mengambil ?wallet=... dari URL

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Memuat riwayat transaksi...');
  const [title, setTitle] = useState('Riwayat Transaksi');

  const formatRupiah = (num: number) =>
    typeof num === 'number' ? num.toLocaleString('id-ID') : '0';

  useEffect(() => {
    setIsLoading(true);
    const userData = localStorage.getItem('user');
    
    let paymentMethod: string | null = walletFilter; // Prioritaskan filter dari URL

    // Jika tidak ada filter URL, gunakan wallet aktif dari localStorage
    if (!paymentMethod) {
      const ewalletData = localStorage.getItem('e-wallet');
      if (ewalletData) {
        paymentMethod = JSON.parse(ewalletData).payment_method;
      }
    }
    
    // Update judul halaman sesuai filter
    setTitle(walletFilter ? `Riwayat - ${walletFilter.toUpperCase()}` : 'Riwayat Transaksi (Aktif)');

    if (!userData || !paymentMethod) {
      setStatusMsg('❌ Gagal memuat. Pilih wallet di halaman Profil atau pilih filter riwayat.');
      setIsLoading(false);
      setHistory([]);
      return;
    }
    
    const user = JSON.parse(userData);
    const historyResTopic = 'B/O/bankit/wallet-history/response';

    const handler = (topic: string, message: Buffer) => {
      // ... (logika handler sama seperti sebelumnya)
      if (topic === historyResTopic) {
        const msg = message.toString();
        try {
          const res = JSON.parse(msg);
          if (res.status && res.data?.transactions) {
            setHistory(res.data.transactions);
            setStatusMsg(`✅ Riwayat berhasil dimuat (${res.data.transactions.length} transaksi).`);
          } else {
            setHistory([]);
            setStatusMsg(`❌ ${res.message || 'Gagal mengambil riwayat.'}`);
          }
        } catch (error) {
          console.error('Gagal parsing pesan riwayat:', error);
          setStatusMsg('❌ Terjadi kesalahan saat memproses data riwayat.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    mqttClient.subscribe(historyResTopic);
    mqttClient.on('message', handler);

    // Kirim request dengan payment_method yang sudah ditentukan
    const payload = {
      email: user.email,
      payment_method: paymentMethod,
    };
    setStatusMsg(`⏳ Meminta riwayat untuk ${paymentMethod.toUpperCase()}...`);
    mqttClient.publish('B/O/bankit/wallet-history/request', JSON.stringify(payload));
    
    return () => {
      mqttClient.unsubscribe(historyResTopic);
      mqttClient.off('message', handler);
    };
  }, [walletFilter]); // <-- DEPENDENCY PENTING: useEffect dijalankan ulang saat filter URL berubah

  // ... (Fungsi getTransactionDetails sama seperti sebelumnya)
const getTransactionDetails = (item: HistoryItem) => {
  switch (item.type) {
    case 'topup':
      return { icon: '💰', title: 'Top-Up Saldo', isIncome: true };
    case 'transfer':
        return { icon: '📥', title: `Terima transfer dari ${item.from || '...'}`, isIncome: true };
    case 'purchase':
      return { icon: '🛒', title: `Pembelian: ${item.description || 'Barang'}`, isIncome: false };
    default:
      return { icon: '🔄', title: item.description || 'Transaksi', isIncome: false };
  }
};


  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.subtitle}>Semua pemasukan dan pengeluaran Anda tercatat di sini.</p>

      <div style={styles.statusCard}>
        <p style={styles.statusMessage}>{statusMsg}</p>
      </div>

      <div style={styles.historyListContainer}>
        {isLoading ? (
          <div style={styles.centered}><div style={styles.loadingSpinner}></div></div>
        ) : history.length === 0 ? (
          <div style={styles.centered}><span style={styles.emptyIcon}>📋</span><p>Tidak ada riwayat untuk filter ini.</p></div>
        ) : (
          history.map((item) => {
            const details = getTransactionDetails(item);
            return (
              <div key={item.id} style={styles.historyItem}>
                <div style={styles.historyIcon}>{details.icon}</div>
                <div style={styles.historyContent}>
                  <span style={styles.historyTitle}>{details.title}</span>
                  <span style={styles.historyDate}>{new Date(item.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ ...styles.historyAmount, color: details.isIncome ? 'black' : 'black' }}>
                Rp {formatRupiah(item.amount)}
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Wrapper untuk Suspense (Best practice saat menggunakan useSearchParams)
export default function HistoryPage() {
  return (
    <Suspense fallback={<div style={styles.centered}><div style={styles.loadingSpinner}></div></div>}>
      <HistoryContent />
    </Suspense>
  );
}


// --- STYLES (sama seperti sebelumnya, hanya modifikasi kecil di style `centered`) ---
const styles = {
  container: {
    padding: '2.5rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: '0 0 2rem 0',
  },
  statusCard: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    padding: '1rem 1.5rem',
    marginBottom: '2rem',
  },
  statusMessage: {
    color: 'white',
    margin: 0,
    textAlign: 'center' as const,
  },
  historyListContainer: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    minHeight: '300px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem 0',
    borderBottom: '1px solid #e2e8f0',
  },
  historyIcon: {
    fontSize: '1.75rem',
    marginRight: '1.5rem',
    width: '40px',
    textAlign: 'center' as const,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    display: 'block',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem',
  },
  historyDate: {
    fontSize: '0.9rem',
    color: '#64748b',
  },
  historyAmount: {
    fontSize: '1.1rem',
    fontWeight: '700',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 0',
    color: '#64748b',
    height: '100%',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
};