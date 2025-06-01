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
            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 text-white hover:text-blue-400 rounded-full p-0 border border-gray-600 hover:border-gray-500 transition-colors"
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