export default function SimulationLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#1e1e1e]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-blue-500"></div>
        </div>
        <p className="text-lg font-medium text-white">
          Entering Simulation Mode...
        </p>
        <p className="text-sm text-gray-400">
          Loading vulnerability models and analysis tools
        </p>
      </div>
    </div>
  );
}
