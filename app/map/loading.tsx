export default function MapLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-blue-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-blue-600"></div>
        </div>
        <p className="text-lg font-medium text-gray-700">Loading Map...</p>
        <p className="text-sm text-gray-500">
          Initializing 3D terrain and drainage data
        </p>
      </div>
    </div>
  );
}
