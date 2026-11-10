import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LoginForm } from "./LoginForm";
import { WishlistApp } from "./WishlistApp";
import { api } from "./api";
import "./style.css";
function App() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  async function refresh() {
    const next = await api("state");
    setState(next);
    setError("");
    if (!next.me && location.pathname === "/")
      history.replaceState(null, "", "/login");
  }
  useEffect(() => {
    const update = () => refresh().catch((e) => setError(e.message));
    update();
    window.addEventListener("focus", update);
    return () => window.removeEventListener("focus", update);
  }, []);
  if (error)
    return (
      <main className="p-8">
        <p role="alert">{error}</p>
        <button className="underline" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  if (!state)
    return (
      <main className="p-8" role="status">
        Opening Family List…
      </main>
    );
  return state.me && !location.hash.startsWith("#reset=") ? (
    <WishlistApp state={state} refresh={refresh} />
  ) : (
    <LoginForm />
  );
}
createRoot(document.getElementById("root")).render(<App />);
