const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function createTrip(tripData: {
  user_id: number;
  destination: string;
  start_date?: string;
  end_date?: string;
  number_of_days: number;
  total_budget: number;
}) {
  const response = await fetch(`${API_URL}/api/trips/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tripData),
  });

  if (!response.ok) {
    throw new Error("Failed to create trip");
  }

  return response.json();
}