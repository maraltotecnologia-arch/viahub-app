import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: "calc(100vh - 3.5rem)" }}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
