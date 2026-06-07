import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-zinc-800/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition";
const labelCls = "mb-1.5 block text-sm font-medium text-zinc-300";

export default function SubscribeForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, loadProfile } = useAuth();
  const planId = searchParams.get("plan");

  const [plan, setPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [form, setForm] = useState({
    fullName: user?.displayName || "",
    phone: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/subscribe/form${planId ? `?plan=${planId}` : ""}`);
      return;
    }
    api("/api/subscriptions/plans")
      .then((data) => {
        setPlans(data);
        const found = data.find((p) => p._id === planId) || data[0];
        setPlan(found);
      })
      .catch(console.error)
      .finally(() => setLoadingPlan(false));
  }, [isAuthenticated, planId]);

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api("/api/subscriptions/register", {
        method: "POST",
        body: JSON.stringify({ planId: plan._id, ...form }),
      });

      if (res.razorpayOrderId) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError("Razorpay SDK failed to load. Are you offline?");
          setSubmitting(false);
          return;
        }

        const options = {
          key: res.keyId,
          amount: res.amount,
          currency: res.currency,
          name: "StreamVault",
          description: `Subscription - ${plan.name}`,
          order_id: res.razorpayOrderId,
          prefill: {
            name: form.fullName,
            contact: form.phone,
            email: user?.email,
          },
          handler: async function (response) {
            setSubmitting(true);
            try {
              const verifyRes = await api("/api/subscriptions/razorpay-verify", {
                method: "POST",
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  subscriptionId: res.subscriptionId,
                }),
              });
              if (verifyRes.success) {
                await loadProfile();
                navigate("/account?subscribed=1");
              } else {
                setError("Payment verification failed.");
              }
            } catch (err) {
              setError(err.message || "Verification failed");
            } finally {
              setSubmitting(false);
            }
          },
          theme: {
            color: "#E11D48",
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else if (res.url) {
        window.location.href = res.url;
      } else {
        // Dev mode — no Stripe or Razorpay, plan activated directly
        await loadProfile();
        navigate("/account?subscribed=1");
      }
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const formatPrice = (p) => {
    if (!p) return "—";
    return p.priceCents % 100 === 0 
      ? (p.priceCents / 100).toFixed(0) 
      : (p.priceCents / 100).toFixed(2);
  };
  const price = formatPrice(plan);

  return (
    <main className="min-h-[80vh] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link to="/subscribe" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to plans
        </Link>

        {/* Header */}
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">Subscription</span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Complete your subscription</h1>
          <p className="mt-2 text-zinc-500">Fill in your details to activate your plan.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 rounded-2xl border border-white/8 bg-zinc-900/60 p-6 backdrop-blur-sm"
          >
            <h2 className="mb-5 text-base font-semibold text-white">Your Details</h2>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                ⚠ {error}
              </div>
            )}

            <div className="flex flex-col gap-5">
              {/* Full Name */}
              <div>
                <label className={labelCls}>
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="John Doe"
                  className={inputCls}
                />
              </div>

              {/* Email — read only from auth */}
              <div>
                <label className={labelCls}>Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className={`${inputCls} cursor-not-allowed opacity-60`}
                />
                <p className="mt-1 text-xs text-zinc-600">Your account email — cannot be changed here.</p>
              </div>

              {/* Mobile */}
              <div>
                <label className={labelCls}>
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>

              {/* Address */}
              <div>
                <label className={labelCls}>Address <span className="text-zinc-600 text-xs">(optional)</span></label>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="123 Main St, Chennai, Tamil Nadu"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Plan selector */}
              <div>
                <label className={labelCls}>Selected Plan</label>
                <div className="flex flex-wrap gap-3">
                  {plans.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setPlan(p)}
                      className={`flex-1 min-w-[120px] rounded-xl border px-4 py-3 text-sm font-medium transition ${
                        plan?._id === p._id
                          ? "border-rose-500/60 bg-rose-600/15 text-white"
                          : "border-white/10 bg-zinc-800/40 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-xs opacity-70">₹{formatPrice(p)}/{p.interval || "month"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !plan}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  Confirm & Continue to Payment
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs text-zinc-600">
              🔒 Your details are saved securely. You can cancel anytime.
            </p>
          </form>

          {/* ── Order Summary ── */}
          <div className="lg:col-span-2 space-y-4">
            {plan && (
              <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-950/30 to-zinc-900/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-3">Order Summary</p>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold text-white">{plan.name}</span>
                  <span className="text-2xl font-bold text-white">₹{price}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">30 days access • One-time payment</p>

                <hr className="my-4 border-white/5" />

                <ul className="space-y-2">
                  {plan.features?.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 text-xs text-zinc-500 space-y-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Secure payment checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Automatically expires after 30 days (no auto-renewal)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <span>Instant access after payment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
