"use client";
import { useMemo, useRef, useState } from "react";
import { api } from "./api";
const tones = [
  "bg-[#dce8df]",
  "bg-[#f3dfd5]",
  "bg-[#e5e0d6]",
  "bg-[#e7dcec]",
  "bg-[#dbe6ee]",
  "bg-[#f0e6c9]",
];
function Icon({ name, size = 18 }) {
  const paths = {
    gift: (
      <>
        <path d="M3 9h18v12H3zM12 9v12M2 5h20v4H2z" />
        <path d="M12 5c-1.4 0-5-1-5-3 0-1.2 1-2 2.2-2C11 0 12 2.2 12 5Zm0 0c1.4 0 5-1 5-3 0-1.2-1-2-2.2-2C13 0 12 2.2 12 5Z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
function Avatar({ member, large = false }) {
  return (
    <div
      className={`${large ? "h-16 w-16 text-base" : "h-10 w-10 text-[11px]"} ${member.tone} grid shrink-0 place-items-center rounded-full border border-[#b9b6ad] font-semibold tracking-wider`}
    >
      {member.initials}
    </div>
  );
}
const formatAud = (amount) => `A$${amount.toFixed(2)}`;
export function WishlistApp({ state, refresh }) {
  const members = state.members.map((m, i) => ({
    ...m,
    initials: m.name.slice(0, 2).toUpperCase(),
    tone: tones[i % tones.length],
  }));
  const me = members.find((m) => m.id === state.me);
  const wishes = state.wishes;
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [invite, setInvite] = useState("");
  const [activeId, setActiveId] = useState(me.id);
  const [drawer, setDrawer] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [deletingWish, setDeletingWish] = useState(null);
  const [contributionWish, setContributionWish] = useState(null);
  const [secretOpen, setSecretOpen] = useState(false);
  const [secretMatch, setSecretMatch] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState("");
  const active = members.find((member) => member.id === activeId);
  const ownList = activeId === me.id;
  const activeWishes = useMemo(
    () => wishes.filter((wish) => wish.memberId === activeId),
    [wishes, activeId],
  );
  async function run(action) {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      busy.current = false;
    }
  }
  function selectGift(wish) {
    const claim = wish.selectedBy !== me.id;
    run(async () => {
      await api("claim", { id: wish.id, claim });
      await refresh();
      setNotice(
        claim
          ? "Gift reserved. Your selection is private."
          : "Selection undone.",
      );
    });
  }
  function saveWish(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      if (editingWish) await api("edit", { ...data, id: editingWish.id });
      else await api("add", data);
      setEditingWish(null);
      setAddOpen(false);
      await refresh();
      setActiveId(me.id);
      setNotice(
        editingWish
          ? "Your changes have been saved."
          : "Your wish has been added.",
      );
    });
  }
  function saveContribution(event) {
    event.preventDefault();
    if (!contributionWish) return;
    const amount = String(new FormData(event.currentTarget).get("amount"));
    run(async () => {
      await api("pledge", { id: contributionWish.id, amount });
      setContributionWish(null);
      await refresh();
      setNotice(
        Number(amount)
          ? "Your pledge has been saved."
          : "Your pledge has been withdrawn.",
      );
    });
  }
  function drawSecretSanta() {
    run(async () => {
      const { recipient } = await api("santa", {});
      setSecretMatch(members.find((m) => m.id === recipient));
      setRevealed(false);
    });
  }
  const logout = () =>
    run(async () => {
      await api("logout", {});
      location.assign("/login");
    });
  return (
    <div className="min-h-screen bg-[#f5f3ed] text-[#282925]">
      <header className="border-b border-[#c9c6bc] bg-[#f8f7f2]">
        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 lg:px-10">
          <button
            onClick={() => setActiveId(me.id)}
            className="flex items-center gap-3 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#9ea89f] bg-[#e4ece5] text-[#274c38]">
              <Icon name="gift" size={17} />
            </span>
            <span>
              <span className="block font-serif text-[21px] leading-none">
                Family List
              </span>
              <span className="mt-1 hidden text-[10px] uppercase tracking-[0.2em] text-[#77786f] sm:block">
                Christmas {/* @__PURE__ */ new Date().getUTCFullYear()}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium">{me.name}</p>
              <p className="text-[11px] text-[#77786f]">{state.email}</p>
            </div>
            <Avatar member={me} />
            <button
              onClick={logout}
              className="hidden h-9 items-center gap-2 rounded-full border border-[#c4c1b8] px-3 text-xs font-semibold sm:flex"
            >
              <Icon name="logout" size={14} /> Sign out
            </button>
            <button
              onClick={() => setDrawer(!drawer)}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#c4c1b8] lg:hidden"
              aria-label="Toggle family menu"
            >
              <Icon name={drawer ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[300px_1fr]">
        <aside
          className={`${drawer ? "block" : "hidden"} absolute inset-x-0 z-30 border-b border-[#c9c6bc] bg-[#f8f7f2] p-5 lg:static lg:block lg:min-h-[calc(100vh-72px)] lg:border-r lg:border-b-0 lg:px-7 lg:py-9`}
        >
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#77786f]">
            {state.family}
          </p>
          {state.owner && (
            <button
              className="mb-4 text-xs font-semibold text-[#315b42] underline"
              onClick={() =>
                run(async () => setInvite((await api("invite", {})).code))
              }
            >
              Invite a family member
            </button>
          )}
          <nav className="space-y-1">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  setActiveId(member.id);
                  setDrawer(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${activeId === member.id ? "border-[#a9afa7] bg-white shadow-sm" : "border-transparent hover:bg-white/60"}`}
              >
                <Avatar member={member} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {member.name}{" "}
                    {member.id === me.id && (
                      <span className="font-normal text-[#77786f]">(you)</span>
                    )}
                  </span>
                  <span className="text-xs text-[#85857d]">
                    {
                      wishes.filter((wish) => wish.memberId === member.id)
                        .length
                    }{" "}
                    wishes
                  </span>
                </span>
                <Icon name="arrow" size={14} />
              </button>
            ))}
          </nav>
          <button
            onClick={() => {
              setRevealed(false);
              setSecretOpen(true);
              setDrawer(false);
            }}
            className="mt-6 flex w-full items-center gap-3 rounded-xl border border-[#9eaaa0] bg-[#edf2ed] p-4 text-left"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#315b42] text-white">
              <Icon name="lock" size={16} />
            </span>
            <span className="flex-1">
              <span className="block text-xs font-semibold">Secret Santa</span>
              <span className="text-[11px] text-[#657068]">
                Reveal your private match
              </span>
            </span>
            <Icon name="arrow" size={14} />
          </button>
          <button
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[#c4c1b8] px-4 py-2.5 text-xs font-semibold sm:hidden"
          >
            <Icon name="logout" size={14} /> Sign out
          </button>
        </aside>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-[900px]">
            <div className="flex flex-col gap-6 border-b border-[#c9c6bc] pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-5">
                <Avatar member={active} large />
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#73766e]">
                    {ownList ? "Your wishlist" : "Family wishlist"}
                  </p>
                  <h1 className="font-serif text-4xl leading-none sm:text-5xl">
                    {active.name}’s wishes
                  </h1>
                </div>
              </div>
              {ownList && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#315b42] px-5 text-sm font-semibold text-white"
                >
                  <Icon name="plus" size={17} /> Add a wish
                </button>
              )}
            </div>
            <div className="flex items-center justify-between py-6">
              <p className="text-sm text-[#6f716a]">
                {activeWishes.length} ideas for Christmas
              </p>
              {!ownList && (
                <p className="hidden text-xs text-[#87877f] sm:block">
                  Selections stay hidden from {active.name}
                </p>
              )}
            </div>
            {notice && (
              <div
                role="status"
                className="mb-5 flex items-center justify-between rounded-lg border border-[#9db1a2] bg-[#e9f0e9] px-4 py-3 text-sm text-[#294d37]"
              >
                <span className="flex items-center gap-2">
                  <Icon name="check" size={16} />
                  {notice}
                </span>
                <button
                  aria-label="Dismiss message"
                  onClick={() => setNotice("")}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            )}
            <div className="space-y-3">
              {!activeWishes.length && (
                <p className="rounded-xl border border-[#cbc8bf] p-5 text-sm text-[#6d6e67]">
                  {ownList
                    ? "Add your first Christmas wish."
                    : "No wishes yet."}
                </p>
              )}
              {activeWishes.map((wish, index) => {
                const mine = wish.selectedBy === me.id;
                const taken = Boolean(wish.selectedBy && !mine);
                const contributions = wish.contributions ?? [];
                const mineContribution = contributions.find(
                  (entry) => entry.memberId === me.id,
                );
                const total = contributions.reduce(
                  (sum, entry) => sum + entry.amount,
                  0,
                );
                return (
                  <article
                    key={wish.id}
                    className={`rounded-xl border bg-[#faf9f5] p-5 sm:p-6 ${mine || mineContribution ? "border-[#718e78] shadow-[inset_4px_0_0_#718e78]" : "border-[#cbc8bf]"}`}
                  >
                    <div className="flex gap-4">
                      <span className="font-serif text-xl text-[#aaa79f]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="font-serif text-xl">
                                {wish.title}
                              </h2>
                              {mine && (
                                <span className="rounded-full bg-[#dce9df] px-2 py-1 text-[10px] font-semibold uppercase text-[#315b42]">
                                  Your gift
                                </span>
                              )}
                              {taken && !ownList && (
                                <span className="rounded-full border px-2 py-1 text-[10px] uppercase text-[#77786f]">
                                  Taken
                                </span>
                              )}
                              {contributions.length > 0 && !ownList && (
                                <span className="rounded-full border border-[#9eaa9f] px-2 py-1 text-[10px] font-semibold uppercase text-[#4d6655]">
                                  Joint gift
                                </span>
                              )}
                            </div>
                            <p className="mt-2 text-sm text-[#6d6e67]">
                              {wish.note}
                            </p>
                            <span className="mt-4 inline-block rounded-md border border-[#d6d3cb] bg-white px-2.5 py-1.5 text-xs font-medium">
                              {wish.price}
                            </span>
                            {contributions.length > 0 && !ownList && (
                              <div className="mt-4 rounded-lg border border-[#c9d1ca] bg-[#edf2ed] p-3 text-xs">
                                <p className="flex items-center gap-2 font-semibold">
                                  <Icon name="people" size={14} />
                                  {formatAud(total)} pledged
                                </p>
                                <p className="mt-2 text-[#59645b]">
                                  {contributions
                                    .map(
                                      (entry) =>
                                        `${members.find((member) => member.id === entry.memberId)?.name} ${formatAud(entry.amount)}`,
                                    )
                                    .join(" · ")}
                                </p>
                              </div>
                            )}
                          </div>
                          {ownList && (
                            <div className="flex shrink-0 items-start gap-3 text-xs font-semibold text-[#315b42]">
                              <button
                                onClick={() => setEditingWish(wish)}
                                className="rounded-full border px-4 py-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingWish(wish)}
                                className="px-2 py-2 text-[#783d34]"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                          {!ownList && !taken && (
                            <div className="flex shrink-0 flex-col gap-2">
                              {contributions.length === 0 && (
                                <button
                                  onClick={() => selectGift(wish)}
                                  className={`rounded-full border px-4 py-2.5 text-xs font-semibold ${mine ? "border-[#78917e] bg-[#e5eee7] text-[#315b42]" : "border-[#373a35]"}`}
                                >
                                  {mine ? "Undo selection" : "I’ll get this"}
                                </button>
                              )}
                              {!mine && (
                                <button
                                  onClick={() => setContributionWish(wish)}
                                  className="flex items-center justify-center gap-2 rounded-full border border-[#9da59e] px-4 py-2.5 text-xs font-semibold text-[#3f5947]"
                                >
                                  <Icon name="people" size={14} />
                                  {mineContribution
                                    ? "Change amount"
                                    : contributions.length
                                      ? "Join this gift"
                                      : "Split the cost"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {error && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 z-[60] w-[90%] max-w-md -translate-x-1/2 rounded-lg bg-[#783d34] px-4 py-3 text-white"
        >
          {error}{" "}
          <button className="underline" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      {invite && (
        <Modal title="Invite a family member" onClose={() => setInvite("")}>
          <p className="text-sm">
            Share this single-use link privately. It expires in seven days.
          </p>
          <input
            aria-label="Invitation link"
            readOnly
            onFocus={(e) => e.target.select()}
            value={location.origin + "/login#invite=" + invite}
            className="mt-4 w-full rounded-lg border bg-white p-3"
          />
        </Modal>
      )}
      {(addOpen || editingWish) && (
        <Modal
          title={editingWish ? "Edit wish" : "Add a new wish"}
          onClose={() => {
            setEditingWish(null);
            setAddOpen(false);
          }}
        >
          <form onSubmit={saveWish} className="space-y-4">
            <Field
              label="What would you like?"
              name="title"
              maxLength={160}
              defaultValue={editingWish?.title}
              required
            />
            <Field
              label="Details"
              name="note"
              maxLength={600}
              defaultValue={editingWish?.note}
            />
            <Field
              label="Price guide"
              name="price"
              maxLength={100}
              defaultValue={editingWish?.price}
              placeholder="e.g. Around A$50"
            />
            <button className="w-full rounded-full bg-[#315b42] px-5 py-3 text-sm font-semibold text-white">
              {editingWish ? "Save changes" : "Add wish"}
            </button>
          </form>
        </Modal>
      )}
      {deletingWish && (
        <Modal title="Delete wish?" onClose={() => setDeletingWish(null)}>
          <p className="text-sm">
            Remove “{deletingWish.title}” from your wishlist?
          </p>
          <div className="mt-5 flex justify-end gap-3 text-sm font-semibold">
            <button
              onClick={() => setDeletingWish(null)}
              className="rounded-full border px-5 py-2"
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-[#783d34] px-5 py-2 text-white"
              onClick={() =>
                run(async () => {
                  await api("delete", { id: deletingWish.id });
                  setDeletingWish(null);
                  await refresh();
                  setNotice("Your wish has been deleted.");
                })
              }
            >
              Delete wish
            </button>
          </div>
        </Modal>
      )}
      {contributionWish && (
        <Modal
          title="Chip in together"
          onClose={() => setContributionWish(null)}
        >
          <p className="rounded-lg border bg-white p-4 font-serif text-lg">
            {contributionWish.title}
          </p>
          <form onSubmit={saveContribution} className="mt-5 space-y-5">
            <label className="block text-xs font-semibold">
              Your amount
              <div className="mt-2 flex rounded-lg border bg-white">
                <span className="border-r px-4 py-3">A$</span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  max="999999"
                  step=".01"
                  required
                  defaultValue={
                    contributionWish.contributions?.find(
                      (entry) => entry.memberId === me.id,
                    )?.amount ?? 30
                  }
                  className="min-w-0 flex-1 bg-transparent px-4 outline-none"
                />
              </div>
            </label>
            <p className="text-[11px] text-[#77786f]">
              Enter zero to withdraw. Other gift buyers can see your name and
              amount. {active.name} cannot.
            </p>
            <button className="w-full rounded-full bg-[#315b42] px-5 py-3 text-sm font-semibold text-white">
              Confirm amount
            </button>
          </form>
        </Modal>
      )}
      {secretOpen && (
        <Modal title="Secret Santa" onClose={() => setSecretOpen(false)}>
          {!secretMatch ? (
            <div>
              <p className="text-sm leading-relaxed text-[#6d6e67]">
                The first draw pairs everyone who has joined for this Christmas.
                Invite the whole family before drawing. Your match stays
                private.
              </p>
              <button
                onClick={drawSecretSanta}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#315b42] px-5 py-3 text-sm font-semibold text-white"
              >
                <Icon name="gift" size={16} /> Draw my name
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-28 items-center justify-center rounded-lg border border-dashed bg-white">
                {revealed ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#657068]">
                      You’re buying for
                    </p>
                    <p className="mt-2 font-serif text-3xl">
                      {secretMatch.name}
                    </p>
                  </div>
                ) : (
                  <span className="flex items-center gap-2 text-xs text-[#77786f]">
                    <Icon name="lock" size={15} /> Hidden until you reveal
                  </span>
                )}
              </div>
              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#315b42] px-6 py-3 text-sm font-semibold text-white"
                >
                  <Icon name="eye" size={16} /> Reveal my person
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveId(secretMatch.id);
                    setSecretOpen(false);
                  }}
                  className="mt-5 text-xs font-semibold text-[#3f5947] underline underline-offset-4"
                >
                  View {secretMatch.name}’s wishlist
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#252823]/35 backdrop-blur-[2px] sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-t-2xl border border-[#bdbab1] bg-[#f8f7f2] p-6 shadow-2xl sm:rounded-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-serif text-3xl">{title}</h2>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border"
            aria-label="Close"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Field({ label, ...props }) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <input
        {...props}
        className="mt-2 w-full rounded-lg border border-[#bbb8af] bg-white px-4 py-3 text-sm outline-none focus:border-[#315b42]"
      />
    </label>
  );
}
