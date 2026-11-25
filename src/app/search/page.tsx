import LocationButton from "./locationbutton";

export default function SearchPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Find a meal</h1>

      <form action="/search/results" method="get" className="space-y-4">
        <label className="block">
          <span className="text-sm">Target calories (kcal)</span>
          <input
            name="kcal"
            type="number"
            min={0}
            step={50}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm">Target protein (g)</span>
          <input
            name="protein"
            type="number"
            min={0}
            step={10}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm">Max price (KRW)</span>
          <input
            name="price"
            type="number"
            min={0}
            step={500}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm">Max distance (m)</span>
          <input
            name="distance"
            type="number"
            min={0}
            step={100}
            className="mt-1 w-full rounded border p-2"
          />
        </label>

        <LocationButton />

        <label className="block">
          <span className="text-sm">What matters most?</span>
          <select name="priority" defaultValue="balanced" className="mt-1 w-full rounded border p-2">
            <option value="balanced">Balanced</option>
            <option value="calories">Calories</option>
            <option value="protein">Protein</option>
            <option value="price">Price</option>
            <option value="distance">Distance</option>
          </select>
        </label>

        <button type="submit" className="w-full rounded bg-black p-3 text-white">
          Search
        </button>
      </form>

      <p className="mt-6 text-xs text-gray-500">
        This is not medical advice. Nutrition values may be estimates.
      </p>
    </main>
  );
}