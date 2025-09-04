'use client';
import { useEffect, useState } from 'react';
import { mqttClient } from '../../utils/mqttClient';

// --- TYPES ---
type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  description?: string;
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState('Selamat datang! Klik "Muat Katalog" untuk memulai.');
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('dopay');

  const formatRupiah = (num: number) =>
    typeof num === 'number' ? num.toLocaleString('id-ID') : '0';

  useEffect(() => {
    // ... (Logika useEffect Anda tetap sama, tidak perlu diubah)
    const catalogTopic = 'B/O/shopit/product-catalog/response';
    const detailTopic = 'B/O/shopit/product-detail/response';
    const buyResTopic = 'B/O/shopit/buy/response';

    const handler = (topic: string, message: Buffer) => {
      const msg = message.toString();
      try {
        const res = JSON.parse(msg);
        setIsLoading(false);

        if (topic === catalogTopic && res.status && Array.isArray(res.data)) {
          setProducts(res.data);
          setStatus('✅ Produk berhasil dimuat');
        }

        if (topic === detailTopic && res.status && res.data) {
          setSelectedProduct(res.data);
          setStatus('✅ Detail produk berhasil dimuat');
        }

        if (topic === buyResTopic) {
          if (res.status) {
            setStatus(`✅ ${res.message} (Total: Rp ${formatRupiah(res.data.total_price)}, Sisa Saldo: Rp ${formatRupiah(res.data.current_balance)})`);
          } else {
            setStatus(`❌ ${res.message}`);
          }
        }
      } catch {
        console.error('❌ Gagal parsing pesan:', msg);
        setStatus('❌ Terjadi kesalahan saat memproses data.');
        setIsLoading(false);
      }
    };

    mqttClient.subscribe(catalogTopic);
    mqttClient.subscribe(detailTopic);
    mqttClient.subscribe(buyResTopic);
    mqttClient.on('message', handler);

    return () => {
      mqttClient.unsubscribe(catalogTopic);
      mqttClient.unsubscribe(detailTopic);
      mqttClient.unsubscribe(buyResTopic);
      mqttClient.off('message', handler);
    };
  }, []);

  const handleLoadCatalog = () => {
    mqttClient.publish('B/O/shopit/product-catalog/request', JSON.stringify({ class: 'O', group: 'B' }));
    setStatus('⏳ Memuat katalog produk...');
    setIsLoading(true);
    setSelectedProduct(null); // Kembali ke list view
  };

  const handleSelectProduct = (id: string) => {
    mqttClient.publish('B/O/shopit/product-detail/request', JSON.stringify({ product_id: id }));
    setSelectedProduct(null);
    setStatus('⏳ Memuat detail produk...');
    setIsLoading(true);
    setQuantity(1); // Reset kuantitas
  };

  const handleBuyProduct = () => {
    if (!selectedProduct || quantity <= 0) return;

    const user = localStorage.getItem('user');
    const buyer_email = user ? JSON.parse(user).email : '';

    if (!buyer_email) {
      setStatus('❌ Email pengguna tidak ditemukan. Silakan login terlebih dahulu.');
      return;
    }

    const payload = {
      buyer_email,
      product_id: selectedProduct.id,
      quantity,
      payment_method: paymentMethod
    };

    mqttClient.publish('B/O/shopit/buy/request', JSON.stringify(payload));
    setStatus('⏳ Memproses pembelian...');
    setIsLoading(true);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Katalog Produk ShopIT</h1>
        <button onClick={handleLoadCatalog} disabled={isLoading} style={styles.primaryButton}>
          {isLoading ? 'Memuat...' : '🔄 Muat Ulang Katalog'}
        </button>
      </div>
      
      {/* Status Message */}
      {status && (
        <div style={styles.statusCard}>
          <p style={styles.statusMessage}>{status}</p>
        </div>
      )}

      {selectedProduct ? (
        // --- Tampilan Detail Produk ---
        <div style={styles.detailContainer}>
            <button onClick={() => setSelectedProduct(null)} style={styles.backButton}>← Kembali ke Katalog</button>
            <div style={styles.detailContent}>
                <div style={styles.detailImageContainer}>
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} style={styles.detailImage} />
                </div>
                <div style={styles.detailInfo}>
                    <h2 style={styles.detailName}>{selectedProduct.name}</h2>
                    <p style={styles.detailDescription}>{selectedProduct.description || 'Tidak ada deskripsi.'}</p>
                    <div style={styles.detailPriceStock}>
                        <span style={styles.detailPrice}>Rp {formatRupiah(selectedProduct.price)}</span>
                        <span style={styles.detailStock}>Stok: {selectedProduct.quantity}</span>
                    </div>

                    {/* MODIFIKASI JSX DI SINI */}
                    <div style={styles.inputGroup}>
                        <label style={{...styles.label, ...styles.purpleLabel}}>Jumlah</label>
                        <input
                            type="number"
                            min={1}
                            max={selectedProduct.quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            style={styles.input}
                        />
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={{...styles.label, ...styles.purpleLabel}}>Metode Pembayaran</label>
                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={styles.select}>
                            <option value="dopay">DoPay</option>
                            <option value="owo">OWO</option>
                            <option value="ringaja">RiNG Aja</option>
                        </select>
                    </div>
                    {/* AKHIR MODIFIKASI JSX */}

                    <button onClick={handleBuyProduct} disabled={isLoading} style={styles.buyButton}>
                        {isLoading ? 'Memproses...' : 'Beli Sekarang'}
                    </button>
                </div>
            </div>
        </div>
      ) : (
        // --- Tampilan Grid Katalog Produk ---
        <div style={styles.productGrid}>
          {products.length > 0 ? products.map((product) => (
            <div key={product.id} style={styles.productCard} onClick={() => handleSelectProduct(product.id)}>
              <img src={product.image_url} alt={product.name} style={styles.productImage} />
              <div style={styles.productInfo}>
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productPrice}>Rp {formatRupiah(product.price)}</p>
                <span style={styles.productStock}>Stok: {product.quantity}</span>
              </div>
            </div>
          )) : (
            <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📦</span>
                <p>Katalog masih kosong. Silakan muat katalog.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  // --- Container & Header ---
  container: {
    padding: '2.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  
  // --- Buttons ---
  primaryButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  buyButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '1rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'all 0.3s ease',
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontWeight: '600',
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '1.5rem',
  },
  
  // --- Status ---
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
  
  // --- Product Grid ---
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1.5rem',
  },
  productCard: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  productImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover' as const,
  },
  productInfo: {
    padding: '1rem',
  },
  productName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0',
  },
  productPrice: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#4f46e5',
    margin: '0 0 0.5rem 0',
  },
  productStock: {
    fontSize: '0.9rem',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '4rem 0',
    color: 'white',
    background: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
  },
  emptyIcon: {
    fontSize: '4rem',
  },

  // --- Product Detail ---
  detailContainer: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '2rem',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
  },
  detailContent: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
  },
  detailImageContainer: {
    flex: '1 1 300px',
  },
  detailImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    objectFit: 'cover' as const,
    borderRadius: '16px',
  },
  detailInfo: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  detailName: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.75rem 0',
  },
  detailDescription: {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 1.5rem 0',
  },
  detailPriceStock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  detailPrice: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#4f46e5',
  },
  detailStock: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#10b981',
  },
  
  // --- MODIFIKASI STYLE DI SINI ---
  inputGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  // Style baru untuk label ungu
  purpleLabel: {
    color: '#5b21b6',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    color: '#1e293b', // Warna teks input
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    background: '#ffffff',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    color: '#1e293b', // Warna teks select
    appearance: 'none' as const, 
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem',
  },
};