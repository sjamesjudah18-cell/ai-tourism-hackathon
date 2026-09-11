"use client";

import { useState } from "react";
import { createTrip } from "../../lib/api";

export default function PlannerPage() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("3");
  const [travelers, setTravelers] = useState("2");
  const [budget, setBudget] = useState("");
  const [transport, setTransport] = useState("Any");
  const [hotel, setHotel] = useState("Comfort");
  const [interests, setInterests] = useState<string[]>([]);

  const interestOptions = [
    "🏛️ History",
    "🍜 Food",
    "🏖️ Beaches",
    "🏔️ Nature",
    "📸 Photography",
    "🎭 Culture",
    "🛍️ Shopping",
    "🎢 Adventure",
  ];

  const toggleInterest = (interest: string) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  const handleSubmit = async () => {
  if (!destination.trim()) {
    alert("Please enter a destination.");
    return;
  }

  if (!budget) {
    alert("Please enter your budget.");
    return;
  }

  try {
    const result = await createTrip({
      user_id: 1,
      destination: destination,
      number_of_days: Number(days),
      total_budget: Number(budget),
    });

    console.log("Trip created:", result);

    alert(`Trip created successfully for ${destination}!`);
  } catch (error) {
    console.error("Error creating trip:", error);

    alert(
      "Could not connect to the backend. Make sure your FastAPI server is running."
    );
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-6 py-12">

      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            AI Trip Planner
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Plan your perfect trip
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Tell us about your journey and our AI will create a personalized
            travel experience around your interests and budget.
          </p>
        </div>

        {/* Form */}
        <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl md:p-10">

          {/* Destination */}
          <div>
            <label className="text-sm font-semibold">
              📍 Where do you want to go?
            </label>

            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Example: Hyderabad, Goa, Paris..."
              className="mt-3 w-full rounded-xl border px-5 py-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Days + Travelers */}
          <div className="mt-7 grid gap-6 md:grid-cols-2">

            <div>
              <label className="text-sm font-semibold">
                📅 Number of days
              </label>

              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="mt-3 w-full rounded-xl border bg-white px-5 py-4 outline-none focus:border-blue-500"
              >
                <option value="1">1 day</option>
                <option value="2">2 days</option>
                <option value="3">3 days</option>
                <option value="4">4 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="10">10 days</option>
                <option value="14">14 days</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">
                👥 Travelers
              </label>

              <select
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                className="mt-3 w-full rounded-xl border bg-white px-5 py-4 outline-none focus:border-blue-500"
              >
                <option value="1">1 traveler</option>
                <option value="2">2 travelers</option>
                <option value="3">3 travelers</option>
                <option value="4">4 travelers</option>
                <option value="5">5 travelers</option>
                <option value="6">6 travelers</option>
                <option value="10">10+ travelers</option>
              </select>
            </div>

          </div>

          {/* Budget */}
          <div className="mt-7">
            <label className="text-sm font-semibold">
              💰 Total trip budget
            </label>

            <div className="relative mt-3">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-semibold text-gray-500">
                ₹
              </span>

              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Example: 20000"
                className="w-full rounded-xl border py-4 pl-10 pr-5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Interests */}
          <div className="mt-7">

            <label className="text-sm font-semibold">
              ❤️ What are you interested in?
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">

              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    interests.includes(interest)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "bg-white hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  {interest}
                </button>
              ))}

            </div>
          </div>

          {/* Transport + Hotel */}
          <div className="mt-7 grid gap-6 md:grid-cols-2">

            <div>
              <label className="text-sm font-semibold">
                🚗 Preferred transport
              </label>

              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className="mt-3 w-full rounded-xl border bg-white px-5 py-4 outline-none focus:border-blue-500"
              >
                <option>Any</option>
                <option>Car</option>
                <option>Public Transport</option>
                <option>Taxi / Cab</option>
                <option>Walking</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">
                🏨 Accommodation
              </label>

              <select
                value={hotel}
                onChange={(e) => setHotel(e.target.value)}
                className="mt-3 w-full rounded-xl border bg-white px-5 py-4 outline-none focus:border-blue-500"
              >
                <option>Budget</option>
                <option>Comfort</option>
                <option>Luxury</option>
              </select>
            </div>

          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="mt-10 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700"
          >
            ✨ Create My Trip
          </button>

        </div>

        {/* Bottom note */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Your preferences will be used by our AI recommendation engine to
          build your personalized itinerary.
        </p>

      </div>

    </main>
  );
}