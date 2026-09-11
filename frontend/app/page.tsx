export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b">
        <div className="text-2xl font-bold">
          Smart<span className="text-blue-600">Tourism</span>
        </div>

        <div className="hidden md:flex gap-8 text-sm font-medium">
          <a href="#" className="hover:text-blue-600">Explore</a>
          <a href="#" className="hover:text-blue-600">Plan Trip</a>
          <a href="#" className="hover:text-blue-600">Hotels</a>
          <a href="#" className="hover:text-blue-600">Places</a>
        </div>

        <button className="rounded-full bg-blue-600 px-5 py-2 text-white font-medium hover:bg-blue-700">
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center bg-gradient-to-b from-blue-50 to-white">

        <div className="mx-auto max-w-4xl">

          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-600">
            AI-Powered Travel Planning
          </p>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Your entire journey,
            <br />
            <span className="text-blue-600">planned intelligently.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Discover destinations, find the best places and hotels,
            optimize your budget, and create a personalized itinerary
            with AI.
          </p>

          {/* Search */}
          <div className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-xl md:flex-row">

            <input
              type="text"
              placeholder="Where do you want to go?"
              className="flex-1 rounded-xl border px-5 py-4 outline-none focus:border-blue-500"
            />

            <a
               href="/planner"
               className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700"
             >
              Plan My Trip
            </a>

          </div>

        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">

        <div className="mx-auto max-w-6xl">

          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Everything in one place
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Travel planning, reimagined.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">

            <div className="rounded-2xl border p-7 hover:shadow-lg">
              <div className="text-3xl">🤖</div>
              <h3 className="mt-5 text-xl font-bold">
                AI Trip Planner
              </h3>
              <p className="mt-3 text-gray-600">
                Tell us what you want and AI creates a personalized
                travel plan based on your interests.
              </p>
            </div>

            <div className="rounded-2xl border p-7 hover:shadow-lg">
              <div className="text-3xl">💰</div>
              <h3 className="mt-5 text-xl font-bold">
                Smart Budgeting
              </h3>
              <p className="mt-3 text-gray-600">
                Optimize hotels, activities and travel expenses
                while staying within your budget.
              </p>
            </div>

            <div className="rounded-2xl border p-7 hover:shadow-lg">
              <div className="text-3xl">🗺️</div>
              <h3 className="mt-5 text-xl font-bold">
                Smart Routes
              </h3>
              <p className="mt-3 text-gray-600">
                Get optimized routes between your destinations,
                attractions, restaurants and hotels.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl rounded-3xl bg-blue-600 px-8 py-16 text-center text-white">

          <h2 className="text-4xl font-bold">
            Ready to plan your next adventure?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            Let AI build a personalized journey around your
            destination, interests and budget.
          </p>

          <button className="mt-8 rounded-full bg-white px-8 py-3 font-semibold text-blue-600 hover:bg-gray-100">
            Start Planning
          </button>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-8 py-8 text-center text-sm text-gray-500">
        © 2026 Smart Tourism. AI-powered travel planning.
      </footer>

    </main>
  );
}