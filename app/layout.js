import "./globals.css";

export const metadata = {
  title: "FlowPilot — AI Agent Workflows",
  description: "Secure multi-tenant AI workflow automation demo"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
