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
            className="w-8 h-8 bg-gradient-to-b from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white hover:text-red-400 active:text-red-500 rounded-full p-0 border-2 border-gray-200 hover:border-gray-100 shadow-lg shadow-gray-800/50 hover:shadow-gray-700/60 transition-all duration-200 active:scale-95"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.3)'
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