import { EyeMark } from "@/components/eye-mark";
import { WatchForm } from "./watch-form";

function Wordmark() {
  return (
    <div className="flex items-center justify-center">
      <EyeMark />
      <span className="sr-only">iOn</span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-16 px-6 py-20">
      <Wordmark />
      <WatchForm />
    </main>
  );
}
