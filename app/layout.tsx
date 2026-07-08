import "./globals.css";
import { UserProvider } from "@/app/context/UserContext";
import Script from "next/script";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <UserProvider>{children}</UserProvider>

        {/* Google Places API */}
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=TU_API_KEY&libraries=places`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}