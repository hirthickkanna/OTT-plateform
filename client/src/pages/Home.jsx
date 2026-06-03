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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  useEffect(() => {
    setLoading(true);
    const endpoint = searchQuery ? `/api/videos?search=${encodeURIComponent(searchQuery)}` : "/api/videos";
    api(endpoint)
      .then(setMovies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery]);

  useEffect(() => {
    api("/api/subscriptions/plans").then(setPlans).catch(console.error);
  }, []);

  useEffect(() => {
    const endpoint = isAuthenticated ? "/api/recommendations" : "/api/recommendations/trending";
    api(endpoint)
      .then(setRecommendations)
      .catch(() => api("/api/recommendations/trending").then(setRecommendations).catch(() => {}));
  }, [isAuthenticated]);

  const moreMovies = movies.slice(4);

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
      {!searchQuery && <MovieSlider movies={movies} onBrowsePlans={scrollToPlans} />}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div id="movies" className="scroll-mt-24 pt-8">
            <ContentRow
              title={searchQuery ? `Search results for "${searchQuery}"` : "Movies"}
              subtitle={searchQuery ? `Found ${movies.length} matches` : "Stream the latest films in our catalog"}
              items={movies}
              variant="video"
            />
          </div>

          {moreMovies.length > 0 && !searchQuery && (
            <ContentRow
              title="New releases"
              subtitle="Recently added to the library"
              items={moreMovies}
              variant="video"
            />
          )}

          {recommendations.length > 0 && (
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

          {movies.length === 0 && !loading && (
            <div className="mx-4 rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 px-8 py-16 text-center sm:mx-6 lg:mx-10">
              <p className="text-lg text-zinc-400">
                {searchQuery
                  ? `No movies found matching "${searchQuery}".`
                  : "No movies yet. Check back soon or upload from Creator."}
              </p>
              {!searchQuery && (
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

      <section id="plans" className="scroll-mt-24 border-t border-white/5 bg-zinc-950/50 px-4 py-16 sm:px-6 lg:px-10">
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
      </section>
    </div>
  );
}
