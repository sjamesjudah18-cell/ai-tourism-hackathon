"use client";

import { DataLabelChip, StatusBadge } from "../RealityPrimitives";

/**
 * Weather detail: current conditions, the per-trip-day forecast, and - where
 * they genuinely exist - marine and air quality.
 *
 * Every block here renders only when the underlying data is present. Missing
 * marine data shows the "unavailable" note rather than an empty calm-sea card.
 */
export default function WeatherDetails({ details }: { details: any }) {
  const current = details?.current ?? {};
  const forecast: any[] = details?.forecast ?? [];
  const marine = details?.marine;
  const air = details?.air_quality;

  return (
    <div className="space-y-5">
      {/* ----------------------- Current conditions ---------------------- */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
            Right now
          </h3>
          <DataLabelChip label={current.is_live ? "LIVE" : "FALLBACK"} />
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Temperature" value={current.temperature?.value ?? "—"} />
          <Stat label="Feels like" value={current.feels_like?.value ?? "—"} />
          <Stat label="Condition" value={current.condition ?? "—"} />
          <Stat label="Humidity" value={current.humidity ?? "—"} />
        </div>
      </div>

      {/* -------------------------- Forecast ----------------------------- */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
            Your travel days
          </h3>
          <DataLabelChip label={details?.forecast_label ?? "UNAVAILABLE"} />
        </div>

        {forecast.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-black/10 bg-[#faf9f7] px-3.5 py-3 text-xs text-[#6b6b66]">
            {details?.forecast_note ??
              "A day-by-day forecast is not available for these dates."}
          </p>
        ) : (
          <div className="mt-2.5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 text-[10px] uppercase tracking-wider text-[#b5b5ad]">
                  <th className="pb-2 pr-3 font-semibold">Day</th>
                  <th className="pb-2 pr-3 font-semibold">Conditions</th>
                  <th className="pb-2 pr-3 font-semibold">High</th>
                  <th className="pb-2 pr-3 font-semibold">Rain</th>
                  <th className="pb-2 font-semibold">Outdoors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {forecast.map((day) => (
                  <tr key={day.trip_day} className="align-top">
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-[#171717]">
                        Day {day.trip_day}
                      </span>
                      <span className="ml-1.5 text-[11px] text-[#b5b5ad]">
                        {day.date}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#55554f]">
                      {day.condition}
                    </td>
                    <td className="py-2.5 pr-3 text-[#55554f]">
                      {day.temp_max_c != null ? `${Math.round(day.temp_max_c)}°C` : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-[#55554f]">
                      {day.rain_probability_pct != null
                        ? `${Math.round(day.rain_probability_pct)}%`
                        : "—"}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={day.outdoor_suitability} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {forecast.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {forecast.slice(0, 4).map((day) =>
              day.advice?.[0] ? (
                <li key={day.trip_day} className="text-xs text-[#6b6b66]">
                  <span className="font-semibold text-[#171717]">
                    Day {day.trip_day}:
                  </span>{" "}
                  {day.advice[0]}
                </li>
              ) : null
            )}
          </ul>
        )}
      </div>

      {/* --------------------- Marine (coastal only) --------------------- */}
      {(marine || details?.marine_unavailable) && (
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
              Beach & sea conditions
            </h3>
            <DataLabelChip label={marine ? "LIVE" : "UNAVAILABLE"} />
          </div>

          {marine ? (
            <div className="mt-2.5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Stat
                  label="Wave height"
                  value={`${marine.wave_height_m?.value ?? "—"} m`}
                />
                <Stat
                  label="Wave period"
                  value={
                    marine.wave_period_s != null ? `${marine.wave_period_s} s` : "—"
                  }
                />
                <Stat
                  label="Sea temp"
                  value={
                    marine.sea_surface_temperature_c != null
                      ? `${Math.round(marine.sea_surface_temperature_c)}°C`
                      : "—"
                  }
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#55554f]">
                {marine.assessment?.text}
              </p>
              {marine.measured_at && (
                <p className="mt-1 text-[11px] text-[#8f8f88]">
                  Measured at {marine.measured_at}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-dashed border-black/10 bg-[#faf9f7] px-3.5 py-3 text-xs text-[#6b6b66]">
              {details.marine_unavailable}
            </p>
          )}
        </div>
      )}

      {/* ------------------------- Air quality --------------------------- */}
      {air && (
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f8f88]">
              Air quality
            </h3>
            <DataLabelChip label="LIVE" />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <Stat label="US AQI" value={air.us_aqi?.value ?? "—"} />
            <div className="min-w-0 flex-1">
              <StatusBadge status={air.assessment?.status ?? "UNKNOWN"} />
              <p className="mt-1.5 text-xs leading-relaxed text-[#55554f]">
                {air.assessment?.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/5 bg-[#faf9f7] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8f8f88]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-[#171717]">{value}</p>
    </div>
  );
}
