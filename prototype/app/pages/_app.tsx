import type { AppProps } from "next/app";
import "../styles/globals.css";
import { AccountPicker } from "../components/AccountPicker";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <AccountPicker />
      <Component {...pageProps} />
    </>
  );
}
