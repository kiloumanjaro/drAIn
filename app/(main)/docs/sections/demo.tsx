export function DemoSection() {
  return (
    <div className="space-y-3">
      <div className="mb-5 ml-2">
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          System Demo
        </h2>
        <p className="text-muted-foreground text-sm">
          Video walkthrough of the platform in action.
        </p>
      </div>

      {/* Demo Video Section */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-700">
        <iframe
          className="absolute top-0 left-0 h-full w-full"
          src="https://www.youtube.com/embed/ZHE9dCcayRQ"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
