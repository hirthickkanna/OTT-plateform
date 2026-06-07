import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ContentRow from "../components/ContentRow";
import MovieSlider from "../components/MovieSlider";
import PlanCard from "../components/PlanCard";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, isOffline, downloads, subscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const daysRemaining = subscription?.currentPeriodEnd
    ? Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  useEffect(() => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const endpoint = searchQuery ? `/api/videos?search=${encodeURIComponent(searchQuery)}` : "/api/videos";
    api(endpoint)
      .then(setMovies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery, isOffline]);

  const displayMovies = isOffline
    ? (searchQuery
        ? downloads.filter((m) =>
            m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.genre && m.genre.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : downloads)
    : movies;

  useEffect(() => {
    api("/api/subscriptions/plans").then(setPlans).catch(console.error);
  }, []);

  useEffect(() => {
    const endpoint = isAuthenticated ? "/api/recommendations" : "/api/recommendations/trending";
    api(endpoint)
      .then(setRecommendations)
      .catch(() => api("/api/recommendations/trending").then(setRecommendations).catch(() => {}));
  }, [isAuthenticated]);

  const moreMovies = isOffline ? [] : displayMovies.slice(4);

  const scrollToPlans = () => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  };

  const checkout = (planId) => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(`/subscribe/form?plan=${planId}`);
  };

  return (
    <div className="pb-16">
      {/* Expiry Warning Banner */}
      {isAuthenticated && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0 && (
        <div className="mx-4 mt-6 mb-4 rounded-2xl border border-amber-500/25 bg-amber-600/10 p-5 shadow-lg sm:mx-6 lg:mx-10 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-white tracking-wide">Your plan is expiring soon!</h2>
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                Only {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left of your {subscription?.planId?.name || ""} subscription. 
                Choose a plan to renew and keep streaming your favorite titles.
              </p>
            </div>
            <button
              onClick={scrollToPlans}
              className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold transition shrink-0 self-center"
            >
              Renew Now
            </button>
          </div>
        </div>
      )}

      {/* Offline Warning Banner */}
      {isOffline && (
        <div className="mx-4 mt-6 mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center shadow-lg sm:mx-6 lg:mx-10 backdrop-blur-sm animate-pulse-subtle">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 mb-3 border border-amber-500/25">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
          <h2 className="text-lg font-bold text-white tracking-wide">Browsing Offline Mode</h2>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-400">
            You're viewing movies saved to your database downloads. Switch to online mode in the navigation bar to stream the entire catalog.
          </p>
        </div>
      )}

      {!searchQuery && !isOffline && <MovieSlider movies={movies} onBrowsePlans={scrollToPlans} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div id="movies" className="scroll-mt-24 pt-8">
            <ContentRow
              title={isOffline ? "Offline Downloads" : searchQuery ? `Search results for "${searchQuery}"` : "Movies"}
              subtitle={isOffline ? `Showing ${displayMovies.length} saved titles` : searchQuery ? `Found ${displayMovies.length} matches` : "Stream the latest films in our catalog"}
              items={displayMovies}
              variant="video"
            />
          </div>

          {moreMovies.length > 0 && !searchQuery && !isOffline && (
            <ContentRow
              title="New releases"
              subtitle="Recently added to the library"
              items={moreMovies}
              variant="video"
            />
          )}

          {recommendations.length > 0 && !isOffline && (
            <ContentRow
              title={isAuthenticated ? "More movies for you" : "More movies you might like"}
              subtitle={
                isAuthenticated
                  ? "Personalized picks based on your watch history"
                  : "Popular picks trending right now"
              }
              items={recommendations}
              variant="recommendation"
            />
          )}

          {displayMovies.length === 0 && !loading && (
            <div className="mx-4 rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-8 py-16 text-center sm:mx-6 lg:mx-10">
              <p className="text-lg text-zinc-400">
                {isOffline
                  ? (searchQuery
                      ? `No downloaded movies found matching "${searchQuery}".`
                      : "You have no downloaded movies yet. Go online to download movies.")
                  : searchQuery
                  ? `No movies found matching "${searchQuery}".`
                  : "No movies yet. Check back soon or upload from Creator."}
              </p>
              {!searchQuery && !isOffline && (
                <Link
                  to="/creator"
                  className="mt-4 inline-block text-sm font-medium text-rose-400 hover:text-rose-300"
                >
                  Go to Creator dashboard →
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {!isOffline && <section id="plans" className="scroll-mt-24 border-t border-white/5 bg-zinc-950/50 px-4 py-16 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-rose-400">Membership</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Choose your subscription plan
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-zinc-500">
            Unlock HD and 4K streaming, multiple devices, and premium titles. Cancel anytime.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2 md:items-center">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              featured={plan.slug === "premium" || i === plans.length - 1}
              onSubscribe={checkout}
            />
          ))}
        </div>

        {plans.length > 0 && (
          <p className="mt-8 text-center">
            <Link
              to="/subscribe"
              className="text-sm font-medium text-rose-400 transition hover:text-rose-300"
            >
              Compare all plan details →
            </Link>
          </p>
        )}
      </section>}
    </div>
  );
}
