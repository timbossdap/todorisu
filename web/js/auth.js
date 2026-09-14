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

  if (typeof applyAvatarDisplay === "function") {
    applyAvatarDisplay(currentUser);
  }

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

// Google / Gmail Sign In
const authGoogleBtn = $("authGoogleBtn");
if (authGoogleBtn) {
  authGoogleBtn.addEventListener("click", async () => {
    $("authError").textContent = "";
    authGoogleBtn.disabled = true;
    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent"
          }
        }
      });
      if (error) {
        $("authError").textContent = error.message;
        authGoogleBtn.disabled = false;
      }
    } catch (err) {
      $("authError").textContent = err.message || "Failed to start Google sign-in.";
      authGoogleBtn.disabled = false;
    }
  });
}

(async () => {
  const { data } = await sb.auth.getSession();
  if (data?.session) {
    onSignedIn(data.session);
  }

  // Clean OAuth tokens from URL after Google redirect
  if (window.location.hash && (window.location.hash.includes("access_token") || window.location.hash.includes("error"))) {
    setTimeout(() => {
      try {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch (_) {}
    }, 500);
  }
})();
