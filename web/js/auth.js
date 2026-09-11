// ============================================================
// AUTH
// ============================================================
let isSignUp = false;

$("authToggle").addEventListener("click", () => {
  isSignUp = !isSignUp;
  $("authSubmit").textContent = isSignUp ? "Create account" : "Sign in";
  $("authToggle").textContent = isSignUp ? "Already have an account? Sign in" : "Need an account? Create one";
});

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("authError").textContent = "";
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const fn = isSignUp ? sb.auth.signUp : sb.auth.signInWithPassword;
  const { data, error } = await fn.call(sb.auth, { email, password });
  if (error) { $("authError").textContent = error.message; return; }
  if (isSignUp && !data.session) {
    $("authError").textContent = "Account created. Check your email to confirm, then sign in.";
    return;
  }
  onSignedIn(data.session);
});

sb.auth.onAuthStateChange((_event, session) => {
  if (session) onSignedIn(session);
});

async function onSignedIn(session) {
  currentUser = session.user;
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");

  const name = currentUser.email ? (currentUser.email.split("@")[0] || "Timothy") : "Timothy";
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
  const userNameEl = $("userName");
  if (userNameEl) userNameEl.textContent = capitalName;
  const userAvatarEl = $("userAvatar");
  if (userAvatarEl) userAvatarEl.textContent = capitalName.charAt(0);
  const menuUserNameEl = $("menuUserName");
  if (menuUserNameEl) menuUserNameEl.textContent = `${capitalName} Ng`;

  if (window.AndroidBridge && window.AndroidBridge.onAuth) {
    window.AndroidBridge.onAuth(session.access_token, session.refresh_token, session.user.id);
  }

  await loadTasks();
  render();
}

async function handleSignOut() {
  await sb.auth.signOut();
  if (window.AndroidBridge && window.AndroidBridge.onSignOut) window.AndroidBridge.onSignOut();
  location.reload();
}
const signOutBtnEl = $("signOutBtn");
if (signOutBtnEl) {
  signOutBtnEl.addEventListener("click", handleSignOut);
}

(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) onSignedIn(data.session);
})();
