import "./globals.css";

export const metadata = {
  title: "ElectraChain",
  description: "Smart City Peer-to-Peer Energy Trading Platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
