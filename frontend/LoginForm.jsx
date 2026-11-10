import { useState } from "react";
import { api } from "./api";
function GiftMark() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9h18v12H3zM12 9v12M2 5h20v4H2z" />
      <path d="M12 5c-1.4 0-5-1-5-3 0-1.2 1-2 2.2-2C11 0 12 2.2 12 5Zm0 0c1.4 0 5-1 5-3 0-1.2-1-2-2.2-2C13 0 12 2.2 12 5Z" />
    </svg>
  );
}
export function LoginForm() {
  const params = new URLSearchParams(location.hash.slice(1));
  const [mode, setMode] = useState(
    params.has("invite") ? "register" : params.has("reset") ? "reset" : "login",
  );
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const invite = params.get("invite") || "";
  const fieldClass =
    "mt-2 w-full rounded-lg border border-[#bbb8af] bg-white px-4 py-3 text-sm";
  function switchMode(next) {
    setMode(next);
    setShowPassword(false);
    setError("");
    setMessage("");
  }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "forgot") {
        await api("forgot", data);
        setMessage("If that account exists, a reset link is on its way.");
      } else if (mode === "reset") {
        const [uid, token] = (params.get("reset") || "").split("/");
        await api("reset", { ...data, uid, token });
        history.replaceState(null, "", "/login");
        switchMode("login");
        setMessage("Password updated. Sign in with your new password.");
      } else {
        await api(mode === "register" ? "signup" : "login", {
          ...data,
          code: invite,
        });
        location.assign("/");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-[#f5f3ed] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-[#c9c6bc] bg-[#315b42] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-white/35">
            <GiftMark />
          </span>
          <span className="font-serif text-2xl">The Family List</span>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Christmas {/* @__PURE__ */ new Date().getUTCFullYear()}
          </p>
          <h1 className="mt-5 font-serif text-5xl leading-[1.08] xl:text-6xl">
            Thoughtful gifts, without spoiling the surprise.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
            Keep wishes together, quietly claim presents, chip in on bigger
            gifts, and reveal your Secret Santa match.
          </p>
        </div>
        <p className="relative text-xs text-white/55">
          A private space for your family.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#9ea89f] bg-[#e4ece5] text-[#274c38]">
              <GiftMark />
            </span>
            <div>
              <p className="font-serif text-xl">The Family List</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#77786f]">
                Christmas {/* @__PURE__ */ new Date().getUTCFullYear()}
              </p>
            </div>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#657068]">
            Family access
          </p>
          <h2 className="mt-3 font-serif text-4xl">
            {mode === "forgot"
              ? "Reset your password"
              : mode === "reset"
                ? "Choose a new password"
                : mode === "login"
                  ? "Welcome back"
                  : "Create your account"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#6d6e67]">
            {mode === "login"
              ? "Sign in to see the family wishlists and your private gift choices."
              : mode === "register"
                ? invite
                  ? "Use your invitation to join the family."
                  : "Create a family, then invite everyone to add their wishes."
                : "Use your account email to recover access."}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-full border border-[#bbb8af] bg-[#eceae4] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${mode === "login" ? "bg-white shadow-sm" : "text-[#73766e]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold transition ${mode === "register" ? "bg-white shadow-sm" : "text-[#73766e]"}`}
            >
              Create account
            </button>
          </div>

          <form key={mode} onSubmit={submit} className="mt-7 space-y-5">
            {mode === "register" && (
              <label className="block text-xs font-semibold">
                Your name
                <input
                  className={fieldClass}
                  name="name"
                  autoComplete="given-name"
                  maxLength={60}
                  required
                />
              </label>
            )}
            {mode === "register" && !invite && (
              <label className="block text-xs font-semibold">
                Family name
                <input
                  name="family"
                  maxLength={80}
                  required
                  className={fieldClass}
                />
              </label>
            )}
            {mode !== "reset" && (
              <label className="block text-xs font-semibold">
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-lg border border-[#bbb8af] bg-white px-4 py-3 text-sm outline-none focus:border-[#315b42] focus:ring-1 focus:ring-[#315b42]"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <div className="text-xs font-semibold">
                <label htmlFor="account-password">Password</label>
                <div className="relative mt-2">
                  <input
                    id="account-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={256}
                    required
                    placeholder={
                      mode === "login"
                        ? "Your password"
                        : "At least 12 characters"
                    }
                    className="w-full rounded-lg border border-[#bbb8af] bg-white py-3 pl-4 pr-12 text-sm outline-none focus:border-[#315b42] focus:ring-1 focus:ring-[#315b42] [&::-ms-reveal]:hidden"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-controls="account-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg text-[#536659] hover:text-[#244934]"
                  >
                    <svg
                      aria-hidden="true"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      {showPassword && <path d="m3 3 18 18" />}
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {message && (
              <p role="status" className="text-sm text-[#315b42]">
                {message}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-[#d3aaa3] bg-[#f6e9e6] px-4 py-3 text-xs leading-relaxed text-[#7b3e36]"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center rounded-full bg-[#315b42] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#244934] disabled:cursor-wait disabled:opacity-60"
            >
              {pending
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in"
                  : mode === "forgot"
                    ? "Send reset link"
                    : mode === "reset"
                      ? "Save new password"
                      : "Create account"}
            </button>
          </form>
          {mode === "login" && (
            <button
              className="mt-4 text-xs text-[#315b42] underline"
              onClick={() => switchMode("forgot")}
            >
              Forgot your password?
            </button>
          )}

          <div className="mt-8 rounded-xl border border-dashed border-[#bdbab0] p-4 text-xs leading-relaxed text-[#77786f]">
            Gift selections, contributions, and Secret Santa matches stay hidden
            from their recipients.
          </div>
        </div>
      </section>
    </main>
  );
}
