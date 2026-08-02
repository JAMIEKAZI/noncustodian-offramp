import { AppKitProvider } from "../context/AppKitProvider";
import "./globals.css";

export const metadata = {
  title: "Stablecoin Off-Ramp",
  description: "Convert Crypto to Fiat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
     <body suppressHydrationWarning>
        <AppKitProvider>
          {children}
        </AppKitProvider>
      </body>
    </html>
  );
}