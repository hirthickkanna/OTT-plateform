import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import PlanCard from "../components/PlanCard";
import { useAuth } from "../context/AuthContext";

export default function Subscribe() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api("/api/subscriptions/plans")
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = (planId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/subscribe/form?plan=${planId}`);
  };

  return (
    <main className="min-h-[80vh] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">
          Subscription
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
          Plans built for every viewer
        </h1>
        <p className="mt-4 text-zinc-500">
          Stream in stunning quality. Upgrade or downgrade whenever you like.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mx-auto mt-14 grid max-w-4xl gap-8 md:grid-cols-2 md:items-stretch">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              featured={plan.slug === "premium" || i === plans.length - 1}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>
      )}

      <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-white/5 bg-zinc-900/40 p-8">
        <h2 className="text-lg font-semibold text-white">What&apos;s included</h2>
        <ul className="mt-4 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
          <li className="flex items-center gap-2">
            <span className="text-rose-400">✓</span> Ad-free movie streaming
          </li>
          <li className="flex items-center gap-2">
            <span className="text-rose-400">✓</span> Watch on mobile &amp; TV
          </li>
          <li className="flex items-center gap-2">
            <span className="text-rose-400">✓</span> Secure Stripe checkout
          </li>
          <li className="flex items-center gap-2">
            <span className="text-rose-400">✓</span> Live channels on Premium
          </li>
        </ul>
        {!isAuthenticated && (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-rose-400 hover:text-rose-300">
              Sign in
            </Link>{" "}
            before subscribing.
          </p>
        )}
      </div>

      <p className="mt-10 text-center">
        <Link to="/" className="text-sm text-zinc-500 transition hover:text-zinc-300">
          ← Back to browse movies
        </Link>
      </p>
    </main>
  );
}
