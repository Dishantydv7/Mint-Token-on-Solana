import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { UnsafeBurnerWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
// import { clusterApiUrl } from '@solana/web3.js';
import './App.css'
import '@solana/wallet-adapter-react-ui/styles.css';
import MintFunction from './components/Mint';

function App() {
  const network = WalletAdapterNetwork.Devnet;
   const endpoint ="https://solana-mainnet.g.alchemy.com/v2/yBzlkWFR7LyZlmSKMjCBgTJEYK9LIktp"
  const wallets = useMemo(() => [new UnsafeBurnerWalletAdapter()], [network]);

  return (
    <ConnectionProvider endpoint = {endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app-container">
            {/* Connect Button - Always visible in top-right */}
            <div className="wallet-button-container right">
              <WalletMultiButton className="wallet-btn connect-btn" />
            </div>

            { (
              <div className="wallet-button-container left">
                <WalletDisconnectButton className="wallet-btn disconnect-btn" />
              </div>
            )}
             <MintFunction/>
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App