import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router'; 
import "./App.css";
import '@fontsource/inter/index.css';
import { useSystemSettingsStore } from "./store/systemSettingsStore";
import { useEffect } from 'react';
export default function App() {

const initSystemSettings = useSystemSettingsStore((state) => state.init);

  useEffect(() => {
    initSystemSettings();
  }, [initSystemSettings]);

  useEffect(() => {
  if (import.meta.env.PROD) {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }
}, []);
  return <RouterProvider router={router} />;
}