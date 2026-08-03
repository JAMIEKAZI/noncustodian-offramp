"use client";

import { useEffect, useState } from "react";

export function AppKitProvider({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Safely load AppKit dynamic imports only on the browser side
    const initAppKit = async () => {
      const { createAppKit } = await import('@reown/appkit/react');
      const { EthersAdapter } = await import('@reown/appkit-adapter-ethers');
      const { SolanaAdapter } = await import('@reown/appkit-adapter-solana');
      const { baseSepolia, solanaDevnet } = await import('@reown/appkit/networks');
      const { PhantomWalletAdapter, SolflareWalletAdapter } = await import('@solana/wallet-adapter-wallets');

      const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "3b5e10937fca77c0a9752ff5b36939e3";

      const ethersAdapter = new EthersAdapter();
      const solanaWeb3JsAdapter = new SolanaAdapter({
        wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
      });

      createAppKit({
        adapters: [ethersAdapter, solanaWeb3JsAdapter],
        networks: [baseSepolia, solanaDevnet],
        projectId,
        metadata: {
          name: 'Rampme Stablecoin ',
          description: 'Convert Crypto to Fiat',
          url: 'https://rampme.vercel.app', 
          icons: ['https://avatars.githubusercontent.com/u/179229932']
        },
        features: {
          analytics: true 
        }
      });

      setMounted(true);
    };

    initAppKit();
  }, []);

  // Return null on the server side to avoid SSR build errors
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}