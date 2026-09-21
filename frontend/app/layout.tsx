import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { wagmiConfig } from "../lib/wagmi";
import { Providers } from "./providers";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-body",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaveEarth",
  description: "Address-only membership, chat rooms, and mission log for the SaveEarth association.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rehydrates wagmi's persisted connection state from the request's own
  // cookie header, so the server render already matches whatever the
  // client will settle on — see the `ssr`/`storage` note in lib/wagmi.ts.
  const initialState = cookieToInitialState(wagmiConfig, (await headers()).get("cookie"));

  return (
    <html lang="en" className={`${pressStart2P.variable} ${vt323.variable}`}>
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
