import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from './bankit/context/ModalContext'; // <-- IMPORT
import { Sidebar } from './bankit/components/sidebar';
import './globals.css';

export const metadata = {
  title: 'ITCommerce B-O',
  description: 'Integrasi ShopIT dan BankIT',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={styles.body}>
        <AuthProvider>
          <ModalProvider> {/* <-- WRAP DENGAN MODAL PROVIDER */}
            <div style={styles.mainLayout}>
              <Sidebar />
              <main style={styles.content}>
                {children}
              </main> {/* <-- LETAKKAN MODAL DI SINI */}
            </div>
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

// ... styles tetap sama
const styles = {
  body: {
    margin: 0,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overflow: 'hidden' as const,
  },
  mainLayout: {
    display: 'flex',
    height: '100vh',
  },
  content: {
    flex: 1,
    height: '100vh',
    overflowY: 'auto' as const,
  },
};