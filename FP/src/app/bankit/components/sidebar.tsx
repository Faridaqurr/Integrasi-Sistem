'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';

// --- Daftar Wallet (untuk sub-menu) ---
const walletMethods = [
  { id: 'dopay', name: 'DoPay', icon: '💳' },
  { id: 'owo', name: 'OWO', icon: '🦉' },
  { id: 'ringaja', name: 'RiNG Aja', icon: '💫' },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // State untuk mengontrol dropdown Riwayat
  const [isHistoryOpen, setIsHistoryOpen] = useState(pathname === '/history');

  return (
    <nav style={styles.sidebar}>
      <div>
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>🌐</span>
          <h1 style={styles.logoText}>ITCommerce</h1>
        </div>
        <ul style={styles.navList}>
          {/* Item Menu Biasa */}
          <li>
            <Link href="/me" style={pathname === '/me' ? { ...styles.navLink, ...styles.navLinkActive } : styles.navLink}>
              <span style={styles.navIcon}>👤</span>
              <span style={styles.navLabel}>Profil</span>
            </Link>
          </li>
          <li>
            <Link href="/shopit" style={pathname === '/shopit' ? { ...styles.navLink, ...styles.navLinkActive } : styles.navLink}>
              <span style={styles.navIcon}>🛒</span>
              <span style={styles.navLabel}>ShopIT</span>
            </Link>
          </li>
          <li>
            <Link href='/wallet' style={pathname === '/wallet' ? { ...styles.navLink, ...styles.navLinkActive } : styles.navLink}>
              <span style={styles.navIcon}>💳</span>
              <span style={styles.navLabel}>Wallet</span>
            </Link>
          </li>
          
          {/* MODIFIKASI: Item Menu Riwayat dengan Dropdown */}
          <li>
            <div onClick={() => setIsHistoryOpen(!isHistoryOpen)} style={pathname === '/history' ? {...styles.navLink, ...styles.navLinkActive, ...styles.walletToggle} : {...styles.navLink, ...styles.walletToggle}}>
                <span style={styles.navIcon}>📈</span>
                <span style={styles.navLabel}>Riwayat</span>
                <span style={{...styles.chevron, transform: isHistoryOpen ? 'rotate(90deg)' : 'rotate(0deg)'}}>›</span>
            </div>
            {isHistoryOpen && (
                <ul style={styles.subMenu}>
                    {/* Link untuk Semua Riwayat (wallet aktif) */}
                    <li>
                        <Link href="/history" style={!searchParams.get('wallet') ? {...styles.subMenuItem, ...styles.subMenuItemActive} : styles.subMenuItem}>
                             <span style={styles.subMenuItemLabel}>Semua</span>
                        </Link>
                    </li>
                    {/* Link untuk setiap wallet */}
                    {walletMethods.map(wallet => (
                        <li key={wallet.id}>
                            <Link href={`/history?wallet=${wallet.id}`} style={searchParams.get('wallet') === wallet.id ? {...styles.subMenuItem, ...styles.subMenuItemActive} : styles.subMenuItem}>
                                <span style={styles.navIconSmall}>{wallet.icon}</span>
                                <span style={styles.subMenuItemLabel}>{wallet.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

// --- STYLES (dengan tambahan untuk sub-menu) ---
const styles = {
  // ... (semua style lama yang tidak berubah)
  sidebar: {
    width: '240px',
    background: 'rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '1.5rem 1rem',
    height: '100vh',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.5rem 2rem 0.5rem',
  },
  logoIcon: {
    fontSize: '2rem',
    marginRight: '0.75rem',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
    margin: 0,
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    color: '#cbd5e1',
    textDecoration: 'none',
    marginBottom: '0.5rem',
    transition: 'background 0.2s ease, color 0.2s ease',
    cursor: 'pointer',
  },
  navLinkActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    fontWeight: '600',
  },
  navIcon: {
    fontSize: '1.5rem',
    marginRight: '1rem',
    width: '30px',
    textAlign: 'center' as const,
  },
  navLabel: {
    fontSize: '1rem',
  },
  // --- Sub-menu Styles (BARU & MODIFIKASI) ---
  walletToggle: {
    justifyContent: 'space-between',
  },
  chevron: {
    fontSize: '1.5rem',
    transition: 'transform 0.2s ease-in-out',
  },
  subMenu: {
    listStyle: 'none',
    padding: '0 0 0 1.5rem', // Indentasi
    margin: '0 0 0.5rem 0',
  },
  subMenuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    color: '#cbd5e1',
    textDecoration: 'none',
    transition: 'background 0.2s ease, color 0.2s ease',
  },
  subMenuItemActive: {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
      fontWeight: '500',
  },
  subMenuItemLabel: {
    fontSize: '0.9rem',
  },
  navIconSmall: {
    fontSize: '1rem',
    marginRight: '0.75rem',
    width: '20px',
    textAlign: 'center' as const,
  },
};