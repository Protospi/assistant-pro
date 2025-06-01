import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-end">
          <Button
            size="sm"
            className="w-8 h-8 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-gray-300 hover:text-red-400 active:text-red-500 rounded-full p-0 border border-gray-350 hover:border-gray-300 transition-all duration-150 active:scale-95"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
              borderColor: '#9ca3af'
            }}
            onClick={() => setLocation('/')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content - Black background area for future editing */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* This area will be edited later */}
        </div>
      </main>
    </div>
  );
}